import { generateText, streamText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildWorkspaceContext, invalidateWorkspaceCache } from "@/lib/ai/workspace-context"
import { buildWorkspaceSystemPrompt, getActionInstructions } from "@/lib/ai/workspace-system-prompt"

export const maxDuration = 120

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per workspace per hour)
// ---------------------------------------------------------------------------

const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(workspaceId: string): boolean {
  const now = Date.now()
  const entry = rateLimits.get(workspaceId)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(workspaceId, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 30) return false
  entry.count++
  return true
}

// ---------------------------------------------------------------------------
// Actions that use streaming (long-form generation)
// ---------------------------------------------------------------------------

const STREAMING_ACTIONS = new Set(["gerar_rascunho", "melhorar_trecho", "gerar_resumo_revisor", "chat"])

// ---------------------------------------------------------------------------
// Actions that need premium model (deep analysis)
// ---------------------------------------------------------------------------

const PREMIUM_ACTIONS = new Set(["gerar_rascunho", "revisar_completo", "analisar_coerencia", "sugerir_teses"])

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deadlineId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { deadlineId } = await params

  try {
    const body = await req.json()
    const { action, data = {}, messages } = body as {
      action: string
      data?: Record<string, unknown>
      messages?: Array<{ role: "user" | "assistant"; content: string }>
    }

    if (!action) {
      return Response.json({ error: "Missing action" }, { status: 400 })
    }

    // Get workspace for rate limiting
    const ws = await db.deadlineWorkspace.findFirst({
      where: { deadline_id: deadlineId },
      select: { id: true },
    })
    if (!ws) {
      return Response.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Rate limit
    if (!checkRateLimit(ws.id)) {
      return Response.json(
        { error: "Limite de uso da IA atingido (30 chamadas/hora). Tente novamente mais tarde." },
        { status: 429 }
      )
    }

    // Build context
    const context = await buildWorkspaceContext(deadlineId)
    const systemPrompt = buildWorkspaceSystemPrompt(context)
    const actionInstructions = getActionInstructions(action)

    // Select model tier
    const tier = PREMIUM_ACTIONS.has(action) ? "premium" : "standard"
    const config = MODEL_CONFIGS[tier]

    // Build full system message
    const fullSystem = actionInstructions
      ? `${systemPrompt}\n\n## INSTRUÇÃO ESPECÍFICA PARA ESTA AÇÃO\n${actionInstructions}`
      : systemPrompt

    // Handle chat action (streaming with message history)
    if (action === "chat" && messages) {
      const result = streamText({
        model: anthropic(config.model),
        system: fullSystem,
        messages,
        maxOutputTokens: config.maxOutputTokens,
        temperature: config.temperature,
      })

      // Log activity async
      logAIActivity(ws.id, session.user.id, session.user.name || "Usuário", action, "Chat com assistente IA").catch(() => {})

      const response = result.toTextStreamResponse()
      response.headers.set("X-AI-Model", config.model)
      return response
    }

    // Build user message based on action
    const userMessage = buildUserMessage(action, data, context)

    // Streaming actions
    if (STREAMING_ACTIONS.has(action)) {
      const result = streamText({
        model: anthropic(config.model),
        system: fullSystem,
        messages: [{ role: "user", content: userMessage }],
        maxOutputTokens: config.maxOutputTokens,
        temperature: config.temperature,
      })

      logAIActivity(ws.id, session.user.id, session.user.name || "Usuário", action, `IA: ${action}`).catch(() => {})

      const response = result.toTextStreamResponse()
      response.headers.set("X-AI-Model", config.model)
      return response
    }

    // Non-streaming actions (return JSON)
    const result = await generateText({
      model: anthropic(config.model),
      system: fullSystem,
      messages: [{ role: "user", content: userMessage }],
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    })

    // Log activity
    await logAIActivity(ws.id, session.user.id, session.user.name || "Usuário", action, `IA: ${action}`)

    // Invalidate cache after AI interaction that may change state
    invalidateWorkspaceCache(deadlineId)

    // Try to parse JSON from response
    const text = result.text
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return Response.json({ result: parsed, model: config.model, tier })
      }
    } catch {
      // Not JSON, return as text
    }

    return Response.json({ result: text, model: config.model, tier })

  } catch (error) {
    console.error("[Workspace AI Error]", error)
    return Response.json(
      { error: "Assistente IA indisponível no momento. Tente novamente." },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Build user message based on action
// ---------------------------------------------------------------------------

function buildUserMessage(action: string, data: Record<string, unknown>, context: import("@/lib/ai/workspace-context").WorkspaceContext): string {
  switch (action) {
    case "gerar_rascunho":
      return `Gere a peça processual completa para este prazo (${context.deadline.tipo}).${
        data.instrucoes ? `\nInstruções adicionais: ${data.instrucoes}` : ""
      }${
        data.tom ? `\nTom: ${data.tom}` : "\nTom: técnico-neutro"
      }`

    case "melhorar_trecho":
      return `Melhore o seguinte trecho:\n\n${data.texto_selecionado}\n\nInstrução: ${data.instrucao || "melhorar a redação"}`

    case "verificar_citacoes":
      return `Verifique todas as citações de legislação e jurisprudência no seguinte texto:\n\n${data.conteudo_html || "Texto da minuta não fornecido"}`

    case "revisar_completo":
      return `Revise o documento completo no nível: ${data.nivel || "juridico"}.\n\nConteúdo:\n${data.conteudo_html || "Texto da minuta não fornecido"}`

    case "sugerir_teses":
      return `Sugira teses jurídicas para este prazo, considerando as teses já cadastradas no workspace.${
        data.instrucoes ? `\nInstruções: ${data.instrucoes}` : ""
      }`

    case "gerar_resumo_revisor":
      return "Gere o briefing executivo para o revisor desta peça."

    case "analisar_coerencia":
      return `Analise a coerência completa do workspace: teses vs minuta vs pedidos vs checklist.${
        data.conteudo_html ? `\n\nConteúdo da minuta:\n${data.conteudo_html}` : ""
      }`

    case "preparar_protocolo":
      return "Verifique todos os requisitos pré-protocolo e gere o relatório de validação."

    case "classificar_documento":
      return `Classifique o documento: nome="${data.fileName}", tipo MIME="${data.mimeType}".`

    case "gerar_briefing":
      return "Gere o briefing inicial completo para este prazo."

    default:
      return data.prompt as string || `Execute a ação: ${action}`
  }
}

// ---------------------------------------------------------------------------
// Log AI activity
// ---------------------------------------------------------------------------

async function logAIActivity(
  workspaceId: string,
  userId: string,
  userName: string,
  action: string,
  description: string
) {
  try {
    await db.workspaceActivity.create({
      data: {
        workspace_id: workspaceId,
        action: "IA_UTILIZADA",
        description: `🤖 ${description}`,
        user_id: userId,
        user_name: userName,
        metadata: { ai_action: action },
      },
    })
  } catch {
    // Non-critical, don't fail
  }
}
