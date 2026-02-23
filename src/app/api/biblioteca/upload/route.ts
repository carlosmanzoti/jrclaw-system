// Polyfill DOMMatrix for pdf-parse (pdfjs-dist requires it but it only exists in browsers)
if (typeof globalThis.DOMMatrix === "undefined") {
  ;(globalThis as any).DOMMatrix = class DOMMatrix {
    m11=1;m12=0;m13=0;m14=0;m21=0;m22=1;m23=0;m24=0;
    m31=0;m32=0;m33=1;m34=0;m41=0;m42=0;m43=0;m44=1;
    a=1;b=0;c=0;d=1;e=0;f=0;is2D=true;isIdentity=true;
    constructor(..._args: any[]) {}
    transformPoint() { return { x: 0, y: 0, z: 0, w: 1 } }
    multiply() { return new DOMMatrix() }
    inverse() { return new DOMMatrix() }
    translate() { return new DOMMatrix() }
    scale() { return new DOMMatrix() }
    rotate() { return new DOMMatrix() }
    toString() { return "matrix(1,0,0,1,0,0)" }
    static fromMatrix() { return new DOMMatrix() }
    static fromFloat32Array() { return new DOMMatrix() }
    static fromFloat64Array() { return new DOMMatrix() }
  }
}

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
