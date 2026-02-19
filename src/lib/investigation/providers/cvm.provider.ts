/**
 * CVM Provider — Brazilian Securities and Exchange Commission open data.
 *
 * URL: https://dados.cvm.gov.br/dados/
 * Searches for CNPJ/CPF in fund quotaholders, administrators, and shareholders.
 * Uses open CSV/JSON datasets.
 *
 * Auth: none | Cost: FREE
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedAsset,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const CVM_ENDPOINTS = [
  {
    name: "fund_admin",
    url: "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv",
    label: "Fundo de Investimento - Cadastro",
  },
  {
    name: "cia_aberta",
    url: "https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.json",
    label: "Companhia Aberta - Cadastro",
  },
];

export class CvmProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "CVM_DADOS_ABERTOS";
  readonly displayName = "CVM Dados Abertos";
  readonly category: ApiCategory = "SOCIETARIO";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_CVM", "CONSULTA_SOCIETARIA"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const target = query.targetDocument.replace(/\D/g, "");
    const assets: NormalizedAsset[] = [];

    const settled = await Promise.allSettled(
      CVM_ENDPOINTS.map((ep) => this.searchEndpoint(ep, target)),
    );

    for (const result of settled) {
      if (result.status === "fulfilled") {
        assets.push(...result.value);
      }
    }

    return this.buildResult(query, {
      success: true,
      data: { totalRecords: assets.length },
      normalizedAssets: assets,
      rawResponse: settled,
    });
  }

  private async searchEndpoint(
    ep: { name: string; url: string; label: string },
    target: string,
  ): Promise<NormalizedAsset[]> {
    return this.retryWithBackoff(async () => {
      const res = await fetch(ep.url);
      if (!res.ok) throw new Error(`CVM ${ep.name} returned HTTP ${res.status}`);

      const assets: NormalizedAsset[] = [];

      if (ep.url.endsWith(".json")) {
        const data = await res.json();
        const items: Record<string, unknown>[] = Array.isArray(data)
          ? data
          : data.dados || data.data || [];

        for (const item of items) {
          const cnpj = String(item.CNPJ_CIA || item.cnpj || "").replace(/\D/g, "");
          if (!cnpj || (!cnpj.includes(target) && !target.includes(cnpj))) continue;

          assets.push({
            category: "PARTICIPACAO_SOCIETARIA",
            subcategory: "Companhia Aberta",
            description: `${item.DENOM_SOCIAL || item.denom_social || "N/A"} (${ep.label})`,
            registrationId: cnpj,
            hasRestriction: false,
            isSeizable: true,
            sourceProvider: this.name,
            rawSourceData: item,
          });
        }
      } else {
        const text = await res.text();
        const lines = text.split("\n");
        const header = lines[0]?.split(";") || [];
        const cnpjIdx = header.findIndex((h) => h.toUpperCase().includes("CNPJ"));
        const nameIdx = header.findIndex(
          (h) => h.toUpperCase().includes("DENOM") || h.toUpperCase().includes("NOME"),
        );
        const classIdx = header.findIndex((h) => h.toUpperCase().includes("CLASSE"));

        if (cnpjIdx < 0) return [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i]?.split(";");
          if (!cols || cols.length <= cnpjIdx) continue;
          const cnpj = (cols[cnpjIdx] || "").replace(/\D/g, "");
          if (!cnpj || (!cnpj.includes(target) && !target.includes(cnpj))) continue;

          const fundName = nameIdx >= 0 ? cols[nameIdx] : "Fundo N/I";
          const fundClass = classIdx >= 0 ? cols[classIdx] : undefined;

          assets.push({
            category: "FUNDOS_INVESTIMENTO",
            subcategory: fundClass || "Fundo de Investimento",
            description: `${fundName} (${ep.label})`,
            registrationId: cnpj,
            hasRestriction: false,
            isSeizable: true,
            sourceProvider: this.name,
            rawSourceData: { cols, header },
          });
        }
      }

      return assets;
    });
  }

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    return MockDataGenerator.generate(this.name, query);
  }
}
