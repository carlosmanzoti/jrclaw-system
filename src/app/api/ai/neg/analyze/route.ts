import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS, estimateCost } from "@/lib/ai"
import type { ModelConfig } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export const maxDuration = 120

// ---------------------------------------------------------------------------
// Analysis types that use premium (Opus) model
// ---------------------------------------------------------------------------
const PREMIUM_ANALYSIS_TYPES = new Set([
  "playbook",
  "briefing",
  "meeting_script",
])

// ---------------------------------------------------------------------------
// All valid analysis types
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set([
  "event",
  "health_score",
  "proposal",
  "concession",
  "phase_transition",
  "initial",
  "cross_insights",
  "playbook",
  "briefing",
  "debriefing",
  "weekly_report",
  "vote_predict",
  "email_script",
  "meeting_script",
  "smart_suggest",
])

// ---------------------------------------------------------------------------
// Negotiation data include (all relations for full context)
// ---------------------------------------------------------------------------
const NEGOTIATION_INCLUDE = {
  case_: {
    select: {
      id: true,
      numero_processo: true,
      tipo: true,
      cliente: { select: { nome: true } },
    },
  },
  person: { select: { id: true, nome: true, cpf_cnpj: true } },
  rj_creditor: {
    select: { id: true, nome: true, classe: true, valor_atualizado: true },
  },
  responsavel: { select: { id: true, name: true } },
  eventos: { orderBy: { data: "desc" as const }, take: 20 },
  rodadas: { orderBy: { numero: "desc" as const }, take: 5 },
  propostas: { orderBy: { numero: "desc" as const }, take: 10 },
  concessoes: { orderBy: { data: "desc" as const }, take: 10 },
  one_sheets: { orderBy: { created_at: "desc" as const }, take: 3 },
} as const

// ---------------------------------------------------------------------------
// Try to import the dedicated prompt builders; fall back to inline prompts
// ---------------------------------------------------------------------------
let promptBuilders: Record<string, (negotiation: any, extra?: any) => string> = {}
try {
  const mod = require("@/lib/neg-ai-prompts")
  // Collect all exported prompt builders
  for (const key of Object.keys(mod)) {
    if (typeof mod[key] === "function") {
      promptBuilders[key] = mod[key]
    }
  }
} catch {
  // Module not available — will use fallback prompts below
}

// ---------------------------------------------------------------------------
// JSON extraction helper
// ---------------------------------------------------------------------------
function extractJSON(text: string): any {
  // Try to find JSON in code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) {
    return JSON.parse(match[1].trim())
  }
  // Try to parse the whole response as JSON
  try {
    return JSON.parse(text.trim())
  } catch {
    // Try to find first { ... } or [ ... ]
    const objMatch = text.match(/\{[\s\S]*\}/)
    if (objMatch) return JSON.parse(objMatch[0])
    return null
  }
}

