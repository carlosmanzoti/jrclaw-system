"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Search, Plus, Filter, X, MoreHorizontal, Eye, Pencil, Trash2, Download } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CASE_TYPE_LABELS, CASE_STATUS_LABELS, ESTADOS_BRASIL, formatCurrency, formatCNJ, daysUntil, deadlineColor,
} from "@/lib/constants"

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-[#28A745]/10 text-[#28A745]",
  SUSPENSO: "bg-[#C9A961]/10 text-[#C9A961]",
  ARQUIVADO: "bg-gray-100 text-gray-600",
  ENCERRADO: "bg-[#17A2B8]/10 text-[#17A2B8]",
}

const TYPE_COLORS: Record<string, string> = {
  RECUPERACAO_JUDICIAL: "bg-[#C9A961]/10 text-[#C9A961]",
  FALENCIA: "bg-[#DC3545]/10 text-[#DC3545]",
  EXECUCAO: "bg-orange-100 text-orange-700",
  AGRONEGOCIO: "bg-[#28A745]/10 text-[#28A745]",
  TRIBUTARIO: "bg-sky-100 text-sky-700",
}

export function CasesList() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [tipoFilter, setTipoFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [advogadoFilter, setAdvogadoFilter] = useState("")
  const [ufFilter, setUfFilter] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null)
  const handleSearch = (value: string) => {
    setSearch(value)
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => setDebouncedSearch(value), 300)
    setSearchTimeout(timeout)
  }

  const { data, isLoading } = trpc.cases.list.useQuery({
    search: debouncedSearch || undefined,
    tipo: tipoFilter || undefined,
    status: (statusFilter as "ATIVO") || undefined,
    advogado_id: advogadoFilter || undefined,
    uf: ufFilter || undefined,
    limit: 50,
  })

  const { data: users } = trpc.users.list.useQuery()

  const cases = data?.items ?? []
  const total = data?.total ?? 0
  const hasActiveFilters = tipoFilter || statusFilter || advogadoFilter || ufFilter

  const clearFilters = () => {
    setTipoFilter("")
    setStatusFilter("")
    setAdvogadoFilter("")
    setUfFilter("")
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Processos</h1>
          <p className="text-[#666666]">
            {total} {total === 1 ? "processo" : "processos"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => alert("Exportação em desenvolvimento")}>
            <Download className="mr-2 size-4" />
            Exportar
          </Button>
          <Button asChild>
            <Link href="/processos/novo">
              <Plus className="mr-2 size-4" />
              Novo Processo
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#666666]" />
            <Input
              placeholder="Buscar por nº do processo ou nome do cliente..."
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
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(CASE_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {Object.entries(CASE_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={advogadoFilter} onValueChange={setAdvogadoFilter}>
              <SelectTrigger className="w-[180px] bg-white"><SelectValue placeholder="Advogado" /></SelectTrigger>
              <SelectContent>
                {users?.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ufFilter} onValueChange={setUfFilter}>
              <SelectTrigger className="w-[100px] bg-white"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_BRASIL.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 size-3" />Limpar</Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto max-h-[calc(100vh-20rem)] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow>
              <TableHead>Nº Processo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Vara/Comarca/UF</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Valor da Causa</TableHead>
              <TableHead className="hidden xl:table-cell">Advogado</TableHead>
              <TableHead className="hidden xl:table-cell">Próx. Prazo</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={9}><div className="h-5 w-full animate-pulse rounded bg-muted" /></TableCell></TableRow>
              ))
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-[#666666]">
                  {debouncedSearch || hasActiveFilters ? "Nenhum processo encontrado." : "Nenhum processo cadastrado."}
                </TableCell>
              </TableRow>
            ) : (
              cases.map((caso) => {
                const nextDeadline = caso.prazos[0]
                return (
                  <TableRow key={caso.id} className="cursor-pointer" onClick={() => router.push(`/processos/${caso.id}`)}>
                    <TableCell className="font-mono text-sm whitespace-nowrap">
                      {formatCNJ(caso.numero_processo)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={TYPE_COLORS[caso.tipo] || ""}>
                        {CASE_TYPE_LABELS[caso.tipo] || caso.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[250px] truncate" title={caso.cliente.nome}>{caso.cliente.nome}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className={STATUS_COLORS[caso.status] || ""}>
                        {CASE_STATUS_LABELS[caso.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {[caso.vara, caso.comarca, caso.uf].filter(Boolean).join(" / ") || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-right font-mono text-sm">
                      {formatCurrency(caso.valor_causa)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm">{caso.advogado_responsavel.name}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {nextDeadline ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${deadlineColor(nextDeadline.data_limite)}`}>
                          {new Date(nextDeadline.data_limite).toLocaleDateString("pt-BR")}
                          {daysUntil(nextDeadline.data_limite) < 0 && " (vencido)"}
                        </span>
                      ) : <span className="text-xs text-[#666666]">—</span>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/processos/${caso.id}`)}>
                            <Eye className="mr-2 size-4" />Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/processos/${caso.id}?edit=true`)}>
                            <Pencil className="mr-2 size-4" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-[#DC3545] focus:text-[#DC3545]"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTargetId(caso.id)
                              setDeleteOpen(true)
                            }}
                          >
                            <Trash2 className="mr-2 size-4" />Excluir
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Processo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#666666]">
            Tem certeza? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                alert("Exclusão em desenvolvimento")
                setDeleteOpen(false)
                setDeleteTargetId(null)
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
