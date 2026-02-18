import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateText } from "ai"
import { anthropic } from "@/lib/ai"

const EMAIL_AI_PROMPT = `Você está atuando como assistente de comunicação do escritório JRCLaw — Advocacia Empresarial, sediado em Maringá/PR e Balsas/MA.

REGRAS:
- Use o tom indicado (combativo/técnico/conciliatório/didático)
- Adapte linguagem ao destinatário:
  → Para credores/bancos: referência ao contrato/operação, tom cooperativo mas firme
  → Para contraparte/advogado: "Ilustre Colega", cortesia profissional
  → Para cliente: linguagem acessível, tom de orientação e confiança
  → Para juiz/tribunal: máxima formalidade, referência ao processo pelo número
- Se houver processo vinculado, referencie quando relevante
- Inclua saudação e despedida adequadas
- NÃO inclua assinatura (será adicionada automaticamente)
FORMATO: Retorne APENAS o corpo do e-mail em HTML simples (parágrafos, negrito, itálico). Não inclua tags html/head/body.`

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { action, originalEmail, linkedCase, tone, userInstructions } =
    await request.json()

  let userPrompt = ""

  switch (action) {
    case "compose_reply":
      userPrompt = `Redija uma RESPOSTA ao e-mail abaixo.\n\nE-mail original:\nDe: ${originalEmail?.from?.name} <${originalEmail?.from?.email}>\nAssunto: ${originalEmail?.subject}\n\n${originalEmail?.bodyPreview || originalEmail?.body?.content || ""}`
      break
    case "improve":
      userPrompt = `Melhore o texto abaixo, mantendo a essência mas aprimorando clareza e linguagem jurídica:\n\n${userInstructions}`
      break
    case "formalize":
      userPrompt = `Formalize o texto abaixo para linguagem jurídica profissional:\n\n${userInstructions}`
      break
    case "summarize":
      userPrompt = `Resuma a thread de e-mail abaixo em um parágrafo conciso:\n\n${originalEmail?.body?.content || originalEmail?.bodyPreview || ""}`
      break
    default:
      userPrompt = userInstructions || "Redija um e-mail profissional."
  }

  if (linkedCase) {
    userPrompt += `\n\nProcesso vinculado: ${linkedCase.numero_processo || linkedCase.title || linkedCase.id}`
  }

  const toneMap: Record<string, string> = {
    combativo:
      "Tom COMBATIVO e FIRME. Assertivo, referências legais, linguagem direta.",
    tecnico:
      "Tom TÉCNICO e NEUTRO. Objetivo, dados concretos, linguagem formal.",
    conciliatorio:
      "Tom CONCILIATÓRIO e COOPERATIVO. Busca acordo, linguagem amigável mas profissional.",
    didatico:
      "Tom DIDÁTICO e ACESSÍVEL. Explicar de forma clara para leigo, analogias quando útil.",
  }
  if (tone && toneMap[tone]) {
    userPrompt += `\n\nTOM DA RESPOSTA: ${toneMap[tone]}`
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250514"),
      maxOutputTokens: 2000,
      messages: [
        { role: "system", content: EMAIL_AI_PROMPT },
        { role: "user", content: userPrompt },
      ],
    })

    return NextResponse.json({ html: text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
