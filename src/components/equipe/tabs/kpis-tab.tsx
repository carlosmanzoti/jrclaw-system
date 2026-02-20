"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadarCompetency } from "@/components/equipe/RadarCompetency"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from "recharts"
import {
  Plus,
  AlertTriangle,
  Loader2,
  Clock,
  Target,
  TrendingUp,
  Star,
  BookOpen,
  Users,
  DollarSign,
  X,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberAverage {
  memberId: string
  memberName: string
  avatarUrl: string | null
  avgBillableHours: number
  avgUtilizationRate: number
  avgDeadlineCompliance: number
  avgOverallScore: number
  totalRevenueGenerated: number
}

interface TrendPoint {
  month: string
  avgBillableHours: number
  avgUtilizationRate: number
  avgDeadlineCompliance: number
}

interface KPIDashboardData {
  memberAverages: MemberAverage[]
  rankings: MemberAverage[]
  trends: TrendPoint[]
}

interface KPIEntry {
  id: string
  teamMemberId: string
  period: string
  billableHours?: number | null
  totalHours?: number | null
  utilizationRate?: number | null
  casesActive?: number | null
  deadlinesMet?: number | null
  deadlinesTotal?: number | null
  deadlineComplianceRate?: number | null
  piecesProduced?: number | null
  piecesQualityScore?: number | null
  caseSuccessRate?: number | null
  revenueGenerated?: number | null
  clientsAcquired?: number | null
  trainingHours?: number | null
  mentoringSessions?: number | null
  overallScore?: number | null
  teamMember?: { user: { id: string; name: string; avatar_url: string | null } }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BILLABLE_HOURS_GOAL = 120
const MONTHS_PT: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
}

function formatMonth(isoMonth: string) {
  const [, mm] = isoMonth.split("-")
  return MONTHS_PT[mm] ?? isoMonth
}

function pct(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—"
  return `${value.toFixed(digits)}%`
}

function num(value: number | null | undefined, digits = 0): string {
  if (value == null) return "—"
  return value.toFixed(digits)
}

function currency(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)
}

// ─── Gauge bar ────────────────────────────────────────────────────────────────

interface GaugeBarProps {
  value: number | null | undefined
  goal: number
  unit?: string
  colorBand?: boolean
}

function GaugeBar({ value, goal, unit = "h", colorBand = false }: GaugeBarProps) {
  const v = value ?? 0
  const pctFilled = Math.min(100, (v / goal) * 100)
  const color = colorBand
    ? pctFilled >= 90 ? "#16a34a" : pctFilled >= 70 ? "#ca8a04" : "#dc2626"
    : "#3b82f6"

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{value != null ? `${v.toFixed(0)}${unit}` : "—"}</span>
        <span>Meta: {goal}{unit}</span>
      </div>
      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pctFilled}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-right text-xs text-gray-400">{pctFilled.toFixed(0)}%</div>
    </div>
  )
}

// ─── KPI metric row ───────────────────────────────────────────────────────────

interface MetricRowProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
}

function MetricRow({ label, value, sub, icon }: MetricRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="text-gray-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <span className="text-sm font-semibold text-gray-800 shrink-0">{value}</span>
    </div>
  )
}

// ─── Input KPI dialog ─────────────────────────────────────────────────────────

interface InputKPIDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  members: { id: string; user: { name: string } }[]
  onSuccess: () => void
}

