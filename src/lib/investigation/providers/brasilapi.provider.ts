/**
 * BrasilAPI Provider — free public API for Brazilian data.
 *
 * Endpoints:
 *   - GET /cnpj/v1/{cnpj} — CONSULTA_CNPJ (cadastral data, QSA, CNAE)
 *   - GET /cep/v2/{cep}   — geocoding
 *
 * Auth: none | Rate limit: 3 req/s | Cost: FREE
 * Docs: https://brasilapi.com.br/docs
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedCorporateLink,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://brasilapi.com.br/api/v1";

export class BrasilApiProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "BRASILAPI";
  readonly displayName = "BrasilAPI";
  readonly category: ApiCategory = "CADASTRAL";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_CNPJ"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;

    if (query.type === "CONSULTA_CNPJ") {
      return this.queryCnpj(query, baseUrl);
    }

    return this.buildResult(query, {
      success: false,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }

  private async queryCnpj(query: ProviderQuery, baseUrl: string): Promise<ProviderResult> {
    const cnpj = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/cnpj/v1/${cnpj}`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`BrasilAPI CNPJ returned HTTP ${res.status}`);
      return res.json();
    });

    const corporateLinks: NormalizedCorporateLink[] = (raw.qsa || []).map(
      (s: Record<string, unknown>) => {
        const entryStr = s.data_entrada_sociedade as string | undefined;
        const openStr = raw.data_inicio_atividade as string | undefined;
        const openDate = openStr ? new Date(openStr) : undefined;
        const entryDate = entryStr ? new Date(entryStr) : undefined;
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        return {
          companyName: raw.razao_social as string,
          companyCnpj: raw.cnpj as string,
          companyStatus: raw.descricao_situacao_cadastral as string | undefined,
          cnae: raw.cnae_fiscal ? String(raw.cnae_fiscal) : undefined,
          openDate,
          role: (s.qualificacao_socio as string) || "Socio",
          sharePercentage: undefined,
          capitalValue: raw.capital_social ? Number(raw.capital_social) : undefined,
          entryDate,
          isOffshore: false,
          isRecentCreation: openDate ? openDate > twoYearsAgo : false,
          hasIrregularity: raw.descricao_situacao_cadastral !== "ATIVA",
          irregularityDesc:
            raw.descricao_situacao_cadastral !== "ATIVA"
              ? `Situacao cadastral: ${raw.descricao_situacao_cadastral}`
              : undefined,
          sourceProvider: this.name,
          rawSourceData: s,
        };
      },
    );

    return this.buildResult(query, {
      success: true,
      data: {
        razaoSocial: raw.razao_social,
        nomeFantasia: raw.nome_fantasia,
        cnpj: raw.cnpj,
        situacao: raw.descricao_situacao_cadastral,
        capitalSocial: raw.capital_social,
        naturezaJuridica: `${raw.codigo_natureza_juridica} - ${raw.natureza_juridica}`,
        endereco: {
          logradouro: `${raw.descricao_tipo_de_logradouro || ""} ${raw.logradouro || ""}`.trim(),
          numero: raw.numero,
          complemento: raw.complemento,
          bairro: raw.bairro,
          cidade: raw.municipio,
          uf: raw.uf,
          cep: raw.cep,
        },
        cnaePrincipal: raw.cnae_fiscal
          ? { codigo: String(raw.cnae_fiscal), descricao: raw.cnae_fiscal_descricao }
          : null,
      },
      normalizedCorporateLinks: corporateLinks,
      rawResponse: raw,
    });
  }

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    return MockDataGenerator.generate(this.name, query);
  }
}
