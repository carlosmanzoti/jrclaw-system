import { streamText } from "ai"
import { anthropic, AI_CONFIG, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildChatSystemPrompt } from "@/lib/ai-prompt-builder"

export const maxDuration = 120

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
  let biblioteca: any[] = []

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

  // Auto-search library by area
  const areas: string[] = []
  if (processo?.tipo) areas.push(processo.tipo)
  if (projeto?.categoria) areas.push(projeto.categoria)

  if (areas.length > 0) {
    biblioteca = await db.libraryEntry.findMany({
      where: { area: { in: areas as any } },
      orderBy: { relevancia: "desc" },
      take: 5,
    })
  }

  const systemPrompt = buildChatSystemPrompt(processo as any, projeto as any, biblioteca)

  // Save user message
  const lastMessage = messages[messages.length - 1]
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

  return response
}
