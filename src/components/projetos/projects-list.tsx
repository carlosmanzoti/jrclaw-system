"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Search, Plus, Filter, X, MoreHorizontal, Eye, Pencil,
  LayoutList, Columns3, BarChart3, FolderKanban,
  Briefcase, Clock, CheckCircle2, DollarSign,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  PROJECT_CATEGORY_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS, formatCurrency,
} from "@/lib/constants"

type ViewMode = "lista" | "kanban" | "timeline"

const KANBAN_COLUMNS = [
  { key: "PLANEJAMENTO", label: "Planejamento", color: "border-slate-300" },
  { key: "EM_ANDAMENTO", label: "Em Andamento", color: "border-blue-400" },
  { key: "AGUARDANDO_CLIENTE", label: "Aguardando", color: "border-amber-400" },
  { key: "CONCLUIDO", label: "Concluído", color: "border-emerald-400" },
]

function calcProgress(tarefas: Array<{ status: string }>) {
  if (!tarefas.length) return 0
  const done = tarefas.filter((t) => t.status === "CONCLUIDA").length
  return Math.round((done / tarefas.length) * 100)
}

export function ProjectsList() {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>("lista")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [categoriaFilter, setCategoriaFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [prioridadeFilter, setPrioridadeFilter] = useState("")
  const [advogadoFilter, setAdvogadoFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => setDebouncedSearch(value), 300)
    setSearchTimeout(timeout)
  }

  const { data, isLoading } = trpc.projects.list.useQuery({
    search: debouncedSearch || undefined,
    categoria: categoriaFilter || undefined,
    status: statusFilter || undefined,
    prioridade: prioridadeFilter || undefined,
    advogado_id: advogadoFilter || undefined,
    limit: 50,
  })

  const { data: stats } = trpc.projects.stats.useQuery()
  const { data: users } = trpc.users.list.useQuery()

  const projects = data?.items ?? []
  const total = data?.total ?? 0
  const hasActiveFilters = categoriaFilter || statusFilter || prioridadeFilter || advogadoFilter

  const clearFilters = () => {
    setCategoriaFilter("")
    setStatusFilter("")
    setPrioridadeFilter("")
    setAdvogadoFilter("")
  }

  const kpiCards = [
    { title: "Projetos Ativos", value: stats?.ativos ?? 0, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Aguardando Acao", value: stats?.aguardando ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Concluidos no Mes", value: stats?.concluidosMes ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Valor Total", value: formatCurrency(stats?.valorTotal), icon: DollarSign, color: "text-primary", bg: "bg-primary/5", isText: true },
  ]

  return (
    <>
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.title}</CardTitle>
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`size-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.color}`}>
                {kpi.isText ? kpi.value : String(kpi.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">{total} {total === 1 ? "projeto" : "projetos"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-0.5">
            <Button size="sm" variant={view === "lista" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("lista")}>
              <LayoutList className="size-4" />
            </Button>
            <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("kanban")}>
              <Columns3 className="size-4" />
            </Button>
            <Button size="sm" variant={view === "timeline" ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setView("timeline")}>
              <BarChart3 className="size-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/projetos/novo">
              <Plus className="mr-2 size-4" />
              Novo Projeto
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por titulo, codigo ou cliente..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 size-4" />
            Filtros
            {hasActiveFilters && <Badge className="ml-2 size-5 rounded-full p-0 flex items-center justify-center text-[10px]">!</Badge>}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[200px] bg-white"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={advogadoFilter} onValueChange={setAdvogadoFilter}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Responsavel" /></SelectTrigger>
              <SelectContent>
                {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 size-3" />Limpar</Button>
            )}
          </div>
        )}
      </div>

      {/* Views */}
      {view === "lista" && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Codigo</TableHead>
                <TableHead>Titulo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden lg:table-cell">Prioridade</TableHead>
                <TableHead className="hidden lg:table-cell">Progresso</TableHead>
                <TableHead className="hidden xl:table-cell">Responsavel</TableHead>
                <TableHead className="hidden xl:table-cell text-right">Valor</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={10}><div className="h-5 w-full animate-pulse rounded bg-muted" /></TableCell></TableRow>
                ))
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                    {debouncedSearch || hasActiveFilters ? "Nenhum projeto encontrado." : "Nenhum projeto cadastrado."}
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => {
                  const progress = calcProgress(p.tarefas)
                  return (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => router.push(`/projetos/${p.id}`)}>
                      <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                      <TableCell className="max-w-[250px] truncate font-medium">{p.titulo}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{p.cliente.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {PROJECT_CATEGORY_LABELS[p.categoria] || p.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className={PROJECT_STATUS_COLORS[p.status] || ""}>
                          {PROJECT_STATUS_LABELS[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary" className={PRIORITY_COLORS[p.prioridade] || ""}>
                          {PRIORITY_LABELS[p.prioridade]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-2 w-16" />
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-sm">{p.advogado_responsavel.name}</TableCell>
                      <TableCell className="hidden xl:table-cell text-right font-mono text-sm">
                        {formatCurrency(p.valor_envolvido)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/projetos/${p.id}`)}>
                              <Eye className="mr-2 size-4" />Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/projetos/${p.id}?edit=true`)}>
                              <Pencil className="mr-2 size-4" />Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const colProjects = projects.filter((p) => {
              if (col.key === "AGUARDANDO_CLIENTE") {
                return ["AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO", "AGUARDANDO_ORGAO"].includes(p.status)
              }
              return p.status === col.key
            })

            return (
              <div key={col.key} className={`rounded-lg border-t-4 ${col.color} bg-muted/30 p-3`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{col.label}</h3>
                  <Badge variant="secondary" className="text-xs">{colProjects.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colProjects.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum projeto</p>
                  ) : (
                    colProjects.map((p) => {
                      const progress = calcProgress(p.tarefas)
                      return (
                        <Card
                          key={p.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => router.push(`/projetos/${p.id}`)}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-muted-foreground font-mono">{p.codigo}</p>
                                <p className="text-sm font-medium truncate">{p.titulo}</p>
                              </div>
                              <Badge variant="secondary" className={`shrink-0 text-[10px] ${PRIORITY_COLORS[p.prioridade] || ""}`}>
                                {PRIORITY_LABELS[p.prioridade]}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{p.cliente.nome}</p>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground">{progress}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                              <span>{p.advogado_responsavel.name}</span>
                              <span>{p._count.tarefas} tarefas</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === "timeline" && (
        <TimelineView projects={projects} />
      )}
    </>
  )
}

// Simple timeline/Gantt view using pure HTML/CSS
function TimelineView({ projects }: { projects: Array<{
  id: string; titulo: string; codigo: string; status: string; prioridade: string;
  data_inicio?: Date | string | null; data_prevista_conclusao?: Date | string | null;
  cliente: { nome: string }; advogado_responsavel: { name: string };
  tarefas: Array<{ status: string }>;
}> }) {
  const router = useRouter()
  const now = new Date()

  // Find date range across all projects
  const allDates = projects.flatMap((p) => {
    const dates: Date[] = []
    if (p.data_inicio) dates.push(new Date(p.data_inicio))
    if (p.data_prevista_conclusao) dates.push(new Date(p.data_prevista_conclusao))
    return dates
  })

  if (allDates.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Nenhum projeto com datas definidas.</p>
  }

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime()), now.getTime()))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime()), now.getTime()))
  minDate.setDate(minDate.getDate() - 7)
  maxDate.setDate(maxDate.getDate() + 30)
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

  // Generate month headers
  const months: Array<{ label: string; width: number }> = []
  const cursor = new Date(minDate)
  cursor.setDate(1)
  while (cursor <= maxDate) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const start = Math.max(0, Math.ceil((cursor.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
    const end = Math.min(totalDays, Math.ceil((monthEnd.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
    months.push({
      label: cursor.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      width: ((end - start) / totalDays) * 100,
    })
    cursor.setMonth(cursor.getMonth() + 1)
    cursor.setDate(1)
  }

  const todayOffset = ((now.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100

  const STATUS_BAR_COLORS: Record<string, string> = {
    PLANEJAMENTO: "bg-slate-400",
    EM_ANDAMENTO: "bg-blue-500",
    AGUARDANDO_CLIENTE: "bg-amber-500",
    AGUARDANDO_TERCEIRO: "bg-yellow-500",
    AGUARDANDO_ORGAO: "bg-orange-500",
    PAUSADO: "bg-gray-400",
    CONCLUIDO: "bg-emerald-500",
    CANCELADO: "bg-red-400",
  }

  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Month headers */}
        <div className="flex border-b bg-muted/30 text-xs text-muted-foreground">
          <div className="w-[250px] shrink-0 p-2 font-medium">Projeto</div>
          <div className="flex-1 flex relative">
            {months.map((m, i) => (
              <div key={i} className="border-l px-1 py-2 text-center" style={{ width: `${m.width}%` }}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        {/* Project rows */}
        {projects.map((p) => {
          const start = p.data_inicio ? new Date(p.data_inicio) : null
          const end = p.data_prevista_conclusao ? new Date(p.data_prevista_conclusao) : null
          const progress = calcProgress(p.tarefas)

          let leftPct = 0
          let widthPct = 5 // minimum
          if (start && end) {
            leftPct = ((start.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100
            widthPct = Math.max(2, ((end.getTime() - start.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100)
          } else if (start) {
            leftPct = ((start.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100
            widthPct = 10
          }

          return (
            <div
              key={p.id}
              className="flex border-b hover:bg-muted/20 cursor-pointer"
              onClick={() => router.push(`/projetos/${p.id}`)}
            >
              <div className="w-[250px] shrink-0 p-2 text-sm">
                <p className="font-medium truncate">{p.titulo}</p>
                <p className="text-xs text-muted-foreground truncate">{p.codigo} - {p.cliente.nome}</p>
              </div>
              <div className="flex-1 relative py-3 px-1">
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                  style={{ left: `${todayOffset}%` }}
                />
                {/* Bar */}
                <div
                  className={`absolute h-6 rounded ${STATUS_BAR_COLORS[p.status] || "bg-blue-400"} opacity-80`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, top: "50%", transform: "translateY(-50%)" }}
                >
                  {/* Progress fill */}
                  <div className="h-full rounded bg-white/30" style={{ width: `${progress}%` }} />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-medium">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
