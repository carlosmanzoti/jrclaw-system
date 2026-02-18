import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { MicrosoftGraphCalendarService } from "@/lib/microsoft-graph-calendar"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  if (!start || !end) {
    return NextResponse.json({ error: "start and end are required" }, { status: 400 })
  }

  // Check if Microsoft account is connected
  const account = await db.microsoftAccount.findUnique({
    where: { userId: session.user.id },
  })

  if (!account || account.status !== "CONNECTED") {
    return NextResponse.json([])
  }

  try {
    const calService = new MicrosoftGraphCalendarService(session.user.id)
    const outlookEvents = await calService.getEvents(new Date(start), new Date(end))

    // Get all linked outlook_event_ids to exclude them
    const linkedEvents = await db.calendarEvent.findMany({
      where: {
        outlook_event_id: { not: null },
        created_by_id: session.user.id,
      },
      select: { outlook_event_id: true },
    })
    const linkedIds = new Set(linkedEvents.map((e) => e.outlook_event_id))

    // Return only Outlook events NOT linked to any CalendarEvent
    const unlinkedEvents = outlookEvents
      .filter((e) => !linkedIds.has(e.id) && !e.isCancelled)
      .map((e) => ({
        id: `outlook-${e.id}`,
        outlookId: e.id,
        title: `(Outlook) ${e.subject || "Sem título"}`,
        start: e.start.dateTime,
        end: e.end.dateTime,
        allDay: e.isAllDay,
        location: e.location?.displayName || null,
        attendees: (e.attendees || []).map((a) => ({
          name: a.emailAddress.name,
          email: a.emailAddress.address,
        })),
        webLink: e.webLink || null,
        organizer: e.organizer?.emailAddress?.name || null,
      }))

    return NextResponse.json(unlinkedEvents)
  } catch (err) {
    console.error("Failed to fetch Outlook events:", err)
    return NextResponse.json([])
  }
}
