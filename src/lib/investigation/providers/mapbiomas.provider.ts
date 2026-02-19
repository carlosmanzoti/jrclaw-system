/**
 * MapBiomas Provider — satellite imagery and land use/cover data for Brazil.
 *
 * Endpoints:
 *   - POST /graphql — CONSULTA_SATELITE (deforestation / environmental alerts)
 *   - POST /graphql — CONSULTA_RURAL (rural property land use analysis)
 *
 * Auth: Authorization Bearer header | Rate limit: configurable | Cost: FREE (public data)
 * Docs: https://platform.mapbiomas.org/api-docs
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedAsset,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://platform.mapbiomas.org/api/v1";

export class MapBiomasProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "MAPBIOMAS";
  readonly displayName = "MapBiomas";
  readonly category: ApiCategory = "RURAL_SATELITE";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_SATELITE", "CONSULTA_RURAL"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const apiKey = config?.apiKey;

    if (!apiKey) {
      throw new Error("MapBiomas API key not configured");
    }

    switch (query.type) {
      case "CONSULTA_SATELITE":
        return this.querySatelite(query, baseUrl, apiKey);
      case "CONSULTA_RURAL":
        return this.queryRural(query, baseUrl, apiKey);
      default:
        return this.buildResult(query, {
          success: false,
          errorMessage: `Unsupported query type: ${query.type}`,
        });
    }
  }

  // ─── CONSULTA_SATELITE ─────────────────────────────────────────────────────

  private async querySatelite(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const lat = query.params?.lat as number | undefined;
    const lng = query.params?.lng as number | undefined;
    const carCode = query.params?.carCode as string | undefined;
    const yearStart = (query.params?.yearStart as number) || 2020;
    const yearEnd = (query.params?.yearEnd as number) || new Date().getFullYear();

    const graphqlQuery = `
      query AlertsQuery($territory: TerritoryInput!, $yearRange: YearRangeInput!) {
        alerts(territory: $territory, yearRange: $yearRange) {
          id
          detectionDate
          areaHa
          alertType
          biome
          municipality
          state
          coordinates {
            lat
            lng
          }
          source
          confidence
        }
      }
    `;

    const variables: Record<string, unknown> = {
      yearRange: { start: yearStart, end: yearEnd },
      territory: carCode
        ? { type: "CAR", code: carCode }
        : lat && lng
          ? { type: "POINT", lat, lng, radiusKm: 10 }
          : { type: "DOCUMENT", code: query.targetDocument.replace(/\D/g, "") },
    };

    const url = `${baseUrl}/graphql`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: graphqlQuery, variables }),
      });
      if (!res.ok) throw new Error(`MapBiomas satellite returned HTTP ${res.status}`);
      return res.json();
    });

    const alerts: Record<string, unknown>[] =
      (raw.data?.alerts as Record<string, unknown>[]) || [];

    return this.buildResult(query, {
      success: true,
      data: {
        totalAlerts: alerts.length,
        alerts: alerts.map((alert) => ({
          dataDeteccao: alert.detectionDate,
          areaHa: alert.areaHa,
          tipo: alert.alertType,
          bioma: alert.biome,
          municipio: alert.municipality,
          uf: alert.state,
          coordenadas: alert.coordinates,
          fonte: alert.source,
          confianca: alert.confidence,
        })),
        yearRange: { start: yearStart, end: yearEnd },
        analysisDate: new Date().toISOString(),
      },
      rawResponse: raw,
    });
  }

  // ─── CONSULTA_RURAL ────────────────────────────────────────────────────────

  private async queryRural(
    query: ProviderQuery,
    baseUrl: string,
    apiKey: string,
  ): Promise<ProviderResult> {
    const carCode = query.params?.carCode as string | undefined;
    const year = (query.params?.year as number) || new Date().getFullYear() - 1;

    const graphqlQuery = `
      query LandUseQuery($territory: TerritoryInput!, $year: Int!) {
        landUse(territory: $territory, year: $year) {
          totalAreaHa
          classes {
            classId
            className
            areaHa
            percentage
          }
          transitions {
            fromClass
            toClass
            areaHa
            year
          }
          property {
            carCode
            ownerName
            municipality
            state
            totalAreaHa
            legalReserveHa
            appHa
            nativeVegetationHa
          }
        }
      }
    `;

    const variables: Record<string, unknown> = {
      year,
      territory: carCode
        ? { type: "CAR", code: carCode }
        : { type: "DOCUMENT", code: query.targetDocument.replace(/\D/g, "") },
    };

    const url = `${baseUrl}/graphql`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: graphqlQuery, variables }),
      });
      if (!res.ok) throw new Error(`MapBiomas rural returned HTTP ${res.status}`);
      return res.json();
    });

    const landUse = raw.data?.landUse as Record<string, unknown> | undefined;
    const property = landUse?.property as Record<string, unknown> | undefined;

    const normalizedAssets: NormalizedAsset[] = [];

    if (property) {
      normalizedAssets.push({
        category: "IMOVEL_RURAL" as const,
        subcategory: "Rural",
        description: `Imovel Rural - ${property.municipality || "N/I"}/${property.state || "N/I"} (CAR: ${property.carCode || "N/I"})`,
        registrationId: property.carCode as string | undefined,
        location: `${property.municipality || ""}/${property.state || ""}`,
        state: property.state as string | undefined,
        city: property.municipality as string | undefined,
        hasRestriction: false,
        isSeizable: true,
        ownershipPercentage: 100,
        areaHectares: property.totalAreaHa ? Number(property.totalAreaHa) : undefined,
        carCode: property.carCode as string | undefined,
        sourceProvider: this.name,
        rawSourceData: landUse,
      });
    }

    return this.buildResult(query, {
      success: true,
      data: {
        year,
        totalAreaHa: landUse?.totalAreaHa,
        classes: landUse?.classes || [],
        transitions: landUse?.transitions || [],
        property: property
          ? {
              carCode: property.carCode,
              proprietario: property.ownerName,
              municipio: property.municipality,
              uf: property.state,
              areaTotal: property.totalAreaHa,
              reservaLegal: property.legalReserveHa,
              app: property.appHa,
              vegetacaoNativa: property.nativeVegetationHa,
            }
          : null,
        analysisDate: new Date().toISOString(),
      },
      normalizedAssets,
      rawResponse: raw,
    });
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    switch (query.type) {
      case "CONSULTA_SATELITE": {
        const mockResult = MockDataGenerator.generateSatelliteData(this.name, query);
        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: mockResult.data,
        });
      }
      case "CONSULTA_RURAL": {
        const mockResult = MockDataGenerator.generateRuralData(this.name, query);
        const ruralAssets = (mockResult.normalizedAssets || []).filter(
          (a) => a.category === "IMOVEL_RURAL",
        );

        // Ensure at least one rural asset is present in mock output
        const assets: NormalizedAsset[] =
          ruralAssets.length > 0
            ? ruralAssets
            : [
                {
                  category: "IMOVEL_RURAL" as const,
                  subcategory: "Rural",
                  description: "Imovel Rural - Balsas/MA",
                  registrationId: `CAR-MA-${Math.floor(Math.random() * 900000) + 100000}`,
                  location: "Balsas/MA",
                  state: "MA",
                  city: "Balsas",
                  hasRestriction: false,
                  isSeizable: true,
                  ownershipPercentage: 100,
                  areaHectares: Math.floor(Math.random() * 5000) + 50,
                  sourceProvider: this.name,
                },
              ];

        const mainAsset = assets[0];
        const totalArea = mainAsset.areaHectares || 500;

        return this.buildResult(query, {
          success: true,
          isMock: true,
          data: {
            year: new Date().getFullYear() - 1,
            totalAreaHa: totalArea,
            classes: [
              { classId: 1, className: "Floresta", areaHa: totalArea * 0.3, percentage: 30 },
              { classId: 2, className: "Agricultura", areaHa: totalArea * 0.5, percentage: 50 },
              { classId: 3, className: "Pastagem", areaHa: totalArea * 0.15, percentage: 15 },
              { classId: 4, className: "Outros", areaHa: totalArea * 0.05, percentage: 5 },
            ],
            transitions: [],
            property: {
              carCode: mainAsset.registrationId,
              proprietario: "N/I",
              municipio: mainAsset.city,
              uf: mainAsset.state,
              areaTotal: totalArea,
              reservaLegal: totalArea * 0.2,
              app: totalArea * 0.05,
              vegetacaoNativa: totalArea * 0.3,
            },
            analysisDate: new Date().toISOString(),
          },
          normalizedAssets: assets,
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
