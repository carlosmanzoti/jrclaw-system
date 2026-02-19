/**
 * InfoSimples Provider — patrimonial data aggregator for Brazilian public records.
 *
 * Endpoints:
 *   - POST /consulta/imoveis    — CONSULTA_IMOVEL (real estate registry)
 *   - POST /consulta/veiculos   — CONSULTA_VEICULO (vehicle registry via SENATRAN)
 *   - POST /consulta/protestos  — CONSULTA_PROTESTO (protest records via IEPTB)
 *
 * Auth: Authorization Bearer token | Rate limit: configurable | Cost: R$0.10–0.25/query
 * Docs: https://api.infosimples.com/docs
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedAsset,
  NormalizedDebt,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://api.infosimples.com/api/v2";

export class InfoSimplesProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "INFOSIMPLES";
  readonly displayName = "InfoSimples";
  readonly category: ApiCategory = "PATRIMONIAL";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_IMOVEL", "CONSULTA_VEICULO", "CONSULTA_PROTESTO"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const apiKey = config?.apiKey;

    if (!apiKey) {
      throw new Error("InfoSimples API key not configured");
    }

    switch (query.type) {
      case "CONSULTA_IMOVEL":
        return this.queryImoveis(query, baseUrl, apiKey);
      case "CONSULTA_VEICULO":
        return this.queryVeiculos(query, baseUrl, apiKey);
      case "CONSULTA_PROTESTO":
        return this.queryProtestos(query, baseUrl, apiKey);
      default:
        return this.buildResult(query, {
          success: false,
          errorMessage: `Unsupported query type: ${query.type}`,
        });
    }
  }

  // ─── CONSULTA_IMOVEL ────────────────────────────────────────────────────────

  private async queryImoveis(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/consulta/imoveis`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: document }),
      });
      if (!res.ok) throw new Error(`InfoSimples imoveis returned HTTP ${res.status}`);
      const body = await res.json();
      if (body.code && body.code !== 200) {
        throw new Error(`InfoSimples API error: ${body.code_message || body.code}`);
      }
      return body;
    });

    const items: Record<string, unknown>[] = Array.isArray(raw.data) ? raw.data : [];

    const normalizedAssets: NormalizedAsset[] = items.map((item) => {
      const tipo = (item.tipo as string) || "Urbano";
      const hasRestriction = Boolean(item.restricao);
      return {
        category: (tipo === "Rural" ? "IMOVEL_RURAL" : "IMOVEL_URBANO") as
          | "IMOVEL_RURAL"
          | "IMOVEL_URBANO",
        subcategory: tipo,
        description: `Imovel ${tipo} - ${item.municipio || "N/I"}/${item.uf || "N/I"}`,
        registrationId: item.matricula as string | undefined,
        location: `${item.municipio || ""}/${item.uf || ""}`,
        state: item.uf as string | undefined,
        city: item.municipio as string | undefined,
        estimatedValue: item.valor_estimado ? Number(item.valor_estimado) : undefined,
        valuationMethod: "Estimativa InfoSimples",
        hasRestriction,
        restrictionType: hasRestriction ? (item.restricao as string) : undefined,
        restrictionDetail: hasRestriction ? (item.detalhe_restricao as string) : undefined,
        isSeizable: !hasRestriction,
        ownershipPercentage: item.percentual_propriedade
          ? Number(item.percentual_propriedade)
          : 100,
        areaHectares: item.area_hectares ? Number(item.area_hectares) : undefined,
        sourceProvider: this.name,
        rawSourceData: item,
      };
    });

    return this.buildResult(query, {
      success: true,
      data: { totalImoveis: normalizedAssets.length, registros: items },
      normalizedAssets,
      rawResponse: raw,
    });
  }

  // ─── CONSULTA_VEICULO ──────────────────────────────────────────────────────

  private async queryVeiculos(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/consulta/veiculos`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: document }),
      });
      if (!res.ok) throw new Error(`InfoSimples veiculos returned HTTP ${res.status}`);
      const body = await res.json();
      if (body.code && body.code !== 200) {
        throw new Error(`InfoSimples API error: ${body.code_message || body.code}`);
      }
      return body;
    });

    const items: Record<string, unknown>[] = Array.isArray(raw.data) ? raw.data : [];

    const normalizedAssets: NormalizedAsset[] = items.map((item) => {
      const hasRestriction = Boolean(
        item.restricao || (item.restricoes && (item.restricoes as string[]).length > 0),
      );
      return {
        category: "VEICULO_AUTOMOVEL" as const,
        subcategory: (item.tipo_veiculo as string) || (item.marca as string) || "Automovel",
        description: `${item.marca || ""} ${item.modelo || ""} ${item.ano_modelo || ""}`.trim(),
        registrationId: (item.renavam as string) || (item.placa as string) || undefined,
        location: item.uf as string | undefined,
        state: item.uf as string | undefined,
        estimatedValue: item.valor_fipe ? Number(item.valor_fipe) : undefined,
        valuationMethod: "FIPE",
        hasRestriction,
        restrictionType: hasRestriction
          ? Array.isArray(item.restricoes)
            ? (item.restricoes as string[]).join(", ")
            : (item.restricao as string)
          : undefined,
        isSeizable: !hasRestriction,
        ownershipPercentage: 100,
        sourceProvider: this.name,
        rawSourceData: item,
      };
    });

    return this.buildResult(query, {
      success: true,
      data: { totalVeiculos: normalizedAssets.length, registros: items },
      normalizedAssets,
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
    const url = `${baseUrl}/consulta/protestos`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ documento: document }),
      });
      if (!res.ok) throw new Error(`InfoSimples protestos returned HTTP ${res.status}`);
      const body = await res.json();
      if (body.code && body.code !== 200) {
        throw new Error(`InfoSimples API error: ${body.code_message || body.code}`);
      }
      return body;
    });

    const items: Record<string, unknown>[] = Array.isArray(raw.data) ? raw.data : [];

    const normalizedDebts: NormalizedDebt[] = items.map((item) => ({
      debtType: "PROTESTO" as const,
      creditor: (item.credor as string) || "N/I",
      creditorDocument: (item.documento_credor as string) || undefined,
      originalValue: item.valor ? Number(item.valor) : undefined,
      currentValue: item.valor_atualizado ? Number(item.valor_atualizado) : undefined,
      inscriptionDate: item.data_protesto ? new Date(item.data_protesto as string) : undefined,
      description: `Protesto - ${item.cartorio || item.tabelionato || "N/I"} - ${item.cidade || item.municipio || ""}/${item.uf || ""}`,
      status: (item.situacao as string) || "ATIVO",
      origin: `${item.cidade || item.municipio || ""}/${item.uf || ""}`,
      sourceProvider: this.name,
      rawSourceData: item,
    }));

    return this.buildResult(query, {
      success: true,
      data: { totalProtestos: normalizedDebts.length, registros: items },
      normalizedDebts,
      rawResponse: raw,
    });
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    switch (query.type) {
      case "CONSULTA_IMOVEL": {
        const mockResult = MockDataGenerator.generatePropertyData(this.name, query);
        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: mockResult.data,
          normalizedAssets: mockResult.normalizedAssets,
        });
      }
      case "CONSULTA_VEICULO": {
        const mockResult = MockDataGenerator.generateVehicleData(this.name, query);
        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: mockResult.data,
          normalizedAssets: mockResult.normalizedAssets,
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
      default:
        return this.buildResult(query, {
          success: false,
          isMock: true,
          errorMessage: `Unsupported query type: ${query.type}`,
        });
    }
  }
}
