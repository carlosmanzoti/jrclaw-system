import { streamText } from "ai"
import { anthropic, AI_CONFIG, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildReviewPrompt } from "@/lib/ai-prompt-builder"

export const maxDuration = 120

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { documentContent, reviewType = "completa", caseId, projectId, useOpus = false } = await req.json()
  const startTime = Date.now()

  if (!documentContent) {
    return new Response("Document content is required", { status: 400 })
  }

  // Select model
  const config: ModelConfig = useOpus
    ? MODEL_CONFIGS.premium
    : {
        tier: "standard" as const,
        model: AI_CONFIG.revisao.model,
        maxOutputTokens: AI_CONFIG.revisao.maxOutputTokens,
        temperature: AI_CONFIG.revisao.temperature,
        costPerMTokIn: MODEL_CONFIGS.standard.costPerMTokIn,
        costPerMTokOut: MODEL_CONFIGS.standard.costPerMTokOut,
      }

  const systemPrompt = buildReviewPrompt(reviewType, documentContent)

  // Build streamText options
  const streamOptions: Parameters<typeof streamText>[0] = {
    model: anthropic(config.model),
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Revise o documento acima no modo "${reviewType}". Apresente as sugestões categorizadas por gravidade.`,
      },
    ],
    maxOutputTokens: config.maxOutputTokens,
    temperature: config.temperature,
    async onFinish({ usage }) {
      const cost = estimateCost(config, usage.inputTokens ?? 0, usage.outputTokens ?? 0)
      await db.aIUsageLog.create({
        data: {
          userId: session.user!.id!,
          actionType: "review",
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
