"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
  Shield,
  Eye,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecoveryWizardProps {
  onClose: () => void;
  onSuccess?: (id: string) => void;
}

interface DevedorData {
  existing_person_id: string | null;
  nome: string;
  cpf_cnpj: string;
  tipo: "PF" | "PJ";
  endereco: string;
  telefone: string;
  email: string;
  atividade: string;
  razao_social: string;
  cnae: string;
  socios: string;
}

interface TituloData {
  tipo: string;
  numero: string;
  data_vencimento: string;
  data_prescricao: string;
}

interface ValoresData {
  valor_original: string;
  correcao_monetaria: string;
  juros: string;
  multa_523: string;
  honorarios: string;
  custas: string;
}

interface CalculadoraData {
  valor_base: string;
  data_base: string;
  indice_correcao: string;
  juros_pct: string;
  multa_pct: string;
  resultado: number | null;
}

interface AIAnalysis {
  score: number;
  estrategia: string;
  riscos: Array<{ descricao: string; severidade: "ALTO" | "MEDIO" | "BAIXO" }>;
  timeline: Array<{ acao: string; data_estimada: string }>;
}

interface JointDebtor {
  id: string;
  person_id: string | null;
  nome: string;
  cpf_cnpj: string;
  tipo: string;
  fundamentacao: string;
  patrimonio_estimado: string;
}

