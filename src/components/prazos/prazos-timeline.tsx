"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle, Calendar as CalendarIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DEADLINE_TYPE_LABELS, DEADLINE_STATUS_LABELS, formatCNJ, daysUntil,
} from "@/lib/constants"
import { trpc } from "@/lib/trpc"

const TYPE_DOT_COLORS: Record<string, string> = {
  FATAL: "bg-[#DC3545]",
  PRAZO_FATAL: "bg-[#DC3545]",
  ORDINARIO: "bg-[#C9A961]",
  DILIGENCIA: "bg-[#17A2B8]",
  AUDIENCIA: "bg-[#C9A961]",
  AUDIENCIA_CONCILIACAO: "bg-[#C9A961]",
  AUDIENCIA_INSTRUCAO: "bg-[#C9A961]",
  AUDIENCIA_SANEAMENTO: "bg-[#C9A961]",
  ASSEMBLEIA: "bg-[#28A745]",
  ASSEMBLEIA_CREDORES: "bg-[#28A745]",
  // Recursais
  APELACAO: "bg-[#8B5CF6]",
  AGRAVO_INSTRUMENTO: "bg-[#8B5CF6]",
  AGRAVO_INTERNO: "bg-[#8B5CF6]",
  RECURSO_ESPECIAL: "bg-[#8B5CF6]",
  RECURSO_EXTRAORDINARIO: "bg-[#8B5CF6]",
  RECURSO_ORDINARIO: "bg-[#8B5CF6]",
  RECURSO_REVISTA: "bg-[#8B5CF6]",
  RECURSO_ORDINARIO_TRABALHISTA: "bg-[#8B5CF6]",
  EMBARGOS_DECLARACAO: "bg-[#8B5CF6]",
  EMBARGOS_DIVERGENCIA: "bg-[#8B5CF6]",
  EMBARGOS_EXECUCAO: "bg-[#8B5CF6]",
  EMBARGOS_TERCEIRO: "bg-[#8B5CF6]",
  // Defesa
  CONTESTACAO: "bg-[#F97316]",
  RECONVENCAO: "bg-[#F97316]",
  REPLICA: "bg-[#F97316]",
  IMPUGNACAO_VALOR_CAUSA: "bg-[#F97316]",
  IMPUGNACAO_JUSTICA_GRATUITA: "bg-[#F97316]",
  IMPUGNACAO_CUMPRIMENTO: "bg-[#F97316]",
  MANIFESTACAO: "bg-[#F97316]",
  // RJ
  RJ_STAY_PERIOD: "bg-[#28A745]",
  RJ_APRESENTACAO_PLANO: "bg-[#28A745]",
  RJ_HABILITACAO_CREDITO: "bg-[#28A745]",
  RJ_IMPUGNACAO_CREDITO: "bg-[#28A745]",
  // Tarefas internas
  TAREFA_INTERNA: "bg-[#6B7280]",
  FOLLOW_UP: "bg-[#6B7280]",
  REUNIAO_INTERNA: "bg-[#6B7280]",
  RETORNO_CLIENTE: "bg-[#6B7280]",
  RETORNO_EMAIL: "bg-[#6B7280]",
}

const DEFAULT_DOT_COLOR = "bg-[#6B7280]"

const TYPE_BADGE_COLORS: Record<string, string> = {
  FATAL: "bg-[#DC3545]/10 text-[#DC3545]",
  PRAZO_FATAL: "bg-[#DC3545]/10 text-[#DC3545]",
  ORDINARIO: "bg-[#C9A961]/10 text-[#C9A961]",
  DILIGENCIA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  AUDIENCIA: "bg-[#C9A961]/10 text-[#C9A961]",
  AUDIENCIA_CONCILIACAO: "bg-[#C9A961]/10 text-[#C9A961]",
  AUDIENCIA_INSTRUCAO: "bg-[#C9A961]/10 text-[#C9A961]",
  AUDIENCIA_SANEAMENTO: "bg-[#C9A961]/10 text-[#C9A961]",
  ASSEMBLEIA: "bg-[#28A745]/10 text-[#28A745]",
  ASSEMBLEIA_CREDORES: "bg-[#28A745]/10 text-[#28A745]",
  // Recursais
  APELACAO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  AGRAVO_INSTRUMENTO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  AGRAVO_INTERNO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  RECURSO_ESPECIAL: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  RECURSO_EXTRAORDINARIO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  RECURSO_ORDINARIO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  RECURSO_REVISTA: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  RECURSO_ORDINARIO_TRABALHISTA: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  EMBARGOS_DECLARACAO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  EMBARGOS_DIVERGENCIA: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  EMBARGOS_EXECUCAO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  EMBARGOS_TERCEIRO: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
  // Defesa
  CONTESTACAO: "bg-[#F97316]/10 text-[#F97316]",
  RECONVENCAO: "bg-[#F97316]/10 text-[#F97316]",
  REPLICA: "bg-[#F97316]/10 text-[#F97316]",
  IMPUGNACAO_VALOR_CAUSA: "bg-[#F97316]/10 text-[#F97316]",
  IMPUGNACAO_JUSTICA_GRATUITA: "bg-[#F97316]/10 text-[#F97316]",
  IMPUGNACAO_CUMPRIMENTO: "bg-[#F97316]/10 text-[#F97316]",
  MANIFESTACAO: "bg-[#F97316]/10 text-[#F97316]",
  // RJ
  RJ_STAY_PERIOD: "bg-[#28A745]/10 text-[#28A745]",
  RJ_APRESENTACAO_PLANO: "bg-[#28A745]/10 text-[#28A745]",
  RJ_HABILITACAO_CREDITO: "bg-[#28A745]/10 text-[#28A745]",
  RJ_IMPUGNACAO_CREDITO: "bg-[#28A745]/10 text-[#28A745]",
  // Tarefas internas
  TAREFA_INTERNA: "bg-[#6B7280]/10 text-[#6B7280]",
  FOLLOW_UP: "bg-[#6B7280]/10 text-[#6B7280]",
  REUNIAO_INTERNA: "bg-[#6B7280]/10 text-[#6B7280]",
  RETORNO_CLIENTE: "bg-[#6B7280]/10 text-[#6B7280]",
  RETORNO_EMAIL: "bg-[#6B7280]/10 text-[#6B7280]",
}

