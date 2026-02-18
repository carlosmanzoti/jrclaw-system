/**
 * Workspace Predictive Engine — pattern-based analysis that anticipates
 * problems before they happen.
 *
 * LAYER 3: Predicts issues based on historical patterns and heuristics.
 *
 * 4 engines:
 *   18.1 — Risk Predictor (deadline risk scoring)
 *   18.2 — Argumentation Gap Detector (missing arguments)
 *   18.3 — Next Action Suggester (proactive recommendations)
 *   18.4 — Review Comment Pattern Monitor (recurring issues)
 */

import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { db } from "@/lib/db"
import { buildWorkspaceContext, type WorkspaceContext } from "./workspace-context"
import { buildWorkspaceSystemPrompt } from "./workspace-system-prompt"

// ---------------------------------------------------------------------------
// Shared AI call
// ---------------------------------------------------------------------------

async function callAI(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const config = MODEL_CONFIGS.standard
    const result = await generateText({
      model: anthropic(config.model),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxOutputTokens: config.maxOutputTokens,
      temperature: 0.3,
    })
    return result.text
  } catch (error) {
    console.error("[Predictive Engine AI Error]", error)
    return null
  }
}

function parseJSON<T = Record<string, unknown>>(text: string | null): T | null {
  if (!text) return null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch {
    return null
  }
}

// ===========================================================================
// 18.1 — RISK PREDICTOR
// ===========================================================================

export interface RiskAssessment {
  score: number // 0-100
  level: "low" | "medium" | "high" | "critical"
  factors: RiskFactor[]
  recommendation: string
}

interface RiskFactor {
  category: string
  description: string
  weight: number // 0-1
  impact: "positive" | "negative"
}

