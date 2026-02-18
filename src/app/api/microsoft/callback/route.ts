import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { encrypt } from "@/lib/crypto"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    console.error("OAuth error:", error, searchParams.get("error_description"))
    return NextResponse.redirect(new URL("/configuracoes?error=oauth_failed", request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/configuracoes?error=oauth_failed", request.url))
  }

  // Verify CSRF state
  const cookieStore = await cookies()
  const savedState = cookieStore.get("ms_oauth_state")?.value
  cookieStore.delete("ms_oauth_state")

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL("/configuracoes?error=invalid_state", request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/microsoft/callback",
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text()
      console.error("Token exchange failed:", err)
      return NextResponse.redirect(new URL("/configuracoes?error=token_exchange_failed", request.url))
    }

    const tokens = await tokenResponse.json()
    const { access_token, refresh_token, expires_in, scope } = tokens

    if (!access_token || !refresh_token) {
      return NextResponse.redirect(new URL("/configuracoes?error=no_tokens", request.url))
    }

    // Fetch user profile from Graph
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    let email = session.user.email || ""
    if (profileResponse.ok) {
      const profile = await profileResponse.json()
      email = profile.mail || profile.userPrincipalName || email
    }

    // Calculate expiry
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000)

    // Upsert MicrosoftAccount with encrypted tokens
    await db.microsoftAccount.upsert({
      where: { userId: session.user.id },
      update: {
        email,
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        expiresAt,
        scope: scope || "",
        status: "CONNECTED",
      },
      create: {
        userId: session.user.id,
        email,
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        expiresAt,
        scope: scope || "",
        status: "CONNECTED",
      },
    })

    return NextResponse.redirect(new URL("/configuracoes?success=outlook_connected", request.url))
  } catch (err) {
    console.error("OAuth callback error:", err)
    return NextResponse.redirect(new URL("/configuracoes?error=oauth_failed", request.url))
  }
}
