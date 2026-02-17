import { streamText } from "ai"
import { anthropic, AI_CONFIG, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildChatSystemPrompt } from "@/lib/ai-prompt-builder"
import { Prisma } from "@prisma/client"

export const maxDuration = 120

// Portuguese stopwords to filter from search
const STOPWORDS = new Set([
  "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas", "e", "ou", "que", "o", "a", "os", "as",
  "por", "para", "com", "sem", "como", "mais", "mas", "ao", "aos",
  "se", "não", "sim", "ser", "ter", "foi", "são", "está", "isso",
  "este", "esta", "esse", "essa", "aquele", "aquela", "ele", "ela",
  "nos", "lhe", "seu", "sua", "seus", "suas", "meu", "minha",
  "qual", "quem", "onde", "quando", "porque", "sobre", "entre",
  "muito", "bem", "também", "pode", "deve", "há", "já", "ainda",
  "então", "depois", "antes", "desde", "até", "mesmo", "assim",
  "todo", "toda", "todos", "todas", "cada", "outro", "outra",
])

function extractSearchTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúâêîôûãõç]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, 8) // max 8 terms
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { messages, sessionId, caseId, projectId, useOpus = false } = await req.json()
  const startTime = Date.now()

  // Select model
  const config: ModelConfig = useOpus
    ? MODEL_CONFIGS.premium
    : {
        tier: "standard" as const,
        model: AI_CONFIG.chat.model,
        maxOutputTokens: AI_CONFIG.chat.maxOutputTokens,
        temperature: AI_CONFIG.chat.temperature,
        costPerMTokIn: MODEL_CONFIGS.standard.costPerMTokIn,
        costPerMTokOut: MODEL_CONFIGS.standard.costPerMTokOut,
      }

  // Load context
  let processo = null
  let projeto = null

  if (caseId) {
    processo = await db.case.findUnique({
      where: { id: caseId },
      include: {
        cliente: { select: { nome: true, cpf_cnpj: true } },
        juiz: { select: { nome: true } },
        partes: { include: { person: { select: { nome: true } } } },
        credores: { include: { person: { select: { nome: true } } } },
      },
    })
  }

  if (projectId) {
    projeto = await db.project.findUnique({
      where: { id: projectId },
      include: {
        cliente: { select: { nome: true } },
        documentos: { select: { titulo: true, tipo: true }, take: 10 },
      },
    })
  }

  // Smart Biblioteca search based on message terms + context
  const areas: string[] = []
  if (processo?.tipo) areas.push(processo.tipo)
  if (projeto?.categoria) areas.push(projeto.categoria)

  const lastMessage = messages[messages.length - 1]
  const userText = lastMessage?.role === "user" ? lastMessage.content : ""
  const searchTerms = extractSearchTerms(userText)

  const searchConditions: Prisma.LibraryEntryWhereInput[] = []

  // Term-based search
  if (searchTerms.length > 0) {
    searchConditions.push({
      OR: searchTerms.flatMap((term) => [
        { titulo: { contains: term, mode: "insensitive" as const } },
        { resumo: { contains: term, mode: "insensitive" as const } },
        { conteudo: { contains: term, mode: "insensitive" as const } },
        { tags: { hasSome: [term] } },
      ]),
    })
  }

  // Area match
  if (areas.length > 0) {
    searchConditions.push({ area: { in: areas as any } })
  }

  // Case/project linked
  if (caseId) {
    searchConditions.push({
      OR: [
        { case_id: caseId },
        { utilizado_em_casos: { some: { id: caseId } } },
      ],
    })
  }
  if (projectId) {
    searchConditions.push({
      utilizado_em_projetos: { some: { id: projectId } },
    })
  }

  let biblioteca: any[] = []
  let bibliotecaRefIds: string[] = []

  if (searchConditions.length > 0) {
    biblioteca = await db.libraryEntry.findMany({
      where: { OR: searchConditions },
      orderBy: [{ favorito: "desc" }, { relevancia: "desc" }],
      take: 8,
    })
    bibliotecaRefIds = biblioteca.map((e) => e.id)
  }

  const systemPrompt = buildChatSystemPrompt(processo as any, projeto as any, biblioteca)

  // Save user message
  if (lastMessage?.role === "user" && sessionId) {
    await db.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: lastMessage.content,
        caseId: caseId || null,
        projectId: projectId || null,
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
      if (sessionId) {
        await db.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: text,
            caseId: caseId || null,
            projectId: projectId || null,
            userId: session.user!.id!,
          },
        })
      }

      // Log usage
      const cost = estimateCost(config, usage.inputTokens ?? 0, usage.outputTokens ?? 0)
      await db.aIUsageLog.create({
        data: {
          userId: session.user!.id!,
          actionType: "chat",
          model: config.model,
          tokensIn: usage.inputTokens ?? 0,
          tokensOut: usage.outputTokens ?? 0,
          durationMs: Date.now() - startTime,
          costEstimated: cost,
          caseId: caseId || null,
          projectId: projectId || null,
        },
      })

      // Log Biblioteca search
      if (biblioteca.length > 0) {
        await db.librarySearchLog.create({
          data: {
            user_id: session.user!.id!,
            query: searchTerms.join(" "),
            results_count: biblioteca.length,
            entries_used: bibliotecaRefIds,
            context: "CHAT",
          },
        }).catch(() => {})
      }
    },
  }

  // Add extended thinking for premium model
  if (useOpus && MODEL_CONFIGS.premium.thinking) {
    streamOptions.providerOptions = {
      anthropic: { thinking: MODEL_CONFIGS.premium.thinking },
    }
  }

  const result = streamText(streamOptions)

  const response = result.toTextStreamResponse()
  response.headers.set("X-AI-Model", config.model)
  response.headers.set("X-AI-Tier", config.tier)
  response.headers.set("X-Biblioteca-Refs", JSON.stringify(bibliotecaRefIds))

  return response
}
