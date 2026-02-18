import { streamText } from "ai"
import { anthropic, MODEL_CONFIGS } from "@/lib/ai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildHarveyChatPrompt, type CRJNegContext } from "@/lib/ai/crj-harvey-prompts"

export const maxDuration = 120

// ---------------------------------------------------------------------------
// Full negotiation include for context
// ---------------------------------------------------------------------------
const CRJ_NEGOTIATION_INCLUDE = {
  creditor: {
    select: {
      nome: true,
      cpf_cnpj: true,
      classe: true,
      natureza: true,
      valor_original: true,
      valor_atualizado: true,
      valor_garantia: true,
      tipo_garantia: true,
      person: {
        select: {
          nome: true,
          segmento: true,
          cidade: true,
          estado: true,
          email: true,
        },
      },
    },
  },
  rounds: {
    orderBy: { round_number: "asc" as const },
    select: {
      round_number: true,
      type: true,
      date: true,
      description: true,
      proposed_by_us: true,
      value_proposed: true,
      outcome: true,
      creditor_response: true,
      next_steps: true,
    },
  },
  proposals: {
    orderBy: { version: "desc" as const },
    take: 5,
    select: {
      version: true,
      template_type: true,
      status: true,
      sent_via_email: true,
      created_at: true,
    },
  },
  emails: {
    orderBy: { sent_at: "desc" as const },
    take: 10,
    select: {
      direction: true,
      subject: true,
      body_preview: true,
      sent_at: true,
    },
  },
  installment_schedule: {
    orderBy: { installment_number: "asc" as const },
    select: {
      installment_number: true,
      due_date: true,
      amount: true,
      status: true,
    },
  },
  jrc: {
    select: {
      status_rj: true,
      total_credores: true,
      total_credito: true,
      case_: {
        select: {
          numero_processo: true,
          vara: true,
          comarca: true,
          uf: true,
          cliente: { select: { nome: true } },
        },
      },
    },
  },
} as const

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const body = await req.json()
  const { messages, negotiationId, jrcId, modelTier = "standard" } = body

  if (!messages || !Array.isArray(messages)) {
    return new Response("Missing messages", { status: 400 })
  }

  // Build context
  const ctx: CRJNegContext = {}

  // Load negotiation data if available
  if (negotiationId) {
    const neg = await db.cRJNegotiation.findUnique({
      where: { id: negotiationId },
      include: CRJ_NEGOTIATION_INCLUDE,
    })
    if (neg) {
      ctx.negotiation = neg as any
      ctx.jrc = neg.jrc as any
    }
  }

  // Load JRC data for portfolio context
  const effectiveJrcId = jrcId || ctx.negotiation?.jrc_id
  if (effectiveJrcId) {
    if (!ctx.jrc) {
      const jrc = await db.judicialRecoveryCase.findUnique({
        where: { id: effectiveJrcId },
        select: {
          status_rj: true,
          total_credores: true,
          total_credito: true,
          case_: {
            select: {
              numero_processo: true,
              vara: true,
              comarca: true,
              uf: true,
              cliente: { select: { nome: true } },
            },
          },
        },
      })
      if (jrc) ctx.jrc = jrc as any
    }

    // Load portfolio summary
    const negotiations = await db.cRJNegotiation.findMany({
      where: { jrc_id: effectiveJrcId },
      select: {
        status: true,
        credit_amount: true,
        agreed_amount: true,
        discount_percentage: true,
      },
    })

    const byStatus: Record<string, number> = {}
    let totalCredit = BigInt(0)
    let totalAgreed = BigInt(0)
    let discountSum = 0
    let discountCount = 0

    for (const n of negotiations) {
      byStatus[n.status] = (byStatus[n.status] || 0) + 1
      totalCredit += n.credit_amount
      if (n.agreed_amount) totalAgreed += n.agreed_amount
      if (n.discount_percentage != null) {
        discountSum += n.discount_percentage
        discountCount++
      }
    }

    ctx.portfolio = {
      total: negotiations.length,
      byStatus,
      avgDiscount: discountCount > 0 ? discountSum / discountCount : 0,
      totalCreditAmount: totalCredit,
      totalAgreedAmount: totalAgreed,
    }
  }

  // Build system prompt
  const systemPrompt = buildHarveyChatPrompt(ctx)

  // Select model
  const config = modelTier === "premium" ? MODEL_CONFIGS.premium : MODEL_CONFIGS.standard
  const modelId = config.model

  const streamOptions: Parameters<typeof streamText>[0] = {
    model: anthropic(modelId),
    system: systemPrompt,
    messages,
    maxOutputTokens: config.maxOutputTokens,
    temperature: config.temperature,
  }

  // Add thinking for premium
  if (config.thinking) {
    ;(streamOptions as any).providerOptions = {
      anthropic: {
        thinking: config.thinking,
      },
    }
  }

  const result = streamText(streamOptions)

  const response = result.toTextStreamResponse()
  response.headers.set("X-AI-Model", modelId)
  response.headers.set("X-AI-Tier", config.tier)
  return response
}
