import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um especialista em Plano de Desenvolvimento Individual (PDI)
e gestão de carreira para a JRCLaw, escritório de advocacia boutique especializado em
recuperação judicial e reestruturação de passivos, com 1 a 10 colaboradores em Maringá/PR
e Balsas/MA.

Crie PDIs baseados no modelo 70-20-10:
- 70% Experiências práticas no trabalho (desafios, projetos, exposição)
- 20% Aprendizagem relacional (mentoria, coaching, feedback, networking)
- 10% Educação formal (cursos, especializações, certificações)

Considere o contexto jurídico específico da JRCLaw: competências em direito empresarial,
recuperação judicial (Lei 11.101/2005), reestruturação extrajudicial, agronegócio,
capacidade de gestão de clientes em crise, redação jurídica de alto nível e gestão de
prazos processuais em ambiente de alta pressão.

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "priorityCompetencies": [
    {
      "name": "Nome da competência",
      "currentLevel": "BASICO | INTERMEDIARIO | AVANCADO | ESPECIALISTA",
      "targetLevel": "BASICO | INTERMEDIARIO | AVANCADO | ESPECIALISTA",
      "gap": "Descrição do gap e sua relevância para o cargo",
      "priority": 1
    }
  ],
  "developmentActions": {
    "experiential": [
      {
        "action": "Ação prática específica (70%)",
        "competency": "Competência que desenvolve",
        "description": "Como executar essa ação no contexto da JRCLaw",
        "startMonth": 1,
        "durationMonths": 3,
        "successIndicator": "Como medir o progresso"
      }
    ],
    "relational": [
      {
        "action": "Ação relacional (20%)",
        "competency": "Competência que desenvolve",
        "description": "Detalhes da ação (com quem, como, frequência)",
        "startMonth": 1,
        "durationMonths": 6
      }
    ],
    "formal": [
      {
        "action": "Educação formal (10%)",
        "competency": "Competência que desenvolve",
        "format": "Curso online | Especialização | Livro | Congresso | Certificação",
        "suggestion": "Sugestão específica (nome do curso, instituição, ou tipo)",
        "startMonth": 2,
        "durationMonths": 4
      }
    ]
  },
  "timeline": {
    "shortTerm": "Foco dos primeiros 3 meses",
    "mediumTerm": "Foco dos meses 4 a 6",
    "longTerm": "Foco dos meses 7 a 12"
  },
  "careerPath": "Narrativa sobre o caminho de carreira para o cargo alvo",
  "checkpoints": [
    {
      "month": 3,
      "evaluation": "O que deve ser avaliado nesse checkpoint"
    }
  ]
}`

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { results360, kpis, feedbacks, currentRole, targetRole } = body

    if (!currentRole) {
      return NextResponse.json({ error: "Campo 'currentRole' é obrigatório" }, { status: 400 })
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Crie um PDI completo usando o modelo 70-20-10 para o seguinte perfil:

Cargo atual: ${currentRole}
Cargo alvo / próximo nível: ${targetRole || "Evolução natural no cargo atual"}

${results360 ? `Resultados da avaliação 360:\n${JSON.stringify(results360, null, 2)}` : ""}
${kpis ? `KPIs recentes:\n${JSON.stringify(kpis, null, 2)}` : ""}
${feedbacks ? `Feedbacks recebidos:\n${JSON.stringify(feedbacks, null, 2)}` : ""}

Priorize as competências com maior impacto no desempenho atual e na evolução para o cargo alvo.
Sugira ações concretas e realizáveis no contexto de um escritório boutique de advocacia.
O PDI deve ter horizonte de 12 meses com checkpoints trimestrais.`

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
    console.error("[AI/pdi-recommend] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao gerar PDI" }, { status: 500 })
  }
}
