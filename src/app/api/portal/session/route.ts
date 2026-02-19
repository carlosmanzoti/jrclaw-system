import { NextResponse } from "next/server"
import { getPortalSession, clearPortalCookie } from "@/lib/portal-auth"

export async function GET() {
  const session = await getPortalSession()
  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 })
  }
  return NextResponse.json({ session })
}

export async function DELETE() {
  await clearPortalCookie()
  return NextResponse.json({ ok: true })
}
