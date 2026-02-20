"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Search,
  Plus,
  Star,
  Pencil,
  Trash2,
  Building2,
  Users,
  Scale,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAZILIAN_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
] as const

const EMPTY_FORM = {
  companyName: "",
  tradeName: "",
  cnpj: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  specialties: "",
  rating: 0,
  notes: "",
}

// ---------------------------------------------------------------------------
// Star Rating Component
// ---------------------------------------------------------------------------

function StarRating({
  value,
  onChange,
  size = 16,
  readonly = false,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
  readonly?: boolean
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
        >
          <Star
            size={size}
            className={
              star <= value
                ? "fill-[#C9A961] text-[#C9A961]"
                : "text-muted-foreground/40"
            }
          />
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function JudicialAdminLayout() {
  const utils = trpc.useUtils()

  // Search / filter state
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<string>("")
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined)

  // Dialog state
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // Data
  const { data, isLoading } = trpc.judicialAdmin.list.useQuery({
    search: search || undefined,
    state: stateFilter || undefined,
    rating: ratingFilter,
  })

  // Mutations
  const createMutation = trpc.judicialAdmin.create.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.list.invalidate()
      resetDialog()
    },
  })

  const updateMutation = trpc.judicialAdmin.update.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.list.invalidate()
      resetDialog()
    },
  })

  const deleteMutation = trpc.judicialAdmin.delete.useMutation({
    onSuccess: () => {
      utils.judicialAdmin.list.invalidate()
      setDeleteId(null)
    },
  })

  // Helpers
  const resetDialog = useCallback(() => {
    setShowNewDialog(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }, [])

  const openEdit = useCallback((item: any) => {
    setForm({
      companyName: item.companyName ?? "",
      tradeName: item.tradeName ?? "",
      cnpj: item.cnpj ?? "",
      email: item.email ?? "",
      phone: item.phone ?? "",
      website: item.website ?? "",
      address: item.address ?? "",
      city: item.city ?? "",
      state: item.state ?? "",
      contactName: item.contactName ?? "",
      contactEmail: item.contactEmail ?? "",
      contactPhone: item.contactPhone ?? "",
      specialties: item.specialties ?? "",
      rating: item.rating ?? 0,
      notes: item.notes ?? "",
    })
    setEditingId(item.id)
    setShowNewDialog(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const payload = {
      ...form,
      rating: form.rating || undefined,
      state: form.state || undefined,
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }, [form, editingId, createMutation, updateMutation])

  const isSaving = createMutation.isPending || updateMutation.isPending

  const admins = data ?? []

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Administradores Judiciais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro de empresas de administração judicial
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(EMPTY_FORM)
            setEditingId(null)
            setShowNewDialog(true)
          }}
          className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo AJ
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={stateFilter}
          onValueChange={(v) => setStateFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas UFs</SelectItem>
            {BRAZILIAN_STATES.map((uf) => (
              <SelectItem key={uf} value={uf}>
                {uf}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Avaliação:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() =>
                  setRatingFilter(ratingFilter === star ? undefined : star)
                }
                className="cursor-pointer hover:scale-110 transition-transform"
              >
                <Star
                  size={18}
                  className={
                    ratingFilter !== undefined && star <= ratingFilter
                      ? "fill-[#C9A961] text-[#C9A961]"
                      : "text-muted-foreground/40"
                  }
                />
              </button>
            ))}
            {ratingFilter !== undefined && (
              <button
                type="button"
                onClick={() => setRatingFilter(undefined)}
                className="ml-1 text-xs text-muted-foreground hover:text-foreground"
              >
                limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : admins.length === 0 ? (
        <EmptyState onAdd={() => setShowNewDialog(true)} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead className="hidden md:table-cell">Nome Fantasia</TableHead>
                <TableHead className="hidden lg:table-cell">CNPJ</TableHead>
                <TableHead className="hidden sm:table-cell">Cidade/UF</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="hidden md:table-cell text-center">Equipe</TableHead>
                <TableHead className="hidden lg:table-cell text-center">Processos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin: any) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <Link
                      href={`/cadastros/administradores-judiciais/${admin.id}`}
                      className="font-medium text-[#C9A961] hover:underline"
                    >
                      {admin.companyName}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {admin.tradeName || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                    {admin.cnpj || "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {admin.city && admin.state
                      ? `${admin.city}/${admin.state}`
                      : admin.city || admin.state || "—"}
                  </TableCell>
                  <TableCell>
                    <StarRating
                      value={admin.rating ?? 0}
                      readonly
                      size={14}
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <Badge variant="secondary" className="font-mono">
                      <Users className="h-3 w-3 mr-1" />
                      {admin.teamMembers?.length ?? admin._count?.teamMembers ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center">
                    <Badge variant="secondary" className="font-mono">
                      <Scale className="h-3 w-3 mr-1" />
                      {admin._count?.cases ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(admin)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(admin.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New / Edit Dialog */}
      <Dialog
        open={showNewDialog}
        onOpenChange={(open) => {
          if (!open) resetDialog()
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Administrador Judicial" : "Novo Administrador Judicial"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Company Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="companyName">
                  Razão Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  placeholder="Razão social da empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tradeName">Nome Fantasia</Label>
                <Input
                  id="tradeName"
                  value={form.tradeName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tradeName: e.target.value }))
                  }
                  placeholder="Nome fantasia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={form.cnpj}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cnpj: e.target.value }))
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="contato@empresa.com.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="(00) 0000-0000"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Site</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, website: e.target.value }))
                  }
                  placeholder="https://www.empresa.com.br"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="Cidade"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Select
                  value={form.state}
                  onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}
                >
                  <SelectTrigger id="state" className="w-full">
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Person */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Responsável
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="contactName">Nome</Label>
                  <Input
                    id="contactName"
                    value={form.contactName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contactName: e.target.value }))
                    }
                    placeholder="Nome do responsável"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">E-mail</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contactEmail: e.target.value }))
                    }
                    placeholder="responsavel@empresa.com.br"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefone</Label>
                  <Input
                    id="contactPhone"
                    value={form.contactPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contactPhone: e.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            {/* Rating & Notes */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Avaliação e Observações
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialties">Especialidades</Label>
                  <Input
                    id="specialties"
                    value={form.specialties}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, specialties: e.target.value }))
                    }
                    placeholder="Ex: Recuperação Judicial, Falência, Concordata"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Avaliação</Label>
                  <StarRating
                    value={form.rating}
                    onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                    size={24}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Observações sobre o administrador judicial..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.companyName.trim() || isSaving}
              className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
            >
              {isSaving
                ? "Salvando..."
                : editingId
                  ? "Salvar Alterações"
                  : "Cadastrar AJ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este administrador judicial? Esta ação
            não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32 hidden md:block" />
            <Skeleton className="h-5 w-36 hidden lg:block" />
            <Skeleton className="h-5 w-24 hidden sm:block" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-12 hidden md:block" />
            <Skeleton className="h-5 w-12 hidden lg:block" />
            <Skeleton className="h-5 w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border bg-card flex flex-col items-center justify-center py-16 px-4 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold mb-1">
        Nenhum administrador judicial cadastrado
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Cadastre as empresas de administração judicial para vincular aos seus
        processos de recuperação judicial e falência.
      </p>
      <Button
        onClick={onAdd}
        className="bg-[#C9A961] hover:bg-[#b8983f] text-black"
      >
        <Plus className="h-4 w-4 mr-2" />
        Cadastrar Primeiro AJ
      </Button>
    </div>
  )
}
