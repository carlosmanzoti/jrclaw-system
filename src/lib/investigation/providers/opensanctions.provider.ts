/**
 * OpenSanctions Provider — PEP / sanctions screening.
 *
 * URL: https://api.opensanctions.org
 * POST /match/default — entity matching against global sanctions and PEP lists
 *
 * Auth: API key (optional for trial) | Cost: FREE trial (500 queries / 30 days)
 * Docs: https://www.opensanctions.org/docs/api/
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const DEFAULT_BASE = "https://api.opensanctions.org";

export class OpenSanctionsProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "OPENSANCTIONS";
  readonly displayName = "OpenSanctions";
  readonly category: ApiCategory = "COMPLIANCE";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_PEP_SANCOES"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || DEFAULT_BASE;
    const apiKey = config?.apiKey;
    const name = query.targetDocument;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["Authorization"] = `ApiKey ${apiKey}`;
    }

    const schema = query.targetType === "PJ" ? "Company" : "Person";
    const body = JSON.stringify({
      schema,
      properties: {
        name: [name],
        country: query.params?.country ? [query.params.country] : ["br"],
      },
    });

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(`${baseUrl}/match/default`, {
        method: "POST",
        headers,
        body,
      });
      if (!res.ok) throw new Error(`OpenSanctions returned HTTP ${res.status}`);
      return res.json();
    });

    const hits: Record<string, unknown>[] = raw.responses || raw.results || [];

    const sanctions = hits.map((r) => {
      const props = (r.properties || {}) as Record<string, unknown>;
      const topics = (props.topics || []) as string[];
      let tipo = "OTHER";
      if (topics.some((t) => t.includes("sanction"))) tipo = "SANCTION";
      else if (topics.some((t) => t.includes("pep") || t.includes("pol"))) tipo = "PEP";
      else if (topics.some((t) => t.includes("crime"))) tipo = "CRIME";

      return {
        nome: ((props.name as string[]) || [])[0] || (r.caption as string) || "",
        score: (r.score as number) || 0,
        fonte: "OpenSanctions",
        lista: ((r.datasets as string[]) || []).join(", ") || "default",
        pais: ((props.country as string[]) || [])[0] || "BR",
        tipo,
        detalhes: (r.caption as string) || undefined,
      };
    });

    return this.buildResult(query, {
      success: true,
      data: { totalHits: sanctions.length, sanctions },
      rawResponse: raw,
    });
  }

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    return MockDataGenerator.generate(this.name, query);
  }
}