function InputKPIDialog({ open, onOpenChange, members, onSuccess }: InputKPIDialogProps) {
  const now = new Date()
  const [memberId, setMemberId]         = React.useState("")
  const [period, setPeriod]             = React.useState(now.toISOString().slice(0, 7))
  const [billableHours, setBillable]    = React.useState("")
  const [totalHours, setTotal]          = React.useState("")
  const [casesActive, setCasesActive]   = React.useState("")
  const [deadlinesMet, setDeadlinesMet] = React.useState("")
  const [deadlinesTotal, setDeadlinesTotal] = React.useState("")
  const [piecesProduced, setPieces]     = React.useState("")
  const [qualityScore, setQuality]      = React.useState("")
  const [successRate, setSuccessRate]   = React.useState("")
  const [revenue, setRevenue]           = React.useState("")
  const [clientsAcquired, setClients]   = React.useState("")
  const [trainingHours, setTraining]    = React.useState("")
  const [mentoringSessions, setMentoring] = React.useState("")

  const createMutation = trpc.team.kpis.create.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
    },
  })

  function n(v: string): number | undefined {
    const parsed = parseFloat(v)
    return isNaN(parsed) ? undefined : parsed
  }

  function ni(v: string): number | undefined {
    const parsed = parseInt(v)
    return isNaN(parsed) ? undefined : parsed
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId) return

    const bh = n(billableHours)
    const th = n(totalHours)
    const dm = ni(deadlinesMet)
    const dt = ni(deadlinesTotal)

    createMutation.mutate({
      teamMemberId: memberId,
      period: new Date(`${period}-01`),
      billableHours: bh,
      totalHours: th,
      utilizationRate: bh != null && th != null && th > 0 ? (bh / th) * 100 : undefined,
      casesActive: ni(casesActive),
      deadlinesMet: dm,
      deadlinesTotal: dt,
      deadlineComplianceRate: dm != null && dt != null && dt > 0 ? (dm / dt) * 100 : undefined,
      piecesProduced: ni(piecesProduced),
      piecesQualityScore: n(qualityScore),
      caseSuccessRate: n(successRate),
      revenueGenerated: n(revenue),
      clientsAcquired: ni(clientsAcquired),
      trainingHours: n(trainingHours),
      mentoringSessions: ni(mentoringSessions),
    })
  }

  const fields: { label: string; state: string; setter: (v: string) => void; type?: "float" | "int"; placeholder?: string }[] = [
    { label: "Horas Faturáveis", state: billableHours, setter: setBillable, placeholder: "Ex: 96" },
    { label: "Horas Totais", state: totalHours, setter: setTotal, placeholder: "Ex: 160" },
    { label: "Casos Ativos", state: casesActive, setter: setCasesActive, type: "int", placeholder: "Ex: 12" },
    { label: "Prazos Cumpridos", state: deadlinesMet, setter: setDeadlinesMet, type: "int", placeholder: "Ex: 8" },
    { label: "Total de Prazos", state: deadlinesTotal, setter: setDeadlinesTotal, type: "int", placeholder: "Ex: 10" },
    { label: "Peças Produzidas", state: piecesProduced, setter: setPieces, type: "int", placeholder: "Ex: 5" },
    { label: "Nota de Qualidade (0-10)", state: qualityScore, setter: setQuality, placeholder: "Ex: 8.5" },
    { label: "Taxa de Êxito (%)", state: successRate, setter: setSuccessRate, placeholder: "Ex: 75" },
    { label: "Receita Gerada (R$)", state: revenue, setter: setRevenue, placeholder: "Ex: 25000" },
    { label: "Clientes Captados", state: clientsAcquired, setter: setClients, type: "int", placeholder: "Ex: 2" },
    { label: "Horas de Treinamento", state: trainingHours, setter: setTraining, placeholder: "Ex: 4" },
    { label: "Sessões de Mentoria", state: mentoringSessions, setter: setMentoring, type: "int", placeholder: "Ex: 2" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lançar KPIs do Mês</DialogTitle>
          <DialogDescription>
            Informe os dados mensais do membro selecionado. Campos vazios serão ignorados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Member + Period */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Membro *</label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Período *</label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* All KPI fields in 2-column grid */}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(({ label, state, setter, placeholder }) => (
              <div key={label}>
                <label className="text-xs font-medium text-gray-700 mb-1 block">{label}</label>
                <Input
                  type="number"
                  step="any"
                  placeholder={placeholder}
                  value={state}
                  onChange={(e) => setter(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>

          {createMutation.isError && (
            <p className="text-xs text-red-600">Erro: {createMutation.error?.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !memberId}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar KPIs
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EquipeKPIsTab() {
  const [dialogOpen, setDialogOpen]     = React.useState(false)
  const [filterMemberId, setFilterMemberId] = React.useState("")
  const [periodFrom, setPeriodFrom]     = React.useState("")
  const [periodTo, setPeriodTo]         = React.useState("")
  const [months, setMonths]             = React.useState("6")

  const dashboardQuery = trpc.team.kpis.dashboard.useQuery(
    { months: parseInt(months) },
    { staleTime: 3 * 60 * 1000 }
  )

  const kpisQuery = trpc.team.kpis.list.useQuery(
    {
      page: 1,
      perPage: 50,
      teamMemberId: filterMemberId || undefined,
      periodFrom: periodFrom ? new Date(`${periodFrom}-01`) : undefined,
      periodTo: periodTo ? new Date(`${periodTo}-28`) : undefined,
    },
    { staleTime: 2 * 60 * 1000 }
  )

  const membersQuery = trpc.team.members.list.useQuery(
    { page: 1, perPage: 100 },
    { staleTime: 10 * 60 * 1000 }
  )

  const members  = (membersQuery.data?.items ?? []) as any[]
  const kpiItems = (kpisQuery.data?.items ?? []) as unknown as KPIEntry[]
  const dashboard = dashboardQuery.data as KPIDashboardData | undefined

  // Aggregate individual KPIs for the selected member (or latest for all)
  const selectedMemberLatest: KPIEntry | undefined = React.useMemo(() => {
    if (kpiItems.length === 0) return undefined
    // Pick the most recent entry for the selected member (or first entry overall)
    return kpiItems[0]
  }, [kpiItems])

  // Build trend chart data
  const trendData = React.useMemo(
    () =>
      (dashboard?.trends ?? []).map((t) => ({
        month: formatMonth(t.month),
        "Horas Faturáveis": parseFloat(t.avgBillableHours.toFixed(1)),
        "Utilização (%)": parseFloat(t.avgUtilizationRate.toFixed(1)),
        "Prazo (%)": parseFloat(t.avgDeadlineCompliance.toFixed(1)),
      })),
    [dashboard]
  )

  // Ranking data
  const rankingData = React.useMemo(
    () =>
      (dashboard?.rankings ?? []).map((m) => ({
        name: m.memberName.split(" ")[0],
        score: parseFloat(m.avgOverallScore.toFixed(1)),
        revenue: m.totalRevenueGenerated,
      })),
    [dashboard]
  )

  // Radar data for competency profile
  const radarData = React.useMemo(() => {
    if (!dashboard?.memberAverages || dashboard.memberAverages.length === 0) return []
    const teamAvg = dashboard.memberAverages
    const avgOf = (fn: (m: MemberAverage) => number) =>
      teamAvg.reduce((s, m) => s + fn(m), 0) / teamAvg.length

    return [
      { competency: "Horas Faturáveis", average: parseFloat((avgOf((m) => m.avgBillableHours / BILLABLE_HOURS_GOAL * 10).toFixed(1)) ) },
      { competency: "Utilização",       average: parseFloat((avgOf((m) => m.avgUtilizationRate / 10).toFixed(1))) },
      { competency: "Prazos",           average: parseFloat((avgOf((m) => m.avgDeadlineCompliance / 10).toFixed(1))) },
      { competency: "Score Geral",      average: parseFloat((avgOf((m) => m.avgOverallScore).toFixed(1))) },
    ]
  }, [dashboard])

  const isLoading = dashboardQuery.isLoading || kpisQuery.isLoading || membersQuery.isLoading

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">KPIs da Equipe</h2>
          <p className="text-sm text-gray-500">Indicadores de performance individuais e consolidados</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Lançar KPIs
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filterMemberId} onValueChange={setFilterMemberId}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="Todos os membros" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os membros</SelectItem>
            {members.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">De</span>
          <Input
            type="month"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            className="h-8 text-xs w-32"
          />
          <span className="text-xs text-gray-500">até</span>
          <Input
            type="month"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            className="h-8 text-xs w-32"
          />
        </div>

        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[3, 6, 12].map((m) => (
              <SelectItem key={m} value={String(m)}>Tendência {m}m</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterMemberId || periodFrom || periodTo) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-gray-500"
            onClick={() => { setFilterMemberId(""); setPeriodFrom(""); setPeriodTo("") }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {(dashboardQuery.isError || kpisQuery.isError) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6 text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Erro ao carregar KPIs</p>
              <p className="text-sm text-red-600 mt-0.5">
                {dashboardQuery.error?.message ?? kpisQuery.error?.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── KPI Category cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* PRODUTIVIDADE */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Clock className="h-4 w-4 text-blue-500" />
              Produtividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Horas Faturáveis (meta: {BILLABLE_HOURS_GOAL}h)</p>
                  <GaugeBar
                    value={selectedMemberLatest?.billableHours}
                    goal={BILLABLE_HOURS_GOAL}
                    colorBand
                  />
                </div>
                <MetricRow
                  label="Taxa de Utilização"
                  value={pct(selectedMemberLatest?.utilizationRate)}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <MetricRow
                  label="Cumprimento de Prazos"
                  value={selectedMemberLatest?.deadlinesMet != null && selectedMemberLatest.deadlinesTotal != null
                    ? `${selectedMemberLatest.deadlinesMet}/${selectedMemberLatest.deadlinesTotal} (${pct(selectedMemberLatest.deadlineComplianceRate)})`
                    : "—"}
                  icon={<Target className="h-4 w-4" />}
                />
                <MetricRow
                  label="Casos Ativos"
                  value={num(selectedMemberLatest?.casesActive)}
                  icon={<Users className="h-4 w-4" />}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* QUALIDADE */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Star className="h-4 w-4 text-amber-500" />
              Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Score de Qualidade de Peças (0–10)</p>
                  <GaugeBar
                    value={selectedMemberLatest?.piecesQualityScore}
                    goal={10}
                    unit="/10"
                    colorBand
                  />
                </div>
                <MetricRow
                  label="Taxa de Êxito"
                  value={pct(selectedMemberLatest?.caseSuccessRate)}
                  icon={<Target className="h-4 w-4" />}
                />
                <MetricRow
                  label="Peças Produzidas"
                  value={num(selectedMemberLatest?.piecesProduced)}
                  icon={<BookOpen className="h-4 w-4" />}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* FINANCEIRO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <DollarSign className="h-4 w-4 text-green-600" />
              Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ) : rankingData.length > 0 ? (
              <>
                <p className="text-xs font-medium text-gray-600">Receita por Advogado (período)</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={rankingData}
                    layout="vertical"
                    margin={{ left: 4, right: 40, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: unknown) => [currency(Number(v)), "Receita"]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {rankingData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#16a34a" : i === 1 ? "#ca8a04" : "#3b82f6"} />
                      ))}
                      <LabelList
                        dataKey="revenue"
                        position="right"
                        formatter={(v: unknown) => currency(Number(v))}
                        style={{ fontSize: 10, fill: "#6b7280" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <MetricRow
                  label="Clientes Captados"
                  value={num(selectedMemberLatest?.clientsAcquired)}
                  icon={<Users className="h-4 w-4" />}
                />
              </>
            ) : (
              <p className="text-sm text-gray-400 py-6 text-center">Sem dados financeiros</p>
            )}
          </CardContent>
        </Card>

        {/* DESENVOLVIMENTO */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <BookOpen className="h-4 w-4 text-purple-500" />
              Desenvolvimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-1">Horas de Treinamento (meta: 8h)</p>
                  <GaugeBar
                    value={selectedMemberLatest?.trainingHours}
                    goal={8}
                    colorBand
                  />
                </div>
                <MetricRow
                  label="Sessões de Mentoria"
                  value={num(selectedMemberLatest?.mentoringSessions)}
                  icon={<Users className="h-4 w-4" />}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts section ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Line chart — monthly trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Evolução Mensal (Equipe)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : trendData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                Sem dados de tendência
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="Horas Faturáveis"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Utilização (%)"
                    stroke="#ca8a04"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Prazo (%)"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            {!isLoading && trendData.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2 justify-center">
                {[
                  { color: "#3b82f6", label: "Horas Faturáveis" },
                  { color: "#ca8a04", label: "Utilização (%)" },
                  { color: "#16a34a", label: "Prazo (%)" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="text-xs text-gray-500">{l.label}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Radar chart — competency profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Perfil de Competências (Equipe)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : radarData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
                Sem dados de competências
              </div>
            ) : (
              <RadarCompetency data={radarData} showLegend />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Team ranking table ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Ranking Geral da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rankingData.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Sem dados para o período selecionado</p>
          ) : (
            <div className="space-y-2">
              {(dashboard?.rankings ?? []).map((member, i) => (
                <div
                  key={member.memberId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Rank badge */}
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? "bg-amber-100 text-amber-700" :
                      i === 1 ? "bg-gray-100 text-gray-600" :
                      i === 2 ? "bg-orange-100 text-orange-700" :
                      "bg-gray-50 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>

                  {/* Name */}
                  <span className="text-sm font-medium text-gray-800 flex-1 min-w-0 truncate">
                    {member.memberName}
                  </span>

                  {/* KPIs */}
                  <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                    <span title="Horas faturáveis">
                      <Clock className="h-3.5 w-3.5 inline mr-0.5" />
                      {num(member.avgBillableHours)}h
                    </span>
                    <span title="Utilização">
                      <TrendingUp className="h-3.5 w-3.5 inline mr-0.5" />
                      {pct(member.avgUtilizationRate)}
                    </span>
                    <span title="Prazos">
                      <Target className="h-3.5 w-3.5 inline mr-0.5" />
                      {pct(member.avgDeadlineCompliance)}
                    </span>
                  </div>

                  {/* Score */}
                  <Badge
                    className={`text-xs shrink-0 ${
                      member.avgOverallScore >= 7 ? "bg-green-100 text-green-800 border-green-200" :
                      member.avgOverallScore >= 5 ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                      "bg-red-100 text-red-800 border-red-200"
                    } border`}
                  >
                    {member.avgOverallScore.toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Input KPI dialog ──────────────────────────────────────────────── */}
      <InputKPIDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        onSuccess={() => {
          kpisQuery.refetch()
          dashboardQuery.refetch()
        }}
      />
    </div>
  )
}
