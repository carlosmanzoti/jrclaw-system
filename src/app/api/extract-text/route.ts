import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const name = file.name.toLowerCase()
    let text = ""

    if (name.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf-8")
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
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
      // Basic RTF text extraction: strip control words
      const raw = buffer.toString("utf-8")
      text = raw
        .replace(/\{\\[^{}]*\}/g, "")       // remove groups like {\fonttbl...}
        .replace(/\\[a-z]+\d*\s?/gi, "")     // remove control words
        .replace(/[{}]/g, "")                 // remove braces
        .replace(/\r\n/g, "\n")
        .trim()
    } else {
      return NextResponse.json(
        { error: "Formato não suportado. Use PDF, DOCX, TXT, XLSX, XLS, CSV, RTF ou MD." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      text,
      filename: file.name,
      chars: text.length,
    })
  } catch (err: any) {
    console.error("Error extracting text:", err)
    return NextResponse.json(
      { error: err.message || "Erro ao extrair texto" },
      { status: 500 }
    )
  }
}
