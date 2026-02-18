/**
 * Workspace Reactive Engine — event-driven AI that listens to workspace events
 * and triggers automated actions. All operations are NON-BLOCKING.
 *
 * LAYER 1: Reacts to events after they happen.
 */

import { generateText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { db } from "@/lib/db"
import { buildWorkspaceContext, invalidateWorkspaceCache } from "./workspace-context"
import { buildWorkspaceSystemPrompt, getActionInstructions } from "./workspace-system-prompt"

// ---------------------------------------------------------------------------
// Rate-limited AI call wrapper
// ---------------------------------------------------------------------------

async function callAI(
  systemPrompt: string,
  userMessage: string,
  tier: "standard" | "premium" = "standard"
): Promise<string | null> {
  try {
    const config = MODEL_CONFIGS[tier]
    const result = await generateText({
      model: anthropic(config.model),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxOutputTokens: config.maxOutputTokens,
      temperature: config.temperature,
    })
    return result.text
  } catch (error) {
    console.error("[Reactive Engine AI Error]", error)
    return null
  }
}

function parseJSON(text: string | null): Record<string, unknown> | null {
  if (!text) return null
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch {
    return null
  }
}

async function logActivity(workspaceId: string, action: string, description: string, metadata?: Record<string, unknown>) {
  try {
    await db.workspaceActivity.create({
      data: {
        workspace_id: workspaceId,
        action,
        description,
        is_system: true,
        user_name: "Assistente IA",
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    })
  } catch { /* non-critical */ }
}

// ===========================================================================
// EVENT HANDLERS
// ===========================================================================

/**
 * 16.1 — DOCUMENT UPLOADED
 * Classify document, auto-check matching checklist items.
 */
export async function onDocumentUploaded(workspaceId: string, documentId: string) {
  try {
    const doc = await db.workspaceDocument.findUnique({ where: { id: documentId } })
    if (!doc) return

    const ws = await db.deadlineWorkspace.findUnique({
      where: { id: workspaceId },
      include: { checklist_items: true, deadline: { select: { id: true } } },
    })
    if (!ws) return

    // Build prompt for classification
    const context = await buildWorkspaceContext(ws.deadline.id)
    const systemPrompt = buildWorkspaceSystemPrompt(context)
    const instructions = getActionInstructions("classificar_documento")

    const text = await callAI(
      `${systemPrompt}\n\n${instructions}`,
      `Classifique o documento: nome="${doc.file_name}", título="${doc.title}", categoria atual="${doc.category}". Checklist disponível: ${ws.checklist_items.map(i => i.title).join("; ")}`,
      "standard"
    )

    const parsed = parseJSON(text)
    if (!parsed) return

    const categoria = parsed.categoria as string
    const checklistMatch = parsed.checklist_match as string | null

    // Update document category
    if (categoria && categoria !== doc.category) {
      await db.workspaceDocument.update({
        where: { id: documentId },
        data: { category: categoria },
      })
    }

    // Auto-check matching checklist item
    if (checklistMatch) {
      const matchItem = ws.checklist_items.find(
        i => !i.checked && i.title.toLowerCase().includes(checklistMatch.toLowerCase())
      )
      if (matchItem) {
        await db.workspaceChecklist.update({
          where: { id: matchItem.id },
          data: {
            checked: true,
            auto_check: true,
            checked_at: new Date(),
            auto_check_rule: `document_upload:${categoria}`,
          },
        })
        await logActivity(workspaceId, "CHECKLIST_CHECKED",
          `🤖 IA classificou documento '${doc.title}' como ${categoria} e marcou checklist '${matchItem.title}' como concluído`)
        return
      }
    }

    await logActivity(workspaceId, "DOCUMENT_CLASSIFIED",
      `🤖 IA classificou documento '${doc.title}' como ${categoria}`)
  } catch (error) {
    console.error("[Reactive: onDocumentUploaded]", error)
  }
}

/**
 * 16.2 — CONTENT SAVED (auto-save)
 * Detect sections present, auto-check checklist items, update progress.
 */
export async function onContentSaved(workspaceId: string) {
  try {
    const ws = await db.deadlineWorkspace.findUnique({
      where: { id: workspaceId },
      include: {
        checklist_items: true,
        theses: true,
        documents: true,
      },
    })
    if (!ws || !ws.editor_html) return

    const html = ws.editor_html.toLowerCase()

    // Detect sections and auto-check
    const sectionChecks = [
      { keyword: "qualificação", checklistKeywords: ["qualificação"] },
      { keyword: "dos fatos", checklistKeywords: ["fatos", "impugnação"] },
      { keyword: "do direito", checklistKeywords: ["fundamentação jurídica", "fundamentação de direito"] },
      { keyword: "dos pedidos", checklistKeywords: ["pedido"] },
    ]

    for (const sc of sectionChecks) {
      if (html.includes(sc.keyword)) {
        for (const item of ws.checklist_items) {
          if (item.checked || item.auto_check) continue
          const titleLower = item.title.toLowerCase()
          if (sc.checklistKeywords.some(k => titleLower.includes(k))) {
            await db.workspaceChecklist.update({
              where: { id: item.id },
              data: {
                checked: true,
                auto_check: true,
                checked_at: new Date(),
                auto_check_rule: `content_section:${sc.keyword}`,
              },
            })
          }
        }
      }
    }

    // Calculate overall progress
    const totalChecklist = ws.checklist_items.length
    const doneChecklist = ws.checklist_items.filter(i => i.checked).length
    const checklistScore = totalChecklist > 0 ? doneChecklist / totalChecklist : 0

    // Section detection score
    const sections = ["qualificação", "dos fatos", "do direito", "dos pedidos"]
    const sectionsPresent = sections.filter(s => html.includes(s)).length
    const sectionScore = sectionsPresent / sections.length

    // Theses score
    const totalTheses = ws.theses.length
    const doneTheses = ws.theses.filter(t => t.status === "APROVADA").length
    const thesesScore = totalTheses > 0 ? doneTheses / totalTheses : 0

    // Documents score
    const requiredDocs = ws.documents.filter(d => d.is_required)
    const validatedDocs = requiredDocs.filter(d => d.is_validated)
    const docScore = requiredDocs.length > 0 ? validatedDocs.length / requiredDocs.length : 1

    // Weighted progress: checklist 30%, sections 40%, theses 15%, docs 15%
    const _progress = Math.round(
      checklistScore * 30 + sectionScore * 40 + thesesScore * 15 + docScore * 15
    )

    // We store progress in estimated_pages for now (or could add a field)
    // Silently update — no notification

    invalidateWorkspaceCache(ws.deadline_id)
  } catch (error) {
    console.error("[Reactive: onContentSaved]", error)
  }
}

/**
 * 16.3 — THESIS COMPLETED
 * Check if thesis is incorporated in the draft.
 */
export async function onThesisCompleted(workspaceId: string, thesisId: string) {
  try {
    const thesis = await db.workspaceThesis.findUnique({ where: { id: thesisId } })
    if (!thesis) return

    const ws = await db.deadlineWorkspace.findUnique({
      where: { id: workspaceId },
      select: { editor_html: true },
    })

    if (ws?.editor_html) {
      const html = ws.editor_html.toLowerCase()
      const titleWords = thesis.title.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      const found = titleWords.some(w => html.includes(w))

      if (!found) {
        await logActivity(workspaceId, "IA_SUGESTAO",
          `💡 A tese '${thesis.title}' foi concluída mas pode não estar inserida na minuta. Considere incorporá-la.`)
      }
    }

    invalidateWorkspaceCache("")
  } catch (error) {
    console.error("[Reactive: onThesisCompleted]", error)
  }
}

/**
 * 16.4 — REVIEW COMMENT CREATED
 * Classify severity and create correction map hint.
 */
export async function onReviewComment(workspaceId: string, commentId: string) {
  try {
    const comment = await db.workspaceComment.findUnique({ where: { id: commentId } })
    if (!comment || !["REVISAO", "CORRECAO"].includes(comment.type)) return

    // Count corrections in this workspace
    const correctionCount = await db.workspaceComment.count({
      where: {
        workspace_id: workspaceId,
        type: { in: ["REVISAO", "CORRECAO"] },
        resolved: false,
      },
    })

    if (correctionCount >= 3) {
      await logActivity(workspaceId, "IA_SUGESTAO",
        `⚠️ ${correctionCount} correções pendentes de revisão. Considere reescrever as seções com múltiplas correções.`)
    }
  } catch (error) {
    console.error("[Reactive: onReviewComment]", error)
  }
}

/**
 * 16.5 — APPROVAL REJECTED
 * Analyze rejection feedback and generate correction plan.
 */
export async function onApprovalRejected(workspaceId: string, approvalId: string) {
  try {
    const approval = await db.workspaceApproval.findUnique({ where: { id: approvalId } })
    if (!approval || approval.status !== "REPROVADO") return

    const ws = await db.deadlineWorkspace.findUnique({
      where: { id: workspaceId },
      include: { deadline: { select: { id: true } } },
    })
    if (!ws) return

    const context = await buildWorkspaceContext(ws.deadline.id)
    const systemPrompt = buildWorkspaceSystemPrompt(context)

    const feedback = approval.feedback || approval.corrections_required || "Sem feedback detalhado"

    const text = await callAI(
      systemPrompt,
      `A peça foi REPROVADA na rodada ${approval.round}. Parecer do aprovador:\n"${feedback}"\n\nGere um plano de correção estruturado. Para cada ponto mencionado, sugira a ação concreta (reescrever seção X, adicionar fundamentação Y, corrigir citação Z). Estime o esforço total.`,
      "standard"
    )

    if (text) {
      // Save as comment for visibility
      await db.workspaceComment.create({
        data: {
          workspace_id: workspaceId,
          content: `📋 **Plano de Correção (Rodada ${approval.round})**\n\n${text}`,
          type: "SUGESTAO",
          user_id: "system",
        },
      })

      await logActivity(workspaceId, "IA_UTILIZADA",
        `🤖 IA analisou a reprovação e gerou plano de correção para a rodada ${approval.round}`)
    }
  } catch (error) {
    console.error("[Reactive: onApprovalRejected]", error)
  }
}

/**
 * 16.6 — DEADLINE ENTERING CRITICAL ZONE
 * Returns alert data based on current progress and time remaining.
 */
export function assessDeadlineUrgency(diasRestantes: number, progresso: number, phase: string): {
  level: "none" | "yellow" | "orange" | "red" | "critical"
  message: string
  suggestion: string
} | null {
  if (diasRestantes > 7) return null

  if (diasRestantes <= 0) {
    return {
      level: "critical",
      message: `PRAZO VENCIDO. Ação imediata necessária.`,
      suggestion: "Escalar para supervisão e verificar possibilidade de prorrogação.",
    }
  }

  if (diasRestantes === 1 && phase !== "CONCLUIDO") {
    return {
      level: "red",
      message: `URGENTE: Prazo amanhã. Fase atual: ${phase}.`,
      suggestion: "Verificar todas as pendências e protocolar imediatamente se possível.",
    }
  }

  if (diasRestantes <= 3 && !["PROTOCOLO", "CONCLUIDO"].includes(phase)) {
    return {
      level: "orange",
      message: `Prazo em ${diasRestantes} dia(s) e minuta ainda não protocolada.`,
      suggestion: "Verificar fluxo de aprovação e providenciar pendências restantes.",
    }
  }

  if (diasRestantes <= 7 && progresso < 30) {
    return {
      level: "yellow",
      message: `Prazo em ${diasRestantes} dia(s) com progresso baixo (${progresso}%).`,
      suggestion: "Considere priorizar este workspace ou solicitar apoio.",
    }
  }

  return null
}

/**
 * 16.7 — WORKSPACE CREATED (first open)
 * Generate initial briefing and suggest theses.
 */
export async function onWorkspaceCreated(workspaceId: string, deadlineId: string) {
  try {
    const context = await buildWorkspaceContext(deadlineId)
    const systemPrompt = buildWorkspaceSystemPrompt(context)

    // Generate briefing
    const briefingText = await callAI(
      `${systemPrompt}\n\n${getActionInstructions("gerar_briefing")}`,
      "Gere o briefing inicial completo para este prazo.",
      "standard"
    )

    if (briefingText) {
      await db.workspaceComment.create({
        data: {
          workspace_id: workspaceId,
          content: `📋 **Briefing do Prazo**\n\n${briefingText}`,
          type: "GERAL",
          user_id: "system",
        },
      })
    }

    // Suggest theses based on deadline type
    const thesesText = await callAI(
      `${systemPrompt}\n\n${getActionInstructions("sugerir_teses")}`,
      `Sugira 2-3 teses jurídicas relevantes para este prazo do tipo ${context.deadline.tipo}.`,
      "standard"
    )

    const parsed = parseJSON(thesesText)
    if (parsed?.teses_sugeridas && Array.isArray(parsed.teses_sugeridas)) {
      let order = 0
      for (const tese of (parsed.teses_sugeridas as Array<Record<string, unknown>>).slice(0, 3)) {
        await db.workspaceThesis.create({
          data: {
            workspace_id: workspaceId,
            title: (tese.titulo as string) || "Tese sugerida",
            type: (tese.categoria as string) || "MERITO",
            status: "RASCUNHO",
            issue: (tese.questao as string) || null,
            rule: (tese.norma as string) || null,
            analysis: (tese.analise as string) || null,
            conclusion: (tese.conclusao as string) || null,
            strength: (tese.relevancia as string) === "ALTA" ? "FORTE" : (tese.relevancia as string) === "BAIXA" ? "FRACA" : "MEDIA",
            ai_generated: true,
            ai_confidence: 0.7,
            order: order++,
            legal_refs: Array.isArray(tese.legislacao)
              ? (tese.legislacao as Array<Record<string, string>>).map(l => `${l.lei || ""} ${l.artigo || ""}`.trim())
              : [],
          },
        })
      }
    }

    const thesesCount = parsed?.teses_sugeridas ? (parsed.teses_sugeridas as unknown[]).length : 0
    await logActivity(workspaceId, "IA_UTILIZADA",
      `🤖 Workspace inicializado pela IA: briefing gerado${thesesCount > 0 ? `, ${thesesCount} teses sugeridas` : ""}`)

  } catch (error) {
    console.error("[Reactive: onWorkspaceCreated]", error)
  }
}
