/**
 * Cost Tracker — Monitors and controls API spending across investigation providers.
 *
 * Reads/writes against ApiProviderConfig.monthlySpent and monthlyBudget.
 * Emits budget alerts at 80% (WARNING) and 100% (CRITICAL) thresholds.
 */

import type { ApiProvider } from "@prisma/client";

import { db } from "@/lib/db";
import type { BudgetAlert } from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// Budget thresholds
// ═══════════════════════════════════════════════════════════════════════════════

const WARNING_THRESHOLD = 0.80;
const CRITICAL_THRESHOLD = 1.00;

// ═══════════════════════════════════════════════════════════════════════════════
// Cost tracking
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Records a cost for a specific provider query.
 * Increments monthlySpent in the ApiProviderConfig table
 * and checks budget thresholds.
 *
 * @returns Any budget alerts triggered by this cost
 */
export async function trackCost(
  provider: ApiProvider,
  amount: number,
): Promise<BudgetAlert[]> {
  if (amount <= 0) return [];

  try {
    const updated = await db.apiProviderConfig.update({
      where: { provider },
      data: {
        monthlySpent: { increment: amount },
      },
      select: {
        provider: true,
        displayName: true,
        monthlyBudget: true,
        monthlySpent: true,
      },
    });

    return checkBudgetAlerts(
      updated.provider,
      updated.displayName,
      updated.monthlyBudget ? Number(updated.monthlyBudget) : null,
      Number(updated.monthlySpent),
    );
  } catch (err) {
    console.error(`[CostTracker] Failed to track cost for ${provider}:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Spend queries
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the amount spent this month for a specific provider.
 */
export async function getMonthlySpend(provider: ApiProvider): Promise<number> {
  try {
    const config = await db.apiProviderConfig.findUnique({
      where: { provider },
      select: { monthlySpent: true },
    });

    return config ? Number(config.monthlySpent) : 0;
  } catch (err) {
    console.error(`[CostTracker] Failed to get monthly spend for ${provider}:`, err);
    return 0;
  }
}

/**
 * Get total monthly spend across all providers.
 */
export async function getTotalMonthlySpend(): Promise<number> {
  try {
    const result = await db.apiProviderConfig.aggregate({
      _sum: { monthlySpent: true },
    });

    return result._sum.monthlySpent ? Number(result._sum.monthlySpent) : 0;
  } catch (err) {
    console.error("[CostTracker] Failed to get total monthly spend:", err);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Budget checking
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check whether a provider has budget remaining.
 * Returns false if budget is exhausted.
 */
export async function hasBudgetRemaining(provider: ApiProvider): Promise<boolean> {
  try {
    const config = await db.apiProviderConfig.findUnique({
      where: { provider },
      select: { monthlyBudget: true, monthlySpent: true },
    });

    if (!config) return true;
    if (!config.monthlyBudget) return true;

    return Number(config.monthlySpent) < Number(config.monthlyBudget);
  } catch {
    return true; // Fail open for budget checks
  }
}

/**
 * Checks the current monthly spend for a single provider against its budget.
 *
 * - If monthlySpent >= 100% of monthlyBudget, returns CRITICAL alert
 * - If monthlySpent >= 80% of monthlyBudget, returns WARNING alert
 * - Otherwise returns null
 */
export async function checkBudget(
  provider: ApiProvider,
): Promise<BudgetAlert | null> {
  const config = await db.apiProviderConfig.findUnique({
    where: { provider },
    select: {
      provider: true,
      displayName: true,
      monthlyBudget: true,
      monthlySpent: true,
    },
  });

  if (!config) return null;

  const budget = config.monthlyBudget ? Number(config.monthlyBudget) : null;
  const spent = Number(config.monthlySpent);

  if (!budget || budget <= 0) return null;

  const alerts = checkBudgetAlerts(config.provider, config.displayName, budget, spent);
  return alerts.length > 0 ? alerts[0] : null;
}

/**
 * Get all current budget alerts across all active providers.
 */
export async function getAllBudgetAlerts(): Promise<BudgetAlert[]> {
  try {
    const configs = await db.apiProviderConfig.findMany({
      where: {
        isActive: true,
        monthlyBudget: { not: null },
      },
      select: {
        provider: true,
        displayName: true,
        monthlyBudget: true,
        monthlySpent: true,
      },
    });

    const alerts: BudgetAlert[] = [];
    for (const c of configs) {
      const budget = Number(c.monthlyBudget);
      const spent = Number(c.monthlySpent);
      if (budget > 0) {
        alerts.push(...checkBudgetAlerts(c.provider, c.displayName, budget, spent));
      }
    }

    return alerts;
  } catch (err) {
    console.error("[CostTracker] Failed to get budget alerts:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cost summary
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostSummaryEntry {
  provider: ApiProvider;
  displayName: string;
  spent: number;
  budget: number | null;
  percent: number | null;
}

/**
 * Returns a summary of costs for all configured providers.
 */
export async function getCostSummary(): Promise<CostSummaryEntry[]> {
  const configs = await db.apiProviderConfig.findMany({
    select: {
      provider: true,
      displayName: true,
      monthlyBudget: true,
      monthlySpent: true,
    },
    orderBy: { provider: "asc" },
  });

  return configs.map((config) => {
    const spent = Number(config.monthlySpent);
    const budget = config.monthlyBudget ? Number(config.monthlyBudget) : null;
    const percent = budget && budget > 0 ? spent / budget : null;

    return {
      provider: config.provider,
      displayName: config.displayName,
      spent,
      budget,
      percent,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Monthly reset
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resets all monthlySpent values to 0 across all provider configs.
 * Intended to be called by a cron job on the 1st of each month.
 */
export async function resetMonthlyCosts(): Promise<void> {
  await db.apiProviderConfig.updateMany({
    data: { monthlySpent: 0 },
  });

  console.info("[CostTracker] Monthly costs reset for all providers.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Internal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check budget thresholds and return alerts.
 */
function checkBudgetAlerts(
  provider: ApiProvider,
  displayName: string,
  monthlyBudget: number | null,
  monthlySpent: number,
): BudgetAlert[] {
  if (!monthlyBudget || monthlyBudget <= 0) return [];

  const percentUsed = monthlySpent / monthlyBudget;
  const alerts: BudgetAlert[] = [];

  if (percentUsed >= CRITICAL_THRESHOLD) {
    alerts.push({
      provider,
      percentUsed: percentUsed * 100,
      monthlyBudget,
      monthlySpent,
      message:
        `ORCAMENTO ESGOTADO: ${displayName} atingiu ${(percentUsed * 100).toFixed(1)}% ` +
        `do orcamento mensal (R$${monthlySpent.toFixed(2)} / R$${monthlyBudget.toFixed(2)}). ` +
        `Consultas serao bloqueadas ate o proximo periodo.`,
      severity: "CRITICAL",
    });
    console.error(
      `[CostTracker] CRITICAL: ${provider} budget exhausted (${(percentUsed * 100).toFixed(1)}%)`,
    );
  } else if (percentUsed >= WARNING_THRESHOLD) {
    alerts.push({
      provider,
      percentUsed: percentUsed * 100,
      monthlyBudget,
      monthlySpent,
      message:
        `ALERTA DE ORCAMENTO: ${displayName} atingiu ${(percentUsed * 100).toFixed(1)}% ` +
        `do orcamento mensal (R$${monthlySpent.toFixed(2)} / R$${monthlyBudget.toFixed(2)}). ` +
        `Considere reduzir o volume de consultas.`,
      severity: "WARNING",
    });
    console.warn(
      `[CostTracker] WARNING: ${provider} budget at ${(percentUsed * 100).toFixed(1)}%`,
    );
  }

  return alerts;
}
