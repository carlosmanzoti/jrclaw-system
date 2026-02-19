/**
 * Workspace Context Assembler — the brain of the AI layer.
 *
 * Builds a comprehensive context object from the database for any workspace,
 * serializes it for use as system prompt material in AI calls.
 */

import { db } from "@/lib/db"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkspaceContext {
  // Section 1 — Deadline
  deadline: {
    id: string
    codigo: string
    tipo: string
    titulo: string
    descricao: string | null
    prioridade: string
    status: string
    dataFimPrazo: string
    diasRestantes: number
    urgencia: "CRITICO" | "URGENTE" | "PROXIMO" | "NORMAL"
    contagem: string
    prazoDias: number
  }
  // Workspace
  workspace: {
    id: string
    phase: string
    totalWords: number
    totalChars: number
    estimatedPages: number
    locked: boolean
    editorSavedAt: string | null
    protocoloData: string | null
  }
  // Section 2 — Case
  caso: {
    id: string
    numero: string | null
    tipo: string
    vara: string | null
    comarca: string | null
    tribunal: string | null
    uf: string | null
    valorCausa: string | null
    faseProcessual: string | null
    status: string
  } | null
  // Section 3 — Client
  cliente: {
    nome: string
    cpfCnpj: string | null
    tipo: string | null
    segmento: string | null
  } | null
  // Section 4 — Theses
  teses: {
    id: string
    titulo: string
    tipo: string
    status: string
    issue: string | null
    rule: string | null
    strength: string | null
    legalRefs: string[]
    caseRefs: string[]
  }[]
  // Section 5 — Draft state
  minuta: {
    versaoAtual: number
    palavras: number
    secoesDetectadas: string[]
    ultimoSalvamento: string | null
  }
  // Section 6 — Pending comments
  comentariosPendentes: {
    id: string
    tipo: string
    conteudo: string
    anchorText: string | null
  }[]
  // Section 7 — Checklist
  checklist: {
    total: number
    cumpridos: number
    obrigatoriosPendentes: string[]
    progresso: number
  }
  // Section 8 — Approval history
  aprovacao: {
    rodadaAtual: number
    reprovacoesAnteriores: { round: number; feedback: string | null }[]
    statusAtual: string | null
  }
  // Section 9 — Tribunal patterns
  tribunal: string
  tribunalPatterns: {
    nome: string
    maxFileSize: string
    formatacao: string
    assinatura: string
    particularidades: string
  }
  // Responsible
  responsavel: { nome: string; role: string } | null
  // Serialized string
  serialized: string
}

// ---------------------------------------------------------------------------
// Simple in-memory cache (5 min TTL)
// ---------------------------------------------------------------------------

const cache = new Map<string, { ctx: WorkspaceContext; updatedAt: string; expires: number }>()

function getCached(deadlineId: string, updatedAt: string): WorkspaceContext | null {
  const entry = cache.get(deadlineId)
  if (!entry) return null
  if (Date.now() > entry.expires || entry.updatedAt !== updatedAt) {
    cache.delete(deadlineId)
    return null
  }
  return entry.ctx
}

function setCache(deadlineId: string, ctx: WorkspaceContext, updatedAt: string) {
  cache.set(deadlineId, { ctx, updatedAt, expires: Date.now() + 5 * 60 * 1000 })
}

// ---------------------------------------------------------------------------
// Tribunal patterns (known rules)
// ---------------------------------------------------------------------------

