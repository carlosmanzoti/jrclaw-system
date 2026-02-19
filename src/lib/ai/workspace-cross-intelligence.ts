/**
 * Workspace Cross-Intelligence — connects the workspace AI with other modules.
 *
 * Part 20: 5 integration points:
 *   20.1 — Processos: fetch recent movements for context
 *   20.2 — Biblioteca: search relevant entries
 *   20.3 — RJ/Reestruturação: pull creditor data
 *   20.4 — Calendário: upcoming events for this case
 *   20.5 — Dashboard: workspace risk summary widget data
 */

import { db } from "@/lib/db"

// ===========================================================================
// 20.1 — PROCESSOS: Recent movements
// ===========================================================================

export interface ProcessMovement {
  id: string
  data: Date
  tipo: string
  descricao: string
}

export async function fetchRecentMovements(caseId: string, limit = 10): Promise<ProcessMovement[]> {
  try {
    const movements = await db.caseMovement.findMany({
      where: { case_id: caseId },
      orderBy: { data: "desc" },
      take: limit,
      select: {
        id: true,
        data: true,
        tipo: true,
        descricao: true,
      },
    })
    return movements
  } catch (error) {
    console.error("[Cross-Intelligence: fetchRecentMovements]", error)
    return []
  }
}

// ===========================================================================
// 20.2 — BIBLIOTECA: Relevant entries
// ===========================================================================

export interface LibraryMatch {
  id: string
  titulo: string
  tipo: string
  resumo: string | null
  relevancia: number | null
  tags: string[]
}

export async function searchRelevantLibrary(
  keywords: string[],
  area?: string,
  limit = 5
): Promise<LibraryMatch[]> {
  try {
    // Search by keywords in title, resumo, and tags
    const entries = await db.libraryEntry.findMany({
      where: {
        OR: keywords.flatMap(kw => [
          { titulo: { contains: kw, mode: "insensitive" as const } },
          { resumo: { contains: kw, mode: "insensitive" as const } },
          { tags: { has: kw } },
        ]),
        ...(area ? { area: area as any } : {}),
      },
      orderBy: { relevancia: "desc" },
      take: limit,
      select: {
        id: true,
        titulo: true,
        tipo: true,
        resumo: true,
        relevancia: true,
        tags: true,
      },
    })
    return entries
  } catch (error) {
    console.error("[Cross-Intelligence: searchRelevantLibrary]", error)
    return []
  }
}

// ===========================================================================
// 20.3 — RJ/REESTRUTURAÇÃO: Creditor data
// ===========================================================================

export interface CreditorSummary {
  total: number
  byClass: Record<string, number>
  totalValue: number
  approvedVotes: number
  rejectedVotes: number
}

export async function fetchCreditorSummary(caseId: string): Promise<CreditorSummary | null> {
  try {
    const creditors = await db.creditor.findMany({
      where: { case_id: caseId },
      select: {
        classe: true,
        valor_atualizado: true,
        voto: true,
      },
    })

    if (creditors.length === 0) return null

    const byClass: Record<string, number> = {}
    let totalValue = 0
    let approvedVotes = 0
    let rejectedVotes = 0

    for (const c of creditors) {
      byClass[c.classe] = (byClass[c.classe] || 0) + 1
      totalValue += Number(c.valor_atualizado || 0)
      if (c.voto === "FAVORAVEL") approvedVotes++
      if (c.voto === "CONTRARIO") rejectedVotes++
    }

    return {
      total: creditors.length,
      byClass,
      totalValue,
      approvedVotes,
      rejectedVotes,
    }
  } catch (error) {
    console.error("[Cross-Intelligence: fetchCreditorSummary]", error)
    return null
  }
}

// ===========================================================================
// 20.4 — CALENDÁRIO: Upcoming events
// ===========================================================================

export interface UpcomingEvent {
  id: string
  titulo: string
  tipoEvento: string
  dataInicio: Date
  local: string | null
  linkVirtual: string | null
}

