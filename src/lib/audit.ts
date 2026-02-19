/**
 * Audit logging utility — records security-relevant actions.
 * Uses fire-and-forget pattern so audit never blocks business logic.
 */

import { db } from "@/lib/db"
import { headers } from "next/headers"

export interface AuditEntry {
  userId?: string
  userEmail?: string
  userRole?: string
  action: "CREATE" | "READ" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT" | "PERMISSION_CHANGE"
  resource: string
  resourceId?: string
  description?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
  success?: boolean
  error?: string
}

export async function audit(entry: AuditEntry) {
  try {
    let ip: string | undefined
    let userAgent: string | undefined

    try {
      const hdrs = await headers()
      ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || undefined
      userAgent = hdrs.get("user-agent") || undefined
    } catch {
      // headers() may fail outside request context (e.g. cron jobs)
    }

    // Fire and forget — do not await in caller
    db.auditLog.create({
      data: {
        user_id: entry.userId,
        user_email: entry.userEmail,
        user_role: entry.userRole,
        ip_address: ip,
        user_agent: userAgent,
        action: entry.action,
        resource: entry.resource,
        resource_id: entry.resourceId,
        description: entry.description,
        old_values: entry.oldValues as any,
        new_values: entry.newValues as any,
        metadata: entry.metadata as any,
        success: entry.success ?? true,
        error: entry.error,
      },
    }).catch((err) => {
      console.error("[AUDIT] Failed to write audit log:", err)
    })
  } catch (err) {
    console.error("[AUDIT] Failed to write audit log:", err)
  }
}

/**
 * Helper: create audit entry from tRPC context
 */
export function auditFromCtx(
  ctx: { session: { user: { id: string; email?: string | null }; role?: string } },
  entry: Omit<AuditEntry, "userId" | "userEmail" | "userRole">
) {
  return audit({
    ...entry,
    userId: ctx.session.user.id,
    userEmail: ctx.session.user.email || undefined,
    userRole: (ctx.session as any).user?.role,
  })
}
