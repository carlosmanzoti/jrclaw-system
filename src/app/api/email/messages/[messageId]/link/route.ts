import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageId } = await params
  const { caseId, projectId, subject, fromEmail, fromName, receivedAt, notes } =
    await request.json()

  try {
    const link = await db.emailLink.upsert({
      where: {
        outlookMsgId_userId: {
          outlookMsgId: messageId,
          userId: session.user.id,
        },
      },
      update: { caseId, projectId, notes },
      create: {
        outlookMsgId: messageId,
        userId: session.user.id,
        caseId,
        projectId,
        subject,
        fromEmail: fromEmail || "",
        fromName,
        receivedAt: receivedAt ? new Date(receivedAt) : undefined,
        notes,
      },
    })

    return NextResponse.json(link)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
