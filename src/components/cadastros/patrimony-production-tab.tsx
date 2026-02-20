"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatArea } from "./patrimony-tab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Sprout } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CROP_TYPE_LABELS: Record<string, string> = {
  SOJA: "Soja",
  MILHO: "Milho",
  MILHO_SAFRINHA: "Milho Safrinha",
  ALGODAO: "Algodao",
  CAFE: "Cafe",
  CANA_DE_ACUCAR: "Cana-de-Acucar",
  ARROZ: "Arroz",
  FEIJAO: "Feijao",
  TRIGO: "Trigo",
  SORGO: "Sorgo",
  GIRASSOL: "Girassol",
  EUCALIPTO: "Eucalipto",
  PECUARIA_CORTE: "Pecuaria de Corte",
  PECUARIA_LEITE: "Pecuaria de Leite",
  SUINOCULTURA: "Suinocultura",
  AVICULTURA: "Avicultura",
  PISCICULTURA: "Piscicultura",
  FRUTICULTURA: "Fruticultura",
  HORTICULTURA: "Horticultura",
  SILVICULTURA: "Silvicultura",
  OUTRA: "Outra",
};

const CROP_TYPES = Object.keys(CROP_TYPE_LABELS);

const HARVEST_SEASON_LABELS: Record<string, string> = {
  SAFRA: "Safra (Verao)",
  SAFRINHA: "Safrinha (2a Safra)",
  INVERNO: "Inverno",
  PERENE: "Perene",
};

const HARVEST_SEASONS = Object.keys(HARVEST_SEASON_LABELS);

const DEFAULT_HARVEST_YEARS = ["2025/2026", "2024/2025", "2023/2024"];

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

interface ProductionFormData {
  harvestYear: string;
  season: string;
  crop: string;
  customCrop: string;
  ruralPropertyId: string;
  plantedArea: string;
  expectedYield: string;
  yieldUnit: string;
  totalProduction: string;
  averagePrice: string;
  priceUnit: string;
  totalRevenue: string;
  percentageSold: string;
  percentageHedged: string;
  productionCost: string;
  costPerHectare: string;
  hasCPR: boolean;
  cprDetails: string;
  financingSource: string;
  financingAmount: string;
  notes: string;
}

