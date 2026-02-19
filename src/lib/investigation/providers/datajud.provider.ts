/**
 * DataJud Provider — CNJ public Elasticsearch API for lawsuits.
 *
 * URL: https://api-publica.datajud.cnj.jus.br
 * Auth: APIKey header
 * POST /api_publica_{tribunal}/_search with Elasticsearch body
 * Tribunals queried in parallel: tjpr, tjma, trf1, trf4, trt9, trt16, stj, tst
 *
 * Auto-classifies relevance:
 *   CRITICA — Execucao Fiscal, Falencia, Recuperacao Judicial
 *   ALTA    — Cobranca, Execucao
 *   MEDIA   — Acao Ordinaria / Conhecimento
 *   BAIXA   — others
 *
 * This is the MOST IMPORTANT provider for the investigation module.
 */

import type { ApiCategory, ApiProvider, LawsuitRelevance, QueryType } from "@prisma/client";

import { BaseInvestigationProvider } from "@/lib/investigation/base-provider";
import { MockDataGenerator } from "@/lib/investigation/mock-data-generator";
import type {
  NormalizedLawsuit,
  ProviderQuery,
  ProviderResult,
} from "@/lib/investigation/types";

const DEFAULT_BASE = "https://api-publica.datajud.cnj.jus.br";
const TRIBUNALS = ["tjpr", "tjma", "trf1", "trf4", "trt9", "trt16", "stj", "tst"] as const;

function classifyRelevance(classe: string | undefined): LawsuitRelevance {
  if (!classe) return "BAIXA";
  const lower = classe.toLowerCase();

  const isCritica =
    (lower.includes("execu") && lower.includes("fiscal")) ||
    lower.includes("fal") && (lower.includes("ncia") || lower.includes("encia")) ||
    (lower.includes("recupera") && lower.includes("judicial"));
  if (isCritica) return "CRITICA";

  if (lower.includes("cobran") || lower.includes("execu")) return "ALTA";
  if (lower.includes("ordin") || lower.includes("conhecimento")) return "MEDIA";
  return "BAIXA";
}

function detectAssetFreeze(movimentos: Record<string, unknown>[]): boolean {
  for (const mov of movimentos) {
    const nome = String(mov.nome || "").toLowerCase();
    if (
      nome.includes("penhora") ||
      nome.includes("bloqueio") ||
      nome.includes("arresto") ||
      nome.includes("indisponibilidade") ||
      nome.includes("bacenjud") ||
      nome.includes("sisbajud")
    ) {
      return true;
    }
  }
  return false;
}

export class DataJudProvider extends BaseInvestigationProvider {
  readonly name: ApiProvider = "DATAJUD";
  readonly displayName = "DataJud (CNJ)";
  readonly category: ApiCategory = "JUDICIAL";

  getAvailableQueries(): QueryType[] {
    return ["CONSULTA_PROCESSO"];
  }

