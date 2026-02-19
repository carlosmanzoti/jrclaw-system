/**
 * Deadline Calculator for the JRCLaw System (v2).
 *
 * This module provides a modern, catalog-driven deadline calculation engine
 * that uses the new Prisma enums (DeadlineType, CountingType, DeadlineStartMethod,
 * PieceType, DeadlineCategory) and the DeadlineTypeCatalog / DeadlinePieceTrigger
 * models for configuration.
 *
 * CPC/2015 rules implemented:
 *  - Art. 219:  Business days only for procedural deadlines
 *  - Art. 224:  Exclude start day, include end day; extend to next business day
 *  - Art. 229:  Litisconsorcio doubling (logged, not auto-applied)
 *  - Art. 231:  Start date from intimacao/citacao/publicacao (DJE flow)
 *  - Art. 183:  Fazenda Publica prazo em dobro
 *  - Art. 186:  Defensoria Publica prazo em dobro
 *  - Art. 180:  Ministerio Publico prazo em dobro
 *  - Art. 220:  Recesso forense (Dec 20 - Jan 20) suspends counting
 *
 * @module deadline-calculator
 */

import { db } from "@/lib/db";
import {
  isDiaUtil,
  calcularPrazo,
  proximoDiaUtil,
  diasUteisAte,
} from "@/lib/prazos";
import type {
  DeadlineType,
  CountingType,
  DeadlineStartMethod,
  PieceType,
  DeadlineCategory,
  PartyRole,
} from "@prisma/client";

// ============================================================
// Public Types
// ============================================================

/**
 * Input for deadline simulation / calculation.
 * Provide either the DJE publication flow dates or a direct startDate.
 */
export interface DeadlineCalcInput {
  /** The type of deadline from the catalog. */
  deadlineType: DeadlineType;
  /** How the party was notified / how counting begins. */
  startMethod: DeadlineStartMethod;

  // -- Dates for the DJE publication flow (Art. 231 CPC) --
  /** Date the decision was made available in the electronic journal (disponibilizacao). */
  disponibilizacaoDate?: Date;
  /** Publication date (1st business day after disponibilizacao). Auto-computed if omitted. */
  publicacaoDate?: Date;
  /** Date the party was formally notified (intimacao). */
  intimacaoDate?: Date;
  /** Date the party became aware (ciencia). */
  cienciaDate?: Date;

  // -- Or a direct start date --
  /** Direct start date for counting (overrides the DJE flow). */
  startDate?: Date;

  // -- Overrides --
  /** Override the default number of days from the catalog. */
  customDays?: number;
  /** Override the counting type from the catalog. */
  customCountingType?: CountingType;

  // -- Context flags for doubling rules --
  /** Whether the opposing party is a public entity (Fazenda Publica). Art. 183 CPC. */
  isPublicEntity?: boolean;
  /** Whether the opposing party is the Defensoria Publica. Art. 186 CPC. */
  isDefensoria?: boolean;
  /** Whether the opposing party is the Ministerio Publico. Art. 180 CPC. */
  isMP?: boolean;
  /** Whether the case is an electronic process. Affects Art. 229 par. 2. */
  isElectronic?: boolean;

  // -- Geographic / court context --
  /** Brazilian state code (e.g., "PR", "MA") for holiday lookups. */
  uf?: string;
  /** Tribunal identifier for recess/suspension checks. */
  tribunal?: string;
}

/**
 * Result of a deadline calculation, including the full audit trail.
 */
export interface DeadlineCalcResult {
  /** Effective start date of counting (the day that is excluded per Art. 224). */
  startDate: Date;
  /** Final deadline date (adjusted for business days, recesses, etc.). */
  dueDate: Date;
  /** Internal safety deadline: 2 business days before dueDate. */
  internalDueDate: Date;
  /** Original number of days from the catalog (before doubling). */
  originalDays: number;
  /** Effective number of days after doubling rules. */
  effectiveDays: number;
  /** Counting type used for this calculation. */
  countingType: CountingType;
  /** Whether the deadline was doubled. */
  isDoubled: boolean;
  /** Reason for doubling, or null if not doubled. */
  doubleReason: string | null;
  /** Business days remaining from today until dueDate. */
  businessDaysRemaining: number;
  /** Step-by-step calculation log for audit / display. */
  calculationLog: CalcLogEntry[];
  /** Warnings and alerts (in Portuguese). */
  warnings: string[];
  /** Legal basis from the catalog (e.g., "Art. 335, CPC"). */
  legalBasis: string | null;
  /** Whether this is a fatal (peremptory) deadline. */
  isFatal: boolean;
}

/**
 * A single step in the calculation audit trail.
 */
export interface CalcLogEntry {
  /** Sequential step number. */
  step: number;
  /** Rule or action identifier. */
  rule: string;
  /** Human-readable description of what happened in this step. */
  description: string;
  /** Date value before this step was applied (ISO string). */
  dateBefore?: string;
  /** Date value after this step was applied (ISO string). */
  dateAfter?: string;
}

