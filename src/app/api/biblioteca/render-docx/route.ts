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

    const mammoth = await import("mammoth")
    const result = await mammoth.convertToHtml({ buffer })

    return NextResponse.json({
      html: result.value,
      messages: result.messages,
    })
  } catch (error: any) {
    console.error("Render DOCX error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to render DOCX" },
      { status: 500 }
    )
  }
}
