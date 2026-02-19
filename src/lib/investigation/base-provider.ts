/**
 * BaseInvestigationProvider — Abstract base class for all investigation data providers.
 *
 * Loads configuration from DB (ApiProviderConfig model), provides mock fallback
 * when not configured, timing/logging, cost tracking, and retry with exponential backoff.
 */

import type {
  ApiProvider,
  ApiCategory,
  QueryType,
} from "@prisma/client";

import { db } from "@/lib/db";

import type {
  InvestigationProvider,
  ProviderQuery,
  ProviderResult,
  ProviderConfig,
  RateLimitInfo,
} from "./types";

export abstract class BaseInvestigationProvider implements InvestigationProvider {
  abstract readonly name: ApiProvider;
  abstract readonly displayName: string;
  abstract readonly category: ApiCategory;

  /** Cached DB configuration — loaded lazily */
  private _config: ProviderConfig | null = null;
  private _configLoaded = false;

  // ─── Abstract methods that subclasses must implement ──────────────────────

  /** Execute a real API call against the external provider */
  protected abstract executeReal(query: ProviderQuery): Promise<ProviderResult>;

  /** Generate a realistic mock result for dev/fallback */
  protected abstract generateMockResult(query: ProviderQuery): Promise<ProviderResult>;

  /** Query types this provider can answer */
  abstract getAvailableQueries(): QueryType[];

  // ─── Configuration loading ────────────────────────────────────────────────

  /**
   * Loads provider config from the ApiProviderConfig table.
   * Caches after first load for the lifetime of this instance.
   */
  protected async loadConfig(): Promise<ProviderConfig | null> {
    if (this._configLoaded) return this._config;

    try {
      const row = await db.apiProviderConfig.findUnique({
        where: { provider: this.name },
      });

      if (row) {
        this._config = {
          provider: row.provider,
          displayName: row.displayName,
          category: row.category,
          apiKey: row.apiKey ?? undefined,
          apiSecret: row.apiSecret ?? undefined,
          baseUrl: row.baseUrl ?? undefined,
          extraConfig: (row.extraConfig as Record<string, unknown>) ?? undefined,
          isActive: row.isActive,
          isConfigured: row.isConfigured,
          monthlyBudget: row.monthlyBudget ? Number(row.monthlyBudget) : undefined,
          monthlySpent: Number(row.monthlySpent),
          costPerQuery: row.costPerQuery ? Number(row.costPerQuery) : undefined,
          rateLimitPerMin: row.rateLimitPerMin ?? undefined,
          rateLimitPerDay: row.rateLimitPerDay ?? undefined,
        };
      }
    } catch (err) {
      console.error(`[${this.name}] Failed to load config from DB:`, err);
    }

    this._configLoaded = true;
    return this._config;
  }

  /** Clears cached config so it will be reloaded on next access */
  protected invalidateConfig(): void {
    this._config = null;
    this._configLoaded = false;
  }

  /** Returns the cached config, loading it if necessary */
  protected async getConfig(): Promise<ProviderConfig | null> {
    return this.loadConfig();
  }

  // ─── InvestigationProvider interface implementation ────────────────────────

  async isConfigured(): Promise<boolean> {
    const config = await this.loadConfig();
    return config !== null && config.isConfigured && config.isActive;
  }

  async estimateCost(queryType: QueryType): Promise<number> {
    const config = await this.loadConfig();
    if (!config?.costPerQuery) return 0;
    return config.costPerQuery;
  }

  async getRateLimit(): Promise<RateLimitInfo> {
    const config = await this.loadConfig();

    // Count queries in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let currentMinuteUsage = 0;
    let currentDayUsage = 0;

    try {
      [currentMinuteUsage, currentDayUsage] = await Promise.all([
        db.investigationQuery.count({
          where: {
            provider: this.name,
            createdAt: { gte: oneMinuteAgo },
          },
        }),
        db.investigationQuery.count({
          where: {
            provider: this.name,
            createdAt: { gte: todayStart },
          },
        }),
      ]);
    } catch {
      // Silently fail — rate limit info is advisory
    }

    const perMin = config?.rateLimitPerMin ?? null;
    const perDay = config?.rateLimitPerDay ?? null;

    const isLimited =
      (perMin !== null && currentMinuteUsage >= perMin) ||
      (perDay !== null && currentDayUsage >= perDay);

    return {
      requestsPerMinute: perMin,
      requestsPerDay: perDay,
      currentMinuteUsage,
      currentDayUsage,
      isLimited,
      resetsAt: isLimited
        ? new Date(Math.ceil(Date.now() / 60_000) * 60_000)
        : undefined,
    };
  }