const DEFAULT_BADGE_COLOR = "bg-[#6B7280]/10 text-[#6B7280]"

const TYPE_BORDER_COLORS: Record<string, string> = {
  FATAL: "border-l-[#DC3545]",
  PRAZO_FATAL: "border-l-[#DC3545]",
  DILIGENCIA: "border-l-[#17A2B8]",
  ASSEMBLEIA: "border-l-[#28A745]",
  ASSEMBLEIA_CREDORES: "border-l-[#28A745]",
  ORDINARIO: "border-l-[#C9A961]",
  AUDIENCIA: "border-l-[#C9A961]",
  AUDIENCIA_CONCILIACAO: "border-l-[#C9A961]",
  AUDIENCIA_INSTRUCAO: "border-l-[#C9A961]",
  AUDIENCIA_SANEAMENTO: "border-l-[#C9A961]",
  APELACAO: "border-l-[#8B5CF6]",
  AGRAVO_INSTRUMENTO: "border-l-[#8B5CF6]",
  AGRAVO_INTERNO: "border-l-[#8B5CF6]",
  RECURSO_ESPECIAL: "border-l-[#8B5CF6]",
  RECURSO_EXTRAORDINARIO: "border-l-[#8B5CF6]",
  EMBARGOS_DECLARACAO: "border-l-[#8B5CF6]",
  CONTESTACAO: "border-l-[#F97316]",
  RECONVENCAO: "border-l-[#F97316]",
  REPLICA: "border-l-[#F97316]",
  MANIFESTACAO: "border-l-[#F97316]",
  RJ_STAY_PERIOD: "border-l-[#28A745]",
  RJ_APRESENTACAO_PLANO: "border-l-[#28A745]",
  RJ_HABILITACAO_CREDITO: "border-l-[#28A745]",
  TAREFA_INTERNA: "border-l-[#6B7280]",
  FOLLOW_UP: "border-l-[#6B7280]",
  REUNIAO_INTERNA: "border-l-[#6B7280]",
}

const DEFAULT_BORDER_COLOR = "border-l-[#6B7280]"

const PRIORITY_INDICATOR: Record<string, string> = {
  CRITICA: "ring-2 ring-red-400",
  ALTA: "ring-2 ring-orange-400",
  MEDIA: "",
  BAIXA: "",
}

function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" })
  const formatted = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  if (diffDays < 0) return `${formatted} (${weekday}) - VENCIDO`
  if (diffDays === 0) return `${formatted} (${weekday}) - HOJE`
  if (diffDays === 1) return `${formatted} (${weekday}) - AMANHA`
  return `${formatted} (${weekday}) - em ${diffDays} dias`
}

