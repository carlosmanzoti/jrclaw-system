import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphOneDriveService } from "@/lib/microsoft-graph-onedrive"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json({ error: "Conta Microsoft não conectada" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { itemId, titulo, tipo, case_id, project_id } = body

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 })
    }

    const driveService = new MicrosoftGraphOneDriveService(session.user.id)
    const item = await driveService.getItem(itemId)

    const document = await db.document.create({
      data: {
        titulo: titulo || item.name,
        tipo: (tipo || "OUTRO") as never,
        arquivo_url: item.webUrl,
        onedrive_item_id: item.id,
        onedrive_web_url: item.webUrl,
        case_id: case_id || null,
        project_id: project_id || null,
        criado_por_id: session.user.id,
      },
    })

    return NextResponse.json({
      id: document.id,
      titulo: document.titulo,
      onedrive_web_url: item.webUrl,
    })
  } catch (err) {
    console.error("OneDrive import error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao importar arquivo" },
      { status: 500 }
    )
  }
}
