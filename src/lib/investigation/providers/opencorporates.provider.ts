/**
 * OpenCorporates Provider — global corporate registry search.
 *
 * Endpoints:
 *   - GET /companies/search — CONSULTA_SOCIETARIA (corporate structure + links)
 *
 * Auth: api_token query parameter | Rate limit: 500/day (free) | Cost: plan-dependent
 * Docs: https://api.opencorporates.com/documentation
 */

import type { ApiCategory, ApiProvider, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedCorporateLink,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const BASE_URL = "https://api.opencorporates.com/v0.4";

/** Jurisdiction codes commonly associated with offshore jurisdictions */
const OFFSHORE_CODES = new Set([
  "pa", "bz", "vg", "ky", "bm", "bs", "ai", "tc", "ms", "je", "gg", "im",
  "gi", "lu", "li", "mc", "ad", "sm", "mt", "cy", "sc", "mu", "ws", "vu",
  "mh", "nr", "ck", "nz_fc",
]);

export class OpenCorporatesProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "OPENCORPORATES";
  readonly displayName = "OpenCorporates";
  readonly category: ApiCategory = "SOCIETARIO";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_SOCIETARIA"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    if (query.type === "CONSULTA_SOCIETARIA") {
      return this.querySocietaria(query);
    }

    return this.buildResult(query, {
      success: false,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }

  // ─── CONSULTA_SOCIETARIA ───────────────────────────────────────────────────

  private async querySocietaria(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || BASE_URL;
    const apiToken = config?.apiKey;

    if (!apiToken) {
      throw new Error("OpenCorporates API token not configured");
    }

    const searchName =
      (query.params?.companyName as string) || query.targetDocument;
    const tokenParam = `api_token=${apiToken}`;

    // Search both companies and officers in parallel
    const [companiesResult, officersResult] = await Promise.allSettled([
      this.searchCompanies(baseUrl, tokenParam, searchName),
      this.searchOfficers(baseUrl, tokenParam, searchName),
    ]);

    const companies =
      companiesResult.status === "fulfilled" ? companiesResult.value : [];
    const officers =
      officersResult.status === "fulfilled" ? officersResult.value : [];

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const corporateLinks: NormalizedCorporateLink[] = [];

    // Normalize company results
    for (const c of companies) {
      const company = (c.company || c) as Record<string, unknown>;
      const jurisdiction = (company.jurisdiction_code as string) || "";
      const isOffshore = OFFSHORE_CODES.has(jurisdiction.toLowerCase());
      const openDate = company.incorporation_date
        ? new Date(company.incorporation_date as string)
        : undefined;
      const statusStr = (company.current_status as string) || "";
      const isInactive =
        statusStr.toLowerCase().includes("inactive") ||
        statusStr.toLowerCase().includes("dissolved");

      corporateLinks.push({
        companyName: (company.name as string) || "N/I",
        companyCnpj: (company.company_number as string) || "",
        companyStatus: statusStr || undefined,
        cnae: Array.isArray(company.industry_codes)
          ? (company.industry_codes as Record<string, unknown>[])
              .map((ic) => ic.code)
              .join(", ")
          : undefined,
        openDate,
        role: "Titular",
        isOffshore,
        isRecentCreation: openDate ? openDate > twoYearsAgo : false,
        hasIrregularity: isInactive,
        irregularityDesc: isInactive
          ? `Status: ${statusStr} (${jurisdiction})`
          : undefined,
        sourceProvider: this.name,
        rawSourceData: company,
      });
    }

    // Normalize officer results
    for (const o of officers) {
      const officer = (o.officer || o) as Record<string, unknown>;
      const company = officer.company as Record<string, unknown> | undefined;
      const jurisdiction =
        (company?.jurisdiction_code as string) ||
        (officer.jurisdiction_code as string) ||
        "";

      corporateLinks.push({
        companyName: (company?.name as string) || "N/I",
        companyCnpj: (company?.company_number as string) || "",
        companyStatus: undefined,
        role: (officer.position as string) || "Officer",
        entryDate: officer.start_date
          ? new Date(officer.start_date as string)
          : undefined,
        exitDate: officer.end_date
          ? new Date(officer.end_date as string)
          : undefined,
        isOffshore: OFFSHORE_CODES.has(jurisdiction.toLowerCase()),
        isRecentCreation: false,
        hasIrregularity: false,
        sourceProvider: this.name,
        rawSourceData: officer,
      });
    }

    return this.buildResult(query, {
      success: true,
      data: {
        totalResults: corporateLinks.length,
        totalCompanies: companies.length,
        totalOfficers: officers.length,
        companies: companies.map((c) => {
          const company = (c.company || c) as Record<string, unknown>;
          return {
            name: company.name,
            companyNumber: company.company_number,
            jurisdictionCode: company.jurisdiction_code,
            status: company.current_status,
            incorporationDate: company.incorporation_date,
            registeredAddress: company.registered_address_in_full,
          };
        }),
      },
      normalizedCorporateLinks: corporateLinks,
      rawResponse: { companies, officers },
    });
  }

  // ─── API helper: search companies ──────────────────────────────────────────

  private async searchCompanies(
    baseUrl: string,
    tokenParam: string,
    name: string,
  ): Promise<Record<string, unknown>[]> {
    return this.retryWithBackoff(async () => {
      const url =
        `${baseUrl}/companies/search` +
        `?q=${encodeURIComponent(name)}&${tokenParam}&jurisdiction_code=br&per_page=30`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`OpenCorporates companies returned HTTP ${res.status}`);
      const data = await res.json();
      return data.results?.companies || [];
    });
  }

  // ─── API helper: search officers ───────────────────────────────────────────

  private async searchOfficers(
    baseUrl: string,
    tokenParam: string,
    name: string,
  ): Promise<Record<string, unknown>[]> {
    return this.retryWithBackoff(async () => {
      const url =
        `${baseUrl}/officers/search` +
        `?q=${encodeURIComponent(name)}&${tokenParam}&per_page=20`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`OpenCorporates officers returned HTTP ${res.status}`);
      const data = await res.json();
      return data.results?.officers || [];
    });
  }

  // ─── Mock fallback ─────────────────────────────────────────────────────────

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    if (query.type === "CONSULTA_SOCIETARIA") {
      const mockResult = MockDataGenerator.generateCorporateData(this.name, query);
      const links = mockResult.normalizedCorporateLinks || [];

      return this.buildResult(query, {
        success: true,
        isMock: true,
        data: {
          totalResults: links.length,
          totalCompanies: links.length,
          totalOfficers: 0,
          jurisdiction: "br",
          companies: links.map((link) => ({
            name: link.companyName,
            companyNumber: link.companyCnpj,
            jurisdictionCode: "br",
            status: link.companyStatus,
            incorporationDate: link.openDate?.toISOString().slice(0, 10),
          })),
        },
        normalizedCorporateLinks: links,
      });
    }

    return this.buildResult(query, {
      success: false,
      isMock: true,
      errorMessage: `Unsupported query type: ${query.type}`,
    });
  }
}
