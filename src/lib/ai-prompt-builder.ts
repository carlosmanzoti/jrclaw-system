import {
  SYSTEM_PROMPT_JURIDICO,
  METODO_REDACIONAL_JRCLAW,
  PROMPTS_POR_TIPO,
  type PromptContext,
} from "./ai-prompts"

interface ProcessoData {
  numero_processo?: string | null
  tipo?: string
  status?: string
  fase_processual?: string | null
  vara?: string | null
  comarca?: string | null
  tribunal?: string | null
  uf?: string | null
  valor_causa?: number | null
  valor_risco?: number | null
  cliente?: { nome: string; cpf_cnpj?: string | null } | null
  juiz?: { nome: string } | null
  partes?: Array<{ person: { nome: string }; role: string }>
  credores?: Array<{ person: { nome: string }; classe: string; valor_atualizado?: number | null }>
  tags?: string[]
}

interface ProjetoData {
  titulo?: string
  codigo?: string
  categoria?: string
  status?: string
  descricao?: string | null
  valor_envolvido?: number | null
  cliente?: { nome: string } | null
  documentos?: Array<{ titulo: string; tipo: string }>
}

interface BibliotecaEntry {
  titulo: string
  tipo: string
  area?: string | null
  resumo?: string | null
  conteudo?: string | null
  fonte?: string | null
  tags?: string[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

function buildProcessoContext(processo: ProcessoData): string {
  const lines: string[] = ["\n## DADOS DO PROCESSO VINCULADO\n"]

  if (processo.numero_processo) lines.push(`- **Número:** ${processo.numero_processo}`)
  if (processo.tipo) lines.push(`- **Tipo:** ${processo.tipo}`)
  if (processo.status) lines.push(`- **Status:** ${processo.status}`)
  if (processo.fase_processual) lines.push(`- **Fase processual:** ${processo.fase_processual}`)
  if (processo.vara) lines.push(`- **Vara:** ${processo.vara}`)
  if (processo.comarca) lines.push(`- **Comarca:** ${processo.comarca}`)
  if (processo.tribunal) lines.push(`- **Tribunal:** ${processo.tribunal}`)
  if (processo.uf) lines.push(`- **UF:** ${processo.uf}`)
  if (processo.valor_causa) lines.push(`- **Valor da causa:** ${formatCurrency(Number(processo.valor_causa))}`)
  if (processo.valor_risco) lines.push(`- **Valor de risco:** ${formatCurrency(Number(processo.valor_risco))}`)

  if (processo.cliente) {
    lines.push(`\n### Cliente`)
    lines.push(`- Nome: ${processo.cliente.nome}`)
    if (processo.cliente.cpf_cnpj) lines.push(`- CPF/CNPJ: ${processo.cliente.cpf_cnpj}`)
  }

  if (processo.juiz) {
    lines.push(`\n### Juiz`)
    lines.push(`- ${processo.juiz.nome}`)
  }

  if (processo.partes && processo.partes.length > 0) {
    lines.push(`\n### Partes`)
    for (const parte of processo.partes) {
      lines.push(`- ${parte.role}: ${parte.person.nome}`)
    }
  }

  if (processo.credores && processo.credores.length > 0) {
    lines.push(`\n### Quadro de Credores`)
    for (const credor of processo.credores) {
      const valor = credor.valor_atualizado ? ` — ${formatCurrency(Number(credor.valor_atualizado))}` : ""
      lines.push(`- ${credor.person.nome} (Classe ${credor.classe})${valor}`)
    }
  }

  if (processo.tags && processo.tags.length > 0) {
    lines.push(`\n- **Tags:** ${processo.tags.join(", ")}`)
  }

  return lines.join("\n")
}

function buildProjetoContext(projeto: ProjetoData): string {
  const lines: string[] = ["\n## DADOS DO PROJETO VINCULADO\n"]

  if (projeto.codigo) lines.push(`- **Código:** ${projeto.codigo}`)
  if (projeto.titulo) lines.push(`- **Título:** ${projeto.titulo}`)
  if (projeto.categoria) lines.push(`- **Categoria:** ${projeto.categoria}`)
  if (projeto.status) lines.push(`- **Status:** ${projeto.status}`)
  if (projeto.descricao) lines.push(`- **Descrição:** ${projeto.descricao}`)
  if (projeto.valor_envolvido) lines.push(`- **Valor envolvido:** ${formatCurrency(Number(projeto.valor_envolvido))}`)
  if (projeto.cliente) lines.push(`- **Cliente:** ${projeto.cliente.nome}`)

  if (projeto.documentos && projeto.documentos.length > 0) {
    lines.push(`\n### Documentos vinculados`)
    for (const doc of projeto.documentos) {
      lines.push(`- ${doc.titulo} (${doc.tipo})`)
    }
  }

  return lines.join("\n")
}

function buildBibliotecaContext(biblioteca: BibliotecaEntry[]): string {
  let ctx = `\n## BASE DE CONHECIMENTO DO ESCRITÓRIO\nReferências curadas — considerar na elaboração:\n\n`
  biblioteca.forEach((entry, i) => {
    ctx += `[${i + 1}] ${entry.titulo} (${entry.tipo}${entry.area ? `, ${entry.area}` : ""})\n`
    if (entry.resumo) ctx += `Resumo: ${entry.resumo}\n`
    if (entry.conteudo) ctx += `Conteúdo: ${entry.conteudo.substring(0, 1500)}...\n`
    if (entry.fonte) ctx += `Fonte: ${entry.fonte}\n`
    ctx += `\n`
  })
  return ctx
}

function buildUserConfig(context: PromptContext): string {
  let config = `\n## CONFIGURAÇÕES\n`
  config += `- Tom: ${context.tom}\n`
  config += `- Extensão: ${context.extensao}\n`
  config += `- Destinatário: ${context.destinatario}\n`
  config += `- Jurisprudência: ${context.incluirJurisprudencia ? "Sim" : "Não"}\n`
  config += `- Doutrina: ${context.incluirDoutrina ? "Sim" : "Não"}\n`

  if (context.tom === "combativo")
    config += `\nTom combativo: linguagem firme, vícios graves, urgência. Respeito formal mas incisividade.`
  else if (context.tom === "conciliatorio")
    config += `\nTom conciliatório: soluções consensuais, convergência, alternativas. Cooperação.`
  else if (context.tom === "didatico")
    config += `\nTom didático: conceitos claros, exemplos, acessibilidade a não-advogados.`

  if (context.extensao === "conciso") config += `\nConciso (1-3 páginas): direto, argumentos essenciais.`
  else if (context.extensao === "exaustivo")
    config += `\nExaustivo (15+ páginas): profundidade máxima, doutrina, todas as correntes.`

  return config
}

/**
 * Build the system prompt for chat mode (Layer 1 only + context)
 */
export function buildChatSystemPrompt(
  processo?: ProcessoData | null,
  projeto?: ProjetoData | null,
  biblioteca?: BibliotecaEntry[]
): string {
  const parts: string[] = [SYSTEM_PROMPT_JURIDICO]

  if (processo) parts.push(buildProcessoContext(processo))
  if (projeto) parts.push(buildProjetoContext(projeto))
  if (biblioteca && biblioteca.length > 0) parts.push(buildBibliotecaContext(biblioteca))

  return parts.join("\n\n---\n\n")
}

/**
 * Build the full system prompt for document generation (all 3 layers + context)
 */
export function buildDocumentPrompt(context: PromptContext): string {
  const parts: string[] = []

  // Layer 1: Identity + Rules + Guardrails (ALWAYS)
  parts.push(SYSTEM_PROMPT_JURIDICO)

  // Layer 2: Writing Method (for document generation)
  parts.push(METODO_REDACIONAL_JRCLAW)

  // Layer 3: Type-specific prompt
  if (context.tipoDocumento && PROMPTS_POR_TIPO[context.tipoDocumento]) {
    parts.push(
      `## INSTRUÇÕES ESPECÍFICAS: ${context.tipoDocumento}\n\n${PROMPTS_POR_TIPO[context.tipoDocumento]}`
    )
  }

  // Process context
  if (context.processo) {
    parts.push(buildProcessoContext(context.processo))
  }

  // Project context
  if (context.projeto) {
    parts.push(buildProjetoContext(context.projeto))
  }

  // Library context
  if (context.biblioteca && context.biblioteca.length > 0) {
    parts.push(buildBibliotecaContext(context.biblioteca))
  }

  // User config
  parts.push(buildUserConfig(context))

  // User instructions
  if (context.instrucoesUsuario) {
    parts.push(`\n## INSTRUÇÕES DO ADVOGADO PARA ESTA PEÇA\n\n${context.instrucoesUsuario}`)
  }

  return parts.join("\n\n---\n\n")
}

/**
 * Build a review prompt
 */
export function buildReviewPrompt(
  reviewType: string,
  documentContent: string
): string {
  const reviewInstructions = PROMPTS_POR_TIPO["REVISAO_IA"] || ""

  let focusInstruction = ""
  switch (reviewType) {
    case "completa":
      focusInstruction = "Revisão completa: todos os 5 aspectos com igual profundidade."
      break
    case "gramatical":
      focusInstruction = "Foco em aspecto 1 (GRAMATICAL): erros, concordância, clareza, terminologia."
      break
    case "juridica":
      focusInstruction = "Foco em aspecto 2 (FUNDAMENTAÇÃO JURÍDICA): artigos, precedentes, suficiência."
      break
    case "estrategica":
      focusInstruction = "Foco em aspecto 3 (ESTRATÉGICA): eficácia, contra-argumentos, ordem."
      break
    case "risco":
      focusInstruction = "Foco em aspecto 4 (RISCOS): argumentos contra, omissões, prazos."
      break
    case "contrato":
      focusInstruction =
        "Revisão de contrato: cláusulas essenciais, ambiguidade, riscos, conformidade legal."
      break
  }

  return [
    SYSTEM_PROMPT_JURIDICO,
    `## MODO DE REVISÃO\n\n${reviewInstructions}\n\n${focusInstruction}`,
    `## DOCUMENTO A REVISAR\n\n${documentContent}`,
  ].join("\n\n---\n\n")
}

/**
 * Build chat action prompts
 */
export const CHAT_ACTIONS: Record<string, string> = {
  RESUMIR_PROCESSO:
    "[AÇÃO: RESUMIR PROCESSO] Elabore resumo executivo: (1) Identificação, (2) Objeto, (3) Cronologia, (4) Fase atual, (5) Argumentos centrais, (6) Riscos, (7) Próximos passos com prazos.",
  ANALISAR_DECISAO:
    "[AÇÃO: ANALISAR DECISÃO] Analise: (1) Dispositivo, (2) Fundamentação, (3) Pontos de ataque (omissão, contradição, error in judicando/procedendo), (4) Recursos cabíveis com prazo, (5) Probabilidade de reforma, (6) Estratégia recomendada.",
  GERAR_CRONOLOGIA:
    "[AÇÃO: GERAR CRONOLOGIA] Timeline: DATA | EVENTO | RELEVÂNCIA JURÍDICA | FONTE. Destacar marcos processuais.",
  ANALISAR_CONTRATO:
    "[AÇÃO: ANALISAR CONTRATO] Extrair: (1) Partes, (2) Objeto, (3) Prazo, (4) Valor, (5) Garantias, (6) Rescisão, (7) Foro, (8) Riscos, (9) Recomendações, (10) Conformidade.",
  CALCULAR_CREDITO:
    "[AÇÃO: CALCULAR CRÉDITO] Memória de cálculo: principal, correção, juros, multa, data-base. Classificação art. 41 LRF.",
}
