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
import { Separator } from "@/components/ui/separator"
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Plus, Pencil, Trash2, Truck } from "lucide-react"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  AUTOMOVEL: "Automovel",
  CAMINHONETE: "Caminhonete",
  CAMINHAO: "Caminhao",
  CAMINHAO_PESADO: "Caminhao Pesado",
  VAN_UTILITARIO: "Van/Utilitario",
  MOTOCICLETA: "Motocicleta",
  TRATOR: "Trator",
  COLHEITADEIRA: "Colheitadeira",
  PLANTADEIRA: "Plantadeira",
  PULVERIZADOR: "Pulverizador",
  CARRETA_AGRICOLA: "Carreta Agricola",
  SILO: "Silo",
  SECADOR: "Secador",
  PIVO_IRRIGACAO: "Pivo de Irrigacao",
  GERADOR: "Gerador",
  EQUIPAMENTO_INDUSTRIAL: "Equip. Industrial",
  EQUIPAMENTO_ESCRITORIO: "Equip. Escritorio",
  OUTRO_VEICULO: "Outro",
}

const VEHICLE_GROUPS = [
  {
    key: "rodoviarios" as const,
    title: "Veiculos Rodoviarios",
    categories: [
      "AUTOMOVEL",
      "CAMINHONETE",
      "CAMINHAO",
      "CAMINHAO_PESADO",
      "VAN_UTILITARIO",
      "MOTOCICLETA",
    ],
  },
  {
    key: "agricolas" as const,
    title: "Maquinas Agricolas",
    categories: [
      "TRATOR",
      "COLHEITADEIRA",
      "PLANTADEIRA",
      "PULVERIZADOR",
      "CARRETA_AGRICOLA",
      "SILO",
      "SECADOR",
      "PIVO_IRRIGACAO",
    ],
  },
  {
    key: "equipamentos" as const,
    title: "Equipamentos",
    categories: [
      "GERADOR",
      "EQUIPAMENTO_INDUSTRIAL",
      "EQUIPAMENTO_ESCRITORIO",
      "OUTRO_VEICULO",
    ],
  },
]

