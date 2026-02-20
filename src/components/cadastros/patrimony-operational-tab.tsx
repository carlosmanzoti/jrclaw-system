"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { formatCurrency, formatArea } from "./patrimony-tab"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  MapPin,
  Truck,
  Building2,
  DollarSign,
  Wheat,
  Award,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────

interface OperationalFormData {
  year: number | ""
  totalEmployees: string
  cltEmployees: string
  temporaryWorkers: string
  monthlyPayroll: string
  annualPayroll: string
  totalManagedArea: string
  ownedArea: string
  leasedArea: string
  storageCapacity: string
  cattleHeadCount: string
  vehicleCount: string
  machineCount: string
  truckCount: string
  operationalUnits: string
  states: string
  certifications: string
  notes: string
}

const EMPTY_FORM: OperationalFormData = {
  year: "",
  totalEmployees: "",
  cltEmployees: "",
  temporaryWorkers: "",
  monthlyPayroll: "",
  annualPayroll: "",
  totalManagedArea: "",
  ownedArea: "",
  leasedArea: "",
  storageCapacity: "",
  cattleHeadCount: "",
  vehicleCount: "",
  machineCount: "",
  truckCount: "",
  operationalUnits: "",
  states: "",
  certifications: "",
  notes: "",
}

// ─── Helpers ─────────────────────────────────────────────

/** Convert centavos (API) to display value in Reais */
function centsToReais(cents: number): string {
  if (!cents) return ""
  return (cents / 100).toFixed(2)
}

/** Convert user input (Reais) to centavos for API */
function reaisToCents(reais: string): number | undefined {
  if (!reais || reais.trim() === "") return undefined
  const val = parseFloat(reais)
  if (isNaN(val)) return undefined
  return Math.round(val * 100)
}

function toIntOrUndefined(val: string): number | undefined {
  if (!val || val.trim() === "") return undefined
  const n = parseInt(val)
  return isNaN(n) ? undefined : n
}

function toFloatOrUndefined(val: string): number | undefined {
  if (!val || val.trim() === "") return undefined
  const n = parseFloat(val)
  return isNaN(n) ? undefined : n
}

function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return "--"
  return val.toLocaleString("pt-BR")
}