export function calculateDeadlineRisk(context: WorkspaceContext): RiskAssessment {
  const factors: RiskFactor[] = []
  let riskScore = 0

  // Factor 1: Time remaining vs progress
  const diasRestantes = context.deadline.diasRestantes
  const checklistProgress = context.checklist.total > 0
    ? context.checklist.cumpridos / context.checklist.total
    : 0

  if (diasRestantes <= 0) {
    factors.push({ category: "TEMPO", description: "Prazo vencido", weight: 1, impact: "negative" })
    riskScore += 40
  } else if (diasRestantes === 1) {
    factors.push({ category: "TEMPO", description: "Prazo amanhã", weight: 0.9, impact: "negative" })
    riskScore += 35
  } else if (diasRestantes <= 3) {
    const expectedProgress = 0.8
    if (checklistProgress < expectedProgress) {
      factors.push({
        category: "TEMPO",
        description: `${diasRestantes} dia(s) restante(s) com ${Math.round(checklistProgress * 100)}% do checklist`,
        weight: 0.7,
        impact: "negative",
      })
      riskScore += 25
    }
  } else if (diasRestantes <= 7) {
    const expectedProgress = 0.5
    if (checklistProgress < expectedProgress) {
      factors.push({
        category: "TEMPO",
        description: `${diasRestantes} dia(s) restante(s) com progresso baixo`,
        weight: 0.4,
        impact: "negative",
      })
      riskScore += 15
    }
  }

  // Factor 2: Phase appropriateness
  const phaseMap: Record<string, number> = {
    RASCUNHO: 0,
    REVISAO: 1,
    APROVACAO: 2,
    PROTOCOLO: 3,
    CONCLUIDO: 4,
  }
  const currentPhaseIndex = phaseMap[context.workspace.phase] ?? 0

  if (diasRestantes <= 3 && currentPhaseIndex < 2) {
    factors.push({
      category: "FASE",
      description: `Ainda em ${context.workspace.phase} com ${diasRestantes} dia(s)`,
      weight: 0.6,
      impact: "negative",
    })
    riskScore += 15
  }

  // Factor 3: Blocking checklist items
  if (context.checklist.obrigatoriosPendentes.length > 0) {
    factors.push({
      category: "CHECKLIST",
      description: `${context.checklist.obrigatoriosPendentes.length} item(ns) bloqueante(s) pendente(s)`,
      weight: 0.5,
      impact: "negative",
    })
    riskScore += Math.min(20, context.checklist.obrigatoriosPendentes.length * 5)
  }

  // Factor 4: No content yet
  if (!context.workspace.totalWords || context.workspace.totalWords === 0) {
    if (diasRestantes <= 5) {
      factors.push({
        category: "CONTEUDO",
        description: "Minuta sem conteúdo",
        weight: 0.7,
        impact: "negative",
      })
      riskScore += 20
    }
  }

  // Factor 5: Theses coverage
  const totalTheses = context.teses.length
  const approvedTheses = context.teses.filter(t => t.status === "APROVADA").length
  if (totalTheses > 0 && approvedTheses === 0 && diasRestantes <= 5) {
    factors.push({
      category: "TESES",
      description: "Nenhuma tese aprovada",
      weight: 0.4,
      impact: "negative",
    })
    riskScore += 10
  }

  // Factor 6: Pending review comments
  const pendingComments = context.comentariosPendentes?.length ?? 0
  if (pendingComments >= 5) {
    factors.push({
      category: "REVISAO",
      description: `${pendingComments} comentários de revisão pendentes`,
      weight: 0.3,
      impact: "negative",
    })
    riskScore += Math.min(10, pendingComments * 2)
  }

  // Positive factors
  if (context.workspace.phase === "CONCLUIDO") {
    factors.push({ category: "CONCLUSAO", description: "Workspace concluído", weight: 1, impact: "positive" })
    riskScore = 0
  } else if (context.workspace.phase === "PROTOCOLO") {
    factors.push({ category: "FASE", description: "Pronto para protocolo", weight: 0.8, impact: "positive" })
    riskScore = Math.max(0, riskScore - 30)
  }

  // Normalize to 0-100
  riskScore = Math.max(0, Math.min(100, riskScore))

  const level: RiskAssessment["level"] =
    riskScore >= 70 ? "critical" :
    riskScore >= 50 ? "high" :
    riskScore >= 30 ? "medium" : "low"

  // Generate recommendation
  let recommendation = ""
  if (level === "critical") {
    recommendation = "Ação imediata necessária. Priorize este prazo acima de tudo. Considere escalar para supervisão."
  } else if (level === "high") {
    recommendation = "Risco alto. Verifique pendências urgentes e agilize a elaboração."
  } else if (level === "medium") {
    recommendation = "Risco moderado. Mantenha ritmo constante e resolva pendências do checklist."
  } else {
    recommendation = "Risco baixo. Prazo em boa situação."
  }

  return { score: riskScore, level, factors, recommendation }
}

// ===========================================================================
// 18.2 — ARGUMENTATION GAP DETECTOR
// ===========================================================================

export interface ArgumentationGap {
  type: "missing_thesis" | "weak_argument" | "unsupported_claim" | "missing_section" | "citation_needed"
  description: string
  severity: "high" | "medium" | "low"
  suggestion: string
  section?: string
}

