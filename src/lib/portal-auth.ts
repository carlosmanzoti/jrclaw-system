/**
 * Portal authentication — separate from NextAuth (internal users).
 * Uses JWT stored in httpOnly cookie "portal_token".
 */

import { SignJWT, jwtVerify } from "jose"
import { compare, hash } from "bcryptjs"
import { cookies } from "next/headers"
import { db } from "@/lib/db"

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "portal-secret-fallback")
const TOKEN_NAME = "portal_token"
const TOKEN_TTL = 24 * 60 * 60 // 24 hours

export interface PortalSession {
  personId: string
  nome: string
  cpfCnpj: string
  email?: string
}

// ── JWT helpers ──────────────────────────────────────────

export async function createPortalToken(session: PortalSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL}s`)
    .sign(SECRET)
}

export async function verifyPortalToken(token: string): Promise<PortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as PortalSession
  } catch {
    return null
  }
}

// ── Cookie helpers ──────────────────────────────────────

export async function setPortalCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL,
  })
}

export async function getPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_NAME)?.value
  if (!token) return null
  return verifyPortalToken(token)
}

export async function clearPortalCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_NAME)
}

// ── Auth logic ──────────────────────────────────────────

export async function authenticatePortalUser(
  cpfCnpj: string,
  password: string
): Promise<{ success: boolean; session?: PortalSession; error?: string; requiresPasswordChange?: boolean }> {
  // Clean CPF/CNPJ
  const clean = cpfCnpj.replace(/[^0-9]/g, "")
  if (clean.length < 11) {
    return { success: false, error: "CPF/CNPJ invalido" }
  }

  const person = await db.person.findFirst({
    where: {
      cpf_cnpj: clean,
      portal_access: true,
    },
    select: {
      id: true,
      nome: true,
      cpf_cnpj: true,
      email: true,
      portal_password: true,
    },
  })

  if (!person) {
    return { success: false, error: "Acesso ao portal nao encontrado" }
  }

  if (!person.portal_password) {
    return { success: false, error: "Senha do portal nao configurada" }
  }

  const valid = await compare(password, person.portal_password)
  if (!valid) {
    return { success: false, error: "Senha incorreta" }
  }

  // Check if password is temporary (starts with "TEMP:")
  const isTemp = person.portal_password.startsWith("$2") && password.startsWith("TEMP:")

  const session: PortalSession = {
    personId: person.id,
    nome: person.nome,
    cpfCnpj: person.cpf_cnpj!,
    email: person.email || undefined,
  }

  return { success: true, session, requiresPasswordChange: isTemp }
}

// ── Onboarding: generate temp password ──────────────────

export async function generateTempPassword(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  let password = "TEMP:"
  for (let i = 0; i < 8; i++) {
    password += chars[Math.floor(Math.random() * chars.length)]
  }
  return password
}

export async function enablePortalAccess(personId: string): Promise<{ tempPassword: string }> {
  const tempPassword = await generateTempPassword()
  const hashed = await hash(tempPassword, 12)

  await db.person.update({
    where: { id: personId },
    data: {
      portal_access: true,
      portal_password: hashed,
    },
  })

  return { tempPassword }
}

export async function changePortalPassword(personId: string, newPassword: string): Promise<void> {
  const hashed = await hash(newPassword, 12)
  await db.person.update({
    where: { id: personId },
    data: { portal_password: hashed },
  })
}
