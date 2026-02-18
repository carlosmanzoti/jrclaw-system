import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { classifyEmail } from "@/lib/email-classifier"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { messageId } = await params
  const { subject, bodyPreview, fromEmail, fromName } = await request.json()

  try {
    const result = await classifyEmail(
      messageId,
      subject,
      bodyPreview,
      fromEmail,
      fromName
    )
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
