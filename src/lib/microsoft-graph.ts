import { db } from "@/lib/db"
import { encrypt, decrypt } from "@/lib/crypto"

// ═══ Types ═══

export interface OutlookMessage {
  id: string
  subject: string
  bodyPreview: string
  body: { contentType: string; content: string }
  from: { name: string; email: string }
  toRecipients: { name: string; email: string }[]
  ccRecipients: { name: string; email: string }[]
  bccRecipients?: { name: string; email: string }[]
  receivedAt: string
  sentAt?: string
  isRead: boolean
  hasAttachments: boolean
  importance: "low" | "normal" | "high"
  flag: { flagStatus: "notFlagged" | "flagged" | "complete" }
  conversationId: string
  attachments?: EmailAttachment[]
  linkedCaseId?: string
  linkedCase?: { id: string; title: string }
}

export interface EmailAttachment {
  id: string
  name: string
  contentType: string
  size: number
  isInline: boolean
}

export interface EmailFolder {
  id: string
  displayName: string
  unreadCount: number
  totalCount: number
}

export function mapOutlookMessage(raw: any): OutlookMessage {
  return {
    id: raw.id,
    subject: raw.subject || "",
    bodyPreview: raw.bodyPreview || "",
    body: raw.body || { contentType: "HTML", content: "" },
    from: {
      name: raw.from?.emailAddress?.name || "",
      email: raw.from?.emailAddress?.address || "",
    },
    toRecipients: (raw.toRecipients || []).map((r: any) => ({
      name: r.emailAddress?.name || "",
      email: r.emailAddress?.address || "",
    })),
    ccRecipients: (raw.ccRecipients || []).map((r: any) => ({
      name: r.emailAddress?.name || "",
      email: r.emailAddress?.address || "",
    })),
    bccRecipients: (raw.bccRecipients || []).map((r: any) => ({
      name: r.emailAddress?.name || "",
      email: r.emailAddress?.address || "",
    })),
    receivedAt: raw.receivedDateTime,
    sentAt: raw.sentDateTime,
    isRead: raw.isRead ?? true,
    hasAttachments: raw.hasAttachments ?? false,
    importance: raw.importance || "normal",
    flag: raw.flag || { flagStatus: "notFlagged" },
    conversationId: raw.conversationId || "",
  }
}

// ═══ Base Service ═══

export class MicrosoftGraphService {
  protected userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  async getAccessToken(): Promise<string> {
    const account = await db.microsoftAccount.findUnique({
      where: { userId: this.userId },
    })

    if (!account || account.status === "DISCONNECTED") {
      throw new Error("Conta Microsoft não conectada. Vá em Configurações para conectar.")
    }

    // Check if token needs refresh (5 min buffer)
    const now = new Date()
    const buffer = 5 * 60 * 1000
    if (account.expiresAt.getTime() - buffer > now.getTime()) {
      return decrypt(account.accessToken)
    }

    // Token expired or about to expire — refresh
    try {
      const refreshToken = decrypt(account.refreshToken)
      const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || "",
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      })

      if (!response.ok) {
        // Refresh failed — mark as expired
        await db.microsoftAccount.update({
          where: { userId: this.userId },
          data: { status: "EXPIRED" },
        })
        throw new Error("Sessão Microsoft expirada. Reconecte sua conta em Configurações.")
      }

      const tokens = await response.json()
      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

      await db.microsoftAccount.update({
        where: { userId: this.userId },
        data: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : account.refreshToken,
          expiresAt,
          status: "CONNECTED",
        },
      })

      return tokens.access_token
    } catch (err) {
      if (err instanceof Error && err.message.includes("Sessão Microsoft expirada")) throw err
      await db.microsoftAccount.update({
        where: { userId: this.userId },
        data: { status: "EXPIRED" },
      })
      throw new Error("Sessão Microsoft expirada. Reconecte sua conta em Configurações.")
    }
  }

  async graphFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken()
    const url = endpoint.startsWith("http") ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    // Handle 429 (rate limit)
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10)
      await new Promise((r) => setTimeout(r, retryAfter * 1000))
      return this.graphFetch(endpoint, options)
    }

    // Handle 401 (token revoked) — retry once with refreshed token
    if (response.status === 401) {
      // Force refresh by clearing expiry
      await db.microsoftAccount.update({
        where: { userId: this.userId },
        data: { expiresAt: new Date(0) },
      })
      const newToken = await this.getAccessToken()
      return fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })
    }

    return response
  }
}
