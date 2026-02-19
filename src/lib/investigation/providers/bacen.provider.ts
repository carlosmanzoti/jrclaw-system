/**
 * BACEN Provider — Brazilian Central Bank open data (Olinda API).
 *
 * URL: https://olinda.bcb.gov.br/olinda/servico/
 * Uses PTAX for currency conversion and IF.data for financial institution checks.
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

const BACEN_BASE = "https://olinda.bcb.gov.br/olinda/servico";

export class BacenProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "BACEN";
  readonly displayName = "Banco Central (BACEN)";
  readonly category: ApiCategory = "CREDITICIO";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_CNPJ"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const target = query.targetDocument.replace(/\D/g, "");

    const [institutions, ptax] = await Promise.all([
      this.searchInstitution(target),
      this.getPtaxRate(),
    ]);

    const assets: NormalizedAsset[] = institutions.map((inst) => ({
      category: "PARTICIPACAO_SOCIETARIA" as const,
      subcategory: "Instituicao Financeira",
      description: `${inst.nome} - ${inst.segmento || "N/I"} (${inst.tipo || "N/I"})`,
      registrationId: inst.cnpj,
      hasRestriction: false,
      isSeizable: false,
      sourceProvider: this.name,
      rawSourceData: inst,
    }));

    return this.buildResult(query, {
      success: true,
      data: {
        totalInstituicoes: institutions.length,
        ptax,
      },
      normalizedAssets: assets,
      rawResponse: { institutions, ptax },
    });
  }

  private async searchInstitution(
    cnpj: string,
  ): Promise<{ nome: string; cnpj: string; segmento?: string; tipo?: string }[]> {
    return this.retryWithBackoff(async () => {
      const url =
        `${BACEN_BASE}/Informes_ListaIFsViworker/versao/v1/odata/IfData` +
        `?$filter=contains(CnpjIf,'${cnpj}')&$format=json&$top=10`;

      const res = await fetch(url);
      if (!res.ok) {
        // Fallback: get all and filter client-side
        const fallbackUrl =
          `${BACEN_BASE}/Informes_ListaIFsViworker/versao/v1/odata/IfData` +
          `?$format=json&$top=50`;
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) throw new Error(`BACEN IF.data returned HTTP ${fallbackRes.status}`);
        const fallbackData = await fallbackRes.json();
        return this.filterInstitutions(fallbackData.value || [], cnpj);
      }

      const data = await res.json();
      return (data.value || []).map((item: Record<string, unknown>) => ({
        nome: (item.NomeIf as string) || "",
        cnpj: (item.CnpjIf as string) || "",
        segmento: (item.Segmento as string) || undefined,
        tipo: (item.TipoInstituicao as string) || undefined,
      }));
    });
  }

  private filterInstitutions(
    items: Record<string, unknown>[],
    cnpj: string,
  ): { nome: string; cnpj: string; segmento?: string; tipo?: string }[] {
    return items
      .filter((item) => {
        const itemCnpj = String(item.CnpjIf || "").replace(/\D/g, "");
        return itemCnpj.includes(cnpj) || cnpj.includes(itemCnpj);
      })
      .map((item) => ({
        nome: (item.NomeIf as string) || "",
        cnpj: (item.CnpjIf as string) || "",
        segmento: (item.Segmento as string) || undefined,
        tipo: (item.TipoInstituicao as string) || undefined,
      }));
  }

  private async getPtaxRate(): Promise<{
    compra: number;
    venda: number;
    data: string;
  } | null> {
    try {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const yyyy = today.getFullYear();
      const dateStr = `${mm}-${dd}-${yyyy}`;

      const url =
        `${BACEN_BASE}/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@d)` +
        `?@d='${dateStr}'&$format=json`;

      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const cotacao = data.value?.[0];
      if (!cotacao) return null;
      return {
        compra: cotacao.cotacaoCompra,
        venda: cotacao.cotacaoVenda,
        data: cotacao.dataHoraCotacao,
      };
    } catch {
      return null;
    }
  }

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    return MockDataGenerator.generate(this.name, query);
  }
}
