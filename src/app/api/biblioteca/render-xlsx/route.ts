import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import fs from "fs"
import path from "path"

async function fetchFileBuffer(url: string): Promise<Buffer> {
  // Local file path (starts with /uploads/)
  if (url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", url)
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found")
    }
    return fs.readFileSync(filePath)
  }

  // Remote URL
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error("Failed to fetch file")
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  try {
    const buffer = await fetchFileBuffer(url)

    const XLSX = await import("xlsx")
    const workbook = XLSX.read(buffer, { type: "buffer" })

    const MAX_ROWS = 1000
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name]
      if (!sheet) return { name, rows: [] }
      const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][]
      return {
        name,
        rows: json.slice(0, MAX_ROWS),
      }
    })

    return NextResponse.json({ sheets })
  } catch (error: any) {
    console.error("Render XLSX error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to render XLSX" },
      { status: 500 }
    )
  }
}
