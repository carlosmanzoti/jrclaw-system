"use client"

import { useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { DEADLINE_TYPE_LABELS, DEADLINE_STATUS_LABELS, formatCNJ } from "@/lib/constants"

const TYPE_COLORS: Record<string, string> = {
  FATAL: "#dc2626",
  ORDINARIO: "#f59e0b",
  DILIGENCIA: "#3b82f6",
  AUDIENCIA: "#a855f7",
  ASSEMBLEIA: "#10b981",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DeadlinesCalendar({ deadlines }: { deadlines: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any>(null)

  const events = deadlines.map((d) => ({
    id: d.id,
    title: `${DEADLINE_TYPE_LABELS[d.tipo] || d.tipo}: ${d.descricao}`,
    start: new Date(d.data_limite).toISOString().split("T")[0],
    backgroundColor: d.status === "CUMPRIDO" ? "#94a3b8" : d.status === "PERDIDO" ? "#1f2937" : TYPE_COLORS[d.tipo] || "#6b7280",
    borderColor: "transparent",
    textColor: "#fff",
    extendedProps: d,
  }))

  return (
    <>
      <div className="rounded-lg border bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="pt-br"
          height="auto"
          events={events}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          buttonText={{
            today: "Hoje",
            month: "Mes",
            week: "Semana",
          }}
          eventClick={(info) => {
            setSelected(info.event.extendedProps)
          }}
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} mais`}
        />
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Prazo</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <Badge className="mt-1" style={{ backgroundColor: TYPE_COLORS[selected.tipo] }}>
                  {DEADLINE_TYPE_LABELS[selected.tipo]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processo</p>
                <p className="text-sm font-mono">{formatCNJ(selected.case_?.numero_processo)}</p>
                <p className="text-xs text-muted-foreground">{selected.case_?.cliente?.nome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Descricao</p>
                <p className="text-sm">{selected.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Data Limite</p>
                  <p className="text-sm font-medium">{new Date(selected.data_limite).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm">{DEADLINE_STATUS_LABELS[selected.status]}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Responsavel</p>
                <p className="text-sm">{selected.responsavel?.name}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
