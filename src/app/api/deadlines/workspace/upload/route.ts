import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/storage"

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const workspaceId = formData.get("workspaceId") as string | null

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId obrigatório" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Arquivo muito grande (máx. 50MB)" }, { status: 400 })
    }

    // Allow common document types; skip strict check for edge cases
    const mimeOk = ALLOWED_TYPES.has(file.type) || file.type === "" || file.type === "application/octet-stream"
    const extOk = /\.(pdf|doc|docx|odt|jpg|jpeg|png|xls|xlsx)$/i.test(file.name)
    if (!mimeOk && !extOk) {
      return NextResponse.json(
        { error: `Tipo de arquivo não suportado: ${file.type || file.name}` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `workspace/${workspaceId}/${timestamp}_${safeName}`

    const url = await uploadFile(buffer, storagePath, file.type || "application/octet-stream")

    return NextResponse.json({
      url,
      path: storagePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (error: any) {
    console.error("[Workspace Upload Error]", error)
    return NextResponse.json(
      { error: error.message || "Falha no upload" },
      { status: 500 }
    )
  }
}
