"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "./patrimony-tab"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Plus, Pencil, Trash2, Briefcase } from "lucide-react"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICIPATION_TYPE_LABELS: Record<string, string> = {
  SOCIO_QUOTISTA: "Socio Quotista",
  SOCIO_ADMINISTRADOR_PART: "Socio Administrador",
  ACIONISTA_CONTROLADOR: "Acionista Controlador",
  ACIONISTA_MINORITARIO: "Acionista Minoritario",
  COOPERADO: "Cooperado",
  CONSORCIO: "Consorcio",
}

const PARTICIPATION_TYPES = Object.keys(PARTICIPATION_TYPE_LABELS)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParticipationFormData {
  companyName: string
  cnpj: string
  participationType: string
  sharePercentage: string
  capitalAmount: string
  role: string
  companyStatus: string
  cnaeDescription: string
  estimatedValue: string
  annualDividends: string
  notes: string
}

const EMPTY_FORM: ParticipationFormData = {
  companyName: "",
  cnpj: "",
  participationType: "",
  sharePercentage: "",
  capitalAmount: "",
  role: "",
  companyStatus: "",
  cnaeDescription: "",
  estimatedValue: "",
  annualDividends: "",
  notes: "",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyParticipation = any

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCurrency(value: string): number | undefined {
  if (!value.trim()) return undefined
  const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return undefined
  return Math.round(num * 100)
}

function formatCurrencyInput(centavos: number | null | undefined): string {
  if (centavos == null || centavos === 0) return ""
  return (centavos / 100).toFixed(2).replace(".", ",")
}

function parseNumberField(value: string): number | undefined {
  if (!value.trim()) return undefined
  const num = parseFloat(value.replace(",", "."))
  return isNaN(num) ? undefined : num
}

function formatPercentage(value: number | null | undefined): string {
  if (value == null) return "—"
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function formatCNPJ(value: string | null | undefined): string {
  if (!value) return "—"
  const digits = value.replace(/\D/g, "")
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
  }
  return value
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PatrimonyParticipationsTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils()

  // ---- State ----
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ParticipationFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ---- Queries ----
  const participationsQuery = trpc.patrimony.participations.list.useQuery({
    clientId,
  })

  // ---- Mutations ----
  const createMutation = trpc.patrimony.participations.create.useMutation({
    onSuccess: () => {
      utils.patrimony.participations.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
      closeModal()
    },
  })

  const updateMutation = trpc.patrimony.participations.update.useMutation({
    onSuccess: () => {
      utils.patrimony.participations.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
      closeModal()
    },
  })

  const deleteMutation = trpc.patrimony.participations.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.participations.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
    },
  })

  // ---- Handlers ----

  function closeModal() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function handleNew() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setModalOpen(true)
  }

  function handleEdit(item: AnyParticipation) {
    setEditingId(item.id)
    setForm({
      companyName: item.companyName || "",
      cnpj: item.cnpj || "",
      participationType: item.participationType || "",
      sharePercentage: item.sharePercentage != null ? String(item.sharePercentage) : "",
      capitalAmount: formatCurrencyInput(item.capitalAmount),
      role: item.role || "",
      companyStatus: item.companyStatus || "",
      cnaeDescription: item.cnaeDescription || "",
      estimatedValue: formatCurrencyInput(item.estimatedValue),
      annualDividends: formatCurrencyInput(item.annualDividends),
      notes: item.notes || "",
    })
    setModalOpen(true)
  }

  function handleDelete(item: AnyParticipation) {
    if (!window.confirm(`Deseja realmente excluir a participacao em "${item.companyName}"?`)) return
    deleteMutation.mutate({ id: item.id })
  }

  function handleSubmit() {
    const payload = {
      clientId,
      companyName: form.companyName,
      cnpj: form.cnpj || undefined,
      participationType: form.participationType as any,
      sharePercentage: parseNumberField(form.sharePercentage),
      capitalAmount: parseCurrency(form.capitalAmount),
      role: form.role || undefined,
      companyStatus: form.companyStatus || undefined,
      cnaeDescription: form.cnaeDescription || undefined,
      estimatedValue: parseCurrency(form.estimatedValue),
      annualDividends: parseCurrency(form.annualDividends),
      notes: form.notes || undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any)
    } else {
      createMutation.mutate(payload as any)
    }
  }

  function updateField<K extends keyof ParticipationFormData>(
    key: K,
    value: ParticipationFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ---- Loading ----
  if (participationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const participations = participationsQuery.data ?? []

  const totalValue = participations.reduce(
    (sum: number, p: AnyParticipation) => sum + (p.estimatedValue || 0),
    0
  )

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Participacoes Societarias</h3>
          <p className="text-sm text-muted-foreground">
            {participations.length} {participations.length === 1 ? "participacao" : "participacoes"} cadastrada{participations.length !== 1 ? "s" : ""} — Total estimado: {formatCurrency(totalValue / 100)}
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
        >
          <Plus className="size-4" />
          Nova Participacao
        </Button>
      </div>

      {/* Table */}
      {participations.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">% Participacao</TableHead>
                <TableHead>Funcao</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Est.</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participations.map((item: AnyParticipation) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    {item.companyName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatCNPJ(item.cnpj)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {PARTICIPATION_TYPE_LABELS[item.participationType] || item.participationType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPercentage(item.sharePercentage)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.role || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.companyStatus || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.estimatedValue / 100)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Briefcase className="size-12 text-muted-foreground/40 mb-4" />
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhuma participacao societaria cadastrada
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione participacoes societarias ao patrimonio deste cliente.
          </p>
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4" />
            Adicionar Primeira Participacao
          </Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Participacao Societaria" : "Nova Participacao Societaria"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados da participacao societaria."
                : "Cadastre uma nova participacao societaria no patrimonio do cliente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Empresa */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Dados da Empresa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="pf-company">Empresa *</Label>
                  <Input
                    id="pf-company"
                    value={form.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-cnpj">CNPJ</Label>
                  <Input
                    id="pf-cnpj"
                    value={form.cnpj}
                    onChange={(e) => updateField("cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-cnae">CNAE</Label>
                  <Input
                    id="pf-cnae"
                    value={form.cnaeDescription}
                    onChange={(e) => updateField("cnaeDescription", e.target.value)}
                    placeholder="Atividade economica"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-status">Status da empresa</Label>
                  <Input
                    id="pf-status"
                    value={form.companyStatus}
                    onChange={(e) => updateField("companyStatus", e.target.value)}
                    placeholder="Ex: Ativa, Em recuperacao..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Participacao */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Participacao
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={form.participationType}
                    onValueChange={(v) => updateField("participationType", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTICIPATION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PARTICIPATION_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pf-share">% Participacao</Label>
                  <Input
                    id="pf-share"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={form.sharePercentage}
                    onChange={(e) => updateField("sharePercentage", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-capital">Capital integralizado (R$)</Label>
                  <Input
                    id="pf-capital"
                    value={form.capitalAmount}
                    onChange={(e) => updateField("capitalAmount", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-role">Funcao/Cargo</Label>
                  <Input
                    id="pf-role"
                    value={form.role}
                    onChange={(e) => updateField("role", e.target.value)}
                    placeholder="Ex: Administrador, Conselheiro..."
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Valor */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Avaliacao
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pf-value">Valor estimado (R$)</Label>
                  <Input
                    id="pf-value"
                    value={form.estimatedValue}
                    onChange={(e) => updateField("estimatedValue", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="pf-dividends">Dividendos anuais (R$)</Label>
                  <Input
                    id="pf-dividends"
                    value={form.annualDividends}
                    onChange={(e) => updateField("annualDividends", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Observacoes */}
            <div>
              <Label htmlFor="pf-notes">Observacoes</Label>
              <Textarea
                id="pf-notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Observacoes adicionais sobre a participacao..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !form.companyName ||
                !form.participationType
              }
              className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "Salvando..."
                : editingId
                  ? "Salvar Alteracoes"
                  : "Adicionar Participacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
