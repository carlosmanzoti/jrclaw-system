import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getActiveProvider } from "@/lib/tribunal-api"

export const maxDuration = 300 // 5 min

const BATCH_SIZE = 50
const LOCK_TIMEOUT_MS = 10 * 60 * 1000 // 10 min

/**
 * Cron job: Fetch movements from DataJud for all active cases.
 * Uses a database lock (SystemConfig) to prevent concurrent runs.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const provider = getActiveProvider()
  if (!provider) {
    return NextResponse.json({ message: "No tribunal provider configured" })
  }

  // ── Concurrency lock via SystemConfig ──
  const lockKey = "monitoring_running"

  const existing = await db.systemConfig.findUnique({ where: { key: lockKey } })
  if (existing) {
    const lockTime = new Date(existing.value).getTime()
    if (Date.now() - lockTime < LOCK_TIMEOUT_MS) {
      return NextResponse.json({ message: "Monitoring already running", lockedSince: existing.value })
    }
    // Lock timed out — release it
  }

  // Acquire lock
  await db.systemConfig.upsert({
    where: { key: lockKey },
    update: { value: new Date().toISOString() },
    create: { key: lockKey, value: new Date().toISOString() },
  })

  let totalInserted = 0
  let totalCases = 0
  let errors = 0

  try {
    // Fetch all active cases with a numero_processo
    const cases = await db.case.findMany({
      where: {
        status: "ATIVO",
        numero_processo: { not: null },
      },
      select: { id: true, numero_processo: true },
      orderBy: { updated_at: "desc" },
    })

    totalCases = cases.length

    // Process in batches
    for (let i = 0; i < cases.length; i += BATCH_SIZE) {
      const batch = cases.slice(i, i + BATCH_SIZE)

      await Promise.allSettled(
        batch.map(async (caso) => {
          try {
            const movements = await provider.fetchMovements(caso.numero_processo!)
            if (movements.length === 0) return

            // Get existing to deduplicate
            const existing = await db.caseMovement.findMany({
              where: { case_id: caso.id },
              select: { data: true, descricao: true, fonte: true },
            })

            const existingSet = new Set(
              existing.map(e => `${e.data.toISOString()}|${e.descricao}|${e.fonte}`)
            )

            const newMovements = movements.filter(m =>
              !existingSet.has(`${m.data.toISOString()}|${m.descricao}|${m.fonte}`)
            )

            if (newMovements.length > 0) {
              await db.caseMovement.createMany({
                data: newMovements.map(m => ({
                  case_id: caso.id,
                  data: m.data,
                  tipo: m.tipo as any,
                  descricao: m.descricao,
                  conteudo_integral: m.conteudo_integral,
                  fonte: m.fonte,
                  fonte_url: m.fonte_url,
                  lida: false,
                })),
              })
              totalInserted += newMovements.length
            }
          } catch (err) {
            console.error(`[Monitoring Cron] Error for case ${caso.numero_processo}:`, err)
            errors++
          }
        })
      )
    }
  } finally {
    // Release lock
    await db.systemConfig.delete({ where: { key: lockKey } }).catch(() => {})
  }

  console.log(`[Monitoring Cron] Done: ${totalCases} cases, ${totalInserted} new movements, ${errors} errors`)

  return NextResponse.json({
    totalCases,
    totalInserted,
    errors,
    completedAt: new Date().toISOString(),
  })
}
