import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { audit } from "@/lib/audit"
import { MonitorFrequency } from "@prisma/client"

export const maxDuration = 300 // 5 min

const LOCK_KEY = "investigation_monitor_running"
const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // 10 min
const BATCH_SIZE = 20

/**
 * Frequency thresholds in milliseconds.
 * DIARIO = 24h, SEMANAL = 7d, QUINZENAL = 15d, MENSAL = 30d
 */
const FREQUENCY_MS: Record<MonitorFrequency, number> = {
  DIARIO: 24 * 60 * 60 * 1000,
  SEMANAL: 7 * 24 * 60 * 60 * 1000,
  QUINZENAL: 15 * 24 * 60 * 60 * 1000,
  MENSAL: 30 * 24 * 60 * 60 * 1000,
}

/**
 * Determine whether an investigation is due for a new scan.
 */
function isDue(
  lastFullScanAt: Date | null,
  frequency: MonitorFrequency | null,
): boolean {
  if (!frequency) return false
  if (!lastFullScanAt) return true // never scanned
  const elapsed = Date.now() - lastFullScanAt.getTime()
  return elapsed >= FREQUENCY_MS[frequency]
}

/**
 * Cron job: Monitor investigations with autoMonitor enabled (runs every 6 hours).
 * Checks each investigation's monitorFrequency and triggers a scan when due.
 * Uses a database lock (SystemConfig) to prevent concurrent runs.
 */
export async function GET(req: Request) {
  // ── Auth ──
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Concurrency lock via SystemConfig ──
  const existing = await db.systemConfig.findUnique({ where: { key: LOCK_KEY } })
  if (existing) {
    const lockTime = new Date(existing.value).getTime()
    if (Date.now() - lockTime < LOCK_TIMEOUT_MS) {
      return NextResponse.json({
        message: "Investigation monitor already running",
        lockedSince: existing.value,
      })
    }
    // Lock timed out — we can proceed (stale lock)
  }

  // Acquire lock
  await db.systemConfig.upsert({
    where: { key: LOCK_KEY },
    update: { value: new Date().toISOString() },
    create: { key: LOCK_KEY, value: new Date().toISOString() },
  })

  let processed = 0
  let due = 0
  let errors = 0

  try {
    // Fetch all investigations with autoMonitor enabled
    const investigations = await db.investigation.findMany({
      where: {
        autoMonitor: true,
        status: { in: ["PENDENTE", "EM_ANDAMENTO", "CONSULTAS_CONCLUIDAS"] },
      },
      select: {
        id: true,
        targetName: true,
        targetDocument: true,
        lastFullScanAt: true,
        monitorFrequency: true,
      },
    })

    processed = investigations.length

    // Filter to those that are due for scanning
    const dueInvestigations = investigations.filter((inv) =>
      isDue(inv.lastFullScanAt, inv.monitorFrequency),
    )
    due = dueInvestigations.length

    // Process in batches
    for (let i = 0; i < dueInvestigations.length; i += BATCH_SIZE) {
      const batch = dueInvestigations.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map(async (inv) => {
          try {
            // Mark as scanned
            await db.investigation.update({
              where: { id: inv.id },
              data: { lastFullScanAt: new Date() },
            })

            // Log scan trigger via audit
            await audit({
              action: "UPDATE",
              resource: "Investigation",
              resourceId: inv.id,
              description: `Auto-monitor scan triggered for ${inv.targetName} (${inv.targetDocument}), frequency: ${inv.monitorFrequency}`,
              metadata: {
                trigger: "cron:investigation-monitor",
                monitorFrequency: inv.monitorFrequency,
                previousScanAt: inv.lastFullScanAt?.toISOString() ?? null,
              },
            })
          } catch (err) {
            console.error(
              `[Investigation Monitor] Error processing investigation ${inv.id}:`,
              err,
            )
            errors++
          }
        }),
      )
    }
  } finally {
    // Release lock
    await db.systemConfig.delete({ where: { key: LOCK_KEY } }).catch(() => {})
  }

  console.log(
    `[Investigation Monitor] Done: processed=${processed}, due=${due}, errors=${errors}`,
  )

  return NextResponse.json({
    processed,
    due,
    errors,
    completedAt: new Date().toISOString(),
  })
}
