import { createAnthropic } from "@ai-sdk/anthropic"

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

// ---------------------------------------------------------------------------
// Model tier types
// ---------------------------------------------------------------------------
export type ModelTier = "standard" | "premium"

export interface ModelConfig {
  tier: ModelTier
  model: string
  maxOutputTokens: number
  temperature: number
  thinking?: { type: "enabled"; budgetTokens: number }
  costPerMTokIn: number  // USD per million input tokens
  costPerMTokOut: number // USD per million output tokens
}

// ---------------------------------------------------------------------------
// Dual model configs
// ---------------------------------------------------------------------------
export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
  standard: {
    tier: "standard",
    model: "claude-sonnet-4-5-20250929",
    maxOutputTokens: 4096,
    temperature: 0.3,
    costPerMTokIn: 3,
    costPerMTokOut: 15,
  },
  premium: {
    tier: "premium",
    model: "claude-opus-4-6-20250918",
    maxOutputTokens: 16384,
    temperature: 0.2,
    thinking: { type: "enabled", budgetTokens: 10000 },
    costPerMTokIn: 15,
    costPerMTokOut: 75,
  },
}

// ---------------------------------------------------------------------------
// Document type → tier mapping
// ---------------------------------------------------------------------------
export const DOC_TYPE_TIER_MAP: Record<string, ModelTier> = {
  // Premium — complex legal documents
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

  // Standard — simpler documents
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

/**
 * Returns the model config for a given document type.
 * Falls back to standard if the type is unknown.
 */
export function getModelForDocumentType(tipo: string): ModelConfig {
  const tier = DOC_TYPE_TIER_MAP[tipo] ?? "standard"
  return MODEL_CONFIGS[tier]
}

/**
 * Estimates the USD cost for a given model config and token counts.
 */
export function estimateCost(
  config: ModelConfig,
  tokensIn: number,
  tokensOut: number
): number {
  return (
    (tokensIn / 1_000_000) * config.costPerMTokIn +
    (tokensOut / 1_000_000) * config.costPerMTokOut
  )
}

// ---------------------------------------------------------------------------
// Legacy config — kept for chat/review default paths
// ---------------------------------------------------------------------------
export const AI_CONFIG = {
  chat: {
    model: "claude-sonnet-4-5-20250929" as const,
    maxOutputTokens: 2048,
    temperature: 0.5,
  },
  documento: {
    model: "claude-sonnet-4-5-20250929" as const,
    maxOutputTokens: 8192,
    temperature: 0.2,
  },
  revisao: {
    model: "claude-sonnet-4-5-20250929" as const,
    maxOutputTokens: 4096,
    temperature: 0.3,
  },
} as const
