import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { MicrosoftGraphCalendarService } from "@/lib/microsoft-graph-calendar"

export async function GET(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accounts = await db.microsoftAccount.findMany({
    where: { status: "CONNECTED" },
    select: { userId: true, email: true },
  })

  let totalPushed = 0
  let totalPulled = 0
  let totalConflicts = 0
  const errors: string[] = []

  for (const account of accounts) {
    try {
      const calService = new MicrosoftGraphCalendarService(account.userId)

      // 1. Push PENDING_PUSH events
      const pendingPush = await db.calendarEvent.findMany({
        where: {
          sincronizado_outlook: true,
          sync_status: "PENDING_PUSH",
          created_by_id: account.userId,
        },
      })

      for (const event of pendingPush) {
        try {
          const outlookInput = calService.mapToOutlook(event)

          if (event.outlook_event_id) {
            await calService.updateEvent(event.outlook_event_id, outlookInput)
          } else {
            const created = await calService.createEvent(outlookInput)
            await db.calendarEvent.update({
              where: { id: event.id },
              data: { outlook_event_id: created.id },
            })
          }

          await db.calendarEvent.update({
            where: { id: event.id },
            data: {
              sync_status: "SYNCED",
              outlook_last_sync: new Date(),
              outlook_sync_error: null,
            },
          })
          totalPushed++
        } catch (err) {
          errors.push(`[${account.email}] Push ${event.id}: ${err instanceof Error ? err.message : "unknown"}`)
        }
      }

      // 2. Fetch Outlook events (last 60 days + next 90 days)
      const now = new Date()
      const past60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

      const outlookEvents = await calService.getEvents(past60, future90)

      const linkedEvents = await db.calendarEvent.findMany({
        where: {
          sincronizado_outlook: true,
          outlook_event_id: { not: null },
          created_by_id: account.userId,
        },
      })

      const linkedMap = new Map(linkedEvents.map((e) => [e.outlook_event_id, e]))

      for (const oe of outlookEvents) {
        const local = linkedMap.get(oe.id)
        if (!local) continue

        const outlookModified = new Date(oe.lastModifiedDateTime)
        const localLastSync = local.outlook_last_sync

        if (localLastSync && outlookModified > localLastSync) {
          if (local.sync_status === "PENDING_PUSH" || local.last_modified_source === "SYSTEM") {
            const mapped = calService.mapFromOutlook(oe)
            await db.calendarEvent.update({
              where: { id: local.id },
              data: {
                sync_status: "CONFLICT",
                sync_conflict_data: {
                  outlook_titulo: mapped.titulo,
                  outlook_descricao: mapped.descricao,
                  outlook_data_inicio: mapped.data_inicio.toISOString(),
                  outlook_data_fim: mapped.data_fim?.toISOString() || null,
                  outlook_dia_inteiro: mapped.dia_inteiro,
                  outlook_local: mapped.local,
                  outlook_modified: oe.lastModifiedDateTime,
                },
              },
            })
            totalConflicts++
          } else {
            const mapped = calService.mapFromOutlook(oe)
            await db.calendarEvent.update({
              where: { id: local.id },
              data: {
                titulo: mapped.titulo,
                descricao: mapped.descricao,
                data_inicio: mapped.data_inicio,
                data_fim: mapped.data_fim,
                dia_inteiro: mapped.dia_inteiro,
                local: mapped.local,
                link_virtual: mapped.link_virtual,
                last_modified_source: "OUTLOOK",
                sync_status: "SYNCED",
                outlook_last_sync: new Date(),
                outlook_sync_error: null,
                sync_conflict_data: Prisma.DbNull,
              },
            })
            totalPulled++
          }
        }
      }
    } catch (err) {
      errors.push(`[${account.email}] ${err instanceof Error ? err.message : "unknown"}`)
    }
  }

  return NextResponse.json({
    accounts: accounts.length,
    pushed: totalPushed,
    pulled: totalPulled,
    conflicts: totalConflicts,
    errors,
  })
}
