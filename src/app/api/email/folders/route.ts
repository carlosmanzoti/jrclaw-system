import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphMailService } from "@/lib/microsoft-graph-mail"
import { MOCK_FOLDERS } from "@/lib/email-mock-data"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ folders: MOCK_FOLDERS, mock: true })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    const folders = await mail.listFolders()
    return NextResponse.json({ folders, mock: false })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