export async function detectArgumentationGaps(deadlineId: string): Promise<ArgumentationGap[]> {
  try {
    const context = await buildWorkspaceContext(deadlineId)
    const gaps: ArgumentationGap[] = []

    // Heuristic 1: Required sections check
    const html = (context.minuta.secoesDetectadas || []).map(h => h.toLowerCase())
    const allHtml = context.workspace.phase !== "RASCUNHO"
      ? (html.join(" ") || "")
      : ""

    const requiredSections = [
      { keyword: "qualificação", label: "Qualificação das partes" },
      { keyword: "fatos", label: "Exposição dos fatos" },
      { keyword: "direito", label: "Fundamentação jurídica" },
      { keyword: "pedido", label: "Pedidos" },
    ]

    for (const section of requiredSections) {
      const found = html.some(h => h.includes(section.keyword))
      if (!found && context.workspace.totalWords > 100) {
        gaps.push({
          type: "missing_section",
          description: `Seção '${section.label}' não detectada na minuta`,
          severity: "high",
          suggestion: `Adicione a seção de ${section.label} à minuta`,
          section: section.label,
        })
      }
    }

    // Heuristic 2: Theses not incorporated
    for (const tese of context.teses) {
      if (tese.status === "APROVADA" && context.workspace.totalWords > 100) {
        const titleWords = tese.titulo.toLowerCase().split(/\s+/).filter((w: string) => w.length > 4)
        const inHeadings = titleWords.some((w: string) => allHtml.includes(w))
        if (!inHeadings) {
          gaps.push({
            type: "missing_thesis",
            description: `Tese '${tese.titulo}' aprovada mas pode não estar na minuta`,
            severity: "medium",
            suggestion: `Incorpore a tese '${tese.titulo}' na seção de fundamentação jurídica`,
          })
        }
      }
    }

    // Heuristic 3: Theses without legal references
    for (const tese of context.teses) {
      if (tese.status !== "REJEITADA" && (!tese.legalRefs || tese.legalRefs.length === 0)) {
        gaps.push({
          type: "citation_needed",
          description: `Tese '${tese.titulo}' sem referências legislativas`,
          severity: "medium",
          suggestion: "Adicione referências a artigos de lei, súmulas ou jurisprudência",
        })
      }
    }

    // Heuristic 4: No theses at all
    if (context.teses.length === 0 && context.workspace.totalWords > 50) {
      gaps.push({
        type: "weak_argument",
        description: "Nenhuma tese jurídica cadastrada no workspace",
        severity: "high",
        suggestion: "Cadastre teses jurídicas para estruturar a argumentação",
      })
    }

    // If we have content and theses, use AI for deeper analysis
    if (context.workspace.totalWords > 300 && context.teses.length > 0) {
      const systemPrompt = buildWorkspaceSystemPrompt(context)
      const aiText = await callAI(
        systemPrompt,
        `Analise a coerência entre as teses cadastradas e a minuta. Identifique lacunas argumentativas. Responda em JSON: { "gaps": [{ "type": "weak_argument"|"unsupported_claim"|"citation_needed", "description": "...", "severity": "high"|"medium"|"low", "suggestion": "..." }] }. Máximo 5 gaps. APENAS JSON.`
      )
      const parsed = parseJSON<{ gaps?: ArgumentationGap[] }>(aiText)
      if (parsed?.gaps && Array.isArray(parsed.gaps)) {
        for (const gap of parsed.gaps.slice(0, 5)) {
          gaps.push({
            type: gap.type || "weak_argument",
            description: gap.description || "",
            severity: gap.severity || "medium",
            suggestion: gap.suggestion || "",
          })
        }
      }
    }

    return gaps
  } catch (error) {
    console.error("[Predictive: detectArgumentationGaps]", error)
    return []
  }
}

// ===========================================================================
// 18.3 — NEXT ACTION SUGGESTER
// ===========================================================================

export interface SuggestedAction {
  action: string
  label: string
  description: string
  priority: "urgent" | "high" | "normal" | "low"
  category: "content" | "review" | "checklist" | "thesis" | "document" | "approval" | "protocol"
}

