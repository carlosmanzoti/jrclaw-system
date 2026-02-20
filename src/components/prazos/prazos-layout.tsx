"use client"

import { useState, useEffect, useMemo, createContext, useContext } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  AlertTriangle, Check, Plus, Filter, X,
  List, Calendar as CalendarIcon, MoreHorizontal,
  Pencil, ExternalLink, BookOpen, Scale,
  LayoutGrid, Timer, Activity, Search,
  Flame, ShieldAlert, CalendarDays, TrendingUp, FileText,
  XCircle, Loader2,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DEADLINE_TYPE_LABELS, formatCNJ, daysUntil, deadlineColor,
  ESTADOS_BRASIL,
} from "@/lib/constants"
import { PrazosTimeline } from "./prazos-timeline"
import { WorkspaceView } from "./workspace/workspace-view"

// Lazy-load FullCalendar to avoid SSR issues and reduce initial bundle
const DeadlinesCalendar = dynamic(() => import("./deadlines-calendar"), { ssr: false })

// ─── Constants ──────────────────────────────────────────────────────

const TYPE_BORDER: Record<string, string> = {
  FATAL: "border-l-[#DC3545]",
  PRAZO_FATAL: "border-l-[#DC3545]",
  ORDINARIO: "border-l-[#C9A961]",
  DILIGENCIA: "border-l-[#17A2B8]",
  AUDIENCIA: "border-l-[#C9A961]",
  ASSEMBLEIA: "border-l-[#28A745]",
  // New categories
  CONTESTACAO: "border-l-[#DC2626]",
  APELACAO: "border-l-[#DC2626]",
  AGRAVO_INSTRUMENTO: "border-l-[#DC2626]",
  RECURSO_ESPECIAL: "border-l-[#7C3AED]",
  RECURSO_EXTRAORDINARIO: "border-l-[#7C3AED]",
  AUDIENCIA_CONCILIACAO: "border-l-[#0EA5E9]",
  AUDIENCIA_INSTRUCAO: "border-l-[#0EA5E9]",
  RJ_STAY_PERIOD: "border-l-[#059669]",
  RJ_HABILITACAO_CREDITO: "border-l-[#059669]",
  TAREFA_INTERNA: "border-l-[#8B5CF6]",
}

const TYPE_BADGE: Record<string, string> = {
  FATAL: "bg-[#DC3545]/10 text-[#DC3545]",
  PRAZO_FATAL: "bg-[#DC3545]/10 text-[#DC3545]",
  ORDINARIO: "bg-[#C9A961]/10 text-[#C9A961]",
  DILIGENCIA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  AUDIENCIA: "bg-[#C9A961]/10 text-[#C9A961]",
  ASSEMBLEIA: "bg-[#28A745]/10 text-[#28A745]",
}

const STATUS_BADGE: Record<string, string> = {
  FUTURO: "bg-slate-100 text-slate-600",
  CORRENDO: "bg-blue-100 text-blue-700",
  PROXIMO: "bg-amber-100 text-amber-700",
  URGENTE: "bg-orange-100 text-orange-700",
  HOJE: "bg-red-100 text-red-700",
  VENCIDO: "bg-[#DC3545]/10 text-[#DC3545]",
  CUMPRIDO: "bg-[#28A745]/10 text-[#28A745]",
  CANCELADO: "bg-gray-100 text-gray-600",
  SUSPENSO: "bg-purple-100 text-purple-600",
  INTERROMPIDO: "bg-pink-100 text-pink-600",
  PENDENTE: "bg-[#C9A961]/10 text-[#C9A961]",
  PERDIDO: "bg-[#DC3545]/10 text-[#DC3545]",
}

const STATUS_LABELS: Record<string, string> = {
  FUTURO: "Futuro",
  CORRENDO: "Correndo",
  PROXIMO: "Próximo",
  URGENTE: "Urgente",
  HOJE: "Hoje",
  VENCIDO: "Vencido",
  CUMPRIDO: "Cumprido",
  CANCELADO: "Cancelado",
  SUSPENSO: "Suspenso",
  INTERROMPIDO: "Interrompido",
  PENDENTE: "Pendente",
  PERDIDO: "Perdido",
}

// ─── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function daysLabel(days: number): string {
  if (days === 0) return "HOJE"
  if (days === 1) return "Amanha"
  if (days > 0) return `${days} dias`
  if (days === -1) return "VENCIDO ha 1 dia"
  return `VENCIDO ha ${Math.abs(days)} dias`
}

function countdownText(days: number): string {
  if (days < 0) return `Vencido ha ${Math.abs(days)} dia(s)`
  if (days === 0) return "Vence HOJE"
  if (days === 1) return "Vence AMANHA"
  return `Faltam ${days} dias`
}

// ─── Context for opening workspace drawer ────────────────────────────

const PrazosContext = createContext<{
  openWorkspace: (id: string) => void
}>({ openWorkspace: () => {} })

// ─── Main Layout Component ──────────────────────────────────────────

