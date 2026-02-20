import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um especialista em cultura de feedback e desenvolvimento de
pessoas na JRCLaw, escritório de advocacia boutique especializado em recuperação judicial
e reestruturação de passivos, com 1 a 10 colaboradores em Maringá/PR e Balsas/MA.

Você domina a metodologia SBI (Situação-Comportamento-Impacto) e os princípios de
Radical Candor (Kim Scott). Adapte feedbacks à realidade jurídica: precisão técnica,
gestão de prazos fatais, comunicação com clientes em crise e trabalho em equipe enxuta.

Retorne SEMPRE um JSON válido, sem markdown, sem explicações adicionais.`

type FeedbackAction = "improve_text" | "suggest" | "check_tone"

const ACTION_FORMATS: Record<FeedbackAction, string> = {
  improve_text: `{
  "improvedText": "Texto reescrito no formato SBI, mantendo a essência da mensagem original",
  "changes": ["Lista de mudanças aplicadas e por quê"],
  "sbiBreakdown": {
    "situacao": "Trecho correspondente à Situação",
    "comportamento": "Trecho correspondente ao Comportamento",
    "impacto": "Trecho correspondente ao Impacto"
  }
}`,
  suggest: `{
  "suggestions": [
    {
      "text": "Sugestão de feedback completo no formato SBI",
      "focus": "Aspecto abordado (ex: Gestão de prazos, Qualidade técnica, Comunicação)",
      "tone": "Tom do feedback (ex: Construtivo, Positivo, Desafiador)"
    }
  ]
}`,
  check_tone: `{
  "classification": "Radical Candor | Ruinous Empathy | Obnoxious Aggression | Manipulative Insincerity",
  "explanation": "Por que esse feedback se enquadra nessa classificação",
  "careDimension": "ALTO | MEDIO | BAIXO",
  "directnessDimension": "ALTO | MEDIO | BAIXO",
  "improvementSuggestion": "Como tornar o feedback mais eficaz mantendo a intenção original"
}`,
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { action, text, role, competency, events } = body

    if (!action || !["improve_text", "suggest", "check_tone"].includes(action)) {
      return NextResponse.json(
        { error: "Campo 'action' deve ser: improve_text | suggest | check_tone" },
        { status: 400 }
      )
    }

    const typedAction = action as FeedbackAction
    const config = MODEL_CONFIGS.standard

    let userPrompt = ""

    if (typedAction === "improve_text") {
      if (!text) return NextResponse.json({ error: "Campo 'text' é obrigatório" }, { status: 400 })
      userPrompt = `Reescreva o seguinte feedback no formato SBI (Situação-Comportamento-Impacto), mantendo a essência da mensagem.
Cargo do receptor: ${role || "não informado"}
Competência avaliada: ${competency || "não informada"}
Texto original: "${text}"
Formato de resposta: ${ACTION_FORMATS.improve_text}`
    } else if (typedAction === "suggest") {
      if (!role) return NextResponse.json({ error: "Campo 'role' é obrigatório" }, { status: 400 })
      userPrompt = `Sugira 3 feedbacks construtivos no formato SBI para um(a) ${role} da JRCLaw.
Competência a abordar: ${competency || "desempenho geral"}
${events ? `Eventos/situações recentes relevantes: ${events}` : "Crie situações típicas da advocacia de recuperação judicial."}
Formato de resposta: ${ACTION_FORMATS.suggest}`
    } else {
      if (!text) return NextResponse.json({ error: "Campo 'text' é obrigatório" }, { status: 400 })
      userPrompt = `Classifique o tom do seguinte feedback segundo o modelo Radical Candor (Kim Scott).
Cargo do receptor: ${role || "não informado"}
Texto do feedback: "${text}"
Formato de resposta: ${ACTION_FORMATS.check_tone}`
    }

    const { text: responseText } = await generateText({
      model: anthropic(config.model),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0.4,
    })

    const parsed = JSON.parse(responseText)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error("[AI/feedback-assist] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao processar feedback" }, { status: 500 })
  }
}
