import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um especialista em bem-estar e saúde ocupacional para a
JRCLaw, escritório de advocacia boutique especializado em recuperação judicial e
reestruturação de passivos, com 1 a 10 colaboradores em Maringá/PR e Balsas/MA.

A advocacia de recuperação judicial é reconhecidamente de alta pressão: prazos processuais
fatais, clientes em crise financeira severa, alta complexidade técnica e volume de trabalho
variável com picos intensos. Sua análise deve identificar sinais de alerta de burnout,
fadiga de compaixão ou comprometimento de saúde mental antes que se tornem críticos.

IMPORTANTE: Você não faz diagnósticos médicos ou psicológicos. Identifica padrões de risco
ocupacional e recomenda ações preventivas e de suporte. Em casos CRITICO, sempre recomende
buscar apoio profissional especializado.

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "riskLevel": "LOW | MODERATE | HIGH | CRITICAL",
  "riskScore": 45,
  "riskLabel": "Bem-estar saudável | Atenção recomendada | Risco elevado | Intervenção urgente",
  "summary": "Análise geral do estado de bem-estar baseada nos dados do período",
  "contributingFactors": [
    {
      "factor": "Fator contribuinte identificado",
      "type": "CARGA_TRABALHO | AUTONOMIA | RELACIONAMENTO | RECONHECIMENTO | VALORES | EQUIDADE | AMBIENTE",
      "impact": "ALTO | MEDIO | BAIXO",
      "evidence": "Dado específico que evidencia esse fator"
    }
  ],
  "warningSignals": [
    {
      "signal": "Sinal de alerta identificado",
      "severity": "CRITICO | ALTO | MEDIO | BAIXO",
      "recommendation": "Ação imediata recomendada para esse sinal"
    }
  ],
  "protectiveFactors": ["Fatores protetores identificados que contribuem positivamente"],
  "recommendedActions": {
    "immediate": [
      {
        "action": "Ação imediata (dentro de 48h)",
        "responsible": "LIDER | RH | PROPRIO_COLABORADOR | AMBOS",
        "rationale": "Por que essa ação é urgente"
      }
    ],
    "shortTerm": [
      {
        "action": "Ação de curto prazo (próximas 2 semanas)",
        "responsible": "LIDER | RH | PROPRIO_COLABORADOR | AMBOS",
        "rationale": "Objetivo dessa ação"
      }
    ],
    "structural": [
      {
        "action": "Mudança estrutural recomendada (próximos 30-60 dias)",
        "rationale": "Por que essa mudança previne recorrência"
      }
    ]
  },
  "escalationNeeded": false,
  "escalationRationale": "Se escalationNeeded=true, explique por que e para quem escalar",
  "nextCheckInDate": "Sugestão de quando fazer próximo check-in (ex: em 7 dias)"
}`

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { checkIns, hoursWorked, deadlines, feedbackReceived, memberRole, period } = body

    if (!checkIns && !hoursWorked) {
      return NextResponse.json(
        { error: "Ao menos 'checkIns' ou 'hoursWorked' são obrigatórios" },
        { status: 400 }
      )
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Analise os dados de bem-estar do seguinte colaborador nos últimos 30 dias:

Cargo/Função: ${memberRole || "Não informado"}
Período analisado: ${period || "Últimos 30 dias"}

Check-ins de humor/bem-estar (diários ou semanais, escala 1-10):
${checkIns ? JSON.stringify(checkIns, null, 2) : "Não disponível"}

Horas trabalhadas por semana:
${hoursWorked ? JSON.stringify(hoursWorked, null, 2) : "Não disponível"}

Prazos e carga de trabalho no período:
${deadlines ? JSON.stringify(deadlines, null, 2) : "Não disponível"}

Feedbacks recebidos no período (valência e frequência):
${feedbackReceived ? JSON.stringify(feedbackReceived, null, 2) : "Não disponível"}

Com base nos dados acima:
1. Classifique o nível de risco de bem-estar (LOW/MODERATE/HIGH/CRITICAL)
2. Identifique os principais fatores contribuintes para o estado atual
3. Aponte sinais de alerta específicos com base nos padrões dos dados
4. Liste fatores protetores que estão funcionando positivamente
5. Recomende ações em três horizontes: imediato, curto prazo e estrutural
6. Indique se é necessário escalar para apoio especializado

LEMBRE-SE: Em nível CRITICAL, sempre indique a necessidade de apoio profissional de saúde mental.`

    const { text } = await generateText({
      model: anthropic(config.model),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0.25,
    })

    const parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (error) {
    console.error("[AI/wellbeing-analyze] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao analisar bem-estar" }, { status: 500 })
  }
}
