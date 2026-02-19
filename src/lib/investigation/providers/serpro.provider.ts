/**
 * SERPRO/DENATRAN Provider — vehicle registration data via SERPRO gateway.
 *
 * Endpoints:
 *   - GET /consulta-denatran/v1/veiculos/{placa} — CONSULTA_VEICULO
 *
 * Auth: Bearer token (OAuth2 client credentials flow)
 * Rate limit: configurable | Cost: per query
 * Docs: https://servicos.serpro.gov.br/api-denatran
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedAsset,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://gateway.apiserpro.serpro.gov.br";
const TOKEN_URL = "https://gateway.apiserpro.serpro.gov.br/token";

export class SerproProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "DENATRAN_SERPRO";
  readonly displayName = "SERPRO/DENATRAN";
  readonly category: ApiCategory = "VEICULAR";

  /** Cached OAuth2 access token */
  private cachedToken: { token: string; expiresAt: number } | null = null;

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_VEICULO"];
  }

  // ─── OAuth2 Client Credentials ─────────────────────────────────────────────

  /**
   * Obtains an OAuth2 access token using the client credentials flow.
   * Caches the token until it expires (with a 60-second safety buffer).
   */
  private async getOAuthToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const config = await this.getConfig();
    const consumerKey = config?.apiKey;
    const consumerSecret = config?.apiSecret;

    if (!consumerKey || !consumerSecret) {
      throw new Error("SERPRO OAuth2 client credentials not configured");
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
      "base64",
    );

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      throw new Error(`SERPRO OAuth token request failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    const expiresIn = (data.expires_in as number) || 3600;

    this.cachedToken = {
      token: data.access_token as string,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    };

    return this.cachedToken.token;
  }

  // ─── executeReal ───────────────────────────────────────────────────────────

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    if (query.type === "CONSULTA_VEICULO") {
      return this.queryVeiculo(query);
    }

    return this.buildResult(query, {
      success: false,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }

  // ─── CONSULTA_VEICULO ──────────────────────────────────────────────────────

  private async queryVeiculo(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const token = await this.getOAuthToken();

    const document = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/consulta-denatran/v1/veiculos/${encodeURIComponent(document)}`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`SERPRO DENATRAN returned HTTP ${res.status}`);
      return res.json();
    });

    const veiculos: Record<string, unknown>[] = raw.veiculos || [raw];
    const normalizedAssets: NormalizedAsset[] = veiculos
      .filter((v) => v.placa || v.renavam)
      .map((item) => {
        const hasRestriction = Boolean(
          item.restricao || item.restricoes || item.situacaoVeiculo === "RESTRICAO",
        );
        return {
          category: "VEICULO_AUTOMOVEL" as const,
          subcategory: (item.tipoVeiculo as string) || (item.marca as string) || "Automovel",
          description:
            `${item.marca || ""} ${item.modelo || ""} ${item.anoModelo || item.anoFabricacao || ""}`.trim(),
          registrationId:
            (item.renavam as string) || (item.placa as string) || undefined,
          location: item.uf as string | undefined,
          state: item.uf as string | undefined,
          estimatedValue: item.valorFipe ? Number(item.valorFipe) : undefined,
          valuationMethod: item.valorFipe ? "FIPE" : undefined,
          hasRestriction,
          restrictionType: hasRestriction
            ? (item.tipoRestricao as string) ||
              String(item.restricao || item.restricoes)
            : undefined,
          isSeizable: !hasRestriction,
          ownershipPercentage: 100,
          sourceProvider: this.name,
          rawSourceData: item,
        };
      });

    return this.buildResult(query, {
      success: true,
      data: { totalVeiculos: normalizedAssets.length },
      normalizedAssets,
      rawResponse: raw,
    });
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    if (query.type === "CONSULTA_VEICULO") {
      const mockResult = MockDataGenerator.generateVehicleData(this.name, query);
      return this.buildResult(query, {
        success: true,
        isMock: true,
        data: mockResult.data,
        normalizedAssets: mockResult.normalizedAssets,
      });
    }

    return this.buildResult(query, {
      success: false,
      isMock: true,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }
}
