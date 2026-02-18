import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getWhatsAppProvider } from "@/lib/whatsapp"

// GET — Webhook verification (Meta sends challenge)
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams)
  const provider = getWhatsAppProvider()
  const challenge = provider.verifyWebhook(params)

  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 })
}

// POST — Receive messages + status updates
export async function POST(request: NextRequest) {
  const provider = getWhatsAppProvider()

  // Verify signature
  const signature = request.headers.get("x-hub-signature-256") || ""
  const rawBody = await request.text()

  if (!provider.verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { messages, statuses } = provider.parseIncoming(body)

  // Process incoming messages
  for (const msg of messages) {
    try {
      // Find or create conversation
      let conversation = await db.whatsAppConversation.findUnique({
        where: { phone_number: msg.from },
      })

      if (!conversation) {
        // Try to match with Person by whatsapp/celular field
        const person = await db.person.findFirst({
          where: {
            OR: [
              { whatsapp: msg.from },
              { celular: msg.from },
              { whatsapp: `+${msg.from}` },
              { celular: `+${msg.from}` },
            ],
          },
        })

        conversation = await db.whatsAppConversation.create({
          data: {
            phone_number: msg.from,
            contact_name: msg.fromName || null,
            person_id: person?.id || null,
            last_message: msg.text || `[${msg.type}]`,
            last_message_at: new Date(msg.timestamp),
            last_interaction_at: new Date(msg.timestamp),
            unread_count: 1,
          },
        })
      } else {
        await db.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            contact_name: msg.fromName || conversation.contact_name,
            last_message: msg.text || `[${msg.type}]`,
            last_message_at: new Date(msg.timestamp),
            last_interaction_at: new Date(msg.timestamp),
            unread_count: { increment: 1 },
          },
        })
      }

      // Create message record
      await db.whatsAppMessage.create({
        data: {
          conversation_id: conversation.id,
          direction: "INBOUND",
          type: msg.type.toUpperCase(),
          content: msg.text || null,
          media_url: msg.mediaUrl || null,
          media_filename: msg.mediaFilename || null,
          wa_message_id: msg.messageId,
          status: "DELIVERED",
        },
      })
    } catch (err) {
      console.error("[WhatsApp Webhook] Error processing message:", err)
    }
  }

  // Process status updates
  for (const st of statuses) {
    try {
      if (!st.messageId) continue

      const statusMap: Record<string, string> = {
        sent: "SENT",
        delivered: "DELIVERED",
        read: "READ",
        failed: "FAILED",
      }

      await db.whatsAppMessage.updateMany({
        where: { wa_message_id: st.messageId },
        data: { status: statusMap[st.status] || "SENT" },
      })
    } catch (err) {
      console.error("[WhatsApp Webhook] Error processing status:", err)
    }
  }

  return NextResponse.json({ status: "ok" })
}
