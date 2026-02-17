"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Handshake,
  Plus,
  LayoutDashboard,
  DollarSign,
  Percent,
  TrendingUp,
  Target,
  ArrowRightLeft,
  LayoutList,
  Columns3,
  Calendar,
  User,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { NegotiationAssistant } from "./negotiation-assistant";
import {
  STRAT_NEG_PHASES,
  STRAT_NEG_PHASE_LABELS,
  STRAT_NEG_PHASE_COLORS,
  STRAT_NEG_STATUS_LABELS,
  STRAT_NEG_STATUS_COLORS,
  STRAT_NEG_PRIORITY_LABELS,
  STRAT_NEG_PRIORITY_COLORS,
  TKI_PROFILE_LABELS,
  TKI_PROFILE_COLORS,
  formatBigIntBRL,
  formatBigIntBRLCompact,
  type StratNegPhase,
  type StratNegStatus,
  type StratNegPriority,
  type TkiProfile,
} from "@/lib/strat-neg-constants";

// ============================================================
// TYPES
// ============================================================

interface DashboardData {
  total_ativas: number;
  total_valor: bigint | number;
  haircut_medio: number | null;
  taxa_sucesso: number | null;
  by_phase: Record<string, { count: number }>;
}

interface NegotiationItem {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  fase: StratNegPhase;
  status: StratNegStatus;
  prioridade: StratNegPriority;
  valor_credito: bigint | number | null;
  valor_proposta: bigint | number | null;
  valor_pedido: bigint | number | null;
  haircut_percentual: number | null;
  tki_perfil_credor: TkiProfile | null;
  proxima_acao: string | null;
  data_proxima_acao: string | Date | null;
  person?: {
    id: string;
    nome: string;
  } | null;
  // AI fields
  health_score?: number | null;
  ai_proxima_acao?: string | null;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function computeGap(
  pedido: bigint | number | null | undefined,
  proposta: bigint | number | null | undefined
): number | null {
  if (pedido === null || pedido === undefined || proposta === null || proposta === undefined) {
    return null;
  }
  const p = typeof pedido === "bigint" ? Number(pedido) : pedido;
  const pr = typeof proposta === "bigint" ? Number(proposta) : proposta;
  return p - pr;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function StratNegLayout() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");
  const [filterFase, setFilterFase] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("ALL");

  // Data fetching
  const dashboardQuery = trpc.stratNeg.negotiations.dashboard.useQuery({});
  const listQuery = trpc.stratNeg.negotiations.list.useQuery({});

  const dashboard = dashboardQuery.data as DashboardData | undefined;
  const negotiations = (listQuery.data ?? []) as unknown as NegotiationItem[];

  // Filtered negotiations for table view
  const filteredNegotiations = useMemo(() => {
    return negotiations.filter((n) => {
      if (filterFase !== "ALL" && n.fase !== filterFase) return false;
      if (filterStatus !== "ALL" && n.status !== filterStatus) return false;
      if (filterPrioridade !== "ALL" && n.prioridade !== filterPrioridade) return false;
      return true;
    });
  }, [negotiations, filterFase, filterStatus, filterPrioridade]);

  // Group negotiations by phase for pipeline
  const negotiationsByPhase = useMemo(() => {
    const grouped: Record<StratNegPhase, NegotiationItem[]> = {
      PREPARACAO: [],
      ENGAJAMENTO: [],
      BARGANHA: [],
      COMPROMISSO: [],
      ENCERRADA: [],
    };
    for (const n of negotiations) {
      if (grouped[n.fase]) {
        grouped[n.fase].push(n);
      }
    }
    return grouped;
  }, [negotiations]);

  const isLoading = dashboardQuery.isLoading || listQuery.isLoading;
  const hasNegotiations = negotiations.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">
              Reestruturacao &amp; Negociacoes
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestao estrategica baseada em Harvard, Voss e Teoria dos Jogos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
            >
              <Plus className="size-4 mr-2" />
              + Nova Negociacao
            </Button>
            <Button variant="outline" asChild>
              <Link href="/reestruturacao/estrategico">
                <LayoutDashboard className="size-4 mr-2" />
                Dashboard Estrategico
              </Link>
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KPI CARDS */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Negociacoes Ativas */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Negociacoes Ativas
                </p>
                <Handshake className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {dashboard?.total_ativas ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboard?.by_phase
                      ? Object.entries(dashboard.by_phase)
                          .filter(([, v]) => v.count > 0)
                          .map(
                            ([k, v]) =>
                              `${STRAT_NEG_PHASE_LABELS[k as StratNegPhase] ?? k}: ${v.count}`
                          )
                          .join(" | ")
                      : "Sem negociacoes"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Volume em Negociacao */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Volume em Negociacao
                </p>
                <DollarSign className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {formatBigIntBRL(dashboard?.total_valor ?? null)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Em creditos sendo negociados
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Haircut Medio */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Haircut Medio
                </p>
                <Percent className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {dashboard?.haircut_medio?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Desconto medio obtido
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Taxa de Sucesso */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de Sucesso
                </p>
                <TrendingUp className="size-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {dashboard?.taxa_sucesso?.toFixed(0) || 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acordos vs total encerradas
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* VIEW MODE TOGGLE */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "pipeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("pipeline")}
          >
            <Columns3 className="size-4 mr-2" />
            Pipeline
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <LayoutList className="size-4 mr-2" />
            Tabela
          </Button>
        </div>

        {/* ============================================================ */}
        {/* Cross-Negotiation Intelligence */}
        {/* ============================================================ */}
        <Card className="mb-4 border-[#C9A961]/30 bg-gradient-to-r from-white to-[#FFFFF0]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-[#C9A961]" />
                <CardTitle className="text-sm">Inteligencia IA — Visao Global</CardTitle>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  fetch("/api/ai/neg/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "cross_insights" }),
                  }).catch(() => {});
                }}
              >
                <RefreshCw className="size-3 mr-1" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Clique em "Atualizar" para gerar insights cruzados entre todas as negociacoes ativas.
            </p>
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* CONTENT: PIPELINE OR TABLE */}
        {/* ============================================================ */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : !hasNegotiations ? (
          /* ======== EMPTY STATE ======== */
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardContent className="py-16">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ArrowRightLeft className="size-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma negociacao estrategica
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Inicie uma negociacao estrategica para gerenciar reestruturacoes
                  de passivos, acordos com credores e operacoes complexas utilizando
                  metodologias de Harvard, Voss e Teoria dos Jogos.
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
                >
                  <Plus className="size-4 mr-2" />
                  + Nova Negociacao
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === "pipeline" ? (
          /* ======== PIPELINE KANBAN ======== */
          <PipelineView
            negotiationsByPhase={negotiationsByPhase}
          />
        ) : (
          /* ======== TABLE VIEW ======== */
          <TableView
            negotiations={filteredNegotiations}
            filterFase={filterFase}
            setFilterFase={setFilterFase}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterPrioridade={filterPrioridade}
            setFilterPrioridade={setFilterPrioridade}
          />
        )}

        {/* ============================================================ */}
        {/* NEGOTIATION ASSISTANT (Global context) */}
        {/* ============================================================ */}
        <NegotiationAssistant />

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

// ============================================================
// PIPELINE VIEW COMPONENT
// ============================================================

function PipelineView({
  negotiationsByPhase,
}: {
  negotiationsByPhase: Record<StratNegPhase, NegotiationItem[]>;
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {STRAT_NEG_PHASES.map((phase) => {
          const items = negotiationsByPhase[phase];
          const colorClasses = STRAT_NEG_PHASE_COLORS[phase];

          return (
            <div
              key={phase}
              className="min-w-[280px] max-w-[320px] flex flex-col rounded-lg border bg-muted/20"
            >
              {/* Column Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <Badge className={colorClasses}>
                  {STRAT_NEG_PHASE_LABELS[phase]}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  {items.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-2 space-y-2 overflow-y-auto max-h-[500px]">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Nenhuma negociacao
                  </p>
                ) : (
                  items.map((neg) => (
                    <NegotiationCard key={neg.id} negotiation={neg} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// NEGOTIATION CARD (for Pipeline)
// ============================================================

function NegotiationCard({ negotiation }: { negotiation: NegotiationItem }) {
  const n = negotiation;
  const needsGlow = !!n.ai_proxima_acao || (n.health_score != null && n.health_score < 40);

  return (
    <Link href={`/reestruturacao/${n.id}`}>
      <Card className={`bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow${needsGlow ? " ai-glow" : ""}`}>
        <CardContent className="p-3 space-y-2">
          {/* Title */}
          <p className="text-sm font-medium leading-tight line-clamp-2">
            {n.titulo}
          </p>

          {/* Person / Coletiva */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="size-3" />
            <span className="truncate">
              {n.person?.nome ?? "Coletiva"}
            </span>
          </div>

          {/* Value */}
          <p className="text-sm font-semibold text-[#C9A961]">
            {formatBigIntBRLCompact(n.valor_credito)}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1">
            <Badge
              className={`text-[10px] px-1.5 py-0 ${STRAT_NEG_PRIORITY_COLORS[n.prioridade]}`}
            >
              {STRAT_NEG_PRIORITY_LABELS[n.prioridade]}
            </Badge>
            <Badge
              className={`text-[10px] px-1.5 py-0 ${STRAT_NEG_PHASE_COLORS[n.fase]}`}
            >
              {STRAT_NEG_PHASE_LABELS[n.fase]}
            </Badge>
            {n.status !== "NAO_INICIADA" && (
              <Badge
                className={`text-[10px] px-1.5 py-0 ${STRAT_NEG_STATUS_COLORS[n.status]}`}
              >
                {STRAT_NEG_STATUS_LABELS[n.status]}
              </Badge>
            )}
            {n.tki_perfil_credor && (
              <Badge
                className={`text-[10px] px-1.5 py-0 ${TKI_PROFILE_COLORS[n.tki_perfil_credor]}`}
              >
                {TKI_PROFILE_LABELS[n.tki_perfil_credor]}
              </Badge>
            )}
          </div>

          {/* Next action */}
          {n.proxima_acao && (
            <div className="flex items-start gap-1 text-xs text-muted-foreground pt-1 border-t">
              <Target className="size-3 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="truncate">{n.proxima_acao}</p>
                {n.data_proxima_acao && (
                  <p className="flex items-center gap-1 mt-0.5">
                    <Calendar className="size-3" />
                    {formatDateShort(n.data_proxima_acao)}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================
// TABLE VIEW COMPONENT
// ============================================================

function TableView({
  negotiations,
  filterFase,
  setFilterFase,
  filterStatus,
  setFilterStatus,
  filterPrioridade,
  setFilterPrioridade,
}: {
  negotiations: NegotiationItem[];
  filterFase: string;
  setFilterFase: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterPrioridade: string;
  setFilterPrioridade: (v: string) => void;
}) {
  return (
    <Card className="bg-white rounded-lg shadow-sm border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Negociacoes Estrategicas</CardTitle>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as fases</SelectItem>
              {STRAT_NEG_PHASES.map((phase) => (
                <SelectItem key={phase} value={phase}>
                  {STRAT_NEG_PHASE_LABELS[phase]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger size="sm" className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {Object.entries(STRAT_NEG_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {Object.entries(STRAT_NEG_PRIORITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Codigo
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Credor
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Fase
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Valor Credito
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Proposta Atual
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Pedido Credor
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Gap
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Haircut%
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Prioridade
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  Proxima Acao
                </th>
              </tr>
            </thead>
            <tbody>
              {negotiations.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Nenhuma negociacao encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                negotiations.map((n) => {
                  const gap = computeGap(n.valor_pedido, n.valor_proposta);

                  return (
                    <tr
                      key={n.id}
                      className="border-b hover:bg-muted/20 transition-colors"
                    >
                      {/* Codigo */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/reestruturacao/${n.id}`}
                          className="text-[#C9A961] hover:underline font-medium"
                        >
                          {n.codigo}
                        </Link>
                      </td>

                      {/* Credor */}
                      <td className="px-4 py-3 whitespace-nowrap max-w-[200px]">
                        <span className="truncate block">
                          {n.person?.nome ?? n.titulo}
                        </span>
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">
                          {n.tipo}
                        </Badge>
                      </td>

                      {/* Fase */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          className={`text-xs ${STRAT_NEG_PHASE_COLORS[n.fase]}`}
                        >
                          {STRAT_NEG_PHASE_LABELS[n.fase]}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          className={`text-xs ${STRAT_NEG_STATUS_COLORS[n.status]}`}
                        >
                          {STRAT_NEG_STATUS_LABELS[n.status]}
                        </Badge>
                      </td>

                      {/* Valor Credito */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                        {n.valor_credito
                          ? formatBigIntBRL(n.valor_credito)
                          : <span className="text-muted-foreground">&mdash;</span>}
                      </td>

                      {/* Proposta Atual */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {n.valor_proposta
                          ? formatBigIntBRL(n.valor_proposta)
                          : <span className="text-muted-foreground">&mdash;</span>}
                      </td>

                      {/* Pedido Credor */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {n.valor_pedido
                          ? formatBigIntBRL(n.valor_pedido)
                          : <span className="text-muted-foreground">&mdash;</span>}
                      </td>

                      {/* Gap */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {gap !== null ? (
                          <span
                            className={
                              gap > 0
                                ? "text-red-600 font-medium"
                                : gap < 0
                                ? "text-green-600 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatBigIntBRL(gap)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </td>

                      {/* Haircut% */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {n.haircut_percentual !== null &&
                        n.haircut_percentual !== undefined ? (
                          <span>{n.haircut_percentual.toFixed(1)}%</span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </td>

                      {/* Prioridade */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          className={`text-xs ${STRAT_NEG_PRIORITY_COLORS[n.prioridade]}`}
                        >
                          {STRAT_NEG_PRIORITY_LABELS[n.prioridade]}
                        </Badge>
                      </td>

                      {/* Proxima Acao */}
                      <td className="px-4 py-3 whitespace-nowrap max-w-[200px]">
                        {n.proxima_acao ? (
                          <div className="text-xs">
                            <p className="truncate">{n.proxima_acao}</p>
                            {n.data_proxima_acao && (
                              <p className="text-muted-foreground mt-0.5">
                                {formatDateShort(n.data_proxima_acao)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
