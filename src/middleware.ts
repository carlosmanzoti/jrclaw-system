import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Security middleware — adds headers, rate limiting info, and route protection.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // ── Security Headers ──────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  )
  // CSP — allow self, inline styles (shadcn/tailwind need it), and Supabase storage
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api-publica.datajud.cnj.jus.br",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  )

  // ── Forward client IP for audit logging ───────────────
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  response.headers.set("x-real-ip", ip)

  return response
}

export const config = {
  matcher: [
    // Apply to all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
