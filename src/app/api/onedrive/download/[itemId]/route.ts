import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphOneDriveService } from "@/lib/microsoft-graph-onedrive"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { itemId } = await params

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ error: "Conta Microsoft não conectada" }, { status: 400 })
  }

  try {
    const driveService = new MicrosoftGraphOneDriveService(session.user.id)

    // Get item metadata for filename
    const item = await driveService.getItem(itemId)

    // Download the file content
    const response = await driveService.downloadFile(itemId)
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": item.file?.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(item.name)}"`,
      },
    })
  } catch (err) {
    console.error("OneDrive download error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao baixar arquivo" },
      { status: 500 }
    )
  }
}
