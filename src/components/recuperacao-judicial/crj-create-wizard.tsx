"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  CRJ_TYPE_LABELS,
  CRJ_PRIORITY_LABELS,
  CRJ_PRIORITY_COLORS,
  CRJ_STATUS_LABELS,
  formatBRL,
  formatPercent,
} from "@/lib/crj-constants";
import { CREDIT_CLASS_SHORT_LABELS, formatCentavos } from "@/lib/rj-constants";
import {
  ChevronRight,
  ChevronLeft,
  Users,
  Search,
  Handshake,
  DollarSign,
  FileCheck,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface CRJCreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
  preselectedCreditorId?: string;
}

interface WizardForm {
  // Step 1: Creditor selection
  creditor_id: string;
  // Step 2: Type & assignment
  type: string;
  priority: string;
  assigned_to_id: string;
  title: string;
  notes: string;
  tags: string[];
  target_date: string;
  // Step 3: Financial proposal
  proposed_amount: string;
  installments: string;
  entry_payment: string;
  entry_date: string;
  grace_period_months: string;
  payment_term_years: string;
  monetary_correction: string;
  has_rotating_credit: boolean;
  rotating_credit_value: string;
  rotating_credit_cycles: string;
  has_credit_insurance: boolean;
  insurer_name: string;
  has_assignment: boolean;
  assignment_partner: string;
  assignment_percentage: string;
}

const initialForm: WizardForm = {
  creditor_id: "",
  type: "ACORDO_SIMPLES",
  priority: "MEDIA",
  assigned_to_id: "",
  title: "",
  notes: "",
  tags: [],
  target_date: "",
  proposed_amount: "",
  installments: "",
  entry_payment: "",
  entry_date: "",
  grace_period_months: "",
  payment_term_years: "",
  monetary_correction: "IPCA",
  has_rotating_credit: false,
  rotating_credit_value: "",
  rotating_credit_cycles: "",
  has_credit_insurance: false,
  insurer_name: "",
  has_assignment: false,
  assignment_partner: "",
  assignment_percentage: "",
};

const MONETARY_CORRECTIONS: Record<string, string> = {
  IPCA: "IPCA",
  IGPM: "IGP-M",
  INPC: "INPC",
  TR: "TR",
  SELIC: "SELIC",
  NENHUM: "Nenhum",
};

const STEPS = [
  { label: "Credor", icon: Users },
  { label: "Configuração", icon: Handshake },
  { label: "Proposta", icon: DollarSign },
  { label: "Revisão", icon: FileCheck },
];