  // ─── Main execution: execute with fallback to mock ─────────────────────────

  /**
   * Main entry point for executing a query.
   *
   * If the provider is not configured or inactive, generates mock data.
   * If configured, calls executeReal with timing, logging, and cost tracking.
   * On failure, falls back to mock data after all retries are exhausted.
   */
  async execute(query: ProviderQuery): Promise<ProviderResult> {
    const configured = await this.isConfigured();

    if (!configured) {
      console.info(`[${this.name}] Not configured — returning mock data`);
      const mockResult = await this.generateMockResult(query);
      return { ...mockResult, isMock: true };
    }

    // Check rate limit before proceeding
    const rateLimit = await this.getRateLimit();
    if (rateLimit.isLimited) {
      console.warn(`[${this.name}] Rate limited — returning mock data`);
      const mockResult = await this.generateMockResult(query);
      return {
        ...mockResult,
        isMock: true,
        errorMessage: `Rate limited. Resets at ${rateLimit.resetsAt?.toISOString()}`,
      };
    }

    const startTime = Date.now();
    try {
      const result = await this.retryWithBackoff(
        () => this.executeReal(query),
        3,
        1000,
      );

      const elapsed = Date.now() - startTime;
      const cost = await this.estimateCost(query.type);

      // Track cost in DB
      await this.trackQueryCost(cost);

      console.info(
        `[${this.name}] Query ${query.type} completed in ${elapsed}ms (cost: R$${cost.toFixed(4)})`,
      );

      return {
        ...result,
        responseTimeMs: elapsed,
        cost,
        isMock: false,
      };
    } catch (error: unknown) {
      const elapsed = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      console.error(
        `[${this.name}] Query ${query.type} failed after retries (${elapsed}ms): ${message}`,
      );

      // Fallback to mock
      const mockResult = await this.generateMockResult(query);
      return {
        ...mockResult,
        isMock: true,
        responseTimeMs: elapsed,
        errorMessage: message,
      };
    }
  }

  // ─── Retry with exponential backoff ────────────────────────────────────────

  /**
   * Retries the given async function with exponential backoff.
   * @param fn - The async function to retry
   * @param maxAttempts - Total number of attempts (default 3)
   * @param baseDelayMs - Initial delay in milliseconds (default 1000)
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 1000,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `[${this.name}] Attempt ${attempt}/${maxAttempts} failed: ${message}`,
        );

        if (attempt < maxAttempts) {
          const jitter = Math.random() * 500;
          const delay = baseDelayMs * Math.pow(2, attempt - 1) + jitter;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // ─── Cost tracking ─────────────────────────────────────────────────────────

  /**
   * Increments monthlySpent on the ApiProviderConfig record.
   */
  private async trackQueryCost(cost: number): Promise<void> {
    if (cost <= 0) return;

    try {
      await db.apiProviderConfig.update({
        where: { provider: this.name },
        data: {
          monthlySpent: {
            increment: cost,
          },
        },
      });
    } catch (err) {
      console.error(`[${this.name}] Failed to track cost:`, err);
    }
  }

  // ─── Utility: build a base result ──────────────────────────────────────────

  /**
   * Convenience method for subclasses to build a result object.
   */
  protected buildResult(
    query: ProviderQuery,
    partial: Partial<ProviderResult>,
  ): ProviderResult {
    return {
      success: true,
      provider: this.name,
      queryType: query.type,
      data: {},
      rawResponse: null,
      responseTimeMs: 0,
      cost: 0,
      isMock: false,
      ...partial,
    };
  }
}
