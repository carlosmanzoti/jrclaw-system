/**
 * Client-safe model display data.
 * This file has NO server-side imports (@ai-sdk, prisma, etc.)
 * so it can be safely imported by "use client" components.
 */

export type ModelTier = "standard" | "premium"

export interface ModelDisplay {
  name: string
  badgeClass: string // tailwind classes for badge styling
}

export const MODEL_DISPLAY: Record<ModelTier, ModelDisplay> = {
  standard: {
    name: "Sonnet 4.5",
    badgeClass: "bg-[#17A2B8]/20 text-[#17A2B8] border-[#17A2B8]/30",
  },
  premium: {
    name: "Opus 4.6",
    badgeClass: "bg-[#C9A961]/20 text-[#C9A961] border-[#C9A961]/30",
  },
}

export const DOC_TYPE_TIER_MAP: Record<string, ModelTier> = {
  // Premium
  PETICAO_INICIAL: "premium",
  CONTESTACAO: "premium",
  REPLICA: "premium",
  RECONVENCAO: "premium",
  MEMORIAIS: "premium",
  ALEGACOES_FINAIS: "premium",
  EMBARGOS_DECLARACAO: "premium",
  AGRAVO_INSTRUMENTO: "premium",
  AGRAVO_INTERNO: "premium",
  APELACAO: "premium",
  RECURSO_ESPECIAL: "premium",
  RECURSO_EXTRAORDINARIO: "premium",
  CONTRARRAZOES: "premium",
  RECURSO_ORDINARIO: "premium",
  CUMPRIMENTO_SENTENCA: "premium",
  IMPUGNACAO_CUMPRIMENTO: "premium",
  EMBARGOS_EXECUCAO: "premium",
  EXCECAO_PRE_EXECUTIVIDADE: "premium",
  PLANO_RJ: "premium",
  HABILITACAO_CREDITO: "premium",
  IMPUGNACAO_CREDITO: "premium",
  PETICAO_OBJECAO_PLANO: "premium",
  CONVOLACAO_FALENCIA: "premium",
  PARECER: "premium",
  NOTA_TECNICA: "premium",
  DUE_DILIGENCE: "premium",
  CONTRATO_GENERICO: "premium",
  CONTRATO_ARRENDAMENTO_RURAL: "premium",
  CONTRATO_PARCERIA_AGRICOLA: "premium",
  CPR_CEDULA_PRODUTO_RURAL: "premium",
  // Standard
  EMAIL_FORMAL: "standard",
  PROPOSTA_CLIENTE: "standard",
  PROPOSTA_ACORDO: "standard",
  CORRESPONDENCIA_CREDOR: "standard",
  OFICIO: "standard",
  MEMORANDO_INTERNO: "standard",
  RELATORIO_AJ: "standard",
  PROCURACAO_AD_JUDICIA: "standard",
  PROCURACAO_EXTRAJUDICIAL: "standard",
  NOTIFICACAO_EXTRAJUDICIAL: "standard",
  ACORDO_EXTRAJUDICIAL: "standard",
  TERMO_CONFISSAO_DIVIDA: "standard",
  DISTRATO: "standard",
}

export function getModelDisplayForDocType(tipo: string): ModelDisplay & { tier: ModelTier } {
  const tier = DOC_TYPE_TIER_MAP[tipo] ?? "standard"
  return { ...MODEL_DISPLAY[tier], tier }
}

export const COST_ESTIMATES: Record<ModelTier, string> = {
  standard: "~US$ 0,02",
  premium: "~US$ 0,15",
}
