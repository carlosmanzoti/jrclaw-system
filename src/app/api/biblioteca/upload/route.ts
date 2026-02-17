import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { uploadFile } from "@/lib/storage"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const tipo = (formData.get("tipo") as string) || "OUTRO"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Arquivo muito grande (máx. 50MB)" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const name = file.name.toLowerCase()

    // Upload to storage
    const timestamp = Date.now()
    const year = new Date().getFullYear()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const storagePath = `biblioteca/${tipo.toLowerCase()}/${year}/${timestamp}_${safeName}`

    const url = await uploadFile(buffer, storagePath, file.type)

    // Extract text inline
    let text = ""
    let extractionFailed = false
    let pageCount: number | undefined

    try {
      if (name.endsWith(".pdf")) {
        const pdfParse = (await import("pdf-parse")).default
        const data = await pdfParse(buffer)
        text = data.text
        pageCount = data.numpages
      } else if (name.endsWith(".docx")) {
        const mammoth = await import("mammoth")
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      } else if (name.endsWith(".txt") || name.endsWith(".md")) {
        text = buffer.toString("utf-8")
      } else if (name.endsWith(".xlsx") || name.endsWith(".csv")) {
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(buffer, { type: "buffer" })
        const lines: string[] = []
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          if (sheet) {
            const csv = XLSX.utils.sheet_to_csv(sheet)
            lines.push(`--- ${sheetName} ---\n${csv}`)
          }
        }
        text = lines.join("\n\n")
      } else if (name.endsWith(".rtf")) {
        const raw = buffer.toString("utf-8")
        text = raw
          .replace(/\{\\[^{}]*\}/g, "")
          .replace(/\\[a-z]+\d*\s?/gi, "")
          .replace(/[{}]/g, "")
          .replace(/\r\n/g, "\n")
          .trim()
      }
      // Images and unsupported: text remains empty
    } catch {
      extractionFailed = true
    }

    return NextResponse.json({
      url,
      path: storagePath,
      text,
      chars: text.length,
      filename: file.name,
      extractionFailed,
      pageCount,
    })
  } catch (error: any) {
    console.error("Biblioteca upload error:", error)
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}