const TRIBUNAL_PATTERNS: Record<string, { nome: string; maxFileSize: string; formatacao: string; assinatura: string; particularidades: string }> = {
  STJ: { nome: "Superior Tribunal de Justiça", maxFileSize: "10MB", formatacao: "Fonte Times 12pt, espaço 1.5", assinatura: "Certificado digital ICP-Brasil", particularidades: "Exige PDF/A. Petição eletrônica obrigatória via PJe." },
  STF: { nome: "Supremo Tribunal Federal", maxFileSize: "10MB", formatacao: "Fonte Times 12pt, espaço 1.5", assinatura: "Certificado digital ICP-Brasil", particularidades: "Petição eletrônica obrigatória. Observar regimento interno." },
  "TJPR": { nome: "Tribunal de Justiça do Paraná", maxFileSize: "10MB", formatacao: "Fonte Arial/Times 12pt, espaço 1.5", assinatura: "Certificado digital ou token OAB", particularidades: "Sistema PROJUDI. Atentar para formatos aceitos." },
  "TJMA": { nome: "Tribunal de Justiça do Maranhão", maxFileSize: "10MB", formatacao: "Fonte Arial/Times 12pt, espaço 1.5", assinatura: "Certificado digital", particularidades: "Sistema PJe. Verificar compatibilidade do navegador." },
  "TRF1": { nome: "TRF da 1ª Região", maxFileSize: "10MB", formatacao: "Fonte Times 12pt, espaço 1.5", assinatura: "Certificado digital ICP-Brasil", particularidades: "PJe. Abrange MA e outros estados do Norte/Centro-Oeste." },
  "TRF4": { nome: "TRF da 4ª Região", maxFileSize: "10MB", formatacao: "Fonte Times 12pt, espaço 1.5", assinatura: "Certificado digital ICP-Brasil", particularidades: "eproc. Aceita PDF até 10MB por arquivo." },
  DEFAULT: { nome: "Tribunal não especificado", maxFileSize: "10MB", formatacao: "Fonte Times/Arial 12pt, espaço 1.5, margens 3cm", assinatura: "Certificado digital ICP-Brasil ou assinatura eletrônica", particularidades: "Verifique as regras específicas do tribunal de destino." },
}

function getTribunalPattern(codigo: string | null, uf: string | null) {
  if (codigo && TRIBUNAL_PATTERNS[codigo]) return TRIBUNAL_PATTERNS[codigo]
  if (uf === "PR") return TRIBUNAL_PATTERNS["TJPR"]
  if (uf === "MA") return TRIBUNAL_PATTERNS["TJMA"]
  return TRIBUNAL_PATTERNS.DEFAULT
}

// ---------------------------------------------------------------------------
// Heading extractor
// ---------------------------------------------------------------------------

