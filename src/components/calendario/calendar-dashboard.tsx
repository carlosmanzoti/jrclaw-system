"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core"
import type { EventResizeDoneArg } from "@fullcalendar/interaction"
import { trpc } from "@/lib/trpc"
import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPE_COLORS,
} from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Filter, Plus, AlertTriangle, RefreshCw } from "lucide-react"
import { CalendarLegend } from "./calendar-legend"
import { CalendarEventModal } from "./calendar-event-modal"
import { CalendarEventDetail } from "./calendar-event-detail"
import { CalendarSyncConflictModal } from "./calendar-sync-conflict-modal"
import { OutlookEventPopover } from "./outlook-event-popover"

const EVENT_TYPES = Object.keys(CALENDAR_EVENT_TYPE_LABELS)

interface OutlookOnlyEvent {
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

export default function CalendarDashboard() {
  const calendarRef = useRef<FullCalendar>(null)

  // Date range from FullCalendar view
  const [dateRange, setDateRange] = useState<{
    start: Date
    end: Date
  }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  })

  // Filters
  const [tipoFilter, setTipoFilter] = useState<string[]>([])
  const [responsavelFilter, setResponsavelFilter] = useState("")
  const [caseFilter, setCaseFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")

  // Outlook overlay
  const [showOutlookEvents, setShowOutlookEvents] = useState(false)
  const [outlookEvents, setOutlookEvents] = useState<OutlookOnlyEvent[]>([])
  const [outlookLoading, setOutlookLoading] = useState(false)

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [detailEventId, setDetailEventId] = useState<string | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)

  // Conflict modal
  const [conflictEvent, setConflictEvent] = useState<unknown>(null)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)

  // Data
  const { data: users } = trpc.users.list.useQuery()
  const { data: cases } = trpc.calendar.casesForSelect.useQuery()
  const { data: projects } = trpc.calendar.projectsForSelect.useQuery()
  const { data: syncStatus } = trpc.calendar.getSyncStatus.useQuery()

  const { data: events, refetch } = trpc.calendar.list.useQuery({
    date_from: dateRange.start,
    date_to: dateRange.end,
    ...(tipoFilter.length > 0 && { tipo_evento: tipoFilter }),
    ...(responsavelFilter && { responsavel_id: responsavelFilter }),
    ...(caseFilter && { case_id: caseFilter }),
    ...(projectFilter && { project_id: projectFilter }),
  })

  const updateDateTimeMutation = trpc.calendar.updateDateTime.useMutation({
    onSuccess: () => refetch(),
  })

  const conflictCount = syncStatus?.CONFLICT || 0

  // Fetch Outlook-only events
  const fetchOutlookEvents = useCallback(async () => {
    if (!showOutlookEvents) return
    setOutlookLoading(true)
    try {
      const res = await fetch(
        `/api/calendar/outlook-events?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`
      )
      if (res.ok) {
        setOutlookEvents(await res.json())
      }
    } catch {
      // Silently fail
    } finally {
      setOutlookLoading(false)
    }
  }, [showOutlookEvents, dateRange.start, dateRange.end])

  useEffect(() => {
    fetchOutlookEvents()
  }, [fetchOutlookEvents])

  // Auto-refresh Outlook events every 5 minutes
  useEffect(() => {
    if (!showOutlookEvents) return
    const interval = setInterval(fetchOutlookEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [showOutlookEvents, fetchOutlookEvents])

  // Map events to FullCalendar format
  const calendarEvents = [
    ...(events || []).map((ev) => {
      const color = CALENDAR_EVENT_TYPE_COLORS[ev.tipo_evento] || "#6b7280"
      const isConcluido = ev.status === "CONCLUIDO"
      const isCancelado = ev.status === "CANCELADO"

      return {
        id: ev.id,
        title: ev.titulo,
        start: ev.data_inicio,
        end: ev.data_fim || undefined,
        allDay: ev.dia_inteiro,
        backgroundColor: isCancelado ? "#9ca3af" : isConcluido ? `${color}80` : color,
        borderColor: "transparent",
        textColor: "#fff",
        classNames: [
          isConcluido ? "opacity-60" : "",
          isCancelado ? "line-through opacity-50" : "",
        ].filter(Boolean),
        extendedProps: { ...ev, _isOutlookOnly: false },
      }
    }),
    // Outlook-only events (gray, read-only)
    ...(showOutlookEvents
      ? outlookEvents.map((oe) => ({
          id: oe.id,
          title: oe.title,
          start: oe.start,
          end: oe.end || undefined,
          allDay: oe.allDay,
          backgroundColor: "#d1d5db",
          borderColor: "#9ca3af",
          textColor: "#4b5563",
          editable: false,
          startEditable: false,
          durationEditable: false,
          extendedProps: { ...oe, _isOutlookOnly: true },
        }))
      : []),
  ]

  // Handlers
  const handleDatesSet = useCallback(
    (arg: { start: Date; end: Date }) => {
      setDateRange({ start: arg.start, end: arg.end })
    },
    []
  )

  const handleSelect = useCallback((selectInfo: DateSelectArg) => {
    setDefaultDate(selectInfo.start)
    setEditEventId(null)
    setCreateModalOpen(true)
    const calApi = selectInfo.view.calendar
    calApi.unselect()
  }, [])

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const isOutlookOnly = clickInfo.event.extendedProps._isOutlookOnly
    if (isOutlookOnly) {
      // Don't open detail modal for Outlook-only events
      // The popover handles this via direct DOM interaction is not ideal,
      // but we can simply ignore the click
      return
    }
    setDetailEventId(clickInfo.event.id)
  }, [])

  const handleEventDrop = useCallback(
    (dropInfo: EventDropArg) => {
      const isOutlookOnly = dropInfo.event.extendedProps._isOutlookOnly
      if (isOutlookOnly) {
        dropInfo.revert()
        return
      }
      const ev = dropInfo.event
      updateDateTimeMutation.mutate({
        id: ev.id,
        data_inicio: ev.start!,
        data_fim: ev.end || undefined,
        dia_inteiro: ev.allDay,
      })
    },
    [updateDateTimeMutation]
  )

  const handleEventResize = useCallback(
    (resizeInfo: EventResizeDoneArg) => {
      const isOutlookOnly = resizeInfo.event.extendedProps._isOutlookOnly
      if (isOutlookOnly) {
        resizeInfo.revert()
        return
      }
      const ev = resizeInfo.event
      updateDateTimeMutation.mutate({
        id: ev.id,
        data_inicio: ev.start!,
        data_fim: ev.end || undefined,
      })
    },
    [updateDateTimeMutation]
  )

  const handleEditFromDetail = useCallback((id: string) => {
    setDetailEventId(null)
    setEditEventId(id)
    setCreateModalOpen(true)
  }, [])

  const handleModalSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleNewEvent = useCallback(() => {
    setEditEventId(null)
    setDefaultDate(null)
    setCreateModalOpen(true)
  }, [])

  const handleResolveConflict = useCallback((event: unknown) => {
    setDetailEventId(null)
    setConflictEvent(event)
    setConflictModalOpen(true)
  }, [])

  const handleConflictResolved = useCallback(() => {
    refetch()
  }, [refetch])

  // Type filter toggle
  const toggleTipoFilter = (tipo: string) => {
    setTipoFilter((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    )
  }

  const clearFilters = () => {
    setTipoFilter([])
    setResponsavelFilter("")
    setCaseFilter("")
    setProjectFilter("")
  }

  const hasFilters =
    tipoFilter.length > 0 || responsavelFilter || caseFilter || projectFilter

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleNewEvent}>
          <Plus className="size-4 mr-1.5" />
          Novo Evento
        </Button>

        <div className="flex-1" />

        {/* Outlook toggle */}
        <TooltipProvider>
          <div className="flex items-center gap-1.5 mr-2">
            <Switch
              checked={showOutlookEvents}
              onCheckedChange={setShowOutlookEvents}
              id="outlook-toggle"
              className="scale-75"
            />
            <Label htmlFor="outlook-toggle" className="text-xs font-normal cursor-pointer whitespace-nowrap">
              Outlook
            </Label>
            {outlookLoading && (
              <RefreshCw className="size-3 animate-spin text-[#666666]" />
            )}
          </div>

          {/* Conflict badge */}
          {conflictCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative text-amber-700 border-amber-300"
                  onClick={() => {
                    // Open first conflict
                    // Users can access via detail view too
                  }}
                >
                  <AlertTriangle className="size-3 mr-1" />
                  {conflictCount}
                  <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {conflictCount} conflito(s) de sincronização
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>

        {/* Type filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="size-3 mr-1" />
              Tipo
              {tipoFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 text-xs">
                  {tipoFilter.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="end">
            <div className="space-y-2">
              {EVENT_TYPES.map((tipo) => (
                <div key={tipo} className="flex items-center gap-2">
                  <Checkbox
                    id={`filter-${tipo}`}
                    checked={tipoFilter.includes(tipo)}
                    onCheckedChange={() => toggleTipoFilter(tipo)}
                  />
                  <Label
                    htmlFor={`filter-${tipo}`}
                    className="text-xs font-normal flex items-center gap-1.5 cursor-pointer"
                  >
                    <span
                      className="inline-block size-2 rounded-full"
                      style={{
                        backgroundColor: CALENDAR_EVENT_TYPE_COLORS[tipo],
                      }}
                    />
                    {CALENDAR_EVENT_TYPE_LABELS[tipo]}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Responsible filter */}
        <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {users?.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Case filter */}
        <Select value={caseFilter} onValueChange={setCaseFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Processo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {cases?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.numero_processo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project filter */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {projects?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Calendar */}
      <div className="rounded-lg border bg-white p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="pt-br"
          height="auto"
          events={calendarEvents}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            list: "Lista",
          }}
          // Interaction
          selectable
          editable
          eventResizableFromStart
          select={handleSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          // Date range tracking
          datesSet={handleDatesSet}
          // Display
          dayMaxEvents={4}
          moreLinkText={(n) => `+${n} mais`}
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDayText="Dia todo"
          noEventsText="Nenhum evento"
          slotLabelFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }}
        />
      </div>

      {/* Legend */}
      <CalendarLegend />

      {/* Create/Edit Modal */}
      <CalendarEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        eventId={editEventId}
        defaultDate={defaultDate}
        onSuccess={handleModalSuccess}
      />

      {/* Detail Modal */}
      <CalendarEventDetail
        open={!!detailEventId}
        onOpenChange={(open) => {
          if (!open) setDetailEventId(null)
        }}
        eventId={detailEventId}
        onEdit={handleEditFromDetail}
        onRefresh={handleModalSuccess}
        onResolveConflict={handleResolveConflict}
      />

      {/* Conflict Resolution Modal */}
      <CalendarSyncConflictModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        event={conflictEvent as any}
        onResolved={handleConflictResolved}
      />
    </div>
  )
}
