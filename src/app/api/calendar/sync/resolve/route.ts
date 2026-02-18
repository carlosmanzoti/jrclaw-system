import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphCalendarService } from "@/lib/microsoft-graph-calendar"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { eventId, resolution, manualData } = body

  if (!eventId || !resolution) {
    return NextResponse.json({ error: "eventId and resolution are required" }, { status: 400 })
  }

  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
  })

  if (!event || event.sync_status !== "CONFLICT") {
    return NextResponse.json({ error: "Event not found or not in conflict" }, { status: 404 })
  }

  const conflictData = event.sync_conflict_data as Record<string, unknown> | null

  if (resolution === "KEEP_LOCAL") {
    // Push local version to Outlook
    if (event.outlook_event_id) {
      try {
        const calService = new MicrosoftGraphCalendarService(session.user.id)
        const outlookInput = calService.mapToOutlook(event)
        await calService.updateEvent(event.outlook_event_id, outlookInput)
      } catch {
        // Continue even if push fails
      }
    }

    await db.calendarEvent.update({
      where: { id: eventId },
      data: {
        sync_status: "SYNCED",
        outlook_last_sync: new Date(),
        sync_conflict_data: Prisma.DbNull,
        outlook_sync_error: null,
      },
    })
  } else if (resolution === "KEEP_OUTLOOK" && conflictData) {
    // Apply Outlook version locally
    await db.calendarEvent.update({
      where: { id: eventId },
      data: {
        titulo: conflictData.outlook_titulo as string,
        descricao: (conflictData.outlook_descricao as string) || null,
        data_inicio: new Date(conflictData.outlook_data_inicio as string),
        data_fim: conflictData.outlook_data_fim
          ? new Date(conflictData.outlook_data_fim as string)
          : null,
        dia_inteiro: (conflictData.outlook_dia_inteiro as boolean) || false,
        local: (conflictData.outlook_local as string) || null,
        last_modified_source: "OUTLOOK",
        sync_status: "SYNCED",
        outlook_last_sync: new Date(),
        sync_conflict_data: Prisma.DbNull,
        outlook_sync_error: null,
      },
    })
  } else if (resolution === "MANUAL" && manualData) {
    // Apply manual merge data
    const updateData: Record<string, unknown> = {
      sync_status: "SYNCED",
      outlook_last_sync: new Date(),
      sync_conflict_data: Prisma.DbNull,
      outlook_sync_error: null,
      last_modified_source: "SYSTEM",
    }

    if (manualData.titulo) updateData.titulo = manualData.titulo
    if (manualData.descricao !== undefined) updateData.descricao = manualData.descricao
    if (manualData.data_inicio) updateData.data_inicio = new Date(manualData.data_inicio)
    if (manualData.data_fim !== undefined) {
      updateData.data_fim = manualData.data_fim ? new Date(manualData.data_fim) : null
    }
    if (manualData.dia_inteiro !== undefined) updateData.dia_inteiro = manualData.dia_inteiro
    if (manualData.local !== undefined) updateData.local = manualData.local

    await db.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
    })

    // Push merged version to Outlook
    if (event.outlook_event_id) {
      try {
        const merged = await db.calendarEvent.findUnique({ where: { id: eventId } })
        if (merged) {
          const calService = new MicrosoftGraphCalendarService(session.user.id)
          const outlookInput = calService.mapToOutlook(merged)
          await calService.updateEvent(event.outlook_event_id, outlookInput)
        }
      } catch {
        // Continue even if push fails
      }
    }
  } else {
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
