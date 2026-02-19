import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createHmac } from "crypto"

/**
 * Webhook handler for Escavador callback notifications.
 * Escavador sends movement/process updates via POST with HMAC signature.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Verify webhook signature ──
    const signature = req.headers.get("x-escavador-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 })
    }

    const rawBody = await req.text()
    const secret = process.env.ESCAVADOR_WEBHOOK_SECRET
    if (!secret) {
      console.error("[Escavador Webhook] ESCAVADOR_WEBHOOK_SECRET not configured")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // ── Parse body ──
    const payload = JSON.parse(rawBody) as {
      event: string
      document: string
      data: {
        caseNumber?: string
        court?: string
        subject?: string
        movementDate?: string
        movementDescription?: string
        parties?: string[]
      }
    }

    // ── Find matching investigation by target document ──
    const investigation = await db.investigation.findFirst({
      where: {
        targetDocument: payload.document,
        autoMonitor: true,
        status: { in: ["PENDENTE", "EM_ANDAMENTO", "CONSULTAS_CONCLUIDAS"] },
      },
      select: { id: true, targetName: true },
    })

    if (!investigation) {
      // No matching investigation — acknowledge but do nothing
      return NextResponse.json({ received: true, matched: false })
    }

    // ── Create alert for new process/movement ──
    await db.investigationAlert.create({
      data: {
        investigationId: investigation.id,
        alertType: "NOVO_PROCESSO",
        severity: "ALTA",
        title: payload.data.caseNumber
          ? `Novo processo detectado: ${payload.data.caseNumber}`
          : `Nova movimentacao para ${investigation.targetName}`,
        description: [
          payload.data.caseNumber && `Processo: ${payload.data.caseNumber}`,
          payload.data.court && `Tribunal: ${payload.data.court}`,
          payload.data.subject && `Assunto: ${payload.data.subject}`,
          payload.data.movementDate && `Data: ${payload.data.movementDate}`,
          payload.data.movementDescription && `Movimentacao: ${payload.data.movementDescription}`,
        ]
          .filter(Boolean)
          .join("\n"),
        sourceProvider: "ESCAVADOR",
        triggeredBy: "webhook:escavador",
      },
    })

    return NextResponse.json({ received: true, matched: true, investigationId: investigation.id })
  } catch (error) {
    console.error("[Escavador Webhook] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
