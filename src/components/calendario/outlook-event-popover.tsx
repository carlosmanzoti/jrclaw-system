"use client"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, ExternalLink } from "lucide-react"

interface OutlookEvent {
  id: string
  outlookId: string
  title: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  attendees: { name: string; email: string }[]
  webLink: string | null
  organizer: string | null
}

interface OutlookEventPopoverProps {
  event: OutlookEvent
  children: React.ReactNode
}

function formatTime(d: string, allDay?: boolean): string {
  const date = new Date(d)
  if (allDay) return date.toLocaleDateString("pt-BR")
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function OutlookEventPopover({ event, children }: OutlookEventPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug">{event.title.replace("(Outlook) ", "")}</p>
            <Badge variant="outline" className="text-[10px] shrink-0 bg-gray-50">
              Outlook
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#666666]">
            <Calendar className="size-3" />
            <span>{formatTime(event.start, event.allDay)}</span>
            {event.end && (
              <>
                <span>—</span>
                <span>{formatTime(event.end, event.allDay)}</span>
              </>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-1.5 text-xs text-[#666666]">
              <MapPin className="size-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.organizer && (
            <div className="flex items-center gap-1.5 text-xs text-[#666666]">
              <Clock className="size-3" />
              <span>Organizado por {event.organizer}</span>
            </div>
          )}

          {event.attendees.length > 0 && (
            <div className="flex items-start gap-1.5 text-xs text-[#666666]">
              <Users className="size-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">
                {event.attendees.map((a) => a.name || a.email).join(", ")}
              </span>
            </div>
          )}

          {event.webLink && (
            <a
              href={event.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#17A2B8] hover:underline mt-1"
            >
              <ExternalLink className="size-3" />
              Abrir no Outlook
            </a>
          )}

          <p className="text-[10px] text-[#999999] italic mt-1">
            Evento somente leitura (Outlook)
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