const EMPTY_FORM: ProductionFormData = {
  harvestYear: "",
  season: "",
  crop: "",
  customCrop: "",
  ruralPropertyId: "",
  plantedArea: "",
  expectedYield: "",
  yieldUnit: "sc/ha",
  totalProduction: "",
  averagePrice: "",
  priceUnit: "R$/saca",
  totalRevenue: "",
  percentageSold: "",
  percentageHedged: "",
  productionCost: "",
  costPerHectare: "",
  hasCPR: false,
  cprDetails: "",
  financingSource: "",
  financingAmount: "",
  notes: "",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProduction = any;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reaisTocentavos(reaisStr: string): number | undefined {
  if (!reaisStr || reaisStr.trim() === "") return undefined;
  const num = parseFloat(reaisStr.replace(",", "."));
  if (isNaN(num)) return undefined;
  return Math.round(num * 100);
}

function centavosToReais(centavos: number | null | undefined): string {
  if (centavos == null || centavos === 0) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

function parseOptionalFloat(value: string): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const num = parseFloat(value.replace(",", "."));
  return isNaN(num) ? undefined : num;
}

function autoCalcRevenue(
  totalProduction: string,
  averagePrice: string
): string {
  const prod = parseOptionalFloat(totalProduction);
  const price = parseOptionalFloat(averagePrice);
  if (prod != null && price != null && prod > 0 && price > 0) {
    // averagePrice is in Reais in the form, totalProduction is a quantity
    // totalRevenue = totalProduction * averagePrice (both in Reais)
    return (prod * price).toFixed(2).replace(".", ",");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Production Form Dialog
// ---------------------------------------------------------------------------

function ProductionFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isLoading,
  isEditing,
  ruralProperties,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ProductionFormData;
  setForm: React.Dispatch<React.SetStateAction<ProductionFormData>>;
  onSubmit: () => void;
  isLoading: boolean;
  isEditing: boolean;
  ruralProperties: Array<{ id: string; name: string }>;
}) {
  const updateField = <K extends keyof ProductionFormData>(
    key: K,
    value: ProductionFormData[K]
  ) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-calculate revenue when totalProduction or averagePrice changes
      if (key === "totalProduction" || key === "averagePrice") {
        const newTotalProduction =
          key === "totalProduction" ? (value as string) : prev.totalProduction;
        const newAveragePrice =
          key === "averagePrice" ? (value as string) : prev.averagePrice;
        next.totalRevenue = autoCalcRevenue(newTotalProduction, newAveragePrice);
      }
      return next;
    });
  };

  const canSubmit =
    form.harvestYear.trim() !== "" &&
    form.season !== "" &&
    form.crop !== "" &&
    form.plantedArea.trim() !== "" &&
    (form.crop !== "OUTRA" || form.customCrop.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Producao" : "Nova Producao"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da producao agricola."
              : "Cadastre uma nova producao agricola para este cliente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Safra e Cultura */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Safra e Cultura
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prod-harvest">Safra *</Label>
                <Input
                  id="prod-harvest"
                  value={form.harvestYear}
                  onChange={(e) => updateField("harvestYear", e.target.value)}
                  placeholder="2025/2026"
                />
              </div>
              <div>
                <Label>Periodo *</Label>
                <Select
                  value={form.season}
                  onValueChange={(v) => updateField("season", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {HARVEST_SEASONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {HARVEST_SEASON_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cultura *</Label>
                <Select
                  value={form.crop}
                  onValueChange={(v) => updateField("crop", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a cultura" />
                  </SelectTrigger>
                  <SelectContent>
                    {CROP_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CROP_TYPE_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.crop === "OUTRA" && (
                <div>
                  <Label htmlFor="prod-custom-crop">Especifique a cultura *</Label>
                  <Input
                    id="prod-custom-crop"
                    value={form.customCrop}
                    onChange={(e) => updateField("customCrop", e.target.value)}
                    placeholder="Nome da cultura"
                  />
                </div>
              )}
              <div>
                <Label>Propriedade</Label>
                <Select
                  value={form.ruralPropertyId}
                  onValueChange={(v) =>
                    updateField("ruralPropertyId", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nenhuma (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {ruralProperties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Area e Producao */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Area e Producao
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="prod-area">Area plantada (ha) *</Label>
                <Input
                  id="prod-area"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.plantedArea}
                  onChange={(e) => updateField("plantedArea", e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="prod-yield">Produtividade esperada</Label>
                <Input
                  id="prod-yield"
                  type="number"
                  step="0.01"
                  value={form.expectedYield}
                  onChange={(e) =>
                    updateField("expectedYield", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="prod-yield-unit">Unidade</Label>
                <Input
                  id="prod-yield-unit"
                  value={form.yieldUnit}
                  onChange={(e) => updateField("yieldUnit", e.target.value)}
                  placeholder="sc/ha, ton/ha..."
                />
              </div>
              <div>
                <Label htmlFor="prod-total">Producao total</Label>
                <Input
                  id="prod-total"
                  type="number"
                  step="0.01"
                  value={form.totalProduction}
                  onChange={(e) =>
                    updateField("totalProduction", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="prod-avg-price">Preco medio (R$)</Label>
                <Input
                  id="prod-avg-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.averagePrice}
                  onChange={(e) =>
                    updateField("averagePrice", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="prod-price-unit">Unidade de preco</Label>
                <Input
                  id="prod-price-unit"
                  value={form.priceUnit}
                  onChange={(e) => updateField("priceUnit", e.target.value)}
                  placeholder="R$/saca, R$/ton..."
                />
              </div>
            </div>
          </div>

          {/* Receita e Comercializacao */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Receita e Comercializacao
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="prod-revenue">Receita estimada (R$)</Label>
                <Input
                  id="prod-revenue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.totalRevenue}
                  onChange={(e) =>
                    updateField("totalRevenue", e.target.value)
                  }
                  placeholder="Auto-calculado"
                />
                {form.totalProduction &&
                  form.averagePrice &&
                  autoCalcRevenue(form.totalProduction, form.averagePrice) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Calculado: {form.totalProduction} x R${" "}
                      {form.averagePrice}
                    </p>
                  )}
              </div>
              <div>
                <Label htmlFor="prod-sold">% Comercializado</Label>
                <Input
                  id="prod-sold"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.percentageSold}
                  onChange={(e) =>
                    updateField("percentageSold", e.target.value)
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="prod-hedge">% Hedge</Label>
                <Input
                  id="prod-hedge"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.percentageHedged}
                  onChange={(e) =>
                    updateField("percentageHedged", e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Custos */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              Custos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="prod-cost">Custo total (R$)</Label>
                <Input
                  id="prod-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.productionCost}
                  onChange={(e) =>
                    updateField("productionCost", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="prod-cost-ha">Custo/ha (R$)</Label>
                <Input
                  id="prod-cost-ha"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPerHectare}
                  onChange={(e) =>
                    updateField("costPerHectare", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          {/* CPR e Financiamento */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-[#C9A961]">
              CPR e Financiamento
            </h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="prod-cpr"
                  checked={form.hasCPR}
                  onCheckedChange={(checked) =>
                    updateField("hasCPR", !!checked)
                  }
                />
                <Label htmlFor="prod-cpr" className="font-normal cursor-pointer">
                  Tem CPR
                </Label>
              </div>
              {form.hasCPR && (
                <div>
                  <Label htmlFor="prod-cpr-details">Detalhes da CPR</Label>
                  <Textarea
                    id="prod-cpr-details"
                    value={form.cprDetails}
                    onChange={(e) =>
                      updateField("cprDetails", e.target.value)
                    }
                    placeholder="Numero, credor, valor, vencimento..."
                    rows={2}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prod-fin-source">Fonte de financiamento</Label>
                  <Input
                    id="prod-fin-source"
                    value={form.financingSource}
                    onChange={(e) =>
                      updateField("financingSource", e.target.value)
                    }
                    placeholder="Banco, cooperativa..."
                  />
                </div>
                <div>
                  <Label htmlFor="prod-fin-amount">
                    Valor do financiamento (R$)
                  </Label>
                  <Input
                    id="prod-fin-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.financingAmount}
                    onChange={(e) =>
                      updateField("financingAmount", e.target.value)
                    }
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Observacoes */}
          <div>
            <Label htmlFor="prod-notes">Observacoes</Label>
            <Textarea
              id="prod-notes"
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Observacoes adicionais..."
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
            disabled={isLoading || !canSubmit}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            {isLoading
              ? "Salvando..."
              : isEditing
                ? "Salvar Alteracoes"
                : "Criar Producao"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Dialog
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  open,
  onOpenChange,
  production,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  production: AnyProduction | null;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const cropLabel =
    production?.crop && CROP_TYPE_LABELS[production.crop]
      ? CROP_TYPE_LABELS[production.crop]
      : production?.customCrop ?? "esta producao";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Exclusao</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir a producao de{" "}
            <strong>{cropLabel}</strong> ({production?.harvestYear})?
            Esta acao nao pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PatrimonyProductionTab({ clientId }: { clientId: string }) {
  const utils = trpc.useUtils();

  // ---- State ----
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<ProductionFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProduction, setSelectedProduction] =
    useState<AnyProduction | null>(null);

  // ---- Queries ----
  const productionsQuery = trpc.patrimony.productions.list.useQuery({
    clientId,
    harvestYear: selectedYear || undefined,
  });

  const ruralPropertiesQuery = trpc.patrimony.ruralProperties.list.useQuery({
    clientId,
  });

  // ---- Mutations ----
  const createMutation = trpc.patrimony.productions.create.useMutation({
    onSuccess: () => {
      utils.patrimony.productions.list.invalidate({ clientId });
      setFormOpen(false);
      resetForm();
    },
  });

  const updateMutation = trpc.patrimony.productions.update.useMutation({
    onSuccess: () => {
      utils.patrimony.productions.list.invalidate({ clientId });
      setFormOpen(false);
      resetForm();
    },
  });

  const deleteMutation = trpc.patrimony.productions.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.productions.list.invalidate({ clientId });
      setDeleteOpen(false);
      setSelectedProduction(null);
    },
  });

  // ---- Derived data ----
  const productions = productionsQuery.data ?? [];
  const ruralProperties = (ruralPropertiesQuery.data ?? []).map((p: AnyProduction) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  // Extract unique harvest years from data + defaults
  const harvestYears: string[] = Array.from(
    new Set([
      ...DEFAULT_HARVEST_YEARS,
      ...productions.map((p: AnyProduction) => p.harvestYear as string),
    ])
  ).sort((a, b) => b.localeCompare(a));

  // Totals
  const totalArea = productions.reduce(
    (sum: number, p: AnyProduction) => sum + (p.plantedArea ?? 0),
    0
  );
  const totalRevenue = productions.reduce(
    (sum: number, p: AnyProduction) => sum + (p.totalRevenue ?? 0),
    0
  );
  const totalCost = productions.reduce(
    (sum: number, p: AnyProduction) => sum + (p.productionCost ?? 0),
    0
  );

  // ---- Handlers ----

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function handleNew() {
    resetForm();
    setFormOpen(true);
  }

  function handleEdit(production: AnyProduction) {
    setEditingId(production.id);
    setForm({
      harvestYear: production.harvestYear ?? "",
      season: production.season ?? "",
      crop: production.crop ?? "",
      customCrop: production.customCrop ?? "",
      ruralPropertyId: production.ruralPropertyId ?? "",
      plantedArea: production.plantedArea != null ? String(production.plantedArea) : "",
      expectedYield:
        production.expectedYield != null ? String(production.expectedYield) : "",
      yieldUnit: production.yieldUnit ?? "sc/ha",
      totalProduction:
        production.totalProduction != null
          ? String(production.totalProduction)
          : "",
      averagePrice: centavosToReais(production.averagePrice),
      priceUnit: production.priceUnit ?? "R$/saca",
      totalRevenue: centavosToReais(production.totalRevenue),
      percentageSold:
        production.percentageSold != null
          ? String(production.percentageSold)
          : "",
      percentageHedged:
        production.percentageHedged != null
          ? String(production.percentageHedged)
          : "",
      productionCost: centavosToReais(production.productionCost),
      costPerHectare: centavosToReais(production.costPerHectare),
      hasCPR: production.hasCPR ?? false,
      cprDetails: production.cprDetails ?? "",
      financingSource: production.financingSource ?? "",
      financingAmount: centavosToReais(production.financingAmount),
      notes: production.notes ?? "",
    });
    setFormOpen(true);
  }

  function handleDelete(production: AnyProduction) {
    setSelectedProduction(production);
    setDeleteOpen(true);
  }

  function handleFormSubmit() {
    const payload = {
      clientId,
      ruralPropertyId: form.ruralPropertyId || null,
      harvestYear: form.harvestYear,
      season: form.season,
      crop: form.crop,
      customCrop: form.crop === "OUTRA" ? form.customCrop || undefined : undefined,
      plantedArea: parseFloat(form.plantedArea) || 0,
      expectedYield: parseOptionalFloat(form.expectedYield),
      yieldUnit: form.yieldUnit || undefined,
      totalProduction: parseOptionalFloat(form.totalProduction),
      averagePrice: reaisTocentavos(form.averagePrice),
      priceUnit: form.priceUnit || undefined,
      totalRevenue: reaisTocentavos(form.totalRevenue),
      percentageSold: parseOptionalFloat(form.percentageSold),
      percentageHedged: parseOptionalFloat(form.percentageHedged),
      productionCost: reaisTocentavos(form.productionCost),
      costPerHectare: reaisTocentavos(form.costPerHectare),
      hasCPR: form.hasCPR,
      cprDetails: form.hasCPR ? form.cprDetails || undefined : undefined,
      financingSource: form.financingSource || undefined,
      financingAmount: reaisTocentavos(form.financingAmount),
      notes: form.notes || undefined,
    };

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        ...payload,
      } as never);
    } else {
      createMutation.mutate(payload as never);
    }
  }

  function handleConfirmDelete() {
    if (!selectedProduction) return;
    deleteMutation.mutate({ id: selectedProduction.id });
  }

  // ---- Loading ----
  if (productionsQuery.isLoading) {
    return <LoadingSkeleton />;
  }

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Header: year filter + new button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Producao Agricola</h3>
          <Select
            value={selectedYear}
            onValueChange={(v) =>
              setSelectedYear(v === "__all__" ? "" : v)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas as safras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as safras</SelectItem>
              {harvestYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleNew}
          className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
        >
          <Plus className="size-4" />
          Nova Producao
        </Button>
      </div>

      {/* Table */}
      {productions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sprout className="size-12 text-muted-foreground/40 mb-4" />
          <h4 className="font-semibold text-muted-foreground mb-1">
            Nenhuma producao cadastrada
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione producoes agricolas para acompanhar safras, culturas e resultados
            financeiros.
          </p>
          <Button
            onClick={handleNew}
            className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
          >
            <Plus className="size-4" />
            Adicionar Primeira Producao
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cultura</TableHead>
                <TableHead>Fazenda</TableHead>
                <TableHead className="text-right">Area (ha)</TableHead>
                <TableHead className="text-right">Prod. Estimada</TableHead>
                <TableHead className="text-right">Receita Est.</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productions.map((prod: AnyProduction) => {
                const cropLabel =
                  prod.crop === "OUTRA" && prod.customCrop
                    ? prod.customCrop
                    : CROP_TYPE_LABELS[prod.crop] ?? prod.crop;
                const seasonLabel =
                  HARVEST_SEASON_LABELS[prod.season] ?? prod.season;
                const farmName = prod.ruralProperty?.name ?? "\u2014";

                return (
                  <TableRow key={prod.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{cropLabel}</span>
                        <div className="text-xs text-muted-foreground">
                          {prod.harvestYear} - {seasonLabel}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {farmName}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatArea(prod.plantedArea)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {prod.totalProduction != null
                        ? `${prod.totalProduction.toLocaleString("pt-BR")} ${prod.yieldUnit ? prod.yieldUnit.replace("/ha", "") : ""}`
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prod.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(prod.productionCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleEdit(prod)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(prod)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">
                  Totais ({productions.length}{" "}
                  {productions.length === 1 ? "producao" : "producoes"})
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatArea(totalArea)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totalRevenue)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totalCost)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <ProductionFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEditing={!!editingId}
        ruralProperties={ruralProperties}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedProduction(null);
        }}
        production={selectedProduction}
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
