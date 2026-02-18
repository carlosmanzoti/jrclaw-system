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
  "petition",
  "fraud_detection",
])

// ---------------------------------------------------------------------------
// All valid analysis types
// ---------------------------------------------------------------------------
const VALID_TYPES = new Set([
  "initial_analysis",
  "scoring",
  "strategy",
  "event_analysis",
  "fraud_detection",
  "penhorability",
  "petition",
  "investigation_plan",
  "portfolio",
])

// ---------------------------------------------------------------------------
// Recovery case data include (all relations for full context)
// ---------------------------------------------------------------------------
const RECOVERY_CASE_INCLUDE = {
  case_: {
    select: {
      id: true,
      numero_processo: true,
      tipo: true,
      status: true,
      vara: true,
      comarca: true,
      tribunal: true,
      uf: true,
      valor_causa: true,
      cliente: { select: { id: true, nome: true } },
    },
  },
  person: {
    select: {
      id: true,
      nome: true,
      cpf_cnpj: true,
      email: true,
      celular: true,
      cidade: true,
      estado: true,
      segmento: true,
    },
  },
  responsavel: { select: { id: true, name: true } },
  investigacoes: {
    orderBy: { created_at: "desc" as const },
    take: 5,
    include: {
      _count: { select: { buscas: true, bens: true } },
    },
  },
  bens: { orderBy: { created_at: "desc" as const }, take: 20 },
  acoes_cobranca: { orderBy: { created_at: "desc" as const }, take: 15 },
  penhoras: { orderBy: { created_at: "desc" as const }, take: 10 },
  acordos: { orderBy: { created_at: "desc" as const }, take: 5 },
  incidentes_desconsidera: { orderBy: { created_at: "desc" as const }, take: 5 },
  monitoramentos: { orderBy: { created_at: "desc" as const }, take: 5 },
  eventos: { orderBy: { data: "desc" as const }, take: 30 },
  devedores_solidarios: { orderBy: { created_at: "desc" as const }, take: 10 },
} as const

// ---------------------------------------------------------------------------
// Try to import the dedicated prompt builders
// ---------------------------------------------------------------------------
let RECOVERY_SCORING_PROMPT: string | null = null
let RECOVERY_STRATEGY_PROMPT: string | null = null
let RECOVERY_EVENT_ANALYSIS_PROMPT: string | null = null
let RECOVERY_FRAUD_DETECTION_PROMPT: string | null = null
let RECOVERY_INITIAL_ANALYSIS_PROMPT: string | null = null
let RECOVERY_PENHORABILITY_PROMPT: string | null = null
let RECOVERY_PETITION_PROMPT: string | null = null
let RECOVERY_INVESTIGATION_PLAN_PROMPT: string | null = null
let buildRecoveryCaseContextJSON: ((recoveryCase: any) => string) | null = null

