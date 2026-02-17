import { streamText } from "ai"
import { anthropic, getModelForDocumentType, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildDocumentPrompt } from "@/lib/ai-prompt-builder"
import type { PromptContext } from "@/lib/ai-prompts"

export const maxDuration = 120

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const {
    tipoDocumento,
    caseId,
    projectId,
    tom = "tecnico",
    extensao = "padrao",
    destinatario = "Juiz",
    instrucoesUsuario = "",
    incluirJurisprudencia = true,
    incluirDoutrina = false,
    incluirTutela = false,
    forceOpus = false,
  } = body

  const startTime = Date.now()

  // Select model based on document type, with optional manual override
  let config: ModelConfig = getModelForDocumentType(tipoDocumento)
  if (forceOpus && config.tier !== "premium") {
    config = MODEL_CONFIGS.premium
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

  // Auto-search library
  const areas: string[] = []
  if (processo?.tipo) areas.push(processo.tipo)
  if (projeto?.categoria) areas.push(projeto.categoria)

  if (incluirJurisprudencia && areas.length > 0) {
    biblioteca = await db.libraryEntry.findMany({
      where: { area: { in: areas as any } },
      orderBy: { relevancia: "desc" },
      take: 5,
    })
  }

  const context: PromptContext = {
    tipoDocumento,
    processo: processo as any,
    projeto: projeto as any,
    biblioteca,
    tom,
    extensao,
    destinatario,
    instrucoesUsuario,
    incluirJurisprudencia,
    incluirDoutrina,
    incluirTutela,
  }

  const systemPrompt = buildDocumentPrompt(context)

  const userMessage = instrucoesUsuario
    ? `Gere o documento do tipo ${tipoDocumento}. Instruções adicionais: ${instrucoesUsuario}`
    : `Gere o documento do tipo ${tipoDocumento} com base no contexto fornecido.`

  // Build streamText options
  const streamOptions: Parameters<typeof streamText>[0] = {
    model: anthropic(config.model),
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    maxOutputTokens: config.maxOutputTokens,
    temperature: config.temperature,
    async onFinish({ usage }) {
      const cost = estimateCost(config, usage.inputTokens ?? 0, usage.outputTokens ?? 0)
      await db.aIUsageLog.create({
        data: {
          userId: session.user!.id!,
          actionType: "generate",
          docType: tipoDocumento,
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
  if (config.thinking) {
    streamOptions.providerOptions = {
      anthropic: { thinking: config.thinking },
    }
  }

  const result = streamText(streamOptions)

  const response = result.toTextStreamResponse()

  // Add model info headers
  response.headers.set("X-AI-Model", config.model)
  response.headers.set("X-AI-Tier", config.tier)

  return response
}
