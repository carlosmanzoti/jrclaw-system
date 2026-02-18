"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Shield,
  DollarSign,
  Target,
  Search,
  Plus,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowRight,
  Clock,
  Eye,
  CheckCircle,
  Filter,
  Download,
  Columns3,
  LayoutList,
  User,
  ArrowUp,
  ArrowDown,
  Minus,
  Bell,
  Crosshair,
  Gavel,
  Lock,
  Banknote,
  XCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  CASE_PHASES,
  CASE_PHASE_LABELS,
  CASE_PHASE_COLORS,
  CASE_PHASE_BG_COLORS,
  CASE_STATUS_LABELS,
  CASE_STATUS_COLORS,
  CASE_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  ALERT_SEVERITY_COLORS,
  ALERT_TYPE_LABELS,
  CASE_STATUSES,
  CASE_TYPES,
  PRIORITIES,
  getScoreColor,
  getScoreBgColor,
  getScoreLabel,
  formatCurrency,
  formatCurrencyCompact,
  formatDateShort,
  formatDateFull,
  daysSince,
  daysFromNow,
  type CasePhase,
  type CaseStatus,
  type CaseType,
  type AlertSeverity,
} from "@/lib/recovery-constants";

// ============================================================
// TYPES
// ============================================================

interface DashboardData {
  casos_ativos: number;
  by_phase: Record<string, { count: number }>;
  volume_execucao: number;
  total_recuperado: number;
  percentual_recuperado_global: number;
  valor_bloqueado: number;
  valor_penhorado: number;
  taxa_recuperacao: number;
  score_medio: number;
}

interface RecoveryCaseItem {
  id: string;
  codigo: string;
  devedor_nome: string;
  devedor_cpf_cnpj: string | null;
  tipo: CaseType;
  fase: CasePhase;
  status: CaseStatus;
  prioridade: string;
  valor_total_execucao: number;
  valor_recuperado: number;
  percentual_recuperado: number;
  score_recuperacao: number;
  bens_encontrados: number;
  responsavel_nome: string | null;
  responsavel_avatar: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | Date | null;
  data_entrada_fase: string | Date | null;
  alertas_pendentes: number;
  created_at: string | Date;
}

interface AlertItem {
  id: string;
  severity: AlertSeverity;
  tipo: string;
  devedor_nome: string;
  case_id: string;
  descricao: string;
  data: string | Date;
  lido: boolean;
}

// ============================================================
// PHASE ICONS
// ============================================================

const PHASE_ICONS: Record<CasePhase, React.ComponentType<{ className?: string; color?: string }>> = {
  INVESTIGACAO: Crosshair,
  PRE_JUDICIAL: Gavel,
  EXECUCAO: Target,
  PENHORA: Lock,
  EXPROPRIACAO: Banknote,
  ACORDO: CheckCircle,
  ENCERRADO: XCircle,
};

// ============================================================
// PRIORITY ICON COMPONENTS
// ============================================================

function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
  switch (priority) {
    case "CRITICA":
      return <AlertTriangle className={className} />;
    case "ALTA":
      return <ArrowUp className={className} />;
    case "MEDIA":
      return <Minus className={className} />;
    case "BAIXA":
      return <ArrowDown className={className} />;
  }
}

// ============================================================
// SORT HELPERS
// ============================================================

type SortField =
  | "codigo"
  | "devedor_nome"
  | "tipo"
  | "fase"
  | "status"
  | "valor_total_execucao"
  | "valor_recuperado"
  | "percentual_recuperado"
  | "score_recuperacao"
  | "bens_encontrados"
  | "prioridade"
  | "responsavel_nome"
  | "data_proxima_acao";

type SortDirection = "asc" | "desc";

