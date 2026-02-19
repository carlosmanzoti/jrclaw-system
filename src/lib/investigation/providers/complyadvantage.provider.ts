/**
 * ComplyAdvantage Provider — PEP, sanctions, and adverse media screening.
 *
 * Endpoints:
 *   - POST /searches — CONSULTA_PEP_SANCOES (entity screening)
 *
 * Auth: Authorization header (ApiKey) | Rate limit: plan-dependent | Cost: per query
 * Docs: https://docs.complyadvantage.com
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://api.complyadvantage.com/v1";

export class ComplyAdvantageProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "COMPLYADVANTAGE";
  readonly displayName = "ComplyAdvantage";
  readonly category: ApiCategory = "COMPLIANCE";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_PEP_SANCOES"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    if (query.type === "CONSULTA_PEP_SANCOES") {
      return this.queryPepSancoes(query);
    }

    return this.buildResult(query, {
      success: false,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }

  // ─── CONSULTA_PEP_SANCOES ─────────────────────────────────────────────────

  private async queryPepSancoes(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const apiKey = config?.apiKey;

    if (!apiKey) {
      throw new Error("ComplyAdvantage API key not configured");
    }

    const searchName = (query.params?.name as string) || query.targetDocument;
    const entityType = query.targetType === "PJ" ? "company" : "person";
    const birthYear = query.params?.birthYear as number | undefined;

    const searchBody: Record<string, unknown> = {
      search_term: searchName,
      client_ref: query.targetDocument,
      fuzziness: 0.6,
      filters: {
        entity_type: entityType,
        types: ["sanction", "pep", "adverse-media", "warning"],
        birth_year: birthYear,
        country_codes: (query.params?.countryCodes as string[]) || ["BR"],
      },
      limit: 20,
    };

    const url = `${baseUrl}/searches`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKey ${apiKey}`,
        },
        body: JSON.stringify(searchBody),
      });
      if (!res.ok) throw new Error(`ComplyAdvantage returned HTTP ${res.status}`);
      return res.json();
    });

    const content = raw.content || {};
    const hitsObj = content.data?.hits || {};
    const hits: Record<string, unknown>[] = Array.isArray(hitsObj)
      ? hitsObj
      : Object.values(hitsObj);

    const screeningResults = hits.map((hit) => {
      const hitTypes = (hit.types || []) as string[];
      let tipo = "OTHER";
      if (hitTypes.some((t: string) => t.includes("sanction"))) tipo = "SANCTION";
      else if (hitTypes.some((t: string) => t.includes("pep"))) tipo = "PEP";
      else if (hitTypes.some((t: string) => t.includes("adverse"))) tipo = "ADVERSE_MEDIA";
      else if (hitTypes.some((t: string) => t.includes("warning"))) tipo = "WARNING";

      const sources = (hit.sources || []) as Record<string, unknown>[];
      const sourceNames = sources.map((s) => s.name || s.url || "").join(", ");

      return {
        nome: (hit.name as string) || "",
        score: (hit.match_score as number) || (hit.relevance as number) || 0,
        fonte: sourceNames || "ComplyAdvantage",
        lista: hitTypes.join(", "),
        pais: ((hit.countries || []) as string[])[0] || "BR",
        tipo,
        detalhes: (hit.name as string) || "Verificacao manual recomendada.",
        entityType: hit.entity_type,
        matchedFields: hit.matched_fields,
      };
    });

    const hasPep = screeningResults.some((r) => r.tipo === "PEP");
    const hasSanction = screeningResults.some((r) => r.tipo === "SANCTION");
    const totalHits = content.data?.total_hits || hits.length;

    return this.buildResult(query, {
      success: true,
      data: {
        totalHits,
        hasPep,
        hasSanction,
        screeningResults,
        searchId: content.data?.id,
        searchRef: content.data?.ref,
        screeningDate: new Date().toISOString(),
      },
      rawResponse: raw,
    });
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    if (query.type === "CONSULTA_PEP_SANCOES") {
      const mockResult = MockDataGenerator.generateComplianceData(this.name, query);
      return this.buildResult(query, {
        success: true,
        isMock: true,
        data: mockResult.data,
      });
    }

    return this.buildResult(query, {
      success: false,
      isMock: true,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }
}