// ---------------------------------------------------------------------------
// Format money from centavos (BigInt stored as cents)
// ---------------------------------------------------------------------------
function fmtMoney(v: bigint | number | null | undefined): string {
  if (v == null) return "N/I"
  return `R$ ${(Number(v) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
// Build a concise negotiation context block for prompts
// ---------------------------------------------------------------------------
function buildNegContext(neg: any): string {
  const contraparte = neg.person?.nome ?? neg.rj_creditor?.nome ?? "N/I"
  const lines: string[] = [
    `Negociacao: ${neg.titulo} (${neg.codigo})`,
    `Contraparte: ${contraparte}`,
    `Valor credito: ${fmtMoney(neg.valor_credito)}`,
    `Meta acordo: ${fmtMoney(neg.valor_meta_acordo)}`,
    `Proposta atual: ${fmtMoney(neg.valor_proposta_atual)}`,
    `Pedido credor: ${fmtMoney(neg.valor_pedido_credor)}`,
    `Fase: ${neg.fase} | Status: ${neg.status} | Prioridade: ${neg.prioridade}`,
  ]

  if (neg.case_?.numero_processo) lines.push(`Processo: ${neg.case_.numero_processo}`)
  if (neg.case_?.cliente?.nome) lines.push(`Cliente: ${neg.case_.cliente.nome}`)
  if (neg.rj_creditor?.classe) lines.push(`Classe credor: ${neg.rj_creditor.classe}`)
  if (neg.tki_perfil_credor) lines.push(`Perfil TKI credor: ${neg.tki_perfil_credor}`)
  if (neg.voss_tipo_negociador) lines.push(`Tipo negociador (Voss): ${neg.voss_tipo_negociador}`)
  if (neg.health_score != null) lines.push(`Health Score: ${neg.health_score}/100`)
  if (neg.probability_acordo != null) lines.push(`Prob. acordo: ${(neg.probability_acordo * 100).toFixed(0)}%`)
  if (neg.haircut_percentual != null) lines.push(`Haircut atual: ${neg.haircut_percentual}%`)
  if (neg.zopa_min != null && neg.zopa_max != null) lines.push(`ZOPA: ${fmtMoney(neg.zopa_min)} - ${fmtMoney(neg.zopa_max)}`)
  if (neg.camp_missao) lines.push(`Missao (Camp): ${neg.camp_missao}`)
  if (neg.observacoes) lines.push(`Observacoes: ${neg.observacoes}`)

  // Events
  if (neg.eventos?.length > 0) {
    lines.push("\nULTIMOS EVENTOS:")
    for (const e of neg.eventos.slice(0, 15)) {
      const dt = new Date(e.data).toLocaleDateString("pt-BR")
      lines.push(`- [${e.tipo}${e.canal ? `/${e.canal}` : ""}] ${dt}: ${e.descricao?.substring(0, 300)}${e.sentimento ? ` (sentimento: ${e.sentimento})` : ""}`)
    }
  }

  // Proposals
  if (neg.propostas?.length > 0) {
    lines.push("\nPROPOSTAS:")
    for (const p of neg.propostas.slice(0, 8)) {
      lines.push(`- #${p.numero} (${p.tipo}): ${fmtMoney(p.valor_principal)} | haircut ${p.haircut_pct ?? "N/A"}% | juros ${p.taxa_juros ?? "N/A"}% | ${p.parcelas ?? "?"} parcelas | carencia ${p.carencia_meses ?? 0}m | status: ${p.status}`)
    }
  }

  // Concessions
  if (neg.concessoes?.length > 0) {
    lines.push("\nCONCESSOES:")
    for (const c of neg.concessoes.slice(0, 8)) {
      lines.push(`- [${c.direcao}] ${c.descricao?.substring(0, 200)} | impacto: ${fmtMoney(c.valor_impacto)}`)
    }
  }

  // Rounds
  if (neg.rodadas?.length > 0) {
    lines.push("\nRODADAS:")
    for (const r of neg.rodadas.slice(0, 5)) {
      lines.push(`- Rodada #${r.numero}: status ${r.status} | devedor prop: ${fmtMoney(r.valor_proposto_devedor)} | credor pedido: ${fmtMoney(r.valor_pedido_credor)}${r.ackerman_passo ? ` | Ackerman passo ${r.ackerman_passo}` : ""}`)
    }
  }

  // One-sheets
  if (neg.one_sheets?.length > 0) {
    const os = neg.one_sheets[0]
    lines.push(`\nONE-SHEET MAIS RECENTE:`)
    lines.push(`Objetivo: ${os.objetivo_especifico?.substring(0, 200)}`)
    lines.push(`Situacao: ${os.resumo_situacao?.substring(0, 200)}`)
  }

  // AI fields
  if (neg.ai_proxima_acao) lines.push(`\nPROXIMA ACAO (IA): ${neg.ai_proxima_acao}`)

  // Interests and BATNAs
  if (neg.interesses_devedor) lines.push(`\nINTERESSES DEVEDOR: ${JSON.stringify(neg.interesses_devedor)}`)
  if (neg.interesses_credor) lines.push(`INTERESSES CREDOR: ${JSON.stringify(neg.interesses_credor)}`)
  if (neg.batna_devedor) lines.push(`BATNA DEVEDOR: ${JSON.stringify(neg.batna_devedor)}`)
  if (neg.batna_credor) lines.push(`BATNA CREDOR: ${JSON.stringify(neg.batna_credor)}`)
  if (neg.opcoes_criativas) lines.push(`OPCOES CRIATIVAS: ${JSON.stringify(neg.opcoes_criativas)}`)
  if (neg.criterios_legitimidade) lines.push(`CRITERIOS LEGITIMIDADE: ${JSON.stringify(neg.criterios_legitimidade)}`)

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Fallback prompt builders per analysis type
// ---------------------------------------------------------------------------
function getPromptForType(
  type: string,
  negotiation: any,
  event?: any,
  data?: any
): string {
  const context = buildNegContext(negotiation)
  const jsonInstruction = "Responda EXCLUSIVAMENTE em JSON valido (sem texto adicional fora do JSON). Use UTF-8."

  switch (type) {
    case "event":
      return `Voce e um analista estrategico de negociacoes empresariais e recuperacao judicial.
Analise o seguinte evento de negociacao e retorne insights.

CONTEXTO DA NEGOCIACAO:
${context}

EVENTO A ANALISAR:
Tipo: ${event?.tipo}
Canal: ${event?.canal ?? "N/I"}
Data: ${event?.data ? new Date(event.data).toLocaleDateString("pt-BR") : "N/I"}
Descricao: ${event?.descricao}
Valor mencionado: ${event?.valor_mencionado ? fmtMoney(event.valor_mencionado) : "N/A"}
Participantes: ${event?.participantes ? JSON.stringify(event.participantes) : "N/I"}

${jsonInstruction}
Formato:
{
  "sentimento": "POSITIVO" | "NEUTRO" | "NEGATIVO" | "HOSTIL",
  "tecnicas_usadas": ["string"],
  "insights": "string com analise detalhada",
  "riscos": ["string"],
  "oportunidades": ["string"],
  "proxima_acao_sugerida": "string",
  "framework_relevante": "HARVARD" | "VOSS" | "TKI" | "CAMP" | "KARRASS" | "GAME_THEORY"
}`

    case "health_score":
      return `Voce e um analista estrategico de negociacoes. Calcule o health score (saude) desta negociacao.

CONTEXTO COMPLETO:
${context}

Avalie de 0 a 100 considerando:
- Progresso vs. tempo decorrido (25%)
- Qualidade da comunicacao e rapport (20%)
- Convergencia de valores (propostas se aproximando) (20%)
- Equilibrio de concessoes (15%)
- Riscos ativos (deadlines, impasses, hostilidade) (20%)

${jsonInstruction}
Formato:
{
  "health_score": number (0-100),
  "health_score_details": {
    "progresso": { "score": number, "justificativa": "string" },
    "comunicacao": { "score": number, "justificativa": "string" },
    "convergencia": { "score": number, "justificativa": "string" },
    "concessoes": { "score": number, "justificativa": "string" },
    "riscos": { "score": number, "justificativa": "string" }
  },
  "probability_acordo": number (0.0 a 1.0),
  "haircut_estimado_min": number (percentual),
  "haircut_estimado_max": number (percentual),
  "tempo_estimado_dias": number,
  "proxima_acao": "string com recomendacao concreta",
  "alertas": ["string"],
  "tendencia": "MELHORANDO" | "ESTAVEL" | "PIORANDO"
}`

    case "proposal":
      return `Voce e um analista financeiro e estrategico de negociacoes. Analise esta proposta.

CONTEXTO:
${context}

PROPOSTA A ANALISAR:
${data ? JSON.stringify(data) : "Ver propostas no contexto acima."}

${jsonInstruction}
Formato:
{
  "analise": "string",
  "pontos_fortes": ["string"],
  "pontos_fracos": ["string"],
  "viabilidade_financeira": "ALTA" | "MEDIA" | "BAIXA",
  "npv_estimado_devedor": number | null,
  "npv_estimado_credor": number | null,
  "recovery_rate_estimado": number | null,
  "contra_argumentos_esperados": ["string"],
  "sugestoes_melhoria": ["string"],
  "comparacao_mercado": "string"
}`

    case "concession":
      return `Analise esta concessao na negociacao e avalie se foi estrategicamente adequada.

CONTEXTO:
${context}

CONCESSAO:
${data ? JSON.stringify(data) : "Ver concessoes no contexto acima."}

${jsonInstruction}
Formato:
{
  "analise": "string",
  "adequacao": "EXCELENTE" | "BOA" | "ACEITAVEL" | "RUIM" | "PESSIMA",
  "impacto_estrategico": "string",
  "reciprocidade": "string (a contraparte fez concessao equivalente?)",
  "valor_real_impacto": number | null,
  "sugestao_proxima_concessao": "string",
  "alerta": "string" | null
}`

    case "phase_transition":
      return `Avalie se a negociacao deve transicionar de fase.

CONTEXTO:
${context}

Fase atual: ${negotiation.fase}

${jsonInstruction}
Formato:
{
  "deve_transicionar": boolean,
  "fase_sugerida": "PREPARACAO" | "ENGAJAMENTO" | "BARGANHA" | "COMPROMISSO" | "ENCERRADA",
  "justificativa": "string",
  "criterios_atendidos": ["string"],
  "criterios_pendentes": ["string"],
  "acoes_para_transicao": ["string"]
}`

    case "initial":
      return `Faca uma analise inicial completa desta negociacao usando frameworks de Harvard, Voss e TKI.

CONTEXTO:
${context}

${jsonInstruction}
Formato:
{
  "tki_perfil_credor": "COMPETITIVO" | "COLABORATIVO" | "COMPROMISSO" | "EVITATIVO" | "ACOMODATIVO",
  "tki_assertividade": number (1-10),
  "tki_cooperatividade": number (1-10),
  "tki_estrategia_recomendada": "string",
  "interesses_devedor_estimados": ["string"],
  "interesses_credor_estimados": ["string"],
  "batna_devedor_estimada": { "descricao": "string", "valor_estimado": number | null },
  "batna_credor_estimada": { "descricao": "string", "valor_estimado": number | null },
  "zopa_estimada": { "min": number | null, "max": number | null },
  "opcoes_criativas": ["string"],
  "criterios_legitimidade": ["string"],
  "voss_tipo_negociador": "ANALISTA" | "ACOMODADOR" | "ASSERTIVO",
  "voss_labels_sugeridos": ["string"],
  "voss_calibrated_questions": ["string"],
  "voss_black_swans": ["string"],
  "estrategia_geral": "string",
  "riscos_principais": ["string"]
}`

    case "cross_insights":
      return `Analise padroes cruzados entre esta negociacao e as demais do mesmo caso/RJ.

CONTEXTO DESTA NEGOCIACAO:
${context}

${data?.other_negotiations ? `RESUMO DE OUTRAS NEGOCIACOES:\n${JSON.stringify(data.other_negotiations)}` : "Nao ha dados de outras negociacoes disponiveis."}

${jsonInstruction}
Formato:
{
  "padroes_identificados": ["string"],
  "precedentes_relevantes": ["string"],
  "estrategia_conjunta": "string",
  "riscos_sistemicos": ["string"],
  "oportunidades_cruzadas": ["string"],
  "recomendacoes": ["string"]
}`

    case "playbook":
      return `Gere um playbook estrategico completo para esta negociacao.

CONTEXTO:
${context}

Considere: Harvard, Voss, Camp, Karrass, Teoria dos Jogos, e legislacao brasileira (Lei 11.101/2005 se aplicavel).

${jsonInstruction}
Formato:
{
  "titulo": "string",
  "resumo_executivo": "string",
  "perfil_contraparte": {
    "tipo_negociador": "string",
    "motivacoes": ["string"],
    "pontos_pressao": ["string"],
    "gatilhos_emocionais": ["string"]
  },
  "estrategia_principal": {
    "abordagem": "string",
    "tom_recomendado": "string",
    "framework_primario": "string",
    "framework_secundario": "string"
  },
  "fases": [{
    "fase": "string",
    "objetivo": "string",
    "taticas": ["string"],
    "perguntas_chave": ["string"],
    "concessoes_possiveis": ["string"],
    "linhas_vermelhas": ["string"]
  }],
  "cenarios": [{
    "cenario": "string",
    "probabilidade": number,
    "resposta_recomendada": "string"
  }],
  "ancoragem": {
    "valor_ancora": number | null,
    "justificativa_ancora": "string",
    "ackerman_sequencia": [number]
  },
  "acordos_modelo": [{
    "titulo": "string",
    "valor": number | null,
    "haircut_pct": number | null,
    "condicoes": "string"
  }]
}`

    case "briefing":
      return `Gere um briefing de preparacao para a proxima reuniao/interacao desta negociacao.

CONTEXTO:
${context}

${data?.reuniao_info ? `INFO DA REUNIAO:\n${JSON.stringify(data.reuniao_info)}` : ""}

${jsonInstruction}
Formato:
{
  "objetivo_reuniao": "string",
  "agenda_sugerida": ["string"],
  "pontos_chave": ["string"],
  "perguntas_calibradas_voss": ["string"],
  "labels_preparados": ["string"],
  "accusation_audit": ["string"],
  "ancoragem": { "valor": number | null, "justificativa": "string" },
  "concessoes_preparadas": [{ "item": "string", "contrapartida_exigida": "string" }],
  "linhas_vermelhas": ["string"],
  "black_swans_investigar": ["string"],
  "abertura_sugerida": "string (frase de abertura da reuniao)",
  "tom_recomendado": "string",
  "alertas": ["string"]
}`

    case "debriefing":
      return `Faca um debriefing pos-reuniao/interacao para esta negociacao.

CONTEXTO:
${context}

${data?.evento_debriefing ? `EVENTO PARA DEBRIEFING:\n${JSON.stringify(data.evento_debriefing)}` : "Considere o evento mais recente."}

${jsonInstruction}
Formato:
{
  "resumo": "string",
  "objetivos_alcancados": ["string"],
  "objetivos_nao_alcancados": ["string"],
  "tecnicas_identificadas_contraparte": ["string"],
  "sinais_verbais": ["string"],
  "sinais_nao_verbais": ["string"],
  "black_swans_descobertos": ["string"],
  "mudanca_posicao": "string",
  "ajuste_estrategia": "string",
  "proximos_passos": ["string"],
  "licoes_aprendidas": ["string"]
}`

    case "weekly_report":
      return `Gere um relatorio semanal desta negociacao.

CONTEXTO:
${context}

${jsonInstruction}
Formato:
{
  "periodo": "string",
  "resumo_executivo": "string",
  "eventos_semana": [{ "data": "string", "tipo": "string", "resumo": "string" }],
  "progresso": { "health_score": number, "variacao": number, "tendencia": "string" },
  "valores": { "proposta_atual": number | null, "pedido_credor": number | null, "gap": number | null, "gap_pct": number | null },
  "destaques_positivos": ["string"],
  "alertas": ["string"],
  "proximos_passos": ["string"],
  "recomendacoes": ["string"]
}`

    case "vote_predict":
      return `Preveja o comportamento de voto deste credor em assembleia de credores.

CONTEXTO:
${context}

${jsonInstruction}
Formato:
{
  "previsao_voto": "APROVACAO" | "REJEICAO" | "ABSTENCAO" | "INCERTO",
  "confianca": number (0.0-1.0),
  "fatores_aprovacao": ["string"],
  "fatores_rejeicao": ["string"],
  "influencia_outros_credores": "string",
  "condicoes_para_mudanca": ["string"],
  "impacto_no_quorum": "string",
  "recomendacao": "string"
}`

    case "email_script":
      return `Gere um roteiro/rascunho de e-mail para esta negociacao.

CONTEXTO:
${context}

${data?.objetivo_email ? `OBJETIVO DO EMAIL: ${data.objetivo_email}` : "Gere um e-mail adequado a fase atual da negociacao."}
${data?.tom ? `TOM DESEJADO: ${data.tom}` : ""}

${jsonInstruction}
Formato:
{
  "assunto": "string",
  "corpo": "string (texto completo do e-mail em portugues formal)",
  "tecnicas_utilizadas": ["string"],
  "notas_internas": "string (observacoes para o advogado, NAO enviar ao credor)",
  "alternativas": [{
    "assunto": "string",
    "abordagem": "string",
    "tom": "string"
  }]
}`

    case "meeting_script":
      return `Gere um roteiro detalhado para reuniao de negociacao.

CONTEXTO:
${context}

${data?.tipo_reuniao ? `TIPO: ${data.tipo_reuniao}` : ""}
${data?.duracao_estimada ? `DURACAO: ${data.duracao_estimada}` : ""}
${data?.participantes ? `PARTICIPANTES: ${JSON.stringify(data.participantes)}` : ""}

Considere tecnicas de Chris Voss, Harvard e Camp.

${jsonInstruction}
Formato:
{
  "titulo_reuniao": "string",
  "objetivo": "string",
  "duracao_sugerida": "string",
  "abertura": {
    "duracao": "string",
    "fala_inicial": "string",
    "tom": "string",
    "tecnica": "string"
  },
  "fases": [{
    "titulo": "string",
    "duracao": "string",
    "objetivo": "string",
    "perguntas": ["string"],
    "tecnicas": ["string"],
    "observar": ["string"],
    "se_resistencia": "string"
  }],
  "fechamento": {
    "resumo_pontos": "string",
    "proximos_passos": "string",
    "frase_final": "string"
  },
  "plano_b": {
    "se_impasse": "string",
    "se_hostilidade": "string",
    "se_surpresa": "string"
  }
}`

    case "smart_suggest":
      return `Com base no estado atual desta negociacao, sugira as 3-5 melhores acoes a tomar agora.

CONTEXTO:
${context}

${jsonInstruction}
Formato:
{
  "sugestoes": [{
    "acao": "string",
    "justificativa": "string",
    "framework": "string",
    "urgencia": "IMEDIATA" | "ESTA_SEMANA" | "PROXIMO_CICLO",
    "impacto_estimado": "ALTO" | "MEDIO" | "BAIXO",
    "tipo_acao": "COMUNICACAO" | "ANALISE" | "PROPOSTA" | "CONCESSAO" | "ESPERAR" | "ESCALAR"
  }],
  "nao_fazer": ["string (acoes a evitar neste momento)"],
  "insight_geral": "string"
}`

    default:
      return `Analise a seguinte negociacao e forneça insights estratégicos.

CONTEXTO:
${context}

${jsonInstruction}
Formato:
{
  "analise": "string",
  "recomendacoes": ["string"],
  "riscos": ["string"],
  "oportunidades": ["string"]
}`
  }
}

