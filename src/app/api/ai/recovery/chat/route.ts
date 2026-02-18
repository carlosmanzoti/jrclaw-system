import { streamText } from "ai"
import { anthropic, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const maxDuration = 120

// ---------------------------------------------------------------------------
// Recovery case data include (all relations for full context)
// ---------------------------------------------------------------------------
const RECOVERY_CASE_INCLUDE = {
  case_: {
    select: {
      id: true,
      numero_processo: true,
      tipo: true,
      status: true,
      vara: true,
      comarca: true,
      tribunal: true,
      uf: true,
      valor_causa: true,
      cliente: { select: { id: true, nome: true } },
    },
  },
  person: {
    select: {
      id: true,
      nome: true,
      cpf_cnpj: true,
      email: true,
      celular: true,
      cidade: true,
      estado: true,
      segmento: true,
    },
  },
  responsavel: { select: { id: true, name: true } },
  investigacoes: {
    orderBy: { created_at: "desc" as const },
    take: 5,
    include: {
      _count: { select: { buscas: true, bens: true } },
    },
  },
  bens: { orderBy: { created_at: "desc" as const }, take: 20 },
  acoes_cobranca: { orderBy: { created_at: "desc" as const }, take: 10 },
  penhoras: { orderBy: { created_at: "desc" as const }, take: 10 },
  acordos: { orderBy: { created_at: "desc" as const }, take: 5 },
  incidentes_desconsidera: { orderBy: { created_at: "desc" as const }, take: 5 },
  eventos: { orderBy: { data: "desc" as const }, take: 20 },
  devedores_solidarios: { orderBy: { created_at: "desc" as const }, take: 10 },
} as const

// ---------------------------------------------------------------------------
// Try to import the dedicated prompt builder
// ---------------------------------------------------------------------------
let buildRecoveryChatSystemPrompt: ((recoveryCase: any) => string) | null = null
try {
  const mod = require("@/lib/recovery-ai-prompts")
  if (typeof mod.buildRecoveryChatSystemPrompt === "function") {
    buildRecoveryChatSystemPrompt = mod.buildRecoveryChatSystemPrompt
  }
} catch {
  // Module not available — will use fallback prompt below
}

// ---------------------------------------------------------------------------
// Format money helper
// ---------------------------------------------------------------------------
function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "N/I"
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
// Build fallback system prompt
// ---------------------------------------------------------------------------
function buildFallbackSystemPrompt(rc: any): string {
  const devedorNome = rc.devedor_nome || rc.person?.nome || "Devedor"
  const valorExecucao = rc.valor_total_execucao
    ? fmtMoney(rc.valor_total_execucao)
    : fmtMoney(rc.valor_atualizado) || fmtMoney(rc.valor_original)

  const bensResumo = (rc.bens || [])
    .slice(0, 15)
    .map((b: any) => `- [${b.tipo}] ${b.descricao} | ${fmtMoney(b.valor_estimado)} | ${b.status} | Penhoravel: ${b.penhoravel ? "Sim" : "Nao"}`)
    .join("\n")

  const penhorasResumo = (rc.penhoras || [])
    .slice(0, 10)
    .map((p: any) => `- [${p.tipo}] ${fmtMoney(p.valor_efetivado)} efetivado | Status: ${p.status}`)
    .join("\n")

  const acoesResumo = (rc.acoes_cobranca || [])
    .slice(0, 8)
    .map((a: any) => `- [${a.tipo}] ${new Date(a.data_acao).toLocaleDateString("pt-BR")}: ${a.descricao?.substring(0, 150)} | ${a.status}`)
    .join("\n")

  const eventosResumo = (rc.eventos || [])
    .slice(0, 10)
    .map((e: any) => `- [${e.tipo}] ${new Date(e.data).toLocaleDateString("pt-BR")}: ${e.descricao?.substring(0, 200)}`)
    .join("\n")

  const acordosResumo = (rc.acordos || [])
    .slice(0, 3)
    .map((a: any) => `- [${a.tipo}] Acordo: ${fmtMoney(a.valor_acordo)} (${a.desconto_percentual ?? 0}% desc.) | ${a.parcelas ?? 1} parcelas | Pagas: ${a.parcelas_pagas ?? 0} | Status: ${a.status}`)
    .join("\n")

  const solidariosResumo = (rc.devedores_solidarios || [])
    .slice(0, 5)
    .map((d: any) => `- ${d.nome} (${d.tipo_responsabilidade}) | Status: ${d.status}`)
    .join("\n")

  return `Voce e Mike Ross, o genio juridico com memoria eidetica, assistente estrategico de recuperacao de credito do escritorio JRCLaw.

PERSONALIDADE:
- Brilhante, detalhista, analitico e pragmatico
- Domina direito processual civil, execucao, investigacao patrimonial e fraude
- Sempre fundamenta suas respostas em legislacao e jurisprudencia brasileira
- Sugere taticas criativas mas juridicamente solidas
- Calcula valores, percentuais e probabilidades quando relevante
- Alerta sobre riscos processuais e prazos prescricionais

CONHECIMENTOS ESPECIALIZADOS:
1. Execucao Civil (Livro II do CPC): cumprimento de sentenca, execucao de titulo extrajudicial, liquidacao, penhora, avaliacao, expropriacao
2. Investigacao Patrimonial: SISBAJUD, RENAJUD, INFOJUD, CNIB, ARISP, DETRAN, juntas comerciais, OSINT
3. Medidas Constritivas: penhora online, penhora de imoveis, arresto, sequestro, indisponibilidade
4. Fraude: fraude contra credores (CC 158-165), fraude a execucao (CPC 792), ocultacao patrimonial
5. Desconsideracao da PJ: art. 50 CC, art. 133-137 CPC, art. 28 CDC, disregard doctrine
6. Acordo e Transacao: parcelamento (CPC 916), dacao em pagamento, novacao, transacao
7. Impenhorabilidade: art. 833 CPC, Lei 8.009/90 (bem de familia), excecoes
8. Recuperacao Judicial e Falencia: Lei 11.101/2005, habilitacao de creditos, extraconcursal

REGRAS:
- Sempre responda em portugues do Brasil
- Referencie dados concretos do caso (valores, datas, bens, status)
- Cite artigos de lei, sumulas e jurisprudencia quando relevante
- Calcule prazos prescricionais e decadenciais quando aplicavel
- Sugira proximos passos concretos e priorizados
- Alerte sobre riscos de prescricao ou preclusao
- Nao revele sua identidade como IA — voce e Mike, consultor estrategico

CONTEXTO DO CASO:
- Codigo: ${rc.codigo}
- Titulo: ${rc.titulo}
- Devedor: ${devedorNome}
- CPF/CNPJ: ${rc.devedor_cpf_cnpj || rc.person?.cpf_cnpj || "N/I"}
- Tipo devedor: ${rc.devedor_tipo || "N/I"}
- Tipo: ${rc.tipo}
- Fase: ${rc.fase}
- Status: ${rc.status}
- Prioridade: ${rc.prioridade}
- Valor original: ${fmtMoney(rc.valor_original)}
- Valor atualizado: ${fmtMoney(rc.valor_atualizado)}
- Valor total execucao: ${valorExecucao}
- Valor recuperado: ${fmtMoney(rc.valor_recuperado)}
- Valor bloqueado: ${fmtMoney(rc.valor_bloqueado)}
- Valor penhorado: ${fmtMoney(rc.valor_penhorado)}
- Percentual recuperado: ${rc.percentual_recuperado != null ? `${rc.percentual_recuperado}%` : "N/I"}
- Score recuperacao: ${rc.score_recuperacao != null ? `${rc.score_recuperacao}/100` : "N/I"}
${rc.titulo_tipo ? `- Titulo executivo: ${rc.titulo_tipo} ${rc.titulo_numero || ""}` : ""}
${rc.case_?.numero_processo ? `- Processo: ${rc.case_.numero_processo} | Vara: ${rc.case_.vara || "N/I"} | Comarca: ${rc.case_.comarca || "N/I"}` : ""}
${rc.case_?.cliente?.nome ? `- Cliente: ${rc.case_.cliente.nome}` : ""}
${rc.risco_prescricao ? `- Risco prescricao: ${rc.risco_prescricao}` : ""}
${rc.risco_insolvencia ? `- Risco insolvencia: ${rc.risco_insolvencia}` : ""}

${bensResumo ? `BENS ENCONTRADOS:\n${bensResumo}` : ""}
${penhorasResumo ? `\nPENHORAS:\n${penhorasResumo}` : ""}
${acoesResumo ? `\nACOES DE COBRANCA:\n${acoesResumo}` : ""}
${acordosResumo ? `\nACORDOS:\n${acordosResumo}` : ""}
${solidariosResumo ? `\nDEVEDORES SOLIDARIOS:\n${solidariosResumo}` : ""}
${eventosResumo ? `\nULTIMOS EVENTOS:\n${eventosResumo}` : ""}
${rc.estrategia_ia ? `\nESTRATEGIA IA ANTERIOR:\n${rc.estrategia_ia}` : ""}
${rc.observacoes ? `\nOBSERVACOES:\n${rc.observacoes}` : ""}`
}

// ---------------------------------------------------------------------------
// POST handler — Streaming chat for recovery assistant
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, recoveryCaseId, useOpus = false } = await req.json()

  if (!recoveryCaseId) {
    return new Response("recoveryCaseId is required", { status: 400 })
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response("messages array is required", { status: 400 })
  }

  const startTime = Date.now()

  // Select model based on user preference
  const config: ModelConfig = useOpus
    ? MODEL_CONFIGS.premium
    : MODEL_CONFIGS.standard

  // Load recovery case with all relations
  const recoveryCase = await db.creditRecoveryCase.findUnique({
    where: { id: recoveryCaseId },
    include: RECOVERY_CASE_INCLUDE,
  })

  if (!recoveryCase) {
    return new Response("Recovery case not found", { status: 404 })
  }

  // Build system prompt
  const systemPrompt = buildRecoveryChatSystemPrompt
    ? buildRecoveryChatSystemPrompt(recoveryCase)
    : buildFallbackSystemPrompt(recoveryCase)

  // Use recoveryCaseId as sessionId for chat history grouping
  const sessionId = `recovery-${recoveryCaseId}`

  // Save user message
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    await db.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: lastMessage.content,
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
          actionType: "recovery_chat",
          model: config.model,
          tokensIn: usage.inputTokens ?? 0,
          tokensOut: usage.outputTokens ?? 0,
          durationMs: Date.now() - startTime,
          costEstimated: cost,
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