/**
 * A suggested deadline returned by the piece-trigger lookup.
 */
export interface SuggestedDeadline {
  /** The deadline type enum value. */
  deadlineType: DeadlineType;
  /** Human-readable name (e.g., "Contestacao"). */
  displayName: string;
  /** Short label for compact UI. */
  shortName: string;
  /** Default number of days. */
  defaultDays: number;
  /** Counting type. */
  countingType: CountingType;
  /** Which party role this targets. */
  targetRole: PartyRole;
  /** Description of the trigger context. */
  triggerDescription: string;
  /** Whether this is merely a suggestion (vs. a mandatory trigger). */
  isSuggestion: boolean;
  /** Whether this is the default selection for the trigger. */
  isDefault: boolean;
  /** Legal basis (e.g., "Art. 335, CPC"). */
  legalBasis: string | null;
  /** Whether the deadline is fatal. */
  isFatal: boolean;
  /** Category of the deadline. */
  category: DeadlineCategory;
  /** UI color. */
  color: string;
  /** UI icon name. */
  icon: string | null;
}

/**
 * A catalog entry describing a deadline type and its defaults.
 */
export interface CatalogEntry {
  /** The deadline type enum value. */
  type: DeadlineType;
  /** Human-readable display name. */
  displayName: string;
  /** Short label. */
  shortName: string;
  /** Category for grouping. */
  category: DeadlineCategory;
  /** Legal basis text. */
  legalBasis: string | null;
  /** Default number of days. */
  defaultDays: number;
  /** Default counting type. */
  countingType: CountingType;
  /** Whether this deadline can be extended by the judge. */
  isExtendable: boolean;
  /** Whether missing this deadline causes preclusion. */
  isFatal: boolean;
  /** Default priority label. */
  defaultPriority: string;
  /** UI color hex. */
  color: string;
  /** UI icon name. */
  icon: string | null;
  /** Whether Fazenda Publica gets double time. */
  doubleForPublicEntity: boolean;
  /** Whether Defensoria gets double time. */
  doubleForDefensoria: boolean;
  /** Additional rules encoded as JSON. */
  specialRules: unknown;
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Normalizes a Date to midnight (00:00:00.000), returning a new Date instance.
 */
function normalizeDate(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/**
 * Formats a Date as "YYYY-MM-DD" for display and logging.
 */
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Formats a Date as "DD/MM/YYYY" for user-facing Portuguese strings.
 */
function fmtDateBR(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

/**
 * Returns a new Date that is N calendar days after the given date.
 */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return normalizeDate(r);
}

/**
 * Checks whether a date falls within the Dec 20 - Jan 20 judiciary recess.
 * CPC Art. 220: procedural deadlines are suspended during this period.
 */
function isInDecJanRecess(date: Date): boolean {
  const d = normalizeDate(date);
  const month = d.getMonth(); // 0-indexed
  const day = d.getDate();

  // December 20-31
  if (month === 11 && day >= 20) return true;
  // January 1-20
  if (month === 0 && day <= 20) return true;

  return false;
}

/**
 * Labels for DeadlineStartMethod values, in Portuguese.
 */
const START_METHOD_LABELS: Record<DeadlineStartMethod, string> = {
  PUBLICACAO_DJE: "Publicacao no DJE",
  INTIMACAO_PESSOAL: "Intimacao pessoal",
  INTIMACAO_ELETRONICA: "Intimacao eletronica",
  INTIMACAO_CORREIO: "Intimacao por correio (AR)",
  INTIMACAO_EDITAL: "Intimacao por edital",
  COMPARECIMENTO_ESPONTANEO: "Comparecimento espontaneo",
  AUDIENCIA: "Audiencia",
  CARGA_AUTOS: "Carga dos autos",
  DATA_FIXA: "Data fixa",
  MANUAL: "Data definida manualmente",
};

// ============================================================
// DeadlineCalculator Class
// ============================================================

/**
 * Catalog-driven deadline calculator for the JRCLaw system.
 *
 * Uses the `DeadlineTypeCatalog` and `DeadlinePieceTrigger` Prisma models
 * to look up default days, counting types, doubling rules, and trigger
 * suggestions. Implements the core CPC/2015 rules for accurate procedural
 * deadline computation.
 *
 * @example
 * ```typescript
 * const calculator = new DeadlineCalculator();
 * const result = await calculator.calculate({
 *   deadlineType: "CONTESTACAO",
 *   startMethod: "PUBLICACAO_DJE",
 *   disponibilizacaoDate: new Date("2026-03-10"),
 *   uf: "PR",
 * });
 * console.log(result.dueDate, result.calculationLog);
 * ```
 */
export class DeadlineCalculator {
  // ----------------------------------------------------------
  // 1. calculate — Full calculation
  // ----------------------------------------------------------

  /**
   * Performs a full deadline calculation using catalog defaults and all
   * applicable CPC rules.
   *
   * @param input - Calculation parameters (deadline type, start method, dates, flags).
   * @returns A detailed result including due date, audit trail, and warnings.
   */
  async calculate(input: DeadlineCalcInput): Promise<DeadlineCalcResult> {
    const log: CalcLogEntry[] = [];
    const warnings: string[] = [];
    let step = 1;

    // --- Step 1: Load catalog entry for the deadline type ---
    const catalog = await db.deadlineTypeCatalog.findUnique({
      where: { type: input.deadlineType },
    });

    if (!catalog) {
      throw new Error(
        `Tipo de prazo "${input.deadlineType}" nao encontrado no catalogo. ` +
          `Verifique se o catalogo foi populado (seed).`
      );
    }

    log.push({
      step: step++,
      rule: "CATALOGO",
      description:
        `Tipo de prazo: ${catalog.displayName} (${catalog.shortName}). ` +
        `Base legal: ${catalog.legalBasis ?? "N/A"}. ` +
        `Prazo padrao: ${catalog.defaultDays} dias (${catalog.countingType}). ` +
        `Fatal: ${catalog.isFatal ? "Sim" : "Nao"}.`,
    });

    // Determine effective days and counting type (allow overrides)
    const originalDays = input.customDays ?? catalog.defaultDays;
    const countingType = input.customCountingType ?? catalog.countingType;

    if (input.customDays != null && input.customDays !== catalog.defaultDays) {
      log.push({
        step: step++,
        rule: "OVERRIDE_DIAS",
        description:
          `Prazo padrao do catalogo (${catalog.defaultDays} dias) foi substituido ` +
          `por valor personalizado: ${input.customDays} dias.`,
      });
    }

    if (
      input.customCountingType != null &&
      input.customCountingType !== catalog.countingType
    ) {
      log.push({
        step: step++,
        rule: "OVERRIDE_CONTAGEM",
        description:
          `Tipo de contagem padrao (${catalog.countingType}) foi substituido ` +
          `por: ${input.customCountingType}.`,
      });
    }

    // --- Step 2: Compute effective start date ---
    const startDate = this.computeStartDate(input, log, step);
    step = log.length + 1;

    // --- Step 3: Apply doubling rules (Arts. 183, 186, 180) ---
    const doubling = this._applyDoublingRules(
      originalDays,
      input,
      catalog,
      log,
      step
    );
    step = log.length + 1;

    const effectiveDays = doubling.effectiveDays;

    // --- Step 4: Handle SEM_PRAZO counting type ---
    if (countingType === "SEM_PRAZO") {
      log.push({
        step: step++,
        rule: "SEM_PRAZO",
        description:
          `Este tipo de prazo (${catalog.displayName}) nao possui contagem de dias. ` +
          `E um prazo de cumprimento imediato ou sem termo definido.`,
      });

      warnings.push(
        `Este prazo (${catalog.displayName}) nao possui contagem de dias definida. ` +
          `Verifique a determinacao judicial para o prazo especifico.`
      );

      const now = normalizeDate(new Date());
      return {
        startDate: normalizeDate(startDate),
        dueDate: normalizeDate(startDate),
        internalDueDate: normalizeDate(startDate),
        originalDays: 0,
        effectiveDays: 0,
        countingType,
        isDoubled: false,
        doubleReason: null,
        businessDaysRemaining: 0,
        calculationLog: log,
        warnings,
        legalBasis: catalog.legalBasis,
        isFatal: catalog.isFatal,
      };
    }

    // --- Step 5: Handle HORAS counting ---
    if (countingType === "HORAS") {
      const dueDate = new Date(startDate);
      dueDate.setHours(dueDate.getHours() + effectiveDays);

      log.push({
        step: step++,
        rule: "CONTAGEM_HORAS",
        description:
          `Prazo em horas: ${effectiveDays}h a partir de ${fmtDateBR(startDate)}. ` +
          `Vencimento: ${dueDate.toISOString()}.`,
        dateBefore: fmtDate(startDate),
        dateAfter: fmtDate(dueDate),
      });

      const remaining = await diasUteisAte(dueDate, input.uf);
      const internalDue = await this._computeInternalDueDate(
        normalizeDate(dueDate),
        input.uf
      );

      return {
        startDate: normalizeDate(startDate),
        dueDate,
        internalDueDate: internalDue,
        originalDays,
        effectiveDays,
        countingType,
        isDoubled: doubling.isDoubled,
        doubleReason: doubling.doubleReason,
        businessDaysRemaining: remaining,
        calculationLog: log,
        warnings,
        legalBasis: catalog.legalBasis,
        isFatal: catalog.isFatal,
      };
    }

    // --- Step 6: Check for recesso forense (Art. 220 CPC) ---
    let adjustedStart = normalizeDate(startDate);

    if (isInDecJanRecess(adjustedStart)) {
      const beforeRecess = fmtDate(adjustedStart);
      // Move start to Jan 21 (first day after recess)
      const year =
        adjustedStart.getMonth() === 11
          ? adjustedStart.getFullYear() + 1
          : adjustedStart.getFullYear();
      const afterRecess = new Date(year, 0, 21); // Jan 21
      // Ensure it is a business day
      adjustedStart = await proximoDiaUtil(afterRecess, input.uf);

      log.push({
        step: step++,
        rule: "ART_220_RECESSO",
        description:
          `Art. 220 CPC: Data de inicio da contagem (${fmtDateBR(new Date(beforeRecess))}) ` +
          `cai no periodo de recesso forense (20/dez a 20/jan). ` +
          `Inicio da contagem ajustado para ${fmtDateBR(adjustedStart)} ` +
          `(primeiro dia util apos o recesso).`,
        dateBefore: beforeRecess,
        dateAfter: fmtDate(adjustedStart),
      });

      warnings.push(
        `Recesso forense (Art. 220 CPC): o inicio da contagem foi deslocado para ` +
          `${fmtDateBR(adjustedStart)} (apos o recesso de 20/dez a 20/jan).`
      );
    }

    // --- Step 7: Count days (Art. 219 + Art. 224 CPC) ---
    log.push({
      step: step++,
      rule: "ART_224_INICIO",
      description:
        `Art. 224 CPC: Exclui-se o dia do inicio (${fmtDateBR(adjustedStart)}) ` +
        `e inclui-se o dia do vencimento. Contagem de ${effectiveDays} ` +
        `${countingType === "DIAS_UTEIS" ? "dias uteis" : "dias corridos"}.`,
      dateBefore: fmtDate(adjustedStart),
    });

    let dueDate: Date;

    if (countingType === "DIAS_UTEIS") {
      // Art. 219: count business days only, using isDiaUtil which checks
      // weekends + holidays for the given UF. calcularPrazo already
      // implements Art. 224 (excludes start, includes end) and rolls
      // to next business day if the end falls on a non-business day.
      dueDate = await calcularPrazo(adjustedStart, effectiveDays, input.uf);
    } else {
      // DIAS_CORRIDOS: advance N calendar days, then if the final day
      // falls on a non-business day, roll to the next business day.
      dueDate = addDays(adjustedStart, effectiveDays);
      const wasNonBusiness = !(await isDiaUtil(dueDate, input.uf));

      if (wasNonBusiness) {
        const originalDue = fmtDate(dueDate);
        dueDate = await proximoDiaUtil(dueDate, input.uf);

        log.push({
          step: step++,
          rule: "ART_224_P1_CORRIDOS",
          description:
            `Art. 224 par. 1 CPC: Vencimento em dias corridos caiu em dia nao util ` +
            `(${fmtDateBR(new Date(originalDue))}). Prorrogado para o proximo dia ` +
            `util: ${fmtDateBR(dueDate)}.`,
          dateBefore: originalDue,
          dateAfter: fmtDate(dueDate),
        });
      }
    }

    // --- Step 8: Check if dueDate falls in recesso forense ---
    if (isInDecJanRecess(dueDate)) {
      const beforeRecess = fmtDate(dueDate);
      const year =
        dueDate.getMonth() === 11
          ? dueDate.getFullYear() + 1
          : dueDate.getFullYear();
      const afterRecess = new Date(year, 0, 21);
      dueDate = await proximoDiaUtil(afterRecess, input.uf);

      log.push({
        step: step++,
        rule: "ART_220_VENCIMENTO_RECESSO",
        description:
          `Art. 220 CPC: O vencimento (${fmtDateBR(new Date(beforeRecess))}) cai no ` +
          `periodo de recesso forense. Prorrogado para ${fmtDateBR(dueDate)} ` +
          `(proximo dia util apos o recesso).`,
        dateBefore: beforeRecess,
        dateAfter: fmtDate(dueDate),
      });

      warnings.push(
        `Recesso forense (Art. 220 CPC): o vencimento foi prorrogado para ` +
          `${fmtDateBR(dueDate)} (apos o recesso de 20/dez a 20/jan).`
      );
    }

    // If counting type is DIAS_UTEIS and the due date is not a business day
    // (edge case after recess adjustment), roll forward.
    if (!(await isDiaUtil(dueDate, input.uf))) {
      const before = fmtDate(dueDate);
      dueDate = await proximoDiaUtil(dueDate, input.uf);

      log.push({
        step: step++,
        rule: "ART_224_P1_AJUSTE_FINAL",
        description:
          `Art. 224 par. 1 CPC: Ajuste final — vencimento em ${fmtDateBR(new Date(before))} ` +
          `nao e dia util. Prorrogado para ${fmtDateBR(dueDate)}.`,
        dateBefore: before,
        dateAfter: fmtDate(dueDate),
      });
    }

    log.push({
      step: step++,
      rule: "VENCIMENTO",
      description:
        `Data de vencimento calculada: ${fmtDateBR(dueDate)}.`,
      dateAfter: fmtDate(dueDate),
    });

    // --- Step 9: Compute internal due date (safety margin) ---
    const internalDueDate = await this._computeInternalDueDate(
      dueDate,
      input.uf
    );

    log.push({
      step: step++,
      rule: "PRAZO_INTERNO",
      description:
        `Prazo interno (margem de seguranca): ${fmtDateBR(internalDueDate)} ` +
        `(2 dias uteis antes do vencimento).`,
      dateAfter: fmtDate(internalDueDate),
    });

    // --- Step 10: Compute remaining business days ---
    const businessDaysRemaining = await diasUteisAte(dueDate, input.uf);

    log.push({
      step: step++,
      rule: "DIAS_RESTANTES",
      description:
        `Dias uteis restantes a partir de hoje: ${businessDaysRemaining}.`,
    });

    // --- Step 11: Generate warnings ---
    if (businessDaysRemaining < 0) {
      warnings.push(
        `ALERTA CRITICO: Prazo VENCIDO ha ${Math.abs(businessDaysRemaining)} dia(s) util(eis)!`
      );
    } else if (businessDaysRemaining === 0) {
      warnings.push(`ALERTA: Prazo vence HOJE (${fmtDateBR(dueDate)})!`);
    } else if (businessDaysRemaining <= 2) {
      warnings.push(
        `URGENTE: Restam apenas ${businessDaysRemaining} dia(s) util(eis) para o prazo!`
      );
    } else if (businessDaysRemaining <= 5) {
      warnings.push(
        `ATENCAO: Restam ${businessDaysRemaining} dias uteis para o prazo.`
      );
    }

    if (catalog.isFatal) {
      warnings.push(
        `Prazo FATAL: nao admite prorrogacao. Perda do prazo acarreta preclusao temporal.`
      );
    }

    // Art. 229 log (not auto-applied)
    if (input.isElectronic === false) {
      log.push({
        step: step++,
        rule: "ART_229_INFO",
        description:
          `Art. 229 CPC (litisconsorcio): caso haja litisconsortes com advogados diferentes ` +
          `em processo fisico, o prazo pode ser dobrado. Esta regra NAO foi aplicada automaticamente ` +
          `— verifique manualmente se aplicavel.`,
      });
    }

    return {
      startDate: normalizeDate(startDate),
      dueDate: normalizeDate(dueDate),
      internalDueDate,
      originalDays,
      effectiveDays,
      countingType,
      isDoubled: doubling.isDoubled,
      doubleReason: doubling.doubleReason,
      businessDaysRemaining,
      calculationLog: log,
      warnings,
      legalBasis: catalog.legalBasis,
      isFatal: catalog.isFatal,
    };
  }

  // ----------------------------------------------------------
  // 2. simulate — Same as calculate, for preview
  // ----------------------------------------------------------

  /**
   * Simulates a deadline calculation without persisting anything.
   * Functionally identical to {@link calculate}, provided as a semantic alias
   * for UI preview / "what-if" scenarios.
   *
   * @param input - Calculation parameters.
   * @returns The same detailed result as calculate().
   */
  async simulate(input: DeadlineCalcInput): Promise<DeadlineCalcResult> {
    return this.calculate(input);
  }

  // ----------------------------------------------------------
  // 3. getSuggestedDeadlines — Trigger-based suggestions
  // ----------------------------------------------------------

  /**
   * Returns suggested deadlines that should be created when a given piece
   * type is received (e.g., when a CITACAO is received, suggest CONTESTACAO).
   *
   * Uses the `DeadlinePieceTrigger` table joined with `DeadlineTypeCatalog`.
   *
   * @param pieceType - The type of piece that was received / published.
   * @param partyRole - Optional filter by the party's role (AUTOR, REU, etc.).
   * @returns Array of suggested deadline configurations, sorted by default first.
   */
  async getSuggestedDeadlines(
    pieceType: PieceType,
    partyRole?: PartyRole
  ): Promise<SuggestedDeadline[]> {
    const whereClause: Record<string, unknown> = {
      triggerPieceType: pieceType,
    };

    if (partyRole) {
      whereClause.targetRole = partyRole;
    }

    const triggers = await db.deadlinePieceTrigger.findMany({
      where: whereClause,
      include: {
        deadlineTypeCatalog: true,
      },
      orderBy: [{ isDefault: "desc" }, { deadlineType: "asc" }],
    });

    return triggers.map((t) => ({
      deadlineType: t.deadlineType,
      displayName: t.deadlineTypeCatalog.displayName,
      shortName: t.deadlineTypeCatalog.shortName,
      defaultDays: t.deadlineTypeCatalog.defaultDays,
      countingType: t.deadlineTypeCatalog.countingType,
      targetRole: t.targetRole,
      triggerDescription: t.triggerDescription,
      isSuggestion: t.isSuggestion,
      isDefault: t.isDefault,
      legalBasis: t.deadlineTypeCatalog.legalBasis,
      isFatal: t.deadlineTypeCatalog.isFatal,
      category: t.deadlineTypeCatalog.category,
      color: t.deadlineTypeCatalog.color,
      icon: t.deadlineTypeCatalog.icon,
    }));
  }

  // ----------------------------------------------------------
  // 4. getTypeCatalog — Browse the catalog
  // ----------------------------------------------------------

  /**
   * Returns all active deadline type catalog entries, optionally filtered
   * by category.
   *
   * @param category - Optional category to filter by.
   * @returns Array of catalog entries sorted by category then sortOrder.
   */
  async getTypeCatalog(category?: DeadlineCategory): Promise<CatalogEntry[]> {
    const whereClause: Record<string, unknown> = { isActive: true };
    if (category) {
      whereClause.category = category;
    }

    const entries = await db.deadlineTypeCatalog.findMany({
      where: whereClause,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { displayName: "asc" }],
    });

    return entries.map((e) => ({
      type: e.type,
      displayName: e.displayName,
      shortName: e.shortName,
      category: e.category,
      legalBasis: e.legalBasis,
      defaultDays: e.defaultDays,
      countingType: e.countingType,
      isExtendable: e.isExtendable,
      isFatal: e.isFatal,
      defaultPriority: e.defaultPriority,
      color: e.color,
      icon: e.icon,
      doubleForPublicEntity: e.doubleForPublicEntity,
      doubleForDefensoria: e.doubleForDefensoria,
      specialRules: e.specialRules,
    }));
  }

  // ----------------------------------------------------------
  // 5. computeStartDate — Determine effective start from flow
  // ----------------------------------------------------------

  /**
   * Determines the effective start date for deadline counting based on
   * the start method and the provided dates.
   *
   * Implements Art. 231 CPC (DJE publication flow):
   *  - PUBLICACAO_DJE: Disponibilizacao -> Publicacao (1 dia util seguinte)
   *    -> Inicio contagem (1 dia util seguinte a publicacao)
   *  - INTIMACAO_PESSOAL / INTIMACAO_CORREIO: start = intimacao date
   *  - INTIMACAO_ELETRONICA: start = ciencia date (or 10 days after sending)
   *  - AUDIENCIA / CARGA_AUTOS / COMPARECIMENTO_ESPONTANEO: direct date
   *  - DATA_FIXA / MANUAL: use the provided startDate
   *
   * @param input - The calculation input with date fields.
   * @param log - Optional log array to append entries to (mutated in place).
   * @param step - Optional starting step number for log entries.
   * @returns The effective start date (the day that will be excluded per Art. 224).
   */
  computeStartDate(
    input: DeadlineCalcInput,
    log?: CalcLogEntry[],
    step?: number
  ): Date {
    let currentStep = step ?? 1;
    const methodLabel =
      START_METHOD_LABELS[input.startMethod] ?? input.startMethod;

    switch (input.startMethod) {
      // ---- DJE Publication flow (Art. 231, I CPC) ----
      case "PUBLICACAO_DJE": {
        // Full DJE flow:
        // 1. Disponibilizacao: the date the decision appears in the electronic system
        // 2. Publicacao: considered to be the 1st business day AFTER disponibilizacao
        // 3. Inicio contagem: 1st business day AFTER publicacao (this is the start date;
        //    the start day is then excluded per Art. 224)
        //
        // If publicacaoDate is explicitly given, use it; otherwise derive from disponibilizacao.
        // If neither is given, fall back to startDate.

        if (input.disponibilizacaoDate) {
          const disponibilizacao = normalizeDate(input.disponibilizacaoDate);

          // Publicacao = 1st business day after disponibilizacao
          // NOTE: This is a synchronous approximation. We add 1 day and assume it
          // is a business day for the purpose of start date computation. The actual
          // business-day check happens during the full calculation via calcularPrazo.
          const publicacao =
            input.publicacaoDate != null
              ? normalizeDate(input.publicacaoDate)
              : addDays(disponibilizacao, 1);

          // Inicio contagem = 1st business day after publicacao
          const inicioContagem = addDays(publicacao, 1);

          if (log) {
            log.push({
              step: currentStep++,
              rule: "ART_231_DJE",
              description:
                `Art. 231, I, CPC — Fluxo DJE: ` +
                `Disponibilizacao: ${fmtDateBR(disponibilizacao)}. ` +
                `Publicacao (considera-se): ${fmtDateBR(publicacao)}. ` +
                `Inicio da contagem: ${fmtDateBR(inicioContagem)} ` +
                `(1o dia util seguinte a publicacao).`,
              dateBefore: fmtDate(disponibilizacao),
              dateAfter: fmtDate(inicioContagem),
            });
          }

          return inicioContagem;
        }

        if (input.publicacaoDate) {
          const publicacao = normalizeDate(input.publicacaoDate);
          const inicioContagem = addDays(publicacao, 1);

          if (log) {
            log.push({
              step: currentStep++,
              rule: "ART_231_DJE_PUBLICACAO",
              description:
                `Art. 231, I, CPC — Publicacao DJE: ${fmtDateBR(publicacao)}. ` +
                `Inicio da contagem: ${fmtDateBR(inicioContagem)} ` +
                `(1o dia util seguinte a publicacao).`,
              dateBefore: fmtDate(publicacao),
              dateAfter: fmtDate(inicioContagem),
            });
          }

          return inicioContagem;
        }

        // Fallback to startDate or today
        const fallback = input.startDate
          ? normalizeDate(input.startDate)
          : normalizeDate(new Date());

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_DJE_FALLBACK",
            description:
              `${methodLabel}: Nenhuma data de disponibilizacao ou publicacao informada. ` +
              `Utilizando data de inicio direta: ${fmtDateBR(fallback)}.`,
            dateAfter: fmtDate(fallback),
          });
        }

        return fallback;
      }

