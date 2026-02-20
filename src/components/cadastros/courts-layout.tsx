"use client"

import { useState } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search, Plus, Landmark, MoreHorizontal, Pencil, Trash2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COURT_TYPE_LABELS: Record<string, string> = {
  VARA_CIVEL: "Vara Civel",
  VARA_EMPRESARIAL: "Vara Empresarial",
  VARA_FAZENDA_PUBLICA: "Vara da Fazenda Publica",
  VARA_TRABALHO: "Vara do Trabalho",
  VARA_FEDERAL: "Vara Federal",
  VARA_FAMILIA: "Vara de Familia",
  VARA_CRIMINAL: "Vara Criminal",
  VARA_FALENCIAS_RJ: "Vara de Falencias e RJ",
  JUIZADO_ESPECIAL: "Juizado Especial",
  TURMA_RECURSAL: "Turma Recursal",
  CAMARA_CIVEL: "Camara Civel",
  CAMARA_EMPRESARIAL: "Camara Empresarial",
  TURMA_TRF: "Turma TRF",
  SECAO_TRF: "Secao TRF",
  TURMA_TST: "Turma TST",
  TURMA_STJ: "Turma STJ",
  TURMA_STF: "Turma STF",
  PLENARIO: "Plenario",
  CORTE_ESPECIAL: "Corte Especial",
  OUTRO_COURT: "Outro",
}

const COURT_INSTANCE_LABELS: Record<string, string> = {
  PRIMEIRA: "1a Instancia",
  SEGUNDA: "2a Instancia",
  SUPERIOR: "Tribunal Superior",
  SUPREMO: "STF",
}

const COURT_TYPE_KEYS = Object.keys(COURT_TYPE_LABELS)
const COURT_INSTANCE_KEYS = Object.keys(COURT_INSTANCE_LABELS)

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

const TRIBUNALS = [
  "TJAC", "TJAL", "TJAP", "TJAM", "TJBA", "TJCE", "TJDFT", "TJES", "TJGO",
  "TJMA", "TJMT", "TJMS", "TJMG", "TJPA", "TJPB", "TJPR", "TJPE", "TJPI",
  "TJRJ", "TJRN", "TJRS", "TJRO", "TJRR", "TJSC", "TJSP", "TJSE", "TJTO",
  "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6",
  "TRT1", "TRT2", "TRT3", "TRT4", "TRT5", "TRT6", "TRT7", "TRT8", "TRT9",
  "TRT10", "TRT11", "TRT12", "TRT13", "TRT14", "TRT15", "TRT16", "TRT17",
  "TRT18", "TRT19", "TRT20", "TRT21", "TRT22", "TRT23", "TRT24",
  "STJ", "STF", "TST",
]

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

