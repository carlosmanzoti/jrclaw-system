import { NextResponse } from "next/server"
import { authenticatePortalUser, createPortalToken, setPortalCookie } from "@/lib/portal-auth"

// Rate limiting: 5 attempts per CPF per 15 min
const attempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(req: Request) {
  const { cpfCnpj, password } = await req.json()

  if (!cpfCnpj || !password) {
    return NextResponse.json({ error: "CPF/CNPJ e senha obrigatorios" }, { status: 400 })
  }

  const clean = cpfCnpj.replace(/[^0-9]/g, "")

  // Rate limiting
  const now = Date.now()
  const key = `portal:${clean}`
  const entry = attempts.get(key)
  if (entry && entry.count >= 5 && now < entry.resetAt) {
    const waitMin = Math.ceil((entry.resetAt - now) / 60000)
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${waitMin} minuto(s).` },
      { status: 429 }
    )
  }

  const result = await authenticatePortalUser(clean, password)

  if (!result.success) {
    // Increment attempts
    const existing = attempts.get(key)
    if (!existing || now >= existing.resetAt) {
      attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    } else {
      existing.count++
    }
    return NextResponse.json({ error: result.error }, { status: 401 })
  }

  // Clear rate limit on success
  attempts.delete(key)

  // Create token and set cookie
  const token = await createPortalToken(result.session!)
  await setPortalCookie(token)

  return NextResponse.json({
    session: result.session,
    requiresPasswordChange: result.requiresPasswordChange,
  })
}