      // ---- Intimacao pessoal (Art. 231, II CPC) ----
      case "INTIMACAO_PESSOAL": {
        const date =
          input.intimacaoDate ?? input.cienciaDate ?? input.startDate;
        if (!date) {
          throw new Error(
            "INTIMACAO_PESSOAL: e necessario fornecer intimacaoDate, cienciaDate ou startDate."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_PESSOAL",
            description:
              `Art. 231, II, CPC — ${methodLabel} em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Intimacao eletronica (Art. 231, V CPC) ----
      case "INTIMACAO_ELETRONICA": {
        const date =
          input.cienciaDate ?? input.intimacaoDate ?? input.startDate;
        if (!date) {
          throw new Error(
            "INTIMACAO_ELETRONICA: e necessario fornecer cienciaDate, intimacaoDate ou startDate."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_ELETRONICA",
            description:
              `Art. 231, V, CPC — ${methodLabel}: data da ciencia/consulta em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Intimacao por correio / AR (Art. 231, I CPC) ----
      case "INTIMACAO_CORREIO": {
        const date =
          input.intimacaoDate ?? input.cienciaDate ?? input.startDate;
        if (!date) {
          throw new Error(
            "INTIMACAO_CORREIO: e necessario fornecer intimacaoDate, cienciaDate ou startDate."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_CORREIO",
            description:
              `Art. 231, I, CPC — ${methodLabel}: juntada do AR em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Intimacao por edital (Art. 231, IV CPC) ----
      case "INTIMACAO_EDITAL": {
        const date = input.intimacaoDate ?? input.startDate;
        if (!date) {
          throw new Error(
            "INTIMACAO_EDITAL: e necessario fornecer intimacaoDate ou startDate (data do termino do prazo do edital)."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_EDITAL",
            description:
              `Art. 231, IV, CPC — ${methodLabel}: termino do prazo do edital em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Comparecimento espontaneo (Art. 239 par. 1 CPC) ----
      case "COMPARECIMENTO_ESPONTANEO": {
        const date =
          input.cienciaDate ?? input.intimacaoDate ?? input.startDate;
        if (!date) {
          throw new Error(
            "COMPARECIMENTO_ESPONTANEO: e necessario fornecer cienciaDate ou startDate."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_239_COMPARECIMENTO",
            description:
              `Art. 239 par. 1, CPC — ${methodLabel} em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Audiencia (Art. 231, VII CPC) ----
      case "AUDIENCIA": {
        const date = input.startDate ?? input.intimacaoDate;
        if (!date) {
          throw new Error(
            "AUDIENCIA: e necessario fornecer startDate (data da audiencia)."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_AUDIENCIA",
            description:
              `Art. 231, VII, CPC — ${methodLabel} em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Carga dos autos (Art. 231, VIII CPC) ----
      case "CARGA_AUTOS": {
        const date = input.startDate ?? input.cienciaDate;
        if (!date) {
          throw new Error(
            "CARGA_AUTOS: e necessario fornecer startDate (data da carga)."
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "ART_231_CARGA",
            description:
              `Art. 231, VIII, CPC — ${methodLabel} em ${fmtDateBR(result)}. ` +
              `Contagem inicia a partir desta data (dia excluido, Art. 224).`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      // ---- Data fixa / Manual ----
      case "DATA_FIXA":
      case "MANUAL": {
        const date = input.startDate;
        if (!date) {
          throw new Error(
            `${input.startMethod}: e necessario fornecer startDate.`
          );
        }
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "DATA_FIXA",
            description:
              `${methodLabel}: data de inicio definida como ${fmtDateBR(result)}.`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }

      default: {
        // Defensive fallback
        const date = input.startDate ?? input.intimacaoDate ?? new Date();
        const result = normalizeDate(date);

        if (log) {
          log.push({
            step: currentStep++,
            rule: "FALLBACK",
            description:
              `Metodo de inicio desconhecido (${input.startMethod}). ` +
              `Utilizando data: ${fmtDateBR(result)}.`,
            dateAfter: fmtDate(result),
          });
        }

        return result;
      }
    }
  }

  // ----------------------------------------------------------
  // Private: Apply doubling rules
  // ----------------------------------------------------------

  /**
   * Evaluates and applies deadline doubling rules from the CPC.
   *
   * Multiple doubling rules do NOT stack: a deadline can only be doubled once.
   * Priority order: Fazenda Publica (Art. 183) > Defensoria (Art. 186) > MP (Art. 180).
   *
   * @param originalDays - Base number of days.
   * @param input - The calculation input with context flags.
   * @param catalog - The catalog entry for the deadline type.
   * @param log - Audit log (mutated).
   * @param step - Current step number.
   * @returns The effective days, doubled flag, and reason.
   */
  private _applyDoublingRules(
    originalDays: number,
    input: DeadlineCalcInput,
    catalog: {
      doubleForPublicEntity: boolean;
      doubleForDefensoria: boolean;
      displayName: string;
    },
    log: CalcLogEntry[],
    step: number
  ): {
    effectiveDays: number;
    isDoubled: boolean;
    doubleReason: string | null;
  } {
    let currentStep = step;

    // Art. 183 CPC: Fazenda Publica
    if (input.isPublicEntity && catalog.doubleForPublicEntity) {
      const doubled = originalDays * 2;

      log.push({
        step: currentStep++,
        rule: "ART_183_FAZENDA",
        description:
          `Art. 183 CPC: Fazenda Publica — prazo em dobro. ` +
          `${originalDays} dias -> ${doubled} dias.`,
      });

      return {
        effectiveDays: doubled,
        isDoubled: true,
        doubleReason: "Art. 183 CPC — Fazenda Publica (prazo em dobro)",
      };
    }

    // Art. 186 CPC: Defensoria Publica
    if (input.isDefensoria && catalog.doubleForDefensoria) {
      const doubled = originalDays * 2;

      log.push({
        step: currentStep++,
        rule: "ART_186_DEFENSORIA",
        description:
          `Art. 186 CPC: Defensoria Publica — prazo em dobro. ` +
          `${originalDays} dias -> ${doubled} dias.`,
      });

      return {
        effectiveDays: doubled,
        isDoubled: true,
        doubleReason: "Art. 186 CPC — Defensoria Publica (prazo em dobro)",
      };
    }

    // Art. 180 CPC: Ministerio Publico
    // The catalog does not have a dedicated "doubleForMP" flag, but
    // MP doubling follows the same logic as Fazenda Publica per CPC Art. 180.
    if (input.isMP) {
      const doubled = originalDays * 2;

      log.push({
        step: currentStep++,
        rule: "ART_180_MP",
        description:
          `Art. 180 CPC: Ministerio Publico — prazo em dobro. ` +
          `${originalDays} dias -> ${doubled} dias.`,
      });

      return {
        effectiveDays: doubled,
        isDoubled: true,
        doubleReason: "Art. 180 CPC — Ministerio Publico (prazo em dobro)",
      };
    }

    // No doubling
    if (
      input.isPublicEntity ||
      input.isDefensoria ||
      input.isMP
    ) {
      // One of the flags was set but the catalog says no doubling for this type
      const reason = input.isPublicEntity
        ? "Fazenda Publica"
        : input.isDefensoria
          ? "Defensoria Publica"
          : "Ministerio Publico";

      log.push({
        step: currentStep++,
        rule: "DOBRA_NAO_APLICAVEL",
        description:
          `${reason}: o catalogo indica que este tipo de prazo ` +
          `(${catalog.displayName}) NAO admite dobra para ${reason.toLowerCase()}.`,
      });
    }

    return {
      effectiveDays: originalDays,
      isDoubled: false,
      doubleReason: null,
    };
  }

  // ----------------------------------------------------------
  // Private: Compute internal due date (safety margin)
  // ----------------------------------------------------------

  /**
   * Computes the internal safety deadline: 2 business days before the
   * actual due date. If the result would be before today, returns today.
   *
   * @param dueDate - The external due date.
   * @param uf - State code for holiday lookups.
   * @returns The internal due date.
   */
  private async _computeInternalDueDate(
    dueDate: Date,
    uf?: string
  ): Promise<Date> {
    let cursor = normalizeDate(dueDate);
    let businessDaysBack = 0;

    // Walk backwards 2 business days
    while (businessDaysBack < 2) {
      cursor = addDays(cursor, -1);
      if (await isDiaUtil(cursor, uf)) {
        businessDaysBack++;
      }
    }

    // If the internal date is in the past, use today as the floor
    const today = normalizeDate(new Date());
    if (cursor.getTime() < today.getTime()) {
      return today;
    }

    return cursor;
  }
}

// ============================================================
// Default export + named exports
// ============================================================

/** Singleton instance for convenience. */
export const deadlineCalculator = new DeadlineCalculator();

export default DeadlineCalculator;
