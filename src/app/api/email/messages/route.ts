import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphMailService } from "@/lib/microsoft-graph-mail"
import { getMockMessages } from "@/lib/email-mock-data"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const folder = searchParams.get("folder") || "inbox"
  const search = searchParams.get("search") || undefined
  const nextLink = searchParams.get("nextLink") || undefined

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    const messages = getMockMessages(folder)
    return NextResponse.json({ messages, nextLink: null, mock: true })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    const result = await mail.listMessages(folder, { search, nextLink, top: 25 })

    // Enrich with EmailLink data
    const msgIds = result.messages.map((m) => m.id)
    const links = await db.emailLink.findMany({
      where: { outlookMsgId: { in: msgIds }, userId: session.user.id },
      include: {
        case: { select: { id: true, numero_processo: true } },
      },
    })
    const linkMap = new Map(links.map((l) => [l.outlookMsgId, l]))

    const enriched = result.messages.map((m) => {
      const link = linkMap.get(m.id)
      if (link) {
        return {
          ...m,
          linkedCaseId: link.caseId,
          linkedCase: link.case
            ? { id: link.case.id, title: link.case.numero_processo || "" }
            : undefined,
        }
      }
      return m
    })

    return NextResponse.json({
      messages: enriched,
      nextLink: result.nextLink,
      mock: false,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
