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
  FATAL: "#DC3545",
  PRAZO_FATAL: "#DC3545",
  ORDINARIO: "#C9A961",
  DILIGENCIA: "#17A2B8",
  AUDIENCIA: "#C9A961",
  AUDIENCIA_CONCILIACAO: "#C9A961",
  AUDIENCIA_INSTRUCAO: "#C9A961",
  AUDIENCIA_SANEAMENTO: "#C9A961",
  ASSEMBLEIA: "#28A745",
  ASSEMBLEIA_CREDORES: "#28A745",
  // Defesa e Resposta
  CONTESTACAO: "#F97316",
  RECONVENCAO: "#F97316",
  REPLICA: "#F97316",
  IMPUGNACAO_VALOR_CAUSA: "#F97316",
  IMPUGNACAO_JUSTICA_GRATUITA: "#F97316",
  IMPUGNACAO_CUMPRIMENTO: "#F97316",
  MANIFESTACAO: "#F97316",
  // Recursais
  APELACAO: "#8B5CF6",
  AGRAVO_INSTRUMENTO: "#8B5CF6",
  AGRAVO_INTERNO: "#8B5CF6",
  RECURSO_ESPECIAL: "#8B5CF6",
  RECURSO_EXTRAORDINARIO: "#8B5CF6",
  RECURSO_ORDINARIO: "#8B5CF6",
  RECURSO_REVISTA: "#8B5CF6",
  EMBARGOS_DECLARACAO: "#8B5CF6",
  EMBARGOS_DIVERGENCIA: "#8B5CF6",
  EMBARGOS_EXECUCAO: "#8B5CF6",
  EMBARGOS_TERCEIRO: "#8B5CF6",
  // RJ
  RJ_STAY_PERIOD: "#28A745",
  RJ_APRESENTACAO_PLANO: "#28A745",
  RJ_HABILITACAO_CREDITO: "#28A745",
  RJ_IMPUGNACAO_CREDITO: "#28A745",
  // Execucao
  PAGAMENTO_VOLUNTARIO: "#0EA5E9",
  PENHORA: "#0EA5E9",
  LEILAO: "#0EA5E9",
  DEPOSITO_JUDICIAL: "#0EA5E9",
  // Administrativo
  PROTOCOLO: "#17A2B8",
  JUNTADA_DOCUMENTO: "#17A2B8",
  PERICIA: "#17A2B8",
  CUMPRIMENTO_DECISAO: "#17A2B8",
  EMENDA_INICIAL: "#17A2B8",
  // Tarefas internas
  TAREFA_INTERNA: "#6B7280",
  FOLLOW_UP: "#6B7280",
  REUNIAO_INTERNA: "#6B7280",
  RETORNO_CLIENTE: "#6B7280",
  RETORNO_EMAIL: "#6B7280",
}

const DEFAULT_TYPE_COLOR = "#6B7280"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DeadlinesCalendar({ deadlines }: { deadlines: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any>(null)

  const events = deadlines.map((d) => ({
    id: d.id,
    title: `${DEADLINE_TYPE_LABELS[d.tipo] || d.tipo}: ${d.descricao}`,
    start: new Date(d.data_fim_prazo || d.data_limite).toISOString().split("T")[0],
    backgroundColor: d.status === "CUMPRIDO" ? "#94a3b8" : (d.status === "PERDIDO" || d.status === "VENCIDO") ? "#1f2937" : d.status === "CANCELADO" ? "#6b7280" : TYPE_COLORS[d.tipo] || DEFAULT_TYPE_COLOR,
    borderColor: "transparent",
    textColor: "#fff",
    extendedProps: d,
  }))

  return (
    <>
      <div className="rounded-lg border bg-white p-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
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
                <p className="text-xs text-[#666666]">Tipo</p>
                <Badge className="mt-1" style={{ backgroundColor: TYPE_COLORS[selected.tipo] || DEFAULT_TYPE_COLOR }}>
                  {DEADLINE_TYPE_LABELS[selected.tipo] || selected.tipo}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-[#666666]">Processo</p>
                <p className="text-sm font-mono">{formatCNJ(selected.case_?.numero_processo)}</p>
                <p className="text-xs text-[#666666]">{selected.case_?.cliente?.nome}</p>
              </div>
              <div>
                <p className="text-xs text-[#666666]">Descrição</p>
                <p className="text-sm">{selected.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#666666]">Data Limite</p>
                  <p className="text-sm font-medium">{new Date(selected.data_fim_prazo || selected.data_limite).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-[#666666]">Status</p>
                  <p className="text-sm">{DEADLINE_STATUS_LABELS[selected.status]}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-[#666666]">Responsável</p>
                <p className="text-sm">{selected.responsavel?.name}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
