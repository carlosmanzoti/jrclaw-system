"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Search,
  Zap,
  ShieldCheck,
  Crown,
} from "lucide-react";

// --- Types ---

interface NewInvestigationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type TargetType = "PF" | "PJ";
type DepthLevel = "BASICA" | "PADRAO" | "APROFUNDADA" | "COMPLETA";
type Priority = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

interface FormData {
  // Step 1 - Target
  targetType: TargetType;
  document: string;
  name: string;
  email: string;
  phone: string;
  caseId: string;
  // Step 2 - Depth
  depth: DepthLevel;
  // Step 3 - Options
  assigneeId: string;
  priority: Priority;
  autoMonitor: boolean;
  monitorFrequency: string;
  lgpdBasis: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  targetType: "PF",
  document: "",
  name: "",
  email: "",
  phone: "",
  caseId: "",
  depth: "PADRAO",
  assigneeId: "",
  priority: "MEDIA",
  autoMonitor: false,
  monitorFrequency: "SEMANAL",
  lgpdBasis: "EXERCICIO_REGULAR_DIREITO",
  notes: "",
};

// --- Depth level config ---

const DEPTH_OPTIONS: {
  value: DepthLevel;
  label: string;
  price: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}[] = [
  {
    value: "BASICA",
    label: "Basica",
    price: "Gratuita",
    description: "Consultas em bases publicas e gratuitas",
    features: [
      "Receita Federal (CPF/CNPJ)",
      "Divida Ativa da Uniao",
      "Processos (tribunais abertos)",
    ],
    icon: <Search className="size-5" />,
  },
  {
    value: "PADRAO",
    label: "Padrao",
    price: "~R$ 1,50",
    description: "Pesquisa padrao com bases pagas essenciais",
    features: [
      "Tudo da Basica",
      "SERASA/SPC",
      "Protestos",
      "Imoveis (RGI basico)",
      "Veiculos (RENAVAM)",
    ],
    icon: <Zap className="size-5" />,
  },
  {
    value: "APROFUNDADA",
    label: "Aprofundada",
    price: "~R$ 5,00",
    description: "Analise completa de patrimonio e rede societaria",
    features: [
      "Tudo da Padrao",
      "Participacoes societarias",
      "Procuracoes publicas",
      "Imoveis (matriculas completas)",
      "Aeronaves e embarcacoes",
      "Rede de relacionamentos",
    ],
    icon: <ShieldCheck className="size-5" />,
  },
  {
    value: "COMPLETA",
    label: "Completa",
    price: "~R$ 15,00",
    description: "Investigacao maxima com analise de IA inclusa",
    features: [
      "Tudo da Aprofundada",
      "Analise de IA do patrimonio",
      "Investimentos (CVM)",
      "Patrimonio rural (CAR/INCRA)",
      "Credito rural (SICOR)",
      "Score de penhorabilidade",
      "Relatorio executivo automatico",
    ],
    icon: <Crown className="size-5" />,
  },
];

// --- Helpers ---

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// --- Component ---