// ---------------------------------------------------------------------------
// POST handler — Non-streaming analysis endpoint
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { type, negotiationId, eventId, data } = body

  if (!negotiationId) {
    return Response.json(
      { success: false, error: "negotiationId is required" },
      { status: 400 }
    )
  }

  if (!type || !VALID_TYPES.has(type)) {
    return Response.json(
      { success: false, error: `Invalid type. Valid types: ${[...VALID_TYPES].join(", ")}` },
      { status: 400 }
    )
  }

  const startTime = Date.now()

  // Select model: premium for complex analyses, standard for the rest
  const config: ModelConfig = PREMIUM_ANALYSIS_TYPES.has(type)
    ? MODEL_CONFIGS.premium
    : MODEL_CONFIGS.standard

  // Load negotiation with all relations
  const negotiation = await db.stratNegotiation.findUnique({
    where: { id: negotiationId },
    include: NEGOTIATION_INCLUDE,
  })

  if (!negotiation) {
    return Response.json(
      { success: false, error: "Negotiation not found" },
      { status: 404 }
    )
  }

  // Load event if needed
  let event = null
  if (type === "event" && eventId) {
    event = await db.stratNegEvent.findUnique({
      where: { id: eventId },
    })
    if (!event) {
      return Response.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      )
    }
  }

  // For cross_insights, load other negotiations from the same case/JRC
  let enrichedData = data || {}
  if (type === "cross_insights" && (negotiation.case_id || negotiation.jrc_id)) {
    const otherNegs = await db.stratNegotiation.findMany({
      where: {
        id: { not: negotiationId },
        OR: [
          ...(negotiation.case_id ? [{ case_id: negotiation.case_id }] : []),
          ...(negotiation.jrc_id ? [{ jrc_id: negotiation.jrc_id }] : []),
        ],
      },
      select: {
        id: true,
        titulo: true,
        codigo: true,
        fase: true,
        status: true,
        valor_credito: true,
        valor_proposta_atual: true,
        valor_pedido_credor: true,
        haircut_percentual: true,
        health_score: true,
        probability_acordo: true,
        person: { select: { nome: true } },
        rj_creditor: { select: { nome: true, classe: true } },
      },
      take: 20,
    })
    enrichedData = { ...enrichedData, other_negotiations: otherNegs }
  }

  // Build the prompt
  // Try the dedicated prompt builders first, then fall back to inline
  let prompt: string
  const dedicatedBuilder = promptBuilders[`buildNeg${type.charAt(0).toUpperCase() + type.slice(1)}Prompt`]
    ?? promptBuilders[`buildNegAnalysis_${type}`]
    ?? promptBuilders[`build_${type}_prompt`]

  if (dedicatedBuilder) {
    prompt = dedicatedBuilder(negotiation, { event, data: enrichedData })
  } else {
    prompt = getPromptForType(type, negotiation, event, enrichedData)
  }

  // Call AI
  try {
    const aiResult = await generateText({
      model: anthropic(config.model),
      prompt,
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
      ...(PREMIUM_ANALYSIS_TYPES.has(type) && MODEL_CONFIGS.premium.thinking
        ? {
            providerOptions: {
              anthropic: { thinking: MODEL_CONFIGS.premium.thinking },
            },
          }
        : {}),
    })

    const responseText = aiResult.text
    const parsed = extractJSON(responseText)

    if (!parsed) {
      return Response.json({
        success: false,
        error: "Failed to parse AI response as JSON",
        raw: responseText.substring(0, 2000),
      })
    }

    // ---------------------------------------------------------------------------
    // Post-processing: update DB based on analysis type
    // ---------------------------------------------------------------------------

    // EVENT: update the StratNegEvent with sentiment and techniques
    if (type === "event" && eventId && parsed) {
      await db.stratNegEvent.update({
        where: { id: eventId },
        data: {
          sentimento: parsed.sentimento || undefined,
          tecnicas_usadas: parsed.tecnicas_usadas || undefined,
          insights: parsed.insights || undefined,
        },
      }).catch(() => {}) // non-critical
    }

    // HEALTH_SCORE: update the StratNegotiation
    if (type === "health_score" && parsed) {
      await db.stratNegotiation.update({
        where: { id: negotiationId },
        data: {
          health_score: typeof parsed.health_score === "number" ? parsed.health_score : undefined,
          health_score_details: parsed.health_score_details || undefined,
          probability_acordo: typeof parsed.probability_acordo === "number" ? parsed.probability_acordo : undefined,
          haircut_estimado_min: typeof parsed.haircut_estimado_min === "number" ? parsed.haircut_estimado_min : undefined,
          haircut_estimado_max: typeof parsed.haircut_estimado_max === "number" ? parsed.haircut_estimado_max : undefined,
          tempo_estimado_dias: typeof parsed.tempo_estimado_dias === "number" ? parsed.tempo_estimado_dias : undefined,
          ai_proxima_acao: parsed.proxima_acao || undefined,
          ai_last_analysis: new Date(),
        },
      }).catch(() => {}) // non-critical
    }

    // INITIAL: update StratNegotiation with TKI profile, interests, etc.
    if (type === "initial" && parsed) {
      await db.stratNegotiation.update({
        where: { id: negotiationId },
        data: {
          tki_perfil_credor: parsed.tki_perfil_credor || undefined,
          tki_assertividade: typeof parsed.tki_assertividade === "number" ? parsed.tki_assertividade : undefined,
          tki_cooperatividade: typeof parsed.tki_cooperatividade === "number" ? parsed.tki_cooperatividade : undefined,
          tki_estrategia_recomendada: parsed.tki_estrategia_recomendada || undefined,
          interesses_devedor: parsed.interesses_devedor_estimados || undefined,
          interesses_credor: parsed.interesses_credor_estimados || undefined,
          batna_devedor: parsed.batna_devedor_estimada || undefined,
          batna_credor: parsed.batna_credor_estimada || undefined,
          zopa_min: parsed.zopa_estimada?.min != null ? BigInt(Math.round(parsed.zopa_estimada.min)) : undefined,
          zopa_max: parsed.zopa_estimada?.max != null ? BigInt(Math.round(parsed.zopa_estimada.max)) : undefined,
          opcoes_criativas: parsed.opcoes_criativas || undefined,
          criterios_legitimidade: parsed.criterios_legitimidade || undefined,
          voss_tipo_negociador: parsed.voss_tipo_negociador || undefined,
          voss_calibrated_questions: parsed.voss_calibrated_questions || undefined,
          voss_black_swans: parsed.voss_black_swans || undefined,
          ai_last_analysis: new Date(),
        },
      }).catch(() => {}) // non-critical
    }

    // PLAYBOOK: store in ai_playbook field
    if (type === "playbook" && parsed) {
      await db.stratNegotiation.update({
        where: { id: negotiationId },
        data: {
          ai_playbook: parsed,
          ai_last_analysis: new Date(),
        },
      }).catch(() => {})
    }

    // Save AI insight to NegAIInsight table for most types
    const insightTypeMap: Record<string, string> = {
      event: "ANALISE",
      health_score: "ANALISE",
      proposal: "ANALISE",
      concession: "ANALISE",
      phase_transition: "SUGESTAO",
      initial: "ANALISE",
      cross_insights: "CROSS_NEG",
      playbook: "SUGESTAO",
      briefing: "BRIEFING",
      debriefing: "DEBRIEFING",
      weekly_report: "ANALISE",
      vote_predict: "ANALISE",
      email_script: "SUGESTAO",
      meeting_script: "SUGESTAO",
      smart_suggest: "SUGESTAO",
    }

    const insightTitle: Record<string, string> = {
      event: `Analise de evento${event?.tipo ? ` (${event.tipo})` : ""}`,
      health_score: `Health Score: ${parsed.health_score ?? "N/A"}/100`,
      proposal: "Analise de proposta",
      concession: "Analise de concessao",
      phase_transition: `Transicao de fase: ${parsed.fase_sugerida ?? "N/A"}`,
      initial: "Analise inicial da negociacao",
      cross_insights: "Insights cruzados entre negociacoes",
      playbook: "Playbook estrategico gerado",
      briefing: "Briefing de preparacao",
      debriefing: "Debriefing pos-interacao",
      weekly_report: "Relatorio semanal",
      vote_predict: `Previsao de voto: ${parsed.previsao_voto ?? "N/A"}`,
      email_script: "Roteiro de e-mail gerado",
      meeting_script: "Roteiro de reuniao gerado",
      smart_suggest: "Sugestoes inteligentes",
    }

    await db.negAIInsight.create({
      data: {
        negotiation_id: negotiationId,
        tipo: insightTypeMap[type] || "ANALISE",
        titulo: insightTitle[type] || `Analise: ${type}`,
        descricao: parsed.analise
          || parsed.resumo_executivo
          || parsed.resumo
          || parsed.insight_geral
          || parsed.insights
          || JSON.stringify(parsed).substring(0, 1000),
        detalhes: parsed,
        acao_sugerida: parsed.proxima_acao_sugerida
          || parsed.proxima_acao
          || parsed.recomendacao
          || (parsed.proximos_passos ? parsed.proximos_passos.join("; ") : null)
          || (parsed.recomendacoes ? parsed.recomendacoes.join("; ") : null)
          || (parsed.sugestoes ? parsed.sugestoes.map((s: any) => s.acao).join("; ") : null),
        framework: parsed.framework_relevante
          || parsed.estrategia_principal?.framework_primario
          || null,
        prioridade: type === "health_score" && parsed.health_score != null
          ? (parsed.health_score < 30 ? "CRITICA" : parsed.health_score < 50 ? "ALTA" : parsed.health_score < 70 ? "MEDIA" : "BAIXA")
          : null,
      },
    }).catch(() => {}) // non-critical

    // Log AI usage
    const usage = aiResult.usage
    const cost = estimateCost(
      config,
      usage.inputTokens ?? 0,
      usage.outputTokens ?? 0
    )
    await db.aIUsageLog.create({
      data: {
        userId: session.user.id,
        actionType: `neg_analyze_${type}`,
        model: config.model,
        tokensIn: usage.inputTokens ?? 0,
        tokensOut: usage.outputTokens ?? 0,
        durationMs: Date.now() - startTime,
        costEstimated: cost,
        negotiationId,
      },
    }).catch(() => {}) // non-critical

    return Response.json({
      success: true,
      type,
      data: parsed,
      model: config.model,
      tier: config.tier,
    })
  } catch (aiError) {
    console.error(`[NEG-ANALYZE] AI call failed for type="${type}":`, aiError)

    // Log the failed attempt
    await db.aIUsageLog.create({
      data: {
        userId: session.user.id,
        actionType: `neg_analyze_${type}_FAILED`,
        model: config.model,
        tokensIn: 0,
        tokensOut: 0,
        durationMs: Date.now() - startTime,
        costEstimated: 0,
        negotiationId,
      },
    }).catch(() => {})

    return Response.json({
      success: false,
      error: "Analise indisponivel no momento",
    })
  }
}
