import { NextResponse } from "next/server"
import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@/lib/db"

/**
 * Portal data API — returns cases, documents, activities, messages for the authenticated person.
 * SECURITY: ALL queries filter by person_id (portal session).
 */

export async function GET(req: Request) {
  const session = await getPortalSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const section = url.searchParams.get("section")
  const personId = session.personId

  // Log portal access (LGPD)
  await db.systemConfig.upsert({
    where: { key: `portal_access_log:${personId}` },
    update: { value: new Date().toISOString() },
    create: { key: `portal_access_log:${personId}`, value: new Date().toISOString() },
  }).catch(() => {})

  if (section === "processos") {
    const cases = await db.case.findMany({
      where: { cliente_id: personId },
      select: {
        id: true,
        numero_processo: true,
        tipo: true,
        status: true,
        fase_processual: true,
        vara: true,
        comarca: true,
        tribunal: true,
        uf: true,
        valor_causa: true,
        advogado_responsavel: { select: { name: true } },
        updated_at: true,
      },
      orderBy: { updated_at: "desc" },
    })
    return NextResponse.json({ cases })
  }

  if (section === "documentos") {
    const docs = await db.document.findMany({
      where: {
        case_: { cliente_id: personId },
        compartilhado_portal: true,
      },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        arquivo_url: true,
        created_at: true,
        case_: { select: { numero_processo: true } },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    })
    return NextResponse.json({ documents: docs })
  }

  if (section === "atividades") {
    const activities = await db.activity.findMany({
      where: {
        case_: { cliente_id: personId },
        visivel_portal: true,
      },
      select: {
        id: true,
        tipo: true,
        descricao: true,
        data: true,
        resultado: true,
        case_: { select: { numero_processo: true } },
        user: { select: { name: true } },
      },
      orderBy: { data: "desc" },
      take: 100,
    })
    return NextResponse.json({ activities })
  }

  if (section === "mensagens") {
    const messages = await db.portalMessage.findMany({
      where: { person_id: personId },
      orderBy: { created_at: "desc" },
      take: 100,
    })
    return NextResponse.json({ messages })
  }

  // Default: summary
  const [totalCases, totalDocs, recentActivities] = await Promise.all([
    db.case.count({ where: { cliente_id: personId } }),
    db.document.count({ where: { case_: { cliente_id: personId }, compartilhado_portal: true } }),
    db.activity.findMany({
      where: { case_: { cliente_id: personId }, visivel_portal: true },
      orderBy: { data: "desc" },
      take: 5,
      select: { id: true, tipo: true, descricao: true, data: true, case_: { select: { numero_processo: true } } },
    }),
  ])

  return NextResponse.json({
    summary: {
      nome: session.nome,
      totalCases,
      totalDocs,
      recentActivities,
    },
  })
}
