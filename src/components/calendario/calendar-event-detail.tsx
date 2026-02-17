"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { trpc } from "@/lib/trpc"
import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPE_COLORS,
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_EVENT_STATUS_COLORS,
  formatCNJ,
} from "@/lib/constants"
import {
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  User,
  Briefcase,
  FolderKanban,
  Pencil,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface CalendarEventDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string | null
  onEdit: (id: string) => void
  onRefresh: () => void
}

type CamposEspecificos = Record<string, string | undefined>

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-[#666666]">{label}</p>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  )
}

function formatDate(d: Date | string, allDay?: boolean): string {
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

// Map of type-specific field labels for display
const CAMPOS_LABELS: Record<string, Record<string, string>> = {
  REUNIAO: {
    tipo_reuniao: "Tipo de reunião",
    local: "Local",
    link_virtual: "Link virtual",
    pauta: "Pauta",
    objetivo: "Objetivo",
    ata: "Ata",
    followup: "Follow-up",
  },
  AUDIENCIA: {
    tipo_audiencia: "Tipo de audiência",
    vara: "Vara",
    comarca: "Comarca",
    documentos_necessarios: "Documentos necessários",
    preparacao: "Preparação",
    resultado: "Resultado",
  },
  SUSTENTACAO_ORAL: {
    tribunal: "Tribunal",
    turma_camara: "Turma / Câmara",
    tempo_sustentacao: "Tempo (minutos)",
    teses_principais: "Teses principais",
    pedidos: "Pedidos",
    resultado_julgamento: "Resultado do julgamento",
  },
  DESPACHO_ORAL: {
    vara_gabinete: "Vara / Gabinete",
    comarca: "Comarca",
    assunto: "Assunto",
    resultado: "Resultado",
    encaminhamentos: "Encaminhamentos",
  },
  PESQUISA_JURIDICA: {
    tema: "Tema",
    prazo_entrega: "Prazo de entrega",
    fontes_consultar: "Fontes a consultar",
    fontes_consultadas: "Fontes consultadas",
    status_pesquisa: "Status da pesquisa",
  },
  ANALISE_CASO: {
    tipo_analise: "Tipo de análise",
    elementos_analise: "Elementos de análise",
    conclusao: "Conclusão",
    recomendacao: "Recomendação",
  },
  PRAZO_ANTECIPADO: {
    data_cumprimento_planejada: "Data de cumprimento planejada",
    motivo_antecipacao: "Motivo da antecipação",
    peca_elaborar: "Peça a elaborar",
    status_prazo: "Status do prazo",
  },
  PRAZO_FATAL: {
    peca_elaborar: "Peça a elaborar",
  },
  RETORNO_EMAIL: {
    assunto_email: "Assunto do e-mail",
    prioridade: "Prioridade",
    status_email: "Status do e-mail",
  },
  ATIVIDADE_GERAL: {
    categoria: "Categoria",
    detalhes: "Detalhes",
  },
}

export function CalendarEventDetail({
  open,
  onOpenChange,
  eventId,
  onEdit,
  onRefresh,
}: CalendarEventDetailProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const utils = trpc.useUtils()

  const { data: event } = trpc.calendar.getById.useQuery(
    { id: eventId! },
    { enabled: !!eventId && open }
  )

  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate()
      utils.calendar.getById.invalidate({ id: eventId! })
      onRefresh()
    },
  })

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate()
      onOpenChange(false)
      onRefresh()
    },
  })

  if (!event) return null

  const campos = (event.campos_especificos as CamposEspecificos) || {}
  const fieldLabels = CAMPOS_LABELS[event.tipo_evento] || {}
  const statusColor = CALENDAR_EVENT_STATUS_COLORS[event.status] || ""

  const handleStatusChange = (status: string) => {
    updateMutation.mutate({ id: event.id, status })
  }

  const handleDelete = () => {
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = () => {
    deleteMutation.mutate({ id: event.id })
    setDeleteConfirmOpen(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{
                    backgroundColor:
                      CALENDAR_EVENT_TYPE_COLORS[event.tipo_evento],
                  }}
                />
                <span className="text-xs text-[#666666]">
                  {CALENDAR_EVENT_TYPE_LABELS[event.tipo_evento]}
                </span>
              </div>
              <DialogTitle className="text-lg">{event.titulo}</DialogTitle>
            </div>
            <Badge className={statusColor}>
              {CALENDAR_EVENT_STATUS_LABELS[event.status]}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Date & time */}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="size-4 text-[#666666]" />
              <span>{formatDate(event.data_inicio, event.dia_inteiro)}</span>
              {event.data_fim && (
                <>
                  <span className="text-[#666666]">—</span>
                  <span>{formatDate(event.data_fim, event.dia_inteiro)}</span>
                </>
              )}
              {event.dia_inteiro && (
                <Badge variant="outline" className="text-xs ml-1">
                  Dia inteiro
                </Badge>
              )}
            </div>

            {/* Responsible */}
            {event.responsavel && (
              <div className="flex items-center gap-2 text-sm">
                <User className="size-4 text-[#666666]" />
                <span>{event.responsavel.name}</span>
              </div>
            )}

            {/* Location */}
            {event.local && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-[#666666]" />
                <span>{event.local}</span>
              </div>
            )}

            {/* Virtual link */}
            {event.link_virtual && (
              <div className="flex items-center gap-2 text-sm">
                <LinkIcon className="size-4 text-[#666666]" />
                <a
                  href={event.link_virtual}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#17A2B8] hover:underline truncate"
                >
                  {event.link_virtual}
                </a>
              </div>
            )}

            {/* Reminder */}
            {event.lembrete_minutos != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-[#666666]" />
                <span>
                  Lembrete:{" "}
                  {event.lembrete_minutos === 0
                    ? "No momento"
                    : event.lembrete_minutos >= 1440
                      ? `${Math.floor(event.lembrete_minutos / 1440)} dia(s) antes`
                      : event.lembrete_minutos >= 60
                        ? `${Math.floor(event.lembrete_minutos / 60)} hora(s) antes`
                        : `${event.lembrete_minutos} minutos antes`}
                </span>
              </div>
            )}

            {/* Description */}
            {event.descricao && (
              <DetailRow label="Descrição" value={event.descricao} />
            )}

            <Separator />

            {/* Linked Case */}
            {event.case_ && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="size-4 text-[#666666]" />
                <span>
                  {formatCNJ(event.case_.numero_processo)} —{" "}
                  {event.case_.cliente?.nome}
                </span>
              </div>
            )}

            {/* Linked Project */}
            {event.project && (
              <div className="flex items-center gap-2 text-sm">
                <FolderKanban className="size-4 text-[#666666]" />
                <span>
                  {event.project.codigo} — {event.project.titulo}
                </span>
              </div>
            )}

            {/* Linked Task */}
            {event.task && (
              <DetailRow label="Tarefa vinculada" value={event.task.titulo} />
            )}

            {/* Type-specific fields */}
            {Object.keys(campos).length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-medium text-[#666666] uppercase tracking-wide">
                  Detalhes de {CALENDAR_EVENT_TYPE_LABELS[event.tipo_evento]}
                </p>
                {Object.entries(campos).map(([key, val]) => {
                  if (!val || key.endsWith("_id")) return null
                  const label = fieldLabels[key] || key
                  return <DetailRow key={key} label={label} value={val} />
                })}
              </>
            )}

            {/* Status actions */}
            {event.status !== "CANCELADO" && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {event.status === "AGENDADO" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("EM_ANDAMENTO")}
                      disabled={updateMutation.isPending}
                    >
                      <Play className="size-3 mr-1" />
                      Iniciar
                    </Button>
                  )}
                  {(event.status === "AGENDADO" ||
                    event.status === "EM_ANDAMENTO") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#28A745]"
                      onClick={() => handleStatusChange("CONCLUIDO")}
                      disabled={updateMutation.isPending}
                    >
                      <CheckCircle className="size-3 mr-1" />
                      Concluir
                    </Button>
                  )}
                  {event.status !== "CONCLUIDO" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#DC3545]"
                      onClick={() => handleStatusChange("CANCELADO")}
                      disabled={updateMutation.isPending}
                    >
                      <XCircle className="size-3 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            size="sm"
            variant="ghost"
            className="text-[#DC3545]"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-3 mr-1" />
            Excluir
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onEdit(event.id)
            }}
          >
            <Pencil className="size-3 mr-1" />
            Editar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={confirmDelete}
          >
            {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
