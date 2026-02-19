import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hasPermission } from "@/lib/rbac"
import { audit } from "@/lib/audit"

/**
 * LGPD — Anonymize personal data (right to deletion / Art. 18, VI).
 * Replaces PII with anonymized markers. Only ADMIN can execute.
 * Does NOT delete records to preserve referential integrity.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const role = (session.user as any).role
    if (!hasPermission(role, "lgpd:delete")) {
      return NextResponse.json({ error: "Sem permissão — somente ADMIN" }, { status: 403 })
    }

    const { personId, reason } = await req.json()
    if (!personId || !reason) {
      return NextResponse.json({ error: "personId e reason obrigatórios" }, { status: 400 })
    }

    const person = await db.person.findUnique({ where: { id: personId } })
    if (!person) {
      return NextResponse.json({ error: "Pessoa não encontrada" }, { status: 404 })
    }

    // Check if person has active cases (block anonymization)
    const activeCases = await db.caseParty.count({
      where: {
        person_id: personId,
        case_: { status: { in: ["ATIVO", "SUSPENSO"] } },
      },
    })

    if (activeCases > 0) {
      return NextResponse.json(
        { error: `Pessoa tem ${activeCases} processo(s) ativo(s). Encerre-os antes de anonimizar.` },
        { status: 409 }
      )
    }

    const anonymizedName = `[ANONIMIZADO-${personId.slice(-6).toUpperCase()}]`

    // Anonymize the person record
    await db.person.update({
      where: { id: personId },
      data: {
        nome: anonymizedName,
        cpf_cnpj: null,
        rg: null,
        orgao_emissor: null,
        email: null,
        email_secundario: null,
        celular: null,
        telefone_fixo: null,
        whatsapp: null,
        logradouro: null,
        numero: null,
        complemento: null,
        bairro: null,
        cidade: null,
        estado: null,
        cep: null,
        data_nascimento: null,
        nacionalidade: null,
        estado_civil: null,
        profissao: null,
        banco: null,
        agencia: null,
        conta: null,
        pix: null,
        observacoes: null,
        portal_access: false,
        portal_password: null,
      },
    })

    // Delete personal documents
    await db.personDocument.deleteMany({ where: { person_id: personId } })

    // Delete portal messages
    await db.portalMessage.deleteMany({ where: { person_id: personId } })

    // Audit
    await audit({
      userId: session.user.id,
      userEmail: session.user.email || undefined,
      userRole: role,
      action: "DELETE",
      resource: "Person",
      resourceId: personId,
      description: `LGPD anonymization: ${person.nome} → ${anonymizedName}. Reason: ${reason}`,
      oldValues: { nome: person.nome, cpf_cnpj: person.cpf_cnpj, email: person.email },
      newValues: { nome: anonymizedName },
    })

    return NextResponse.json({
      success: true,
      message: `Dados de ${person.nome} anonimizados com sucesso`,
      anonymizedAs: anonymizedName,
    })
  } catch (error) {
    console.error("[LGPD Anonymize]", error)
    return NextResponse.json({ error: "Erro ao anonimizar dados" }, { status: 500 })
  }
}
