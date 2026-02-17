"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { trpc } from "@/lib/trpc"
import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPE_COLORS,
} from "@/lib/constants"
import { Save, Trash2, Loader2 } from "lucide-react"
import { EventTypeFields } from "./event-type-fields"

type CamposEspecificos = Record<string, unknown>

interface CalendarEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId?: string | null
  defaultDate?: Date | null
  onSuccess: () => void
}

const EVENT_TYPES = Object.keys(CALENDAR_EVENT_TYPE_LABELS)

const LEMBRETE_OPTIONS = [
  { value: "0", label: "No momento" },
  { value: "5", label: "5 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "120", label: "2 horas antes" },
  { value: "1440", label: "1 dia antes" },
]

function toLocalDatetime(d: Date | string): string {
  const date = new Date(d)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function toLocalDate(d: Date | string): string {
  const date = new Date(d)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

export function CalendarEventModal({
  open,
  onOpenChange,
  eventId,
  defaultDate,
  onSuccess,
}: CalendarEventModalProps) {
  const utils = trpc.useUtils()
  const isEdit = !!eventId
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Form state
  const [tipoEvento, setTipoEvento] = useState("")
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [diaInteiro, setDiaInteiro] = useState(false)
  const [dataInicio, setDataInicio] = useState("")
  const [dataFim, setDataFim] = useState("")
  const [responsavelId, setResponsavelId] = useState("")
  const [lembreteMinutos, setLembreteMinutos] = useState("")
  const [caseId, setCaseId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [taskId, setTaskId] = useState("")
  const [camposEspecificos, setCamposEspecificos] = useState<CamposEspecificos>({})

  // Data queries
  const { data: users } = trpc.users.list.useQuery()
  const { data: cases } = trpc.calendar.casesForSelect.useQuery()
  const { data: projects } = trpc.calendar.projectsForSelect.useQuery()
  const { data: tasks } = trpc.calendar.tasksForProject.useQuery(
    { project_id: projectId },
    { enabled: !!projectId }
  )

  // Load existing event for edit
  const { data: existingEvent } = trpc.calendar.getById.useQuery(
    { id: eventId! },
    { enabled: isEdit }
  )

  // Mutations
  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate()
      onSuccess()
      onOpenChange(false)
    },
  })

  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate()
      onSuccess()
      onOpenChange(false)
    },
  })

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => {
      utils.calendar.list.invalidate()
      onSuccess()
      onOpenChange(false)
      setDeleteConfirmOpen(false)
    },
  })

  // Reset form when opening
  useEffect(() => {
    if (!open) return

    if (isEdit && existingEvent) {
      setTipoEvento(existingEvent.tipo_evento)
      setTitulo(existingEvent.titulo)
      setDescricao(existingEvent.descricao || "")
      setDiaInteiro(existingEvent.dia_inteiro)
      setDataInicio(
        existingEvent.dia_inteiro
          ? toLocalDate(existingEvent.data_inicio)
          : toLocalDatetime(existingEvent.data_inicio)
      )
      setDataFim(
        existingEvent.data_fim
          ? existingEvent.dia_inteiro
            ? toLocalDate(existingEvent.data_fim)
            : toLocalDatetime(existingEvent.data_fim)
          : ""
      )
      setResponsavelId(existingEvent.responsavel_id || "")
      setLembreteMinutos(
        existingEvent.lembrete_minutos != null
          ? String(existingEvent.lembrete_minutos)
          : ""
      )
      setCaseId(existingEvent.case_id || "")
      setProjectId(existingEvent.project_id || "")
      setTaskId(existingEvent.task_id || "")
      setCamposEspecificos(
        (existingEvent.campos_especificos as CamposEspecificos) || {}
      )
    } else {
      setTipoEvento("")
      setTitulo("")
      setDescricao("")
      setDiaInteiro(false)
      setDataInicio(defaultDate ? toLocalDatetime(defaultDate) : "")
      setDataFim("")
      setResponsavelId("")
      setLembreteMinutos("")
      setCaseId("")
      setProjectId("")
      setTaskId("")
      setCamposEspecificos({})
    }
  }, [open, isEdit, existingEvent, defaultDate])

  const handleSubmit = () => {
    if (!tipoEvento || !titulo || !dataInicio) return

    const payload = {
      tipo_evento: tipoEvento,
      titulo,
      descricao: descricao || undefined,
      data_inicio: new Date(dataInicio),
      data_fim: dataFim ? new Date(dataFim) : null,
      dia_inteiro: diaInteiro,
      campos_especificos:
        Object.keys(camposEspecificos).length > 0 ? camposEspecificos : null,
      responsavel_id: responsavelId || null,
      lembrete_minutos: lembreteMinutos ? parseInt(lembreteMinutos) : null,
      case_id: caseId || null,
      project_id: projectId || null,
      task_id: taskId || null,
    }

    if (isEdit) {
      updateMutation.mutate({ id: eventId!, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Event Type */}
            <div className="space-y-1.5">
              <Label>Tipo de evento *</Label>
              <Select value={tipoEvento} onValueChange={setTipoEvento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor: CALENDAR_EVENT_TYPE_COLORS[type],
                          }}
                        />
                        {CALENDAR_EVENT_TYPE_LABELS[type]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Título do evento"
              />
            </div>

            {/* All Day Switch */}
            <div className="flex items-center gap-2">
              <Switch
                checked={diaInteiro}
                onCheckedChange={setDiaInteiro}
                id="dia-inteiro"
              />
              <Label htmlFor="dia-inteiro" className="text-sm font-normal">
                Dia inteiro
              </Label>
            </div>

            {/* Date/Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início *</Label>
                <Input
                  type={diaInteiro ? "date" : "datetime-local"}
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim</Label>
                <Input
                  type={diaInteiro ? "date" : "datetime-local"}
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            {/* Responsible */}
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select value={responsavelId} onValueChange={setResponsavelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar responsável..." />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reminder */}
            <div className="space-y-1.5">
              <Label>Lembrete</Label>
              <Select value={lembreteMinutos} onValueChange={setLembreteMinutos}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem lembrete" />
                </SelectTrigger>
                <SelectContent>
                  {LEMBRETE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição do evento..."
                rows={2}
              />
            </div>

            {/* Linkage section */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Vinculação</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Processo</Label>
                  <Select value={caseId} onValueChange={setCaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum processo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {cases?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.numero_processo} — {c.cliente?.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Projeto</Label>
                  <Select
                    value={projectId}
                    onValueChange={(v) => {
                      setProjectId(v)
                      setTaskId("")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum projeto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {projects?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.codigo} — {p.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {projectId && projectId !== "none" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tarefa do projeto</Label>
                    <Select value={taskId} onValueChange={setTaskId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhuma tarefa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {tasks?.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Type-specific fields */}
            {tipoEvento && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3">
                  Campos de {CALENDAR_EVENT_TYPE_LABELS[tipoEvento]}
                </p>
                <div className="space-y-3">
                  <EventTypeFields
                    tipoEvento={tipoEvento}
                    value={camposEspecificos}
                    onChange={setCamposEspecificos}
                    isEdit={isEdit}
                  />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
          {isEdit && (
            <Button
              variant="ghost"
              className="text-destructive mr-auto"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="size-4 mr-1" />
              Excluir Evento
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!tipoEvento || !titulo || !dataInicio || isLoading}
          >
            {isLoading ? (
              <><Loader2 className="size-4 mr-1 animate-spin" />Salvando...</>
            ) : (
              <><Save className="size-4 mr-1" />{isEdit ? "Salvar Evento" : "Criar Evento"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    {isEdit && (
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
              onClick={() => eventId && deleteMutation.mutate({ id: eventId })}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
