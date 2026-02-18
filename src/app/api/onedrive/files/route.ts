import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphOneDriveService } from "@/lib/microsoft-graph-onedrive"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get("folderId") || undefined

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ connected: false, items: [] })
  }

  try {
    const driveService = new MicrosoftGraphOneDriveService(session.user.id)
    const items = await driveService.listFiles(folderId)

    // Sort: folders first, then files
    const sorted = items.sort((a, b) => {
      if (a.folder && !b.folder) return -1
      if (!a.folder && b.folder) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      connected: true,
      items: sorted.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        webUrl: item.webUrl,
        lastModified: item.lastModifiedDateTime,
        isFolder: !!item.folder,
        childCount: item.folder?.childCount || 0,
        mimeType: item.file?.mimeType || null,
      })),
    })
  } catch (err) {
    console.error("OneDrive listFiles error:", err)
    return NextResponse.json(
      { connected: true, items: [], error: err instanceof Error ? err.message : "Erro ao listar arquivos" },
      { status: 500 }
    )
  }
}
