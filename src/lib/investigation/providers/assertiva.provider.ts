/**
 * Assertiva Provider — credit scoring, protest records, and active debt data.
 *
 * Endpoints:
 *   - POST /scoring      — CONSULTA_SCORING (credit score + risk classification)
 *   - POST /protestos    — CONSULTA_PROTESTO (protest records)
 *   - POST /divida-ativa — CONSULTA_DIVIDA_ATIVA (government active debt records)
 *
 * Auth: Bearer token | Rate limit: configurable | Cost: per query
 * Docs: https://docs.assertivasolucoes.com.br
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedDebt,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://api.assertivasolucoes.com.br/v2";

export class AssertivaProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "ASSERTIVA";
  readonly displayName = "Assertiva";
  readonly category: ApiCategory = "CREDITICIO";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_SCORING", "CONSULTA_PROTESTO", "CONSULTA_DIVIDA_ATIVA"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const apiKey = config?.apiKey;

    if (!apiKey) {
      throw new Error("Assertiva API key (Bearer token) not configured");
    }

    switch (query.type) {
      case "CONSULTA_SCORING":
        return this.queryScoring(query, baseUrl, apiKey);
      case "CONSULTA_PROTESTO":
        return this.queryProtestos(query, baseUrl, apiKey);
      case "CONSULTA_DIVIDA_ATIVA":
        return this.queryDividaAtiva(query, baseUrl, apiKey);
      default:
        return this.buildResult(query, {
          success: false,
          errorMessage: `Unsupported query type: ${query.type}`,
        });
    }
  }

  // ─── CONSULTA_SCORING ──────────────────────────────────────────────────────

  private async queryScoring(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/scoring`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: document }),
      });
      if (!res.ok) throw new Error(`Assertiva scoring returned HTTP ${res.status}`);
      return res.json();
    });

    return this.buildResult(query, {
      success: true,
      data: {
        score: raw.score,
        riskClassification: raw.classificacao_risco || raw.risk_classification,
        negativacoes: raw.negativacoes || 0,
        protestos: raw.protestos || 0,
        chequesSemFundo: raw.cheques_sem_fundo || 0,
        consultasRecentes: raw.consultas_recentes || 0,
        rendaEstimada: raw.renda_estimada,
      },
      rawResponse: raw,
    });
  }

  // ─── CONSULTA_PROTESTO ─────────────────────────────────────────────────────

  private async queryProtestos(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/protestos`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: document }),
      });
      if (!res.ok) throw new Error(`Assertiva protestos returned HTTP ${res.status}`);
      return res.json();
    });

    const items: Record<string, unknown>[] = Array.isArray(raw.data) ? raw.data : [];

    const normalizedDebts: NormalizedDebt[] = items.map((item) => ({
      debtType: "PROTESTO" as const,
      creditor: (item.credor as string) || "N/I",
      creditorDocument: (item.documento_credor as string) || undefined,
      originalValue: item.valor ? Number(item.valor) : undefined,
      currentValue: item.valor_atualizado ? Number(item.valor_atualizado) : undefined,
      inscriptionDate: item.data_protesto
        ? new Date(item.data_protesto as string)
        : undefined,
      description: `Protesto - ${item.cartorio || "N/I"} - ${item.cidade || ""}/${item.uf || ""}`,
      status: (item.situacao as string) || "ATIVO",
      origin: `${item.cidade || ""}/${item.uf || ""}`,
      sourceProvider: this.name,
      rawSourceData: item,
    }));

    return this.buildResult(query, {
      success: true,
      data: { totalProtestos: normalizedDebts.length },
      normalizedDebts,
      rawResponse: raw,
    });
  }

  // ─── CONSULTA_DIVIDA_ATIVA ─────────────────────────────────────────────────

  private async queryDividaAtiva(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/divida-ativa`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: document }),
      });
      if (!res.ok) throw new Error(`Assertiva divida ativa returned HTTP ${res.status}`);
      return res.json();
    });

    const items: Record<string, unknown>[] = Array.isArray(raw.data) ? raw.data : [];

    const normalizedDebts: NormalizedDebt[] = items.map((item) => {
      const esfera = ((item.esfera as string) || "Federal").toLowerCase();
      const debtType = esfera.includes("estadual")
        ? ("DIVIDA_ATIVA_ESTADO" as const)
        : esfera.includes("municipal")
          ? ("DIVIDA_ATIVA_MUNICIPIO" as const)
          : ("DIVIDA_ATIVA_UNIAO" as const);
      return {
        debtType,
        creditor: (item.orgao as string) || "Fazenda Publica",
        creditorDocument: (item.cnpj_orgao as string) || undefined,
        originalValue: item.valor_original ? Number(item.valor_original) : undefined,
        currentValue: item.valor_atualizado ? Number(item.valor_atualizado) : undefined,
        inscriptionDate: item.data_inscricao
          ? new Date(item.data_inscricao as string)
          : undefined,
        description: `Divida Ativa - ${item.natureza || "N/I"} - ${item.orgao || ""}`,
        caseNumber: (item.numero_inscricao as string) || undefined,
        status: (item.situacao as string) || "ATIVO",
        origin: (item.esfera as string) || "Federal",
        sourceProvider: this.name,
        rawSourceData: item,
      };
    });

    return this.buildResult(query, {
      success: true,
      data: { totalDividas: normalizedDebts.length },
      normalizedDebts,
      rawResponse: raw,
    });
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    switch (query.type) {
      case "CONSULTA_SCORING": {
        const score = Math.floor(Math.random() * 1000);
        let riskClassification: string;
        if (score >= 800) riskClassification = "BAIXO";
        else if (score >= 600) riskClassification = "MEDIO";
        else if (score >= 400) riskClassification = "ALTO";
        else riskClassification = "MUITO_ALTO";

        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: {
            score,
            riskClassification,
            negativacoes: Math.floor(Math.random() * 5),
            protestos: Math.floor(Math.random() * 3),
            chequesSemFundo: Math.floor(Math.random() * 2),
            consultasRecentes: Math.floor(Math.random() * 10),
            rendaEstimada: Math.floor(Math.random() * 50000) + 3000,
          },
        });
      }
      case "CONSULTA_PROTESTO": {
        const mockResult = MockDataGenerator.generateProtestData(this.name, query);
        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: mockResult.data,
          normalizedDebts: mockResult.normalizedDebts,
        });
      }
      case "CONSULTA_DIVIDA_ATIVA": {
        const count = Math.floor(Math.random() * 3);
        const dividas: NormalizedDebt[] = Array.from({ length: count }, () => ({
          debtType: (Math.random() > 0.5 ? "DIVIDA_ATIVA_UNIAO" : "DIVIDA_ATIVA_ESTADO") as NormalizedDebt["debtType"],
          creditor:
            Math.random() > 0.5
              ? "Receita Federal"
              : "Procuradoria Geral da Fazenda Nacional",
          originalValue: Math.floor(Math.random() * 500000) + 1000,
          currentValue: Math.floor(Math.random() * 600000) + 1500,
          inscriptionDate: new Date(
            2020 + Math.floor(Math.random() * 5),
            Math.floor(Math.random() * 12),
            Math.floor(Math.random() * 28) + 1,
          ),
          description: `Divida Ativa - ${Math.random() > 0.5 ? "Tributaria" : "Nao Tributaria"}`,
          status: Math.random() > 0.3 ? "ATIVO" : "PARCELADO",
          origin: Math.random() > 0.5 ? "Federal" : "Estadual",
          sourceProvider: this.name as ApiProvider,
        }));

        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: { totalDividas: dividas.length, dividasAtivas: dividas },
          normalizedDebts: dividas,
        });
      }
      default:
        return this.buildResult(query, {
          success: false,
          isMock: true,
          errorMessage: `Unsupported query type: ${query.type}`,
        });
    }
  }
}
