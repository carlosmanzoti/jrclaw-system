"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  AlertTriangle, Check, Plus, Filter, X,
  List, Calendar as CalendarIcon, MoreHorizontal,
  Pencil, Trash2, ExternalLink, BookOpen, Scale,
  LayoutGrid, Timer, Activity, Search,
  Flame, ShieldAlert, CalendarDays, TrendingUp,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
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
import {
  DEADLINE_TYPE_LABELS, DEADLINE_STATUS_LABELS, formatCNJ, daysUntil, deadlineColor,
  ESTADOS_BRASIL,
} from "@/lib/constants"
import { PrazosTimeline } from "./prazos-timeline"

// Lazy-load FullCalendar to avoid SSR issues and reduce initial bundle
const DeadlinesCalendar = dynamic(() => import("./deadlines-calendar"), { ssr: false })

// ─── Constants ──────────────────────────────────────────────────────

const TYPE_BORDER: Record<string, string> = {
  FATAL: "border-l-[#DC3545]",
  ORDINARIO: "border-l-[#C9A961]",
  DILIGENCIA: "border-l-[#17A2B8]",
  AUDIENCIA: "border-l-[#C9A961]",
  ASSEMBLEIA: "border-l-[#28A745]",
}

const TYPE_BADGE: Record<string, string> = {
  FATAL: "bg-[#DC3545]/10 text-[#DC3545]",
  ORDINARIO: "bg-[#C9A961]/10 text-[#C9A961]",
  DILIGENCIA: "bg-[#17A2B8]/10 text-[#17A2B8]",
  AUDIENCIA: "bg-[#C9A961]/10 text-[#C9A961]",
  ASSEMBLEIA: "bg-[#28A745]/10 text-[#28A745]",
}

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-[#C9A961]/10 text-[#C9A961]",
  CUMPRIDO: "bg-[#28A745]/10 text-[#28A745]",
  PERDIDO: "bg-[#DC3545]/10 text-[#DC3545]",
  CANCELADO: "bg-gray-100 text-gray-600",
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

// ─── Main Layout Component ──────────────────────────────────────────

export function PrazosLayout() {
  const [newDialogOpen, setNewDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prazos & Calendário Judicial</h1>
          <p className="text-[#666666]">
            Controle de prazos processuais, fatais e ordinarios
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href="/prazos/catalogo">
              <BookOpen className="mr-1.5 size-3.5" />
              Catalogo de Prazos
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/prazos/calendario-judicial">
              <Scale className="mr-1.5 size-3.5" />
              Calendário Judicial
            </Link>
          </Button>
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-2 size-4" />Novo Prazo
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

        {/* Tab: Painel (Dashboard) */}
        <TabsContent value="painel" className="mt-4">
          <PainelTab />
        </TabsContent>

        {/* Tab: Todos os Prazos */}
        <TabsContent value="todos" className="mt-4">
          <TodosOsPrazosTab />
        </TabsContent>

        {/* Tab: Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <PrazosTimeline />
        </TabsContent>

        {/* Tab: Calendario */}
        <TabsContent value="calendario" className="mt-4">
          <CalendarioTab />
        </TabsContent>
      </Tabs>

      {/* New Deadline Dialog */}
      <NewDeadlineDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </div>
  )
}

// ─── Urgency KPI Cards ──────────────────────────────────────────────

function UrgencyCards() {
  const { data: stats } = trpc.deadlines.stats.useQuery()

  const cards = [
    {
      label: "Vencidos",
      value: stats?.overdue ?? 0,
      icon: ShieldAlert,
      bg: "bg-[#DC3545]",
      text: "text-white",
      pulse: !!stats?.overdue && stats.overdue > 0,
    },
    {
      label: "Hoje",
      value: stats?.today ?? 0,
      icon: Flame,
      bg: "bg-[#DC3545]/90",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Próximos 3 Dias",
      value: stats?.tomorrow ?? 0,
      icon: AlertTriangle,
      bg: "bg-orange-500",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Esta Semana",
      value: stats?.thisWeek ?? 0,
      icon: CalendarDays,
      bg: "bg-amber-500",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Próximos 30 Dias",
      value: stats?.next30 ?? 0,
      icon: TrendingUp,
      bg: "bg-[#28A745]",
      text: "text-white",
      pulse: false,
    },
    {
      label: "Fatais Pendentes",
      value: 0, // will be populated from dashboardStats when available
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
  const { data: fatalData, isLoading: fatalLoading } = trpc.deadlines.list.useQuery({
    tipo: "FATAL",
    status: "PENDENTE",
    limit: 10,
  })

  const { data: attentionData, isLoading: attentionLoading } = trpc.deadlines.list.useQuery({
    status: "PENDENTE",
    limit: 20,
  })

  const { data: recentData, isLoading: recentLoading } = trpc.deadlines.list.useQuery({
    status: "CUMPRIDO",
    limit: 10,
  })

  const fatalDeadlines = fatalData?.items ?? []
  const attentionDeadlines = (attentionData?.items ?? []).filter((d) => {
    const days = daysUntil(d.data_limite)
    return days <= 3 // overdue + today + next 3 days
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
                const days = daysUntil(d.data_limite)
                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      days <= 0 ? "bg-red-50 border-red-200" : days <= 2 ? "bg-orange-50 border-orange-200" : "bg-white"
                    }`}
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
                        <p className="text-sm font-medium truncate">{d.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Link
                            href={`/processos/${d.case_.id}`}
                            className="text-xs font-mono text-primary hover:underline"
                          >
                            {formatCNJ(d.case_.numero_processo) || "Sem numero"}
                          </Link>
                          <span className="text-xs text-[#666666] truncate">{d.case_.cliente.nome}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-medium">
                          {new Date(d.data_limite).toLocaleDateString("pt-BR")}
                        </p>
                        <p className={`text-[10px] font-semibold ${
                          days <= 0 ? "text-[#DC3545]" : days <= 2 ? "text-orange-600" : "text-[#C9A961]"
                        }`}>
                          {countdownText(days)}
                        </p>
                      </div>
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(d.responsavel.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prazos que Precisam de Atenção */}
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
                    const days = daysUntil(d.data_limite)
                    return (
                      <TableRow key={d.id} className={days < 0 ? "bg-red-50/50" : days === 0 ? "bg-orange-50/50" : ""}>
                        <TableCell className={`p-0 w-1 border-l-4 ${TYPE_BORDER[d.tipo] || "border-l-gray-300"}`} />
                        <TableCell>
                          <Badge variant="secondary" className={`text-[10px] ${TYPE_BADGE[d.tipo] || ""}`}>
                            {DEADLINE_TYPE_LABELS[d.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm" title={d.descricao}>
                          {d.descricao}
                        </TableCell>
                        <TableCell>
                          <Link href={`/processos/${d.case_.id}`} className="hover:underline text-primary text-xs font-mono">
                            {formatCNJ(d.case_.numero_processo) || "---"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${deadlineColor(d.data_limite)}`}>
                            {new Date(d.data_limite).toLocaleDateString("pt-BR")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-5">
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {getInitials(d.responsavel.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{d.responsavel.name.split(" ")[0]}</span>
                          </div>
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
                      <p className="text-sm truncate">{d.descricao}</p>
                      <p className="text-[10px] text-[#666666]">
                        {DEADLINE_TYPE_LABELS[d.tipo]} - {formatCNJ(d.case_.numero_processo)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="bg-[#28A745]/10 text-[#28A745] text-[10px]">
                      Cumprido
                    </Badge>
                    <span className="text-[10px] text-[#666666]">
                      {new Date(d.data_limite).toLocaleDateString("pt-BR")}
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

  const { data: listData, isLoading } = trpc.deadlines.list.useQuery({
    status: (statusFilter as "PENDENTE") || undefined,
    tipo: (tipoFilter as "FATAL") || undefined,
    responsavel_id: responsavelFilter || undefined,
    date_from: dateFrom ? new Date(dateFrom) : undefined,
    date_to: dateTo ? new Date(dateTo) : undefined,
    limit: 50,
  })

  const allDeadlines = listData?.items ?? []
  const total = listData?.total ?? 0

  // Client-side text search filter (server doesn't support text search on description)
  const deadlines = debouncedSearch
    ? allDeadlines.filter((d) =>
        d.descricao.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (d.case_.numero_processo && d.case_.numero_processo.includes(debouncedSearch)) ||
        d.case_.cliente.nome.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : allDeadlines

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
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#666666]" />
          <Input
            placeholder="Buscar por descricao, processo ou cliente..."
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
          variant={statusFilter === "PENDENTE" ? "default" : "outline"}
          size="sm"
          onClick={() => { setStatusFilter(statusFilter === "PENDENTE" ? "" : "PENDENTE"); setPage(1) }}
        >
          Pendentes
        </Button>
        <Button
          variant={statusFilter === "PERDIDO" ? "default" : "outline"}
          size="sm"
          className={statusFilter === "PERDIDO" ? "" : "text-[#DC3545] border-[#DC3545]/30"}
          onClick={() => { setStatusFilter(statusFilter === "PERDIDO" ? "" : "PERDIDO"); setPage(1) }}
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
                {Object.entries(DEADLINE_STATUS_LABELS).map(([v, l]) => (
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
                <TableHead>Descrição</TableHead>
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

      {/* Pagination info */}
      <div className="flex items-center justify-between text-sm text-[#666666]">
        <span>
          Exibindo {deadlines.length} de {total} prazo(s)
        </span>
      </div>
    </div>
  )
}

// ─── Tab: Calendario ────────────────────────────────────────────────

function CalendarioTab() {
  const { data: listData } = trpc.deadlines.list.useQuery({ limit: 200 })
  const deadlines = listData?.items ?? []

  return <DeadlinesCalendar deadlines={deadlines} />
}

// ─── Deadline Row ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeadlineRow({ deadline: d }: { deadline: any }) {
  const days = daysUntil(d.data_limite)
  const utils = trpc.useUtils()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const completeMutation = trpc.deadlines.complete.useMutation({
    onSuccess: () => {
      utils.deadlines.list.invalidate()
      utils.deadlines.stats.invalidate()
    },
  })

  const deleteMutation = trpc.deadlines.delete.useMutation({
    onSuccess: () => {
      utils.deadlines.list.invalidate()
      utils.deadlines.stats.invalidate()
      setDeleteDialogOpen(false)
    },
  })

  return (
    <>
      <TableRow className={d.status === "PENDENTE" && days < 0 ? "bg-red-50/30" : ""}>
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
          <Link href={`/processos/${d.case_.id}`} className="hover:underline text-primary">
            <p className="text-sm font-mono">{formatCNJ(d.case_.numero_processo) || "---"}</p>
            <p className="text-xs text-[#666666] truncate max-w-[180px]">{d.case_.cliente.nome}</p>
          </Link>
        </TableCell>

        {/* Description */}
        <TableCell className="max-w-[250px] truncate text-sm" title={d.descricao}>
          {d.descricao}
        </TableCell>

        {/* Date */}
        <TableCell>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${deadlineColor(d.data_limite)}`}>
            {new Date(d.data_limite).toLocaleDateString("pt-BR")}
          </span>
        </TableCell>

        {/* Responsible */}
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {getInitials(d.responsavel.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm whitespace-nowrap">{d.responsavel.name.split(" ")[0]}</span>
          </div>
        </TableCell>

        {/* Status */}
        <TableCell>
          <Badge variant="secondary" className={STATUS_BADGE[d.status] || ""}>
            {DEADLINE_STATUS_LABELS[d.status]}
          </Badge>
        </TableCell>

        {/* Days remaining */}
        <TableCell>
          {d.status === "PENDENTE" && (
            <span className={`text-xs font-medium whitespace-nowrap ${
              days < 0 ? "text-[#DC3545] font-bold" : days <= 2 ? "text-[#DC3545]" : days <= 5 ? "text-[#C9A961]" : "text-[#28A745]"
            }`}>
              {daysLabel(days)}
            </span>
          )}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-1">
            {d.status === "PENDENTE" && (
              <Button
                variant="outline" size="sm"
                className="h-7 text-xs gap-1"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate({ id: d.id })}
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
                <DropdownMenuItem asChild>
                  <Link href={`/processos/${d.case_.id}`}>
                    <ExternalLink className="mr-2 size-4" />
                    Ver Processo
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alert("Em desenvolvimento")}>
                  <Pencil className="mr-2 size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: d.id })}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── New Deadline Dialog ─────────────────────────────────────────────

function NewDeadlineDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [formData, setFormData] = useState({
    case_id: "", tipo: "", descricao: "", data_limite: "", responsavel_id: "", dias_uteis: "",
  })

  const { data: cases } = trpc.deadlines.casesForSelect.useQuery()
  const { data: users } = trpc.users.list.useQuery()
  const utils = trpc.useUtils()

  const addDeadline = trpc.cases.addDeadline.useMutation({
    onSuccess: () => {
      utils.deadlines.list.invalidate()
      utils.deadlines.stats.invalidate()
      onOpenChange(false)
      setFormData({ case_id: "", tipo: "", descricao: "", data_limite: "", responsavel_id: "", dias_uteis: "" })
    },
  })

  const set = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[550px] max-w-lg max-w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        {/* FIXED HEADER */}
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Novo Prazo</DialogTitle>
        </DialogHeader>
        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label>Processo *</Label>
            <Select value={formData.case_id} onValueChange={(v) => set("case_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecionar processo" /></SelectTrigger>
              <SelectContent>
                {cases?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatCNJ(c.numero_processo) || "Sem numero"} — {c.cliente.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => set("responsavel_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={formData.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Descreva o prazo..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Limite *</Label>
              <Input type="date" value={formData.data_limite} onChange={(e) => set("data_limite", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ou dias uteis a partir de hoje</Label>
              <Input
                type="number" min={1} placeholder="Ex: 15"
                value={formData.dias_uteis}
                onChange={(e) => {
                  set("dias_uteis", e.target.value)
                  if (e.target.value) {
                    const d = new Date()
                    d.setDate(d.getDate() + parseInt(e.target.value))
                    set("data_limite", d.toISOString().split("T")[0])
                  }
                }}
              />
              <p className="text-[10px] text-[#666666]">Estimativa em dias corridos (o servidor calcula dias uteis).</p>
            </div>
          </div>
        </div>
        {/* FIXED FOOTER */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!formData.case_id || !formData.tipo || !formData.descricao || !formData.data_limite || !formData.responsavel_id || addDeadline.isPending}
            onClick={() => addDeadline.mutate({
              case_id: formData.case_id,
              tipo: formData.tipo,
              descricao: formData.descricao,
              data_limite: new Date(formData.data_limite),
              responsavel_id: formData.responsavel_id,
            })}
          >
            {addDeadline.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