try {
  const mod = require("@/lib/recovery-ai-prompts")
  RECOVERY_SCORING_PROMPT = mod.RECOVERY_SCORING_PROMPT ?? null
  RECOVERY_STRATEGY_PROMPT = mod.RECOVERY_STRATEGY_PROMPT ?? null
  RECOVERY_EVENT_ANALYSIS_PROMPT = mod.RECOVERY_EVENT_ANALYSIS_PROMPT ?? null
  RECOVERY_FRAUD_DETECTION_PROMPT = mod.RECOVERY_FRAUD_DETECTION_PROMPT ?? null
  RECOVERY_INITIAL_ANALYSIS_PROMPT = mod.RECOVERY_INITIAL_ANALYSIS_PROMPT ?? null
  RECOVERY_PENHORABILITY_PROMPT = mod.RECOVERY_PENHORABILITY_PROMPT ?? null
  RECOVERY_PETITION_PROMPT = mod.RECOVERY_PETITION_PROMPT ?? null
  RECOVERY_INVESTIGATION_PLAN_PROMPT = mod.RECOVERY_INVESTIGATION_PLAN_PROMPT ?? null
  if (typeof mod.buildRecoveryCaseContextJSON === "function") {
    buildRecoveryCaseContextJSON = mod.buildRecoveryCaseContextJSON
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
// Format money helper
// ---------------------------------------------------------------------------
function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "N/I"
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
}

// ---------------------------------------------------------------------------
// Build a concise recovery case context block for prompts
// ---------------------------------------------------------------------------
function buildFallbackCaseContext(rc: any): string {
  const lines: string[] = [
    `=== CASO DE RECUPERACAO DE CREDITO ===`,
    `Codigo: ${rc.codigo}`,
    `Titulo: ${rc.titulo}`,
    `Tipo: ${rc.tipo}`,
    `Fase: ${rc.fase}`,
    `Status: ${rc.status}`,
    `Prioridade: ${rc.prioridade}`,
    ``,
    `--- VALORES ---`,
    `Valor original: ${fmtMoney(rc.valor_original)}`,
    `Valor atualizado: ${fmtMoney(rc.valor_atualizado)}`,
    `Valor total execucao: ${fmtMoney(rc.valor_total_execucao)}`,
    `Valor recuperado: ${fmtMoney(rc.valor_recuperado)}`,
    `Valor bloqueado: ${fmtMoney(rc.valor_bloqueado)}`,
    `Valor penhorado: ${fmtMoney(rc.valor_penhorado)}`,
    `Percentual recuperado: ${rc.percentual_recuperado != null ? `${rc.percentual_recuperado}%` : "N/I"}`,
    `Score recuperacao: ${rc.score_recuperacao != null ? `${rc.score_recuperacao}/100` : "N/I"}`,
  ]

  // Debtor info
  if (rc.devedor_nome || rc.person?.nome) {
    lines.push(``)
    lines.push(`--- DEVEDOR ---`)
    lines.push(`Nome: ${rc.devedor_nome || rc.person?.nome || "N/I"}`)
    lines.push(`CPF/CNPJ: ${rc.devedor_cpf_cnpj || rc.person?.cpf_cnpj || "N/I"}`)
    lines.push(`Tipo: ${rc.devedor_tipo || "N/I"}`)
    if (rc.devedor_atividade) lines.push(`Atividade: ${rc.devedor_atividade}`)
    if (rc.person?.cidade) lines.push(`Cidade: ${rc.person.cidade}/${rc.person.estado}`)
    if (rc.person?.segmento) lines.push(`Segmento: ${rc.person.segmento}`)
  }

  // Title
  if (rc.titulo_tipo) {
    lines.push(``)
    lines.push(`--- TITULO EXECUTIVO ---`)
    lines.push(`Tipo: ${rc.titulo_tipo}`)
    if (rc.titulo_numero) lines.push(`Numero: ${rc.titulo_numero}`)
    if (rc.titulo_data_vencimento) lines.push(`Vencimento: ${new Date(rc.titulo_data_vencimento).toLocaleDateString("pt-BR")}`)
    if (rc.titulo_data_prescricao) lines.push(`Prescricao: ${new Date(rc.titulo_data_prescricao).toLocaleDateString("pt-BR")}`)
  }

  // Linked case
  if (rc.case_?.numero_processo) {
    lines.push(``)
    lines.push(`--- PROCESSO JUDICIAL ---`)
    lines.push(`Numero: ${rc.case_.numero_processo}`)
    lines.push(`Vara: ${rc.case_.vara || "N/I"} | Comarca: ${rc.case_.comarca || "N/I"} | Tribunal: ${rc.case_.tribunal || "N/I"}`)
    if (rc.case_.cliente?.nome) lines.push(`Cliente: ${rc.case_.cliente.nome}`)
  }

  // Risk info
  if (rc.risco_prescricao || rc.risco_insolvencia) {
    lines.push(``)
    lines.push(`--- RISCOS ---`)
    if (rc.risco_prescricao) lines.push(`Risco prescricao: ${rc.risco_prescricao}`)
    if (rc.risco_insolvencia) lines.push(`Risco insolvencia: ${rc.risco_insolvencia}`)
  }

  // Dates
  lines.push(``)
  lines.push(`--- DATAS ---`)
  if (rc.data_constituicao) lines.push(`Constituicao: ${new Date(rc.data_constituicao).toLocaleDateString("pt-BR")}`)
  if (rc.data_vencimento) lines.push(`Vencimento: ${new Date(rc.data_vencimento).toLocaleDateString("pt-BR")}`)
  if (rc.data_distribuicao) lines.push(`Distribuicao: ${new Date(rc.data_distribuicao).toLocaleDateString("pt-BR")}`)
  if (rc.data_citacao) lines.push(`Citacao: ${new Date(rc.data_citacao).toLocaleDateString("pt-BR")}`)
  if (rc.data_penhora) lines.push(`Penhora: ${new Date(rc.data_penhora).toLocaleDateString("pt-BR")}`)
  if (rc.data_proxima_acao) lines.push(`Proxima acao: ${new Date(rc.data_proxima_acao).toLocaleDateString("pt-BR")} — ${rc.proxima_acao || ""}`)

  // Assets found
  if (rc.bens?.length > 0) {
    lines.push(``)
    lines.push(`--- BENS ENCONTRADOS (${rc.bens.length}) ---`)
    for (const b of rc.bens) {
      lines.push(`- [${b.tipo}] ${b.descricao} | Valor est.: ${fmtMoney(b.valor_estimado)} | Status: ${b.status} | Penhoravel: ${b.penhoravel ? "Sim" : "Nao"}${b.titular_nome ? ` | Titular: ${b.titular_nome} (${b.titular_relacao || "N/I"})` : ""}`)
    }
  }

  // Penhoras
  if (rc.penhoras?.length > 0) {
    lines.push(``)
    lines.push(`--- PENHORAS (${rc.penhoras.length}) ---`)
    for (const p of rc.penhoras) {
      lines.push(`- [${p.tipo}] ${fmtMoney(p.valor_solicitado)} solicitado / ${fmtMoney(p.valor_efetivado)} efetivado | Status: ${p.status}${p.data_efetivacao ? ` | Efetivada: ${new Date(p.data_efetivacao).toLocaleDateString("pt-BR")}` : ""}`)
    }
  }

  // Collection actions
  if (rc.acoes_cobranca?.length > 0) {
    lines.push(``)
    lines.push(`--- ACOES DE COBRANCA (${rc.acoes_cobranca.length}) ---`)
    for (const a of rc.acoes_cobranca.slice(0, 10)) {
      lines.push(`- [${a.tipo}/${a.categoria}] ${new Date(a.data_acao).toLocaleDateString("pt-BR")}: ${a.descricao?.substring(0, 200)} | Status: ${a.status}${a.valor_envolvido ? ` | Valor: ${fmtMoney(a.valor_envolvido)}` : ""}`)
    }
  }

  // Investigations
  if (rc.investigacoes?.length > 0) {
    lines.push(``)
    lines.push(`--- INVESTIGACOES PATRIMONIAIS (${rc.investigacoes.length}) ---`)
    for (const inv of rc.investigacoes) {
      lines.push(`- [${inv.tipo}] ${inv.codigo} | Status: ${inv.status} | Fase: ${inv.fase} | Bens: ${inv._count?.bens ?? 0} | Buscas: ${inv._count?.buscas ?? 0}`)
    }
  }

  // Agreements
  if (rc.acordos?.length > 0) {
    lines.push(``)
    lines.push(`--- ACORDOS (${rc.acordos.length}) ---`)
    for (const ac of rc.acordos) {
      lines.push(`- [${ac.tipo}] Divida: ${fmtMoney(ac.valor_divida_original)} | Acordo: ${fmtMoney(ac.valor_acordo)} | Desconto: ${ac.desconto_percentual ?? 0}% | Parcelas: ${ac.parcelas ?? 1} | Pagas: ${ac.parcelas_pagas ?? 0} | Status: ${ac.status}`)
    }
  }

  // Joint debtors
  if (rc.devedores_solidarios?.length > 0) {
    lines.push(``)
    lines.push(`--- DEVEDORES SOLIDARIOS (${rc.devedores_solidarios.length}) ---`)
    for (const d of rc.devedores_solidarios) {
      lines.push(`- ${d.nome} (${d.cpf_cnpj || "N/I"}) | Tipo: ${d.tipo_responsabilidade} | Status: ${d.status}`)
    }
  }

  // Desconsideracao incidents
  if (rc.incidentes_desconsidera?.length > 0) {
    lines.push(``)
    lines.push(`--- INCIDENTES DE DESCONSIDERACAO (${rc.incidentes_desconsidera.length}) ---`)
    for (const inc of rc.incidentes_desconsidera) {
      lines.push(`- [${inc.tipo}/${inc.teoria}] Hipotese: ${inc.hipotese} | Status: ${inc.status}`)
    }
  }

  // Events
  if (rc.eventos?.length > 0) {
    lines.push(``)
    lines.push(`--- ULTIMOS EVENTOS (${rc.eventos.length}) ---`)
    for (const e of rc.eventos.slice(0, 20)) {
      const dt = new Date(e.data).toLocaleDateString("pt-BR")
      lines.push(`- [${e.tipo}] ${dt}: ${e.descricao?.substring(0, 300)}${e.sentimento ? ` (sentimento: ${e.sentimento})` : ""}`)
    }
  }

  // Strategy
  if (rc.estrategia_ia) {
    lines.push(``)
    lines.push(`--- ESTRATEGIA IA ANTERIOR ---`)
    lines.push(rc.estrategia_ia.substring(0, 2000))
  }

  if (rc.observacoes) {
    lines.push(``)
    lines.push(`--- OBSERVACOES ---`)
    lines.push(rc.observacoes.substring(0, 1000))
  }

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Fallback prompt builders per analysis type
// ---------------------------------------------------------------------------
function getPromptForType(
  type: string,
  recoveryCase: any,
  event?: any,
  data?: any
): string {
  const context = buildRecoveryCaseContextJSON
    ? buildRecoveryCaseContextJSON(recoveryCase)
    : buildFallbackCaseContext(recoveryCase)

  const jsonInstruction = "Responda EXCLUSIVAMENTE em JSON valido (sem texto adicional fora do JSON). Use UTF-8."

  switch (type) {
    case "initial_analysis":
      return `${RECOVERY_INITIAL_ANALYSIS_PROMPT || `Voce e um advogado especialista em recuperacao de credito, execucao civil e investigacao patrimonial no Brasil.
Faca uma analise inicial completa deste caso de recuperacao de credito.

CONTEXTO DO CASO:
${context}

Considere:
- Qualidade do titulo executivo e pressupostos de exigibilidade
- Perfil do devedor e capacidade de pagamento
- Patrimonio identificado e possibilidade de constrição
- Riscos processuais (prescricao, embargos, nulidades)
- Estrategia recomendada (extrajudicial vs judicial, tipo de acao)
- Timeline estimada para recuperacao
- Score de recuperacao (0-100) baseado em fatores objetivos

${jsonInstruction}
Formato:
{
  "score_recuperacao": number (0-100),
  "score_fatores": {
    "titulo_executivo": { "score": number, "peso": number, "justificativa": "string" },
    "patrimonio_devedor": { "score": number, "peso": number, "justificativa": "string" },
    "perfil_devedor": { "score": number, "peso": number, "justificativa": "string" },
    "risco_processual": { "score": number, "peso": number, "justificativa": "string" },
    "historico_pagamento": { "score": number, "peso": number, "justificativa": "string" },
    "tempo_credito": { "score": number, "peso": number, "justificativa": "string" }
  },
  "estrategia_recomendada": "string (descricao detalhada)",
  "via_principal": "EXTRAJUDICIAL" | "JUDICIAL",
  "tipo_acao_recomendada": "string",
  "riscos": [{ "risco": "string", "probabilidade": "ALTA" | "MEDIA" | "BAIXA", "mitigacao": "string" }],
  "oportunidades": ["string"],
  "timeline": [{ "fase": "string", "descricao": "string", "prazo_estimado_dias": number }],
  "proximos_passos": ["string"],
  "valor_recuperavel_estimado": number | null,
  "probabilidade_recuperacao": number (0.0-1.0),
  "alertas_urgentes": ["string"]
}`}

${RECOVERY_INITIAL_ANALYSIS_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "scoring":
      return `${RECOVERY_SCORING_PROMPT || `Voce e um analista especialista em recuperacao de credito. Calcule o score de recuperacao (0-100) deste caso.

CONTEXTO DO CASO:
${context}

Avalie de 0 a 100 considerando os seguintes fatores e pesos:
- Titulo executivo (solidez, exigibilidade, liquidez) — peso 20%
- Patrimonio do devedor (bens localizados, valor, liquidez, penhorabilidade) — peso 25%
- Perfil do devedor (tipo PF/PJ, atividade, historico) — peso 15%
- Risco processual (prescricao, defesas possiveis, complexidade) — peso 15%
- Historico de pagamento (inadimplencia, protestos, negativacoes) — peso 10%
- Tempo do credito (antiguidade, atualizacao, fase) — peso 15%

${jsonInstruction}
Formato:
{
  "score_recuperacao": number (0-100),
  "score_fatores": {
    "titulo_executivo": { "score": number (0-100), "peso": 20, "justificativa": "string" },
    "patrimonio_devedor": { "score": number (0-100), "peso": 25, "justificativa": "string" },
    "perfil_devedor": { "score": number (0-100), "peso": 15, "justificativa": "string" },
    "risco_processual": { "score": number (0-100), "peso": 15, "justificativa": "string" },
    "historico_pagamento": { "score": number (0-100), "peso": 10, "justificativa": "string" },
    "tempo_credito": { "score": number (0-100), "peso": 15, "justificativa": "string" }
  },
  "classificacao": "EXCELENTE" | "BOM" | "MODERADO" | "DIFICIL" | "CRITICO",
  "tendencia": "MELHORANDO" | "ESTAVEL" | "PIORANDO",
  "valor_recuperavel_estimado": number | null,
  "probabilidade_recuperacao": number (0.0-1.0),
  "recomendacao_resumida": "string"
}`}

${RECOVERY_SCORING_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "strategy":
      return `${RECOVERY_STRATEGY_PROMPT || `Voce e um advogado estrategista especialista em recuperacao de credito no Brasil.
Gere uma recomendacao estrategica completa para este caso.

CONTEXTO DO CASO:
${context}

Considere as seguintes vertentes estrategicas:
1. Via extrajudicial (notificacao, protesto, negativacao, mediacao, acordo)
2. Via judicial (execucao, monitoria, busca e apreensao, cumprimento de sentenca)
3. Investigacao patrimonial (SISBAJUD, RENAJUD, CNIB, INFOJUD, OSINT)
4. Medidas constritivas (penhora online, penhora de imoveis, arresto, sequestro)
5. Desconsideracao da personalidade juridica (se aplicavel)
6. Medidas expropriatorias (avaliacao, leilao, adjudicacao)
7. Acordo (parcelamento, dacao em pagamento, desconto)

${jsonInstruction}
Formato:
{
  "estrategia_principal": "string (descricao da estrategia geral)",
  "vertentes": [{
    "vertente": "string",
    "prioridade": "IMEDIATA" | "CURTO_PRAZO" | "MEDIO_PRAZO" | "LONGO_PRAZO",
    "descricao": "string",
    "acoes": ["string"],
    "custo_estimado": number | null,
    "tempo_estimado_dias": number | null,
    "probabilidade_sucesso": number (0.0-1.0)
  }],
  "cenarios": [{
    "cenario": "OTIMISTA" | "REALISTA" | "PESSIMISTA",
    "descricao": "string",
    "valor_recuperavel": number | null,
    "prazo_estimado_meses": number,
    "probabilidade": number (0.0-1.0)
  }],
  "riscos_estrategicos": [{ "risco": "string", "mitigacao": "string" }],
  "proximos_passos_imediatos": ["string"],
  "metricas_acompanhamento": ["string"]
}`}

${RECOVERY_STRATEGY_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "event_analysis":
      return `${RECOVERY_EVENT_ANALYSIS_PROMPT || `Voce e um analista de recuperacao de credito. Analise o seguinte evento e seus impactos no caso.

CONTEXTO DO CASO:
${context}

EVENTO A ANALISAR:
Tipo: ${event?.tipo || "N/I"}
Data: ${event?.data ? new Date(event.data).toLocaleDateString("pt-BR") : "N/I"}
Descricao: ${event?.descricao || "N/I"}
Valor mencionado: ${event?.valor_mencionado ? fmtMoney(event.valor_mencionado) : "N/A"}

${jsonInstruction}
Formato:
{
  "analise": "string (analise detalhada do evento e suas implicacoes)",
  "sentimento": "POSITIVO" | "NEUTRO" | "NEGATIVO",
  "impacto_no_caso": "ALTO" | "MEDIO" | "BAIXO",
  "impacto_no_score": number (-20 a +20, ajuste sugerido),
  "riscos_gerados": ["string"],
  "oportunidades_geradas": ["string"],
  "acao_recomendada": "string",
  "urgencia": "IMEDIATA" | "ESTA_SEMANA" | "PROXIMO_MES" | "MONITORAR",
  "alertas": ["string"]
}`}

${RECOVERY_EVENT_ANALYSIS_PROMPT ? `\nCONTEXTO DO CASO:\n${context}\n\nEVENTO:\nTipo: ${event?.tipo}\nData: ${event?.data ? new Date(event.data).toLocaleDateString("pt-BR") : "N/I"}\nDescricao: ${event?.descricao}` : ""}`

    case "fraud_detection":
      return `${RECOVERY_FRAUD_DETECTION_PROMPT || `Voce e um perito em fraude contra credores, fraude a execucao e ocultacao patrimonial no Brasil.
Analise o caso abaixo em busca de indicios de fraude, dissimulacao ou ocultacao patrimonial.

CONTEXTO DO CASO:
${context}

${data?.red_flags ? `RED FLAGS JA IDENTIFICADAS:\n${JSON.stringify(data.red_flags)}` : ""}

Analise especificamente:
1. Fraude contra credores (art. 158-165 CC) — alienacoes gratuitas/onerosas em prejuizo de credores
2. Fraude a execucao (art. 792 CPC) — alienacao/oneracão de bens apos distribuicao da acao
3. Ocultacao patrimonial — uso de interpostas pessoas ("laranjas"), offshores, trusts
4. Confusao patrimonial — mistura entre patrimonio da PJ e socios
5. Desvio de finalidade — uso da PJ para fins diversos do objeto social
6. Grupo economico de fato — empresas controladas para diluir patrimonio
7. Insolvencia fraudulenta — simulacao de insolvencia

${jsonInstruction}
Formato:
{
  "score_fraude": number (0-100, probabilidade de haver fraude),
  "indicios_encontrados": [{
    "tipo": "FRAUDE_CREDORES" | "FRAUDE_EXECUCAO" | "OCULTACAO" | "CONFUSAO_PATRIMONIAL" | "DESVIO_FINALIDADE" | "GRUPO_ECONOMICO" | "INSOLVENCIA_FRAUDULENTA",
    "descricao": "string",
    "evidencias": ["string"],
    "gravidade": "ALTA" | "MEDIA" | "BAIXA",
    "fundamentacao_legal": "string"
  }],
  "red_flags": ["string"],
  "medidas_recomendadas": [{
    "medida": "string",
    "tipo": "JUDICIAL" | "INVESTIGATIVA" | "CAUTELAR",
    "urgencia": "IMEDIATA" | "CURTO_PRAZO" | "MEDIO_PRAZO",
    "fundamentacao": "string"
  }],
  "investigacoes_complementares": ["string"],
  "risco_desconsideracao": "ALTO" | "MEDIO" | "BAIXO",
  "fundamentacao_desconsideracao": "string" | null,
  "resumo_executivo": "string"
}`}

${RECOVERY_FRAUD_DETECTION_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "penhorability":
      return `${RECOVERY_PENHORABILITY_PROMPT || `Voce e um especialista em direito processual civil brasileiro, especialmente em penhora e impenhorabilidade.
Analise a penhorabilidade do(s) bem(ns) abaixo conforme a legislacao brasileira (CPC, Lei 8.009/90, etc.).

CONTEXTO DO CASO:
${context}

${data?.asset ? `BEM A ANALISAR:\n${JSON.stringify(data.asset)}` : "Analise todos os bens listados no contexto."}

Considere:
- Art. 833 do CPC (bens impenhorsveis)
- Lei 8.009/90 (bem de familia)
- Jurisprudencia do STJ sobre o tema
- Excecoes a impenhorabilidade (divida do proprio bem, fianca em locacao, etc.)
- Possibilidade de penhora parcial
- Ordem de preferencia (art. 835 CPC)

${jsonInstruction}
Formato:
{
  "analise_bens": [{
    "bem": "string (identificacao)",
    "tipo": "string",
    "penhoravel": boolean,
    "fundamentacao": "string",
    "excecoes_aplicaveis": ["string"],
    "risco_impugnacao": "ALTO" | "MEDIO" | "BAIXO",
    "valor_penhoravel": number | null,
    "observacoes": "string"
  }],
  "ordem_preferencia": ["string (bens na ordem que devem ser penhorados)"],
  "valor_total_penhoravel": number | null,
  "estrategia_penhora": "string",
  "alertas": ["string"]
}`}

${RECOVERY_PENHORABILITY_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "petition":
      return `${RECOVERY_PETITION_PROMPT || `Voce e um advogado especialista em execucao civil e recuperacao de credito. Gere uma peca processual conforme solicitado.

CONTEXTO DO CASO:
${context}

${data?.tipo_peticao ? `TIPO DE PETICAO SOLICITADA: ${data.tipo_peticao}` : "Gere a peticao mais adequada para a fase atual do caso."}
${data?.instrucoes ? `INSTRUCOES ADICIONAIS: ${data.instrucoes}` : ""}

A peticao deve ser:
- Formatada conforme pratica forense brasileira
- Com fundamentacao legal adequada (CPC, CC, legislacao especifica)
- Com jurisprudencia relevante do STJ e dos TJs estaduais
- Com pedidos claros e bem fundamentados
- Em portugues formal juridico

${jsonInstruction}
Formato:
{
  "tipo_peticao": "string",
  "titulo": "string",
  "enderecamento": "string",
  "qualificacao_partes": "string",
  "dos_fatos": "string",
  "do_direito": "string",
  "jurisprudencia": [{ "tribunal": "string", "ementa_resumida": "string" }],
  "dos_pedidos": ["string"],
  "fechamento": "string",
  "requer": ["string"],
  "peticao_completa": "string (texto integral formatado)",
  "observacoes_advogado": "string (notas internas, NAO incluir na peticao)"
}`}

${RECOVERY_PETITION_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "investigation_plan":
      return `${RECOVERY_INVESTIGATION_PLAN_PROMPT || `Voce e um especialista em investigacao patrimonial e inteligencia financeira.
Gere um plano completo de investigacao patrimonial para este devedor.

CONTEXTO DO CASO:
${context}

Considere os seguintes sistemas e fontes de informacao disponiveis no Brasil:
- SISBAJUD (Sistema de Busca de Ativos do Poder Judiciario) — contas, aplicacoes, previdencia
- RENAJUD — veiculos
- INFOJUD — informacoes da Receita Federal (IRPF, IRPJ)
- SNIPER — Secretaria Nacional de Politicas sobre Drogas (ativos ilicitos)
- CNIB — Central de Indisponibilidade de Bens
- CRI — Cartorio de Registro de Imoveis
- ARISP — Associacao dos Registradores de SP
- JUNTA COMERCIAL — participacoes societarias
- DETRAN — veiculos estadual
- SERASA/BOA VISTA — score, protestos, acoes
- NEOWAY — inteligencia de dados corporativos
- CNIS/INSS — vinculos empregatícios
- CCS/BACEN — Cadastro de Clientes do Sistema Financeiro
- CENSEC — Central Notarial de Servicos Eletronicos Compartilhados
- OSINT — fontes abertas (redes sociais, Google, etc.)

${jsonInstruction}
Formato:
{
  "plano_titulo": "string",
  "objetivo": "string",
  "devedor_alvo": "string",
  "cpf_cnpj": "string",
  "fases": [{
    "fase": number,
    "titulo": "string",
    "descricao": "string",
    "buscas": [{
      "sistema": "string",
      "tipo_consulta": "string",
      "justificativa": "string",
      "custo_estimado": number | null,
      "prazo_resposta_dias": number,
      "requisitos": "string" | null
    }],
    "prazo_estimado_dias": number
  }],
  "pessoas_investigar": [{
    "nome": "string",
    "relacao": "string",
    "justificativa": "string"
  }],
  "hipoteses_patrimoniais": ["string"],
  "red_flags_buscar": ["string"],
  "custo_total_estimado": number | null,
  "prazo_total_estimado_dias": number,
  "prioridades": ["string"]
}`}

${RECOVERY_INVESTIGATION_PLAN_PROMPT ? `\nCONTEXTO DO CASO:\n${context}` : ""}`

    case "portfolio":
      return `Analise o portfolio/carteira de casos de recuperacao de credito e forneça insights estrategicos.

${data?.portfolio_summary ? `RESUMO DA CARTEIRA:\n${JSON.stringify(data.portfolio_summary)}` : `CASO INDIVIDUAL:\n${context}`}

${jsonInstruction}
Formato:
{
  "resumo_executivo": "string",
  "total_em_recuperacao": number | null,
  "taxa_recuperacao_media": number | null,
  "casos_criticos": ["string"],
  "oportunidades_imediatas": ["string"],
  "gargalos": ["string"],
  "recomendacoes_priorizacao": [{
    "caso": "string",
    "acao": "string",
    "impacto_estimado": number | null,
    "urgencia": "IMEDIATA" | "ESTA_SEMANA" | "ESTE_MES"
  }],
  "metricas_sugeridas": ["string"],
  "tendencias": ["string"]
}`

    default:
      return `Analise o seguinte caso de recuperacao de credito e forneça insights.

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
  const { type, recoveryCaseId, eventId, data } = body

  if (!recoveryCaseId) {
    return Response.json(
      { success: false, error: "recoveryCaseId is required" },
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

  // Load recovery case with all relations
  const recoveryCase = await db.creditRecoveryCase.findUnique({
    where: { id: recoveryCaseId },
    include: RECOVERY_CASE_INCLUDE,
  })

  if (!recoveryCase) {
    return Response.json(
      { success: false, error: "Recovery case not found" },
      { status: 404 }
    )
  }

  // Load event if needed
  let event = null
  if (type === "event_analysis" && eventId) {
    event = await db.recoveryEvent.findUnique({
      where: { id: eventId },
    })
    if (!event) {
      return Response.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      )
    }
  }

  // Build the prompt
  const prompt = getPromptForType(type, recoveryCase, event, data)

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

    // SCORING / INITIAL_ANALYSIS: update CreditRecoveryCase with score
    if ((type === "scoring" || type === "initial_analysis") && parsed) {
      const updateData: Record<string, unknown> = {}

      if (typeof parsed.score_recuperacao === "number") {
        updateData.score_recuperacao = parsed.score_recuperacao
      }
      if (parsed.score_fatores) {
        updateData.score_fatores = parsed.score_fatores
      }
      if (type === "initial_analysis" && parsed.estrategia_recomendada) {
        updateData.estrategia_ia = parsed.estrategia_recomendada
      }

      if (Object.keys(updateData).length > 0) {
        await db.creditRecoveryCase.update({
          where: { id: recoveryCaseId },
          data: updateData as never,
        }).catch(() => {}) // non-critical
      }
    }

    // STRATEGY: update CreditRecoveryCase with strategy
    if (type === "strategy" && parsed?.estrategia_principal) {
      await db.creditRecoveryCase.update({
        where: { id: recoveryCaseId },
        data: {
          estrategia_ia: parsed.estrategia_principal,
        },
      }).catch(() => {}) // non-critical
    }

    // EVENT_ANALYSIS: update the RecoveryEvent with AI analysis
    if (type === "event_analysis" && eventId && parsed) {
      await db.recoveryEvent.update({
        where: { id: eventId },
        data: {
          sentimento: parsed.sentimento || undefined,
          analise_ia: parsed.analise || undefined,
          acao_recomendada: parsed.acao_recomendada || undefined,
        },
      }).catch(() => {}) // non-critical
    }

    // Create a RecoveryEvent logging the AI analysis
    const eventTypeMap: Record<string, string> = {
      initial_analysis: "Analise inicial IA",
      scoring: `Score IA: ${parsed.score_recuperacao ?? "N/A"}/100`,
      strategy: "Estrategia IA gerada",
      event_analysis: "Analise de evento IA",
      fraud_detection: `Deteccao de fraude IA (score: ${parsed.score_fraude ?? "N/A"})`,
      penhorability: "Analise de penhorabilidade IA",
      petition: `Peticao gerada IA: ${parsed.tipo_peticao ?? ""}`,
      investigation_plan: "Plano de investigacao IA",
      portfolio: "Analise de portfolio IA",
    }

    await db.recoveryEvent.create({
      data: {
        recovery_case_id: recoveryCaseId,
        data: new Date(),
        tipo: "ALERTA_IA",
        descricao: eventTypeMap[type] || `Analise IA: ${type}`,
        analise_ia: JSON.stringify(parsed).substring(0, 5000),
        responsavel_id: session.user.id,
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
        actionType: `recovery_analyze_${type}`,
        model: config.model,
        tokensIn: usage.inputTokens ?? 0,
        tokensOut: usage.outputTokens ?? 0,
        durationMs: Date.now() - startTime,
        costEstimated: cost,
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
    console.error(`[RECOVERY-ANALYZE] AI call failed for type="${type}":`, aiError)

    // Log the failed attempt
    await db.aIUsageLog.create({
      data: {
        userId: session.user.id,
        actionType: `recovery_analyze_${type}_FAILED`,
        model: config.model,
        tokensIn: 0,
        tokensOut: 0,
        durationMs: Date.now() - startTime,
        costEstimated: 0,
      },
    }).catch(() => {})

    return Response.json({
      success: false,
      error: "Analise indisponivel no momento",
    })
  }
}
