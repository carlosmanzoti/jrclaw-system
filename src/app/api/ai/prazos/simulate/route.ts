import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const maxDuration = 60

// ── Helpers ─────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

function formatDateBR(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ── Types ───────────────────────────────────────────────────────────

interface SimulationInput {
  tipo_prazo?: string
  dias: number
  contagem_tipo: string // DIAS_UTEIS | DIAS_CORRIDOS | HORAS
  data_intimacao: string
  metodo_intimacao: string
  tribunal_codigo?: string
  uf?: string
  artigo_legal?: string
  partes?: Array<{
    polo: string
    tipo_parte: string
    prazo_dobro: boolean
  }>
  regras_especiais?: string[]
}

interface LogStep {
  etapa: number
  descricao: string
  resultado: string
}

// ── Main handler ────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const input: SimulationInput = await req.json()
  const log: LogStep[] = []
  let step = 0

  // 1. Parse base date
  const dataIntimacao = startOfDay(new Date(input.data_intimacao))
  log.push({
    etapa: ++step,
    descricao: "Data da intimação/evento",
    resultado: formatDateBR(dataIntimacao),
  })

  // 2. Fetch non-working days from DB
  const year = dataIntimacao.getFullYear()
  const searchFrom = dataIntimacao
  const searchTo = addDays(dataIntimacao, (input.dias || 15) * 4) // generous range

  const [generalHolidays, courtHolidays, suspensions] = await Promise.all([
    db.holiday.findMany({
      where: {
        data: { gte: searchFrom, lte: searchTo },
        OR: input.uf ? [{ uf: null }, { uf: input.uf }] : [{ uf: null }],
      },
    }),
    input.tribunal_codigo
      ? db.courtHoliday.findMany({
          where: {
            data: { gte: searchFrom, lte: searchTo },
            prazos_prorrogados: true,
            calendar: { tribunal_codigo: input.tribunal_codigo },
          },
        })
      : Promise.resolve([]),
    input.tribunal_codigo
      ? db.courtSuspension.findMany({
          where: {
            suspende_prazos: true,
            data_inicio: { lte: searchTo },
            data_fim: { gte: searchFrom },
            calendar: { tribunal_codigo: input.tribunal_codigo },
          },
        })
      : Promise.resolve([]),
  ])

  // Build non-working days set
  const nonWorkingDays = new Set<string>()
  for (const h of generalHolidays) nonWorkingDays.add(formatDate(new Date(h.data)))
  for (const h of courtHolidays) nonWorkingDays.add(formatDate(new Date(h.data)))
  for (const s of suspensions) {
    let cursor = startOfDay(new Date(s.data_inicio))
    const sEnd = startOfDay(new Date(s.data_fim))
    while (cursor <= sEnd) {
      nonWorkingDays.add(formatDate(cursor))
      cursor = addDays(cursor, 1)
    }
  }

  log.push({
    etapa: ++step,
    descricao: "Feriados e suspensões carregados",
    resultado: `${generalHolidays.length} feriados gerais, ${courtHolidays.length} feriados do tribunal, ${suspensions.length} suspensões`,
  })

  // 3. Determine start date based on intimacao method (CPC Art. 231)
  let dataInicioContagem = new Date(dataIntimacao)

  switch (input.metodo_intimacao) {
    case "INTIMACAO_ELETRONICA":
    case "DISPONIBILIZACAO_SISTEMA": {
      // CPC Art. 231 §3 — disponibilizacao + 3 dias uteis = considerada feita
      // Then the deadline starts on the first business day AFTER
      let diasUteisContados = 0
      let cursor = addDays(dataIntimacao, 1)
      while (diasUteisContados < 3) {
        if (!isWeekend(cursor) && !nonWorkingDays.has(formatDate(cursor))) {
          diasUteisContados++
        }
        if (diasUteisContados < 3) cursor = addDays(cursor, 1)
      }
      dataInicioContagem = addDays(cursor, 1)
      log.push({
        etapa: ++step,
        descricao: "Intimação eletrônica: disponibilização + 3 dias úteis (Art. 231 §3 CPC)",
        resultado: `Considerada feita em ${formatDateBR(cursor)}. Prazo inicia em ${formatDateBR(dataInicioContagem)}`,
      })
      break
    }
    case "INTIMACAO_DIARIO_OFICIAL":
    case "PUBLICACAO_DIARIO": {
      // CPC Art. 231 VII — publicacao no diario: primeiro dia util apos publicacao
      dataInicioContagem = addDays(dataIntimacao, 1)
      log.push({
        etapa: ++step,
        descricao: "Publicação no Diário Oficial (Art. 231 VII CPC)",
        resultado: `Prazo inicia no primeiro dia útil após publicação: ${formatDateBR(dataInicioContagem)}`,
      })
      break
    }
    case "JUNTADA_AR":
    case "JUNTADA_MANDADO": {
      // CPC Art. 231 II/III — juntada aos autos: dia util seguinte
      dataInicioContagem = addDays(dataIntimacao, 1)
      log.push({
        etapa: ++step,
        descricao: "Juntada aos autos (Art. 231 CPC)",
        resultado: `Prazo inicia no dia útil seguinte: ${formatDateBR(dataInicioContagem)}`,
      })
      break
    }
    default: {
      // For other methods, day following the event
      dataInicioContagem = addDays(dataIntimacao, 1)
      log.push({
        etapa: ++step,
        descricao: `Evento gatilho: ${input.metodo_intimacao}`,
        resultado: `Prazo inicia no dia seguinte: ${formatDateBR(dataInicioContagem)}`,
      })
    }
  }

  // Ensure start date falls on a business day (for DIAS_UTEIS)
  if (input.contagem_tipo === "DIAS_UTEIS") {
    while (isWeekend(dataInicioContagem) || nonWorkingDays.has(formatDate(dataInicioContagem))) {
      dataInicioContagem = addDays(dataInicioContagem, 1)
    }
    log.push({
      etapa: ++step,
      descricao: "Ajuste: início da contagem em dia útil (Art. 224 §1 CPC)",
      resultado: formatDateBR(dataInicioContagem),
    })
  }

  // 4. Apply special rules — prazo em dobro
  let prazoEfetivo = input.dias
  let dobraAplicada = false
  let dobraMotivo = ""

  const regras = input.regras_especiais || []
  const partes = input.partes || []

  // Check parties for prazo em dobro
  const hasFazenda = partes.some(
    (p) =>
      p.prazo_dobro &&
      ["FAZENDA_FEDERAL", "FAZENDA_ESTADUAL", "FAZENDA_MUNICIPAL", "AUTARQUIA", "FUNDACAO_PUBLICA"].includes(
        p.tipo_parte,
      ),
  )
  const hasMP = partes.some((p) => p.prazo_dobro && p.tipo_parte === "MINISTERIO_PUBLICO")
  const hasDefensoria = partes.some((p) => p.prazo_dobro && p.tipo_parte === "DEFENSORIA_PUBLICA")
  const hasLitisconsorcio = regras.includes("DOBRA_LITISCONSORCIO")

  if (hasFazenda || regras.includes("DOBRA_FAZENDA")) {
    prazoEfetivo = input.dias * 2
    dobraAplicada = true
    dobraMotivo = "Fazenda Pública — Art. 183 CPC"
  } else if (hasMP || regras.includes("DOBRA_MP")) {
    prazoEfetivo = input.dias * 2
    dobraAplicada = true
    dobraMotivo = "Ministério Público — Art. 180 CPC"
  } else if (hasDefensoria || regras.includes("DOBRA_DEFENSORIA")) {
    prazoEfetivo = input.dias * 2
    dobraAplicada = true
    dobraMotivo = "Defensoria Pública — Art. 186 CPC"
  } else if (hasLitisconsorcio) {
    prazoEfetivo = input.dias * 2
    dobraAplicada = true
    dobraMotivo = "Litisconsórcio com advogados diferentes — Art. 229 CPC"
  }

  if (dobraAplicada) {
    log.push({
      etapa: ++step,
      descricao: `Prazo em dobro aplicado: ${dobraMotivo}`,
      resultado: `${input.dias} dias → ${prazoEfetivo} dias`,
    })
  }

  // 5. Count days
  let dataFimPrazo: Date

  if (input.contagem_tipo === "DIAS_UTEIS") {
    let diasUteisContados = 0
    let cursor = new Date(dataInicioContagem)

    while (diasUteisContados < prazoEfetivo) {
      if (!isWeekend(cursor) && !nonWorkingDays.has(formatDate(cursor))) {
        diasUteisContados++
      }
      if (diasUteisContados < prazoEfetivo) {
        cursor = addDays(cursor, 1)
      }
    }
    dataFimPrazo = cursor

    log.push({
      etapa: ++step,
      descricao: `Contagem de ${prazoEfetivo} dias úteis (Art. 219 CPC)`,
      resultado: `De ${formatDateBR(dataInicioContagem)} até ${formatDateBR(dataFimPrazo)}`,
    })
  } else {
    // DIAS_CORRIDOS
    dataFimPrazo = addDays(dataInicioContagem, prazoEfetivo - 1)
    log.push({
      etapa: ++step,
      descricao: `Contagem de ${prazoEfetivo} dias corridos`,
      resultado: `De ${formatDateBR(dataInicioContagem)} até ${formatDateBR(dataFimPrazo)}`,
    })
  }

  // 6. Check recesso forense (Art. 220 CPC: Dec 20 - Jan 20)
  if (regras.includes("SUSPENSAO_RECESSO")) {
    const recessoInicio = new Date(year, 11, 20) // Dec 20
    const recessoFim = new Date(year + 1, 0, 20) // Jan 20
    if (dataFimPrazo >= recessoInicio && dataInicioContagem <= recessoFim) {
      // Calculate how many days overlap with recesso
      const overlapStart = new Date(Math.max(dataInicioContagem.getTime(), recessoInicio.getTime()))
      const overlapEnd = new Date(Math.min(dataFimPrazo.getTime(), recessoFim.getTime()))
      const overlapDays = Math.ceil(
        (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1

      if (overlapDays > 0) {
        dataFimPrazo = addDays(dataFimPrazo, overlapDays)
        // Ensure end date is on a business day
        if (input.contagem_tipo === "DIAS_UTEIS") {
          while (isWeekend(dataFimPrazo) || nonWorkingDays.has(formatDate(dataFimPrazo))) {
            dataFimPrazo = addDays(dataFimPrazo, 1)
          }
        }
        log.push({
          etapa: ++step,
          descricao: "Recesso forense (Art. 220 CPC): 20/dez a 20/jan — prazos suspensos",
          resultado: `${overlapDays} dias suspensos. Novo vencimento: ${formatDateBR(dataFimPrazo)}`,
        })
      }
    }
  }

  // 7. Ensure final date is a business day (for DIAS_UTEIS)
  if (input.contagem_tipo === "DIAS_UTEIS") {
    while (isWeekend(dataFimPrazo) || nonWorkingDays.has(formatDate(dataFimPrazo))) {
      dataFimPrazo = addDays(dataFimPrazo, 1)
    }
  }

  // Calculate total calendar days
  const diasCorridos = Math.ceil(
    (dataFimPrazo.getTime() - dataInicioContagem.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1

  log.push({
    etapa: ++step,
    descricao: "Data final do prazo",
    resultado: `${formatDateBR(dataFimPrazo)} (${new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(dataFimPrazo)})`,
  })

  // 8. AI suggestion (non-blocking — try/catch)
  let sugestao_ia = ""
  try {
    const config = MODEL_CONFIGS.standard
    const result = await generateText({
      model: anthropic(config.model),
      maxOutputTokens: 1024,
      temperature: 0.3,
      system: `Você é um assistente jurídico especializado em prazos processuais brasileiros (CPC/2015).
Responda SEMPRE em português brasileiro. Seja direto e conciso.
Forneça: (1) Avaliação de risco, (2) Recomendações práticas, (3) Alertas sobre exceções ou armadilhas.`,
      prompt: `Analise o seguinte cálculo de prazo processual:
- Tipo: ${input.tipo_prazo || "Genérico"}
- Artigo: ${input.artigo_legal || "N/A"}
- Tribunal: ${input.tribunal_codigo || "N/A"}
- UF: ${input.uf || "N/A"}
- Data intimação: ${formatDateBR(dataIntimacao)}
- Método intimação: ${input.metodo_intimacao}
- Prazo original: ${input.dias} ${input.contagem_tipo === "DIAS_UTEIS" ? "dias úteis" : "dias corridos"}
- Prazo efetivo (com dobra): ${prazoEfetivo} dias
- Dobra aplicada: ${dobraAplicada ? `Sim — ${dobraMotivo}` : "Não"}
- Data início contagem: ${formatDateBR(dataInicioContagem)}
- Data fim prazo: ${formatDateBR(dataFimPrazo)}
- Regras especiais: ${regras.join(", ") || "Nenhuma"}
- Partes: ${partes.map((p) => `${p.polo} - ${p.tipo_parte}`).join("; ") || "Nenhuma"}

Forneça uma análise breve (máx 200 palavras) com riscos, recomendações e alertas.`,
    })
    sugestao_ia = result.text
  } catch {
    sugestao_ia = "Não foi possível gerar a sugestão da IA neste momento."
  }

  return Response.json({
    data_intimacao: formatDate(dataIntimacao),
    data_inicio_contagem: formatDate(dataInicioContagem),
    data_fim_prazo: formatDate(dataFimPrazo),
    prazo_original: input.dias,
    prazo_efetivo: prazoEfetivo,
    contagem_tipo: input.contagem_tipo,
    dias_corridos: diasCorridos,
    dobra_aplicada: dobraAplicada,
    dobra_motivo: dobraMotivo,
    feriados_no_periodo: generalHolidays.length + courtHolidays.length,
    suspensoes_no_periodo: suspensions.length,
    log_calculo: log,
    sugestao_ia,
  })
}
