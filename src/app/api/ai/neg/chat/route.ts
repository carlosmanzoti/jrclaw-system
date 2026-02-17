import { streamText } from "ai"
import { anthropic, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const maxDuration = 120

// ---------------------------------------------------------------------------
// Negotiation data include (all relations for full context)
// ---------------------------------------------------------------------------
const NEGOTIATION_INCLUDE = {
  case_: {
    select: {
      id: true,
      numero_processo: true,
      tipo: true,
      cliente: { select: { nome: true } },
    },
  },
  person: { select: { id: true, nome: true, cpf_cnpj: true } },
  rj_creditor: {
    select: { id: true, nome: true, classe: true, valor_atualizado: true },
  },
  responsavel: { select: { id: true, name: true } },
  eventos: { orderBy: { data: "desc" as const }, take: 20 },
  rodadas: { orderBy: { numero: "desc" as const }, take: 5 },
  propostas: { orderBy: { numero: "desc" as const }, take: 10 },
  concessoes: { orderBy: { data: "desc" as const }, take: 10 },
  one_sheets: { orderBy: { created_at: "desc" as const }, take: 3 },
} as const

// ---------------------------------------------------------------------------
// Try to import the dedicated prompt builder; fall back to inline prompt
// ---------------------------------------------------------------------------
let buildNegChatSystemPrompt: ((negotiation: any) => string) | null = null
try {
  // Dynamic import so the route still works if the prompt file doesn't exist yet
  const mod = require("@/lib/neg-ai-prompts")
  if (typeof mod.buildNegChatSystemPrompt === "function") {
    buildNegChatSystemPrompt = mod.buildNegChatSystemPrompt
  }
} catch {
  // Module not available — will use fallback prompt below
}

function buildFallbackSystemPrompt(negotiation: any): string {
  const contraparte = negotiation.person?.nome ?? negotiation.rj_creditor?.nome ?? "Contraparte"
  const valorCredito = negotiation.valor_credito
    ? `R$ ${(Number(negotiation.valor_credito) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "N/I"
  const fase = negotiation.fase ?? "N/I"
  const status = negotiation.status ?? "N/I"

  const eventosResumo = (negotiation.eventos || [])
    .slice(0, 10)
    .map((e: any) => `- [${e.tipo}] ${new Date(e.data).toLocaleDateString("pt-BR")}: ${e.descricao?.substring(0, 200)}`)
    .join("\n")

  const propostasResumo = (negotiation.propostas || [])
    .slice(0, 5)
    .map((p: any) => `- Proposta #${p.numero} (${p.tipo}): R$ ${(Number(p.valor_principal) / 100).toLocaleString("pt-BR")} | haircut ${p.haircut_pct ?? "N/A"}% | status: ${p.status}`)
    .join("\n")

  const concessoesResumo = (negotiation.concessoes || [])
    .slice(0, 5)
    .map((c: any) => `- [${c.direcao}] ${c.descricao?.substring(0, 150)}`)
    .join("\n")

  return `Voce e Harvey Specter, o lendario advogado negociador. Voce e assistente estrategico de negociacao para o escritorio JRCLaw.

PERSONALIDADE:
- Confiante, incisivo, direto ao ponto
- Combina sofisticacao intelectual com pragmatismo agressivo
- Sempre busca posicao de forca para o cliente
- Usa humor sutil quando apropriado
- Cita frameworks de negociacao (Harvard, Voss, Camp, Karrass, Teoria dos Jogos) de forma pratica

FRAMEWORKS QUE DOMINA:
1. Harvard (Fisher & Ury): Interesses vs Posicoes, BATNA, ZOPA, Opcoes criativas, Criterios objetivos
2. Chris Voss/FBI: Labels, Mirrors, Accusation Audit, Calibrated Questions, Black Swans, Late-night FM DJ voice
3. Camp (Start with No): Missao e proposito, Budget (tempo/energia/dinheiro/emocao), Decisores
4. Karrass: Poder, Concessoes calculadas, Timing
5. Thomas-Kilmann (TKI): Perfil do negociador (Competitivo/Colaborativo/Compromisso/Evitativo/Acomodativo)
6. Teoria dos Jogos: Nash, Shapley, Dilema do Prisioneiro, Coalicoes

REGRAS:
- Sempre responda em portugues do Brasil
- Referencie dados concretos da negociacao quando relevante
- Sugira taticas especificas baseadas na fase atual
- Alerte sobre riscos e oportunidades
- Calcule haircuts, NPV, recovery rates quando solicitado
- Responda com confianca, mas reconheca incertezas quando existirem
- Nao revele sua identidade como IA — voce e Harvey, conselheiro estrategico

CONTEXTO DA NEGOCIACAO:
- Titulo: ${negotiation.titulo}
- Codigo: ${negotiation.codigo}
- Contraparte: ${contraparte}
- Valor do credito: ${valorCredito}
- Fase: ${fase}
- Status: ${status}
${negotiation.case_?.numero_processo ? `- Processo: ${negotiation.case_.numero_processo}` : ""}
${negotiation.case_?.cliente?.nome ? `- Cliente: ${negotiation.case_.cliente.nome}` : ""}
${negotiation.rj_creditor?.classe ? `- Classe do credor: ${negotiation.rj_creditor.classe}` : ""}
${negotiation.tki_perfil_credor ? `- Perfil TKI do credor: ${negotiation.tki_perfil_credor}` : ""}
${negotiation.voss_tipo_negociador ? `- Tipo negociador (Voss): ${negotiation.voss_tipo_negociador}` : ""}
${negotiation.health_score != null ? `- Health Score: ${negotiation.health_score}/100` : ""}
${negotiation.probability_acordo != null ? `- Probabilidade de acordo: ${(negotiation.probability_acordo * 100).toFixed(0)}%` : ""}

${eventosResumo ? `ULTIMOS EVENTOS:\n${eventosResumo}` : ""}
${propostasResumo ? `\nPROPOSTAS:\n${propostasResumo}` : ""}
${concessoesResumo ? `\nCONCESSOES:\n${concessoesResumo}` : ""}
${negotiation.ai_proxima_acao ? `\nPROXIMA ACAO RECOMENDADA (IA): ${negotiation.ai_proxima_acao}` : ""}
${negotiation.observacoes ? `\nOBSERVACOES: ${negotiation.observacoes}` : ""}`
}

// ---------------------------------------------------------------------------
// POST handler — Streaming chat for Harvey Specter negotiation assistant
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, negotiationId, useOpus = false } = await req.json()

  if (!negotiationId) {
    return new Response("negotiationId is required", { status: 400 })
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response("messages array is required", { status: 400 })
  }

  const startTime = Date.now()

  // Select model based on user preference
  const config: ModelConfig = useOpus
    ? MODEL_CONFIGS.premium
    : MODEL_CONFIGS.standard

  // Load negotiation with all relations
  const negotiation = await db.stratNegotiation.findUnique({
    where: { id: negotiationId },
    include: NEGOTIATION_INCLUDE,
  })

  if (!negotiation) {
    return new Response("Negotiation not found", { status: 404 })
  }

  // Build system prompt
  const systemPrompt = buildNegChatSystemPrompt
    ? buildNegChatSystemPrompt(negotiation)
    : buildFallbackSystemPrompt(negotiation)

  // Use negotiationId as sessionId for chat history grouping
  const sessionId = `neg-${negotiationId}`

  // Save user message
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    await db.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: lastMessage.content,
        negotiationId,
        userId: session.user.id,
      },
    })
  }

  // Build streamText options
  const streamOptions: Parameters<typeof streamText>[0] = {
    model: anthropic(config.model),
    system: systemPrompt,
    messages,
    maxOutputTokens: config.maxOutputTokens,
    temperature: config.temperature,
    async onFinish({ text, usage }) {
      // Save assistant message
      await db.chatMessage.create({
        data: {
          sessionId,
          role: "assistant",
          content: text,
          negotiationId,
          userId: session.user!.id!,
        },
      })

      // Log AI usage
      const cost = estimateCost(
        config,
        usage.inputTokens ?? 0,
        usage.outputTokens ?? 0
      )
      await db.aIUsageLog.create({
        data: {
          userId: session.user!.id!,
          actionType: "neg_chat",
          model: config.model,
          tokensIn: usage.inputTokens ?? 0,
          tokensOut: usage.outputTokens ?? 0,
          durationMs: Date.now() - startTime,
          costEstimated: cost,
          negotiationId,
        },
      })
    },
  }

  // Add extended thinking for premium (Opus) model
  if (useOpus && MODEL_CONFIGS.premium.thinking) {
    streamOptions.providerOptions = {
      anthropic: { thinking: MODEL_CONFIGS.premium.thinking },
    }
  }

  const result = streamText(streamOptions)

  const response = result.toTextStreamResponse()
  response.headers.set("X-AI-Model", config.model)
  response.headers.set("X-AI-Tier", config.tier)

  return response
}
