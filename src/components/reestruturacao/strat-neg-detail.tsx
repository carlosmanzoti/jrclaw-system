"use client";

import React, { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  STRAT_NEG_PHASE_LABELS,
  STRAT_NEG_PHASE_COLORS,
  STRAT_NEG_STATUS_LABELS,
  STRAT_NEG_STATUS_COLORS,
  STRAT_NEG_PRIORITY_LABELS,
  STRAT_NEG_PRIORITY_COLORS,
  TKI_PROFILE_LABELS,
  TKI_PROFILE_COLORS,
  SENTIMENT_LABELS,
  SENTIMENT_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_CHANNEL_LABELS,
  PROPOSAL_ORIGIN_LABELS,
  PROPOSAL_STATUS_LABELS,
  CONCESSION_DIRECTION_LABELS,
  ROUND_STATUS_LABELS,
  formatBigIntBRL,
  toReaisBigInt,
} from "@/lib/strat-neg-constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Users,
  Target,
  Brain,
  Handshake,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  Sparkles,
  Scale,
  Shield,
  Swords,
  Eye,
  Gamepad2,
  BarChart3,
  Crosshair,
  CircleDot,
  ArrowRightLeft,
  FolderOpen,
} from "lucide-react";
import { NegotiationAssistant } from "./negotiation-assistant";
import { NegAIBar } from "./neg-ai-bar";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StratNegDetailProps {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function StratNegDetail({ params }: StratNegDetailProps) {
  const { id } = React.use(params);

  const { data: negotiation, isLoading, refetch } =
    trpc.stratNeg.negotiations.getById.useQuery({ id });

  const createEventMutation = trpc.stratNeg.events.create.useMutation({
    onSuccess: () => {
      refetch();
      resetEventForm();
      // Auto-analyze event with AI (fire and forget)
      fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "event", negotiationId: id }),
      }).catch(() => {});
    },
  });

  const createProposalMutation = trpc.stratNeg.proposals.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowProposalDialog(false);
      resetProposalForm();
      // Auto-analyze proposal with AI (fire and forget)
      fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "proposal", negotiationId: id }),
      }).catch(() => {});
    },
  });

  const createConcessionMutation = trpc.stratNeg.concessions.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowConcessionDialog(false);
      resetConcessionForm();
      // Auto-analyze concession with AI (fire and forget)
      fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "concession", negotiationId: id }),
      }).catch(() => {});
    },
  });

  const createOneSheetMutation = trpc.stratNeg.oneSheets.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowOneSheetDialog(false);
      resetOneSheetForm();
    },
  });

  // ---- Event form state ----
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTipo, setEventTipo] = useState("");
  const [eventCanal, setEventCanal] = useState("");
  const [eventDescricao, setEventDescricao] = useState("");
  const [eventValor, setEventValor] = useState("");
  const [eventSentimento, setEventSentimento] = useState("");

  function resetEventForm() {
    setShowEventForm(false);
    setEventTipo("");
    setEventCanal("");
    setEventDescricao("");
    setEventValor("");
    setEventSentimento("");
  }

  function handleSubmitEvent() {
    if (!eventTipo || !eventDescricao) return;
    createEventMutation.mutate({
      negotiation_id: id,
      data: new Date(),
      tipo: eventTipo,
      canal: eventCanal || undefined,
      descricao: eventDescricao,
      valor_mencionado: eventValor ? parseFloat(eventValor) : undefined,
      sentimento: eventSentimento || undefined,
    });
  }

  // ---- Proposal dialog state ----
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [proposalTipo, setProposalTipo] = useState("DEVEDOR");
  const [proposalValorPrincipal, setProposalValorPrincipal] = useState("");
  const [proposalHaircut, setProposalHaircut] = useState("");
  const [proposalTaxaJuros, setProposalTaxaJuros] = useState("");
  const [proposalCarencia, setProposalCarencia] = useState("");
  const [proposalPrazo, setProposalPrazo] = useState("");
  const [proposalParcelas, setProposalParcelas] = useState("");
  const [proposalDebtEquity, setProposalDebtEquity] = useState(false);
  const [proposalWarrants, setProposalWarrants] = useState(false);
  const [proposalPik, setProposalPik] = useState(false);
  const [proposalContingent, setProposalContingent] = useState("");
  const [proposalNpvDevedor, setProposalNpvDevedor] = useState("");
  const [proposalNpvCredor, setProposalNpvCredor] = useState("");
  const [proposalRecoveryRate, setProposalRecoveryRate] = useState("");
  const [proposalJustificativa, setProposalJustificativa] = useState("");
  const [proposalStatus, setProposalStatus] = useState("RASCUNHO");

  function resetProposalForm() {
    setProposalTipo("DEVEDOR");
    setProposalValorPrincipal("");
    setProposalHaircut("");
    setProposalTaxaJuros("");
    setProposalCarencia("");
    setProposalPrazo("");
    setProposalParcelas("");
    setProposalDebtEquity(false);
    setProposalWarrants(false);
    setProposalPik(false);
    setProposalContingent("");
    setProposalNpvDevedor("");
    setProposalNpvCredor("");
    setProposalRecoveryRate("");
    setProposalJustificativa("");
    setProposalStatus("RASCUNHO");
  }

  function handleSubmitProposal() {
    if (!proposalValorPrincipal) return;
    createProposalMutation.mutate({
      negotiation_id: id,
      tipo: proposalTipo,
      data: new Date(),
      valor_principal: parseFloat(proposalValorPrincipal),
      haircut_pct: proposalHaircut ? parseFloat(proposalHaircut) : undefined,
      taxa_juros: proposalTaxaJuros ? parseFloat(proposalTaxaJuros) : undefined,
      carencia_meses: proposalCarencia ? parseInt(proposalCarencia) : undefined,
      prazo_pagamento_meses: proposalPrazo ? parseInt(proposalPrazo) : undefined,
      parcelas: proposalParcelas ? parseInt(proposalParcelas) : undefined,
      debt_equity_swap: proposalDebtEquity,
      warrants: proposalWarrants,
      pik_toggle: proposalPik,
      contingent_value: !!proposalContingent,
      npv_devedor: proposalNpvDevedor ? parseFloat(proposalNpvDevedor) : undefined,
      npv_credor: proposalNpvCredor ? parseFloat(proposalNpvCredor) : undefined,
      recovery_rate: proposalRecoveryRate ? parseFloat(proposalRecoveryRate) : undefined,
      justificativa: proposalJustificativa || undefined,
      status: proposalStatus,
    });
  }

  // ---- Concession dialog state ----
  const [showConcessionDialog, setShowConcessionDialog] = useState(false);
  const [concessionDirecao, setConcessionDirecao] = useState("DADA");
  const [concessionDescricao, setConcessionDescricao] = useState("");
  const [concessionValor, setConcessionValor] = useState("");
  const [concessionJustificativa, setConcessionJustificativa] = useState("");
  const [concessionContrapartida, setConcessionContrapartida] = useState("");

  function resetConcessionForm() {
    setConcessionDirecao("DADA");
    setConcessionDescricao("");
    setConcessionValor("");
    setConcessionJustificativa("");
    setConcessionContrapartida("");
  }

  function handleSubmitConcession() {
    if (!concessionDescricao || !concessionJustificativa) return;
    createConcessionMutation.mutate({
      negotiation_id: id,
      data: new Date(),
      direcao: concessionDirecao,
      descricao: concessionDescricao,
      valor_impacto: concessionValor ? parseFloat(concessionValor) : undefined,
      justificativa: concessionJustificativa,
      contrapartida: concessionContrapartida || undefined,
    });
  }

  // ---- One-Sheet dialog state (Voss model) ----
  const [showOneSheetDialog, setShowOneSheetDialog] = useState(false);
  const [oneSheetObjetivo, setOneSheetObjetivo] = useState("");
  const [oneSheetResumo, setOneSheetResumo] = useState("");
  const [oneSheetLabels, setOneSheetLabels] = useState("");
  const [oneSheetAudit, setOneSheetAudit] = useState("");
  const [oneSheetQuestions, setOneSheetQuestions] = useState("");
  const [oneSheetBlackSwans, setOneSheetBlackSwans] = useState("");

  function resetOneSheetForm() {
    setOneSheetObjetivo("");
    setOneSheetResumo("");
    setOneSheetLabels("");
    setOneSheetAudit("");
    setOneSheetQuestions("");
    setOneSheetBlackSwans("");
  }

  function handleSubmitOneSheet() {
    if (!oneSheetObjetivo || !oneSheetResumo) return;
    createOneSheetMutation.mutate({
      negotiation_id: id,
      objetivo_especifico: oneSheetObjetivo,
      resumo_situacao: oneSheetResumo,
      labels_preparados: oneSheetLabels.split("\n").filter(Boolean),
      accusation_audit: oneSheetAudit.split("\n").filter(Boolean),
      calibrated_questions: oneSheetQuestions.split("\n").filter(Boolean),
      black_swans_investigar: oneSheetBlackSwans ? oneSheetBlackSwans.split("\n").filter(Boolean) : undefined,
    });
  }

  // ---- Strategy card expand state ----
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  function toggleStrategy(key: string) {
    setExpandedStrategy((prev) => (prev === key ? null : key));
  }

  // ---- One-sheet expand state ----
  const [expandedOneSheet, setExpandedOneSheet] = useState<string | null>(null);
  function toggleOneSheet(sheetId: string) {
    setExpandedOneSheet((prev) => (prev === sheetId ? null : sheetId));
  }

  // =========================================================================
  // Loading
  // =========================================================================

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header skeleton */}
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-96" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
          {/* ZOPA bar skeleton */}
          <Skeleton className="h-14 w-full rounded-lg" />
          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-full" />
          {/* Content skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!negotiation) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center p-12">
          <p className="text-[#666666]">Negociação não encontrada.</p>
          <Link href="/reestruturacao">
            <Button variant="outline" className="mt-4">
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Derived data
  // =========================================================================

  const neg = negotiation as Record<string, any>;
  const eventos = (neg.eventos ?? []) as Record<string, any>[];
  const rodadas = (neg.rodadas ?? []) as Record<string, any>[];
  const propostas = (neg.propostas ?? []) as Record<string, any>[];
  const concessoes = (neg.concessoes ?? []) as Record<string, any>[];
  const oneSheets = (neg.one_sheets ?? []) as Record<string, any>[];

  const fase = (neg.fase ?? "") as string;
  const status = (neg.status ?? "") as string;
  const prioridade = (neg.prioridade ?? "") as string;

  // ZOPA calculations
  const zopaMin = neg.zopa_min != null ? Number(neg.zopa_min) : null;
  const zopaMax = neg.zopa_max != null ? Number(neg.zopa_max) : null;
  const valorCredito = neg.valor_credito != null ? Number(neg.valor_credito) : 0;
  const propostaAtual = neg.valor_pretendido != null ? Number(neg.valor_pretendido) : null;
  const pedidoCredor = neg.valor_teto != null ? Number(neg.valor_teto) : null;

  // Group events by rodada
  const rodadaMap = new Map<string, Record<string, any>>();
  for (const r of rodadas) {
    rodadaMap.set(r.id, r);
  }

  const eventsByRound = new Map<string | null, Record<string, any>[]>();
  for (const ev of eventos) {
    const roundId = ev.round_id ?? null;
    if (!eventsByRound.has(roundId)) {
      eventsByRound.set(roundId, []);
    }
    eventsByRound.get(roundId)!.push(ev);
  }

  // Concession summary (inline calculation)
  let dadasCount = 0;
  let dadasTotal = 0;
  let recebidasCount = 0;
  let recebidasTotal = 0;
  for (const c of concessoes) {
    const dir = c.direcao as string;
    const impacto = c.valor_impacto != null ? Number(c.valor_impacto) : 0;
    if (dir === "DADA") {
      dadasCount++;
      dadasTotal += impacto;
    } else if (dir === "RECEBIDA") {
      recebidasCount++;
      recebidasTotal += impacto;
    }
  }
  const concessionRatio =
    recebidasTotal > 0
      ? (dadasTotal / recebidasTotal).toFixed(1)
      : dadasCount > 0
        ? "Inf"
        : "0";

  // Proposal convergence data (devedor and credor proposals over time)
  const devedorProposals = propostas
    .filter((p: Record<string, any>) => p.tipo === "DEVEDOR")
    .sort(
      (a: Record<string, any>, b: Record<string, any>) =>
        new Date(a.data).getTime() - new Date(b.data).getTime()
    );
  const credorProposals = propostas
    .filter((p: Record<string, any>) => p.tipo === "CREDOR")
    .sort(
      (a: Record<string, any>, b: Record<string, any>) =>
        new Date(a.data).getTime() - new Date(b.data).getTime()
    );

  // Strategy fields (may be null/undefined)
  const harvardInteressesDevedor = (neg.interesses_devedor ?? []) as string[];
  const harvardInteressesCredor = (neg.interesses_credor ?? []) as string[];
  const harvardBatnaDevedor = neg.batna_score_devedor as number | null | undefined;
  const harvardBatnaCredor = neg.batna_score_credor as number | null | undefined;

  const tkiPerfil = (neg.tki_perfil_credor ?? "") as string;
  const tkiAssertividade = neg.tki_assertividade as number | null | undefined;
  const tkiCooperatividade = neg.tki_cooperatividade as number | null | undefined;
  const tkiEstrategia = (neg.estrategia_recomendada ?? "") as string;

  const vossTipo = (neg.voss_tipo_negociador ?? "") as string;
  const vossBlackSwans = (neg.black_swans ?? []) as Record<string, any>[];
  const vossOneSheetCount = oneSheets.length;

  const campMissao = (neg.camp_missao ?? "") as string;
  const campDecisores = (neg.camp_decisores ?? []) as Record<string, any>[];
  const campBudget = neg.camp_budget_score as number | null | undefined;

  const karrassPoder = neg.poder_score as Record<string, any> | null | undefined;

  const gameTipoJogo = (neg.game_tipo_jogo ?? "") as string;
  const gameEquilibrio = (neg.game_equilibrio ?? "") as string;
  const gameCoalicao = (neg.game_coalicao ?? "") as string;
  const gameRiscoHoldout = (neg.game_risco_holdout ?? "") as string;

  // =========================================================================
  // Helpers
  // =========================================================================

  function fmtDate(d: string | Date | null | undefined) {
    if (!d) return "--";
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function fmtDateTime(d: string | Date | null | undefined) {
    if (!d) return "--";
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // =========================================================================
  // AI Analysis handler
  // =========================================================================

  async function handleAnalyzeWithAI() {
    try {
      const res = await fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "health_score", negotiationId: id }),
      });
      if (res.ok) {
        refetch();
      }
    } catch {}
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* ============================================================= */}
        {/* HEADER                                                        */}
        {/* ============================================================= */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Link href="/reestruturacao">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <Badge variant="secondary" className="text-xs font-mono">
                {neg.codigo ?? "--"}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight font-heading">
                {neg.titulo}
              </h1>
              <p className="text-sm text-[#666666]">
                {neg.person?.nome ?? neg.contraparte_nome ?? (neg.tipo ? `Tipo: ${neg.tipo}` : "")}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  className="text-sm"
                  style={{
                    backgroundColor: STRAT_NEG_STATUS_COLORS[status] ?? "#e5e7eb",
                    color: "#fff",
                  }}
                >
                  {STRAT_NEG_STATUS_LABELS[status] ?? status}
                </Badge>
                <Badge
                  className="text-sm"
                  style={{
                    backgroundColor: STRAT_NEG_PHASE_COLORS[fase] ?? "#e5e7eb",
                    color: "#fff",
                  }}
                >
                  {STRAT_NEG_PHASE_LABELS[fase] ?? fase}
                </Badge>
                <Badge
                  className="text-sm"
                  style={{
                    backgroundColor: STRAT_NEG_PRIORITY_COLORS[prioridade] ?? "#e5e7eb",
                    color: "#fff",
                  }}
                >
                  {STRAT_NEG_PRIORITY_LABELS[prioridade] ?? prioridade}
                </Badge>
                {valorCredito > 0 && (
                  <span className="text-sm font-semibold text-[#2A2A2A] ml-2">
                    Crédito: {formatBigIntBRL(neg.valor_credito)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right-side action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEventForm((p) => !p)}
            >
              <Calendar className="size-4 mr-2" />
              Registrar Evento
            </Button>
            <Button
              size="sm"
              onClick={() => setShowProposalDialog(true)}
              className="bg-[#C9A961] text-white hover:bg-[#b89950]"
            >
              <Send className="size-4 mr-2" />
              Nova Proposta
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeWithAI}
            >
              <Sparkles className="size-4 mr-2" />
              Analisar com IA
            </Button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* ZOPA VISUAL BAR                                               */}
        {/* ============================================================= */}
        {zopaMin != null && zopaMax != null && zopaMax > zopaMin && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-[#666666] mb-2">
                ZOPA (Zona de Possível Acordo)
              </p>
              <ZopaBar
                zopaMin={zopaMin}
                zopaMax={zopaMax}
                propostaAtual={propostaAtual}
                pedidoCredor={pedidoCredor}
              />
            </CardContent>
          </Card>
        )}

        {/* ============================================================= */}
        {/* INLINE EVENT FORM                                             */}
        {/* ============================================================= */}
        {showEventForm && (
          <Card className="border-[#C9A961]/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Registrar Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Tipo *</Label>
                  <Select value={eventTipo} onValueChange={setEventTipo}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Canal</Label>
                  <Select value={eventCanal} onValueChange={setEventCanal}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVENT_CHANNEL_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Sentimento</Label>
                  <Select value={eventSentimento} onValueChange={setEventSentimento}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SENTIMENT_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Descrição *</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={eventDescricao}
                  onChange={(e) => setEventDescricao(e.target.value)}
                  placeholder="Descreva o evento..."
                />
              </div>
              <div className="w-48">
                <Label className="text-xs">Valor mencionado (R$)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  value={eventValor}
                  onChange={(e) => setEventValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSubmitEvent}
                  disabled={createEventMutation.isPending || !eventTipo || !eventDescricao}
                  className="bg-[#C9A961] text-white hover:bg-[#b89950]"
                >
                  {createEventMutation.isPending ? "Salvando..." : "Salvar Evento"}
                </Button>
                <Button size="sm" variant="ghost" onClick={resetEventForm}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ============================================================= */}
        {/* AI BAR                                                        */}
        {/* ============================================================= */}
        <NegAIBar
          negotiationId={id}
          healthScore={(negotiation as any)?.health_score}
          healthDetails={(negotiation as any)?.health_score_details}
          probabilityAcordo={(negotiation as any)?.probability_acordo}
          haircutMin={(negotiation as any)?.haircut_estimado_min}
          haircutMax={(negotiation as any)?.haircut_estimado_max}
          aiProximaAcao={(negotiation as any)?.ai_proxima_acao}
          aiLastAnalysis={(negotiation as any)?.ai_last_analysis}
          onRefresh={() => refetch()}
        />

        {/* ============================================================= */}
        {/* TABS                                                          */}
        {/* ============================================================= */}
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="timeline"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A961] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            >
              <Clock className="size-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="propostas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A961] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            >
              <FileText className="size-4 mr-2" />
              Propostas
            </TabsTrigger>
            <TabsTrigger
              value="concessoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A961] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            >
              <ArrowRightLeft className="size-4 mr-2" />
              Concessões
            </TabsTrigger>
            <TabsTrigger
              value="estrategia"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A961] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            >
              <Target className="size-4 mr-2" />
              Estratégia
            </TabsTrigger>
            <TabsTrigger
              value="one-sheets"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A961] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            >
              <Crosshair className="size-4 mr-2" />
              One-Sheets
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#C9A961] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2"
            >
              <FolderOpen className="size-4 mr-2" />
              Documentos
            </TabsTrigger>
          </TabsList>

          {/* =========================================================== */}
          {/* TAB: Timeline                                               */}
          {/* =========================================================== */}
          <TabsContent value="timeline" className="mt-4 space-y-6">
            {/* Rodadas with their events */}
            {rodadas
              .sort((a: Record<string, any>, b: Record<string, any>) => b.numero - a.numero)
              .map((rodada: Record<string, any>) => {
                const roundEvents = eventsByRound.get(rodada.id) ?? [];
                return (
                  <div key={rodada.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-[#2A2A2A]">
                        Rodada {rodada.numero} — {rodada.titulo}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {ROUND_STATUS_LABELS[rodada.status as string] ?? rodada.status}
                      </Badge>
                    </div>
                    {roundEvents.length === 0 ? (
                      <p className="text-xs text-[#666666] italic ml-4">
                        Nenhum evento nesta rodada.
                      </p>
                    ) : (
                      <div className="space-y-3 ml-4">
                        {roundEvents
                          .sort(
                            (a: Record<string, any>, b: Record<string, any>) =>
                              new Date(b.data).getTime() - new Date(a.data).getTime()
                          )
                          .map((ev: Record<string, any>) => (
                            <EventCard key={ev.id} event={ev} />
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* General events (no round_id) */}
            {(() => {
              const general = eventsByRound.get(null) ?? [];
              if (general.length === 0 && rodadas.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                    <Clock className="size-10 text-[#666666]/40" />
                    <p className="mt-3 text-sm text-[#666666]">
                      Nenhum evento registrado ainda.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => setShowEventForm(true)}
                    >
                      <Plus className="size-4 mr-1" />
                      Registrar primeiro evento
                    </Button>
                  </div>
                );
              }
              if (general.length === 0) return null;
              return (
                <div>
                  <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">
                    Eventos Gerais
                  </h3>
                  <div className="space-y-3 ml-4">
                    {general
                      .sort(
                        (a: Record<string, any>, b: Record<string, any>) =>
                          new Date(b.data).getTime() - new Date(a.data).getTime()
                      )
                      .map((ev: Record<string, any>) => (
                        <EventCard key={ev.id} event={ev} />
                      ))}
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* =========================================================== */}
          {/* TAB: Propostas                                              */}
          {/* =========================================================== */}
          <TabsContent value="propostas" className="mt-4 space-y-6">
            {/* Convergence visual */}
            {(devedorProposals.length > 0 || credorProposals.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Convergência de Propostas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ConvergenceVisual
                    devedorProposals={devedorProposals}
                    credorProposals={credorProposals}
                  />
                </CardContent>
              </Card>
            )}

            {/* Proposals list */}
            {propostas.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <FileText className="size-10 text-[#666666]/40" />
                <p className="mt-3 text-sm text-[#666666]">
                  Nenhuma proposta registrada ainda.
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-[#C9A961] text-white hover:bg-[#b89950]"
                  onClick={() => setShowProposalDialog(true)}
                >
                  <Plus className="size-4 mr-1" />
                  Nova Proposta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {propostas
                  .sort(
                    (a: Record<string, any>, b: Record<string, any>) => a.numero - b.numero
                  )
                  .map((p: Record<string, any>) => (
                    <ProposalCard key={p.id} proposal={p} />
                  ))}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                className="bg-[#C9A961] text-white hover:bg-[#b89950]"
                onClick={() => setShowProposalDialog(true)}
              >
                <Plus className="size-4 mr-1" />
                Nova Proposta
              </Button>
            </div>
          </TabsContent>

          {/* =========================================================== */}
          {/* TAB: Concessoes                                             */}
          {/* =========================================================== */}
          <TabsContent value="concessoes" className="mt-4 space-y-6">
            {/* Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span>
                    <span className="font-medium text-red-700">Dadas:</span>{" "}
                    {dadasCount} ({formatBigIntBRL(BigInt(Math.round(dadasTotal)))})
                  </span>
                  <span className="text-[#666666]">|</span>
                  <span>
                    <span className="font-medium text-green-700">Recebidas:</span>{" "}
                    {recebidasCount} ({formatBigIntBRL(BigInt(Math.round(recebidasTotal)))})
                  </span>
                  <span className="text-[#666666]">|</span>
                  <span>
                    <span className="font-medium">Ratio:</span> {concessionRatio}:1
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Concessions list */}
            {concessoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <ArrowRightLeft className="size-10 text-[#666666]/40" />
                <p className="mt-3 text-sm text-[#666666]">
                  Nenhuma concessão registrada ainda.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setShowConcessionDialog(true)}
                >
                  <Plus className="size-4 mr-1" />
                  Registrar Concessão
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {concessoes.map((c: Record<string, any>) => {
                  const isDada = c.direcao === "DADA";
                  return (
                    <Card
                      key={c.id}
                      className={isDada ? "border-red-200 bg-red-50/50" : "border-green-200 bg-green-50/50"}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: isDada ? "#dc2626" : "#16a34a",
                                  color: "#fff",
                                }}
                              >
                                {CONCESSION_DIRECTION_LABELS[c.direcao as string] ?? c.direcao}
                              </Badge>
                              <span className="text-xs text-[#666666]">
                                {fmtDate(c.data)}
                              </span>
                            </div>
                            <p className="text-sm text-[#2A2A2A]">{c.descricao}</p>
                            {c.justificativa && (
                              <p className="text-xs text-[#666666]">
                                <span className="font-medium">Justificativa:</span>{" "}
                                {c.justificativa}
                              </p>
                            )}
                            {c.contrapartida && (
                              <p className="text-xs text-[#666666]">
                                <span className="font-medium">Contrapartida:</span>{" "}
                                {c.contrapartida}
                              </p>
                            )}
                          </div>
                          {c.valor_impacto != null && Number(c.valor_impacto) > 0 && (
                            <span className="text-sm font-semibold whitespace-nowrap">
                              {formatBigIntBRL(c.valor_impacto)}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConcessionDialog(true)}
              >
                <Plus className="size-4 mr-1" />
                Registrar Concessão
              </Button>
            </div>
          </TabsContent>

          {/* =========================================================== */}
          {/* TAB: Estrategia                                             */}
          {/* =========================================================== */}
          <TabsContent value="estrategia" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Harvard */}
              <StrategyCard
                title="Harvard"
                icon={<Scale className="size-5 text-[#C9A961]" />}
                expanded={expandedStrategy === "harvard"}
                onToggle={() => toggleStrategy("harvard")}
                summary={
                  <div className="space-y-1 text-xs text-[#666666]">
                    <p>Interesses devedor: {harvardInteressesDevedor.length}</p>
                    <p>Interesses credor: {harvardInteressesCredor.length}</p>
                    <p>
                      BATNA scores: {harvardBatnaDevedor ?? "--"} vs{" "}
                      {harvardBatnaCredor ?? "--"}
                    </p>
                    <p>
                      ZOPA:{" "}
                      {zopaMin != null && zopaMax != null
                        ? `${formatBigIntBRL(BigInt(zopaMin))} - ${formatBigIntBRL(BigInt(zopaMax))}`
                        : "--"}
                    </p>
                  </div>
                }
                details={
                  <div className="space-y-3 text-xs">
                    {harvardInteressesDevedor.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Interesses do Devedor:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {harvardInteressesDevedor.map((i, idx) => (
                            <li key={idx}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {harvardInteressesCredor.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Interesses do Credor:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {harvardInteressesCredor.map((i, idx) => (
                            <li key={idx}>{i}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">BATNA Devedor:</p>
                      <p>{neg.batna ?? "--"}</p>
                    </div>
                  </div>
                }
              />

              {/* Thomas-Kilmann */}
              <StrategyCard
                title="Thomas-Kilmann"
                icon={<Users className="size-5 text-[#C9A961]" />}
                expanded={expandedStrategy === "tki"}
                onToggle={() => toggleStrategy("tki")}
                summary={
                  <div className="space-y-1 text-xs text-[#666666]">
                    {tkiPerfil && (
                      <div className="flex items-center gap-2">
                        <span>Perfil credor:</span>
                        <Badge
                          className="text-xs"
                          style={{
                            backgroundColor: TKI_PROFILE_COLORS[tkiPerfil] ?? "#e5e7eb",
                            color: "#fff",
                          }}
                        >
                          {TKI_PROFILE_LABELS[tkiPerfil] ?? tkiPerfil}
                        </Badge>
                      </div>
                    )}
                    <p>
                      Assertividade: {tkiAssertividade ?? "--"} | Cooperatividade:{" "}
                      {tkiCooperatividade ?? "--"}
                    </p>
                    {tkiEstrategia && <p>Estratégia: {tkiEstrategia}</p>}
                  </div>
                }
                details={
                  <div className="space-y-2 text-xs">
                    <p>
                      <span className="font-medium">Estratégia recomendada:</span>{" "}
                      {tkiEstrategia || "--"}
                    </p>
                    <p className="text-[#666666]">
                      O modelo Thomas-Kilmann avalia o estilo de negociação da contraparte
                      em dois eixos: assertividade e cooperatividade, para calibrar a melhor
                      abordagem tática.
                    </p>
                  </div>
                }
              />

              {/* Voss */}
              <StrategyCard
                title="Voss"
                icon={<Brain className="size-5 text-[#C9A961]" />}
                expanded={expandedStrategy === "voss"}
                onToggle={() => toggleStrategy("voss")}
                summary={
                  <div className="space-y-1 text-xs text-[#666666]">
                    {vossTipo && (
                      <p>
                        Tipo negociador: <span className="font-medium">{vossTipo}</span>
                      </p>
                    )}
                    <p>
                      Black Swans:{" "}
                      {vossBlackSwans.length > 0
                        ? vossBlackSwans.map((bs, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs mr-1">
                              {(bs.status as string) ?? "?"}
                            </Badge>
                          ))
                        : "--"}
                    </p>
                    <p>One-Sheets: {vossOneSheetCount}</p>
                  </div>
                }
                details={
                  <div className="space-y-2 text-xs">
                    {vossBlackSwans.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Black Swans:</p>
                        <ul className="space-y-1">
                          {vossBlackSwans.map((bs, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {(bs.status as string) ?? "?"}
                              </Badge>
                              <span>{(bs.descricao as string) ?? (bs.description as string) ?? "--"}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="text-[#666666]">
                      Técnicas Voss: empatia tática, rotulagem, perguntas calibradas,
                      auditoria de acusação, e ofertas não monetárias.
                    </p>
                  </div>
                }
              />

              {/* Camp */}
              <StrategyCard
                title="Camp"
                icon={<Shield className="size-5 text-[#C9A961]" />}
                expanded={expandedStrategy === "camp"}
                onToggle={() => toggleStrategy("camp")}
                summary={
                  <div className="space-y-1 text-xs text-[#666666]">
                    {campMissao && (
                      <p className="truncate">
                        Missão: {campMissao.substring(0, 80)}
                        {campMissao.length > 80 ? "..." : ""}
                      </p>
                    )}
                    <p>
                      Decisores:{" "}
                      {Array.isArray(campDecisores)
                        ? campDecisores.length
                        : "--"}
                    </p>
                    <p>Budget score: {campBudget ?? "--"}</p>
                  </div>
                }
                details={
                  <div className="space-y-2 text-xs">
                    {campMissao && (
                      <div>
                        <p className="font-medium">Missão completa:</p>
                        <p>{campMissao}</p>
                      </div>
                    )}
                    {Array.isArray(campDecisores) && campDecisores.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Decisores:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {campDecisores.map((d, idx) => (
                            <li key={idx}>
                              {(d.nome as string) ?? (d.name as string) ?? `Decisor ${idx + 1}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                }
              />

              {/* Karrass */}
              <StrategyCard
                title="Karrass"
                icon={<Swords className="size-5 text-[#C9A961]" />}
                expanded={expandedStrategy === "karrass"}
                onToggle={() => toggleStrategy("karrass")}
                summary={
                  <div className="space-y-1 text-xs text-[#666666]">
                    {karrassPoder != null ? (
                      <>
                        <p>
                          Poder geral:{" "}
                          {(karrassPoder as Record<string, any>).geral ??
                            (karrassPoder as Record<string, any>).total ??
                            "--"}
                        </p>
                        <p>
                          Dimensões avaliadas:{" "}
                          {Object.keys(karrassPoder as Record<string, any>).length}
                        </p>
                      </>
                    ) : (
                      <p>Análise de poder não configurada.</p>
                    )}
                  </div>
                }
                details={
                  <div className="space-y-2 text-xs">
                    {karrassPoder != null ? (
                      <div>
                        <p className="font-medium mb-1">Dimensões de poder:</p>
                        <ul className="space-y-0.5">
                          {Object.entries(karrassPoder as Record<string, unknown>).map(
                            ([key, val]) => (
                              <li key={key} className="flex justify-between">
                                <span className="capitalize">{key.replace(/_/g, " ")}</span>
                                <span className="font-medium">{String(val)}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-[#666666]">
                        Configure a análise de poder de Karrass para identificar alavancas
                        de negociação.
                      </p>
                    )}
                  </div>
                }
              />

              {/* Game Theory */}
              <StrategyCard
                title="Teoria dos Jogos"
                icon={<Gamepad2 className="size-5 text-[#C9A961]" />}
                expanded={expandedStrategy === "game"}
                onToggle={() => toggleStrategy("game")}
                summary={
                  <div className="space-y-1 text-xs text-[#666666]">
                    {gameTipoJogo && (
                      <div className="flex items-center gap-1">
                        <span>Tipo:</span>
                        <Badge variant="outline" className="text-xs">
                          {gameTipoJogo}
                        </Badge>
                      </div>
                    )}
                    {gameEquilibrio && (
                      <div className="flex items-center gap-1">
                        <span>Equilíbrio:</span>
                        <Badge variant="outline" className="text-xs">
                          {gameEquilibrio}
                        </Badge>
                      </div>
                    )}
                    {gameCoalicao && (
                      <div className="flex items-center gap-1">
                        <span>Coalizão:</span>
                        <Badge variant="outline" className="text-xs">
                          {gameCoalicao}
                        </Badge>
                      </div>
                    )}
                    {gameRiscoHoldout && (
                      <div className="flex items-center gap-1">
                        <span>Risco holdout:</span>
                        <Badge variant="outline" className="text-xs">
                          {gameRiscoHoldout}
                        </Badge>
                      </div>
                    )}
                    {!gameTipoJogo &&
                      !gameEquilibrio &&
                      !gameCoalicao &&
                      !gameRiscoHoldout && <p>Análise não configurada.</p>}
                  </div>
                }
                details={
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="font-medium">Tipo de jogo:</p>
                        <p>{gameTipoJogo || "--"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Equilíbrio:</p>
                        <p>{gameEquilibrio || "--"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Coalizão:</p>
                        <p>{gameCoalicao || "--"}</p>
                      </div>
                      <div>
                        <p className="font-medium">Risco holdout:</p>
                        <p>{gameRiscoHoldout || "--"}</p>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          </TabsContent>

          {/* =========================================================== */}
          {/* TAB: One-Sheets                                             */}
          {/* =========================================================== */}
          <TabsContent value="one-sheets" className="mt-4 space-y-4">
            {oneSheets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
                <Crosshair className="size-10 text-[#666666]/40" />
                <p className="mt-3 text-sm text-[#666666]">
                  Nenhum one-sheet criado ainda.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => setShowOneSheetDialog(true)}
                >
                  <Plus className="size-4 mr-1" />
                  Novo One-Sheet
                </Button>
              </div>
            ) : (
              <>
                {oneSheets.map((sheet: Record<string, any>) => {
                  const isExpanded = expandedOneSheet === sheet.id;
                  return (
                    <Card key={sheet.id}>
                      <CardHeader
                        className="cursor-pointer pb-2"
                        onClick={() => toggleOneSheet(sheet.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <CardTitle className="text-sm">
                              One-Sheet {sheet.created_at && fmtDate(sheet.created_at)}
                            </CardTitle>
                            <div className="flex items-center gap-3 text-xs text-[#666666]">
                              {sheet.objetivo_especifico && (
                                <span className="truncate max-w-xs">{sheet.objetivo_especifico}</span>
                              )}
                              {sheet.preparado_por && (
                                <span>por {sheet.preparado_por}</span>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-[#666666]" />
                          ) : (
                            <ChevronDown className="size-4 text-[#666666]" />
                          )}
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="pt-0 space-y-3 text-sm">
                          <div>
                            <Label className="text-xs font-medium text-[#666666]">
                              Objetivo Específico
                            </Label>
                            <p className="mt-0.5">{sheet.objetivo_especifico}</p>
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-[#666666]">
                              Resumo da Situação
                            </Label>
                            <p className="mt-0.5">{sheet.resumo_situacao}</p>
                          </div>

                          {Array.isArray(sheet.labels_preparados) &&
                            sheet.labels_preparados.length > 0 && (
                              <div>
                                <Label className="text-xs font-medium text-[#666666]">
                                  Labels Preparados
                                </Label>
                                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                  {(sheet.labels_preparados as string[]).map(
                                    (item: string, idx: number) => (
                                      <li key={idx}>{item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {Array.isArray(sheet.accusation_audit) &&
                            sheet.accusation_audit.length > 0 && (
                              <div>
                                <Label className="text-xs font-medium text-[#666666]">
                                  Accusation Audit
                                </Label>
                                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                  {(sheet.accusation_audit as string[]).map(
                                    (item: string, idx: number) => (
                                      <li key={idx}>{item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {Array.isArray(sheet.calibrated_questions) &&
                            sheet.calibrated_questions.length > 0 && (
                              <div>
                                <Label className="text-xs font-medium text-[#666666]">
                                  Perguntas Calibradas
                                </Label>
                                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                  {(sheet.calibrated_questions as string[]).map(
                                    (item: string, idx: number) => (
                                      <li key={idx}>{item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {Array.isArray(sheet.black_swans_investigar) &&
                            sheet.black_swans_investigar.length > 0 && (
                              <div>
                                <Label className="text-xs font-medium text-[#666666]">
                                  Black Swans a Investigar
                                </Label>
                                <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                                  {(sheet.black_swans_investigar as string[]).map(
                                    (item: string, idx: number) => (
                                      <li key={idx}>{item}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowOneSheetDialog(true)}
              >
                <Plus className="size-4 mr-1" />
                Novo One-Sheet
              </Button>
            </div>
          </TabsContent>

          {/* =========================================================== */}
          {/* TAB: Documentos                                             */}
          {/* =========================================================== */}
          <TabsContent value="documentos" className="mt-4">
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
              <FolderOpen className="size-12 text-[#666666]/40" />
              <h3 className="mt-4 text-lg font-semibold text-[#2A2A2A]">
                Documentos vinculados à negociação
              </h3>
              <p className="mt-2 text-sm text-[#666666] text-center">
                Os documentos relacionados a esta negociação estratégica serão exibidos aqui.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* ============================================================= */}
        {/* DIALOG: Nova Proposta                                         */}
        {/* ============================================================= */}
        <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Proposta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Origem *</Label>
                  <Select value={proposalTipo} onValueChange={setProposalTipo}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROPOSAL_ORIGIN_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={proposalStatus} onValueChange={setProposalStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Valor principal (R$) *</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.01"
                    value={proposalValorPrincipal}
                    onChange={(e) => setProposalValorPrincipal(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Haircut (%)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.1"
                    value={proposalHaircut}
                    onChange={(e) => setProposalHaircut(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Taxa de juros (%)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.01"
                    value={proposalTaxaJuros}
                    onChange={(e) => setProposalTaxaJuros(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Carencia (meses)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={proposalCarencia}
                    onChange={(e) => setProposalCarencia(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Prazo (meses)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={proposalPrazo}
                    onChange={(e) => setProposalPrazo(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Parcelas</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    value={proposalParcelas}
                    onChange={(e) => setProposalParcelas(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Instrumentos criativos</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proposalDebtEquity}
                      onChange={(e) => setProposalDebtEquity(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Debt-Equity Swap
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proposalWarrants}
                      onChange={(e) => setProposalWarrants(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Warrants
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proposalPik}
                      onChange={(e) => setProposalPik(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    PIK Toggle
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-xs">Contingent Value (R$)</Label>
                <Input
                  className="mt-1 w-48"
                  type="number"
                  step="0.01"
                  value={proposalContingent}
                  onChange={(e) => setProposalContingent(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">NPV Devedor (R$)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.01"
                    value={proposalNpvDevedor}
                    onChange={(e) => setProposalNpvDevedor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs">NPV Credor (R$)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.01"
                    value={proposalNpvCredor}
                    onChange={(e) => setProposalNpvCredor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label className="text-xs">Recovery Rate (%)</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    step="0.1"
                    value={proposalRecoveryRate}
                    onChange={(e) => setProposalRecoveryRate(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Justificativa</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={proposalJustificativa}
                  onChange={(e) => setProposalJustificativa(e.target.value)}
                  placeholder="Fundamento para esta proposta..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowProposalDialog(false);
                  resetProposalForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitProposal}
                disabled={createProposalMutation.isPending || !proposalValorPrincipal}
                className="bg-[#C9A961] text-white hover:bg-[#b89950]"
              >
                {createProposalMutation.isPending ? "Salvando..." : "Criar Proposta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* DIALOG: Registrar Concessão                                   */}
        {/* ============================================================= */}
        <Dialog open={showConcessionDialog} onOpenChange={setShowConcessionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Concessão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Direção *</Label>
                <Select
                  value={concessionDirecao}
                  onValueChange={setConcessionDirecao}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONCESSION_DIRECTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Descrição *</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={concessionDescricao}
                  onChange={(e) => setConcessionDescricao(e.target.value)}
                  placeholder="Descreva a concessão..."
                />
              </div>
              <div>
                <Label className="text-xs">Valor do impacto (R$)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  step="0.01"
                  value={concessionValor}
                  onChange={(e) => setConcessionValor(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label className="text-xs">Justificativa *</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={concessionJustificativa}
                  onChange={(e) => setConcessionJustificativa(e.target.value)}
                  placeholder="Motivo desta concessão..."
                />
              </div>
              <div>
                <Label className="text-xs">Contrapartida</Label>
                <Input
                  className="mt-1"
                  value={concessionContrapartida}
                  onChange={(e) => setConcessionContrapartida(e.target.value)}
                  placeholder="O que se espera em troca..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowConcessionDialog(false);
                  resetConcessionForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitConcession}
                disabled={
                  createConcessionMutation.isPending ||
                  !concessionDescricao ||
                  !concessionJustificativa
                }
                className="bg-[#C9A961] text-white hover:bg-[#b89950]"
              >
                {createConcessionMutation.isPending
                  ? "Salvando..."
                  : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* DIALOG: Novo One-Sheet (Voss)                                 */}
        {/* ============================================================= */}
        <Dialog open={showOneSheetDialog} onOpenChange={setShowOneSheetDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo One-Sheet (Chris Voss)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Objetivo Específico *</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={oneSheetObjetivo}
                  onChange={(e) => setOneSheetObjetivo(e.target.value)}
                  placeholder="O que deseja alcançar nesta negociação..."
                />
              </div>
              <div>
                <Label className="text-xs">Resumo da Situação *</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={oneSheetResumo}
                  onChange={(e) => setOneSheetResumo(e.target.value)}
                  placeholder="Contexto da negociação, histórico, pontos-chave..."
                />
              </div>
              <div>
                <Label className="text-xs">Labels Preparados (um por linha)</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={oneSheetLabels}
                  onChange={(e) => setOneSheetLabels(e.target.value)}
                  placeholder="Parece que voce sente que...&#10;Parece que a prioridade e...&#10;Parece que ha uma preocupacao com..."
                />
              </div>
              <div>
                <Label className="text-xs">Accusation Audit (um por linha)</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={oneSheetAudit}
                  onChange={(e) => setOneSheetAudit(e.target.value)}
                  placeholder="Voce provavelmente acha que estamos pedindo demais...&#10;Voce pode pensar que nao levamos em conta..."
                />
              </div>
              <div>
                <Label className="text-xs">Perguntas Calibradas (uma por linha)</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  value={oneSheetQuestions}
                  onChange={(e) => setOneSheetQuestions(e.target.value)}
                  placeholder="Como podemos resolver isso juntos?&#10;O que e mais importante para voce neste acordo?&#10;Como voce gostaria que procedessemos?"
                />
              </div>
              <div>
                <Label className="text-xs">Black Swans a Investigar (um por linha)</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={oneSheetBlackSwans}
                  onChange={(e) => setOneSheetBlackSwans(e.target.value)}
                  placeholder="Informações ocultas que podem mudar tudo..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowOneSheetDialog(false);
                  resetOneSheetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitOneSheet}
                disabled={createOneSheetMutation.isPending || !oneSheetObjetivo || !oneSheetResumo}
                className="bg-[#C9A961] text-white hover:bg-[#b89950]"
              >
                {createOneSheetMutation.isPending ? "Salvando..." : "Criar One-Sheet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================= */}
        {/* NEGOTIATION ASSISTANT (AI Chat)                               */}
        {/* ============================================================= */}
        <NegotiationAssistant
          negotiationId={id}
          negotiation={negotiation}
          fase={(negotiation as any)?.fase}
        />

        {/* AI Glow Effect CSS */}
        <style>{`
          .ai-glow {
            animation: aiGlow 2s ease-in-out infinite;
          }
          @keyframes aiGlow {
            0%, 100% { box-shadow: 0 0 5px rgba(201, 169, 97, 0.3); }
            50% { box-shadow: 0 0 20px rgba(201, 169, 97, 0.6); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ==========================================================================
// Sub-components
// ==========================================================================

// ---------------------------------------------------------------------------
// ZOPA Bar
// ---------------------------------------------------------------------------

function ZopaBar({
  zopaMin,
  zopaMax,
  propostaAtual,
  pedidoCredor,
}: {
  zopaMin: number;
  zopaMax: number;
  propostaAtual: number | null;
  pedidoCredor: number | null;
}) {
  // Determine the full visual range (extending beyond ZOPA if needed)
  const allValues = [zopaMin, zopaMax];
  if (propostaAtual != null) allValues.push(propostaAtual);
  if (pedidoCredor != null) allValues.push(pedidoCredor);
  const rangeMin = Math.min(...allValues) * 0.95;
  const rangeMax = Math.max(...allValues) * 1.05;
  const rangeSpan = rangeMax - rangeMin || 1;

  function pct(val: number) {
    return ((val - rangeMin) / rangeSpan) * 100;
  }

  return (
    <div className="relative h-10">
      {/* Background track */}
      <div className="absolute inset-y-3 left-0 right-0 rounded-full bg-gray-100" />

      {/* ZOPA band */}
      <div
        className="absolute inset-y-3 rounded-full bg-[#C9A961]/30 border border-[#C9A961]/50"
        style={{
          left: `${pct(zopaMin)}%`,
          width: `${pct(zopaMax) - pct(zopaMin)}%`,
        }}
      />

      {/* ZOPA min label */}
      <div
        className="absolute -top-0.5 text-[10px] text-[#666666] -translate-x-1/2"
        style={{ left: `${pct(zopaMin)}%` }}
      >
        {formatBigIntBRL(BigInt(zopaMin))}
      </div>

      {/* ZOPA max label */}
      <div
        className="absolute -top-0.5 text-[10px] text-[#666666] -translate-x-1/2"
        style={{ left: `${pct(zopaMax)}%` }}
      >
        {formatBigIntBRL(BigInt(zopaMax))}
      </div>

      {/* Proposta Atual marker */}
      {propostaAtual != null && (
        <div
          className="absolute top-2 -translate-x-1/2"
          style={{ left: `${pct(propostaAtual)}%` }}
        >
          <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-blue-700">
            Proposta: {formatBigIntBRL(BigInt(propostaAtual))}
          </div>
        </div>
      )}

      {/* Pedido Credor marker */}
      {pedidoCredor != null && (
        <div
          className="absolute top-2 -translate-x-1/2"
          style={{ left: `${pct(pedidoCredor)}%` }}
        >
          <div className="w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-red-700">
            Credor: {formatBigIntBRL(BigInt(pedidoCredor))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Card
// ---------------------------------------------------------------------------

function EventCard({ event }: { event: Record<string, any> }) {
  const tipo = (event.tipo ?? "") as string;
  const canal = (event.canal ?? "") as string;
  const sentimento = (event.sentimento ?? "") as string;
  const tecnicas = (event.tecnicas_usadas ?? []) as string[];
  const participantes = (event.participantes ?? []) as string[];

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[#666666]">
                {new Date(event.data).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {tipo && (
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: EVENT_TYPE_COLORS[tipo] ?? "#6b7280",
                    color: "#fff",
                  }}
                >
                  {EVENT_TYPE_LABELS[tipo] ?? tipo}
                </Badge>
              )}
              {canal && (
                <Badge variant="outline" className="text-xs">
                  {EVENT_CHANNEL_LABELS[canal] ?? canal}
                </Badge>
              )}
              {sentimento && (
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: SENTIMENT_COLORS[sentimento] ?? "#6b7280",
                    color: "#fff",
                  }}
                >
                  {SENTIMENT_LABELS[sentimento] ?? sentimento}
                </Badge>
              )}
            </div>
            <p className="text-sm text-[#2A2A2A]">{event.descricao}</p>
            {event.valor_mencionado != null &&
              Number(event.valor_mencionado) > 0 && (
                <p className="text-xs text-[#666666]">
                  Valor mencionado:{" "}
                  <span className="font-medium">
                    {formatBigIntBRL(event.valor_mencionado)}
                  </span>
                </p>
              )}
            {participantes.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-[#666666]">
                <Users className="size-3" />
                <span>{participantes.join(", ")}</span>
              </div>
            )}
            {tecnicas.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {tecnicas.map((t: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            {event.insights && (
              <p className="text-xs italic text-[#666666] pt-0.5">
                {event.insights}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Proposal Card
// ---------------------------------------------------------------------------

function ProposalCard({ proposal }: { proposal: Record<string, any> }) {
  const tipo = (proposal.tipo ?? "") as string;
  const statusKey = (proposal.status ?? "") as string;

  const tipoBg =
    tipo === "DEVEDOR"
      ? "#2563eb"
      : tipo === "CREDOR"
        ? "#dc2626"
        : tipo === "MEDIADOR"
          ? "#9333ea"
          : "#6b7280";

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#2A2A2A]">
            #{proposal.numero}
          </span>
          <Badge className="text-xs" style={{ backgroundColor: tipoBg, color: "#fff" }}>
            {PROPOSAL_ORIGIN_LABELS[tipo] ?? tipo}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {PROPOSAL_STATUS_LABELS[statusKey] ?? statusKey}
          </Badge>
          <span className="text-xs text-[#666666]">
            {new Date(proposal.data).toLocaleDateString("pt-BR")}
          </span>
        </div>

        {/* Terms */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-xs text-[#666666]">Valor principal</span>
            <p className="font-medium">{formatBigIntBRL(proposal.valor_principal)}</p>
          </div>
          {proposal.haircut_pct != null && (
            <div>
              <span className="text-xs text-[#666666]">Haircut</span>
              <p className="font-medium">{proposal.haircut_pct}%</p>
            </div>
          )}
          {proposal.taxa_juros != null && (
            <div>
              <span className="text-xs text-[#666666]">Taxa de juros</span>
              <p className="font-medium">{proposal.taxa_juros}% a.a.</p>
            </div>
          )}
          {proposal.carencia_meses != null && (
            <div>
              <span className="text-xs text-[#666666]">Carencia</span>
              <p className="font-medium">{proposal.carencia_meses} meses</p>
            </div>
          )}
          {proposal.prazo_pagamento_meses != null && (
            <div>
              <span className="text-xs text-[#666666]">Prazo</span>
              <p className="font-medium">{proposal.prazo_pagamento_meses} meses</p>
            </div>
          )}
          {proposal.parcelas != null && (
            <div>
              <span className="text-xs text-[#666666]">Parcelas</span>
              <p className="font-medium">{proposal.parcelas}x</p>
            </div>
          )}
        </div>

        {/* Creative instruments */}
        {(proposal.debt_equity_swap ||
          proposal.warrants ||
          proposal.pik_toggle ||
          (proposal.contingent_value != null &&
            Number(proposal.contingent_value) > 0)) && (
          <div className="flex flex-wrap gap-2">
            {proposal.debt_equity_swap && (
              <Badge variant="secondary" className="text-xs">
                Debt-Equity Swap
              </Badge>
            )}
            {proposal.warrants && (
              <Badge variant="secondary" className="text-xs">
                Warrants
              </Badge>
            )}
            {proposal.pik_toggle && (
              <Badge variant="secondary" className="text-xs">
                PIK Toggle
              </Badge>
            )}
            {proposal.contingent_value != null &&
              Number(proposal.contingent_value) > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Contingent Value: {formatBigIntBRL(proposal.contingent_value)}
                </Badge>
              )}
          </div>
        )}

        {/* NPV section */}
        {(proposal.npv_devedor != null || proposal.npv_credor != null) && (
          <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 rounded-md p-3">
            {proposal.npv_devedor != null && (
              <div>
                <span className="text-xs text-[#666666]">NPV Devedor</span>
                <p className="font-medium">{formatBigIntBRL(proposal.npv_devedor)}</p>
              </div>
            )}
            {proposal.npv_credor != null && (
              <div>
                <span className="text-xs text-[#666666]">NPV Credor</span>
                <p className="font-medium">{formatBigIntBRL(proposal.npv_credor)}</p>
              </div>
            )}
            {proposal.recovery_rate != null && (
              <div>
                <span className="text-xs text-[#666666]">Recovery Rate</span>
                <p className="font-medium">{proposal.recovery_rate}%</p>
              </div>
            )}
          </div>
        )}

        {/* Justificativa */}
        {proposal.justificativa && (
          <p className="text-xs text-[#666666] italic">{proposal.justificativa}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Convergence Visual
// ---------------------------------------------------------------------------

function ConvergenceVisual({
  devedorProposals,
  credorProposals,
}: {
  devedorProposals: Record<string, any>[];
  credorProposals: Record<string, any>[];
}) {
  // Merge all proposals to find value range
  const allVals: number[] = [];
  for (const p of [...devedorProposals, ...credorProposals]) {
    if (p.valor_principal != null) allVals.push(Number(p.valor_principal));
  }
  if (allVals.length === 0) return null;

  const minVal = Math.min(...allVals) * 0.9;
  const maxVal = Math.max(...allVals) * 1.1;
  const range = maxVal - minVal || 1;

  function pctY(val: number) {
    // Invert: higher values at top
    return 100 - ((val - minVal) / range) * 100;
  }

  const totalEntries = Math.max(devedorProposals.length, credorProposals.length, 1);

  return (
    <div className="relative h-40 border border-gray-200 rounded-md bg-gray-50 overflow-hidden">
      {/* Y-axis labels */}
      <div className="absolute left-1 top-1 text-[9px] text-[#666666]">
        {formatBigIntBRL(BigInt(Math.round(maxVal)))}
      </div>
      <div className="absolute left-1 bottom-1 text-[9px] text-[#666666]">
        {formatBigIntBRL(BigInt(Math.round(minVal)))}
      </div>

      {/* Devedor line (blue dots going up) */}
      {devedorProposals.map((p, idx) => {
        const val = Number(p.valor_principal);
        const x = ((idx + 1) / (totalEntries + 1)) * 100;
        const y = pctY(val);
        return (
          <div
            key={`d-${p.id}`}
            className="absolute w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`Devedor #${p.numero}: ${formatBigIntBRL(p.valor_principal)}`}
          />
        );
      })}

      {/* Lines between devedor dots */}
      {devedorProposals.length > 1 &&
        devedorProposals.map((p, idx) => {
          if (idx === 0) return null;
          const prev = devedorProposals[idx - 1];
          const x1 = ((idx) / (totalEntries + 1)) * 100;
          const y1 = pctY(Number(prev.valor_principal));
          const x2 = ((idx + 1) / (totalEntries + 1)) * 100;
          const y2 = pctY(Number(p.valor_principal));
          return (
            <svg
              key={`dl-${p.id}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <line
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="#2563eb"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>
          );
        })}

      {/* Credor line (red dots going down) */}
      {credorProposals.map((p, idx) => {
        const val = Number(p.valor_principal);
        const x = ((idx + 1) / (totalEntries + 1)) * 100;
        const y = pctY(val);
        return (
          <div
            key={`c-${p.id}`}
            className="absolute w-3 h-3 rounded-full bg-red-600 border-2 border-white shadow -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`Credor #${p.numero}: ${formatBigIntBRL(p.valor_principal)}`}
          />
        );
      })}

      {/* Lines between credor dots */}
      {credorProposals.length > 1 &&
        credorProposals.map((p, idx) => {
          if (idx === 0) return null;
          const prev = credorProposals[idx - 1];
          const x1 = ((idx) / (totalEntries + 1)) * 100;
          const y1 = pctY(Number(prev.valor_principal));
          const x2 = ((idx + 1) / (totalEntries + 1)) * 100;
          const y2 = pctY(Number(p.valor_principal));
          return (
            <svg
              key={`cl-${p.id}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
            >
              <line
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            </svg>
          );
        })}

      {/* Legend */}
      <div className="absolute bottom-1 right-2 flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
          Devedor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-red-600" />
          Credor
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy Card
// ---------------------------------------------------------------------------

function StrategyCard({
  title,
  icon,
  expanded,
  onToggle,
  summary,
  details,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  summary: React.ReactNode;
  details: React.ReactNode;
}) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onToggle}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-[#C9A961]/10 flex items-center justify-center">
              {icon}
            </div>
            <CardTitle className="text-sm">{title}</CardTitle>
          </div>
          {expanded ? (
            <ChevronUp className="size-4 text-[#666666]" />
          ) : (
            <ChevronDown className="size-4 text-[#666666]" />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {summary}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">{details}</div>
        )}
      </CardContent>
    </Card>
  );
}
