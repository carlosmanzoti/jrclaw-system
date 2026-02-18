import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphMailService } from "@/lib/microsoft-graph-mail"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = new URL(request.url).searchParams.get("q") || ""
  if (q.length < 2) {
    return NextResponse.json({ contacts: [] })
  }

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    // Return mock contacts from known law firm contacts
    const mocks = [
      {
        name: "Carlos Eduardo Silva",
        email: "carlos@agroindustrial-sp.com.br",
      },
      { name: "Maria Fernanda Costa", email: "maria.costa@bb.com.br" },
      {
        name: "João Pedro Martins",
        email: "joaopedro@fazendabomretiro.com.br",
      },
      { name: "Fernanda Oliveira", email: "fernanda@jrclaw.com.br" },
    ].filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.email.toLowerCase().includes(q.toLowerCase())
    )
    return NextResponse.json({ contacts: mocks })
  }

  try {
    const mail = new MicrosoftGraphMailService(session.user.id)
    const contacts = await mail.searchContacts(q)
    return NextResponse.json({ contacts })
  } catch {
    return NextResponse.json({ contacts: [] })
  }
}
