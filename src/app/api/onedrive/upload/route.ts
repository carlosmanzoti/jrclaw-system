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
    const formData = await request.formData()
    const file = formData.get("file") as File
    const folderId = formData.get("folderId") as string
    const filename = (formData.get("filename") as string) || file.name

    if (!file || !folderId) {
      return NextResponse.json({ error: "file and folderId are required" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const driveService = new MicrosoftGraphOneDriveService(session.user.id)

    const item = await driveService.uploadFile(
      folderId,
      buffer,
      filename,
      file.type || "application/octet-stream"
    )

    return NextResponse.json({
      id: item.id,
      name: item.name,
      size: item.size,
      webUrl: item.webUrl,
    })
  } catch (err) {
    console.error("OneDrive upload error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao fazer upload" },
      { status: 500 }
    )
  }
}