export function NewInvestigationDialog({
  open,
  onOpenChange,
  onSuccess,
}: NewInvestigationDialogProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  const createMutation = trpc.investigation.create.useMutation({
    onSuccess: () => {
      setStep(1);
      setForm(INITIAL_FORM);
      onSuccess();
    },
  });

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function handleDocumentChange(value: string) {
    const masked =
      form.targetType === "PF" ? maskCPF(value) : maskCNPJ(value);
    updateForm({ document: masked });
  }

  function handleSubmit() {
    createMutation.mutate({
      targetType: form.targetType,
      targetDocument: form.document.replace(/\D/g, ""),
      targetName: form.name,
      caseId: form.caseId && form.caseId !== "none" ? form.caseId : undefined,
      depth: form.depth,
      priority: form.priority === "URGENTE" ? "CRITICA" : form.priority,
      autoMonitor: form.autoMonitor,
      monitorFrequency: form.autoMonitor ? (form.monitorFrequency as any) : undefined,
      notes: form.notes || undefined,
    });
  }

  function handleClose(openState: boolean) {
    if (!openState) {
      setStep(1);
      setForm(INITIAL_FORM);
    }
    onOpenChange(openState);
  }

  const canAdvanceStep1 = form.document.replace(/\D/g, "").length >= (form.targetType === "PF" ? 11 : 14) && form.name.trim().length > 0;
  const canAdvanceStep2 = !!form.depth;
  const canSubmit = !!form.lgpdBasis;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center">
              <Search className="size-4 text-amber-700" />
            </div>
            Nova Investigacao Patrimonial
          </DialogTitle>
          <DialogDescription>
            Passo {step} de 3 &mdash;{" "}
            {step === 1
              ? "Dados do Alvo"
              : step === 2
                ? "Profundidade da Pesquisa"
                : "Opcoes e Configuracao"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s < step
                    ? "bg-amber-600 text-white"
                    : s === step
                      ? "bg-amber-100 text-amber-800 ring-2 ring-amber-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="size-3.5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition-colors ${
                    s < step ? "bg-amber-400" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Step 1: Target */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            {/* PF/PJ Toggle */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Tipo de Pessoa
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.targetType === "PF" ? "default" : "outline"}
                  className={
                    form.targetType === "PF"
                      ? "bg-amber-600 hover:bg-amber-700 flex-1"
                      : "flex-1"
                  }
                  onClick={() =>
                    updateForm({ targetType: "PF", document: "" })
                  }
                >
                  <User className="size-4 mr-2" />
                  Pessoa Fisica
                </Button>
                <Button
                  type="button"
                  variant={form.targetType === "PJ" ? "default" : "outline"}
                  className={
                    form.targetType === "PJ"
                      ? "bg-amber-600 hover:bg-amber-700 flex-1"
                      : "flex-1"
                  }
                  onClick={() =>
                    updateForm({ targetType: "PJ", document: "" })
                  }
                >
                  <Building2 className="size-4 mr-2" />
                  Pessoa Juridica
                </Button>
              </div>
            </div>

            {/* Document */}
            <div>
              <Label htmlFor="inv-document" className="text-sm font-medium">
                {form.targetType === "PF" ? "CPF" : "CNPJ"}
              </Label>
              <Input
                id="inv-document"
                placeholder={
                  form.targetType === "PF"
                    ? "000.000.000-00"
                    : "00.000.000/0000-00"
                }
                value={form.document}
                onChange={(e) => handleDocumentChange(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="inv-name" className="text-sm font-medium">
                {form.targetType === "PF" ? "Nome Completo" : "Razao Social"}
              </Label>
              <Input
                id="inv-name"
                placeholder={
                  form.targetType === "PF"
                    ? "Nome completo do investigado"
                    : "Razao social da empresa"
                }
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="inv-email" className="text-sm font-medium">
                  E-mail (opcional)
                </Label>
                <Input
                  id="inv-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => updateForm({ email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="inv-phone" className="text-sm font-medium">
                  Telefone (opcional)
                </Label>
                <Input
                  id="inv-phone"
                  placeholder="(00) 00000-0000"
                  value={form.phone}
                  onChange={(e) =>
                    updateForm({ phone: maskPhone(e.target.value) })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* Link to Recovery Case */}
            <div>
              <Label htmlFor="inv-case" className="text-sm font-medium">
                Vincular a Caso de Recuperacao (opcional)
              </Label>
              <Select
                value={form.caseId}
                onValueChange={(v) => updateForm({ caseId: v })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Selecione um caso..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Vincule esta investigacao a um caso existente de recuperacao de
                credito.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Depth */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Selecione a profundidade da investigacao. Quanto mais completa,
              mais fontes serao consultadas e maior o custo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEPTH_OPTIONS.map((opt) => {
                const isSelected = form.depth === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateForm({ depth: opt.value })}
                    className={`relative flex flex-col items-start text-left rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/50 shadow-md"
                        : "border-border hover:border-amber-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 size-5 rounded-full bg-amber-600 flex items-center justify-center">
                        <Check className="size-3 text-white" />
                      </div>
                    )}
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center mb-2 ${
                        isSelected
                          ? "bg-amber-100 text-amber-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {opt.icon}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {opt.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          isSelected
                            ? "border-amber-300 text-amber-700 text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {opt.price}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {opt.description}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {opt.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="size-3 text-amber-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Options */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            {/* Assignee */}
            <div>
              <Label htmlFor="inv-assignee" className="text-sm font-medium">
                Responsavel
              </Label>
              <Select
                value={form.assigneeId}
                onValueChange={(v) => updateForm({ assigneeId: v })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Selecione o responsavel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Atribuir automaticamente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="inv-priority" className="text-sm font-medium">
                Prioridade
              </Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  updateForm({ priority: v as Priority })
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAIXA">Baixa</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Auto Monitor */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="text-sm font-medium">
                  Monitoramento automatico
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Executar varreduras periodicas automaticamente
                </p>
              </div>
              <Switch
                checked={form.autoMonitor}
                onCheckedChange={(checked) =>
                  updateForm({ autoMonitor: checked })
                }
              />
            </div>

            {form.autoMonitor && (
              <div>
                <Label className="text-sm font-medium">
                  Frequencia do Monitoramento
                </Label>
                <Select
                  value={form.monitorFrequency}
                  onValueChange={(v) =>
                    updateForm({ monitorFrequency: v })
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIARIO">Diario</SelectItem>
                    <SelectItem value="SEMANAL">Semanal</SelectItem>
                    <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* LGPD Legal Basis */}
            <div>
              <Label htmlFor="inv-lgpd" className="text-sm font-medium">
                Base Legal LGPD
              </Label>
              <Select
                value={form.lgpdBasis}
                onValueChange={(v) => updateForm({ lgpdBasis: v })}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXERCICIO_REGULAR_DIREITO">
                    Exercicio regular de direito (Art. 7, VI)
                  </SelectItem>
                  <SelectItem value="LEGÍTIMO_INTERESSE">
                    Legitimo interesse (Art. 7, IX)
                  </SelectItem>
                  <SelectItem value="EXECUCAO_CONTRATO">
                    Execucao de contrato (Art. 7, V)
                  </SelectItem>
                  <SelectItem value="TUTELA_SAUDE">
                    Tutela da saude (Art. 7, VIII)
                  </SelectItem>
                  <SelectItem value="CUMPRIMENTO_OBRIGACAO_LEGAL">
                    Cumprimento de obrigacao legal (Art. 7, II)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Fundamento legal para tratamento dos dados pessoais conforme
                LGPD.
              </p>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="inv-notes" className="text-sm font-medium">
                Observacoes (opcional)
              </Label>
              <Textarea
                id="inv-notes"
                placeholder="Informacoes adicionais, contexto do caso, orientacoes especificas..."
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft className="size-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Proximo
                <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || createMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-2" />
                    Criar Investigacao
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
