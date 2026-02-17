"use client"

import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants"
import {
  FileText, Scale, CheckCircle, Search, Upload, Users, UserPlus,
  Mail, MessageSquare, BarChart, DollarSign, Banknote, CheckSquare,
  Flag, Zap, StickyNote, Circle, Plus, Filter, Clock,
} from "lucide-react"
import { ActivityForm } from "./activity-form"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  PETICAO: FileText, AUDIENCIA: Scale, SUSTENTACAO: Scale, DESPACHO: FileText,
  PESQUISA: Search, ANALISE: Search, EMAIL: Mail, TELEFONEMA: MessageSquare,
  REUNIAO: Users, NEGOCIACAO: UserPlus, DILIGENCIA: Search,
  TAREFA_PROJETO: CheckSquare, MARCO_ALCANCADO: Flag, OUTRO: Circle,
  // Extended types
  JULGAMENTO: Scale, CUMPRIMENTO_PRAZO: CheckCircle, PROTOCOLO: Upload,
  REUNIAO_CLIENTE: Users, REUNIAO_INTERNA: Users, REUNIAO_CONTRAPARTE: UserPlus,
  EMAIL_ENVIADO: Mail, COMUNICADO: MessageSquare, RELATORIO_ENTREGUE: BarChart,
  LIBERACAO_ALVARA: DollarSign, EXPEDICAO_RPV: DollarSign, PAGAMENTO_RECEBIDO: Banknote,
  TAREFA_CONCLUIDA: CheckSquare, MARCO_ATINGIDO: Flag, DECISAO_ESTRATEGICA: Zap,
  NOTA: StickyNote,
}

const TYPE_COLORS: Record<string, string> = {
  PETICAO: "text-blue-600 bg-blue-50", AUDIENCIA: "text-purple-600 bg-purple-50",
  REUNIAO: "text-green-600 bg-green-50", DILIGENCIA: "text-amber-600 bg-amber-50",
  EMAIL: "text-cyan-600 bg-cyan-50", MARCO_ALCANCADO: "text-emerald-600 bg-emerald-50",
  TAREFA_PROJETO: "text-indigo-600 bg-indigo-50", OUTRO: "text-gray-500 bg-gray-50",
}

interface ActivityTimelineProps {
  caseId?: string
  projectId?: string
  personId?: string
  userId?: string
  dateRange?: { start: Date; end: Date }
  maxItems?: number
  showFilters?: boolean
  compact?: boolean
  groupByDate?: boolean
  showDocuments?: boolean
  className?: string
}

export function ActivityTimeline({
  caseId,
  projectId,
  personId,
  userId,
  dateRange,
  maxItems = 50,
  showFilters = false,
  compact = false,
  groupByDate = false,
  className,
}: ActivityTimelineProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [tipoFilter, setTipoFilter] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const { data, isLoading } = trpc.activities.list.useQuery({
    case_id: caseId,
    project_id: projectId,
    person_id: personId,
    user_id: userId,
    tipo: tipoFilter.length > 0 ? tipoFilter : undefined,
    date_from: dateRange?.start,
    date_to: dateRange?.end,
    limit: maxItems,
  })

  const items = data?.items || []

  // Group by date
  const grouped = new Map<string, typeof items>()
  if (groupByDate) {
    for (const item of items) {
      const key = new Date(item.data).toLocaleDateString("pt-BR")
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(item)
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className || ""}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderItem = (item: (typeof items)[0], index: number, isLast: boolean) => {
    const Icon = ICON_MAP[item.tipo] || Circle
    const colorClass = TYPE_COLORS[item.tipo] || TYPE_COLORS.OUTRO
    const label = ACTIVITY_TYPE_LABELS[item.tipo] || item.tipo

    return (
      <div key={item.id} className="flex gap-3">
        {/* Timeline line + icon */}
        <div className="flex flex-col items-center">
          <div className={`flex size-7 items-center justify-center rounded-full shrink-0 ${colorClass}`}>
            <Icon className="size-3.5" />
          </div>
          {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
        </div>

        {/* Content */}
        <div className={`pb-${compact ? "3" : "5"} min-w-0 flex-1`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(item.data).toLocaleDateString("pt-BR")}
              {!compact && (
                <span className="ml-1">
                  {new Date(item.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </span>
            <Badge variant="secondary" className="text-[10px]">{label}</Badge>
            {item.report_priority >= 2 && <span title="Crítico">🔥</span>}
            {item.report_priority === 1 && <span title="Destaque">⭐</span>}
            {item.user && <span className="text-xs text-muted-foreground">por {item.user.name}</span>}
            {item.duracao_minutos && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Clock className="size-3" />{item.duracao_minutos}min
              </span>
            )}
          </div>

          <p className={`${compact ? "text-xs" : "text-sm"} mt-0.5`}>{item.descricao}</p>

          {!compact && item.resultado && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-medium">Resultado:</span> {item.resultado}
            </p>
          )}

          {/* Links */}
          {!compact && (
            <div className="flex gap-2 mt-1 flex-wrap">
              {item.case_ && (
                <Link href={`/processos/${item.case_.id}`} className="text-xs text-blue-600 hover:underline">
                  {item.case_.numero_processo}
                </Link>
              )}
              {item.project && (
                <Link href={`/projetos/${item.project.id}`} className="text-xs text-indigo-600 hover:underline">
                  {item.project.codigo} — {item.project.titulo}
                </Link>
              )}
            </div>
          )}

          {!compact && item.financial_impact && (
            <Badge variant="outline" className="mt-1 text-xs text-emerald-700">
              R$ {Number(item.financial_impact).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Badge>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{items.length} atividade(s)</p>
        <div className="flex gap-2">
          {showFilters && (
            <Button variant="outline" size="sm" onClick={() => setShowFilterPanel(!showFilterPanel)}>
              <Filter className="size-3 mr-1" />
              Filtros
              {tipoFilter.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs px-1">{tipoFilter.length}</Badge>
              )}
            </Button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-3 mr-1" />
            Registrar
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && showFilterPanel && (
        <div className="mb-4 p-3 border rounded-lg space-y-2">
          <p className="text-xs font-medium">Filtrar por tipo:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant={tipoFilter.includes(key) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() =>
                  setTipoFilter((prev) =>
                    prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
                  )
                }
              >
                {label}
              </Badge>
            ))}
          </div>
          {tipoFilter.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTipoFilter([])}>
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Timeline */}
      {items.length === 0 ? (
        <div className="text-center py-8">
          <Circle className="size-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Nenhuma atividade registrada.</p>
        </div>
      ) : groupByDate ? (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([date, groupItems]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">{date}</p>
              <div className="space-y-0">
                {groupItems.map((item, i) => renderItem(item, i, i === groupItems.length - 1))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-0">
          {items.map((item, i) => renderItem(item, i, i === items.length - 1))}
        </div>
      )}

      {/* Activity Form Modal */}
      <ActivityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultCaseId={caseId}
        defaultProjectId={projectId}
        defaultPersonId={personId}
      />
    </div>
  )
}
