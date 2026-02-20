import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um especialista em avaliação de desempenho 360 graus e
desenvolvimento de pessoas na JRCLaw, escritório de advocacia boutique especializado em
recuperação judicial e reestruturação de passivos, com 1 a 10 colaboradores em Maringá/PR
e Balsas/MA.

Sua função é consolidar múltiplas avaliações em uma narrativa coerente, imparcial e
acionável. Identifique padrões, pontos de convergência e divergência entre avaliadores.
Adapte as análises ao contexto jurídico: competências técnicas (direito empresarial,
recuperação judicial, redação jurídica), competências comportamentais (gestão de prazos,
comunicação com clientes em crise, trabalho em equipe) e competências de liderança.

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "narrative": "Narrativa consolidada em 2-3 parágrafos, objetiva e equilibrada",
  "overallScore": 78,
  "strengths": [
    {
      "competency": "Nome da competência",
      "evidence": "Evidências observadas nas avaliações",
      "frequency": "ALTA | MEDIA | BAIXA",
      "quote": "Citação representativa (anonimizada) se disponível"
    }
  ],
  "developmentAreas": [
    {
      "competency": "Nome da competência a desenvolver",
      "gap": "Descrição do gap identificado",
      "frequency": "ALTA | MEDIA | BAIXA",
      "urgency": "CRITICA | ALTA | MEDIA | BAIXA"
    }
  ],
  "blindSpots": ["Pontos que o avaliado pode não perceber em si mesmo"],
  "pdiSuggestions": [
    {
      "competency": "Competência a desenvolver",
      "action": "Ação de desenvolvimento específica",
      "type": "70_EXPERIENCIA | 20_RELACIONAL | 10_FORMAL",
      "timeframe": "Prazo sugerido"
    }
  ],
  "convergePoints": "O que todos os avaliadores concordam",
  "divergePoints": "Onde há divergência significativa entre avaliadores"
}`

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { evaluations, participantRole, participantName, cycleLabel } = body

    if (!evaluations || !Array.isArray(evaluations) || evaluations.length === 0) {
      return NextResponse.json(
        { error: "Campo 'evaluations' é obrigatório e deve conter ao menos uma avaliação" },
        { status: 400 }
      )
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Consolide as seguintes avaliações 360 graus:

Participante: ${participantName ? participantName : "Nome omitido para privacidade"}
Cargo/Função: ${participantRole || "Não informado"}
Ciclo de avaliação: ${cycleLabel || "Atual"}
Total de avaliadores: ${evaluations.length}

Avaliações recebidas:
${JSON.stringify(evaluations, null, 2)}

Identifique:
1. Pontos fortes consistentes (mencionados por múltiplos avaliadores)
2. Áreas de desenvolvimento prioritárias (com maior gap ou frequência)
3. Blind spots (discrepância entre autopercepção e percepção alheia, se houver autoavaliação)
4. Sugestões de PDI baseadas nos gaps identificados
5. Pontos de convergência e divergência entre avaliadores

Seja imparcial, construtivo e foque em comportamentos observáveis, não em julgamentos de caráter.`

    const { text } = await generateText({
      model: anthropic(config.model),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    })

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error("[AI/360-consolidate] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao consolidar avaliação 360" }, { status: 500 })
  }
}