// ─── Stat Card ───────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  suffix,
}: {
  label: string
  value: string
  icon?: React.ElementType
  suffix?: string
}) {
  return (
    <Card className="py-3">
      <CardContent className="flex items-center gap-3">
        {Icon && (
          <div className="flex items-center justify-center size-10 rounded-lg bg-[#C9A961]/10 text-[#C9A961] shrink-0">
            <Icon className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold tabular-nums truncate">
            {value}
            {suffix && (
              <span className="text-sm font-normal text-muted-foreground ml-1">
                {suffix}
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Operational Form Dialog ─────────────────────────────

function OperationalFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isLoading,
  isEditing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: OperationalFormData
  setForm: React.Dispatch<React.SetStateAction<OperationalFormData>>
  onSubmit: () => void
  isLoading: boolean
  isEditing: boolean
}) {
  const updateField = <K extends keyof OperationalFormData>(
    key: K,
    value: OperationalFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Dados Operacionais" : "Novo Ano Operacional"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Year */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Periodo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="op-year">Ano *</Label>
                <Input
                  id="op-year"
                  type="number"
                  value={form.year}
                  onChange={(e) =>
                    updateField("year", e.target.value ? parseInt(e.target.value) : "")
                  }
                  placeholder="2024"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Employees */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Funcionarios</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="op-totalEmployees">Total</Label>
                <Input
                  id="op-totalEmployees"
                  type="number"
                  value={form.totalEmployees}
                  onChange={(e) => updateField("totalEmployees", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="op-cltEmployees">CLT</Label>
                <Input
                  id="op-cltEmployees"
                  type="number"
                  value={form.cltEmployees}
                  onChange={(e) => updateField("cltEmployees", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="op-temporaryWorkers">Temporarios</Label>
                <Input
                  id="op-temporaryWorkers"
                  type="number"
                  value={form.temporaryWorkers}
                  onChange={(e) => updateField("temporaryWorkers", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Payroll */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Folha de Pagamento (R$)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="op-monthlyPayroll">Folha Mensal</Label>
                <Input
                  id="op-monthlyPayroll"
                  type="number"
                  step="0.01"
                  value={form.monthlyPayroll}
                  onChange={(e) => updateField("monthlyPayroll", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="op-annualPayroll">Folha Anual</Label>
                <Input
                  id="op-annualPayroll"
                  type="number"
                  step="0.01"
                  value={form.annualPayroll}
                  onChange={(e) => updateField("annualPayroll", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Areas */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Areas (ha)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="op-totalManagedArea">Total sob Gestao</Label>
                <Input
                  id="op-totalManagedArea"
                  type="number"
                  step="0.01"
                  value={form.totalManagedArea}
                  onChange={(e) => updateField("totalManagedArea", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="op-ownedArea">Propria</Label>
                <Input
                  id="op-ownedArea"
                  type="number"
                  step="0.01"
                  value={form.ownedArea}
                  onChange={(e) => updateField("ownedArea", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="op-leasedArea">Arrendada</Label>
                <Input
                  id="op-leasedArea"
                  type="number"
                  step="0.01"
                  value={form.leasedArea}
                  onChange={(e) => updateField("leasedArea", e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Storage & Cattle */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Armazenagem e Rebanho</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="op-storageCapacity">Armazenagem (ton)</Label>
                <Input
                  id="op-storageCapacity"
                  type="number"
                  step="0.01"
                  value={form.storageCapacity}
                  onChange={(e) => updateField("storageCapacity", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="op-cattleHeadCount">Rebanho (cabecas)</Label>
                <Input
                  id="op-cattleHeadCount"
                  type="number"
                  value={form.cattleHeadCount}
                  onChange={(e) => updateField("cattleHeadCount", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Fleet */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Frotas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="op-vehicleCount">Veiculos</Label>
                <Input
                  id="op-vehicleCount"
                  type="number"
                  value={form.vehicleCount}
                  onChange={(e) => updateField("vehicleCount", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="op-machineCount">Maquinas</Label>
                <Input
                  id="op-machineCount"
                  type="number"
                  value={form.machineCount}
                  onChange={(e) => updateField("machineCount", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="op-truckCount">Caminhoes</Label>
                <Input
                  id="op-truckCount"
                  type="number"
                  value={form.truckCount}
                  onChange={(e) => updateField("truckCount", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Operations */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">Operacoes</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="op-operationalUnits">Unidades Operacionais</Label>
                <Input
                  id="op-operationalUnits"
                  type="number"
                  value={form.operationalUnits}
                  onChange={(e) => updateField("operationalUnits", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="op-states">Estados de Atuacao</Label>
                <Input
                  id="op-states"
                  value={form.states}
                  onChange={(e) => updateField("states", e.target.value)}
                  placeholder="PR, MA, MT..."
                />
              </div>
              <div>
                <Label htmlFor="op-certifications">Certificacoes</Label>
                <Input
                  id="op-certifications"
                  value={form.certifications}
                  onChange={(e) => updateField("certifications", e.target.value)}
                  placeholder="ISO 9001, RenovaBio..."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <Label htmlFor="op-notes">Observacoes</Label>
            <Textarea
              id="op-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observacoes sobre os dados operacionais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isLoading || !form.year}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            {isLoading
              ? "Salvando..."
              : isEditing
                ? "Salvar Alteracoes"
                : "Criar Ano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────

export function PatrimonyOperationalTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils()

  // ---- State ----
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<OperationalFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  // ---- Queries ----
  const operationalQuery = trpc.patrimony.operational.list.useQuery({ clientId })
  const records = operationalQuery.data ?? []

  // Set default selected year to latest
  const years = records.map((r) => r.year).sort((a, b) => b - a)
  const effectiveYear = selectedYear ?? (years.length > 0 ? years[0] : null)

  const selectedData = effectiveYear
    ? records.find((r) => r.year === effectiveYear)
    : null

  // ---- Mutations ----
  const createMutation = trpc.patrimony.operational.create.useMutation({
    onSuccess: () => {
      utils.patrimony.operational.list.invalidate({ clientId })
      setFormOpen(false)
      resetForm()
    },
  })

  const updateMutation = trpc.patrimony.operational.update.useMutation({
    onSuccess: () => {
      utils.patrimony.operational.list.invalidate({ clientId })
      setFormOpen(false)
      resetForm()
    },
  })

  const deleteMutation = trpc.patrimony.operational.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.operational.list.invalidate({ clientId })
      setSelectedYear(null)
    },
  })

  // ---- Handlers ----
  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function handleNew() {
    resetForm()
    setFormOpen(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEdit(record: any) {
    setEditingId(record.id)
    setForm({
      year: record.year,
      totalEmployees: record.totalEmployees != null ? String(record.totalEmployees) : "",
      cltEmployees: record.cltEmployees != null ? String(record.cltEmployees) : "",
      temporaryWorkers: record.temporaryWorkers != null ? String(record.temporaryWorkers) : "",
      monthlyPayroll: centsToReais(record.monthlyPayroll),
      annualPayroll: centsToReais(record.annualPayroll),
      totalManagedArea: record.totalManagedArea != null ? String(record.totalManagedArea) : "",
      ownedArea: record.ownedArea != null ? String(record.ownedArea) : "",
      leasedArea: record.leasedArea != null ? String(record.leasedArea) : "",
      storageCapacity: record.storageCapacity != null ? String(record.storageCapacity) : "",
      cattleHeadCount: record.cattleHeadCount != null ? String(record.cattleHeadCount) : "",
      vehicleCount: record.vehicleCount != null ? String(record.vehicleCount) : "",
      machineCount: record.machineCount != null ? String(record.machineCount) : "",
      truckCount: record.truckCount != null ? String(record.truckCount) : "",
      operationalUnits: record.operationalUnits != null ? String(record.operationalUnits) : "",
      states: record.states || "",
      certifications: record.certifications || "",
      notes: record.notes || "",
    })
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este ano operacional?")) return
    deleteMutation.mutate({ id })
  }

  function handleFormSubmit() {
    const payload = {
      clientId,
      year: form.year as number,
      totalEmployees: toIntOrUndefined(form.totalEmployees),
      cltEmployees: toIntOrUndefined(form.cltEmployees),
      temporaryWorkers: toIntOrUndefined(form.temporaryWorkers),
      monthlyPayroll: reaisToCents(form.monthlyPayroll),
      annualPayroll: reaisToCents(form.annualPayroll),
      totalManagedArea: toFloatOrUndefined(form.totalManagedArea),
      ownedArea: toFloatOrUndefined(form.ownedArea),
      leasedArea: toFloatOrUndefined(form.leasedArea),
      storageCapacity: toFloatOrUndefined(form.storageCapacity),
      cattleHeadCount: toIntOrUndefined(form.cattleHeadCount),
      vehicleCount: toIntOrUndefined(form.vehicleCount),
      machineCount: toIntOrUndefined(form.machineCount),
      truckCount: toIntOrUndefined(form.truckCount),
      operationalUnits: toIntOrUndefined(form.operationalUnits),
      states: form.states || undefined,
      certifications: form.certifications || undefined,
      notes: form.notes || undefined,
    }

    if (editingId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      updateMutation.mutate({ id: editingId, ...payload } as any)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMutation.mutate(payload as any)
    }
  }

  // ---- Loading ----
  if (operationalQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header with year selector and actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Operacional</h3>
          {years.length > 0 && (
            <Select
              value={effectiveYear ? String(effectiveYear) : ""}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedData && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(selectedData)}
              >
                <Pencil className="size-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(selectedData.id)}
              >
                <Trash2 className="size-4 mr-1" />
                Excluir
              </Button>
            </>
          )}
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4 mr-1" />
            Novo Ano
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {records.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhum dado operacional cadastrado
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione dados operacionais para visualizar funcionarios, areas, frotas e mais.
          </p>
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4 mr-1" />
            Adicionar Primeiro Ano
          </Button>
        </div>
      )}

      {/* Stat Cards */}
      {selectedData && (
        <div className="space-y-4">
          {/* Row 1: Employees */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Funcionarios"
              value={formatNumber(selectedData.totalEmployees)}
              icon={Users}
            />
            <StatCard
              label="CLT"
              value={formatNumber(selectedData.cltEmployees)}
              icon={Users}
            />
            <StatCard
              label="Temporarios"
              value={formatNumber(selectedData.temporaryWorkers)}
              icon={Users}
            />
            <StatCard
              label="Folha Mensal"
              value={formatCurrency(selectedData.monthlyPayroll)}
              icon={DollarSign}
            />
          </div>

          {/* Row 2: Areas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Area Total"
              value={selectedData.totalManagedArea != null ? formatArea(selectedData.totalManagedArea) : "--"}
              icon={MapPin}
              suffix="ha"
            />
            <StatCard
              label="Propria"
              value={selectedData.ownedArea != null ? formatArea(selectedData.ownedArea) : "--"}
              icon={MapPin}
              suffix="ha"
            />
            <StatCard
              label="Arrendada"
              value={selectedData.leasedArea != null ? formatArea(selectedData.leasedArea) : "--"}
              icon={MapPin}
              suffix="ha"
            />
            <StatCard
              label="Armazenagem"
              value={selectedData.storageCapacity != null ? formatNumber(selectedData.storageCapacity) : "--"}
              icon={Wheat}
              suffix="ton"
            />
          </div>

          {/* Row 3: Fleet */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Veiculos"
              value={formatNumber(selectedData.vehicleCount)}
              icon={Truck}
            />
            <StatCard
              label="Maquinas"
              value={formatNumber(selectedData.machineCount)}
              icon={Truck}
            />
            <StatCard
              label="Caminhoes"
              value={formatNumber(selectedData.truckCount)}
              icon={Truck}
            />
            <StatCard
              label="Unidades Operacionais"
              value={formatNumber(selectedData.operationalUnits)}
              icon={Building2}
            />
          </div>

          {/* States and Certifications */}
          {(selectedData.states || selectedData.certifications) && (
            <Card className="py-4">
              <CardContent className="space-y-4">
                {selectedData.states && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Estados de Atuacao</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedData.states
                        .split(",")
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                        .map((state: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            <MapPin className="size-3 mr-1" />
                            {state}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                {selectedData.certifications && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Certificacoes</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedData.certifications
                        .split(",")
                        .map((c: string) => c.trim())
                        .filter(Boolean)
                        .map((cert: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs border-[#C9A961]/50 text-[#C9A961]"
                          >
                            <Award className="size-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {selectedData.notes && (
            <Card className="py-4">
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">Observacoes</p>
                <p className="text-sm whitespace-pre-wrap">{selectedData.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <OperationalFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) resetForm()
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEditing={!!editingId}
      />
    </div>
  )
}