export async function fetchUpcomingEvents(
  caseId: string,
  daysAhead = 30,
  limit = 10
): Promise<UpcomingEvent[]> {
  try {
    const now = new Date()
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    const events = await db.calendarEvent.findMany({
      where: {
        case_id: caseId,
        data_inicio: { gte: now, lte: futureDate },
        status: { not: "CANCELADO" },
      },
      orderBy: { data_inicio: "asc" },
      take: limit,
      select: {
        id: true,
        titulo: true,
        tipo_evento: true,
        data_inicio: true,
        local: true,
        link_virtual: true,
      },
    })

    return events.map(e => ({
      id: e.id,
      titulo: e.titulo,
      tipoEvento: e.tipo_evento,
      dataInicio: e.data_inicio,
      local: e.local,
      linkVirtual: e.link_virtual,
    }))
  } catch (error) {
    console.error("[Cross-Intelligence: fetchUpcomingEvents]", error)
    return []
  }
}

// ===========================================================================
// 20.5 — DASHBOARD: Workspace risk summary for widget
// ===========================================================================

export interface WorkspaceRiskItem {
  deadlineId: string
  deadlineCodigo: string
  deadlineTipo: string
  deadlineDescricao: string | null
  dataFimPrazo: Date
  diasRestantes: number
  workspacePhase: string
  checklistProgress: number
  riskLevel: "low" | "medium" | "high" | "critical"
  clienteNome: string | null
  responsavelNome: string | null
}

export async function fetchWorkspaceRiskSummary(limit = 20): Promise<WorkspaceRiskItem[]> {
  try {
    const now = new Date()
    const futureLimit = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days ahead

    const workspaces = await db.deadlineWorkspace.findMany({
      where: {
        phase: { not: "CONCLUIDO" },
        deadline: {
          status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
          data_fim_prazo: { lte: futureLimit },
        },
      },
      include: {
        deadline: {
          include: {
            responsavel: { select: { name: true } },
            case_: {
              select: {
                cliente: { select: { nome: true } },
              },
            },
          },
        },
        checklist_items: true,
      },
      orderBy: { deadline: { data_fim_prazo: "asc" } },
      take: limit,
    })

    return workspaces.map(ws => {
      const dl = ws.deadline
      const diasRestantes = Math.ceil(
        (new Date(dl.data_fim_prazo).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const totalChecklist = ws.checklist_items.length
      const doneChecklist = ws.checklist_items.filter(i => i.checked).length
      const checklistProgress = totalChecklist > 0 ? Math.round((doneChecklist / totalChecklist) * 100) : 0

      let riskLevel: WorkspaceRiskItem["riskLevel"] = "low"
      if (diasRestantes <= 0) riskLevel = "critical"
      else if (diasRestantes <= 1) riskLevel = "critical"
      else if (diasRestantes <= 3 && ws.phase !== "PROTOCOLO") riskLevel = "high"
      else if (diasRestantes <= 7 && checklistProgress < 50) riskLevel = "medium"

      return {
        deadlineId: dl.id,
        deadlineCodigo: dl.codigo,
        deadlineTipo: dl.tipo,
        deadlineDescricao: dl.descricao,
        dataFimPrazo: dl.data_fim_prazo,
        diasRestantes,
        workspacePhase: ws.phase,
        checklistProgress,
        riskLevel,
        clienteNome: dl.case_?.cliente?.nome || null,
        responsavelNome: dl.responsavel?.name || null,
      }
    })
  } catch (error) {
    console.error("[Cross-Intelligence: fetchWorkspaceRiskSummary]", error)
    return []
  }
}

// ===========================================================================
// Combined cross-intelligence for a workspace
// ===========================================================================

export interface CrossIntelligence {
  movements: ProcessMovement[]
  libraryMatches: LibraryMatch[]
  creditorSummary: CreditorSummary | null
  upcomingEvents: UpcomingEvent[]
}

export async function getCrossIntelligence(
  caseId: string | null,
  keywords: string[],
  area?: string
): Promise<CrossIntelligence> {
  const [movements, libraryMatches, creditorSummary, upcomingEvents] = await Promise.all([
    caseId ? fetchRecentMovements(caseId) : Promise.resolve([]),
    keywords.length > 0 ? searchRelevantLibrary(keywords, area) : Promise.resolve([]),
    caseId ? fetchCreditorSummary(caseId) : Promise.resolve(null),
    caseId ? fetchUpcomingEvents(caseId) : Promise.resolve([]),
  ])

  return { movements, libraryMatches, creditorSummary, upcomingEvents }
}