function getDateGroupColor(dateStr: string): { line: string; bg: string; text: string } {
  const date = new Date(dateStr + "T12:00:00")
  const days = daysUntil(date)
  if (days < 0) return { line: "bg-[#DC3545]", bg: "bg-[#DC3545]/10", text: "text-[#DC3545]" }
  if (days === 0) return { line: "bg-[#DC3545]", bg: "bg-[#DC3545]/10", text: "text-[#DC3545]" }
  if (days <= 3) return { line: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700" }
  if (days <= 7) return { line: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" }
  return { line: "bg-[#28A745]", bg: "bg-emerald-50", text: "text-emerald-700" }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TimelineDeadline {
  id: string
  tipo: string
  descricao: string
  data_fim_prazo: string | Date
  titulo?: string | null
  status: string
  prioridade?: string
  case_?: {
    id: string
    numero_processo: string | null
    tipo?: string
    uf?: string
    cliente?: { id: string; nome: string }
  } | null
  responsavel?: { id: string; name: string; avatar_url?: string | null } | null
}

export function PrazosTimeline() {
  const [selectedDeadline, setSelectedDeadline] = useState<TimelineDeadline | null>(null)

  const { data: listData, isLoading } = trpc.deadlines.listNew.useQuery({
    per_page: 200,
    sort_by: "data_fim_prazo",
    sort_dir: "asc",
  })

  const deadlines = (listData?.items ?? []) as TimelineDeadline[]

  // Group deadlines by date
  const grouped: Record<string, TimelineDeadline[]> = {}
  for (const d of deadlines) {
    const dateKey = new Date(d.data_fim_prazo).toISOString().split("T")[0]
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(d)
  }

  // Sort date keys
  const sortedDates = Object.keys(grouped).sort()

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-muted animate-pulse mt-1.5" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
              <div className="h-16 w-full rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[#666666]">
        <CalendarIcon className="size-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Nenhum prazo pendente</p>
        <p className="text-sm">Todos os prazos foram cumpridos ou nao ha prazos cadastrados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Timeline container */}
      <div className="relative">
        {sortedDates.map((dateKey, dateIdx) => {
          const items = grouped[dateKey]
          const colors = getDateGroupColor(dateKey)
          const isLast = dateIdx === sortedDates.length - 1

          return (
            <div key={dateKey} className="relative flex gap-4 pb-8">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Date dot */}
              <div className="relative z-10 shrink-0 mt-0.5">
                <div className={`size-6 rounded-full ${colors.line} flex items-center justify-center`}>
                  <div className="size-2.5 rounded-full bg-white" />
                </div>
              </div>

              {/* Date group content */}
              <div className="flex-1 min-w-0">
                {/* Date header */}
                <div className={`inline-flex items-center gap-2 rounded-md px-3 py-1 mb-3 ${colors.bg}`}>
                  <CalendarIcon className={`size-3.5 ${colors.text}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {formatDateHeader(dateKey)}
                  </span>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${colors.text} bg-white/50`}>
                    {items.length}
                  </Badge>
                </div>

                {/* Deadline cards for this date */}
                <div className="space-y-2">
                  {items.map((d) => {
                    const days = daysUntil(d.data_fim_prazo)
                    return (
                      <Card
                        key={d.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                          TYPE_BORDER_COLORS[d.tipo] || DEFAULT_BORDER_COLOR
                        } ${d.prioridade ? PRIORITY_INDICATOR[d.prioridade] || "" : ""}`}
                        onClick={() => setSelectedDeadline(d)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className={`text-[10px] shrink-0 ${TYPE_BADGE_COLORS[d.tipo] || DEFAULT_BADGE_COLOR}`}>
                                  {DEADLINE_TYPE_LABELS[d.tipo] || d.tipo}
                                </Badge>
                                {(d.tipo === "FATAL" || d.tipo === "PRAZO_FATAL") && days <= 2 && (
                                  <AlertTriangle className="size-3.5 text-[#DC3545] animate-pulse" />
                                )}
                              </div>
                              <p className="text-sm font-medium truncate">{d.titulo || d.descricao}</p>
                              {d.case_ && (
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-[#666666]">
                                  <Link
                                    href={`/processos/${d.case_.id}`}
                                    className="hover:underline text-primary font-mono"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {formatCNJ(d.case_.numero_processo) || "Sem numero"}
                                  </Link>
                                  <span className="truncate max-w-[150px]">{d.case_.cliente?.nome}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {d.responsavel && (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="size-6">
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                      {getInitials(d.responsavel.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-[#666666] hidden sm:inline">
                                    {d.responsavel.name.split(" ")[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedDeadline} onOpenChange={() => setSelectedDeadline(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Prazo</DialogTitle>
          </DialogHeader>
          {selectedDeadline && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#666666] mb-1">Tipo</p>
                <Badge variant="secondary" className={TYPE_BADGE_COLORS[selectedDeadline.tipo] || DEFAULT_BADGE_COLOR}>
                  {DEADLINE_TYPE_LABELS[selectedDeadline.tipo] || selectedDeadline.tipo}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-[#666666] mb-1">Descrição</p>
                <p className="text-sm">{selectedDeadline.titulo || selectedDeadline.descricao}</p>
              </div>
              {selectedDeadline.case_ && (
                <div>
                  <p className="text-xs text-[#666666] mb-1">Processo</p>
                  <p className="text-sm font-mono">{formatCNJ(selectedDeadline.case_.numero_processo)}</p>
                  <p className="text-xs text-[#666666]">{selectedDeadline.case_.cliente?.nome}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#666666] mb-1">Data Limite</p>
                  <p className="text-sm font-medium">
                    {new Date(selectedDeadline.data_fim_prazo).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#666666] mb-1">Status</p>
                  <p className="text-sm">{DEADLINE_STATUS_LABELS[selectedDeadline.status]}</p>
                </div>
              </div>
              {selectedDeadline.responsavel && (
                <div>
                  <p className="text-xs text-[#666666] mb-1">Responsável</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(selectedDeadline.responsavel.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedDeadline.responsavel.name}</span>
                  </div>
                </div>
              )}
              {selectedDeadline.case_ && (
                <div className="pt-2 flex justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/processos/${selectedDeadline.case_.id}`}>
                      Ver Processo
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
