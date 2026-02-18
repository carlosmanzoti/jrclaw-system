import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphMailService } from "@/lib/microsoft-graph-mail"
import { getMockMessage } from "@/lib/email-mock-data"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageId } = await params
  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    const msg = getMockMessage(messageId)
    if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ ...msg, mock: true })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    const message = await mail.getMessage(messageId)
    const attachments = message.hasAttachments
      ? await mail.listAttachments(messageId)
      : []
    return NextResponse.json({ ...message, attachments })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageId } = await params
  const body = await request.json()
  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ ok: true, mock: true })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    if (body.isRead !== undefined) await mail.markRead(messageId, body.isRead)
    if (body.flagged !== undefined)
      await mail.toggleFlag(messageId, body.flagged)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageId } = await params
  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ ok: true, mock: true })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    await mail.deleteMessage(messageId)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
