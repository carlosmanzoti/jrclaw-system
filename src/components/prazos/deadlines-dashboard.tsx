"use client"

import { useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  Clock, CalendarDays, AlertTriangle, Check, Plus, Filter, X,
  List, Calendar as CalendarIcon, ChevronRight, MoreHorizontal,
  Pencil, Trash2, Eye, ExternalLink,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
} from "@/lib/constants"

// Lazy-load FullCalendar to avoid SSR issues and reduce initial bundle
const DeadlinesCalendar = dynamic(() => import("./deadlines-calendar"), { ssr: false })

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

export function DeadlinesDashboard() {
  const [statusFilter, setStatusFilter] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [responsavelFilter, setResponsavelFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [newDialogOpen, setNewDialogOpen] = useState(false)

  const { data: stats } = trpc.deadlines.stats.useQuery()
  const { data: users } = trpc.users.list.useQuery()

  const { data: listData, isLoading } = trpc.deadlines.list.useQuery({
    status: (statusFilter as "PENDENTE") || undefined,
    tipo: (tipoFilter as "FATAL") || undefined,
    responsavel_id: responsavelFilter || undefined,
    limit: 200,
  })

  const deadlines = listData?.items ?? []
  const total = listData?.total ?? 0
  const hasActiveFilters = statusFilter || tipoFilter || responsavelFilter

  const clearFilters = () => {
    setStatusFilter("")
    setTipoFilter("")
    setResponsavelFilter("")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prazos</h1>
          <p className="text-[#666666]">{total} prazo(s) encontrado(s)</p>
        </div>
        <Button onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-2 size-4" />Novo Prazo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Hoje"
          value={stats?.today ?? 0}
          bg="bg-[#DC3545]"
          text="text-white"
        />
        <KpiCard
          label="Amanha"
          value={stats?.tomorrow ?? 0}
          bg="bg-[#DC3545]/90"
          text="text-white"
        />
        <KpiCard
          label="Esta Semana"
          value={stats?.thisWeek ?? 0}
          bg="bg-[#C9A961]"
          text="text-white"
        />
        <KpiCard
          label="Proximos 30 dias"
          value={stats?.next30 ?? 0}
          bg="bg-[#28A745]"
          text="text-white"
        />
        <KpiCard
          label="Vencidos"
          value={stats?.overdue ?? 0}
          bg="bg-gray-900"
          text="text-white"
          pulse={!!stats?.overdue && stats.overdue > 0}
        />
      </div>

      {/* Quick Status Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("")}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === "PENDENTE" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter(statusFilter === "PENDENTE" ? "" : "PENDENTE")}
        >
          Pendentes
        </Button>
        <Button
          variant={statusFilter === "PERDIDO" ? "default" : "outline"}
          size="sm"
          className={statusFilter === "PERDIDO" ? "" : "text-[#DC3545] border-[#DC3545]/30"}
          onClick={() => setStatusFilter(statusFilter === "PERDIDO" ? "" : "PERDIDO")}
        >
          Vencidos
        </Button>
        <Button
          variant={statusFilter === "CUMPRIDO" ? "default" : "outline"}
          size="sm"
          className={statusFilter === "CUMPRIDO" ? "" : "text-[#28A745] border-[#28A745]/30"}
          onClick={() => setStatusFilter(statusFilter === "CUMPRIDO" ? "" : "CUMPRIDO")}
        >
          Cumpridos
        </Button>
      </div>

      {/* Tabs: Lista | Calendario */}
      <Tabs defaultValue="lista">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="lista" className="gap-1.5">
              <List className="size-3.5" />Lista
            </TabsTrigger>
            <TabsTrigger value="calendario" className="gap-1.5">
              <CalendarIcon className="size-3.5" />Calendario
            </TabsTrigger>
          </TabsList>

          <Button variant={showFilters ? "secondary" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-1 size-3.5" />Filtros
            {hasActiveFilters && <Badge className="ml-2 size-5 rounded-full p-0 flex items-center justify-center text-[10px]">!</Badge>}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEADLINE_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[150px] bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
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

        {/* List View */}
        <TabsContent value="lista" className="mt-4">
          <div className="rounded-lg border bg-white overflow-x-auto">
            <div className="max-h-[calc(100vh-24rem)] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow>
                  <TableHead className="w-[4px] p-0" />
                  <TableHead>Tipo</TableHead>
                  <TableHead>Processo / Cliente</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead>Responsavel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={9}><div className="h-5 w-full animate-pulse rounded bg-muted" /></TableCell></TableRow>
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
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendario" className="mt-4">
          <DeadlinesCalendar deadlines={deadlines} />
        </TabsContent>
      </Tabs>

      {/* New Deadline Dialog */}
      <NewDeadlineDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────

function KpiCard({ label, value, bg, text, pulse }: {
  label: string; value: number; bg: string; text: string; pulse?: boolean
}) {
  return (
    <Card className={`${bg} border-0 ${pulse ? "animate-pulse" : ""}`}>
      <CardContent className="pt-4 pb-4 flex flex-col items-center">
        <span className={`text-3xl font-bold ${text}`}>{value}</span>
        <span className={`text-xs mt-1 ${text} opacity-80`}>{label}</span>
      </CardContent>
    </Card>
  )
}

// ─── Deadline Row ────────────────────────────────────────────────

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
    <TableRow>
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
          <p className="text-sm font-mono">{formatCNJ(d.case_.numero_processo) || "—"}</p>
          <p className="text-xs text-[#666666] truncate max-w-[180px]">{d.case_.cliente.nome}</p>
        </Link>
      </TableCell>

      {/* Description */}
      <TableCell className="max-w-[250px] truncate text-sm">{d.descricao}</TableCell>

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
          <span className={`text-xs font-medium whitespace-nowrap ${days < 0 ? "text-[#DC3545] font-bold" : days <= 2 ? "text-[#DC3545]" : days <= 5 ? "text-[#C9A961]" : "text-[#28A745]"}`}>
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
          <DialogTitle>Confirmar exclusão</DialogTitle>
          <DialogDescription>
            Tem certeza? Esta ação não pode ser desfeita.
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

// ─── New Deadline Dialog ─────────────────────────────────────────

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
              <Label>Responsavel *</Label>
              <Select value={formData.responsavel_id} onValueChange={(v) => set("responsavel_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descricao *</Label>
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
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