const DEFAULT_FORM = {
  name: "",
  shortName: "",
  courtType: "",
  instance: "",
  comarca: "",
  city: "",
  state: "",
  tribunal: "",
  tribunalCode: "",
  phone: "",
  email: "",
  address: "",
  cep: "",
  notes: "",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourtsLayout() {
  const utils = trpc.useUtils()

  // Filters
  const [search, setSearch] = useState("")
  const [filterState, setFilterState] = useState("")
  const [filterTribunal, setFilterTribunal] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filterInstance, setFilterInstance] = useState("")

  // Dialog
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Data
  const { data: courts, isLoading } = trpc.court.list.useQuery({
    search: search || undefined,
    state: filterState || undefined,
    tribunal: filterTribunal || undefined,
    courtType: (filterType || undefined) as any,
    instance: (filterInstance || undefined) as any,
  })

  // Mutations
  const createCourt = trpc.court.create.useMutation({
    onSuccess: () => {
      utils.court.list.invalidate()
      closeDialog()
    },
  })

  const updateCourt = trpc.court.update.useMutation({
    onSuccess: () => {
      utils.court.list.invalidate()
      closeDialog()
    },
  })

  const deleteCourt = trpc.court.delete.useMutation({
    onSuccess: () => {
      utils.court.list.invalidate()
      setDeleteId(null)
    },
  })

  function closeDialog() {
    setShowDialog(false)
    setEditingId(null)
    setForm(DEFAULT_FORM)
  }

  function openCreate() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setShowDialog(true)
  }

  function openEdit(court: any) {
    setEditingId(court.id)
    setForm({
      name: court.name || "",
      shortName: court.shortName || "",
      courtType: court.courtType || "",
      instance: court.instance || "",
      comarca: court.comarca || "",
      city: court.city || "",
      state: court.state || "",
      tribunal: court.tribunal || "",
      tribunalCode: court.tribunalCode || "",
      phone: court.phone || "",
      email: court.email || "",
      address: court.address || "",
      cep: court.cep || "",
      notes: court.notes || "",
    })
    setShowDialog(true)
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      shortName: form.shortName || undefined,
      courtType: form.courtType as any,
      instance: form.instance as any,
      comarca: form.comarca,
      city: form.city,
      state: form.state,
      tribunal: form.tribunal,
      tribunalCode: form.tribunalCode || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      cep: form.cep || undefined,
      notes: form.notes || undefined,
    }

    if (editingId) {
      updateCourt.mutate({ id: editingId, ...payload } as any)
    } else {
      createCourt.mutate(payload as any)
    }
  }

  const isSaving = createCourt.isPending || updateCourt.isPending
  const canSubmit = form.name && form.courtType && form.instance && form.comarca && form.city && form.state && form.tribunal

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Varas e Comarcas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastro de varas, camaras, turmas e comarcas do sistema judiciario.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]">
          <Plus className="size-4 mr-2" />
          Nova Vara
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, comarca, tribunal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterState} onValueChange={(v) => setFilterState(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas UFs</SelectItem>
            {BRAZILIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTribunal} onValueChange={(v) => setFilterTribunal(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tribunal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos Tribunais</SelectItem>
            {TRIBUNALS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v) => setFilterType(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os Tipos</SelectItem>
            {COURT_TYPE_KEYS.map((k) => (
              <SelectItem key={k} value={k}>{COURT_TYPE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterInstance} onValueChange={(v) => setFilterInstance(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Instancia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas Instancias</SelectItem>
            {COURT_INSTANCE_KEYS.map((k) => (
              <SelectItem key={k} value={k}>{COURT_INSTANCE_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : !courts || courts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Landmark className="size-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-semibold">Nenhuma vara encontrada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || filterState || filterTribunal || filterType || filterInstance
              ? "Ajuste os filtros ou termos de busca."
              : "Comece cadastrando a primeira vara do sistema."}
          </p>
          {!search && !filterState && !filterTribunal && !filterType && !filterInstance && (
            <Button className="mt-4 bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]" onClick={openCreate}>
              <Plus className="size-4 mr-2" />
              Nova Vara
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Comarca</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Tribunal</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Juizes</TableHead>
                <TableHead className="text-center">Processos</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {courts.map((court: any) => (
                <TableRow key={court.id} className="group">
                  <TableCell>
                    <Link
                      href={`/cadastros/varas/${court.id}`}
                      className="font-medium text-[#C9A961] hover:underline"
                    >
                      {court.name}
                    </Link>
                    {court.shortName && (
                      <span className="ml-2 text-xs text-muted-foreground">({court.shortName})</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{court.comarca || "\u2014"}</TableCell>
                  <TableCell>
                    {court.state ? (
                      <Badge variant="outline" className="text-xs">{court.state}</Badge>
                    ) : "\u2014"}
                  </TableCell>
                  <TableCell>
                    {court.tribunal ? (
                      <Badge variant="secondary" className="text-xs">{court.tribunal}</Badge>
                    ) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {COURT_TYPE_LABELS[court.courtType] || court.courtType || "\u2014"}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {court.judges?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {court._count?.cases ?? 0}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(court)}>
                          <Pencil className="size-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(court.id)}
                          className="text-[#DC3545] focus:text-[#DC3545]"
                        >
                          <Trash2 className="size-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vara" : "Nova Vara"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome completo *</Label>
                <Input
                  placeholder="Ex: 1a Vara Civel de Maringa"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome curto</Label>
                <Input
                  placeholder="Ex: 1a Civel MGA"
                  value={form.shortName}
                  onChange={(e) => setForm((p) => ({ ...p, shortName: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.courtType} onValueChange={(v) => setForm((p) => ({ ...p, courtType: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURT_TYPE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>{COURT_TYPE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Instancia *</Label>
                <Select value={form.instance} onValueChange={(v) => setForm((p) => ({ ...p, instance: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURT_INSTANCE_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>{COURT_INSTANCE_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Comarca *</Label>
                <Input
                  placeholder="Ex: Maringa"
                  value={form.comarca}
                  onChange={(e) => setForm((p) => ({ ...p, comarca: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade *</Label>
                <Input
                  placeholder="Ex: Maringa"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">UF *</Label>
                <Select value={form.state} onValueChange={(v) => setForm((p) => ({ ...p, state: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tribunal *</Label>
                <Input
                  placeholder="Ex: TJPR"
                  value={form.tribunal}
                  onChange={(e) => setForm((p) => ({ ...p, tribunal: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Codigo tribunal</Label>
                <Input
                  placeholder="Ex: 0016"
                  value={form.tribunalCode}
                  onChange={(e) => setForm((p) => ({ ...p, tribunalCode: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="(00) 0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  placeholder="vara@tribunal.jus.br"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Endereco</Label>
                <Input
                  placeholder="Rua, numero, bairro"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CEP</Label>
                <Input
                  placeholder="00000-000"
                  value={form.cep}
                  onChange={(e) => setForm((p) => ({ ...p, cep: e.target.value }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Observacoes</Label>
              <Textarea
                rows={3}
                placeholder="Informacoes adicionais sobre a vara..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              className="bg-[#C9A961] hover:bg-[#B8984F] text-[#1A1A1A]"
              disabled={!canSubmit || isSaving}
              onClick={handleSubmit}
            >
              {isSaving ? "Salvando..." : editingId ? "Salvar Alteracoes" : "Cadastrar Vara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta vara? Esta acao nao pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourt.isPending}
              onClick={() => deleteId && deleteCourt.mutate({ id: deleteId })}
            >
              {deleteCourt.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
