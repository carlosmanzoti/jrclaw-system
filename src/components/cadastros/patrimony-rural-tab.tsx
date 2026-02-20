"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "./patrimony-tab";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trees,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Helpers ────────────────────────────────────────────────

export function formatArea(value: number | null | undefined): string {
  if (value == null || value === 0) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ha`;
}

/**
 * Converts centavos (integer) to Reais string for display in form inputs.
 * E.g. 360000000 (centavos) -> "3600000" (Reais)
 */
function centavosToReais(value: number | null | undefined): string {
  if (value == null || value === 0) return "";
  return String(value / 100);
}

/**
 * Converts a Reais string input to centavos for the API.
 * E.g. "3600000" (Reais) -> 360000000 (centavos)
 */
function reaisToCentavos(value: string): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  return Math.round(num * 100);
}

function parseFloatSafe(value: string): number | undefined {
  if (!value || value.trim() === "") return undefined;
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  return num;
}

// ─── Constants ──────────────────────────────────────────────

const BRAZILIAN_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const OWNERSHIP_OPTIONS = [
  { value: "PROPRIO", label: "Proprio" },
  { value: "ARRENDADO", label: "Arrendado" },
  { value: "PARCERIA", label: "Parceria" },
  { value: "COMODATO", label: "Comodato" },
  { value: "POSSE", label: "Posse" },
  { value: "CONDOMINIO", label: "Condominio" },
] as const;

type FormState = {
  name: string;
  registrationNumber: string;
  carCode: string;
  incraCode: string;
  nirf: string;
  address: string;
  city: string;
  state: string;
  comarca: string;
  latitude: string;
  longitude: string;
  totalArea: string;
  productiveArea: string;
  pastureland: string;
  nativeVegetation: string;
  forestArea: string;
  improvementArea: string;
  irrigatedArea: string;
  ownership: string;
  ownerName: string;
  ownerDocument: string;
  contractEndDate: string;
  annualRent: string;
  estimatedValue: string;
  appraisalDate: string;
  appraisalSource: string;
  hasLien: boolean;
  lienHolder: string;
  lienAmount: string;
  hasJudicialBlock: boolean;
  blockDetails: string;
  hasEnvironmentalIssue: boolean;
  environmentalNotes: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  registrationNumber: "",
  carCode: "",
  incraCode: "",
  nirf: "",
  address: "",
  city: "",
  state: "",
  comarca: "",
  latitude: "",
  longitude: "",
  totalArea: "",
  productiveArea: "",
  pastureland: "",
  nativeVegetation: "",
  forestArea: "",
  improvementArea: "",
  irrigatedArea: "",
  ownership: "PROPRIO",
  ownerName: "",
  ownerDocument: "",
  contractEndDate: "",
  annualRent: "",
  estimatedValue: "",
  appraisalDate: "",
  appraisalSource: "",
  hasLien: false,
  lienHolder: "",
  lienAmount: "",
  hasJudicialBlock: false,
  blockDetails: "",
  hasEnvironmentalIssue: false,
  environmentalNotes: "",
  notes: "",
};

// ─── Collapsible Section ────────────────────────────────────

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-left bg-muted/50 hover:bg-muted/80 rounded-t-md transition-colors"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        {title}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Onus Badge ─────────────────────────────────────────────

function OnusBadge({
  item,
}: {
  item: {
    hasLien: boolean;
    lienHolder: string | null;
    lienAmount: number;
    hasJudicialBlock: boolean;
    ownership: string;
  };
}) {
  const parts: React.ReactNode[] = [];

  if (item.hasLien) {
    parts.push(
      <span
        key="lien"
        className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium"
      >
        <AlertTriangle className="size-3" />
        {item.lienHolder || "Alienacao"}{" "}
        {item.lienAmount ? formatCurrency(item.lienAmount / 100) : ""}
      </span>
    );
  }

  if (item.hasJudicialBlock) {
    parts.push(
      <span
        key="block"
        className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs font-medium"
      >
        <Scale className="size-3" />
        Bloqueio judicial
      </span>
    );
  }

  if (item.ownership === "ARRENDADO") {
    parts.push(
      <span
        key="lease"
        className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium"
      >
        Arrendada
      </span>
    );
  }

  if (parts.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium">
        <CheckCircle2 className="size-3" />
        Livre
      </span>
    );
  }

  return <div className="flex flex-col gap-1">{parts}</div>;
}

// ─── Main Component ─────────────────────────────────────────

export default function PatrimonyRuralTab({
  clientId,
}: {
  clientId: string;
}) {
  const [showModal, setShowModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [expandedSections, setExpandedSections] = useState({
    identification: true,
    location: true,
    areas: true,
    ownership: true,
    value: true,
    encumbrances: true,
    notes: true,
  });

  const utils = trpc.useUtils();

  // ── Queries ─────────────────────────────────────────────
  const {
    data: properties,
    isLoading,
  } = trpc.patrimony.ruralProperties.list.useQuery({ clientId });

  // ── Mutations ───────────────────────────────────────────
  const createMutation = trpc.patrimony.ruralProperties.create.useMutation({
    onSuccess: () => {
      utils.patrimony.ruralProperties.list.invalidate({ clientId });
      utils.patrimony.getSummary.invalidate({ clientId });
      closeModal();
    },
  });

  const updateMutation = trpc.patrimony.ruralProperties.update.useMutation({
    onSuccess: () => {
      utils.patrimony.ruralProperties.list.invalidate({ clientId });
      utils.patrimony.getSummary.invalidate({ clientId });
      closeModal();
    },
  });

  const deleteMutation = trpc.patrimony.ruralProperties.delete_.useMutation({
    onSuccess: () => {
      utils.patrimony.ruralProperties.list.invalidate({ clientId });
      utils.patrimony.getSummary.invalidate({ clientId });
    },
  });

  // ── Form helpers ────────────────────────────────────────
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openEdit(item: any) {
    setEditing(item);
    setForm({
      name: item.name || "",
      registrationNumber: item.registrationNumber || "",
      carCode: item.carCode || "",
      incraCode: item.incraCode || "",
      nirf: item.nirf || "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
      comarca: item.comarca || "",
      latitude: item.latitude != null ? String(item.latitude) : "",
      longitude: item.longitude != null ? String(item.longitude) : "",
      totalArea: item.totalArea != null ? String(item.totalArea) : "",
      productiveArea:
        item.productiveArea != null ? String(item.productiveArea) : "",
      pastureland: item.pastureland != null ? String(item.pastureland) : "",
      nativeVegetation:
        item.nativeVegetation != null ? String(item.nativeVegetation) : "",
      forestArea: item.forestArea != null ? String(item.forestArea) : "",
      improvementArea:
        item.improvementArea != null ? String(item.improvementArea) : "",
      irrigatedArea:
        item.irrigatedArea != null ? String(item.irrigatedArea) : "",
      ownership: item.ownership || "PROPRIO",
      ownerName: item.ownerName || "",
      ownerDocument: item.ownerDocument || "",
      contractEndDate: item.contractEndDate
        ? new Date(item.contractEndDate).toISOString().split("T")[0]
        : "",
      annualRent: centavosToReais(item.annualRent),
      estimatedValue: centavosToReais(item.estimatedValue),
      appraisalDate: item.appraisalDate
        ? new Date(item.appraisalDate).toISOString().split("T")[0]
        : "",
      appraisalSource: item.appraisalSource || "",
      hasLien: item.hasLien || false,
      lienHolder: item.lienHolder || "",
      lienAmount: centavosToReais(item.lienAmount),
      hasJudicialBlock: item.hasJudicialBlock || false,
      blockDetails: item.blockDetails || "",
      hasEnvironmentalIssue: item.hasEnvironmentalIssue || false,
      environmentalNotes: item.environmentalNotes || "",
      notes: item.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(INITIAL_FORM);
  }

  function handleSave() {
    const totalArea = parseFloatSafe(form.totalArea);
    const estimatedValueCentavos = reaisToCentavos(form.estimatedValue);

    // Calculate value per hectare
    let valuePerHectare: number | undefined = undefined;
    if (estimatedValueCentavos && totalArea && totalArea > 0) {
      valuePerHectare = Math.round(estimatedValueCentavos / totalArea);
    }

    const payload = {
      name: form.name,
      registrationNumber: form.registrationNumber || undefined,
      carCode: form.carCode || undefined,
      incraCode: form.incraCode || undefined,
      nirf: form.nirf || undefined,
      address: form.address || undefined,
      city: form.city,
      state: form.state,
      comarca: form.comarca || undefined,
      latitude: parseFloatSafe(form.latitude),
      longitude: parseFloatSafe(form.longitude),
      totalArea: totalArea ?? 0,
      productiveArea: parseFloatSafe(form.productiveArea),
      pastureland: parseFloatSafe(form.pastureland),
      nativeVegetation: parseFloatSafe(form.nativeVegetation),
      forestArea: parseFloatSafe(form.forestArea),
      improvementArea: parseFloatSafe(form.improvementArea),
      irrigatedArea: parseFloatSafe(form.irrigatedArea),
      ownership: form.ownership as
        | "PROPRIO"
        | "ARRENDADO"
        | "PARCERIA"
        | "COMODATO"
        | "POSSE"
        | "CONDOMINIO",
      ownerName: form.ownerName || undefined,
      ownerDocument: form.ownerDocument || undefined,
      contractEndDate: form.contractEndDate || null,
      annualRent: reaisToCentavos(form.annualRent),
      estimatedValue: estimatedValueCentavos,
      valuePerHectare,
      appraisalDate: form.appraisalDate || null,
      appraisalSource: form.appraisalSource || undefined,
      hasLien: form.hasLien,
      lienHolder: form.hasLien ? form.lienHolder || undefined : undefined,
      lienAmount: form.hasLien
        ? reaisToCentavos(form.lienAmount)
        : undefined,
      hasJudicialBlock: form.hasJudicialBlock,
      blockDetails: form.hasJudicialBlock
        ? form.blockDetails || undefined
        : undefined,
      hasEnvironmentalIssue: form.hasEnvironmentalIssue,
      environmentalNotes: form.hasEnvironmentalIssue
        ? form.environmentalNotes || undefined
        : undefined,
      notes: form.notes || undefined,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate({ clientId, ...payload });
    }
  }

  function handleDelete(id: string) {
    if (window.confirm("Tem certeza que deseja excluir esta propriedade?")) {
      deleteMutation.mutate({ id });
    }
  }

  // ── Computed totals ─────────────────────────────────────
  const totals = (properties ?? []).reduce(
    (acc, p) => ({
      totalArea: acc.totalArea + (p.totalArea || 0),
      productiveArea: acc.productiveArea + (p.productiveArea || 0),
      estimatedValue: acc.estimatedValue + (p.estimatedValue || 0),
      lienAmount:
        acc.lienAmount + (p.hasLien ? p.lienAmount || 0 : 0),
    }),
    { totalArea: 0, productiveArea: 0, estimatedValue: 0, lienAmount: 0 }
  );

  // ── Auto-calculated value per hectare for display ───────
  const formEstimatedCentavos = reaisToCentavos(form.estimatedValue);
  const formTotalArea = parseFloatSafe(form.totalArea);
  const valuePerHectareDisplay =
    formEstimatedCentavos && formTotalArea && formTotalArea > 0
      ? formatCurrency(formEstimatedCentavos / 100 / formTotalArea)
      : "—";

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trees className="size-5 text-emerald-600" />
          <h3 className="text-lg font-semibold">Imoveis Rurais</h3>
          {properties && (
            <span className="text-sm text-muted-foreground">
              ({properties.length}{" "}
              {properties.length === 1 ? "propriedade" : "propriedades"})
            </span>
          )}
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
        >
          <Plus className="size-4" />
          Nova Propriedade
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          Carregando propriedades...
        </div>
      ) : !properties || properties.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trees className="size-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum imovel rural cadastrado.</p>
          <p className="text-sm mt-1">
            Clique em &quot;Nova Propriedade&quot; para adicionar.
          </p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Area Total</TableHead>
                <TableHead className="text-right">Area Produtiva</TableHead>
                <TableHead className="text-right">Valor Est.</TableHead>
                <TableHead>Onus</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {item.city}/{item.state}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatArea(item.totalArea)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatArea(item.productiveArea)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.estimatedValue / 100)}
                  </TableCell>
                  <TableCell>
                    <OnusBadge item={item} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(item)}
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(item.id)}
                        title="Excluir"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="font-semibold">
                  Totais
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatArea(totals.totalArea)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatArea(totals.productiveArea)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totals.estimatedValue / 100)}
                </TableCell>
                <TableCell className="font-semibold">
                  {totals.lienAmount > 0
                    ? formatCurrency(totals.lienAmount / 100)
                    : "—"}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {/* ─── Create / Edit Dialog ────────────────────────── */}
      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Propriedade Rural" : "Nova Propriedade Rural"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ── Identificacao ─────────────────────────── */}
            <Section title="Identificacao" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label htmlFor="name">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Ex: Fazenda Santa Maria"
                  />
                </div>
                <div>
                  <Label htmlFor="registrationNumber">Matricula CRI</Label>
                  <Input
                    id="registrationNumber"
                    value={form.registrationNumber}
                    onChange={(e) =>
                      setField("registrationNumber", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="carCode">Codigo CAR</Label>
                  <Input
                    id="carCode"
                    value={form.carCode}
                    onChange={(e) => setField("carCode", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="incraCode">Codigo INCRA</Label>
                  <Input
                    id="incraCode"
                    value={form.incraCode}
                    onChange={(e) => setField("incraCode", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nirf">NIRF</Label>
                  <Input
                    id="nirf"
                    value={form.nirf}
                    onChange={(e) => setField("nirf", e.target.value)}
                  />
                </div>
              </div>
            </Section>

            {/* ── Localizacao ──────────────────────────── */}
            <Section title="Localizacao" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="city">
                    Cidade <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="state">
                    UF <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.state}
                    onValueChange={(v) => setField("state", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
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
                <div>
                  <Label htmlFor="comarca">Comarca</Label>
                  <Input
                    id="comarca"
                    value={form.comarca}
                    onChange={(e) => setField("comarca", e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="address">Endereco</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={(e) => setField("latitude", e.target.value)}
                    placeholder="-23.4567"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={(e) => setField("longitude", e.target.value)}
                    placeholder="-51.1234"
                  />
                </div>
              </div>
            </Section>

            {/* ── Areas (ha) ───────────────────────────── */}
            <Section title="Areas (ha)" defaultOpen={true}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label htmlFor="totalArea">
                    Area Total <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="totalArea"
                    type="number"
                    step="any"
                    min="0"
                    value={form.totalArea}
                    onChange={(e) => setField("totalArea", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="productiveArea">Produtiva</Label>
                  <Input
                    id="productiveArea"
                    type="number"
                    step="any"
                    min="0"
                    value={form.productiveArea}
                    onChange={(e) => setField("productiveArea", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pastureland">Pastagem</Label>
                  <Input
                    id="pastureland"
                    type="number"
                    step="any"
                    min="0"
                    value={form.pastureland}
                    onChange={(e) => setField("pastureland", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nativeVegetation">Vegetacao Nativa</Label>
                  <Input
                    id="nativeVegetation"
                    type="number"
                    step="any"
                    min="0"
                    value={form.nativeVegetation}
                    onChange={(e) =>
                      setField("nativeVegetation", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="forestArea">Reflorestamento</Label>
                  <Input
                    id="forestArea"
                    type="number"
                    step="any"
                    min="0"
                    value={form.forestArea}
                    onChange={(e) => setField("forestArea", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="improvementArea">Benfeitorias</Label>
                  <Input
                    id="improvementArea"
                    type="number"
                    step="any"
                    min="0"
                    value={form.improvementArea}
                    onChange={(e) =>
                      setField("improvementArea", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="irrigatedArea">Irrigada</Label>
                  <Input
                    id="irrigatedArea"
                    type="number"
                    step="any"
                    min="0"
                    value={form.irrigatedArea}
                    onChange={(e) => setField("irrigatedArea", e.target.value)}
                  />
                </div>
              </div>
            </Section>

            {/* ── Titularidade ─────────────────────────── */}
            <Section title="Titularidade" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ownership">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.ownership}
                    onValueChange={(v) => setField("ownership", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNERSHIP_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.ownership !== "PROPRIO" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="ownerName">Nome proprietario</Label>
                    <Input
                      id="ownerName"
                      value={form.ownerName}
                      onChange={(e) => setField("ownerName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerDocument">CPF/CNPJ</Label>
                    <Input
                      id="ownerDocument"
                      value={form.ownerDocument}
                      onChange={(e) =>
                        setField("ownerDocument", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="contractEndDate">
                      Vencimento contrato
                    </Label>
                    <Input
                      id="contractEndDate"
                      type="date"
                      value={form.contractEndDate}
                      onChange={(e) =>
                        setField("contractEndDate", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="annualRent">
                      Valor anual arrendamento (R$)
                    </Label>
                    <Input
                      id="annualRent"
                      type="number"
                      step="any"
                      min="0"
                      value={form.annualRent}
                      onChange={(e) => setField("annualRent", e.target.value)}
                      placeholder="Valor em Reais"
                    />
                  </div>
                </div>
              )}
            </Section>

            {/* ── Valor ────────────────────────────────── */}
            <Section title="Valor" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="estimatedValue">Valor estimado (R$)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    step="any"
                    min="0"
                    value={form.estimatedValue}
                    onChange={(e) =>
                      setField("estimatedValue", e.target.value)
                    }
                    placeholder="Valor em Reais"
                  />
                </div>
                <div>
                  <Label>Valor por hectare</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground">
                    {valuePerHectareDisplay}
                  </div>
                </div>
                <div>
                  <Label htmlFor="appraisalDate">Data avaliacao</Label>
                  <Input
                    id="appraisalDate"
                    type="date"
                    value={form.appraisalDate}
                    onChange={(e) =>
                      setField("appraisalDate", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="appraisalSource">Fonte</Label>
                  <Input
                    id="appraisalSource"
                    value={form.appraisalSource}
                    onChange={(e) =>
                      setField("appraisalSource", e.target.value)
                    }
                    placeholder="Ex: Laudo pericial, mercado"
                  />
                </div>
              </div>
            </Section>

            {/* ── Onus e Restricoes ────────────────────── */}
            <Section title="Onus e Restricoes" defaultOpen={true}>
              <div className="space-y-4">
                {/* Alienacao fiduciaria */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasLien"
                      checked={form.hasLien}
                      onCheckedChange={(checked) =>
                        setField("hasLien", checked === true)
                      }
                    />
                    <Label htmlFor="hasLien" className="cursor-pointer">
                      Alienacao fiduciaria
                    </Label>
                  </div>
                  {form.hasLien && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-6">
                      <div>
                        <Label htmlFor="lienHolder">Credor</Label>
                        <Input
                          id="lienHolder"
                          value={form.lienHolder}
                          onChange={(e) =>
                            setField("lienHolder", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="lienAmount">Valor gravame (R$)</Label>
                        <Input
                          id="lienAmount"
                          type="number"
                          step="any"
                          min="0"
                          value={form.lienAmount}
                          onChange={(e) =>
                            setField("lienAmount", e.target.value)
                          }
                          placeholder="Valor em Reais"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloqueio judicial */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasJudicialBlock"
                      checked={form.hasJudicialBlock}
                      onCheckedChange={(checked) =>
                        setField("hasJudicialBlock", checked === true)
                      }
                    />
                    <Label
                      htmlFor="hasJudicialBlock"
                      className="cursor-pointer"
                    >
                      Bloqueio judicial
                    </Label>
                  </div>
                  {form.hasJudicialBlock && (
                    <div className="ml-6">
                      <Label htmlFor="blockDetails">Detalhes</Label>
                      <Input
                        id="blockDetails"
                        value={form.blockDetails}
                        onChange={(e) =>
                          setField("blockDetails", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Questao ambiental */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasEnvironmentalIssue"
                      checked={form.hasEnvironmentalIssue}
                      onCheckedChange={(checked) =>
                        setField("hasEnvironmentalIssue", checked === true)
                      }
                    />
                    <Label
                      htmlFor="hasEnvironmentalIssue"
                      className="cursor-pointer"
                    >
                      Questao ambiental
                    </Label>
                  </div>
                  {form.hasEnvironmentalIssue && (
                    <div className="ml-6">
                      <Label htmlFor="environmentalNotes">Detalhes</Label>
                      <Input
                        id="environmentalNotes"
                        value={form.environmentalNotes}
                        onChange={(e) =>
                          setField("environmentalNotes", e.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ── Observacoes ──────────────────────────── */}
            <Section title="Observacoes" defaultOpen={false}>
              <div>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Observacoes sobre a propriedade..."
                  rows={4}
                />
              </div>
            </Section>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSaving || !form.name || !form.city || !form.state || !form.totalArea
              }
              className="bg-[#C9A961] hover:bg-[#B8944D] text-white"
            >
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Salvar Alteracoes" : "Criar Propriedade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
