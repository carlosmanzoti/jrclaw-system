/**
 * CNPJA Provider — free cache-mode company lookup.
 *
 * Endpoint: GET https://open.cnpja.com/office/{cnpj}
 *
 * Auth: none (free cache mode) | Rate limit: moderate | Cost: FREE
 * Docs: https://cnpja.com/docs
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedCorporateLink,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://open.cnpja.com";

export class CnpjaProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "CNPJA";
  readonly displayName = "CNPJA Open";
  readonly category: ApiCategory = "CADASTRAL";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_CNPJ"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const cnpj = query.targetDocument.replace(/\D/g, "");
    const url = `${baseUrl}/office/${cnpj}`;

    const raw = await this.retryWithBackoff(async () => {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`CNPJA returned HTTP ${res.status}`);
      return res.json();
    });

    const members: Record<string, unknown>[] = raw.company?.members || [];
    const address = raw.address as Record<string, unknown> | undefined;
    const mainActivity = (raw.mainActivity || {}) as Record<string, unknown>;
    const sideActivities = (raw.sideActivities || []) as Record<string, unknown>[];
    const companyName = (raw.company?.name as string) || raw.alias || "";
    const companyCnpj = (raw.taxId as string) || cnpj;
    const companyStatus = (raw.status as Record<string, unknown>)?.text as string | undefined;
    const openDateStr = raw.founded as string | undefined;
    const openDate = openDateStr ? new Date(openDateStr) : undefined;
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const corporateLinks: NormalizedCorporateLink[] = members.map((m) => {
      const person = m.person as Record<string, unknown> | undefined;
      const role = (m.role as Record<string, unknown>)?.text as string || "Socio";
      const entryStr = m.since as string | undefined;
      return {
        companyName,
        companyCnpj,
        companyStatus,
        cnae: mainActivity.id ? String(mainActivity.id) : undefined,
        openDate,
        role,
        sharePercentage: undefined,
        capitalValue: raw.company?.equity ? Number(raw.company.equity) : undefined,
        entryDate: entryStr ? new Date(entryStr) : undefined,
        isOffshore: false,
        isRecentCreation: openDate ? openDate > twoYearsAgo : false,
        hasIrregularity: companyStatus !== undefined && companyStatus !== "Ativa",
        irregularityDesc:
          companyStatus && companyStatus !== "Ativa"
            ? `Situacao: ${companyStatus}`
            : undefined,
        sourceProvider: this.name,
        rawSourceData: { person, role: m.role },
      };
    });

    const cityObj = address?.city as Record<string, unknown> | undefined;
    const stateObj = address?.state as Record<string, unknown> | undefined;

    return this.buildResult(query, {
      success: true,
      data: {
        razaoSocial: companyName,
        nomeFantasia: raw.alias || undefined,
        cnpj: companyCnpj,
        situacao: companyStatus,
        capitalSocial: raw.company?.equity,
        endereco: address
          ? {
              logradouro: address.street || "",
              numero: address.number,
              complemento: address.details,
              bairro: address.district,
              cidade: cityObj?.name,
              uf: stateObj?.code,
              cep: address.zip,
            }
          : null,
        cnaePrincipal: mainActivity.id
          ? { codigo: String(mainActivity.id), descricao: mainActivity.text }
          : null,
        cnaeSecundarios: sideActivities.map((a) => ({
          codigo: String(a.id),
          descricao: a.text,
        })),
      },
      normalizedCorporateLinks: corporateLinks,
      rawResponse: raw,
    });
  }

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    return MockDataGenerator.generate(this.name, query);
  }
}
