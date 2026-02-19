/**
 * Provider Registry — Singleton registry that holds all investigation provider instances.
 *
 * Maps ApiProvider enum values to concrete InvestigationProvider instances.
 * Uses lazy singleton pattern: the registry is created once on first access,
 * providers are eagerly instantiated during construction.
 */

import type { ApiProvider, ApiCategory } from "@prisma/client";

import type { InvestigationProvider } from "./types";

// ── Tier 1: Free / public APIs ──────────────────────────────────────────────

import { BrasilApiProvider } from "./providers/brasilapi.provider";
import { CnpjaProvider } from "./providers/cnpja.provider";
import { DataJudProvider } from "./providers/datajud.provider";
import { CvmProvider } from "./providers/cvm.provider";
import { BacenProvider } from "./providers/bacen.provider";
import { OpenSanctionsProvider } from "./providers/opensanctions.provider";

// ── Tier 2: Paid aggregators ────────────────────────────────────────────────

import { InfoSimplesProvider } from "./providers/infosimples.provider";
import { EscavadorProvider } from "./providers/escavador.provider";
import { AssertivaProvider } from "./providers/assertiva.provider";

// ── Tier 3: Government / premium / specialized ──────────────────────────────

import { SerproProvider } from "./providers/serpro.provider";
import { ComplyAdvantageProvider } from "./providers/complyadvantage.provider";
import { OpenCorporatesProvider } from "./providers/opencorporates.provider";
import { MapBiomasProvider } from "./providers/mapbiomas.provider";

// ═══════════════════════════════════════════════════════════════════════════════
// Registry class
// ═══════════════════════════════════════════════════════════════════════════════

class ProviderRegistry {
  private static _instance: ProviderRegistry | null = null;

  /** ApiProvider enum name -> provider instance */
  private readonly providers: Map<ApiProvider, InvestigationProvider>;

  private constructor() {
    this.providers = new Map<ApiProvider, InvestigationProvider>();
    this.registerAll();
  }

  /**
   * Instantiates all 13 provider implementations and registers them by name.
   */
  private registerAll(): void {
    const instances: InvestigationProvider[] = [
      // Tier 1 — Free / public
      new BrasilApiProvider(),
      new CnpjaProvider(),
      new DataJudProvider(),
      new CvmProvider(),
      new BacenProvider(),
      new OpenSanctionsProvider(),
      // Tier 2 — Paid aggregators
      new InfoSimplesProvider(),
      new EscavadorProvider(),
      new AssertivaProvider(),
      // Tier 3 — Government / premium / specialized
      new SerproProvider(),
      new ComplyAdvantageProvider(),
      new OpenCorporatesProvider(),
      new MapBiomasProvider(),
    ];

    for (const provider of instances) {
      this.providers.set(provider.name, provider);
    }
  }

  /** Get or create the singleton instance */
  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry._instance) {
      ProviderRegistry._instance = new ProviderRegistry();
    }
    return ProviderRegistry._instance;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns a single provider instance by its ApiProvider enum name.
   * Returns undefined if no provider is registered for that name.
   */
  getProvider(name: ApiProvider): InvestigationProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Returns all providers that match the given ApiCategory.
   */
  getProvidersByCategory(category: ApiCategory): InvestigationProvider[] {
    const result: InvestigationProvider[] = [];
    for (const provider of this.providers.values()) {
      if (provider.category === category) {
        result.push(provider);
      }
    }
    return result;
  }

  /**
   * Returns every registered provider instance.
   */
  getAllProviders(): InvestigationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns only providers that have valid API credentials configured and are active.
   * Checks each provider's isConfigured() (async) in parallel.
   */
  async getConfiguredProviders(): Promise<InvestigationProvider[]> {
    const all = this.getAllProviders();
    const checks = await Promise.all(
      all.map(async (provider) => {
        const configured = await provider.isConfigured();
        return { provider, configured };
      }),
    );
    return checks
      .filter((entry) => entry.configured)
      .map((entry) => entry.provider);
  }

  /**
   * Number of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton accessor
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the singleton ProviderRegistry instance.
 * Created lazily on first call.
 */
export function getRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}

export { ProviderRegistry };
