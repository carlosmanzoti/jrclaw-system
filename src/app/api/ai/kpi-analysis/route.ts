import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um analista de desempenho da JRCLaw, escritório de advocacia
boutique especializado em recuperação judicial e reestruturação de passivos, com sede em
Maringá/PR e Balsas/MA, com 1 a 10 colaboradores.

Analise KPIs de membros da equipe jurídica considerando as particularidades desse segmento:
sazonalidade de processos, complexidade de recuperação judicial, multitarefa em times enxutos
e métricas de qualidade jurídica (prazos cumpridos, qualidade de peças, satisfação de clientes).

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "score": 85,
  "scoreLabel": "Bom | Excelente | Regular | Crítico",
  "trend": "CRESCENTE | ESTAVEL | DECRESCENTE",
  "trendExplanation": "Breve explicação da tendência observada",
  "insights": [
    {
      "category": "Categoria do insight (ex: Produtividade, Qualidade, Prazos)",
      "observation": "Observação detalhada sobre o KPI",
      "impact": "POSITIVO | NEGATIVO | NEUTRO"
    }
  ],
  "recommendations": [
    {
      "action": "Ação recomendada específica e acionável",
      "timeframe": "Prazo sugerido (ex: próximos 30 dias, imediato)",
      "priority": "ALTA | MEDIA | BAIXA"
    }
  ],
  "riskAlerts": ["Alertas de risco identificados, se houver"]
}`

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { kpis, role } = body

    if (!kpis || !Array.isArray(kpis)) {
      return NextResponse.json(
        { error: "Campo 'kpis' é obrigatório e deve ser um array" },
        { status: 400 }
      )
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Analise os KPIs dos últimos 3 meses do seguinte membro da equipe:

Cargo/Função: ${role || "Não informado"}

KPIs por mês (mais antigo ao mais recente):
${JSON.stringify(kpis, null, 2)}

Forneça:
1. Uma pontuação de 0 a 100 representando o desempenho geral
2. A tendência observada (crescente, estável ou decrescente)
3. Insights específicos sobre pontos fortes e fracos
4. Recomendações concretas e acionáveis
5. Alertas de risco, se aplicável

Considere o contexto da JRCLaw: escritório boutique, foco em recuperação judicial,
time pequeno onde o desempenho individual tem alto impacto no resultado coletivo.`

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
    console.error("[AI/kpi-analysis] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao analisar KPIs" }, { status: 500 })
  }
}