function extractHeadings(html: string | null): string[] {
  if (!html) return []
  const headings: string[] = []
  const regex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    headings.push(match[1].replace(/<[^>]+>/g, "").trim())
  }
  return headings
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export async function buildWorkspaceContext(deadlineId: string): Promise<WorkspaceContext> {
  // Load workspace with all relations
  const ws = await db.deadlineWorkspace.findFirst({
    where: { deadline_id: deadlineId },
    include: {
      deadline: {
        include: {
          responsavel: { select: { id: true, name: true, role: true } },
          case_: {
            select: {
              id: true, numero_processo: true, tipo: true, status: true,
              vara: true, comarca: true, tribunal: true, uf: true,
              valor_causa: true, fase_processual: true,
              cliente: { select: { nome: true, cpf_cnpj: true, subtipo: true, segmento: true } },
            },
          },
        },
      },
      theses: { orderBy: { order: "asc" } },
      comments: { where: { resolved: false }, orderBy: { created_at: "desc" } },
      checklist_items: { orderBy: { order: "asc" } },
      approvals: { orderBy: { round: "desc" } },
      document_versions: { orderBy: { version_number: "desc" }, take: 1 },
    },
  })

  if (!ws) throw new Error(`Workspace not found for deadline ${deadlineId}`)

  // Check cache
  const cached = getCached(deadlineId, ws.updated_at.toISOString())
  if (cached) return cached

  const dl = ws.deadline
  const caso = dl.case_
  const cliente = caso?.cliente

  // Calculate days remaining
  const diasRestantes = Math.ceil((new Date(dl.data_fim_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const urgencia = diasRestantes <= 0 ? "CRITICO" as const
    : diasRestantes <= 1 ? "URGENTE" as const
    : diasRestantes <= 3 ? "PROXIMO" as const
    : "NORMAL" as const

  // Checklist stats
  const checkTotal = ws.checklist_items.length
  const checkDone = ws.checklist_items.filter(i => i.checked).length
  const blockingPending = ws.checklist_items.filter(i => i.blocks_protocol && !i.checked).map(i => i.title)

  // Approval
  const lastApproval = ws.approvals[0] || null
  const rejections = ws.approvals.filter(a => a.status === "REPROVADO")

  // Tribunal
  const tribunalCodigo = dl.tribunal_codigo || (caso?.tribunal ? caso.tribunal.replace(/\s/g, "") : null)
  const tp = getTribunalPattern(tribunalCodigo, dl.uf || caso?.uf || null)

  const ctx: WorkspaceContext = {
    deadline: {
      id: dl.id,
      codigo: dl.codigo,
      tipo: dl.tipo,
      titulo: dl.titulo,
      descricao: dl.descricao,
      prioridade: dl.prioridade,
      status: dl.status,
      dataFimPrazo: dl.data_fim_prazo.toISOString().slice(0, 10),
      diasRestantes,
      urgencia,
      contagem: dl.contagem_tipo,
      prazoDias: dl.prazo_dias,
    },
    workspace: {
      id: ws.id,
      phase: ws.phase,
      totalWords: ws.total_words,
      totalChars: ws.total_characters,
      estimatedPages: ws.estimated_pages,
      locked: ws.locked,
      editorSavedAt: ws.editor_saved_at?.toISOString() || null,
      protocoloData: ws.protocolo_data?.toISOString() || null,
    },
    caso: caso ? {
      id: caso.id,
      numero: caso.numero_processo,
      tipo: caso.tipo,
      vara: caso.vara,
      comarca: caso.comarca,
      tribunal: caso.tribunal,
      uf: caso.uf,
      valorCausa: caso.valor_causa ? `R$ ${(Number(caso.valor_causa) / 100).toLocaleString("pt-BR")}` : null,
      faseProcessual: caso.fase_processual,
      status: caso.status,
    } : null,
    cliente: cliente ? {
      nome: cliente.nome,
      cpfCnpj: cliente.cpf_cnpj,
      tipo: cliente.subtipo,
      segmento: cliente.segmento,
    } : null,
    teses: ws.theses.map(t => ({
      id: t.id,
      titulo: t.title,
      tipo: t.type,
      status: t.status,
      issue: t.issue,
      rule: t.rule,
      strength: t.strength,
      legalRefs: t.legal_refs,
      caseRefs: t.case_refs,
    })),
    minuta: {
      versaoAtual: ws.document_versions[0]?.version_number || 0,
      palavras: ws.total_words,
      secoesDetectadas: extractHeadings(ws.editor_html),
      ultimoSalvamento: ws.editor_saved_at?.toISOString() || null,
    },
    comentariosPendentes: ws.comments.map(c => ({
      id: c.id,
      tipo: c.type,
      conteudo: c.content,
      anchorText: c.anchor_text,
    })),
    checklist: {
      total: checkTotal,
      cumpridos: checkDone,
      obrigatoriosPendentes: blockingPending,
      progresso: checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0,
    },
    aprovacao: {
      rodadaAtual: lastApproval?.round || 0,
      reprovacoesAnteriores: rejections.map(r => ({ round: r.round, feedback: r.feedback })),
      statusAtual: lastApproval?.status || null,
    },
    tribunal: tp.nome,
    tribunalPatterns: tp,
    responsavel: dl.responsavel ? { nome: dl.responsavel.name || "", role: dl.responsavel.role } : null,
    serialized: "", // filled below
  }

  // Serialize for prompt
  ctx.serialized = serializeContext(ctx)
  setCache(deadlineId, ctx, ws.updated_at.toISOString())
  return ctx
}

// ---------------------------------------------------------------------------
// Serializer — produces a human-readable string for AI system prompt
// ---------------------------------------------------------------------------

function serializeContext(ctx: WorkspaceContext): string {
  const lines: string[] = []

  lines.push("=== DADOS DO PRAZO ===")
  lines.push(`Código: ${ctx.deadline.codigo}`)
  lines.push(`Tipo: ${ctx.deadline.tipo} | Prioridade: ${ctx.deadline.prioridade}`)
  lines.push(`Título: ${ctx.deadline.titulo}`)
  if (ctx.deadline.descricao) lines.push(`Descrição: ${ctx.deadline.descricao}`)
  lines.push(`Data limite: ${ctx.deadline.dataFimPrazo} | Dias restantes: ${ctx.deadline.diasRestantes}`)
  lines.push(`Urgência: ${ctx.deadline.urgencia}`)
  lines.push(`Contagem: ${ctx.deadline.contagem} (${ctx.deadline.prazoDias} dias)`)
  lines.push(`Fase do workspace: ${ctx.workspace.phase}`)

  if (ctx.caso) {
    lines.push("\n=== DADOS DO PROCESSO ===")
    lines.push(`Número: ${ctx.caso.numero || "N/A"}`)
    lines.push(`Tipo: ${ctx.caso.tipo} | Status: ${ctx.caso.status}`)
    lines.push(`Juízo: ${ctx.caso.vara || "N/A"} | Comarca: ${ctx.caso.comarca || "N/A"} | UF: ${ctx.caso.uf || "N/A"}`)
    if (ctx.caso.tribunal) lines.push(`Tribunal: ${ctx.caso.tribunal}`)
    if (ctx.caso.valorCausa) lines.push(`Valor da causa: ${ctx.caso.valorCausa}`)
    if (ctx.caso.faseProcessual) lines.push(`Fase processual: ${ctx.caso.faseProcessual}`)
  }

  if (ctx.cliente) {
    lines.push("\n=== CLIENTE ===")
    lines.push(`Nome: ${ctx.cliente.nome}`)
    if (ctx.cliente.cpfCnpj) lines.push(`CPF/CNPJ: ${ctx.cliente.cpfCnpj}`)
    if (ctx.cliente.tipo) lines.push(`Tipo: ${ctx.cliente.tipo}`)
    if (ctx.cliente.segmento) lines.push(`Segmento: ${ctx.cliente.segmento}`)
  }

  if (ctx.teses.length > 0) {
    lines.push(`\n=== TESES CADASTRADAS (${ctx.teses.length}) ===`)
    for (const t of ctx.teses) {
      lines.push(`• [${t.tipo}] ${t.titulo} — Status: ${t.status}${t.strength ? ` (Força: ${t.strength})` : ""}`)
      if (t.issue) lines.push(`  Questão: ${t.issue.slice(0, 200)}`)
      if (t.rule) lines.push(`  Fundamento: ${t.rule.slice(0, 200)}`)
      if (t.legalRefs.length > 0) lines.push(`  Legislação: ${t.legalRefs.join("; ")}`)
      if (t.caseRefs.length > 0) lines.push(`  Jurisprudência: ${t.caseRefs.join("; ")}`)
    }
  }

  lines.push("\n=== ESTADO DA MINUTA ===")
  lines.push(`Versão: ${ctx.minuta.versaoAtual} | Palavras: ${ctx.minuta.palavras}`)
  if (ctx.minuta.secoesDetectadas.length > 0) {
    lines.push(`Seções: ${ctx.minuta.secoesDetectadas.join(", ")}`)
  } else {
    lines.push("Seções: nenhuma detectada (minuta pode estar vazia)")
  }

  if (ctx.comentariosPendentes.length > 0) {
    lines.push(`\n=== COMENTÁRIOS PENDENTES (${ctx.comentariosPendentes.length}) ===`)
    for (const c of ctx.comentariosPendentes.slice(0, 10)) {
      lines.push(`• [${c.tipo}] ${c.conteudo.slice(0, 150)}`)
      if (c.anchorText) lines.push(`  Trecho: "${c.anchorText.slice(0, 100)}"`)
    }
  }

  lines.push("\n=== CHECKLIST ===")
  lines.push(`Progresso: ${ctx.checklist.cumpridos}/${ctx.checklist.total} (${ctx.checklist.progresso}%)`)
  if (ctx.checklist.obrigatoriosPendentes.length > 0) {
    lines.push(`Obrigatórios pendentes: ${ctx.checklist.obrigatoriosPendentes.join("; ")}`)
  }

  if (ctx.aprovacao.rodadaAtual > 0) {
    lines.push("\n=== APROVAÇÃO ===")
    lines.push(`Rodada: ${ctx.aprovacao.rodadaAtual} | Status: ${ctx.aprovacao.statusAtual || "N/A"}`)
    if (ctx.aprovacao.reprovacoesAnteriores.length > 0) {
      for (const r of ctx.aprovacao.reprovacoesAnteriores) {
        lines.push(`  Reprovação rodada ${r.round}: ${r.feedback || "sem feedback"}`)
      }
    }
  }

  lines.push("\n=== TRIBUNAL DE DESTINO ===")
  lines.push(`${ctx.tribunalPatterns.nome}`)
  lines.push(`Tamanho máximo: ${ctx.tribunalPatterns.maxFileSize}`)
  lines.push(`Formatação: ${ctx.tribunalPatterns.formatacao}`)
  lines.push(`Assinatura: ${ctx.tribunalPatterns.assinatura}`)
  lines.push(`Particularidades: ${ctx.tribunalPatterns.particularidades}`)

  if (ctx.responsavel) {
    lines.push(`\nResponsável: ${ctx.responsavel.nome} (${ctx.responsavel.role})`)
  }

  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Invalidate cache for a deadline
// ---------------------------------------------------------------------------

export function invalidateWorkspaceCache(deadlineId: string) {
  cache.delete(deadlineId)
}