const ROAD_VEHICLE_CATEGORIES = new Set([
  "AUTOMOVEL",
  "CAMINHONETE",
  "CAMINHAO",
  "CAMINHAO_PESADO",
  "VAN_UTILITARIO",
  "MOTOCICLETA",
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VehicleFormData {
  category: string
  description: string
  brand: string
  model: string
  year: string
  plate: string
  renavam: string
  chassi: string
  serialNumber: string
  estimatedValue: string
  fipeValue: string
  appraisalDate: string
  hasLien: boolean
  lienHolder: string
  lienAmount: string
  hasJudicialBlock: boolean
  condition: string
  location: string
  notes: string
}

const EMPTY_FORM: VehicleFormData = {
  category: "",
  description: "",
  brand: "",
  model: "",
  year: "",
  plate: "",
  renavam: "",
  chassi: "",
  serialNumber: "",
  estimatedValue: "",
  fipeValue: "",
  appraisalDate: "",
  hasLien: false,
  lienHolder: "",
  lienAmount: "",
  hasJudicialBlock: false,
  condition: "",
  location: "",
  notes: "",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyVehicle = any

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

function parseIntField(value: string): number | undefined {
  if (!value.trim()) return undefined
  const num = parseInt(value, 10)
  return isNaN(num) ? undefined : num
}

function formatOnus(item: AnyVehicle): string {
  const parts: string[] = []
  if (item.hasLien) parts.push("Alienacao")
  if (item.hasJudicialBlock) parts.push("Bloqueio")
  return parts.length > 0 ? parts.join(", ") : "Livre"
}

function isRoadVehicle(category: string): boolean {
  return ROAD_VEHICLE_CATEGORIES.has(category)
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PatrimonyVehiclesTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils()

  // ---- State ----
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<VehicleFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ---- Queries ----
  const vehiclesQuery = trpc.patrimony.vehicles.list.useQuery({ clientId })

  // ---- Mutations ----
  const createMutation = trpc.patrimony.vehicles.create.useMutation({
    onSuccess: () => {
      utils.patrimony.vehicles.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
      closeModal()
    },
  })

  const updateMutation = trpc.patrimony.vehicles.update.useMutation({
    onSuccess: () => {
      utils.patrimony.vehicles.list.invalidate({ clientId })
      utils.patrimony.getSummary.invalidate({ clientId })
      closeModal()
    },
  })

  const deleteMutation = trpc.patrimony.vehicles.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.vehicles.list.invalidate({ clientId })
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

  function handleEdit(item: AnyVehicle) {
    setEditingId(item.id)
    setForm({
      category: item.category || "",
      description: item.description || "",
      brand: item.brand || "",
      model: item.model || "",
      year: item.year != null ? String(item.year) : "",
      plate: item.plate || "",
      renavam: item.renavam || "",
      chassi: item.chassi || "",
      serialNumber: item.serialNumber || "",
      estimatedValue: formatCurrencyInput(item.estimatedValue),
      fipeValue: formatCurrencyInput(item.fipeValue),
      appraisalDate: item.appraisalDate
        ? new Date(item.appraisalDate).toISOString().slice(0, 10)
        : "",
      hasLien: item.hasLien || false,
      lienHolder: item.lienHolder || "",
      lienAmount: formatCurrencyInput(item.lienAmount),
      hasJudicialBlock: item.hasJudicialBlock || false,
      condition: item.condition || "",
      location: item.location || "",
      notes: item.notes || "",
    })
    setModalOpen(true)
  }

  function handleDelete(item: AnyVehicle) {
    if (!window.confirm(`Deseja realmente excluir "${item.description}"?`)) return
    deleteMutation.mutate({ id: item.id })
  }

  function handleSubmit() {
    const payload = {
      clientId,
      category: form.category as any,
      description: form.description,
      brand: form.brand || undefined,
      model: form.model || undefined,
      year: parseIntField(form.year),
      plate: form.plate || undefined,
      renavam: form.renavam || undefined,
      chassi: form.chassi || undefined,
      serialNumber: form.serialNumber || undefined,
      estimatedValue: parseCurrency(form.estimatedValue),
      fipeValue: parseCurrency(form.fipeValue),
      appraisalDate: form.appraisalDate || undefined,
      hasLien: form.hasLien,
      lienHolder: form.hasLien ? form.lienHolder || undefined : undefined,
      lienAmount: form.hasLien ? parseCurrency(form.lienAmount) : undefined,
      hasJudicialBlock: form.hasJudicialBlock,
      condition: form.condition || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload } as any)
    } else {
      createMutation.mutate(payload as any)
    }
  }

  function updateField<K extends keyof VehicleFormData>(key: K, value: VehicleFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ---- Loading ----
  if (vehiclesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-44" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const vehicles = vehiclesQuery.data ?? []

  // Group vehicles by category
  const groupedVehicles = VEHICLE_GROUPS.map((group) => {
    const items = vehicles.filter((v: AnyVehicle) =>
      group.categories.includes(v.category)
    )
    const groupTotal = items.reduce(
      (sum: number, v: AnyVehicle) => sum + (v.estimatedValue || 0),
      0
    )
    return { ...group, items, groupTotal }
  }).filter((g) => g.items.length > 0)

  const grandTotal = vehicles.reduce(
    (sum: number, v: AnyVehicle) => sum + (v.estimatedValue || 0),
    0
  )

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Veiculos e Maquinas</h3>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} {vehicles.length === 1 ? "item" : "itens"} cadastrado{vehicles.length !== 1 ? "s" : ""} — Total estimado: {formatCurrency(grandTotal / 100)}
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
        >
          <Plus className="size-4" />
          Novo Veiculo/Maquina
        </Button>
      </div>

      {/* Grouped Tables */}
      {groupedVehicles.length > 0 ? (
        <>
          {groupedVehicles.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{group.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {group.items.length}
                </Badge>
                <Separator className="flex-1 ml-2" />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Placa/Serie</TableHead>
                      <TableHead className="text-right">Valor Est.</TableHead>
                      <TableHead>Onus</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item: AnyVehicle) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[250px]">{item.description}</span>
                            <span className="text-xs text-muted-foreground">
                              {CATEGORY_LABELS[item.category] || item.category}
                              {item.brand || item.model
                                ? ` — ${[item.brand, item.model].filter(Boolean).join(" ")}`
                                : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.year || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.plate || item.serialNumber || "—"}
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
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-semibold text-right">
                        Subtotal {group.title}:
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(group.groupTotal / 100)}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          ))}

          {/* Grand total */}
          <div className="flex items-center justify-end gap-4 px-4 py-3 border rounded-md bg-muted/50">
            <span className="font-semibold text-sm">Total Geral:</span>
            <span className="font-bold text-lg">
              {formatCurrency(grandTotal / 100)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Truck className="size-12 text-muted-foreground/40 mb-4" />
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhum veiculo ou maquina cadastrado
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione veiculos, maquinas e equipamentos ao patrimonio deste cliente.
          </p>
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4" />
            Adicionar Primeiro Veiculo
          </Button>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal() }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Veiculo/Maquina" : "Novo Veiculo/Maquina"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Atualize os dados do veiculo ou maquina."
                : "Cadastre um novo veiculo, maquina ou equipamento."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Categoria e Descricao */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Identificacao
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => updateField("category", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_GROUPS.map((group) => (
                        <SelectGroup key={group.key}>
                          <SelectLabel>{group.title}</SelectLabel>
                          {group.categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {CATEGORY_LABELS[cat]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="vf-desc">Descricao *</Label>
                  <Input
                    id="vf-desc"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Ex: Toyota Hilux SRX 2023"
                  />
                </div>
                <div>
                  <Label htmlFor="vf-brand">Marca</Label>
                  <Input
                    id="vf-brand"
                    value={form.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder="Marca"
                  />
                </div>
                <div>
                  <Label htmlFor="vf-model">Modelo</Label>
                  <Input
                    id="vf-model"
                    value={form.model}
                    onChange={(e) => updateField("model", e.target.value)}
                    placeholder="Modelo"
                  />
                </div>
                <div>
                  <Label htmlFor="vf-year">Ano</Label>
                  <Input
                    id="vf-year"
                    type="number"
                    value={form.year}
                    onChange={(e) => updateField("year", e.target.value)}
                    placeholder="2024"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Identificacao do veiculo */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                {isRoadVehicle(form.category)
                  ? "Dados do Veiculo"
                  : "Dados da Maquina/Equipamento"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {isRoadVehicle(form.category) ? (
                  <>
                    <div>
                      <Label htmlFor="vf-plate">Placa</Label>
                      <Input
                        id="vf-plate"
                        value={form.plate}
                        onChange={(e) => updateField("plate", e.target.value)}
                        placeholder="ABC-1D23"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vf-renavam">RENAVAM</Label>
                      <Input
                        id="vf-renavam"
                        value={form.renavam}
                        onChange={(e) => updateField("renavam", e.target.value)}
                        placeholder="RENAVAM"
                      />
                    </div>
                    <div>
                      <Label htmlFor="vf-chassi">Chassi</Label>
                      <Input
                        id="vf-chassi"
                        value={form.chassi}
                        onChange={(e) => updateField("chassi", e.target.value)}
                        placeholder="Numero do chassi"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-3">
                    <Label htmlFor="vf-serial">N. Serie</Label>
                    <Input
                      id="vf-serial"
                      value={form.serialNumber}
                      onChange={(e) => updateField("serialNumber", e.target.value)}
                      placeholder="Numero de serie"
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
                  <Label htmlFor="vf-value">Valor estimado (R$)</Label>
                  <Input
                    id="vf-value"
                    value={form.estimatedValue}
                    onChange={(e) => updateField("estimatedValue", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="vf-fipe">Valor FIPE (R$)</Label>
                  <Input
                    id="vf-fipe"
                    value={form.fipeValue}
                    onChange={(e) => updateField("fipeValue", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label htmlFor="vf-appraisal-date">Data avaliacao</Label>
                  <Input
                    id="vf-appraisal-date"
                    type="date"
                    value={form.appraisalDate}
                    onChange={(e) => updateField("appraisalDate", e.target.value)}
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
                {/* Alienacao */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="vf-lien"
                      checked={form.hasLien}
                      onCheckedChange={(checked) => updateField("hasLien", !!checked)}
                    />
                    <Label htmlFor="vf-lien" className="font-normal cursor-pointer">
                      Alienacao fiduciaria
                    </Label>
                  </div>
                  {form.hasLien && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-6">
                      <div>
                        <Label htmlFor="vf-lien-holder">Credor</Label>
                        <Input
                          id="vf-lien-holder"
                          value={form.lienHolder}
                          onChange={(e) => updateField("lienHolder", e.target.value)}
                          placeholder="Nome do credor"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vf-lien-amount">Valor (R$)</Label>
                        <Input
                          id="vf-lien-amount"
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
                      id="vf-block"
                      checked={form.hasJudicialBlock}
                      onCheckedChange={(checked) => updateField("hasJudicialBlock", !!checked)}
                    />
                    <Label htmlFor="vf-block" className="font-normal cursor-pointer">
                      Bloqueio judicial
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Condicao e Localizacao */}
            <div>
              <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
                Situacao
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="vf-condition">Condicao</Label>
                  <Input
                    id="vf-condition"
                    value={form.condition}
                    onChange={(e) => updateField("condition", e.target.value)}
                    placeholder="Ex: Bom estado, Em manutencao..."
                  />
                </div>
                <div>
                  <Label htmlFor="vf-location">Localizacao</Label>
                  <Input
                    id="vf-location"
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="Onde se encontra"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Observacoes */}
            <div>
              <Label htmlFor="vf-notes">Observacoes</Label>
              <Textarea
                id="vf-notes"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Observacoes adicionais..."
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
                !form.category ||
                !form.description
              }
              className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? "Salvando..."
                : editingId
                  ? "Salvar Alteracoes"
                  : "Adicionar Veiculo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
