import { streamText } from "ai"
import { anthropic, getModelForDocumentType, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildDocumentPrompt } from "@/lib/ai-prompt-builder"
import type { PromptContext } from "@/lib/ai-prompts"
import { Prisma } from "@prisma/client"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
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
    referenceDocs = [],
    bibliotecaEntryIds = [],
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

  // Smart Biblioteca search
  const areas: string[] = []
  if (processo?.tipo) areas.push(processo.tipo)
  if (projeto?.categoria) areas.push(projeto.categoria)

  // Build search conditions
  const searchConditions: Prisma.LibraryEntryWhereInput[] = []

  // Area match
  if (areas.length > 0) {
    searchConditions.push({ area: { in: areas as any } })
  }

  // Favorites of matching areas
  if (areas.length > 0) {
    searchConditions.push({ favorito: true, area: { in: areas as any } })
  }

  // Case/project linked entries
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

  // Text-based search from document type and case tags
  const searchTerms: string[] = []
  if (tipoDocumento) searchTerms.push(tipoDocumento.replace(/_/g, " ").toLowerCase())
  if (processo?.tags) searchTerms.push(...processo.tags)
  if (searchTerms.length > 0) {
    searchConditions.push({
      OR: searchTerms.flatMap((term) => [
        { titulo: { contains: term, mode: "insensitive" as Prisma.QueryMode } },
        { tags: { hasSome: [term] } },
      ]),
    })
  }

  // User-selected entries
  let userSelectedEntries: any[] = []
  if (bibliotecaEntryIds.length > 0) {
    userSelectedEntries = await db.libraryEntry.findMany({
      where: { id: { in: bibliotecaEntryIds } },
    })
  }

  // Auto-search entries (fill remaining slots up to 10)
  const autoSearchLimit = Math.max(0, 10 - userSelectedEntries.length)
  let autoSearchEntries: any[] = []

  if (autoSearchLimit > 0 && searchConditions.length > 0) {
    autoSearchEntries = await db.libraryEntry.findMany({
      where: {
        OR: searchConditions,
        id: { notIn: bibliotecaEntryIds },
      },
      orderBy: [{ favorito: "desc" }, { relevancia: "desc" }],
      take: autoSearchLimit,
    })
  }

  const biblioteca = [...userSelectedEntries, ...autoSearchEntries]
  const bibliotecaRefIds = biblioteca.map((e) => e.id)

  // Build search query string for logging
  const searchQuery = [tipoDocumento, ...areas, ...(processo?.tags || [])].join(" ")

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
    referenceDocs,
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

      // Log Biblioteca search
      if (biblioteca.length > 0) {
        await db.librarySearchLog.create({
          data: {
            user_id: session.user!.id!,
            query: searchQuery,
            results_count: biblioteca.length,
            entries_used: bibliotecaRefIds,
            context: "DOCUMENTO",
          },
        }).catch(() => {}) // non-critical
      }

      // Connect used entries to case/project
      if (bibliotecaRefIds.length > 0) {
        for (const entryId of bibliotecaRefIds) {
          if (caseId) {
            await db.libraryEntry.update({
              where: { id: entryId },
              data: { utilizado_em_casos: { connect: { id: caseId } } },
            }).catch(() => {})
          }
          if (projectId) {
            await db.libraryEntry.update({
              where: { id: entryId },
              data: { utilizado_em_projetos: { connect: { id: projectId } } },
            }).catch(() => {})
          }
        }
      }
    },
  }

  // Add extended thinking for premium model
  if (config.thinking) {
    streamOptions.providerOptions = {
      anthropic: { thinking: config.thinking },
    }
  }

  try {
    const result = streamText(streamOptions)

    const response = result.toTextStreamResponse()

    // Add model info headers
    response.headers.set("X-AI-Model", config.model)
    response.headers.set("X-AI-Tier", config.tier)
    response.headers.set("X-Biblioteca-Refs", JSON.stringify(bibliotecaRefIds))

    return response
  } catch (streamErr: unknown) {
    console.error("[AI Generate] streamText error:", streamErr)
    const message = streamErr instanceof Error ? streamErr.message : "Erro desconhecido na geração"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
  } catch (err: unknown) {
    console.error("[AI Generate] Unexpected error:", err)
    const message = err instanceof Error ? err.message : "Erro interno ao gerar documento"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
