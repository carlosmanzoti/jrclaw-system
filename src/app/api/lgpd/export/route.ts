import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/rbac"
import { audit } from "@/lib/audit"

/**
 * LGPD — Export all personal data for a given person.
 * Only SOCIO+ can execute. Creates audit trail.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const role = (session.user as any).role
    if (!hasPermission(role, "lgpd:export")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { personId } = await req.json()
    if (!personId) {
      return NextResponse.json({ error: "personId obrigatório" }, { status: 400 })
    }

    // Fetch all person data across the system
    const person = await db.person.findUnique({
      where: { id: personId },
      include: {
        person_documents: true,
        case_parties: {
          include: {
            case_: { select: { id: true, numero_processo: true, tipo: true, status: true } },
          },
        },
        project_stakeholders: {
          include: {
            project: { select: { id: true, titulo: true, status: true } },
          },
        },
        portal_messages: {
          select: { id: true, direction: true, content: true, created_at: true },
        },
      },
    })

    if (!person) {
      return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 })
    }

    // Fetch activities referencing this person via their cases
    const caseIds = person.case_parties.map((cp: any) => cp.case_id)
    const activities = caseIds.length > 0
      ? await db.activity.findMany({
          where: { case_id: { in: caseIds } },
          select: { id: true, tipo: true, descricao: true, data: true },
          take: 500,
        })
      : []

    // Fetch fees linked to this person
    const fees = await db.fee.findMany({
      where: { person_id: personId },
      select: { id: true, tipo: true, descricao: true, valor: true, status: true, data_vencimento: true },
    })

    // Build export package
    const exportData = {
      exportDate: new Date().toISOString(),
      requestedBy: session.user.email,
      lgpdBasis: "Art. 18, V da LGPD — Direito de acesso aos dados",
      person: {
        id: person.id,
        tipo: person.tipo,
        subtipo: person.subtipo,
        nome: person.nome,
        cpfCnpj: person.cpf_cnpj,
        email: person.email,
        celular: person.celular,
        endereco: {
          logradouro: person.logradouro,
          numero: person.numero,
          complemento: person.complemento,
          bairro: person.bairro,
          cidade: person.cidade,
          estado: person.estado,
          cep: person.cep,
        },
        createdAt: person.created_at,
      },
      documents: person.person_documents.map((d: any) => ({
        id: d.id,
        tipo: d.tipo,
        titulo: d.titulo,
        uploadedAt: d.uploaded_at,
      })),
      caseInvolvements: person.case_parties.map((cp: any) => ({
        caseNumber: cp.case_?.numero_processo,
        role: cp.role,
        caseType: cp.case_?.tipo,
        caseStatus: cp.case_?.status,
      })),
      projectInvolvements: person.project_stakeholders.map((ps: any) => ({
        projectTitle: ps.project?.titulo,
        role: ps.role,
        projectStatus: ps.project?.status,
      })),
      activities: activities.map((a: any) => ({
        id: a.id,
        tipo: a.tipo,
        descricao: a.descricao,
        data: a.data,
      })),
      fees: fees.map((f: any) => ({
        id: f.id,
        tipo: f.tipo,
        descricao: f.descricao,
        valor: Number(f.valor),
        status: f.status,
      })),
      portalMessages: person.portal_messages.map((m: any) => ({
        direction: m.direction,
        content: m.content,
        date: m.created_at,
      })),
    }

    // Audit the export
    await audit({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      userRole: role,
      action: "EXPORT",
      resource: "Person",
      resourceId: personId,
      description: `LGPD data export for ${person.nome} (${person.cpf_cnpj})`,
    })

    return NextResponse.json(exportData)
  } catch (error) {
    console.error("[LGPD Export]", error)
    return NextResponse.json({ error: "Erro ao exportar dados" }, { status: 500 })
  }
}