export function PrazosLayout() {
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<string | null>(null)

  // Deep linking: read workspace param from URL on mount + auto-open new dialog
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const wsId = params.get("workspace")
    if (wsId) setSelectedDeadlineId(wsId)
    if (params.get("newPrazo") === "true") {
      setNewDialogOpen(true)
      window.history.replaceState(null, "", "/prazos")
    }
  }, [])

  // Keyboard shortcut: Ctrl+Shift+P to open New Deadline dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault()
        setNewDialogOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const openWorkspace = (id: string) => {
    setSelectedDeadlineId(id)
    window.history.replaceState(null, "", `/prazos?workspace=${id}`)
  }

  const closeWorkspace = () => {
    setSelectedDeadlineId(null)
    window.history.replaceState(null, "", "/prazos")
  }

  return (
    <PrazosContext.Provider value={{ openWorkspace }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prazos & Calendário Judicial</h1>
            <p className="text-[#666666]">
              Controle de prazos processuais, fatais e ordinários
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link href="/prazos/catalogo">
                <BookOpen className="mr-1.5 size-3.5" />
                Catálogo de Prazos
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/prazos/calendario-judicial">
                <Scale className="mr-1.5 size-3.5" />
                Calendário Judicial
              </Link>
            </Button>
            <Button onClick={() => setNewDialogOpen(true)} title="Ctrl+Shift+P">
              <Plus className="mr-2 size-4" />Novo Prazo
              <kbd className="ml-2 hidden sm:inline-flex text-[10px] bg-white/20 rounded px-1 py-0.5">Ctrl+Shift+P</kbd>
            </Button>
          </div>
        </div>

        {/* KPI Urgency Cards */}
        <UrgencyCards />

        {/* Tabs */}
        <Tabs defaultValue="painel">
          <TabsList>
            <TabsTrigger value="painel" className="gap-1.5">
              <LayoutGrid className="size-3.5" />Painel
            </TabsTrigger>
            <TabsTrigger value="todos" className="gap-1.5">
              <List className="size-3.5" />Todos os Prazos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <Timer className="size-3.5" />Timeline
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-1.5">
              <CalendarIcon className="size-3.5" />Calendário
            </TabsTrigger>
          </TabsList>

          <TabsContent value="painel" className="mt-4">
            <PainelTab />
          </TabsContent>
          <TabsContent value="todos" className="mt-4">
            <TodosOsPrazosTab />
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <PrazosTimeline />
          </TabsContent>
          <TabsContent value="calendario" className="mt-4">
            <CalendarioTab />
          </TabsContent>
        </Tabs>

        {/* New Deadline Dialog */}
        <NewDeadlineDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />

        {/* Workspace Drawer */}
        <Sheet open={!!selectedDeadlineId} onOpenChange={(open) => { if (!open) closeWorkspace() }}>
          <SheetContent side="right" className="w-full sm:max-w-[80vw] p-0 overflow-hidden [&>button]:hidden">
            {selectedDeadlineId && (
              <WorkspaceView deadlineId={selectedDeadlineId} onClose={closeWorkspace} />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </PrazosContext.Provider>
  )
}

// ─── Urgency KPI Cards ──────────────────────────────────────────────

function UrgencyCards() {
  const { data: stats } = trpc.deadlines.dashboardStats.useQuery()

  const cards = [
    {
      label: "Vencidos",
      value: stats?.vencidos ?? 0,
      icon: ShieldAlert,
      bg: "bg-[#DC3545]",
      text: "text-white",
      pulse: !!stats?.vencidos && stats.vencidos > 0,
    },
    {
      label: "Hoje",
      value: stats?.hoje ?? 0,
      icon: Flame,
      bg: "bg-[#DC3545]/90",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Próximos 3 Dias",
      value: stats?.proximos3dias ?? 0,
      icon: AlertTriangle,
      bg: "bg-orange-500",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Esta Semana",
      value: stats?.estaSemana ?? 0,
      icon: CalendarDays,
      bg: "bg-amber-500",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Próximos 30 Dias",
      value: stats?.proximos30dias ?? 0,
      icon: TrendingUp,
      bg: "bg-[#28A745]",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Fatais Pendentes",
      value: stats?.fatais_pendentes ?? 0,
      icon: ShieldAlert,
      bg: "bg-gray-900",
      text: "text-white",
      pulse: false,
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className={`${card.bg} border-0 ${card.pulse ? "animate-pulse" : ""}`}>
          <CardContent className="pt-3 pb-3 flex flex-col items-center">
            <card.icon className={`size-5 mb-1 ${card.text} opacity-80`} />
            <span className={`text-2xl font-bold ${card.text}`}>{card.value}</span>
            <span className={`text-[10px] mt-0.5 ${card.text} opacity-80 text-center leading-tight`}>
              {card.label}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Tab: Painel (Dashboard) ────────────────────────────────────────

function PainelTab() {
  const { openWorkspace } = useContext(PrazosContext)

  const { data: fatalData, isLoading: fatalLoading } = trpc.deadlines.listNew.useQuery({
    tipo: "FATAL",
    per_page: 10,
    sort_by: "data_fim_prazo",
    sort_dir: "asc",
  })

  const { data: attentionData, isLoading: attentionLoading } = trpc.deadlines.listNew.useQuery({
    per_page: 20,
    sort_by: "data_fim_prazo",
    sort_dir: "asc",
  })

  const { data: recentData, isLoading: recentLoading } = trpc.deadlines.listNew.useQuery({
    status: "CUMPRIDO",
    per_page: 10,
    sort_by: "data_fim_prazo",
    sort_dir: "desc",
  })

  const fatalDeadlines = fatalData?.items ?? []
  const attentionDeadlines = (attentionData?.items ?? []).filter((d) => {
    const days = daysUntil(d.data_fim_prazo)
    return days <= 3
  })
  const recentDeadlines = recentData?.items ?? []

  return (
    <div className="space-y-6">
      {/* Proximos Prazos Fatais */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="size-4 text-[#DC3545]" />
              Próximos Prazos Fatais
            </CardTitle>
            <Badge variant="secondary" className="bg-[#DC3545]/10 text-[#DC3545]">
              {fatalDeadlines.length} pendente(s)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {fatalLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : fatalDeadlines.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[#666666]">
              <Check className="size-5 mr-2 text-[#28A745]" />
              <span>Nenhum prazo fatal pendente</span>
            </div>
          ) : (
            <div className="space-y-2">
              {fatalDeadlines.map((d) => {
                const days = daysUntil(d.data_fim_prazo)
                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow ${
                      days <= 0 ? "bg-red-50 border-red-200" : days <= 2 ? "bg-orange-50 border-orange-200" : "bg-white"
                    }`}
                    onClick={() => openWorkspace(d.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                        days <= 0 ? "bg-[#DC3545] text-white" : days <= 2 ? "bg-orange-500 text-white" : "bg-[#C9A961]/20 text-[#C9A961]"
                      }`}>
                        <span className="text-sm font-bold">
                          {days <= 0 ? "!" : days}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.titulo || d.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {d.case_ && (
                            <>
                              <Link
                                href={`/processos/${d.case_.id}`}
                                className="text-xs font-mono text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {formatCNJ(d.case_.numero_processo) || "Sem numero"}
                              </Link>
                              <span className="text-xs text-[#666666] truncate">{d.case_.cliente?.nome}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-medium">
                          {new Date(d.data_fim_prazo).toLocaleDateString("pt-BR")}
                        </p>
                        <p className={`text-[10px] font-semibold ${
                          days <= 0 ? "text-[#DC3545]" : days <= 2 ? "text-orange-600" : "text-[#C9A961]"
                        }`}>
                          {countdownText(days)}
                        </p>
                      </div>
                      {d.responsavel && (
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {getInitials(d.responsavel.name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prazos que Precisam de Atencao */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-orange-500" />
              Prazos que Precisam de Atenção
            </CardTitle>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
              {attentionDeadlines.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {attentionLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : attentionDeadlines.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-[#666666]">
              <Check className="size-5 mr-2 text-[#28A745]" />
              <span>Tudo em dia!</span>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[4px] p-0" />
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Processo</TableHead>
                    <TableHead>Data Limite</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionDeadlines.map((d) => {
                    const days = daysUntil(d.data_fim_prazo)
                    return (
                      <TableRow
                        key={d.id}
                        className={`cursor-pointer hover:bg-gray-50 ${days < 0 ? "bg-red-50/50" : days === 0 ? "bg-orange-50/50" : ""}`}
                        onClick={() => openWorkspace(d.id)}
                      >
                        <TableCell className={`p-0 w-1 border-l-4 ${TYPE_BORDER[d.tipo] || "border-l-gray-300"}`} />
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] ${TYPE_BADGE[d.tipo] || ""}`}>
                            {DEADLINE_TYPE_LABELS[d.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={d.titulo || d.descricao || ""}>
                          {d.titulo || d.descricao}
                        </TableCell>
                        <TableCell>
                          {d.case_ && (
                            <Link
                              href={`/processos/${d.case_.id}`}
                              className="hover:underline text-primary text-xs font-mono"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formatCNJ(d.case_.numero_processo) || "---"}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${deadlineColor(d.data_fim_prazo)}`}>
                            {new Date(d.data_fim_prazo).toLocaleDateString("pt-BR")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {d.responsavel && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="size-5">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                  {getInitials(d.responsavel.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs">{d.responsavel.name.split(" ")[0]}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`text-xs font-semibold ${
                            days < 0 ? "text-[#DC3545]" : days <= 2 ? "text-orange-600" : "text-[#C9A961]"
                          }`}>
                            {daysLabel(days)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4 text-[#28A745]" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : recentDeadlines.length === 0 ? (
            <p className="text-sm text-[#666666] text-center py-4">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-2">
              {recentDeadlines.slice(0, 8).map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-6 rounded-full bg-[#28A745]/10 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-[#28A745]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{d.titulo || d.descricao}</p>
                      <p className="text-[10px] text-[#666666]">
                        {DEADLINE_TYPE_LABELS[d.tipo]}{d.case_ ? ` - ${formatCNJ(d.case_.numero_processo)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="bg-[#28A745]/10 text-[#28A745] text-[10px]">
                      Cumprido
                    </Badge>
                    <span className="text-[10px] text-[#666666]">
                      {new Date(d.data_fim_prazo).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Tab: Todos os Prazos ───────────────────────────────────────────

function TodosOsPrazosTab() {
  const [statusFilter, setStatusFilter] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [responsavelFilter, setResponsavelFilter] = useState("")
  const [prioridadeFilter, setPrioridadeFilter] = useState("")
  const [ufFilter, setUfFilter] = useState("")
  const [searchText, setSearchText] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const handleSearch = (value: string) => {
    setSearchText(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
    setSearchTimeout(timeout)
  }

  const { data: users } = trpc.users.list.useQuery()

  const { data: listData, isLoading } = trpc.deadlines.listNew.useQuery({
    status: (statusFilter as "CORRENDO") || undefined,
    tipo: (tipoFilter as "FATAL") || undefined,
    responsavel_id: responsavelFilter || undefined,
    uf: ufFilter || undefined,
    date_from: dateFrom ? new Date(dateFrom) : undefined,
    date_to: dateTo ? new Date(dateTo) : undefined,
    search: debouncedSearch || undefined,
    page,
    per_page: 50,
    sort_by: "data_fim_prazo",
    sort_dir: "asc",
  })

  const deadlines = listData?.items ?? []
  const total = listData?.total ?? 0
  const totalPages = listData?.total_pages ?? 1

  const hasActiveFilters = statusFilter || tipoFilter || responsavelFilter || prioridadeFilter || ufFilter || dateFrom || dateTo

  const clearFilters = () => {
    setStatusFilter("")
    setTipoFilter("")
    setResponsavelFilter("")
    setPrioridadeFilter("")
    setUfFilter("")
    setDateFrom("")
    setDateTo("")
    setSearchText("")
    setDebouncedSearch("")
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#666666]" />
          <Input
            placeholder="Buscar por titulo, descricao, processo ou codigo..."
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-1.5 size-4" />Filtros
          {hasActiveFilters && (
            <Badge className="ml-2 size-5 rounded-full p-0 flex items-center justify-center text-[10px]">!</Badge>
          )}
        </Button>
      </div>

      {/* Quick Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => { setStatusFilter(""); setPage(1) }}
        >
          Todos ({total})
        </Button>
        <Button
          variant={statusFilter === "CORRENDO" ? "default" : "outline"}
          size="sm"
          onClick={() => { setStatusFilter(statusFilter === "CORRENDO" ? "" : "CORRENDO"); setPage(1) }}
        >
          Em Andamento
        </Button>
        <Button
          variant={statusFilter === "VENCIDO" ? "default" : "outline"}
          size="sm"
          className={statusFilter === "VENCIDO" ? "" : "text-[#DC3545] border-[#DC3545]/30"}
          onClick={() => { setStatusFilter(statusFilter === "VENCIDO" ? "" : "VENCIDO"); setPage(1) }}
        >
          Vencidos
        </Button>
        <Button
          variant={statusFilter === "CUMPRIDO" ? "default" : "outline"}
          size="sm"
          className={statusFilter === "CUMPRIDO" ? "" : "text-[#28A745] border-[#28A745]/30"}
          onClick={() => { setStatusFilter(statusFilter === "CUMPRIDO" ? "" : "CUMPRIDO"); setPage(1) }}
        >
          Cumpridos
        </Button>
        <Button
          variant={statusFilter === "CANCELADO" ? "default" : "outline"}
          size="sm"
          className={statusFilter === "CANCELADO" ? "" : "text-gray-500 border-gray-300"}
          onClick={() => { setStatusFilter(statusFilter === "CANCELADO" ? "" : "CANCELADO"); setPage(1) }}
        >
          Cancelados
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[150px] bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Responsável</Label>
            <Select value={responsavelFilter} onValueChange={(v) => { setResponsavelFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Responsável" /></SelectTrigger>
              <SelectContent>
                {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF</Label>
            <Select value={ufFilter} onValueChange={(v) => { setUfFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[100px] bg-white"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_BRASIL.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-[140px] bg-white"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ate</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-[140px] bg-white"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="mr-1 size-3" />Limpar
            </Button>
          )}
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <div className="max-h-[calc(100vh-28rem)] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white">
              <TableRow>
                <TableHead className="w-[4px] p-0" />
                <TableHead>Tipo</TableHead>
                <TableHead>Processo / Cliente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}>
                      <div className="h-5 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  </TableRow>
                ))
              ) : deadlines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-[#666666]">
                    Nenhum prazo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                deadlines.map((d) => <DeadlineRow key={d.id} deadline={d} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#666666]">
        <span>
          Exibindo {deadlines.length} de {total} prazo(s)
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs">Página {page} de {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Calendario ────────────────────────────────────────────────

function CalendarioTab() {
  const { data: listData } = trpc.deadlines.listNew.useQuery({ per_page: 200 })
  const deadlines = listData?.items ?? []

  return <DeadlinesCalendar deadlines={deadlines} />
}

// ─── Deadline Row ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeadlineRow({ deadline: d }: { deadline: any }) {
  const days = daysUntil(d.data_fim_prazo)
  const { openWorkspace } = useContext(PrazosContext)
  const utils = trpc.useUtils()
  const [cumprirDialogOpen, setCumprirDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cumprirObs, setCumprirObs] = useState("")
  const [cancelMotivo, setCancelMotivo] = useState("")

  const isActive = d.status !== "CUMPRIDO" && d.status !== "CANCELADO"

  const completeMutation = trpc.deadlines.completar.useMutation({
    onSuccess: () => {
      utils.deadlines.listNew.invalidate()
      utils.deadlines.dashboardStats.invalidate()
      setCumprirDialogOpen(false)
      setCumprirObs("")
    },
  })

  const cancelMutation = trpc.deadlines.cancelar.useMutation({
    onSuccess: () => {
      utils.deadlines.listNew.invalidate()
      utils.deadlines.dashboardStats.invalidate()
      setCancelDialogOpen(false)
      setCancelMotivo("")
    },
  })

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-gray-50 transition-colors ${
          isActive && days < 0 ? "bg-red-50/30" : ""
        }`}
        onClick={() => openWorkspace(d.id)}
      >
        {/* Color bar */}
        <TableCell className={`p-0 w-1 border-l-4 ${TYPE_BORDER[d.tipo] || "border-l-gray-300"}`} />

        {/* Type */}
        <TableCell>
          <Badge variant="secondary" className={TYPE_BADGE[d.tipo] || ""}>
            {DEADLINE_TYPE_LABELS[d.tipo]}
          </Badge>
        </TableCell>

        {/* Case */}
        <TableCell>
          {d.case_ ? (
            <Link
              href={`/processos/${d.case_.id}`}
              className="hover:underline text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-mono">{formatCNJ(d.case_.numero_processo) || "---"}</p>
              <p className="text-xs text-[#666666] truncate max-w-[180px]">{d.case_.cliente?.nome}</p>
            </Link>
          ) : (
            <span className="text-xs text-[#666666]">Sem processo</span>
          )}
        </TableCell>

        {/* Title / Description */}
        <TableCell className="max-w-[250px] truncate text-sm" title={d.titulo || d.descricao || ""}>
          <span className="hover:underline hover:text-primary">
            {d.titulo || d.descricao}
          </span>
          {d.codigo && (
            <p className="text-[10px] text-[#666666] font-mono">{d.codigo}</p>
          )}
        </TableCell>

        {/* Date */}
        <TableCell>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${deadlineColor(d.data_fim_prazo)}`}>
            {new Date(d.data_fim_prazo).toLocaleDateString("pt-BR")}
          </span>
        </TableCell>

        {/* Responsible */}
        <TableCell>
          {d.responsavel && (
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(d.responsavel.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm whitespace-nowrap">{d.responsavel.name.split(" ")[0]}</span>
            </div>
          )}
        </TableCell>

        {/* Status */}
        <TableCell>
          <Badge variant="secondary" className={STATUS_BADGE[d.status] || ""}>
            {STATUS_LABELS[d.status] || d.status}
          </Badge>
        </TableCell>

        {/* Days remaining */}
        <TableCell>
          {isActive && (
            <span className={`text-xs font-medium whitespace-nowrap ${
              days < 0 ? "text-[#DC3545] font-bold" : days <= 2 ? "text-[#DC3545]" : days <= 5 ? "text-[#C9A961]" : "text-[#28A745]"
            }`}>
              {daysLabel(days)}
            </span>
          )}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {isActive && (
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setCumprirDialogOpen(true)}
              >
                <Check className="size-3" />Cumprir
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openWorkspace(d.id)}>
                  <FileText className="mr-2 size-4" />
                  Abrir Workspace
                </DropdownMenuItem>
                {d.case_ && (
                  <DropdownMenuItem asChild>
                    <Link href={`/processos/${d.case_.id}`}>
                      <ExternalLink className="mr-2 size-4" />
                      Ver Processo
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openWorkspace(d.id)}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
                {isActive && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    <XCircle className="mr-2 size-4" />
                    Cancelar Prazo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Cumprir (Complete) Dialog */}
      <Dialog open={cumprirDialogOpen} onOpenChange={setCumprirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cumprir Prazo</DialogTitle>
            <DialogDescription>
              Marcar o prazo &ldquo;{d.titulo || d.descricao}&rdquo; como cumprido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Observações sobre o cumprimento (opcional)</Label>
              <Textarea
                placeholder="Descreva como o prazo foi cumprido..."
                value={cumprirObs}
                onChange={(e) => setCumprirObs(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCumprirDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#28A745] hover:bg-[#28A745]/90"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate({
                id: d.id,
                observacoes: cumprirObs || undefined,
              })}
            >
              {completeMutation.isPending ? "Salvando..." : "Confirmar Cumprimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Prazo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este prazo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Motivo do cancelamento *</Label>
              <Textarea
                placeholder="Informe o motivo do cancelamento..."
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelMotivo.trim() || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate({
                id: d.id,
                motivo: cancelMotivo.trim(),
              })}
            >
              {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── New Deadline Dialog ─────────────────────────────────────────────

// Category labels for grouping
const CATEGORY_LABELS: Record<string, string> = {
  DEFESA_RESPOSTA: "Defesa e Resposta",
  RECURSAL: "Recursos",
  FATAL_PEREMPTORIO: "Fatais e Peremptórios",
  AUDIENCIA_SESSAO: "Audiências e Sessões",
  RECUPERACAO_JUDICIAL: "Recuperação Judicial",
  EXECUCAO_CUMPRIMENTO: "Execução e Cumprimento",
  ADMINISTRATIVO_DILIGENCIA: "Administrativo e Diligências",
  EXTRAJUDICIAL_CONTRATUAL: "Extrajudiciais e Contratuais",
  TRIBUTARIO: "Tributários",
  TAREFA_INTERNA: "Tarefas Internas",
  OUTRO: "Outros",
}

const START_METHOD_LABELS: Record<string, string> = {
  PUBLICACAO_DJE: "Publicação no DJE",
  INTIMACAO_PESSOAL: "Intimação Pessoal",
  INTIMACAO_ELETRONICA: "Intimação Eletrônica",
  INTIMACAO_CORREIO: "Intimação por Correio (AR)",
  INTIMACAO_EDITAL: "Intimação por Edital",
  COMPARECIMENTO_ESPONTANEO: "Comparecimento Espontâneo",
  AUDIENCIA: "Audiência",
  CARGA_AUTOS: "Carga/Vista dos Autos",
  DATA_FIXA: "Data Fixa",
  MANUAL: "Manual (informar data)",
}

function NewDeadlineDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [formData, setFormData] = useState({
    clientId: "",
    case_id: "",
    deadlineType: "",
    title: "",
    autoTitle: true,
    descricao: "",
    startMethod: "MANUAL",
    startDate: "",
    disponibilizacaoDate: "",
    publicacaoDate: "",
    intimacaoDate: "",
    responsavel_id: "",
    isPublicEntity: false,
    isDefensoria: false,
    isMP: false,
    isElectronic: true,
    uf: "PR",
    manualDueDate: "",
  })

  const { data: clients } = trpc.deadlines.clientsForSelect.useQuery()
  const { data: allCases } = trpc.deadlines.casesForSelect.useQuery()
  const { data: users } = trpc.users.list.useQuery()
  const { data: catalog } = trpc.deadlines.getTypeCatalog.useQuery()
  const utils = trpc.useUtils()

  // Filter cases by selected client
  const filteredCases = useMemo(() => {
    if (!allCases) return []
    if (!formData.clientId) return allCases
    return allCases.filter((c) => c.cliente?.id === formData.clientId)
  }, [allCases, formData.clientId])

  // Group catalog by category
  const catalogByCategory = useMemo(() => {
    if (!catalog) return {}
    const grouped: Record<string, typeof catalog> = {}
    for (const item of catalog) {
      const cat = item.category
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }
    return grouped
  }, [catalog])

  // Get selected catalog entry
  const selectedCatalog = useMemo(() =>
    catalog?.find((c) => c.type === formData.deadlineType),
    [catalog, formData.deadlineType]
  )

  // Auto-generate title when client + case + type change
  useEffect(() => {
    if (!formData.autoTitle) return
    const clientName = clients?.find((c) => c.id === formData.clientId)?.nome || ""
    const selectedCase = allCases?.find((c) => c.id === formData.case_id)
    const caseNumber = selectedCase?.numero_processo || ""
    const typeName = selectedCatalog?.displayName || ""

    if (clientName || caseNumber || typeName) {
      const shortCNJ = caseNumber ? caseNumber.replace(/^(\d{7}-\d{2})\..*/, "$1") : ""
      const shortClient = clientName.length > 25 ? clientName.substring(0, 25) + "..." : clientName
      const parts = [shortCNJ, shortClient, typeName].filter(Boolean)
      const newTitle = parts.join(" — ")
      if (newTitle) set("title", newTitle)
    }
  }, [formData.clientId, formData.case_id, formData.deadlineType, formData.autoTitle, clients, allCases, selectedCatalog])

  // Simulation query
  const simulationInput = useMemo(() => {
    if (!formData.deadlineType) return null
    const input: Record<string, unknown> = {
      deadlineType: formData.deadlineType,
      startMethod: formData.startMethod,
      isPublicEntity: formData.isPublicEntity,
      isDefensoria: formData.isDefensoria,
      isMP: formData.isMP,
      isElectronic: formData.isElectronic,
      uf: formData.uf,
    }
    if (formData.startMethod === "PUBLICACAO_DJE" && formData.disponibilizacaoDate) {
      input.disponibilizacaoDate = new Date(formData.disponibilizacaoDate)
      if (formData.publicacaoDate) input.publicacaoDate = new Date(formData.publicacaoDate)
    } else if (formData.startDate) {
      input.startDate = new Date(formData.startDate)
    } else if (formData.intimacaoDate) {
      input.intimacaoDate = new Date(formData.intimacaoDate)
    }
    const hasDate = formData.startDate || formData.disponibilizacaoDate || formData.intimacaoDate
    if (!hasDate) return null
    return input
  }, [formData])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: simulation, isLoading: simLoading } = trpc.deadlines.simulate.useQuery(
    simulationInput as any,
    { enabled: !!simulationInput }
  )

  const resetForm = () => {
    setFormData({
      clientId: "", case_id: "", deadlineType: "", title: "", autoTitle: true, descricao: "", startMethod: "MANUAL",
      startDate: "", disponibilizacaoDate: "", publicacaoDate: "", intimacaoDate: "",
      responsavel_id: "", isPublicEntity: false, isDefensoria: false, isMP: false, isElectronic: true, uf: "PR",
      manualDueDate: "",
    })
  }

  const createDeadline = trpc.deadlines.createExpanded.useMutation({
    onSuccess: () => {
      utils.deadlines.listNew.invalidate()
      utils.deadlines.dashboardStats.invalidate()
      utils.deadlines.stats.invalidate()
      utils.deadlines.list.invalidate()
      onOpenChange(false)
      resetForm()
    },
  })

  const set = (field: string, value: unknown) => setFormData((prev) => ({ ...prev, [field]: value }))

  // When selecting a case, auto-fill client
  const handleCaseChange = (caseId: string) => {
    set("case_id", caseId)
    if (caseId && !formData.clientId) {
      const selectedCase = allCases?.find((c) => c.id === caseId)
      if (selectedCase?.cliente?.id) {
        set("clientId", selectedCase.cliente.id)
      }
    }
  }

  // When selecting a client, clear case if it doesn't match
  const handleClientChange = (clientId: string) => {
    set("clientId", clientId)
    if (formData.case_id) {
      const currentCase = allCases?.find((c) => c.id === formData.case_id)
      if (currentCase?.cliente?.id !== clientId) {
        set("case_id", "")
      }
    }
    // Auto-select case if client has only one
    if (clientId && allCases) {
      const clientCases = allCases.filter((c) => c.cliente?.id === clientId)
      if (clientCases.length === 1) {
        set("case_id", clientCases[0].id)
      }
    }
  }

  const handleCreate = () => {
    if (!formData.deadlineType || !formData.case_id) return

    createDeadline.mutate({
      deadlineType: formData.deadlineType,
      case_id: formData.case_id,
      clientId: formData.clientId || undefined,
      title: formData.autoTitle ? undefined : formData.title || undefined,
      descricao: formData.descricao || undefined,
      startMethod: formData.startMethod,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      disponibilizacaoDate: formData.disponibilizacaoDate ? new Date(formData.disponibilizacaoDate) : undefined,
      publicacaoDate: formData.publicacaoDate ? new Date(formData.publicacaoDate) : undefined,
      intimacaoDate: formData.intimacaoDate ? new Date(formData.intimacaoDate) : undefined,
      isPublicEntity: formData.isPublicEntity,
      isDefensoria: formData.isDefensoria,
      isMP: formData.isMP,
      isElectronic: formData.isElectronic,
      uf: formData.uf,
      responsavel_id: formData.responsavel_id || undefined,
      dueDate: simulation?.dueDate ? new Date(simulation.dueDate) : undefined,
      manualDueDate: formData.manualDueDate ? new Date(formData.manualDueDate) : undefined,
    })
  }

  const canCreate = !!formData.deadlineType && !!formData.case_id && (!!simulation || !!formData.startDate)

  // Manual due date validation
  const fatalDate = simulation?.dueDate ? new Date(simulation.dueDate) : null
  const manualDate = formData.manualDueDate ? new Date(formData.manualDueDate) : null
  const manualAfterFatal = fatalDate && manualDate && manualDate > fatalDate

  // Business days between manual and fatal (approximate)
  const daysOfSlack = fatalDate && manualDate && manualDate < fatalDate
    ? Math.ceil((fatalDate.getTime() - manualDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="min-w-[700px] max-w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Novo Prazo
          </DialogTitle>
          <DialogDescription className="text-xs text-[#666666]">
            Selecione o tipo de prazo do catálogo. O sistema calcula automaticamente as datas conforme CPC/2015.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
          {/* Row 1: Cliente */}
          <div className="space-y-1.5">
            <Label className="text-xs">Cliente *</Label>
            <Select value={formData.clientId} onValueChange={handleClientChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.nome}{c.razao_social ? ` (${c.razao_social})` : ""}{c.cpf_cnpj ? ` — ${c.cpf_cnpj}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Processo + Responsável */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Processo *</Label>
              <Select value={formData.case_id} onValueChange={handleCaseChange}>
                <SelectTrigger className={`h-9 text-sm ${!formData.case_id && formData.clientId ? "border-amber-300" : ""}`}>
                  <SelectValue placeholder={formData.clientId ? "Selecionar processo do cliente" : "Selecione o cliente primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCases.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-center text-[#666666]">
                      {formData.clientId ? "Nenhum processo ativo para este cliente" : "Selecione o cliente primeiro"}
                    </div>
                  ) : (
                    filteredCases.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-sm">
                        {formatCNJ(c.numero_processo) || "s/n"} — {c.cliente.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!formData.case_id && formData.deadlineType && (
                <p className="text-[9px] text-red-500">Selecione o processo para continuar</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => set("responsavel_id", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => <SelectItem key={u.id} value={u.id} className="text-sm">{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Tipo de Prazo (from catalog, grouped by category) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Prazo *</Label>
            <Select value={formData.deadlineType} onValueChange={(v) => {
              set("deadlineType", v)
            }}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar tipo de prazo" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(catalogByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-[#666666] bg-muted/50 sticky top-0">
                      {CATEGORY_LABELS[cat] || cat}
                    </div>
                    {items.map((item) => (
                      <SelectItem key={item.type} value={item.type} className="text-sm">
                        <span className="flex items-center gap-2">
                          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          {item.displayName}
                          {item.isFatal && <span className="text-[10px] text-red-600 font-medium">FATAL</span>}
                          <span className="text-[10px] text-[#999]">{item.defaultDays}d</span>
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catalog info badge */}
          {selectedCatalog && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]" style={{ borderColor: selectedCatalog.color, color: selectedCatalog.color }}>
                {selectedCatalog.shortName}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {selectedCatalog.defaultDays} {selectedCatalog.countingType === "DIAS_UTEIS" ? "dias úteis" : selectedCatalog.countingType === "DIAS_CORRIDOS" ? "dias corridos" : ""}
              </Badge>
              {selectedCatalog.legalBasis && (
                <Badge variant="secondary" className="text-[10px]">{selectedCatalog.legalBasis}</Badge>
              )}
              {selectedCatalog.isFatal && (
                <Badge className="text-[10px] bg-red-100 text-red-700">FATAL</Badge>
              )}
            </div>
          )}

          {/* Title (auto/manual) */}
          <div className="space-y-1.5">
            {formData.autoTitle ? (
              <>
                <Label className="text-xs">Título (automático)</Label>
                <div className="flex items-center gap-2 h-9 px-3 bg-stone-50 border border-stone-200 rounded-md">
                  <FileText className="size-3.5 text-stone-400 shrink-0" />
                  <span className="text-sm text-stone-700 truncate flex-1">
                    {formData.title || "Preencha cliente, processo e tipo para gerar"}
                  </span>
                  <button
                    type="button"
                    onClick={() => set("autoTitle", false)}
                    className="text-[10px] text-amber-700 hover:text-amber-900 shrink-0 font-medium"
                  >
                    Editar
                  </button>
                </div>
              </>
            ) : (
              <>
                <Label className="text-xs">Título</Label>
                <div className="flex gap-2">
                  <Input className="h-9 text-sm flex-1" value={formData.title} onChange={(e) => set("title", e.target.value)} placeholder="Digite o título..." />
                  <button
                    type="button"
                    onClick={() => set("autoTitle", true)}
                    className="text-[10px] text-amber-700 hover:text-amber-900 whitespace-nowrap font-medium px-2"
                  >
                    Auto
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Row 4: Start Method + UF */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Método de Início da Contagem *</Label>
              <Select value={formData.startMethod} onValueChange={(v) => set("startMethod", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(START_METHOD_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-sm">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UF</Label>
              <Select value={formData.uf} onValueChange={(v) => set("uf", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASIL.map((uf) => <SelectItem key={uf} value={uf} className="text-sm">{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional date fields based on startMethod */}
          {formData.startMethod === "PUBLICACAO_DJE" ? (
            <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="space-y-1.5">
                <Label className="text-xs text-blue-700">Disponibilização no DJE *</Label>
                <Input type="date" className="h-9 text-sm" value={formData.disponibilizacaoDate}
                  onChange={(e) => set("disponibilizacaoDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-blue-700">Publicação (1o útil após)</Label>
                <Input type="date" className="h-9 text-sm" value={formData.publicacaoDate}
                  onChange={(e) => set("publicacaoDate", e.target.value)} />
                <p className="text-[9px] text-blue-500">Deixe em branco para calcular automaticamente</p>
              </div>
            </div>
          ) : formData.startMethod.startsWith("INTIMACAO") ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Data da Intimação *</Label>
              <Input type="date" className="h-9 text-sm" value={formData.intimacaoDate}
                onChange={(e) => set("intimacaoDate", e.target.value)} />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Data de Início *</Label>
              <Input type="date" className="h-9 text-sm" value={formData.startDate}
                onChange={(e) => set("startDate", e.target.value)} />
            </div>
          )}

          {/* Context flags */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={formData.isPublicEntity}
                onCheckedChange={(v) => set("isPublicEntity", !!v)} />
              <span>Fazenda Pública</span>
              {formData.isPublicEntity && selectedCatalog?.doubleForPublicEntity && (
                <span className="text-[9px] text-orange-600 font-medium">(2x)</span>
              )}
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={formData.isDefensoria}
                onCheckedChange={(v) => set("isDefensoria", !!v)} />
              <span>Defensoria</span>
              {formData.isDefensoria && selectedCatalog?.doubleForDefensoria && (
                <span className="text-[9px] text-orange-600 font-medium">(2x)</span>
              )}
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={formData.isMP}
                onCheckedChange={(v) => set("isMP", !!v)} />
              <span>Ministério Público</span>
              {formData.isMP && <span className="text-[9px] text-orange-600 font-medium">(2x)</span>}
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={formData.isElectronic}
                onCheckedChange={(v) => set("isElectronic", !!v)} />
              <span>Processo eletrônico</span>
            </label>
          </div>

          {/* Simulation Preview */}
          {simulation && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="size-4 text-green-700" />
                  <span className="text-sm font-semibold text-green-800">Simulação do Prazo</span>
                  {simulation.isFatal && (
                    <Badge className="text-[10px] bg-red-600 text-white">FATAL</Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-white rounded border">
                    <p className="text-[10px] text-[#666666]">Início</p>
                    <p className="text-sm font-bold">{new Date(simulation.startDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <p className="text-[10px] text-[#666666]">Prazo Final</p>
                    <p className="text-sm font-bold text-red-700">{new Date(simulation.dueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded border">
                    <p className="text-[10px] text-[#666666]">Prazo Interno</p>
                    <p className="text-sm font-bold text-orange-600">{new Date(simulation.internalDueDate).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span>{simulation.effectiveDays} {simulation.countingType === "DIAS_UTEIS" ? "dias úteis" : "dias corridos"}</span>
                  {simulation.isDoubled && (
                    <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-700">
                      Dobrado — {simulation.doubleReason}
                    </Badge>
                  )}
                  {simulation.legalBasis && (
                    <span className="text-[#999]">{simulation.legalBasis}</span>
                  )}
                </div>

                {simulation.warnings?.length > 0 && (
                  <div className="space-y-1">
                    {simulation.warnings.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                        <AlertTriangle className="size-3 mt-0.5 shrink-0" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {simulation.calculationLog?.length > 0 && (
                  <details className="text-[10px] text-[#666666]">
                    <summary className="cursor-pointer hover:text-[#333]">Log de cálculo ({simulation.calculationLog.length} passos)</summary>
                    <div className="mt-1 space-y-0.5 pl-2 border-l">
                      {simulation.calculationLog.map((log: { step: number; rule: string; description: string }, i: number) => (
                        <div key={i}><strong>{log.step}.</strong> [{log.rule}] {log.description}</div>
                      ))}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          )}

          {simLoading && formData.deadlineType && (
            <div className="flex items-center justify-center py-4 text-xs text-[#666666]">
              <Loader2 className="size-4 mr-2 animate-spin" /> Calculando prazo...
            </div>
          )}

          {/* Manual Due Date (Cumprir Até) */}
          {simulation && (
            <div className="p-3 rounded-lg border bg-stone-50 space-y-2">
              <Label className="text-xs font-semibold text-stone-700">Prazo de Cumprimento</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] text-stone-500">Vencimento Fatal (calculado)</Label>
                  <div className="flex items-center gap-2 h-9 px-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertTriangle className="size-3.5 text-red-600 shrink-0" />
                    <span className="text-sm font-medium text-red-800">
                      {new Date(simulation.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-stone-500">Cumprir Até (opcional)</Label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={formData.manualDueDate}
                    onChange={(e) => set("manualDueDate", e.target.value)}
                  />
                  {manualAfterFatal && (
                    <p className="text-[9px] text-red-600 mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="size-2.5" />
                      Data posterior ao vencimento fatal! Risco de perda do prazo.
                    </p>
                  )}
                  {daysOfSlack && !manualAfterFatal && (
                    <p className="text-[9px] text-green-600 mt-0.5">
                      {daysOfSlack} dia(s) de folga antes do vencimento fatal
                    </p>
                  )}
                </div>
              </div>
              <p className="text-[9px] text-stone-500">
                O vencimento fatal é calculado pelo sistema. Use &quot;Cumprir até&quot; para definir uma data anterior e garantir margem de segurança.
              </p>
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações (opcional)</Label>
            <Textarea className="text-sm min-h-[60px]" value={formData.descricao}
              onChange={(e) => set("descricao", e.target.value)} placeholder="Detalhes adicionais..." />
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm() }}>Cancelar</Button>
          <Button disabled={!canCreate || createDeadline.isPending} onClick={handleCreate}>
            {createDeadline.isPending ? (
              <><Loader2 className="size-4 mr-1 animate-spin" />Salvando...</>
            ) : "Salvar Prazo"}
          </Button>
          {createDeadline.isError && (
            <p className="text-xs text-red-600 mt-1">{createDeadline.error?.message}</p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
