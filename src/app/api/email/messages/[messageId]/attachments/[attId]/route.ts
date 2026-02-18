import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphMailService } from "@/lib/microsoft-graph-mail"

export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ messageId: string; attId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageId, attId } = await params
  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ error: "Not connected" }, { status: 400 })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    const att = await mail.downloadAttachment(messageId, attId)
    return new NextResponse(new Uint8Array(att.data), {
      headers: {
        "Content-Type": att.contentType,
        "Content-Disposition": `attachment; filename="${att.name}"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
