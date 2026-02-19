import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { audit } from "@/lib/audit"

export const maxDuration = 120 // 2 min

const CLEANUP_BATCH_SIZE = 100

/**
 * Cron job: LGPD cleanup — purge expired raw responses from investigation queries.
 * Runs daily at 3am. Keeps parsedData intact for historical reference.
 *
 * Per LGPD (Art. 15/16), raw API responses containing personal data must be
 * disposed of once the retention period expires. Parsed/aggregated data may
 * be retained as it serves the legitimate interest of the credit-recovery case.
 */
export async function GET(req: Request) {
  // ── Auth ──
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let cleaned = 0
  let errors = 0

  try {
    const now = new Date()

    // Find all expired queries that still have rawResponse data
    const expiredQueries = await db.investigationQuery.findMany({
      where: {
        retentionUntil: { lt: now },
        rawResponse: { not: Prisma.DbNull },
      },
      select: { id: true, investigationId: true, provider: true, retentionUntil: true },
    })

    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < expiredQueries.length; i += CLEANUP_BATCH_SIZE) {
      const batch = expiredQueries.slice(i, i + CLEANUP_BATCH_SIZE)
      const ids = batch.map((q) => q.id)

      try {
        const result = await db.investigationQuery.updateMany({
          where: { id: { in: ids } },
          data: { rawResponse: Prisma.DbNull },
        })

        cleaned += result.count
      } catch (err) {
        console.error(
          `[Investigation Cleanup] Batch error (offset ${i}):`,
          err,
        )
        errors += batch.length
      }
    }

    // Audit the cleanup operation
    if (cleaned > 0 || errors > 0) {
      await audit({
        action: "DELETE",
        resource: "InvestigationQuery",
        description: `LGPD cleanup: purged rawResponse from ${cleaned} expired investigation queries (${errors} errors)`,
        metadata: {
          trigger: "cron:investigation-cleanup",
          cleaned,
          errors,
          totalExpired: expiredQueries.length,
        },
      })
    }
  } catch (err) {
    console.error("[Investigation Cleanup] Fatal error:", err)
    return NextResponse.json(
      { error: "Cleanup failed", details: String(err) },
      { status: 500 },
    )
  }

  console.log(
    `[Investigation Cleanup] Done: cleaned=${cleaned}, errors=${errors}`,
  )

  return NextResponse.json({
    cleaned,
    errors,
    completedAt: new Date().toISOString(),
  })
}
