import { MicrosoftGraphService } from "./microsoft-graph"

// ═══ Types ═══

export interface OutlookCalendarEvent {
  id: string
  subject: string
  body?: { contentType: string; content: string }
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay: boolean
  location?: { displayName: string }
  attendees?: { emailAddress: { name: string; address: string }; type: string }[]
  organizer?: { emailAddress: { name: string; address: string } }
  webLink?: string
  lastModifiedDateTime: string
  isCancelled?: boolean
  showAs?: string
  importance?: string
  sensitivity?: string
  categories?: string[]
  onlineMeeting?: { joinUrl: string } | null
  recurrence?: unknown
}

export interface CreateOutlookEventInput {
  subject: string
  body?: { contentType: string; content: string }
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  isAllDay?: boolean
  location?: { displayName: string }
  attendees?: { emailAddress: { name: string; address: string }; type: string }[]
  isOnlineMeeting?: boolean
  reminderMinutesBeforeStart?: number
}

const TIMEZONE = "America/Sao_Paulo"

export class MicrosoftGraphCalendarService extends MicrosoftGraphService {

  async createEvent(input: CreateOutlookEventInput): Promise<OutlookCalendarEvent> {
    const res = await this.graphFetch("/me/events", {
      method: "POST",
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`Failed to create calendar event: ${await res.text()}`)
    return res.json()
  }

  async updateEvent(eventId: string, input: Partial<CreateOutlookEventInput>): Promise<OutlookCalendarEvent> {
    const res = await this.graphFetch(`/me/events/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(`Failed to update calendar event: ${await res.text()}`)
    return res.json()
  }

  async deleteEvent(eventId: string): Promise<void> {
    const res = await this.graphFetch(`/me/events/${eventId}`, {
      method: "DELETE",
    })
    if (!res.ok && res.status !== 204) throw new Error(`Failed to delete calendar event: ${await res.text()}`)
  }

  async getEvents(startDate: Date, endDate: Date): Promise<OutlookCalendarEvent[]> {
    const start = startDate.toISOString()
    const end = endDate.toISOString()
    const select = "$select=id,subject,body,start,end,isAllDay,location,attendees,organizer,webLink,lastModifiedDateTime,isCancelled,showAs,importance,onlineMeeting,recurrence,categories"

    let allEvents: OutlookCalendarEvent[] = []
    let url: string | null = `/me/calendarView?startDateTime=${start}&endDateTime=${end}&${select}&$top=100&$orderby=start/dateTime`

    while (url) {
      const res = await this.graphFetch(url)
      if (!res.ok) throw new Error(`Failed to fetch calendar events: ${await res.text()}`)
      const data = await res.json()
      allEvents = allEvents.concat(data.value || [])
      url = data["@odata.nextLink"] || null
      // Strip base URL for graphFetch if nextLink is absolute
      if (url && url.startsWith("https://")) {
        // graphFetch handles absolute URLs
      }
    }

    return allEvents
  }

  async getEvent(eventId: string): Promise<OutlookCalendarEvent> {
    const res = await this.graphFetch(`/me/events/${eventId}`)
    if (!res.ok) throw new Error(`Failed to get calendar event: ${await res.text()}`)
    return res.json()
  }

  // Map JRCLaw CalendarEvent → Outlook event input
  mapToOutlook(event: {
    titulo: string
    descricao?: string | null
    data_inicio: Date
    data_fim?: Date | null
    dia_inteiro: boolean
    local?: string | null
    link_virtual?: string | null
    lembrete_minutos?: number | null
    participantes_externos?: string[]
  }): CreateOutlookEventInput {
    const startDate = new Date(event.data_inicio)
    const endDate = event.data_fim ? new Date(event.data_fim) : new Date(startDate.getTime() + 60 * 60 * 1000)

    const input: CreateOutlookEventInput = {
      subject: event.titulo,
      start: {
        dateTime: event.dia_inteiro
          ? startDate.toISOString().split("T")[0]
          : startDate.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: event.dia_inteiro
          ? endDate.toISOString().split("T")[0]
          : endDate.toISOString(),
        timeZone: TIMEZONE,
      },
      isAllDay: event.dia_inteiro,
    }

    if (event.descricao) {
      input.body = { contentType: "Text", content: event.descricao }
    }

    if (event.local) {
      input.location = { displayName: event.local }
    }

    if (event.link_virtual) {
      input.isOnlineMeeting = true
    }

    if (event.lembrete_minutos != null) {
      input.reminderMinutesBeforeStart = event.lembrete_minutos
    }

    if (event.participantes_externos?.length) {
      input.attendees = event.participantes_externos.map((email) => ({
        emailAddress: { name: email, address: email },
        type: "required",
      }))
    }

    return input
  }

  // Map Outlook event → partial JRCLaw data for comparison/import
  mapFromOutlook(outlook: OutlookCalendarEvent): {
    titulo: string
    descricao: string | null
    data_inicio: Date
    data_fim: Date | null
    dia_inteiro: boolean
    local: string | null
    link_virtual: string | null
  } {
    return {
      titulo: outlook.subject || "",
      descricao: outlook.body?.content || null,
      data_inicio: new Date(outlook.start.dateTime),
      data_fim: outlook.end ? new Date(outlook.end.dateTime) : null,
      dia_inteiro: outlook.isAllDay || false,
      local: outlook.location?.displayName || null,
      link_virtual: outlook.onlineMeeting?.joinUrl || null,
    }
  }
}
