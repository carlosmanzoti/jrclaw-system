import { NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"

const SYSTEM_PROMPT = `Você é um consultor sênior de gestão de pessoas e OKRs para a JRCLaw,
um escritório de advocacia boutique especializado em recuperação judicial, reestruturação de
dívidas e passivos, localizado em Maringá/PR e Balsas/MA, com 1 a 10 colaboradores.

Seu papel é sugerir OKRs (Objectives and Key Results) alinhados às necessidades de um
escritório jurídico de alta performance, considerando o contexto de recuperação judicial,
advocacia empresarial e a realidade de um time pequeno e multifuncional.

Retorne APENAS um JSON válido, sem markdown, sem explicações adicionais, no seguinte formato:
{
  "okrs": [
    {
      "objective": "Texto do objetivo (inspirador, qualitativo, com prazo implícito de trimestre)",
      "keyResults": [
        {
          "description": "Resultado-chave mensurável",
          "metric": "KPI associado (ex: número, percentual, valor)",
          "target": "Meta específica (ex: 95%, R$ 50.000, 10 processos)"
        }
      ],
      "alignment": "Como esse OKR contribui para o escritório",
      "priority": "ALTA | MEDIA | BAIXA"
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
    const { role, department, previousOkrs, recentKpis, developmentAreas } = body

    if (!role) {
      return NextResponse.json({ error: "Campo 'role' é obrigatório" }, { status: 400 })
    }

    const config = MODEL_CONFIGS.standard

    const userPrompt = `Sugira entre 3 e 5 OKRs para o próximo trimestre para o seguinte perfil:

Cargo/Função: ${role}
Área/Departamento: ${department || "Jurídico"}
${previousOkrs ? `OKRs anteriores: ${JSON.stringify(previousOkrs)}` : ""}
${recentKpis ? `KPIs recentes: ${JSON.stringify(recentKpis)}` : ""}
${developmentAreas ? `Áreas de desenvolvimento identificadas: ${developmentAreas}` : ""}

Considere o contexto da JRCLaw: escritório boutique, foco em recuperação judicial e
reestruturação de passivos, time enxuto onde cada membro tem papel estratégico.
Os OKRs devem ser ambiciosos porém realistas para uma equipe pequena.`

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
    console.error("[AI/okr-suggest] Error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Falha ao interpretar resposta da IA" }, { status: 500 })
    }
    return NextResponse.json({ error: "Erro interno ao sugerir OKRs" }, { status: 500 })
  }
}
