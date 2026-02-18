import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const maxDuration = 120

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { repository_id, texto, tribunal_codigo, ano } = await req.json()

  if (!texto && !repository_id) {
    return new Response("Texto ou repository_id é obrigatório", { status: 400 })
  }

  let textoExtraido = texto || ""
  let repoId = repository_id

  // If repository_id is provided, fetch the stored text
  if (repository_id) {
    const repo = await db.calendarRepository.findUnique({ where: { id: repository_id } })
    if (!repo) {
      return new Response("Repositório não encontrado", { status: 404 })
    }
    textoExtraido = repo.texto_extraido || ""
    if (!textoExtraido) {
      return new Response("Nenhum texto extraído disponível neste repositório", { status: 400 })
    }

    // Update status to PROCESSANDO
    await db.calendarRepository.update({
      where: { id: repository_id },
      data: { status: "PROCESSANDO" },
    })
  }

  try {
    const config = MODEL_CONFIGS.standard
    const result = await generateText({
      model: anthropic(config.model),
      maxOutputTokens: 4096,
      temperature: 0.1,
      system: `Você é um assistente jurídico especializado em calendários judiciais brasileiros.
Sua tarefa é extrair feriados e suspensões de expediente de portarias, resoluções e atos de tribunais.

Responda EXCLUSIVAMENTE com um JSON válido no seguinte formato:
{
  "feriados": [
    {
      "data": "YYYY-MM-DD",
      "nome": "Nome do feriado",
      "tipo": "NACIONAL|ESTADUAL|MUNICIPAL|FORENSE|PONTO_FACULTATIVO",
      "suspende_expediente": true,
      "prazos_prorrogados": true,
      "fundamento_legal": "Art. X da Portaria Y"
    }
  ],
  "suspensoes": [
    {
      "tipo": "RECESSO_DEZ_JAN|FERIAS_JULHO|SUSPENSAO_PRAZOS_ART220|SUSPENSAO_PORTARIA|INDISPONIBILIDADE_SISTEMA|LUTO_OFICIAL|CALAMIDADE|ELEICOES|OPERACAO_ESPECIAL",
      "data_inicio": "YYYY-MM-DD",
      "data_fim": "YYYY-MM-DD",
      "nome": "Descrição da suspensão",
      "suspende_prazos": true,
      "suspende_audiencias": true,
      "suspende_sessoes": true,
      "plantao_disponivel": false,
      "fundamento_legal": "Art. X da Portaria Y"
    }
  ]
}

Regras:
- Extraia TODOS os feriados e suspensões mencionados no texto
- Para recesso forense (geralmente 20/dez a 20/jan), use tipo "RECESSO_DEZ_JAN"
- Para pontos facultativos, use tipo "PONTO_FACULTATIVO"
- Datas devem estar no formato YYYY-MM-DD
- Se o ano não estiver explícito na data, use o ano ${ano || new Date().getFullYear()}
- Inclua feriados nacionais, estaduais e municipais mencionados
- NÃO invente feriados que não estão no texto`,
      prompt: `Extraia todos os feriados e suspensões do seguinte texto de portaria/resolução do tribunal ${tribunal_codigo || ""}:

---
${textoExtraido.slice(0, 12000)}
---

Responda APENAS com o JSON, sem texto adicional.`,
    })

    // Parse AI response
    let parsed: { feriados: Array<Record<string, unknown>>; suspensoes: Array<Record<string, unknown>> }
    try {
      // Try to extract JSON from the response (AI might wrap it in markdown)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("No JSON found in response")
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      if (repoId) {
        await db.calendarRepository.update({
          where: { id: repoId },
          data: {
            status: "ERRO",
            erro_processamento: "Falha ao parsear resposta da IA",
          },
        })
      }
      return Response.json(
        { error: "Falha ao parsear resposta da IA", raw: result.text },
        { status: 500 },
      )
    }

    const feriados = parsed.feriados || []
    const suspensoes = parsed.suspensoes || []

    // Update repository if applicable
    if (repoId) {
      await db.calendarRepository.update({
        where: { id: repoId },
        data: {
          status: "PROCESSADO",
          feriados_extraidos: feriados.length,
          suspensoes_extraidas: suspensoes.length,
          processado_por_ia: true,
          erro_processamento: null,
        },
      })
    }

    return Response.json({
      feriados,
      suspensoes,
      total_feriados: feriados.length,
      total_suspensoes: suspensoes.length,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"

    if (repoId) {
      await db.calendarRepository.update({
        where: { id: repoId },
        data: {
          status: "ERRO",
          erro_processamento: errorMessage,
        },
      })
    }

    return Response.json({ error: errorMessage }, { status: 500 })
  }
}