interface MonitoringItem {
  key: string;
  label: string;
  enabled: boolean;
  frequency: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CASE_TYPES = [
  { value: "CUMPRIMENTO_SENTENCA", label: "Cumprimento de Sentenca" },
  { value: "EXECUCAO_TITULO_EXTRAJUDICIAL", label: "Execucao Titulo Extrajudicial" },
  { value: "EXECUCAO_FISCAL", label: "Execucao Fiscal" },
  { value: "MONITORIA", label: "Monitoria" },
  { value: "BUSCA_APREENSAO", label: "Busca e Apreensao" },
  { value: "COBRANCA_EXTRAJUDICIAL", label: "Cobranca Extrajudicial" },
];

const TITULO_TYPES = [
  { value: "NOTA_PROMISSORIA", label: "Nota Promissoria" },
  { value: "DUPLICATA", label: "Duplicata" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CONTRATO", label: "Contrato" },
  { value: "SENTENCA", label: "Sentenca Judicial" },
  { value: "CDA", label: "Certidao de Divida Ativa" },
  { value: "CCB", label: "Cedula de Credito Bancario" },
  { value: "OUTRO", label: "Outro" },
];

const CORRECAO_INDICES = [
  { value: "IGPM", label: "IGP-M" },
  { value: "IPCA", label: "IPCA" },
  { value: "INPC", label: "INPC" },
  { value: "SELIC", label: "SELIC" },
];

const PRIORITY_OPTIONS = [
  { value: "CRITICA", label: "Critica", color: "#DC2626" },
  { value: "ALTA", label: "Alta", color: "#EA580C" },
  { value: "MEDIA", label: "Media", color: "#C9A961" },
  { value: "BAIXA", label: "Baixa", color: "#16A34A" },
];

const JOINT_DEBTOR_TYPES = [
  { value: "DEVEDOR_PRINCIPAL", label: "Devedor Principal" },
  { value: "AVALISTA", label: "Avalista" },
  { value: "FIADOR", label: "Fiador" },
  { value: "SOCIO", label: "Socio" },
  { value: "ADMINISTRADOR", label: "Administrador" },
  { value: "GRUPO_ECONOMICO", label: "Grupo Economico" },
  { value: "SUCESSOR", label: "Sucessor" },
  { value: "CONJUGE", label: "Conjuge" },
];

const FREQUENCY_OPTIONS = [
  { value: "TEMPO_REAL", label: "Tempo Real" },
  { value: "DIARIO", label: "Diario" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "MENSAL", label: "Mensal" },
];

const STEP_LABELS = [
  "Devedor e Credito",
  "Avaliacao IA",
  "Corresponsaveis",
  "Monitoramento",
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function generateTempId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.,\-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#16A34A";
  if (score >= 40) return "#C9A961";
  return "#DC2626";
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "ALTO":
      return "#DC2626";
    case "MEDIO":
      return "#C9A961";
    case "BAIXO":
      return "#16A34A";
    default:
      return "#666666";
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RecoveryWizard({ onClose, onSuccess }: RecoveryWizardProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // ---- Step 1: Devedor e Credito ----
  const [personSearch, setPersonSearch] = useState("");
  const [isNewPerson, setIsNewPerson] = useState(false);
  const [devedor, setDevedor] = useState<DevedorData>({
    existing_person_id: null,
    nome: "",
    cpf_cnpj: "",
    tipo: "PF",
    endereco: "",
    telefone: "",
    email: "",
    atividade: "",
    razao_social: "",
    cnae: "",
    socios: "",
  });
  const [tipoCaso, setTipoCaso] = useState("");
  const [processoVinculado, setProcessoVinculado] = useState("");
  const [titulo, setTitulo] = useState<TituloData>({
    tipo: "",
    numero: "",
    data_vencimento: "",
    data_prescricao: "",
  });
  const [valores, setValores] = useState<ValoresData>({
    valor_original: "",
    correcao_monetaria: "",
    juros: "",
    multa_523: "",
    honorarios: "",
    custas: "",
  });
  const [showCalculadora, setShowCalculadora] = useState(false);
  const [calculadora, setCalculadora] = useState<CalculadoraData>({
    valor_base: "",
    data_base: "",
    indice_correcao: "IGPM",
    juros_pct: "",
    multa_pct: "",
    resultado: null,
  });
  const [prioridade, setPrioridade] = useState("MEDIA");
  const [responsavelId, setResponsavelId] = useState("");

  // ---- Step 2: AI Analysis ----
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [acceptAiRecommendation, setAcceptAiRecommendation] = useState(false);
  const [aiSkipped, setAiSkipped] = useState(false);
  const [overrideScore, setOverrideScore] = useState("");
  const [overrideStrategy, setOverrideStrategy] = useState("");

  // ---- Step 3: Joint Debtors ----
  const [jointDebtors, setJointDebtors] = useState<JointDebtor[]>([]);
  const [showAddDebtor, setShowAddDebtor] = useState(false);
  const [newDebtor, setNewDebtor] = useState<JointDebtor>({
    id: "",
    person_id: null,
    nome: "",
    cpf_cnpj: "",
    tipo: "AVALISTA",
    fundamentacao: "",
    patrimonio_estimado: "",
  });
  const [importingSocios, setImportingSocios] = useState(false);

  // ---- Step 4: Monitoring ----
  const [monitorings, setMonitorings] = useState<MonitoringItem[]>([
    { key: "processos_judiciais", label: "Monitorar processos judiciais do devedor", enabled: true, frequency: "DIARIO" },
    { key: "diario_oficial", label: "Monitorar Diario Oficial", enabled: true, frequency: "DIARIO" },
    { key: "alteracoes_societarias", label: "Monitorar alteracoes societarias", enabled: true, frequency: "SEMANAL" },
    { key: "score_credito", label: "Monitorar score de credito", enabled: true, frequency: "MENSAL" },
    { key: "protestos_pagamentos", label: "Monitorar novos protestos/pagamentos", enabled: true, frequency: "DIARIO" },
    { key: "novos_bens", label: "Monitorar novos bens", enabled: true, frequency: "SEMANAL" },
  ]);

  // ---- tRPC queries ----
  const personsQuery = trpc.persons.list.useQuery(
    { search: personSearch, limit: 10 },
    { enabled: personSearch.length >= 2 }
  );

  const usersQuery = trpc.users.list.useQuery();

  const createCaseMutation = trpc.recovery.cases.createFromWizard.useMutation({
    onSuccess: (data: { id: string }) => {
      onSuccess?.(data.id);
      onClose();
    },
  });

  // ---- Auto-calculated values ----
  const totalValor = useMemo(() => {
    const original = parseNumber(valores.valor_original);
    const correcao = parseNumber(valores.correcao_monetaria);
    const juros = parseNumber(valores.juros);
    const multa = parseNumber(valores.multa_523);
    const honorarios = parseNumber(valores.honorarios);
    const custas = parseNumber(valores.custas);
    return original + correcao + juros + multa + honorarios + custas;
  }, [valores]);

  // Auto-calculate multa 523 for cumprimento de sentenca
  useEffect(() => {
    if (tipoCaso === "CUMPRIMENTO_SENTENCA" && valores.valor_original) {
      const original = parseNumber(valores.valor_original);
      const multa = original * 0.1;
      setValores((prev) => ({
        ...prev,
        multa_523: multa.toFixed(2),
      }));
    }
  }, [tipoCaso, valores.valor_original]);

  // Pre-fill main devedor as joint debtor on step 3 entry
  useEffect(() => {
    if (currentStep === 3 && jointDebtors.length === 0 && devedor.nome) {
      setJointDebtors([
        {
          id: generateTempId(),
          person_id: devedor.existing_person_id,
          nome: devedor.nome,
          cpf_cnpj: devedor.cpf_cnpj,
          tipo: "DEVEDOR_PRINCIPAL",
          fundamentacao: "",
          patrimonio_estimado: "",
        },
      ]);
    }
  }, [currentStep, jointDebtors.length, devedor]);

  // AI analysis on step 2 entry
  useEffect(() => {
    if (currentStep === 2 && !aiAnalysis && !aiLoading && !aiSkipped && !aiError) {
      runAiAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // ---- Handlers ----

  const runAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/recovery/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "initial_analysis",
          devedor: {
            nome: devedor.nome,
            cpf_cnpj: devedor.cpf_cnpj,
            tipo: devedor.tipo,
            atividade: devedor.atividade,
          },
          caso: {
            tipo: tipoCaso,
            titulo: titulo,
            valores: {
              valor_original: parseNumber(valores.valor_original),
              total: totalValor,
            },
            prioridade,
            processo_vinculado: processoVinculado || undefined,
          },
        }),
      });
      if (!res.ok) {
        throw new Error("Falha na analise. Tente novamente.");
      }
      const data = await res.json();
      setAiAnalysis(data);
      setOverrideScore(String(data.score));
      setOverrideStrategy(data.estrategia);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Erro ao analisar com IA."
      );
    } finally {
      setAiLoading(false);
    }
  }, [devedor, tipoCaso, titulo, valores.valor_original, totalValor, prioridade, processoVinculado]);

  function handleSelectPerson(person: Record<string, any>) {
    setDevedor({
      existing_person_id: person.id,
      nome: person.nome || person.razao_social || "",
      cpf_cnpj: person.cpf_cnpj || "",
      tipo: person.subtipo === "PESSOA_JURIDICA" ? "PJ" : "PF",
      endereco: [person.logradouro, person.numero, person.bairro, person.cidade, person.estado]
        .filter(Boolean)
        .join(", "),
      telefone: person.celular || person.telefone_fixo || "",
      email: person.email || "",
      atividade: person.profissao || person.segmento || "",
      razao_social: person.razao_social || "",
      cnae: "",
      socios: "",
    });
    setPersonSearch("");
    setIsNewPerson(false);
  }

  function handleCalculate() {
    const base = parseNumber(calculadora.valor_base);
    if (!base || !calculadora.data_base) return;

    const dataBase = new Date(calculadora.data_base);
    const hoje = new Date();
    const meses =
      (hoje.getFullYear() - dataBase.getFullYear()) * 12 +
      (hoje.getMonth() - dataBase.getMonth());

    // Simplified calculation (in production, would use real indices)
    let taxaMensal = 0;
    switch (calculadora.indice_correcao) {
      case "IGPM":
        taxaMensal = 0.005;
        break;
      case "IPCA":
        taxaMensal = 0.004;
        break;
      case "INPC":
        taxaMensal = 0.0045;
        break;
      case "SELIC":
        taxaMensal = 0.0085;
        break;
    }

    const corrigido = base * Math.pow(1 + taxaMensal, meses);
    const jurosPct = parseNumber(calculadora.juros_pct) / 100;
    const comJuros = corrigido * (1 + jurosPct * meses);
    const multaPct = parseNumber(calculadora.multa_pct) / 100;
    const resultado = comJuros * (1 + multaPct);

    setCalculadora((prev) => ({ ...prev, resultado }));
  }

  function handleAddJointDebtor() {
    if (!newDebtor.nome) return;
    setJointDebtors((prev) => [
      ...prev,
      { ...newDebtor, id: generateTempId() },
    ]);
    setNewDebtor({
      id: "",
      person_id: null,
      nome: "",
      cpf_cnpj: "",
      tipo: "AVALISTA",
      fundamentacao: "",
      patrimonio_estimado: "",
    });
    setShowAddDebtor(false);
  }

  function handleRemoveJointDebtor(id: string) {
    setJointDebtors((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleImportSocios() {
    if (devedor.tipo !== "PJ" || !devedor.cpf_cnpj) return;
    setImportingSocios(true);
    try {
      const res = await fetch("/api/ai/recovery/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "import_socios",
          cnpj: devedor.cpf_cnpj,
          nome: devedor.nome,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const socios = (data.socios || []) as Array<{
          nome: string;
          cpf_cnpj: string;
          tipo: string;
        }>;
        const newDebtors = socios.map((s) => ({
          id: generateTempId(),
          person_id: null,
          nome: s.nome,
          cpf_cnpj: s.cpf_cnpj || "",
          tipo: s.tipo || "SOCIO",
          fundamentacao: "Socio identificado via consulta automatica",
          patrimonio_estimado: "",
        }));
        setJointDebtors((prev) => [...prev, ...newDebtors]);
      }
    } catch {
      // Silently ignore import failures
    } finally {
      setImportingSocios(false);
    }
  }

  function handleToggleMonitoring(key: string) {
    setMonitorings((prev) =>
      prev.map((m) => (m.key === key ? { ...m, enabled: !m.enabled } : m))
    );
  }

  function handleMonitoringFrequency(key: string, frequency: string) {
    setMonitorings((prev) =>
      prev.map((m) => (m.key === key ? { ...m, frequency } : m))
    );
  }

  function canAdvance(): boolean {
    switch (currentStep) {
      case 1:
        return !!(devedor.nome && devedor.cpf_cnpj && tipoCaso && valores.valor_original);
      case 2:
        return true; // Always can advance (AI is optional)
      case 3:
        return true; // Joint debtors are optional
      case 4:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function handleSubmit() {
    const finalScore = acceptAiRecommendation
      ? aiAnalysis?.score ?? undefined
      : overrideScore
        ? parseInt(overrideScore)
        : undefined;

    const finalStrategy = acceptAiRecommendation
      ? aiAnalysis?.estrategia ?? undefined
      : overrideStrategy || undefined;

    createCaseMutation.mutate({
      devedor: {
        existing_person_id: devedor.existing_person_id || undefined,
        nome: devedor.nome,
        cpf_cnpj: devedor.cpf_cnpj,
        tipo: devedor.tipo,
        endereco: devedor.endereco || undefined,
        telefone: devedor.telefone || undefined,
        email: devedor.email || undefined,
        atividade: devedor.atividade || undefined,
        razao_social: devedor.tipo === "PJ" ? devedor.razao_social || undefined : undefined,
        cnae: devedor.tipo === "PJ" ? devedor.cnae || undefined : undefined,
        socios: devedor.tipo === "PJ" ? devedor.socios || undefined : undefined,
      },
      caso: {
        tipo: tipoCaso,
        processo_vinculado: processoVinculado || undefined,
        titulo: {
          tipo: titulo.tipo || undefined,
          numero: titulo.numero || undefined,
          data_vencimento: titulo.data_vencimento || undefined,
          data_prescricao: titulo.data_prescricao || undefined,
        },
        valores: {
          valor_original: parseNumber(valores.valor_original),
          correcao_monetaria: parseNumber(valores.correcao_monetaria),
          juros: parseNumber(valores.juros),
          multa_523: parseNumber(valores.multa_523),
          honorarios: parseNumber(valores.honorarios),
          custas: parseNumber(valores.custas),
          total: totalValor,
        },
        prioridade,
        responsavel_id: responsavelId || undefined,
      },
      ai_analysis: !aiSkipped
        ? {
            score: finalScore,
            estrategia: finalStrategy,
            riscos: aiAnalysis?.riscos,
            timeline: aiAnalysis?.timeline,
          }
        : undefined,
      corresponsaveis: jointDebtors
        .filter((d) => d.tipo !== "DEVEDOR_PRINCIPAL")
        .map((d) => ({
          person_id: d.person_id || undefined,
          nome: d.nome,
          cpf_cnpj: d.cpf_cnpj || undefined,
          tipo: d.tipo,
          fundamentacao: d.fundamentacao || undefined,
          patrimonio_estimado: d.patrimonio_estimado
            ? parseNumber(d.patrimonio_estimado)
            : undefined,
        })),
      monitoramentos: monitorings
        .filter((m) => m.enabled)
        .map((m) => ({
          tipo: m.key,
          frequencia: m.frequency,
        })),
    });
  }

  // =========================================================================
  // STEP RENDERERS
  // =========================================================================

  // ---- Step 1: Devedor e Credito ----
  function renderStep1() {
    const persons = (personsQuery.data?.items ?? personsQuery.data ?? []) as Record<string, any>[];

    return (
      <div className="space-y-6">
        {/* Devedor Section */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2A2A2A]">
              Devedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Person search */}
            {!isNewPerson && !devedor.existing_person_id && (
              <div className="space-y-2">
                <Label className="text-sm text-[#666666]">
                  Buscar pessoa cadastrada
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#999999]" />
                  <Input
                    placeholder="Buscar por nome ou CPF/CNPJ..."
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    className="pl-10 bg-[#F2F2F2] border-[#E5E5E5]"
                  />
                </div>
                {personSearch.length >= 2 && persons.length > 0 && (
                  <div className="rounded-md border border-[#E5E5E5] bg-white max-h-40 overflow-y-auto">
                    {persons.map((person: Record<string, any>) => (
                      <button
                        key={person.id}
                        onClick={() => handleSelectPerson(person)}
                        className="w-full text-left px-3 py-2 hover:bg-[#F2F2F2] text-sm flex items-center justify-between border-b border-[#F2F2F2] last:border-0"
                      >
                        <span className="font-medium text-[#2A2A2A]">
                          {person.nome || person.razao_social}
                        </span>
                        <span className="text-[#999999] text-xs">
                          {person.cpf_cnpj}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {personSearch.length >= 2 && persons.length === 0 && !personsQuery.isLoading && (
                  <p className="text-xs text-[#999999]">
                    Nenhuma pessoa encontrada.
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewPerson(true)}
                  className="text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  Cadastrar novo devedor
                </Button>
              </div>
            )}

            {/* Selected person or new person form */}
            {(devedor.existing_person_id || isNewPerson) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#999999] uppercase tracking-wide">
                    {devedor.existing_person_id ? "Pessoa selecionada" : "Novo devedor"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDevedor({
                        existing_person_id: null,
                        nome: "",
                        cpf_cnpj: "",
                        tipo: "PF",
                        endereco: "",
                        telefone: "",
                        email: "",
                        atividade: "",
                        razao_social: "",
                        cnae: "",
                        socios: "",
                      });
                      setIsNewPerson(false);
                    }}
                    className="text-xs text-[#999999]"
                  >
                    <X className="size-3 mr-1" />
                    Limpar
                  </Button>
                </div>

                {/* Tipo PF/PJ */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={devedor.tipo === "PF" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDevedor((p) => ({ ...p, tipo: "PF" }))}
                    className={
                      devedor.tipo === "PF"
                        ? "bg-[#C9A961] text-white hover:bg-[#b89950]"
                        : ""
                    }
                  >
                    Pessoa Fisica
                  </Button>
                  <Button
                    type="button"
                    variant={devedor.tipo === "PJ" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDevedor((p) => ({ ...p, tipo: "PJ" }))}
                    className={
                      devedor.tipo === "PJ"
                        ? "bg-[#C9A961] text-white hover:bg-[#b89950]"
                        : ""
                    }
                  >
                    Pessoa Juridica
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">Nome *</Label>
                    <Input
                      value={devedor.nome}
                      onChange={(e) =>
                        setDevedor((p) => ({ ...p, nome: e.target.value }))
                      }
                      placeholder="Nome completo"
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                      readOnly={!!devedor.existing_person_id}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">
                      {devedor.tipo === "PJ" ? "CNPJ *" : "CPF *"}
                    </Label>
                    <Input
                      value={devedor.cpf_cnpj}
                      onChange={(e) =>
                        setDevedor((p) => ({ ...p, cpf_cnpj: e.target.value }))
                      }
                      placeholder={devedor.tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                      readOnly={!!devedor.existing_person_id}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">Endereco</Label>
                    <Input
                      value={devedor.endereco}
                      onChange={(e) =>
                        setDevedor((p) => ({ ...p, endereco: e.target.value }))
                      }
                      placeholder="Endereco completo"
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">Telefone</Label>
                    <Input
                      value={devedor.telefone}
                      onChange={(e) =>
                        setDevedor((p) => ({ ...p, telefone: e.target.value }))
                      }
                      placeholder="(00) 00000-0000"
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">E-mail</Label>
                    <Input
                      value={devedor.email}
                      onChange={(e) =>
                        setDevedor((p) => ({ ...p, email: e.target.value }))
                      }
                      placeholder="email@exemplo.com"
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">Atividade</Label>
                    <Input
                      value={devedor.atividade}
                      onChange={(e) =>
                        setDevedor((p) => ({ ...p, atividade: e.target.value }))
                      }
                      placeholder="Ramo de atividade"
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                    />
                  </div>
                </div>

                {/* PJ extra fields */}
                {devedor.tipo === "PJ" && (
                  <div className="space-y-3 border-t border-[#E5E5E5] pt-3 mt-2">
                    <p className="text-xs font-medium text-[#999999] uppercase tracking-wide">
                      Informacoes da pessoa juridica
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-[#666666]">
                          Razao Social
                        </Label>
                        <Input
                          value={devedor.razao_social}
                          onChange={(e) =>
                            setDevedor((p) => ({
                              ...p,
                              razao_social: e.target.value,
                            }))
                          }
                          placeholder="Razao social completa"
                          className="bg-[#F2F2F2] border-[#E5E5E5]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#666666]">CNAE</Label>
                        <Input
                          value={devedor.cnae}
                          onChange={(e) =>
                            setDevedor((p) => ({ ...p, cnae: e.target.value }))
                          }
                          placeholder="Codigo CNAE"
                          className="bg-[#F2F2F2] border-[#E5E5E5]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#666666]">
                        Socios (nomes separados por virgula)
                      </Label>
                      <Textarea
                        value={devedor.socios}
                        onChange={(e) =>
                          setDevedor((p) => ({ ...p, socios: e.target.value }))
                        }
                        placeholder="Ex: Joao da Silva, Maria Oliveira"
                        className="bg-[#F2F2F2] border-[#E5E5E5] min-h-[60px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tipo do Caso + Processo */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2A2A2A]">
              Tipo do Caso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Tipo de caso *
                </Label>
                <Select value={tipoCaso} onValueChange={setTipoCaso}>
                  <SelectTrigger className="w-full bg-[#F2F2F2] border-[#E5E5E5]">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Processo vinculado (opcional)
                </Label>
                <Input
                  value={processoVinculado}
                  onChange={(e) => setProcessoVinculado(e.target.value)}
                  placeholder="NNNNNNN-DD.AAAA.J.TR.OOOO"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Titulo */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2A2A2A]">
              Titulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Tipo</Label>
                <Select
                  value={titulo.tipo}
                  onValueChange={(v) => setTitulo((p) => ({ ...p, tipo: v }))}
                >
                  <SelectTrigger className="w-full bg-[#F2F2F2] border-[#E5E5E5]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TITULO_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Numero</Label>
                <Input
                  value={titulo.numero}
                  onChange={(e) =>
                    setTitulo((p) => ({ ...p, numero: e.target.value }))
                  }
                  placeholder="Numero do titulo"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Vencimento</Label>
                <Input
                  type="date"
                  value={titulo.data_vencimento}
                  onChange={(e) =>
                    setTitulo((p) => ({
                      ...p,
                      data_vencimento: e.target.value,
                    }))
                  }
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Prescricao</Label>
                <Input
                  type="date"
                  value={titulo.data_prescricao}
                  onChange={(e) =>
                    setTitulo((p) => ({
                      ...p,
                      data_prescricao: e.target.value,
                    }))
                  }
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2A2A2A]">
              Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Valor original *
                </Label>
                <Input
                  value={valores.valor_original}
                  onChange={(e) =>
                    setValores((p) => ({
                      ...p,
                      valor_original: e.target.value,
                    }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Correcao monetaria
                </Label>
                <Input
                  value={valores.correcao_monetaria}
                  onChange={(e) =>
                    setValores((p) => ({
                      ...p,
                      correcao_monetaria: e.target.value,
                    }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Juros</Label>
                <Input
                  value={valores.juros}
                  onChange={(e) =>
                    setValores((p) => ({ ...p, juros: e.target.value }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Multa art. 523
                  {tipoCaso === "CUMPRIMENTO_SENTENCA" && (
                    <span className="ml-1 text-[#C9A961]">(10% auto)</span>
                  )}
                </Label>
                <Input
                  value={valores.multa_523}
                  onChange={(e) =>
                    setValores((p) => ({ ...p, multa_523: e.target.value }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                  readOnly={tipoCaso === "CUMPRIMENTO_SENTENCA"}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Honorarios</Label>
                <Input
                  value={valores.honorarios}
                  onChange={(e) =>
                    setValores((p) => ({ ...p, honorarios: e.target.value }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Custas</Label>
                <Input
                  value={valores.custas}
                  onChange={(e) =>
                    setValores((p) => ({ ...p, custas: e.target.value }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F2F2F2] border border-[#E5E5E5]">
              <span className="text-sm font-semibold text-[#2A2A2A]">
                Total
              </span>
              <span className="text-lg font-bold text-[#C9A961]">
                {formatCurrency(totalValor)}
              </span>
            </div>

            {/* Calculadora inline */}
            <div className="border border-[#E5E5E5] rounded-lg">
              <button
                type="button"
                onClick={() => setShowCalculadora(!showCalculadora)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-[#2A2A2A] hover:bg-[#F2F2F2] rounded-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="size-4 text-[#C9A961]" />
                  Calculadora de atualizacao
                </span>
                {showCalculadora ? (
                  <ChevronUp className="size-4 text-[#999999]" />
                ) : (
                  <ChevronDown className="size-4 text-[#999999]" />
                )}
              </button>

              {showCalculadora && (
                <div className="p-3 border-t border-[#E5E5E5] space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-[#666666]">
                        Valor original
                      </Label>
                      <Input
                        value={calculadora.valor_base}
                        onChange={(e) =>
                          setCalculadora((p) => ({
                            ...p,
                            valor_base: e.target.value,
                          }))
                        }
                        placeholder="0,00"
                        className="bg-[#F2F2F2] border-[#E5E5E5]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#666666]">
                        Data base
                      </Label>
                      <Input
                        type="date"
                        value={calculadora.data_base}
                        onChange={(e) =>
                          setCalculadora((p) => ({
                            ...p,
                            data_base: e.target.value,
                          }))
                        }
                        className="bg-[#F2F2F2] border-[#E5E5E5]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#666666]">
                        Indice de correcao
                      </Label>
                      <Select
                        value={calculadora.indice_correcao}
                        onValueChange={(v) =>
                          setCalculadora((p) => ({ ...p, indice_correcao: v }))
                        }
                      >
                        <SelectTrigger className="w-full bg-[#F2F2F2] border-[#E5E5E5]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CORRECAO_INDICES.map((idx) => (
                            <SelectItem key={idx.value} value={idx.value}>
                              {idx.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#666666]">
                        Juros % a.m.
                      </Label>
                      <Input
                        value={calculadora.juros_pct}
                        onChange={(e) =>
                          setCalculadora((p) => ({
                            ...p,
                            juros_pct: e.target.value,
                          }))
                        }
                        placeholder="1,00"
                        className="bg-[#F2F2F2] border-[#E5E5E5]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#666666]">
                        Multa %
                      </Label>
                      <Input
                        value={calculadora.multa_pct}
                        onChange={(e) =>
                          setCalculadora((p) => ({
                            ...p,
                            multa_pct: e.target.value,
                          }))
                        }
                        placeholder="10"
                        className="bg-[#F2F2F2] border-[#E5E5E5]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCalculate}
                      className="bg-[#C9A961] text-white hover:bg-[#b89950]"
                    >
                      <Calculator className="size-3 mr-1" />
                      Calcular
                    </Button>
                    {calculadora.resultado !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#666666]">
                          Resultado:
                        </span>
                        <span className="text-sm font-bold text-[#C9A961]">
                          {formatCurrency(calculadora.resultado)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Prioridade e Responsavel */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2A2A2A]">
              Atribuicao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger className="w-full bg-[#F2F2F2] border-[#E5E5E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Responsavel</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger className="w-full bg-[#F2F2F2] border-[#E5E5E5]">
                    <SelectValue placeholder="Selecionar responsavel" />
                  </SelectTrigger>
                  <SelectContent>
                    {((usersQuery.data ?? []) as Record<string, any>[]).map(
                      (user: Record<string, any>) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Step 2: AI Analysis ----
  function renderStep2() {
    if (aiSkipped) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="size-16 rounded-full bg-[#F2F2F2] flex items-center justify-center">
            <Sparkles className="size-8 text-[#999999]" />
          </div>
          <p className="text-sm text-[#666666]">Analise IA pulada.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAiSkipped(false);
              runAiAnalysis();
            }}
          >
            Executar analise agora
          </Button>
        </div>
      );
    }

    if (aiLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="relative">
            <div className="size-16 rounded-full bg-gradient-to-br from-[#C9A961] to-[#b89950] flex items-center justify-center animate-pulse">
              <Search className="size-8 text-white" />
            </div>
            <Loader2 className="absolute -top-1 -right-1 size-6 text-[#C9A961] animate-spin" />
          </div>
          <p className="text-sm font-medium text-[#2A2A2A]">
            Analisando caso com IA...
          </p>
          <p className="text-xs text-[#999999]">
            Avaliando viabilidade, riscos e estrategia
          </p>
          <div className="w-48">
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      );
    }

    if (aiError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="size-16 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="size-8 text-red-500" />
          </div>
          <p className="text-sm text-red-600">{aiError}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runAiAnalysis}
            >
              Tentar novamente
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAiSkipped(true)}
              className="text-[#999999]"
            >
              Pular Analise IA
            </Button>
          </div>
        </div>
      );
    }

    if (!aiAnalysis) return null;

    return (
      <div className="space-y-6">
        {/* Score Gauge */}
        <Card className="border-[#E5E5E5]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-3">
              <p className="text-xs font-medium text-[#999999] uppercase tracking-wide">
                Score Inicial de Recuperabilidade
              </p>
              <div className="relative size-32">
                <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#E5E5E5"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={getScoreColor(aiAnalysis.score)}
                    strokeWidth="10"
                    strokeDasharray={`${(aiAnalysis.score / 100) * 314.16} 314.16`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: getScoreColor(aiAnalysis.score) }}
                  >
                    {aiAnalysis.score}
                  </span>
                  <span className="text-[10px] text-[#999999]">/ 100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategy */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#2A2A2A] flex items-center gap-2">
              <Sparkles className="size-4 text-[#C9A961]" />
              Estrategia Recomendada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#2A2A2A] leading-relaxed">
              {aiAnalysis.estrategia}
            </p>
          </CardContent>
        </Card>

        {/* Risks */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#2A2A2A] flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#EA580C]" />
              Riscos Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiAnalysis.riscos.map((risco, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2 rounded-md bg-[#F2F2F2]"
                >
                  <Badge
                    className="shrink-0 text-[10px] text-white mt-0.5"
                    style={{ backgroundColor: getSeverityColor(risco.severidade) }}
                  >
                    {risco.severidade}
                  </Badge>
                  <p className="text-sm text-[#2A2A2A]">{risco.descricao}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#2A2A2A] flex items-center gap-2">
              <Clock className="size-4 text-[#C9A961]" />
              Timeline Sugerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiAnalysis.timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-6 rounded-full bg-[#C9A961] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    {idx < aiAnalysis.timeline.length - 1 && (
                      <div className="w-px h-6 bg-[#E5E5E5]" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      {item.acao}
                    </p>
                    <p className="text-xs text-[#999999]">
                      {item.data_estimada}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accept toggle */}
        <Card className="border-[#C9A961] border-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-[#2A2A2A]">
                  Aceitar Recomendacao
                </p>
                <p className="text-xs text-[#999999]">
                  Preenche automaticamente score e estrategia no caso
                </p>
              </div>
              <Switch
                checked={acceptAiRecommendation}
                onCheckedChange={setAcceptAiRecommendation}
              />
            </div>

            {!acceptAiRecommendation && (
              <div className="mt-4 pt-3 border-t border-[#E5E5E5] space-y-3">
                <p className="text-xs text-[#999999]">
                  Editar valores manualmente:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">
                      Score (0-100)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={overrideScore}
                      onChange={(e) => setOverrideScore(e.target.value)}
                      className="bg-[#F2F2F2] border-[#E5E5E5]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#666666]">Estrategia</Label>
                    <Textarea
                      value={overrideStrategy}
                      onChange={(e) => setOverrideStrategy(e.target.value)}
                      className="bg-[#F2F2F2] border-[#E5E5E5] min-h-[60px]"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skip button */}
        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAiSkipped(true)}
            className="text-[#999999] text-xs"
          >
            Pular Analise IA
          </Button>
        </div>
      </div>
    );
  }

  // ---- Step 3: Joint Debtors ----
  function renderStep3() {
    return (
      <div className="space-y-6">
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[#2A2A2A] flex items-center gap-2">
                <Users className="size-4 text-[#C9A961]" />
                Corresponsaveis
              </CardTitle>
              <div className="flex gap-2">
                {devedor.tipo === "PJ" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleImportSocios}
                    disabled={importingSocios}
                    className="text-xs"
                  >
                    {importingSocios ? (
                      <Loader2 className="size-3 mr-1 animate-spin" />
                    ) : (
                      <Users className="size-3 mr-1" />
                    )}
                    Importar Socios
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddDebtor(true)}
                  className="bg-[#C9A961] text-white hover:bg-[#b89950] text-xs"
                >
                  <Plus className="size-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jointDebtors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-[#999999]">
                  Nenhum corresponsavel adicionado.
                </p>
                <p className="text-xs text-[#999999] mt-1">
                  Voce pode pular esta etapa se nao houver corresponsaveis.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#E5E5E5]">
                    <TableHead className="text-xs text-[#666666]">
                      Nome
                    </TableHead>
                    <TableHead className="text-xs text-[#666666]">
                      CPF/CNPJ
                    </TableHead>
                    <TableHead className="text-xs text-[#666666]">
                      Tipo
                    </TableHead>
                    <TableHead className="text-xs text-[#666666]">
                      Fundamentacao
                    </TableHead>
                    <TableHead className="text-xs text-[#666666]">
                      Patrimonio Est.
                    </TableHead>
                    <TableHead className="text-xs text-[#666666] w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jointDebtors.map((debtor) => (
                    <TableRow key={debtor.id} className="border-[#E5E5E5]">
                      <TableCell className="text-sm font-medium text-[#2A2A2A]">
                        {debtor.nome}
                      </TableCell>
                      <TableCell className="text-sm text-[#666666]">
                        {debtor.cpf_cnpj || "--"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-[#F2F2F2] text-[#666666]"
                        >
                          {JOINT_DEBTOR_TYPES.find((t) => t.value === debtor.tipo)?.label ?? debtor.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-[#666666] max-w-[150px] truncate">
                        {debtor.fundamentacao || "--"}
                      </TableCell>
                      <TableCell className="text-sm text-[#666666]">
                        {debtor.patrimonio_estimado
                          ? formatCurrency(parseNumber(debtor.patrimonio_estimado))
                          : "--"}
                      </TableCell>
                      <TableCell>
                        {debtor.tipo !== "DEVEDOR_PRINCIPAL" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveJointDebtor(debtor.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add debtor dialog */}
        <Dialog open={showAddDebtor} onOpenChange={setShowAddDebtor}>
          <DialogContent className="sm:max-w-md bg-[#FAFAFA]">
            <DialogHeader>
              <DialogTitle className="text-[#2A2A2A]">
                Adicionar Corresponsavel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#666666]">Nome *</Label>
                  <Input
                    value={newDebtor.nome}
                    onChange={(e) =>
                      setNewDebtor((p) => ({ ...p, nome: e.target.value }))
                    }
                    placeholder="Nome completo"
                    className="bg-[#F2F2F2] border-[#E5E5E5]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#666666]">CPF/CNPJ</Label>
                  <Input
                    value={newDebtor.cpf_cnpj}
                    onChange={(e) =>
                      setNewDebtor((p) => ({ ...p, cpf_cnpj: e.target.value }))
                    }
                    placeholder="000.000.000-00"
                    className="bg-[#F2F2F2] border-[#E5E5E5]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">Tipo *</Label>
                <Select
                  value={newDebtor.tipo}
                  onValueChange={(v) =>
                    setNewDebtor((p) => ({ ...p, tipo: v }))
                  }
                >
                  <SelectTrigger className="w-full bg-[#F2F2F2] border-[#E5E5E5]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOINT_DEBTOR_TYPES.filter(
                      (t) => t.value !== "DEVEDOR_PRINCIPAL"
                    ).map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Fundamentacao
                </Label>
                <Textarea
                  value={newDebtor.fundamentacao}
                  onChange={(e) =>
                    setNewDebtor((p) => ({
                      ...p,
                      fundamentacao: e.target.value,
                    }))
                  }
                  placeholder="Fundamento juridico para inclusao..."
                  className="bg-[#F2F2F2] border-[#E5E5E5] min-h-[60px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#666666]">
                  Patrimonio estimado (R$)
                </Label>
                <Input
                  value={newDebtor.patrimonio_estimado}
                  onChange={(e) =>
                    setNewDebtor((p) => ({
                      ...p,
                      patrimonio_estimado: e.target.value,
                    }))
                  }
                  placeholder="0,00"
                  className="bg-[#F2F2F2] border-[#E5E5E5]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDebtor(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddJointDebtor}
                  disabled={!newDebtor.nome}
                  className="bg-[#C9A961] text-white hover:bg-[#b89950]"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---- Step 4: Monitoring ----
  function renderStep4() {
    const enabledCount = monitorings.filter((m) => m.enabled).length;

    return (
      <div className="space-y-6">
        <Card className="border-[#E5E5E5]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2A2A2A] flex items-center gap-2">
              <Eye className="size-4 text-[#C9A961]" />
              Monitoramento Inicial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-[#999999]">
              Selecione quais monitoramentos ativar automaticamente para este
              caso.
            </p>
            <div className="space-y-3">
              {monitorings.map((m) => (
                <div
                  key={m.key}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    m.enabled
                      ? "border-[#C9A961] bg-[#C9A961]/5"
                      : "border-[#E5E5E5] bg-[#F2F2F2]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={m.enabled}
                      onCheckedChange={() => handleToggleMonitoring(m.key)}
                    />
                    <span
                      className={`text-sm ${
                        m.enabled
                          ? "text-[#2A2A2A] font-medium"
                          : "text-[#999999]"
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                  {m.enabled && (
                    <Select
                      value={m.frequency}
                      onValueChange={(v) =>
                        handleMonitoringFrequency(m.key, v)
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs bg-white border-[#E5E5E5]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCY_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary card */}
        <Card className="border-[#C9A961] border-2 bg-[#C9A961]/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#2A2A2A] flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#16A34A]" />
              Resumo do Caso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="text-[#999999]">Devedor:</span>{" "}
                  <span className="font-medium text-[#2A2A2A]">
                    {devedor.nome}
                  </span>
                </div>
                <div>
                  <span className="text-[#999999]">CPF/CNPJ:</span>{" "}
                  <span className="font-medium text-[#2A2A2A]">
                    {devedor.cpf_cnpj}
                  </span>
                </div>
                <div>
                  <span className="text-[#999999]">Tipo:</span>{" "}
                  <span className="font-medium text-[#2A2A2A]">
                    {CASE_TYPES.find((c) => c.value === tipoCaso)?.label ?? tipoCaso}
                  </span>
                </div>
                <div>
                  <span className="text-[#999999]">Valor total:</span>{" "}
                  <span className="font-bold text-[#C9A961]">
                    {formatCurrency(totalValor)}
                  </span>
                </div>
                <div>
                  <span className="text-[#999999]">Prioridade:</span>{" "}
                  <Badge
                    className="text-[10px] text-white ml-1"
                    style={{
                      backgroundColor:
                        PRIORITY_OPTIONS.find((p) => p.value === prioridade)
                          ?.color ?? "#999999",
                    }}
                  >
                    {PRIORITY_OPTIONS.find((p) => p.value === prioridade)
                      ?.label ?? prioridade}
                  </Badge>
                </div>
                {!aiSkipped && aiAnalysis && (
                  <div>
                    <span className="text-[#999999]">Score IA:</span>{" "}
                    <span
                      className="font-bold"
                      style={{
                        color: getScoreColor(
                          acceptAiRecommendation
                            ? aiAnalysis.score
                            : parseInt(overrideScore) || 0
                        ),
                      }}
                    >
                      {acceptAiRecommendation
                        ? aiAnalysis.score
                        : overrideScore || "--"}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[#999999]">Corresponsaveis:</span>{" "}
                  <span className="font-medium text-[#2A2A2A]">
                    {jointDebtors.filter((d) => d.tipo !== "DEVEDOR_PRINCIPAL")
                      .length || "Nenhum"}
                  </span>
                </div>
                <div>
                  <span className="text-[#999999]">Monitoramentos:</span>{" "}
                  <span className="font-medium text-[#2A2A2A]">
                    {enabledCount} ativos
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-2xl lg:max-w-3xl max-h-[85vh] bg-[#FAFAFA] p-0 flex flex-col"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-[#E5E5E5]">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-bold text-[#2A2A2A]">
              Novo Caso de Recuperacao de Credito
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#999999] hover:text-[#2A2A2A]"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, idx) => {
              const stepNum = idx + 1;
              const isActive = stepNum === currentStep;
              const isComplete = stepNum < currentStep;

              return (
                <div key={stepNum} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        isActive
                          ? "bg-[#C9A961] text-white"
                          : isComplete
                            ? "bg-[#16A34A] text-white"
                            : "bg-[#E5E5E5] text-[#999999]"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        stepNum
                      )}
                    </div>
                    <span
                      className={`text-[10px] text-center leading-tight ${
                        isActive
                          ? "text-[#C9A961] font-semibold"
                          : isComplete
                            ? "text-[#16A34A]"
                            : "text-[#999999]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mt-[-14px] ${
                        isComplete ? "bg-[#16A34A]" : "bg-[#E5E5E5]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content area - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#999999]">
              Etapa {currentStep} de {STEP_LABELS.length}
            </span>
            <div className="flex gap-1">
              {STEP_LABELS.map((_, idx) => (
                <div
                  key={idx}
                  className={`size-1.5 rounded-full ${
                    idx + 1 <= currentStep ? "bg-[#C9A961]" : "bg-[#E5E5E5]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-[#999999]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              disabled={!canAdvance() || createCaseMutation.isPending}
              className="bg-[#C9A961] text-white hover:bg-[#b89950] min-w-[120px]"
            >
              {createCaseMutation.isPending ? (
                <>
                  <Loader2 className="size-3 mr-1 animate-spin" />
                  Criando...
                </>
              ) : currentStep === 4 ? (
                <>
                  <Shield className="size-3 mr-1" />
                  Criar Caso
                </>
              ) : (
                "Avancar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
