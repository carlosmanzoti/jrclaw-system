import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um especialista em análise de pesquisas organizacionais
para a JRCLaw, escritório de advocacia boutique especializado em recuperação judicial
e reestruturação de passivos, com 1 a 10 colaboradores em Maringá/PR e Balsas/MA.

IMPORTANTE: Você analisa dados AGREGADOS de pesquisas. Nunca tente identificar respondentes
individuais em pesquisas anônimas. Quando um grupo tem menos de 3 respondentes, indique
que os dados são insuficientes para análise segura do subgrupo.

Analise pesquisas considerando o contexto jurídico: alta pressão de prazos, complexidade
técnica, relacionamento com clientes em situação de crise financeira, e as particularidades
de um time muito enxuto onde os resultados individuais têm alto impacto.

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "overview": {
    "totalResponses": 8,
    "responseRate": "80%",
    "overallScore": 74,
    "overallSentiment": "POSITIVO | NEUTRO | NEGATIVO | MISTO"
  },
  "keyThemes": [
    {
      "theme": "Nome do tema emergente",
      "description": "Descrição do tema identificado nas respostas",
      "sentiment": "POSITIVO | NEGATIVO | NEUTRO",
      "frequency": "ALTA | MEDIA | BAIXA",
      "representativeQuotes": ["Citação representativa, se houver (anonimizada)"]
    }
  ],
  "dimensionScores": [
    {
      "dimension": "Dimensão avaliada (ex: Cultura, Liderança, Comunicação, Carga de trabalho)",
      "score": 78,
      "trend": "CRESCENTE | ESTAVEL | DECRESCENTE | SEM_HISTORICO",
      "highlight": "Principal ponto de atenção nessa dimensão"
    }
  ],
  "benchmarkComparison": {
    "sectorBenchmark": "Escritórios de advocacia de porte similar",
    "assessment": "Como os resultados se comparam ao benchmark do setor",
    "differentials": ["Pontos acima da média", "Pontos abaixo da média"]
  },
  "recommendedActions": [
    {
      "action": "Ação recomendada específica e implementável",
      "rationale": "Por que essa ação é prioritária com base nos dados",
      "impact": "ALTO | MEDIO | BAIXO",
      "effort": "ALTO | MEDIO | BAIXO",
      "timeframe": "Prazo sugerido para implementação",
      "owner": "Quem deve liderar essa ação"
    }
  ],
  "risksIfUnaddressed": ["Riscos caso os pontos críticos não sejam endereçados"],
  "nextSurveyRecommendations": "Sugestões para aprimorar a próxima aplicação da pesquisa"
}`

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { aggregatedResponses, surveyType, period, anonymous, previousResults } = body

    if (!aggregatedResponses) {
      return NextResponse.json(
        { error: "Campo 'aggregatedResponses' é obrigatório" },
        { status: 400 }
      )
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Analise os resultados agregados da seguinte pesquisa organizacional:

Tipo de pesquisa: ${surveyType || "Clima organizacional / Engajamento"}
Período: ${period || "Não informado"}
Respostas anônimas: ${anonymous !== false ? "Sim" : "Não"}

Dados agregados da pesquisa (NUNCA tente identificar respondentes individuais):
${JSON.stringify(aggregatedResponses, null, 2)}

${previousResults ? `Resultados anteriores para comparação:\n${JSON.stringify(previousResults, null, 2)}` : ""}

Identifique:
1. Temas emergentes positivos e negativos
2. Pontuações por dimensão e tendências
3. Comparação com benchmark de escritórios de advocacia boutique
4. Exatamente 3 ações recomendadas de alto impacto, priorizadas por urgência e esforço
5. Riscos organizacionais se os pontos críticos não forem endereçados

Contexto: JRCLaw tem 1-10 pessoas, então mesmo pequenas variações de 1-2 pessoas
têm impacto significativo nos percentuais. Considere isso na análise.`

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
    console.error("[AI/survey-analyze] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao analisar pesquisa" }, { status: 500 })
  }
}
