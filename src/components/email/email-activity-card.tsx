"use client"

import {
  CheckCircle2, Clock, AlertTriangle, Calendar, Scale, Folder, User, Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc"

interface EmailActivityCardProps {
  messageId: string
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; class: string }> = {
  PENDENTE: {
    icon: <Clock className="size-3" />,
    label: "Pendente",
    class: "bg-amber-100 text-amber-700",
  },
  EM_ANDAMENTO: {
    icon: <Clock className="size-3" />,
    label: "Em andamento",
    class: "bg-blue-100 text-blue-700",
  },
  CONCLUIDO: {
    icon: <CheckCircle2 className="size-3" />,
    label: "Concluído",
    class: "bg-emerald-100 text-emerald-700",
  },
  CANCELADO: {
    icon: <AlertTriangle className="size-3" />,
    label: "Cancelado",
    class: "bg-gray-100 text-gray-700",
  },
}

const TYPE_LABELS: Record<string, string> = {
  PRAZO: "Prazo",
  AUDIENCIA: "Audiência",
  REUNIAO: "Reunião",
  DESPACHO: "Despacho",
  DILIGENCIA: "Diligência",
  PETICAO: "Petição",
  RECURSO: "Recurso",
  PROVIDENCIA: "Providência",
  OUTRO: "Outro",
}

export function EmailActivityCard({ messageId }: EmailActivityCardProps) {
  const { data, isLoading } = trpc.emailActivity.list.useQuery(
    { outlook_message_id: messageId, limit: 10 },
    { enabled: !!messageId }
  )

  const utils = trpc.useUtils()
  const deleteMutation = trpc.emailActivity.delete.useMutation({
    onSuccess: () => {
      utils.emailActivity.list.invalidate()
    },
  })
  const updateMutation = trpc.emailActivity.update.useMutation({
    onSuccess: () => {
      utils.emailActivity.list.invalidate()
    },
  })

  if (isLoading || !data?.items?.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Atividades deste e-mail ({data.items.length})
      </p>
      {data.items.map((activity) => {
        const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.PENDENTE

        return (
          <div
            key={activity.id}
            className="rounded-md border bg-white p-3 text-xs space-y-2"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] gap-1 ${statusConfig.class}`}>
                {statusConfig.icon} {statusConfig.label}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {TYPE_LABELS[activity.tipo] || activity.tipo}
              </Badge>
              <div className="flex-1" />
              {activity.status === "PENDENTE" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5"
                  onClick={() => updateMutation.mutate({ id: activity.id, status: "CONCLUIDO" })}
                  title="Marcar como concluído"
                >
                  <CheckCircle2 className="size-3 text-emerald-500" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-5"
                onClick={() => {
                  if (confirm("Excluir esta atividade?")) {
                    deleteMutation.mutate({ id: activity.id })
                  }
                }}
              >
                <Trash2 className="size-3 text-muted-foreground" />
              </Button>
            </div>

            <p className="font-medium">{activity.titulo}</p>

            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              {activity.case_ && (
                <span className="flex items-center gap-1">
                  <Scale className="size-3" /> {activity.case_.numero_processo || "Processo"}
                </span>
              )}
              {activity.project && (
                <span className="flex items-center gap-1">
                  <Folder className="size-3" /> {activity.project.codigo}
                </span>
              )}
              {activity.responsavel && (
                <span className="flex items-center gap-1">
                  <User className="size-3" /> {activity.responsavel.name}
                </span>
              )}
              {activity.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  Prazo: {new Date(activity.deadline.data_limite).toLocaleDateString("pt-BR")}
                </span>
              )}
              {activity.calendar_event && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  Evento: {new Date(activity.calendar_event.data_inicio).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