export function suggestNextActions(context: WorkspaceContext): SuggestedAction[] {
  const actions: SuggestedAction[] = []
  const phase = context.workspace.phase
  const dias = context.deadline.diasRestantes

  // Phase-specific suggestions
  if (phase === "RASCUNHO") {
    if (!context.workspace.totalWords || context.workspace.totalWords === 0) {
      actions.push({
        action: "gerar_rascunho",
        label: "Gerar rascunho com IA",
        description: "Use a IA para gerar o rascunho inicial da peça processual",
        priority: dias <= 3 ? "urgent" : "high",
        category: "content",
      })
    }

    if (context.teses.length === 0) {
      actions.push({
        action: "sugerir_teses",
        label: "Sugerir teses jurídicas",
        description: "Peça à IA para sugerir teses relevantes para este prazo",
        priority: "high",
        category: "thesis",
      })
    }

    const uncheckedRequired = context.checklist.obrigatoriosPendentes.length
    if (uncheckedRequired > 0) {
      actions.push({
        action: "verificar_checklist",
        label: `Verificar checklist (${uncheckedRequired} pendentes)`,
        description: "Complete os itens obrigatórios do checklist antes de avançar",
        priority: dias <= 5 ? "high" : "normal",
        category: "checklist",
      })
    }

    if (context.workspace.totalWords > 300) {
      actions.push({
        action: "verificar_citacoes",
        label: "Verificar citações",
        description: "Valide as citações de legislação e jurisprudência",
        priority: "normal",
        category: "review",
      })

      actions.push({
        action: "change_phase_revisao",
        label: "Avançar para Revisão",
        description: "Envie a minuta para revisão quando estiver pronta",
        priority: "normal",
        category: "review",
      })
    }
  }

  if (phase === "REVISAO") {
    actions.push({
      action: "revisar_completo",
      label: "Revisão completa com IA",
      description: "Execute revisão jurídica, gramatical e de estilo com a IA",
      priority: "high",
      category: "review",
    })

    actions.push({
      action: "analisar_coerencia",
      label: "Analisar coerência",
      description: "Verifique a coerência entre teses, minuta, pedidos e checklist",
      priority: "normal",
      category: "review",
    })

    const pendingComments = context.comentariosPendentes?.length ?? 0
    if (pendingComments > 0) {
      actions.push({
        action: "resolver_comentarios",
        label: `Resolver ${pendingComments} comentário(s)`,
        description: "Resolva os comentários de revisão pendentes",
        priority: pendingComments >= 3 ? "high" : "normal",
        category: "review",
      })
    }

    actions.push({
      action: "request_approval",
      label: "Solicitar aprovação",
      description: "Envie para aprovação do sócio/supervisor",
      priority: dias <= 3 ? "urgent" : "normal",
      category: "approval",
    })
  }

  if (phase === "APROVACAO") {
    actions.push({
      action: "gerar_resumo_revisor",
      label: "Gerar resumo para revisor",
      description: "Gere um briefing executivo para o aprovador",
      priority: "normal",
      category: "review",
    })
  }

  if (phase === "PROTOCOLO") {
    actions.push({
      action: "preparar_protocolo",
      label: "Validar pré-protocolo",
      description: "Verifique todos os requisitos antes de protocolar",
      priority: "urgent",
      category: "protocol",
    })

    actions.push({
      action: "registrar_protocolo",
      label: "Registrar protocolo",
      description: "Informe o número e data do protocolo",
      priority: "urgent",
      category: "protocol",
    })
  }

  // Cross-phase urgent actions
  if (dias <= 1 && phase !== "CONCLUIDO") {
    actions.unshift({
      action: "escalar",
      label: "URGENTE: Prazo amanhã!",
      description: "Verifique todas as pendências e priorize este prazo imediatamente",
      priority: "urgent",
      category: "protocol",
    })
  }

  // Document suggestions
  if (phase !== "CONCLUIDO") {
    const hasDocPending = context.checklist.obrigatoriosPendentes.some(
      (titulo: string) => titulo.toLowerCase().includes("document") || titulo.toLowerCase().includes("procuração") || titulo.toLowerCase().includes("comprovante")
    )
    if (hasDocPending) {
      actions.push({
        action: "upload_document",
        label: "Anexar documentos pendentes",
        description: "Há itens do checklist relacionados a documentos não atendidos",
        priority: "normal",
        category: "document",
      })
    }
  }

  return actions
}

