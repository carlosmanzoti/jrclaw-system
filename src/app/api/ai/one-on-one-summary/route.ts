import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um coach executivo especializado em reuniões 1:1 eficazes
para a JRCLaw, escritório de advocacia boutique especializado em recuperação judicial
e reestruturação de passivos, com 1 a 10 colaboradores em Maringá/PR e Balsas/MA.

Seu papel é transformar anotações de 1:1 em registros estruturados e acionar os próximos
passos certos. Considere o contexto jurídico: pressão de prazos processuais, clientes em
situação de crise, complexidade técnica de recuperação judicial e a importância do alinhamento
em times pequenos onde a comunicação direta é fundamental.

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "summary": "Resumo executivo da reunião em 2-3 frases",
  "keyPoints": [
    {
      "topic": "Tópico discutido",
      "conclusion": "O que foi decidido ou observado",
      "category": "DESEMPENHO | DESENVOLVIMENTO | ALINHAMENTO | BLOQUEIO | PESSOAL | CARREIRA | OUTRO"
    }
  ],
  "actionItems": [
    {
      "description": "Ação a ser tomada",
      "owner": "LIDER | COLABORADOR | AMBOS",
      "dueDate": "Prazo sugerido (ex: próxima semana, 15 dias)",
      "priority": "ALTA | MEDIA | BAIXA"
    }
  ],
  "moodAssessment": {
    "score": 7,
    "label": "Bem | Regular | Preocupante | Crítico",
    "signals": ["Sinais observados nas anotações"]
  },
  "suggestedTopicsForNext": [
    {
      "topic": "Tópico sugerido para o próximo 1:1",
      "rationale": "Por que esse tópico é relevante agora",
      "priority": "ALTA | MEDIA | BAIXA"
    }
  ],
  "leaderNotes": "Observações privadas para o líder (tendências, atenção especial necessária)"
}`

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { notes, actionItems, moodScore, agenda, memberRole, meetingDate } = body

    if (!notes && !actionItems) {
      return NextResponse.json(
        { error: "Ao menos 'notes' ou 'actionItems' são obrigatórios" },
        { status: 400 }
      )
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Resuma a seguinte reunião 1:1 e sugira os próximos passos:

Data da reunião: ${meetingDate || "Não informada"}
Cargo/Função do colaborador: ${memberRole || "Não informado"}
Humor/Mood score (1-10): ${moodScore ?? "Não informado"}

Pauta prevista:
${agenda ? JSON.stringify(agenda, null, 2) : "Não estruturada / conversa livre"}

Anotações da reunião:
${notes || "Sem anotações textuais"}

Itens de ação registrados durante a reunião:
${actionItems ? JSON.stringify(actionItems, null, 2) : "Nenhum registrado formalmente"}

Com base nas informações acima:
1. Gere um resumo executivo da reunião
2. Extraia os pontos-chave e conclusões
3. Liste os itens de ação com responsável e prazo
4. Avalie o estado emocional/engajamento do colaborador com base no mood score e nas notas
5. Sugira 3-5 tópicos relevantes para o próximo 1:1, justificando cada um
6. Adicione observações privadas para o líder, se relevante`

    const { text } = await generateText({
      model: anthropic(config.model),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0.35,
    })

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error("[AI/one-on-one-summary] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao resumir 1:1" }, { status: 500 })
  }
}
