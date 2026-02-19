import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { AlertType, AlertSeverity, ApiProvider } from "@prisma/client"

/**
 * Standardized payload accepted from any investigation data provider.
 */
interface InvestigationWebhookPayload {
  document: string
  alertType: AlertType
  severity?: AlertSeverity
  title: string
  description: string
  metadata?: Record<string, unknown>
}

/**
 * Map of accepted provider query-param values to Prisma ApiProvider enum values.
 */
const PROVIDER_MAP: Record<string, ApiProvider> = {
  brasilapi: "BRASILAPI",
  cnpja: "CNPJA",
  datajud: "DATAJUD",
  escavador: "ESCAVADOR",
  judit: "JUDIT",
  assertiva: "ASSERTIVA",
  neoway: "NEOWAY",
  bigdatacorp: "BIGDATACORP",
  jusbrasil: "JUSBRASIL",
  serasa: "SERASA",
  boa_vista: "BOA_VISTA",
  quod: "QUOD",
  infosimples: "INFOSIMPLES",
  complyadvantage: "COMPLYADVANTAGE",
  opencorporates: "OPENCORPORATES",
  manual: "MANUAL",
}

/**
 * Generic webhook handler for investigation providers.
 * Accepts a provider name via the `provider` query param and a standardized payload.
 *
 * Example: POST /api/webhooks/investigation?provider=assertiva
 */
export async function POST(req: NextRequest) {
  try {
    // ── Resolve provider ──
    const providerParam = req.nextUrl.searchParams.get("provider")?.toLowerCase()
    if (!providerParam) {
      return NextResponse.json(
        { error: "Missing 'provider' query parameter" },
        { status: 400 },
      )
    }

    const apiProvider = PROVIDER_MAP[providerParam]
    if (!apiProvider) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerParam}` },
        { status: 400 },
      )
    }

    // ── Parse payload ──
    const payload: InvestigationWebhookPayload = await req.json()

    if (!payload.document || !payload.alertType || !payload.title || !payload.description) {
      return NextResponse.json(
        { error: "Missing required fields: document, alertType, title, description" },
        { status: 400 },
      )
    }

    // ── Find matching investigation ──
    const investigation = await db.investigation.findFirst({
      where: {
        targetDocument: payload.document,
        status: { in: ["PENDENTE", "EM_ANDAMENTO", "CONSULTAS_CONCLUIDAS"] },
      },
      select: { id: true },
    })

    if (!investigation) {
      return NextResponse.json({ received: true, matched: false })
    }

    // ── Create alert ──
    const alert = await db.investigationAlert.create({
      data: {
        investigationId: investigation.id,
        alertType: payload.alertType,
        severity: payload.severity ?? "MEDIA",
        title: payload.title,
        description: payload.description,
        sourceProvider: apiProvider,
        triggeredBy: `webhook:${providerParam}`,
      },
    })

    return NextResponse.json({
      received: true,
      matched: true,
      investigationId: investigation.id,
      alertId: alert.id,
    })
  } catch (error) {
    console.error("[Investigation Webhook] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