  protected async executeReal(query: ProviderQuery): Promise<ProviderResult> {
    const config = await this.getConfig();
    const baseUrl = config?.baseUrl || DEFAULT_BASE;
    const apiKey = config?.apiKey;
    if (!apiKey) throw new Error("DATAJUD_API_KEY not configured");

    const target = query.targetDocument.replace(/\D/g, "");
    const isCpfCnpj = target.length === 11 || target.length === 14;
    const isProcessNumber = target.length === 20;

    const esQuery = isProcessNumber
      ? { match: { numeroProcesso: target } }
      : isCpfCnpj
        ? {
            nested: {
              path: "dadosBasicos.polo.parte",
              query: { match: { "dadosBasicos.polo.parte.documento": target } },
            },
          }
        : { match: { "dadosBasicos.polo.parte.nome": query.targetDocument } };

    const body = JSON.stringify({
      query: esQuery,
      size: 10,
      sort: [{ "@timestamp": { order: "desc" } }],
    });

    const headers: Record<string, string> = {
      Authorization: `APIKey ${apiKey}`,
      "Content-Type": "application/json",
    };

    const settled = await Promise.allSettled(
      TRIBUNALS.map((tribunal) =>
        this.retryWithBackoff(async () => {
          const url = `${baseUrl}/api_publica_${tribunal}/_search`;
          const res = await fetch(url, { method: "POST", headers, body });
          if (!res.ok) throw new Error(`DataJud ${tribunal} HTTP ${res.status}`);
          return { tribunal, data: await res.json() };
        }),
      ),
    );

    const lawsuits: NormalizedLawsuit[] = [];

    for (const result of settled) {
      if (result.status !== "fulfilled") continue;
      const { tribunal, data } = result.value;
      const hits: Record<string, unknown>[] = data.hits?.hits || [];

      for (const hit of hits) {
        const src = (hit as Record<string, unknown>)._source as Record<string, unknown>;
        if (!src) continue;

        const classe =
          (src.classe as Record<string, unknown>)?.nome as string |
          undefined ?? src.classeProcessual as string | undefined;

        const polos = (src.dadosBasicos as Record<string, unknown>)?.polo as
          Record<string, unknown>[] | undefined ?? [];

        const otherParties = polos.flatMap((polo) => {
          const tipoPolo = (polo.polo as string) || "DESCONHECIDO";
          return ((polo.parte || []) as Record<string, unknown>[]).map((parte) => ({
            nome: parte.nome as string || "",
            tipo: tipoPolo,
            documento: parte.documento as string || "",
          }));
        });

        const movimentos = (src.movimentos || []) as Record<string, unknown>[];
        const lastMov = movimentos[0];

        lawsuits.push({
          caseNumber: (src.numeroProcesso as string) || "",
          court: tribunal.toUpperCase(),
          vara: (src.orgaoJulgador as Record<string, unknown>)?.nome as string | undefined,
          subject: ((src.assuntos || src.assunto) as Record<string, unknown>[])?.[0]?.nome as string | undefined,
          class_: classe,
          role: this.inferRole(otherParties, target),
          otherParties,
          estimatedValue: src.valorCausa as number | undefined,
          status: (src.situacao as string) || undefined,
          lastMovement: lastMov ? (lastMov.nome as string) : undefined,
          lastMovementDate: lastMov?.dataHora ? new Date(lastMov.dataHora as string) : undefined,
          distributionDate: src.dataAjuizamento ? new Date(src.dataAjuizamento as string) : undefined,
          relevance: classifyRelevance(classe),
          hasAssetFreeze: detectAssetFreeze(movimentos),
          sourceProvider: this.name,
          rawSourceData: src,
        });
      }
    }

    // Sort by relevance: CRITICA first
    const order: Record<LawsuitRelevance, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAIXA: 3 };
    lawsuits.sort((a, b) => order[a.relevance] - order[b.relevance]);

    return this.buildResult(query, {
      success: true,
      data: { totalProcessos: lawsuits.length, tribunaisConsultados: TRIBUNALS.length },
      normalizedLawsuits: lawsuits,
      rawResponse: settled,
    });
  }

  private inferRole(
    parties: { nome: string; tipo: string; documento: string }[],
    target: string,
  ): string {
    for (const p of parties) {
      if (p.documento.replace(/\D/g, "") === target) {
        const polo = p.tipo.toUpperCase();
        if (polo.includes("ATIVO") || polo.includes("AUTOR") || polo.includes("EXEQUENTE")) {
          return "AUTOR";
        }
        if (polo.includes("PASSIVO") || polo.includes("REU") || polo.includes("EXECUTADO")) {
          return "REU";
        }
        return "TERCEIRO";
      }
    }
    return "DESCONHECIDO";
  }

  protected async generateMockResult(query: ProviderQuery): Promise<ProviderResult> {
    return MockDataGenerator.generate(this.name, query);
  }
}
