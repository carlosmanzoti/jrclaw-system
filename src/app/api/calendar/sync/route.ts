import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphCalendarService } from "@/lib/microsoft-graph-calendar"

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json(
      { error: "Conta Microsoft não conectada" },
      { status: 400 }
    )
  }

  const calService = new MicrosoftGraphCalendarService(session.user.id)
  let pushed = 0
  let pulled = 0
  let conflicts = 0
  const errors: string[] = []

  // 1. Push PENDING_PUSH events to Outlook
  const pendingPush = await db.calendarEvent.findMany({
    where: {
      sincronizado_outlook: true,
      sync_status: "PENDING_PUSH",
      created_by_id: session.user.id,
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
      pushed++
    } catch (err) {
      errors.push(`Push ${event.titulo}: ${err instanceof Error ? err.message : "unknown"}`)
      await db.calendarEvent.update({
        where: { id: event.id },
        data: { outlook_sync_error: err instanceof Error ? err.message : "unknown" },
      })
    }
  }

  // 2. Pull updated Outlook events
  const now = new Date()
  const past60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  try {
    const outlookEvents = await calService.getEvents(past60, future90)
    const linkedEvents = await db.calendarEvent.findMany({
      where: {
        sincronizado_outlook: true,
        outlook_event_id: { not: null },
        created_by_id: session.user.id,
      },
    })

    const linkedMap = new Map(linkedEvents.map((e) => [e.outlook_event_id, e]))

    for (const oe of outlookEvents) {
      const local = linkedMap.get(oe.id)
      if (!local) continue

      const outlookModified = new Date(oe.lastModifiedDateTime)
      const localLastSync = local.outlook_last_sync

      // If Outlook was modified after last sync
      if (localLastSync && outlookModified > localLastSync) {
        // If local was also modified (PENDING_PUSH), it's a conflict
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
          conflicts++
        } else {
          // Auto-pull: Outlook-only changes
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
          pulled++
        }
      }
    }
  } catch (err) {
    errors.push(`Pull: ${err instanceof Error ? err.message : "unknown"}`)
  }

  return NextResponse.json({ pushed, pulled, conflicts, errors })
}