// ===========================================================================
// 18.4 — REVIEW COMMENT PATTERN MONITOR
// ===========================================================================

export interface CommentPattern {
  pattern: string
  count: number
  severity: "high" | "medium" | "low"
  suggestion: string
  examples: string[]
}

export async function analyzeCommentPatterns(workspaceId: string): Promise<CommentPattern[]> {
  try {
    const comments = await db.workspaceComment.findMany({
      where: {
        workspace_id: workspaceId,
        type: { in: ["REVISAO", "CORRECAO"] },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    })

    if (comments.length < 2) return []

    const patterns: CommentPattern[] = []

    // Pattern detection: categorize comments by keywords
    const categories: Record<string, { keywords: string[]; label: string; comments: string[] }> = {
      grammar: {
        keywords: ["gramática", "ortografia", "concordância", "virgula", "vírgula", "acentuação", "erro de digitação"],
        label: "Erros gramaticais/ortográficos",
        comments: [],
      },
      citation: {
        keywords: ["citação", "artigo", "lei", "jurisprudência", "súmula", "referência", "norma"],
        label: "Problemas com citações",
        comments: [],
      },
      structure: {
        keywords: ["estrutura", "organização", "seção", "parágrafo", "formatação", "ordem"],
        label: "Problemas estruturais",
        comments: [],
      },
      argumentation: {
        keywords: ["argumento", "tese", "fundamentação", "lógica", "coerência", "contradição"],
        label: "Falhas na argumentação",
        comments: [],
      },
      formality: {
        keywords: ["formalidade", "linguagem", "tom", "redação", "estilo", "técnico"],
        label: "Questões de formalidade/estilo",
        comments: [],
      },
    }

    for (const comment of comments) {
      const contentLower = comment.content.toLowerCase()
      for (const [, cat] of Object.entries(categories)) {
        if (cat.keywords.some(k => contentLower.includes(k))) {
          cat.comments.push(comment.content)
        }
      }
    }

    for (const [, cat] of Object.entries(categories)) {
      if (cat.comments.length >= 2) {
        let severity: "high" | "medium" | "low" = "low"
        if (cat.comments.length >= 5) severity = "high"
        else if (cat.comments.length >= 3) severity = "medium"

        patterns.push({
          pattern: cat.label,
          count: cat.comments.length,
          severity,
          suggestion: `Padrão recorrente detectado: ${cat.label}. Considere uma revisão focada nesta área.`,
          examples: cat.comments.slice(0, 3),
        })
      }
    }

    // Sort by severity (high first) then by count
    patterns.sort((a, b) => {
      const sev = { high: 3, medium: 2, low: 1 }
      return (sev[b.severity] - sev[a.severity]) || (b.count - a.count)
    })

    return patterns
  } catch (error) {
    console.error("[Predictive: analyzeCommentPatterns]", error)
    return []
  }
}

// ===========================================================================
// COMBINED PREDICTIVE ANALYSIS
// ===========================================================================

export interface PredictiveInsights {
  risk: RiskAssessment
  gaps: ArgumentationGap[]
  nextActions: SuggestedAction[]
  commentPatterns: CommentPattern[]
}

export async function getFullPredictiveInsights(deadlineId: string): Promise<PredictiveInsights> {
  const context = await buildWorkspaceContext(deadlineId)

  // Run risk assessment and next actions synchronously (fast, no AI)
  const risk = calculateDeadlineRisk(context)
  const nextActions = suggestNextActions(context)

  // Run AI-powered analyses in parallel
  const [gaps, commentPatterns] = await Promise.all([
    detectArgumentationGaps(deadlineId),
    context.workspace.id
      ? analyzeCommentPatterns(context.workspace.id)
      : Promise.resolve([]),
  ])

  return { risk, gaps, nextActions, commentPatterns }
}
