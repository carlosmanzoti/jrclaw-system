import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

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
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 })
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

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