function compareCases(
  a: RecoveryCaseItem,
  b: RecoveryCaseItem,
  field: SortField,
  direction: SortDirection
): number {
  let valA: string | number | null;
  let valB: string | number | null;

  switch (field) {
    case "codigo":
      valA = a.codigo;
      valB = b.codigo;
      break;
    case "devedor_nome":
      valA = a.devedor_nome;
      valB = b.devedor_nome;
      break;
    case "tipo":
      valA = a.tipo;
      valB = b.tipo;
      break;
    case "fase":
      valA = CASE_PHASES.indexOf(a.fase);
      valB = CASE_PHASES.indexOf(b.fase);
      break;
    case "status":
      valA = a.status;
      valB = b.status;
      break;
    case "valor_total_execucao":
      valA = a.valor_total_execucao;
      valB = b.valor_total_execucao;
      break;
    case "valor_recuperado":
      valA = a.valor_recuperado;
      valB = b.valor_recuperado;
      break;
    case "percentual_recuperado":
      valA = a.percentual_recuperado;
      valB = b.percentual_recuperado;
      break;
    case "score_recuperacao":
      valA = a.score_recuperacao;
      valB = b.score_recuperacao;
      break;
    case "bens_encontrados":
      valA = a.bens_encontrados;
      valB = b.bens_encontrados;
      break;
    case "prioridade":
      valA = PRIORITIES.indexOf(a.prioridade as typeof PRIORITIES[number]);
      valB = PRIORITIES.indexOf(b.prioridade as typeof PRIORITIES[number]);
      break;
    case "responsavel_nome":
      valA = a.responsavel_nome ?? "";
      valB = b.responsavel_nome ?? "";
      break;
    case "data_proxima_acao":
      valA = a.data_proxima_acao ? new Date(a.data_proxima_acao).getTime() : 0;
      valB = b.data_proxima_acao ? new Date(b.data_proxima_acao).getTime() : 0;
      break;
    default:
      return 0;
  }

  if (valA == null) valA = "";
  if (valB == null) valB = "";

  let cmp: number;
  if (typeof valA === "number" && typeof valB === "number") {
    cmp = valA - valB;
  } else {
    cmp = String(valA).localeCompare(String(valB), "pt-BR");
  }

  return direction === "asc" ? cmp : -cmp;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function RecoveryLayout() {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [viewMode, setViewMode] = useState<"pipeline" | "table">("pipeline");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFase, setFilterFase] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterTipo, setFilterTipo] = useState<string>("ALL");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("ALL");
  const [filterResponsavel, setFilterResponsavel] = useState<string>("ALL");

  // Sort
  const [sortField, setSortField] = useState<SortField>("prioridade");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Data fetching
  const dashboardQuery = trpc.recovery.cases.dashboard.useQuery({}, {
    refetchInterval: 60000,
  });
  const listQuery = trpc.recovery.cases.list.useQuery({});
  const alertsQuery = trpc.recovery.alerts.list.useQuery({ lido: false });

  const updatePhaseMutation = trpc.recovery.cases.updatePhase.useMutation({
    onSuccess: () => {
      listQuery.refetch();
      dashboardQuery.refetch();
    },
  });

  // Map dashboard data from API shape to component shape
  const rawDashboard = dashboardQuery.data;
  const dashboard: DashboardData | undefined = rawDashboard
    ? {
        casos_ativos: rawDashboard.total_active ?? 0,
        by_phase: Object.fromEntries(
          Object.entries(rawDashboard.by_fase ?? {}).map(([k, v]) => [
            k,
            { count: typeof v === "number" ? v : 0 },
          ])
        ),
        volume_execucao: rawDashboard.total_valor_execucao ?? 0,
        total_recuperado: rawDashboard.total_valor_recuperado ?? 0,
        percentual_recuperado_global: rawDashboard.avg_percentual_recuperado ?? 0,
        valor_bloqueado: 0,
        valor_penhorado: 0,
        taxa_recuperacao: rawDashboard.avg_percentual_recuperado ?? 0,
        score_medio: rawDashboard.avg_score_recuperacao ?? 0,
      }
    : undefined;

  // Map cases list from paginated API response to flat component shape
  const rawList = listQuery.data;
  const cases: RecoveryCaseItem[] = (rawList?.items ?? []).map((item: Record<string, unknown>) => {
    const person = item.person as Record<string, unknown> | null;
    const responsavel = item.responsavel as Record<string, unknown> | null;
    const counts = item._count as Record<string, number> | null;
    return {
      id: item.id as string,
      codigo: item.codigo as string,
      devedor_nome: (item.devedor_nome as string) || (person?.nome as string) || "Sem nome",
      devedor_cpf_cnpj: (item.devedor_cpf_cnpj as string | null) ?? (person?.cpf_cnpj as string | null) ?? null,
      tipo: item.tipo as CaseType,
      fase: item.fase as CasePhase,
      status: item.status as CaseStatus,
      prioridade: item.prioridade as string,
      valor_total_execucao: (item.valor_total_execucao as number) ?? 0,
      valor_recuperado: (item.valor_recuperado as number) ?? 0,
      percentual_recuperado: (item.percentual_recuperado as number) ?? 0,
      score_recuperacao: (item.score_recuperacao as number) ?? 0,
      bens_encontrados: counts?.bens ?? 0,
      responsavel_nome: (responsavel?.name as string | null) ?? null,
      responsavel_avatar: null,
      proxima_acao: (item.proxima_acao as string | null) ?? null,
      data_proxima_acao: (item.data_proxima_acao as string | Date | null) ?? null,
      data_entrada_fase: (item.data_entrada_fase as string | Date | null) ?? null,
      alertas_pendentes: 0,
      created_at: item.created_at as string | Date,
    };
  });

  // Map alerts from paginated API response to flat component shape
  const rawAlerts = alertsQuery.data;
  const alerts: AlertItem[] = (rawAlerts?.items ?? []).map((item: Record<string, unknown>) => {
    const monitoring = item.monitoring as Record<string, unknown> | null;
    return {
      id: item.id as string,
      severity: (item.severidade as AlertSeverity) ?? "BAIXA",
      tipo: item.tipo as string,
      devedor_nome: "",
      case_id: (monitoring?.recovery_case_id as string) ?? "",
      descricao: (item.descricao as string) ?? (item.titulo as string) ?? "",
      data: (item.created_at as string | Date) ?? new Date(),
      lido: (item.lido as boolean) ?? false,
    };
  });

  // Search and filter logic
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (filterFase !== "ALL" && c.fase !== filterFase) return false;
      if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
      if (filterTipo !== "ALL" && c.tipo !== filterTipo) return false;
      if (filterPrioridade !== "ALL" && c.prioridade !== filterPrioridade) return false;
      if (filterResponsavel !== "ALL" && c.responsavel_nome !== filterResponsavel) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = c.devedor_nome.toLowerCase().includes(query);
        const matchesCpf = c.devedor_cpf_cnpj?.toLowerCase().includes(query);
        const matchesCodigo = c.codigo.toLowerCase().includes(query);
        if (!matchesName && !matchesCpf && !matchesCodigo) return false;
      }
      return true;
    });
  }, [cases, filterFase, filterStatus, filterTipo, filterPrioridade, filterResponsavel, searchQuery]);

  // Sorted cases for table
  const sortedCases = useMemo(() => {
    return [...filteredCases].sort((a, b) =>
      compareCases(a, b, sortField, sortDirection)
    );
  }, [filteredCases, sortField, sortDirection]);

  // Group cases by phase for pipeline
  const casesByPhase = useMemo(() => {
    const grouped: Record<CasePhase, RecoveryCaseItem[]> = {
      INVESTIGACAO: [],
      PRE_JUDICIAL: [],
      EXECUCAO: [],
      PENHORA: [],
      EXPROPRIACAO: [],
      ACORDO: [],
      ENCERRADO: [],
    };
    for (const c of cases) {
      if (grouped[c.fase]) {
        grouped[c.fase].push(c);
      }
    }
    return grouped;
  }, [cases]);

  // Unique responsaveis for filter
  const responsaveis = useMemo(() => {
    const set = new Set<string>();
    for (const c of cases) {
      if (c.responsavel_nome) set.add(c.responsavel_nome);
    }
    return Array.from(set).sort();
  }, [cases]);

  // Sort handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField]
  );

  const isLoading = dashboardQuery.isLoading || listQuery.isLoading;
  const hasCases = cases.length > 0;
  const pendingAlerts = alerts.filter((a) => !a.lido).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* ============================================================ */}
        {/* HEADER                                                       */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">
              Recuperacao de Credito
            </h1>
            <p className="text-sm text-muted-foreground">
              Investigacao patrimonial, execucao judicial e recuperacao de ativos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setShowWizard(true)}
              className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
            >
              <Plus className="size-4 mr-2" />
              Novo Caso
            </Button>
            <Button variant="outline" asChild>
              <Link href="/recuperacao-credito/dashboard">
                <BarChart3 className="size-4 mr-2" />
                Dashboard Analitico
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/recuperacao-credito/investigacao">
                <Crosshair className="size-4 mr-2" />
                Investigacao Patrimonial
              </Link>
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KPI CARDS                                                    */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Row 1: Card 1 - Casos Ativos */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Casos Ativos
                </p>
                <Shield className="size-4 text-[#C9A961]" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {dashboard?.casos_ativos ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboard?.by_phase
                      ? Object.entries(dashboard.by_phase)
                          .filter(([, v]) => v.count > 0)
                          .map(
                            ([k, v]) =>
                              `${CASE_PHASE_LABELS[k as CasePhase] ?? k}: ${v.count}`
                          )
                          .join(" | ")
                      : "Nenhum caso"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Row 1: Card 2 - Volume em Execucao */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Volume em Execucao
                </p>
                <DollarSign className="size-4 text-[#C9A961]" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {formatCurrencyCompact(dashboard?.volume_execucao ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total em execucoes ativas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Row 1: Card 3 - Total Recuperado */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Recuperado
                </p>
                <TrendingUp className="size-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrencyCompact(dashboard?.total_recuperado ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboard?.percentual_recuperado_global != null
                      ? `${dashboard.percentual_recuperado_global.toFixed(1)}% do total em execucao`
                      : "0% do total em execucao"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Row 2: Card 4 - Bloqueado/Penhorado */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Bloqueado / Penhorado
                </p>
                <Lock className="size-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrencyCompact(
                      (dashboard?.valor_bloqueado ?? 0) +
                        (dashboard?.valor_penhorado ?? 0)
                    )}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Bloq: {formatCurrencyCompact(dashboard?.valor_bloqueado ?? 0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Penh: {formatCurrencyCompact(dashboard?.valor_penhorado ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Row 2: Card 5 - Taxa de Recuperacao */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de Recuperacao
                </p>
                <Target className="size-4 text-[#C9A961]" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {dashboard?.taxa_recuperacao?.toFixed(1) ?? "0"}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Media ponderada por valor
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Row 2: Card 6 - Score Medio */}
          <Card className="bg-white rounded-lg shadow-sm border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Score Medio IA
                </p>
                <BarChart3 className="size-4 text-[#C9A961]" />
              </div>
            </CardHeader>
            <CardContent>
              {dashboardQuery.isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <p
                      className={`text-2xl font-bold ${getScoreColor(
                        dashboard?.score_medio ?? 0
                      )}`}
                    >
                      {dashboard?.score_medio?.toFixed(0) ?? "0"}
                    </p>
                    {/* Mini gauge */}
                    <div className="flex-1 max-w-[100px]">
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(dashboard?.score_medio ?? 0, 100)}%`,
                            backgroundColor:
                              (dashboard?.score_medio ?? 0) >= 70
                                ? "#10B981"
                                : (dashboard?.score_medio ?? 0) >= 40
                                ? "#F59E0B"
                                : "#EF4444",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getScoreLabel(dashboard?.score_medio ?? 0)} — probabilidade de
                    recuperacao
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* VIEW MODE TOGGLE + SEARCH                                    */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ ou codigo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* CONTENT: PIPELINE OR TABLE                                   */}
        {/* ============================================================ */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : !hasCases ? (
          <EmptyState onCreateNew={() => setShowWizard(true)} />
        ) : (
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "pipeline" | "table")}>
            <TabsContent value="pipeline" className="mt-0">
              <PipelineView
                casesByPhase={casesByPhase}
                onPhaseChange={(caseId, newPhase) => {
                  updatePhaseMutation.mutate({ id: caseId, fase: newPhase });
                }}
              />
            </TabsContent>
            <TabsContent value="table" className="mt-0">
              <TableView
                cases={sortedCases}
                filterFase={filterFase}
                setFilterFase={setFilterFase}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterTipo={filterTipo}
                setFilterTipo={setFilterTipo}
                filterPrioridade={filterPrioridade}
                setFilterPrioridade={setFilterPrioridade}
                filterResponsavel={filterResponsavel}
                setFilterResponsavel={setFilterResponsavel}
                responsaveis={responsaveis}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </TabsContent>
          </Tabs>
        )}

        {/* ============================================================ */}
        {/* ALERTS SECTION                                               */}
        {/* ============================================================ */}
        <AlertsSection
          alerts={alerts}
          isLoading={alertsQuery.isLoading}
          pendingCount={pendingAlerts}
        />

        {/* ============================================================ */}
        {/* WIZARD DIALOG                                                */}
        {/* ============================================================ */}
        <WizardDialog open={showWizard} onOpenChange={setShowWizard} />
      </div>
    </div>
  );
}

// ============================================================
// LOADING SKELETON
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Pipeline skeleton */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {CASE_PHASES.map((phase) => (
            <div
              key={phase}
              className="min-w-[260px] max-w-[300px] flex flex-col rounded-lg border bg-muted/20"
            >
              <div className="p-3 border-b">
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="p-2 space-y-2">
                <Skeleton className="h-[120px] w-full rounded-lg" />
                <Skeleton className="h-[120px] w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <Card className="bg-white rounded-lg shadow-sm border">
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            Nenhum caso de recuperacao de credito
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Inicie um novo caso de recuperacao de credito para gerenciar
            investigacoes patrimoniais, execucoes judiciais e acompanhar a
            recuperacao de ativos dos seus clientes.
          </p>
          <Button
            onClick={onCreateNew}
            className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
          >
            <Plus className="size-4 mr-2" />
            Novo Caso
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// PIPELINE VIEW
// ============================================================

function PipelineView({
  casesByPhase,
  onPhaseChange,
}: {
  casesByPhase: Record<CasePhase, RecoveryCaseItem[]>;
  onPhaseChange: (caseId: string, newPhase: CasePhase) => void;
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {CASE_PHASES.map((phase) => {
          const items = casesByPhase[phase];
          const PhaseIcon = PHASE_ICONS[phase];
          const phaseColor = CASE_PHASE_COLORS[phase];

          return (
            <div
              key={phase}
              className="min-w-[270px] max-w-[310px] flex flex-col rounded-lg border bg-muted/10"
            >
              {/* Column Header */}
              <div
                className="p-3 border-b flex items-center justify-between"
                style={{ borderBottomColor: phaseColor }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="size-6 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${phaseColor}20` }}
                  >
                    <PhaseIcon
                      className="size-3.5"
                      color={phaseColor}
                    />
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: phaseColor }}
                  >
                    {CASE_PHASE_LABELS[phase]}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 min-w-[20px] text-center"
                >
                  {items.length}
                </Badge>
              </div>

              {/* Column Cards */}
              <ScrollArea className="flex-1 max-h-[520px]">
                <div className="p-2 space-y-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhum caso
                    </p>
                  ) : (
                    items.map((caseItem) => (
                      <PipelineCard key={caseItem.id} caseItem={caseItem} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// PIPELINE CARD
// ============================================================

function PipelineCard({ caseItem }: { caseItem: RecoveryCaseItem }) {
  const c = caseItem;
  const daysInPhase = daysSince(c.data_entrada_fase);
  const nextActionDays = daysFromNow(c.data_proxima_acao);
  const isOverdue = nextActionDays !== null && nextActionDays < 0;

  return (
    <Link href={`/recuperacao-credito/${c.id}`}>
      <Card
        className={`bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${
          c.alertas_pendentes > 0 ? "border-amber-300" : ""
        }`}
      >
        <CardContent className="p-3 space-y-2">
          {/* Devedor name + alert badge */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">
              {c.devedor_nome}
            </p>
            {c.alertas_pendentes > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1 py-0 shrink-0">
                <Bell className="size-2.5 mr-0.5" />
                {c.alertas_pendentes}
              </Badge>
            )}
          </div>

          {/* Value */}
          <p className="text-sm font-semibold text-[#C9A961]">
            {formatCurrencyCompact(c.valor_total_execucao)}
          </p>

          {/* Score badge */}
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] px-1.5 py-0 ${getScoreBgColor(c.score_recuperacao)}`}>
              Score: {c.score_recuperacao}
            </Badge>
            <PriorityIcon
              priority={c.prioridade}
              className={`size-3.5 ${
                c.prioridade === "CRITICA"
                  ? "text-red-500"
                  : c.prioridade === "ALTA"
                  ? "text-orange-500"
                  : c.prioridade === "MEDIA"
                  ? "text-yellow-500"
                  : "text-gray-400"
              }`}
            />
          </div>

          {/* Progress bar (% recovered) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Recuperado</span>
              <span>{c.percentual_recuperado.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(c.percentual_recuperado, 100)}%`,
                  backgroundColor:
                    c.percentual_recuperado >= 70
                      ? "#10B981"
                      : c.percentual_recuperado >= 30
                      ? "#F59E0B"
                      : "#EF4444",
                }}
              />
            </div>
          </div>

          {/* Next action + days in phase */}
          {c.proxima_acao && (
            <div className="flex items-start gap-1 text-xs text-muted-foreground pt-1 border-t">
              <Target className="size-3 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{c.proxima_acao}</p>
                {c.data_proxima_acao && (
                  <p
                    className={`flex items-center gap-1 mt-0.5 ${
                      isOverdue ? "text-red-600 font-medium" : ""
                    }`}
                  >
                    <Clock className="size-3" />
                    {formatDateShort(c.data_proxima_acao)}
                    {isOverdue && " (atrasado)"}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer: days in phase */}
          {daysInPhase !== null && (
            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
              <span>
                {daysInPhase} {daysInPhase === 1 ? "dia" : "dias"} nesta fase
              </span>
              {c.bens_encontrados > 0 && (
                <span className="font-medium">
                  {c.bens_encontrados} {c.bens_encontrados === 1 ? "bem" : "bens"}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================
// TABLE VIEW
// ============================================================

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <TableHead
      className={`whitespace-nowrap cursor-pointer select-none hover:bg-muted/50 transition-colors ${
        className ?? ""
      }`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive &&
          (currentDirection === "asc" ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          ))}
      </div>
    </TableHead>
  );
}

function TableView({
  cases,
  filterFase,
  setFilterFase,
  filterStatus,
  setFilterStatus,
  filterTipo,
  setFilterTipo,
  filterPrioridade,
  setFilterPrioridade,
  filterResponsavel,
  setFilterResponsavel,
  responsaveis,
  sortField,
  sortDirection,
  onSort,
}: {
  cases: RecoveryCaseItem[];
  filterFase: string;
  setFilterFase: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  filterTipo: string;
  setFilterTipo: (v: string) => void;
  filterPrioridade: string;
  setFilterPrioridade: (v: string) => void;
  filterResponsavel: string;
  setFilterResponsavel: (v: string) => void;
  responsaveis: string[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  return (
    <Card className="bg-white rounded-lg shadow-sm border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Casos de Recuperacao de Credito</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Exportar
          </Button>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="size-3" />
            Filtros:
          </div>

          <Select value={filterFase} onValueChange={setFilterFase}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as fases</SelectItem>
              {CASE_PHASES.map((phase) => (
                <SelectItem key={phase} value={phase}>
                  {CASE_PHASE_LABELS[phase]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[170px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {CASE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {CASE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {CASE_TYPES.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {CASE_TYPE_LABELS[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {responsaveis.length > 0 && (
            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Responsavel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {responsaveis.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortableHeader
                  label="Codigo"
                  field="codigo"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Devedor"
                  field="devedor_nome"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Tipo"
                  field="tipo"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Fase"
                  field="fase"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Status"
                  field="status"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Valor Execucao"
                  field="valor_total_execucao"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Valor Recuperado"
                  field="valor_recuperado"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  className="text-right"
                />
                <SortableHeader
                  label="% Recup."
                  field="percentual_recuperado"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  className="text-right"
                />
                <SortableHeader
                  label="Score IA"
                  field="score_recuperacao"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  className="text-center"
                />
                <SortableHeader
                  label="Bens"
                  field="bens_encontrados"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  className="text-center"
                />
                <SortableHeader
                  label="Prioridade"
                  field="prioridade"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <SortableHeader
                  label="Responsavel"
                  field="responsavel_nome"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
                <TableHead className="whitespace-nowrap">Proxima Acao</TableHead>
                <SortableHeader
                  label="Prazo"
                  field="data_proxima_acao"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={onSort}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={14}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    Nenhum caso encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                cases.map((c) => {
                  const nextDays = daysFromNow(c.data_proxima_acao);
                  const isOverdue = nextDays !== null && nextDays < 0;

                  return (
                    <TableRow
                      key={c.id}
                      className="hover:bg-muted/20 transition-colors cursor-pointer"
                    >
                      {/* Codigo */}
                      <TableCell className="whitespace-nowrap">
                        <Link
                          href={`/recuperacao-credito/${c.id}`}
                          className="text-[#C9A961] hover:underline font-medium"
                        >
                          {c.codigo}
                        </Link>
                      </TableCell>

                      {/* Devedor */}
                      <TableCell className="whitespace-nowrap max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate block">{c.devedor_nome}</span>
                          {c.alertas_pendentes > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1 py-0">
                              {c.alertas_pendentes}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Tipo */}
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px]">
                          {CASE_TYPE_LABELS[c.tipo] ?? c.tipo}
                        </Badge>
                      </TableCell>

                      {/* Fase */}
                      <TableCell className="whitespace-nowrap">
                        <Badge className={`text-[10px] ${CASE_PHASE_BG_COLORS[c.fase]}`}>
                          {CASE_PHASE_LABELS[c.fase]}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">
                        <Badge className={`text-[10px] ${CASE_STATUS_COLORS[c.status]}`}>
                          {CASE_STATUS_LABELS[c.status]}
                        </Badge>
                      </TableCell>

                      {/* Valor Execucao */}
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {formatCurrency(c.valor_total_execucao)}
                      </TableCell>

                      {/* Valor Recuperado */}
                      <TableCell className="text-right whitespace-nowrap">
                        {c.valor_recuperado > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            {formatCurrency(c.valor_recuperado)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>

                      {/* % Recuperado */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(c.percentual_recuperado, 100)}%`,
                                backgroundColor:
                                  c.percentual_recuperado >= 70
                                    ? "#10B981"
                                    : c.percentual_recuperado >= 30
                                    ? "#F59E0B"
                                    : "#EF4444",
                              }}
                            />
                          </div>
                          <span className="text-xs">
                            {c.percentual_recuperado.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>

                      {/* Score IA */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          className={`text-[10px] ${getScoreBgColor(c.score_recuperacao)}`}
                        >
                          {c.score_recuperacao}
                        </Badge>
                      </TableCell>

                      {/* Bens Encontrados */}
                      <TableCell className="text-center whitespace-nowrap">
                        {c.bens_encontrados > 0 ? (
                          <span className="font-medium">{c.bens_encontrados}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>

                      {/* Prioridade */}
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          className={`text-[10px] ${PRIORITY_COLORS[c.prioridade]}`}
                        >
                          <PriorityIcon
                            priority={c.prioridade}
                            className="size-2.5 mr-1"
                          />
                          {PRIORITY_LABELS[c.prioridade]}
                        </Badge>
                      </TableCell>

                      {/* Responsavel */}
                      <TableCell className="whitespace-nowrap">
                        {c.responsavel_nome ? (
                          <div className="flex items-center gap-1.5">
                            <div className="size-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
                              {c.responsavel_nome
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <span className="text-xs truncate max-w-[100px]">
                              {c.responsavel_nome}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>

                      {/* Proxima Acao */}
                      <TableCell className="whitespace-nowrap max-w-[180px]">
                        {c.proxima_acao ? (
                          <span className="text-xs truncate block">
                            {c.proxima_acao}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>

                      {/* Prazo */}
                      <TableCell className="whitespace-nowrap">
                        {c.data_proxima_acao ? (
                          <span
                            className={`text-xs ${
                              isOverdue
                                ? "text-red-600 font-semibold"
                                : nextDays !== null && nextDays <= 3
                                ? "text-amber-600 font-medium"
                                : ""
                            }`}
                          >
                            {formatDateShort(c.data_proxima_acao)}
                            {isOverdue && (
                              <span className="block text-[10px]">
                                ({Math.abs(nextDays!)}d atrasado)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Result count */}
        {cases.length > 0 && (
          <div className="px-4 py-3 border-t text-xs text-muted-foreground">
            {cases.length} {cases.length === 1 ? "caso encontrado" : "casos encontrados"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// ALERTS SECTION
// ============================================================

function AlertsSection({
  alerts,
  isLoading,
  pendingCount,
}: {
  alerts: AlertItem[];
  isLoading: boolean;
  pendingCount: number;
}) {
  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow-sm border">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  // Sort by severity: CRITICA first, then ALTA, MEDIA, BAIXA
  const severityOrder: AlertSeverity[] = ["CRITICA", "ALTA", "MEDIA", "BAIXA"];
  const sortedAlerts = [...alerts].sort((a, b) => {
    const aIdx = severityOrder.indexOf(a.severity);
    const bIdx = severityOrder.indexOf(b.severity);
    return aIdx - bIdx;
  });

  return (
    <Card className="bg-white rounded-lg shadow-sm border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <CardTitle className="text-base">Alertas de Monitoramento</CardTitle>
            {pendingCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0">
                {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/recuperacao-credito/alertas">
              Ver todos
              <ArrowRight className="size-3 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedAlerts.slice(0, 8).map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
          {sortedAlerts.length > 8 && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              + {sortedAlerts.length - 8} alertas adicionais
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// ALERT CARD
// ============================================================

function AlertCard({ alert }: { alert: AlertItem }) {
  const severityConfig: Record<
    AlertSeverity,
    { icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    CRITICA: { icon: AlertTriangle, color: "text-red-600" },
    ALTA: { icon: AlertTriangle, color: "text-orange-500" },
    MEDIA: { icon: Bell, color: "text-yellow-500" },
    BAIXA: { icon: Bell, color: "text-blue-500" },
    INFO: { icon: Bell, color: "text-gray-500" },
  };

  const config = severityConfig[alert.severity];
  const SeverityIcon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${
        ALERT_SEVERITY_COLORS[alert.severity]
      }`}
    >
      <SeverityIcon className={`size-4 mt-0.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {ALERT_TYPE_LABELS[alert.tipo] ?? alert.tipo}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {alert.devedor_nome}
          </span>
        </div>
        <p className="text-sm">{alert.descricao}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDateFull(alert.data)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href={`/recuperacao-credito/${alert.case_id}`}>
            <Eye className="size-3 mr-1" />
            Ver
          </Link>
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <CheckCircle className="size-3 mr-1" />
          Resolver
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// WIZARD DIALOG
// ============================================================

function WizardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Lazy import to keep the main bundle lean.
  // The RecoveryWizard component will be created by another agent.
  let WizardContent: React.ReactNode;

  try {
    // Dynamic import pattern — will render placeholder if component is not yet available
    const { RecoveryWizard } = require("@/components/recovery/recovery-wizard");
    WizardContent = (
      <RecoveryWizard onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
    );
  } catch {
    WizardContent = (
      <div className="py-12 text-center">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Plus className="size-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Assistente de Novo Caso</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          O componente do assistente de criacao de novos casos sera carregado aqui.
          Este modulo esta em desenvolvimento.
        </p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-[#C9A961]" />
            Novo Caso de Recuperacao de Credito
          </DialogTitle>
        </DialogHeader>
        {WizardContent}
      </DialogContent>
    </Dialog>
  );
}
