/**
 * Escavador Provider — Brazilian legal intelligence platform.
 *
 * Endpoints:
 *   - GET /processos?cpf_cnpj={doc} — CONSULTA_PROCESSO (lawsuits by document)
 *   - GET /pessoas?cpf={cpf}        — CONSULTA_CPF (person data)
 *
 * Auth: X-Api-Key header | Rate limit: 500 req/min | Cost: per query
 * Docs: https://api.escavador.com/docs
 */

import type { ApiCategory, ApiProvider, LawsuitRelevance, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedLawsuit,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://api.escavador.com/v1";

export class EscavadorProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "ESCAVADOR";
  readonly displayName = "Escavador";
  readonly category: ApiCategory = "JUDICIAL";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_PROCESSO", "CONSULTA_CPF"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const apiKey = config?.apiKey;

    if (!apiKey) {
      throw new Error("Escavador API key not configured");
    }

    switch (query.type) {
      case "CONSULTA_PROCESSO":
        return this.queryProcessos(query, baseUrl, apiKey);
      case "CONSULTA_CPF":
        return this.queryCpf(query, baseUrl, apiKey);
      default:
        return this.buildResult(query, {
          success: false,
          errorMessage: `Unsupported query type: ${query.type}`,
        });
    }
  }

  // ─── CONSULTA_PROCESSO ─────────────────────────────────────────────────────

  private async queryProcessos(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/processos?cpf_cnpj=${encodeURIComponent(document)}`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });
      if (!res.ok) throw new Error(`Escavador processos returned HTTP ${res.status}`);
      return res.json();
    });

    const items: Record<string, unknown>[] = raw.data || raw.items || [];

    const normalizedLawsuits: NormalizedLawsuit[] = items.map((item) => {
      const classe =
        (item.tipo_processo as string) || (item.classe as string) || undefined;
      return {
        caseNumber:
          (item.numero_processo as string) || (item.numero_cnj as string) || "",
        court: (item.tribunal as string) || "",
        vara: (item.vara as string) || undefined,
        subject: (item.assunto as string) || undefined,
        class_: classe,
        role: (item.polo as string) || "DESCONHECIDO",
        otherParties: (item.partes as Record<string, unknown>[]) || undefined,
        estimatedValue: item.valor_causa ? Number(item.valor_causa) : undefined,
        status: (item.status as string) || "Em andamento",
        lastMovement: (item.ultima_movimentacao as string) || undefined,
        lastMovementDate: item.data_ultima_movimentacao
          ? new Date(item.data_ultima_movimentacao as string)
          : undefined,
        distributionDate: item.data_distribuicao
          ? new Date(item.data_distribuicao as string)
          : undefined,
        relevance: this.classifyRelevance(classe),
        hasAssetFreeze: Boolean(item.bloqueio_bens),
        sourceProvider: this.name,
        rawSourceData: item,
      };
    });

    return this.buildResult(query, {
      success: true,
      data: { totalProcessos: normalizedLawsuits.length },
      normalizedLawsuits,
      rawResponse: raw,
    });
  }

  // ─── CONSULTA_CPF ──────────────────────────────────────────────────────────

  private async queryCpf(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/pessoas?cpf=${encodeURIComponent(document)}`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Api-Key": apiKey,
        },
      });
      if (!res.ok) throw new Error(`Escavador CPF returned HTTP ${res.status}`);
      return res.json();
    });

    return this.buildResult(query, {
      success: true,
      data: raw.data || raw,
      rawResponse: raw,
    });
  }

  // ─── Relevance classification helper ───────────────────────────────────────

  private classifyRelevance(classe: string | undefined): LawsuitRelevance {
    if (!classe) return "BAIXA";
    const lower = classe.toLowerCase();
    if (lower.includes("execu") && lower.includes("fiscal")) return "CRITICA";
    if (lower.includes("fal") || lower.includes("recupera")) return "CRITICA";
    if (lower.includes("cobran") || lower.includes("execu")) return "ALTA";
    if (lower.includes("ordin")) return "MEDIA";
    return "BAIXA";
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    switch (query.type) {
      case "CONSULTA_PROCESSO": {
        const mockResult = MockDataGenerator.generateProcessData(this.name, query);
        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: mockResult.data,
          normalizedLawsuits: mockResult.normalizedLawsuits,
        });
      }
      case "CONSULTA_CPF": {
        const mockResult = MockDataGenerator.generateCpfData(this.name, query);
        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: mockResult.data,
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
