"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatCurrency } from "./patrimony-tab"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Plus, Pencil, Trash2, Building2 } from "lucide-react"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
  SALA_COMERCIAL: "Sala Comercial",
  GALPAO: "Galpao",
  TERRENO: "Terreno",
  LOJA: "Loja",
  PREDIO_COMERCIAL: "Predio Comercial",
  FAZENDA_URBANA: "Chacara/Sitio",
  OUTRO: "Outro",
}

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS)

const OWNERSHIP_LABELS: Record<string, string> = {
  PROPRIO: "Proprio",
  ARRENDADO: "Arrendado",
  PARCERIA: "Parceria",
  COMODATO: "Comodato",
  POSSE: "Posse",
  CONDOMINIO: "Condominio",
}

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UrbanFormData {
  propertyType: string
  description: string
  registrationNumber: string
  address: string
  neighborhood: string
  city: string
  state: string
  cep: string
  builtArea: string
  landArea: string
  ownership: string
  ownerName: string
  estimatedValue: string
  appraisalDate: string
  appraisalSource: string
  monthlyRent: string
  hasLien: boolean
  lienHolder: string
  lienAmount: string
  hasJudicialBlock: boolean
  blockDetails: string
  notes: string
}

const EMPTY_FORM: UrbanFormData = {
  propertyType: "",
  description: "",
  registrationNumber: "",
  address: "",
  neighborhood: "",
  city: "",
  state: "",
  cep: "",
  builtArea: "",
  landArea: "",
  ownership: "",
  ownerName: "",
  estimatedValue: "",
  appraisalDate: "",
  appraisalSource: "",
  monthlyRent: "",
  hasLien: false,
  lienHolder: "",
  lienAmount: "",
  hasJudicialBlock: false,
  blockDetails: "",
  notes: "",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProperty = any

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

function formatOnus(item: AnyProperty): string {
  const parts: string[] = []
  if (item.hasLien) parts.push("Alienacao")
  if (item.hasJudicialBlock) parts.push("Bloqueio")
  return parts.length > 0 ? parts.join(", ") : "Livre"
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PatrimonyUrbanTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils()

  // ---- State ----
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<UrbanFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ---- Queries ----
  const propertiesQuery = trpc.patrimony.urbanProperties.list.useQuery({
    clientId,
  })

  // ---- Mutations ----
  const createMutation = trpc.patrimony.urbanProperties.create.useMutation({
    onSuccess: () => {
      utils.patrimony.urbanProperties.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
      closeModal()
    },
  })

  const updateMutation = trpc.patrimony.urbanProperties.update.useMutation({
    onSuccess: () => {
      utils.patrimony.urbanProperties.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
      closeModal()
    },
  })

  const deleteMutation = trpc.patrimony.urbanProperties.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.urbanProperties.list.invalidate({ clientId })
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

  function handleEdit(item: AnyProperty) {
    setEditingId(item.id)
    setForm({
      propertyType: item.propertyType || "",
      description: item.description || "",
      registrationNumber: item.registrationNumber || "",
      address: item.address || "",
      neighborhood: item.neighborhood || "",
      city: item.city || "",
      state: item.state || "",
      cep: item.cep || "",
      builtArea: item.builtArea != null ? String(item.builtArea) : "",
      landArea: item.landArea != null ? String(item.landArea) : "",
      ownership: item.ownership || "",
      ownerName: item.ownerName || "",
      estimatedValue: formatCurrencyInput(item.estimatedValue),
      appraisalDate: item.appraisalDate
        ? new Date(item.appraisalDate).toISOString().slice(0, 10)
        : "",
      appraisalSource: item.appraisalSource || "",
      monthlyRent: formatCurrencyInput(item.monthlyRent),
      hasLien: item.hasLien || false,
      lienHolder: item.lienHolder || "",
      lienAmount: formatCurrencyInput(item.lienAmount),
      hasJudicialBlock: item.hasJudicialBlock || false,
      blockDetails: item.blockDetails || "",
      notes: item.notes || "",
    })
    setModalOpen(true)
  }

  function handleDelete(item: AnyProperty) {
    if (!window.confirm(`Deseja realmente excluir "${item.description}"?`)) return
    deleteMutation.mutate({ id: item.id })
  }

  function handleSubmit() {
    const payload = {
      clientId,
      propertyType: form.propertyType as any,
      description: form.description,
      registrationNumber: form.registrationNumber || undefined,
      address: form.address,
      neighborhood: form.neighborhood || undefined,
      city: form.city,
      state: form.state,
      cep: form.cep || undefined,
      builtArea: parseNumberField(form.builtArea),
      landArea: parseNumberField(form.landArea),
      ownership: (form.ownership || undefined) as any,
      ownerName: form.ownership !== "PROPRIO" ? form.ownerName || undefined : undefined,
      estimatedValue: parseCurrency(form.estimatedValue),
      appraisalDate: form.appraisalDate || undefined,
      appraisalSource: form.appraisalSource || undefined,
      monthlyRent: parseCurrency(form.monthlyRent),
      hasLien: form.hasLien,
      lienHolder: form.hasLien ? form.lienHolder || undefined : undefined,
      lienAmount: form.hasLien ? parseCurrency(form.lienAmount) : undefined,
      hasJudicialBlock: form.hasJudicialBlock,
      blockDetails: form.hasJudicialBlock ? form.blockDetails || undefined : undefined,
      notes: form.notes || undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any)
    } else {
      createMutation.mutate(payload as any)
    }
  }

  function updateField<K extends keyof UrbanFormData>(key: K, value: UrbanFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ---- Loading ----
  if (propertiesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const properties = propertiesQuery.data ?? []

  const totalValue = properties.reduce(
    (sum: number, p: AnyProperty) => sum + (p.estimatedValue || 0),
    0
  )

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Imoveis Urbanos</h3>
          <p className="text-sm text-muted-foreground">
            {properties.length} {properties.length === 1 ? "imovel" : "imoveis"} cadastrado{properties.length !== 1 ? "s" : ""} — Total estimado: {formatCurrency(totalValue / 100)}
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
        >
          <Plus className="size-4" />
          Novo Imovel
        </Button>
      </div>

      {/* Table */}
      {properties.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Area (m2)</TableHead>
                <TableHead className="text-right">Valor Est.</TableHead>
                <TableHead>Onus</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((item: AnyProperty) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {PROPERTY_TYPE_LABELS[item.propertyType] || item.propertyType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.city}/{item.state}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {item.builtArea != null
                      ? `${Number(item.builtArea).toLocaleString("pt-BR")} m2`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.estimatedValue / 100)}
                  </TableCell>
                  <TableCell>
                    {(item.hasLien || item.hasJudicialBlock) ? (
                      <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                        {formatOnus(item)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        Livre
                      </Badge>
                    )}
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
          <Building2 className="size-12 text-muted-foreground/40 mb-4" />
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhum imovel urbano cadastrado
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione imoveis urbanos ao patrimonio deste cliente.
          </p>
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4" />
            Adicionar Primeiro Imovel
          </Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Imovel Urbano" : "Novo Imovel Urbano"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados do imovel urbano."
                : "Cadastre um novo imovel urbano no patrimonio do cliente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Tipo e Descricao */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Identificacao
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select
                    value={form.propertyType}
                    onValueChange={(v) => updateField("propertyType", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PROPERTY_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="up-matricula">Matricula</Label>
                  <Input
                    id="up-matricula"
                    value={form.registrationNumber}
                    onChange={(e) => updateField("registrationNumber", e.target.value)}
                    placeholder="Numero da matricula"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="up-desc">Descricao *</Label>
                  <Input
                    id="up-desc"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Descricao do imovel"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Endereco */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Endereco
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <Label htmlFor="up-address">Endereco *</Label>
                  <Input
                    id="up-address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Rua, numero, complemento"
                  />
                </div>
                <div>
                  <Label htmlFor="up-cep">CEP</Label>
                  <Input
                    id="up-cep"
                    value={form.cep}
                    onChange={(e) => updateField("cep", e.target.value)}
                    placeholder="00000-000"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="up-bairro">Bairro</Label>
                  <Input
                    id="up-bairro"
                    value={form.neighborhood}
                    onChange={(e) => updateField("neighborhood", e.target.value)}
                    placeholder="Bairro"
                  />
                </div>
                <div>
                  <Label htmlFor="up-city">Cidade *</Label>
                  <Input
                    id="up-city"
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label>UF *</Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => updateField("state", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_OPTIONS.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Areas */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Areas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="up-built-area">Area construida (m2)</Label>
                  <Input
                    id="up-built-area"
                    type="number"
                    step="0.01"
                    value={form.builtArea}
                    onChange={(e) => updateField("builtArea", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="up-land-area">Area terreno (m2)</Label>
                  <Input
                    id="up-land-area"
                    type="number"
                    step="0.01"
                    value={form.landArea}
                    onChange={(e) => updateField("landArea", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Titularidade */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Titularidade
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Titularidade</Label>
                  <Select
                    value={form.ownership}
                    onValueChange={(v) => updateField("ownership", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OWNERSHIP_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.ownership && form.ownership !== "PROPRIO" && (
                  <div>
                    <Label htmlFor="up-owner">Nome proprietario</Label>
                    <Input
                      id="up-owner"
                      value={form.ownerName}
                      onChange={(e) => updateField("ownerName", e.target.value)}
                      placeholder="Nome do proprietario"
                    />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Valor */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Avaliacao
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="up-value">Valor estimado (R$)</Label>
                  <Input
                    id="up-value"
                    value={form.estimatedValue}
                    onChange={(e) => updateField("estimatedValue", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="up-appraisal-date">Data avaliacao</Label>
                  <Input
                    id="up-appraisal-date"
                    type="date"
                    value={form.appraisalDate}
                    onChange={(e) => updateField("appraisalDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="up-source">Fonte</Label>
                  <Input
                    id="up-source"
                    value={form.appraisalSource}
                    onChange={(e) => updateField("appraisalSource", e.target.value)}
                    placeholder="Fonte da avaliacao"
                  />
                </div>
                <div>
                  <Label htmlFor="up-rent">Renda mensal (R$)</Label>
                  <Input
                    id="up-rent"
                    value={form.monthlyRent}
                    onChange={(e) => updateField("monthlyRent", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Onus */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Onus e Restricoes
              </h4>
              <div className="space-y-4">
                {/* Alienacao fiduciaria */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="up-lien"
                      checked={form.hasLien}
                      onCheckedChange={(checked) => updateField("hasLien", !!checked)}
                    />
                    <Label htmlFor="up-lien" className="font-normal cursor-pointer">
                      Alienacao fiduciaria
                    </Label>
                  </div>
                  {form.hasLien && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-6">
                      <div>
                        <Label htmlFor="up-lien-holder">Credor</Label>
                        <Input
                          id="up-lien-holder"
                          value={form.lienHolder}
                          onChange={(e) => updateField("lienHolder", e.target.value)}
                          placeholder="Nome do credor"
                        />
                      </div>
                      <div>
                        <Label htmlFor="up-lien-amount">Valor (R$)</Label>
                        <Input
                          id="up-lien-amount"
                          value={form.lienAmount}
                          onChange={(e) => updateField("lienAmount", e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloqueio judicial */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="up-block"
                      checked={form.hasJudicialBlock}
                      onCheckedChange={(checked) => updateField("hasJudicialBlock", !!checked)}
                    />
                    <Label htmlFor="up-block" className="font-normal cursor-pointer">
                      Bloqueio judicial
                    </Label>
                  </div>
                  {form.hasJudicialBlock && (
                    <div className="ml-6">
                      <Label htmlFor="up-block-details">Detalhes do bloqueio</Label>
                      <Input
                        id="up-block-details"
                        value={form.blockDetails}
                        onChange={(e) => updateField("blockDetails", e.target.value)}
                        placeholder="Processo, vara, detalhes..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Observacoes */}
            <div>
              <Label htmlFor="up-notes">Observacoes</Label>
              <Textarea
                id="up-notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Observacoes adicionais sobre o imovel..."
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
                !form.propertyType ||
                !form.description ||
                !form.address ||
                !form.city ||
                !form.state
              }
              className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "Salvando..."
                : editingId
                  ? "Salvar Alteracoes"
                  : "Adicionar Imovel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
