"use client"

import { useState, useCallback, useRef } from "react"
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
import { Filter, Plus } from "lucide-react"
import { CalendarLegend } from "./calendar-legend"
import { CalendarEventModal } from "./calendar-event-modal"
import { CalendarEventDetail } from "./calendar-event-detail"

const EVENT_TYPES = Object.keys(CALENDAR_EVENT_TYPE_LABELS)

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

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [detailEventId, setDetailEventId] = useState<string | null>(null)
  const [defaultDate, setDefaultDate] = useState<Date | null>(null)

  // Data
  const { data: users } = trpc.users.list.useQuery()
  const { data: cases } = trpc.calendar.casesForSelect.useQuery()
  const { data: projects } = trpc.calendar.projectsForSelect.useQuery()

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

  // Map events to FullCalendar format
  const calendarEvents = (events || []).map((ev) => {
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
      extendedProps: ev,
    }
  })

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
    // Deselect the selection
    const calApi = selectInfo.view.calendar
    calApi.unselect()
  }, [])

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    setDetailEventId(clickInfo.event.id)
  }, [])

  const handleEventDrop = useCallback(
    (dropInfo: EventDropArg) => {
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
        <Button onClick={handleNewEvent} size="sm">
          <Plus className="size-4 mr-1" />
          Novo Evento
        </Button>

        <div className="flex-1" />

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
      />
    </div>
  )
}
