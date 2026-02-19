import { NextResponse } from "next/server"
import { getPortalSession } from "@/lib/portal-auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  const session = await getPortalSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 })
  }

  const message = await db.portalMessage.create({
    data: {
      person_id: session.personId,
      direction: "CLIENTE_PARA_ESCRITORIO",
      content: content.trim(),
      sender_name: session.nome,
    },
  })

  return NextResponse.json({ message })
}