export function CRJCreateWizard({
  open,
  onOpenChange,
  jrcId,
  preselectedCreditorId,
}: CRJCreateWizardProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>({
    ...initialForm,
    creditor_id: preselectedCreditorId || "",
  });
  const [creditorSearch, setCreditorSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: creditorsData, isLoading: loadingCreditors } =
    trpc.rj.creditors.list.useQuery(
      { jrc_id: jrcId, limit: 500 },
      { enabled: open }
    );

  const { data: users } = trpc.users.list.useQuery(undefined, {
    enabled: open,
  });

  // Create mutation
  const createMutation = trpc.crjNeg.negotiations.create.useMutation({
    onSuccess: () => {
      utils.crjNeg.invalidate();
      utils.rj.creditors.invalidate();
      setCreating(false);
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      setCreating(false);
      setError(err.message);
    },
  });

  const resetForm = () => {
    setStep(0);
    setForm({ ...initialForm });
    setCreditorSearch("");
    setError(null);
  };

  // Selected creditor
  const selectedCreditor = useMemo(() => {
    if (!form.creditor_id || !creditorsData?.items) return null;
    return (creditorsData.items as Array<{
      id: string;
      nome: string;
      cpf_cnpj: string | null;
      classe: string;
      natureza: string;
      valor_original: bigint;
      valor_atualizado: bigint;
      crj_negotiations: { id: string; status: string }[];
    }>).find((c) => c.id === form.creditor_id) || null;
  }, [form.creditor_id, creditorsData]);

  // Filtered creditors for search
  const filteredCreditors = useMemo(() => {
    if (!creditorsData?.items) return [];
    const items = creditorsData.items as Array<{
      id: string;
      nome: string;
      cpf_cnpj: string | null;
      classe: string;
      valor_original: bigint;
      valor_atualizado: bigint;
      crj_negotiations: { id: string; status: string }[];
    }>;
    if (!creditorSearch) return items;
    const q = creditorSearch.toLowerCase();
    return items.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.cpf_cnpj && c.cpf_cnpj.includes(q))
    );
  }, [creditorsData, creditorSearch]);

  // Calculate discount
  const creditAmountReais = selectedCreditor
    ? Number(selectedCreditor.valor_atualizado || selectedCreditor.valor_original) / 100
    : 0;
  const proposedAmountReais = form.proposed_amount ? parseFloat(form.proposed_amount) : 0;
  const discountPercentage =
    creditAmountReais > 0 && proposedAmountReais > 0
      ? ((creditAmountReais - proposedAmountReais) / creditAmountReais) * 100
      : 0;

  const updateField = (field: keyof WizardForm, value: string | boolean | string[]) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!form.creditor_id;
      case 1:
        return !!form.type;
      case 2:
        return true; // All optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleCreate = () => {
    if (!form.creditor_id) return;
    setCreating(true);
    setError(null);

    createMutation.mutate({
      jrc_id: jrcId,
      creditor_id: form.creditor_id,
      title: form.title || undefined,
      type: form.type,
      priority: form.priority,
      assigned_to_id: form.assigned_to_id || undefined,
      proposed_amount: form.proposed_amount ? parseFloat(form.proposed_amount) : undefined,
      installments: form.installments ? parseInt(form.installments, 10) : undefined,
      has_rotating_credit: form.has_rotating_credit,
      rotating_credit_value: form.rotating_credit_value
        ? parseFloat(form.rotating_credit_value)
        : undefined,
      rotating_credit_cycles: form.rotating_credit_cycles
        ? parseInt(form.rotating_credit_cycles, 10)
        : undefined,
      has_credit_insurance: form.has_credit_insurance,
      insurer_name: form.insurer_name || undefined,
      has_assignment: form.has_assignment,
      assignment_partner: form.assignment_partner || undefined,
      assignment_percentage: form.assignment_percentage
        ? parseFloat(form.assignment_percentage)
        : undefined,
      entry_payment: form.entry_payment ? parseFloat(form.entry_payment) : undefined,
      entry_date: form.entry_date ? new Date(form.entry_date) : undefined,
      grace_period_months: form.grace_period_months
        ? parseInt(form.grace_period_months, 10)
        : undefined,
      payment_term_years: form.payment_term_years
        ? parseInt(form.payment_term_years, 10)
        : undefined,
      monetary_correction: form.monetary_correction || undefined,
      notes: form.notes || undefined,
      target_date: form.target_date ? new Date(form.target_date) : undefined,
      tags: form.tags,
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Nova Negociação Individual</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 border-b pb-3">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "cursor-pointer bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <s.icon className="h-3 w-3" />
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-1 h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 0 && (
            <StepCreditor
              creditors={filteredCreditors}
              loading={loadingCreditors}
              search={creditorSearch}
              onSearchChange={setCreditorSearch}
              selectedId={form.creditor_id}
              onSelect={(id) => updateField("creditor_id", id)}
            />
          )}
          {step === 1 && (
            <StepConfig
              form={form}
              updateField={updateField}
              users={users || []}
              creditorName={selectedCreditor?.nome || ""}
            />
          )}
          {step === 2 && (
            <StepProposal
              form={form}
              updateField={updateField}
              creditAmountReais={creditAmountReais}
              discountPercentage={discountPercentage}
            />
          )}
          {step === 3 && (
            <StepReview
              form={form}
              selectedCreditor={selectedCreditor}
              creditAmountReais={creditAmountReais}
              discountPercentage={discountPercentage}
              users={users || []}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between border-t pt-3">
          <div>
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
              >
                Próximo
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button size="sm" disabled={creating} onClick={handleCreate}>
                {creating ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Criar Negociação
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== Step 1: Creditor Selection ==========

function StepCreditor({
  creditors,
  loading,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}: {
  creditors: Array<{
    id: string;
    nome: string;
    cpf_cnpj: string | null;
    classe: string;
    valor_original: bigint;
    valor_atualizado: bigint;
    crj_negotiations: { id: string; status: string }[];
  }>;
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div>
        <p className="text-sm text-muted-foreground">
          Selecione o credor do QGC para iniciar a negociação individual.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar credor por nome ou CPF/CNPJ..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      <div className="max-h-[350px] space-y-1.5 overflow-y-auto">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))
        ) : creditors.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search ? "Nenhum credor encontrado" : "Nenhum credor no QGC"}
          </div>
        ) : (
          creditors.map((c) => {
            const hasActiveNeg = c.crj_negotiations?.some(
              (n) => n.status !== "CANCELADA"
            );
            return (
              <Card
                key={c.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedId === c.id
                    ? "border-primary bg-primary/5"
                    : ""
                } ${hasActiveNeg ? "opacity-60" : ""}`}
                onClick={() => !hasActiveNeg && onSelect(c.id)}
              >
                <CardContent className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{c.nome}</p>
                      {hasActiveNeg && (
                        <Badge className="shrink-0 bg-amber-100 text-[9px] text-amber-700">
                          Já possui negociação
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      {c.cpf_cnpj && <span>{c.cpf_cnpj}</span>}
                      <Badge variant="outline" className="text-[9px]">
                        {CREDIT_CLASS_SHORT_LABELS[c.classe] || c.classe}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {formatCentavos(c.valor_atualizado || c.valor_original)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Crédito atualizado
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ========== Step 2: Configuration ==========

function StepConfig({
  form,
  updateField,
  users,
  creditorName,
}: {
  form: WizardForm;
  updateField: (field: keyof WizardForm, value: string | boolean | string[]) => void;
  users: Array<{ id: string; name: string | null }>;
  creditorName: string;
}) {
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        Configure o tipo de negociação e responsável.
      </p>

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs">Título (opcional)</Label>
        <Input
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder={`Negociação — ${creditorName}`}
          className="text-sm"
        />
        <p className="text-[10px] text-muted-foreground">
          Se vazio, será gerado automaticamente: &quot;Negociação — {creditorName}&quot;
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Type */}
        <div className="space-y-2">
          <Label className="text-xs">Tipo de Negociação *</Label>
          <Select
            value={form.type}
            onValueChange={(v) => updateField("type", v)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CRJ_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label className="text-xs">Prioridade</Label>
          <Select
            value={form.priority}
            onValueChange={(v) => updateField("priority", v)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CRJ_PRIORITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Assignee */}
        <div className="space-y-2">
          <Label className="text-xs">Responsável</Label>
          <Select
            value={form.assigned_to_id}
            onValueChange={(v) => updateField("assigned_to_id", v)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target date */}
        <div className="space-y-2">
          <Label className="text-xs">Data alvo</Label>
          <Input
            type="date"
            value={form.target_date}
            onChange={(e) => updateField("target_date", e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-xs">Notas</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          placeholder="Observações sobre esta negociação..."
          rows={3}
          className="text-sm"
        />
      </div>
    </div>
  );
}

// ========== Step 3: Financial Proposal ==========

function StepProposal({
  form,
  updateField,
  creditAmountReais,
  discountPercentage,
}: {
  form: WizardForm;
  updateField: (field: keyof WizardForm, value: string | boolean | string[]) => void;
  creditAmountReais: number;
  discountPercentage: number;
}) {
  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        Defina os termos financeiros da proposta inicial (todos opcionais).
      </p>

      {/* Credit summary */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Crédito atualizado</span>
          <span className="text-sm font-bold">
            {creditAmountReais.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
      </div>

      {/* Proposed amount */}
      <div className="space-y-2">
        <Label className="text-xs">Valor Proposto (R$)</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={form.proposed_amount}
          onChange={(e) => updateField("proposed_amount", e.target.value)}
          placeholder="0,00"
          className="text-sm"
        />
        {discountPercentage > 0 && (
          <p className="text-xs text-emerald-600">
            Deságio: {formatPercent(discountPercentage)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Entry payment */}
        <div className="space-y-2">
          <Label className="text-xs">Entrada (R$)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.entry_payment}
            onChange={(e) => updateField("entry_payment", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Entry date */}
        <div className="space-y-2">
          <Label className="text-xs">Data da Entrada</Label>
          <Input
            type="date"
            value={form.entry_date}
            onChange={(e) => updateField("entry_date", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Installments */}
        <div className="space-y-2">
          <Label className="text-xs">Parcelas</Label>
          <Input
            type="number"
            min="1"
            value={form.installments}
            onChange={(e) => updateField("installments", e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Grace period */}
        <div className="space-y-2">
          <Label className="text-xs">Carência (meses)</Label>
          <Input
            type="number"
            min="0"
            value={form.grace_period_months}
            onChange={(e) => updateField("grace_period_months", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Payment term */}
        <div className="space-y-2">
          <Label className="text-xs">Prazo (anos)</Label>
          <Input
            type="number"
            min="1"
            value={form.payment_term_years}
            onChange={(e) => updateField("payment_term_years", e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Monetary correction */}
        <div className="space-y-2">
          <Label className="text-xs">Correção Monetária</Label>
          <Select
            value={form.monetary_correction}
            onValueChange={(v) => updateField("monetary_correction", v)}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MONETARY_CORRECTIONS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Special options */}
      <div className="space-y-4">
        {/* Rotating credit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.has_rotating_credit}
              onCheckedChange={(v) => updateField("has_rotating_credit", v)}
            />
            <Label className="text-xs">Crédito Rotativo (Parceiro)</Label>
          </div>
          {form.has_rotating_credit && (
            <div className="grid grid-cols-2 gap-3 pl-8">
              <div className="space-y-1">
                <Label className="text-[10px]">Valor do Crédito Rotativo</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rotating_credit_value}
                  onChange={(e) => updateField("rotating_credit_value", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Ciclos</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.rotating_credit_cycles}
                  onChange={(e) => updateField("rotating_credit_cycles", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Credit insurance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.has_credit_insurance}
              onCheckedChange={(v) => updateField("has_credit_insurance", v)}
            />
            <Label className="text-xs">Seguro de Crédito</Label>
          </div>
          {form.has_credit_insurance && (
            <div className="pl-8">
              <Label className="text-[10px]">Seguradora</Label>
              <Input
                value={form.insurer_name}
                onChange={(e) => updateField("insurer_name", e.target.value)}
                placeholder="Nome da seguradora"
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Assignment */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.has_assignment}
              onCheckedChange={(v) => updateField("has_assignment", v)}
            />
            <Label className="text-xs">Cessão de Crédito</Label>
          </div>
          {form.has_assignment && (
            <div className="grid grid-cols-2 gap-3 pl-8">
              <div className="space-y-1">
                <Label className="text-[10px]">Cessionário</Label>
                <Input
                  value={form.assignment_partner}
                  onChange={(e) => updateField("assignment_partner", e.target.value)}
                  placeholder="Nome do cessionário"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Percentual (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.assignment_percentage}
                  onChange={(e) => updateField("assignment_percentage", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Step 4: Review ==========

function StepReview({
  form,
  selectedCreditor,
  creditAmountReais,
  discountPercentage,
  users,
}: {
  form: WizardForm;
  selectedCreditor: {
    nome: string;
    cpf_cnpj: string | null;
    classe: string;
    valor_atualizado: bigint;
    valor_original: bigint;
  } | null;
  creditAmountReais: number;
  discountPercentage: number;
  users: Array<{ id: string; name: string | null }>;
}) {
  const assignee = users.find((u) => u.id === form.assigned_to_id);

  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        Revise os dados antes de criar a negociação.
      </p>

      {/* Creditor */}
      <div className="rounded-lg border p-3">
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">CREDOR</h4>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{selectedCreditor?.nome || "—"}</p>
            <p className="text-[10px] text-muted-foreground">
              {selectedCreditor?.cpf_cnpj || "Sem CPF/CNPJ"} |{" "}
              {CREDIT_CLASS_SHORT_LABELS[selectedCreditor?.classe || ""] || selectedCreditor?.classe}
            </p>
          </div>
          <p className="text-sm font-bold">
            {creditAmountReais.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>
      </div>

      {/* Config */}
      <div className="rounded-lg border p-3">
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">CONFIGURAÇÃO</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Tipo: </span>
            <span className="font-medium">{CRJ_TYPE_LABELS[form.type] || form.type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Prioridade: </span>
            <Badge
              variant="outline"
              className={`text-[10px] ${CRJ_PRIORITY_COLORS[form.priority] || ""}`}
            >
              {CRJ_PRIORITY_LABELS[form.priority]}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Responsável: </span>
            <span className="font-medium">{assignee?.name || "Você"}</span>
          </div>
          {form.target_date && (
            <div>
              <span className="text-muted-foreground">Data alvo: </span>
              <span className="font-medium">
                {new Date(form.target_date).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>
        {form.title && (
          <div className="mt-2 text-xs">
            <span className="text-muted-foreground">Título: </span>
            <span className="font-medium">{form.title}</span>
          </div>
        )}
      </div>

      {/* Proposal */}
      {(form.proposed_amount || form.installments || form.entry_payment) && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
            PROPOSTA FINANCEIRA
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {form.proposed_amount && (
              <div>
                <span className="text-muted-foreground">Valor Proposto: </span>
                <span className="font-medium">
                  {parseFloat(form.proposed_amount).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            )}
            {discountPercentage > 0 && (
              <div>
                <span className="text-muted-foreground">Deságio: </span>
                <span className="font-medium text-emerald-600">
                  {formatPercent(discountPercentage)}
                </span>
              </div>
            )}
            {form.entry_payment && (
              <div>
                <span className="text-muted-foreground">Entrada: </span>
                <span className="font-medium">
                  {parseFloat(form.entry_payment).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            )}
            {form.installments && (
              <div>
                <span className="text-muted-foreground">Parcelas: </span>
                <span className="font-medium">{form.installments}x</span>
              </div>
            )}
            {form.grace_period_months && (
              <div>
                <span className="text-muted-foreground">Carência: </span>
                <span className="font-medium">{form.grace_period_months} meses</span>
              </div>
            )}
            {form.payment_term_years && (
              <div>
                <span className="text-muted-foreground">Prazo: </span>
                <span className="font-medium">{form.payment_term_years} anos</span>
              </div>
            )}
            {form.monetary_correction && form.monetary_correction !== "NENHUM" && (
              <div>
                <span className="text-muted-foreground">Correção: </span>
                <span className="font-medium">
                  {MONETARY_CORRECTIONS[form.monetary_correction]}
                </span>
              </div>
            )}
          </div>

          {/* Special features */}
          {(form.has_rotating_credit || form.has_credit_insurance || form.has_assignment) && (
            <div className="mt-2 flex gap-2">
              {form.has_rotating_credit && (
                <Badge variant="outline" className="text-[9px]">
                  Crédito Rotativo
                </Badge>
              )}
              {form.has_credit_insurance && (
                <Badge variant="outline" className="text-[9px]">
                  Seguro de Crédito
                </Badge>
              )}
              {form.has_assignment && (
                <Badge variant="outline" className="text-[9px]">
                  Cessão de Crédito
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {form.notes && (
        <div className="rounded-lg border p-3">
          <h4 className="mb-1 text-xs font-semibold text-muted-foreground">NOTAS</h4>
          <p className="text-xs">{form.notes}</p>
        </div>
      )}
    </div>
  );
}
