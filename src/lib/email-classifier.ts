import { generateText } from "ai"
import { anthropic } from "@/lib/ai"

interface ClassificationResult {
  tipo: "INTIMACAO" | "PUBLICACAO" | "COMUNICACAO_CREDOR" | "COMUNICACAO_CLIENTE" | "PROPOSTA_ACORDO" | "COBRANCA" | "INTERNO" | "MARKETING" | "OUTRO"
  urgencia: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA"
  processo_sugerido: string | null
  pessoa_sugerida: string | null
  acao_sugerida: string | null
  resumo: string
}

const CLASSIFICATION_PROMPT = `Você é um assistente jurídico especializado em classificar e-mails para um escritório de advocacia empresarial.

Analise o e-mail abaixo e retorne um JSON com a classificação:

{
  "tipo": "INTIMACAO" | "PUBLICACAO" | "COMUNICACAO_CREDOR" | "COMUNICACAO_CLIENTE" | "PROPOSTA_ACORDO" | "COBRANCA" | "INTERNO" | "MARKETING" | "OUTRO",
  "urgencia": "CRITICA" | "ALTA" | "MEDIA" | "BAIXA",
  "processo_sugerido": "número CNJ se identificável ou null",
  "pessoa_sugerida": "nome da pessoa/empresa principal mencionada ou null",
  "acao_sugerida": "ação recomendada em 1 frase ou null",
  "resumo": "resumo do e-mail em 1 frase"
}

Regras de classificação:
- INTIMACAO: e-mails de tribunais com intimações, citações, notificações judiciais → urgência CRITICA
- PUBLICACAO: publicações do DJe, decisões publicadas → urgência ALTA
- COMUNICACAO_CREDOR: e-mails de bancos, FIDCs, credores sobre negociação → urgência ALTA
- COMUNICACAO_CLIENTE: e-mails de clientes do escritório → urgência MEDIA
- PROPOSTA_ACORDO: propostas formais de acordo ou contrapropostas → urgência ALTA
- COBRANCA: cobranças, notificações de vencimento → urgência ALTA
- INTERNO: comunicação interna do escritório → urgência MEDIA
- MARKETING: newsletters, convites, propaganda → urgência BAIXA
- OUTRO: não se encaixa nas categorias acima → urgência BAIXA

Retorne APENAS o JSON, sem texto adicional.`

// In-memory cache by message ID
const cache = new Map<string, ClassificationResult>()

export async function classifyEmail(
  messageId: string,
  subject: string,
  bodyPreview: string,
  fromEmail: string,
  fromName: string,
): Promise<ClassificationResult> {
  const cached = cache.get(messageId)
  if (cached) return cached

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250514"),
      maxOutputTokens: 500,
      messages: [
        {
          role: "system",
          content: CLASSIFICATION_PROMPT,
        },
        {
          role: "user",
          content: `De: ${fromName} <${fromEmail}>\nAssunto: ${subject}\n\n${bodyPreview}`,
        },
      ],
    })

    const result: ClassificationResult = JSON.parse(text.trim())
    cache.set(messageId, result)
    return result
  } catch {
    const fallback: ClassificationResult = {
      tipo: "OUTRO",
      urgencia: "BAIXA",
      processo_sugerido: null,
      pessoa_sugerida: null,
      acao_sugerida: null,
      resumo: subject || "E-mail sem assunto",
    }
    cache.set(messageId, fallback)
    return fallback
  }
}

export function getCachedClassification(messageId: string): ClassificationResult | undefined {
  return cache.get(messageId)
}
