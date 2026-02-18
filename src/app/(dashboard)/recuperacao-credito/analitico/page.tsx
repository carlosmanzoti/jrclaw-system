"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Search,
  Gavel,
  Handshake,
  AlertTriangle,
  BarChart3,
  Target,
  Shield,
  Clock,
  Users,
  Briefcase,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts"

import { trpc } from "@/lib/trpc"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

// ===================== TYPES =====================

interface RecoveryCaseItem {
  id: string
  codigo?: string
  titulo?: string
  fase: string
  status: string
  tipo?: string
  prioridade?: string
  valor_original?: number
  valor_atualizado?: number
  valor_total_execucao?: number
  valor_recuperado?: number
  valor_bloqueado?: number
  valor_penhorado?: number
  percentual_recuperado?: number
  score_recuperacao?: number
  data_prescricao?: string | Date | null
  data_inicio?: string | Date | null
  created_at?: string | Date
  person?: {
    id: string
    nome: string
    cpf_cnpj?: string | null
  } | null
  responsavel?: {
    id: string
    name: string
    email?: string
  } | null
  _count?: {
    investigacoes?: number
    bens?: number
    acoes_cobranca?: number
    penhoras?: number
    acordos?: number
    incidentes_desconsidera?: number
    monitoramentos?: number
    eventos?: number
    devedores_solidarios?: number
  }
}

// ===================== HELPERS =====================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function daysBetween(date1: Date, date2: Date): number {
  const ms = date2.getTime() - date1.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Chart colors
const GOLD = "#C9A961"
const GOLD_LIGHT = "rgba(201, 169, 97, 0.6)"
const GOLD_LIGHTER = "rgba(201, 169, 97, 0.3)"
const BLUE = "#3B82F6"
const BLUE_LIGHT = "rgba(59, 130, 246, 0.6)"
const GRAY = "#6B7280"
const GRAY_LIGHT = "rgba(107, 114, 128, 0.3)"
const RED = "#EF4444"
const ORANGE = "#F97316"
const YELLOW = "#EAB308"
const GREEN = "#22C55E"
const PURPLE = "#8B5CF6"

const PIE_COLORS = [GOLD, BLUE, PURPLE, GREEN, ORANGE, RED, GRAY]
const FUNNEL_COLORS = [BLUE, "#6366F1", GOLD, ORANGE, GREEN]

const FASE_LABELS: Record<string, string> = {
  ANALISE_INICIAL: "Analise Inicial",
  INVESTIGACAO_PATRIMONIAL: "Investigacao",
  MEDIDAS_PREPARATORIAS: "Medidas Prep.",
  EXECUCAO: "Execucao",
  PENHORA_CONSTRICAO: "Penhora",
  EXPROPRIACAO: "Expropriacao",
  ACORDO: "Acordo",
  SATISFACAO_CREDITO: "Recuperado",
  ARQUIVADO: "Arquivado",
  CANCELADO: "Cancelado",
}

const FUNNEL_ORDER = [
  "INVESTIGACAO_PATRIMONIAL",
  "EXECUCAO",
  "PENHORA_CONSTRICAO",
  "EXPROPRIACAO",
  "SATISFACAO_CREDITO",
]

// ===================== KPI CARD =====================

function KpiCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  className,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subValue?: string
  trend?: "up" | "down" | "neutral"
  className?: string
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gold/10 text-gold shrink-0">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold leading-tight mt-0.5 truncate">{value}</p>
            {subValue && (
              <p
                className={cn(
                  "text-xs mt-0.5",
                  trend === "up"
                    ? "text-green-600"
                    : trend === "down"
                      ? "text-red-500"
                      : "text-muted-foreground"
                )}
              >
                {subValue}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ===================== CUSTOM TOOLTIP =====================

function ChartTooltipContent({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  valueFormatter?: (val: number) => string
}) {
  if (!active || !payload?.length) return null
  const formatter = valueFormatter || ((v: number) => v.toLocaleString("pt-BR"))

  return (
    <div className="rounded-md border bg-background px-3 py-2 shadow-md">
      {label && <p className="text-xs font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatter(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ===================== PAGE COMPONENT =====================

export default function RecuperacaoCreditoAnaliticoPage() {
  const router = useRouter()
  const [responsavelFilter, setResponsavelFilter] = useState<string>("")

  // Fetch data
  const { data: dashboardData, isLoading: dashLoading } =
    trpc.recovery.cases.dashboard.useQuery({
      responsavel_id: responsavelFilter || undefined,
    })

  const { data: listData, isLoading: listLoading } =
    trpc.recovery.cases.list.useQuery({
      page: 1,
      pageSize: 500,
    })

  const { data: users } = trpc.users.list.useQuery()

  const cases: RecoveryCaseItem[] = useMemo(() => {
    return (listData?.items as RecoveryCaseItem[]) || []
  }, [listData])

  const activeCases = useMemo(() => {
    return cases.filter((c) => c.status !== "ENCERRADO" && c.status !== "CANCELADO")
  }, [cases])

  const isLoading = dashLoading || listLoading

  // ===================== COMPUTED ANALYTICS =====================

  // KPIs
  const kpis = useMemo(() => {
    if (!dashboardData) {
      return {
        totalActive: 0,
        totalExecucao: 0,
        totalRecuperado: 0,
        percentRecuperado: 0,
        totalBens: 0,
        totalPenhoras: 0,
        totalAcordos: 0,
        taxaCumprimento: 0,
        totalAlertas: 0,
      }
    }

    const totalBens = cases.reduce((sum, c) => sum + (c._count?.bens || 0), 0)
    const totalPenhoras = cases.reduce((sum, c) => sum + (c._count?.penhoras || 0), 0)
    const totalAcordos = cases.reduce((sum, c) => sum + (c._count?.acordos || 0), 0)

    // Rough calculation for compliance
    const casesWithAcordos = cases.filter((c) => (c._count?.acordos || 0) > 0)
    const casesComRecuperacao = casesWithAcordos.filter(
      (c) => (c.percentual_recuperado || 0) > 50
    )
    const taxaCumprimento =
      casesWithAcordos.length > 0
        ? (casesComRecuperacao.length / casesWithAcordos.length) * 100
        : 0

    const alertas = cases.reduce((sum, c) => sum + (c._count?.monitoramentos || 0), 0)

    return {
      totalActive: dashboardData.total_active,
      totalExecucao: dashboardData.total_valor_execucao,
      totalRecuperado: dashboardData.total_valor_recuperado,
      percentRecuperado: dashboardData.avg_percentual_recuperado,
      totalBens,
      totalPenhoras,
      totalAcordos,
      taxaCumprimento,
      totalAlertas: alertas,
    }
  }, [dashboardData, cases])

  // 1. Funnel data
  const funnelData = useMemo(() => {
    if (!dashboardData?.by_fase) return []
    const faseCounts = dashboardData.by_fase as Record<string, number>

    // Cumulative: count cases that are at or past each stage
    const funnelStages = FUNNEL_ORDER.map((fase) => {
      const idx = FUNNEL_ORDER.indexOf(fase)
      // Count cases at this stage or later
      let count = 0
      for (let i = idx; i < FUNNEL_ORDER.length; i++) {
        count += faseCounts[FUNNEL_ORDER[i]] || 0
      }
      return {
        name: FASE_LABELS[fase] || fase,
        value: count,
        fase,
      }
    })

    return funnelStages
  }, [dashboardData])

  const funnelConversionRates = useMemo(() => {
    if (funnelData.length < 2) return []
    const rates = []
    for (let i = 1; i < funnelData.length; i++) {
      const prev = funnelData[i - 1].value
      const curr = funnelData[i].value
      const rate = prev > 0 ? (curr / prev) * 100 : 0
      rates.push({
        from: funnelData[i - 1].name,
        to: funnelData[i].name,
        rate,
      })
    }
    return rates
  }, [funnelData])

  // 2. Monthly evolution (last 12 months - simulated from data_inicio)
  const monthlyEvolution = useMemo(() => {
    const now = new Date()
    const months: { month: string; recuperado: number; execucao: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })

      // Sum recovered for cases that started before this month
      const casesUpToMonth = cases.filter((c) => {
        const startDate = c.data_inicio ? new Date(c.data_inicio) : c.created_at ? new Date(c.created_at) : null
        return startDate && startDate <= new Date(d.getFullYear(), d.getMonth() + 1, 0)
      })

      const recuperado = casesUpToMonth.reduce(
        (sum, c) => sum + (c.valor_recuperado || 0),
        0
      )
      const execucao = casesUpToMonth.reduce(
        (sum, c) => sum + (c.valor_total_execucao || 0),
        0
      )

      months.push({ month: label, recuperado, execucao })
    }

    return months
  }, [cases])

  // 3. Distribution by tipo devedor (PF vs PJ based on cpf_cnpj)
  const devedorDistribution = useMemo(() => {
    const pfCount = cases.filter((c) => {
      const doc = c.person?.cpf_cnpj || ""
      return doc.replace(/\D/g, "").length <= 11
    }).length
    const pjCount = cases.length - pfCount

    return [
      { name: "Pessoa Fisica", value: pfCount },
      { name: "Pessoa Juridica", value: pjCount },
    ].filter((d) => d.value > 0)
  }, [cases])

  const tipoDistribution = useMemo(() => {
    const byTipo: Record<string, number> = {}
    for (const c of cases) {
      const tipo = c.tipo || "OUTRO"
      byTipo[tipo] = (byTipo[tipo] || 0) + 1
    }
    return Object.entries(byTipo)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [cases])

  // 4. Top 10 devedores
  const top10Devedores = useMemo(() => {
    const devedorMap: Record<string, { nome: string; valor: number }> = {}
    for (const c of cases) {
      const nome = c.person?.nome || "Desconhecido"
      const id = c.person?.id || nome
      if (!devedorMap[id]) {
        devedorMap[id] = { nome, valor: 0 }
      }
      devedorMap[id].valor += c.valor_total_execucao || 0
    }

    return Object.values(devedorMap)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
      .map((d) => ({
        nome: d.nome.length > 25 ? d.nome.slice(0, 25) + "..." : d.nome,
        valor: d.valor,
      }))
  }, [cases])

  // 5. Success rate by action type
  const successByAction = useMemo(() => {
    // Simulate action types from phase transitions
    const actions = [
      {
        name: "Protesto",
        total: cases.filter((c) => (c._count?.acoes_cobranca || 0) > 0).length,
        success: cases.filter(
          (c) => (c._count?.acoes_cobranca || 0) > 0 && (c.percentual_recuperado || 0) > 0
        ).length,
      },
      {
        name: "Execucao",
        total: cases.filter(
          (c) =>
            c.fase === "EXECUCAO" ||
            c.fase === "PENHORA_CONSTRICAO" ||
            c.fase === "EXPROPRIACAO" ||
            c.fase === "SATISFACAO_CREDITO"
        ).length,
        success: cases.filter(
          (c) =>
            (c.fase === "PENHORA_CONSTRICAO" ||
              c.fase === "EXPROPRIACAO" ||
              c.fase === "SATISFACAO_CREDITO") &&
            (c.valor_penhorado || 0) > 0
        ).length,
      },
      {
        name: "IDPJ",
        total: cases.filter((c) => (c._count?.incidentes_desconsidera || 0) > 0).length,
        success: cases.filter(
          (c) =>
            (c._count?.incidentes_desconsidera || 0) > 0 &&
            (c._count?.bens || 0) > 0
        ).length,
      },
      {
        name: "Acordo",
        total: cases.filter((c) => (c._count?.acordos || 0) > 0).length,
        success: cases.filter(
          (c) =>
            (c._count?.acordos || 0) > 0 && (c.percentual_recuperado || 0) > 30
        ).length,
      },
    ]

    return actions
      .filter((a) => a.total > 0)
      .map((a) => ({
        name: a.name,
        total: a.total,
        sucesso: a.success,
        taxa: a.total > 0 ? Math.round((a.success / a.total) * 100) : 0,
      }))
  }, [cases])

  // 6. Performance table by responsavel
  const performanceTable = useMemo(() => {
    const byResp: Record<
      string,
      {
        nome: string
        casosAtivos: number
        volume: number
        recuperado: number
        acoes: number
        scores: number[]
      }
    > = {}

    for (const c of activeCases) {
      const respId = c.responsavel?.id || "unassigned"
      const respName = c.responsavel?.name || "Nao atribuido"

      if (!byResp[respId]) {
        byResp[respId] = {
          nome: respName,
          casosAtivos: 0,
          volume: 0,
          recuperado: 0,
          acoes: 0,
          scores: [],
        }
      }

      byResp[respId].casosAtivos += 1
      byResp[respId].volume += c.valor_total_execucao || 0
      byResp[respId].recuperado += c.valor_recuperado || 0
      byResp[respId].acoes += (c._count?.acoes_cobranca || 0)
      if (c.score_recuperacao) {
        byResp[respId].scores.push(c.score_recuperacao)
      }
    }

    return Object.entries(byResp)
      .map(([id, data]) => ({
        id,
        nome: data.nome,
        casosAtivos: data.casosAtivos,
        volume: data.volume,
        recuperado: data.recuperado,
        percentual: data.volume > 0 ? (data.recuperado / data.volume) * 100 : 0,
        acoesMedia: data.casosAtivos > 0 ? data.acoes / data.casosAtivos : 0,
        scoreMedia:
          data.scores.length > 0
            ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
            : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
  }, [activeCases])

  // 7. Prescription analysis
  const prescriptionAnalysis = useMemo(() => {
    const today = new Date()
    return activeCases
      .filter((c) => c.data_prescricao)
      .map((c) => {
        const prescDate = new Date(c.data_prescricao as string)
        const daysLeft = daysBetween(today, prescDate)
        return {
          id: c.id,
          codigo: c.codigo || "---",
          devedor: c.person?.nome || "Desconhecido",
          dataPrescricao: prescDate,
          daysLeft,
          valor: c.valor_total_execucao || 0,
          fase: c.fase,
        }
      })
      .filter((c) => c.daysLeft <= 180)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [activeCases])

  // 8. Portfolio matrix (value x score)
  const portfolioMatrix = useMemo(() => {
    // Determine medians
    const values = activeCases.map((c) => c.valor_total_execucao || 0).filter((v) => v > 0)
    const scores = activeCases.map((c) => c.score_recuperacao || 0).filter((s) => s > 0)

    const medianValue = values.length > 0 ? values.sort((a, b) => a - b)[Math.floor(values.length / 2)] : 100000
    const medianScore = scores.length > 0 ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)] : 50

    const quadrants = {
      prioridadeMaxima: {
        label: "Prioridade maxima",
        description: "Alto valor + alta probabilidade",
        cases: 0,
        valor: 0,
        color: GREEN,
      },
      altoValorDificil: {
        label: "Alto valor dificil",
        description: "Alto valor + baixa probabilidade",
        cases: 0,
        valor: 0,
        color: ORANGE,
      },
      baixoValorFacil: {
        label: "Baixo valor facil",
        description: "Baixo valor + alta probabilidade",
        cases: 0,
        valor: 0,
        color: BLUE,
      },
      considerarCessao: {
        label: "Considerar cessao",
        description: "Baixo valor + baixa probabilidade",
        cases: 0,
        valor: 0,
        color: GRAY,
      },
    }

    for (const c of activeCases) {
      const val = c.valor_total_execucao || 0
      const score = c.score_recuperacao || 0
      const highValue = val >= medianValue
      const highScore = score >= medianScore

      if (highValue && highScore) {
        quadrants.prioridadeMaxima.cases += 1
        quadrants.prioridadeMaxima.valor += val
      } else if (highValue && !highScore) {
        quadrants.altoValorDificil.cases += 1
        quadrants.altoValorDificil.valor += val
      } else if (!highValue && highScore) {
        quadrants.baixoValorFacil.cases += 1
        quadrants.baixoValorFacil.valor += val
      } else {
        quadrants.considerarCessao.cases += 1
        quadrants.considerarCessao.valor += val
      }
    }

    return Object.values(quadrants)
  }, [activeCases])

  // ===================== RENDER =====================

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/recuperacao-credito")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Dashboard Analitico</h1>
              <p className="text-sm text-muted-foreground">Recuperacao de Credito</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="h-16 animate-pulse bg-muted rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="h-60 animate-pulse bg-muted rounded-md" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/recuperacao-credito")}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                Dashboard Analitico — Recuperacao de Credito
              </h1>
              <p className="text-sm text-muted-foreground">
                Visao consolidada do portfolio de recuperacao
              </p>
            </div>
          </div>

          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os responsaveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os responsaveis</SelectItem>
              {users?.map((u: { id: string; name: string }) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ===== KPIs ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <KpiCard
            icon={Briefcase}
            label="Casos ativos"
            value={kpis.totalActive}
          />
          <KpiCard
            icon={DollarSign}
            label="Vol. em execucao"
            value={formatCurrencyCompact(kpis.totalExecucao)}
          />
          <KpiCard
            icon={TrendingUp}
            label="Total recuperado"
            value={formatCurrencyCompact(kpis.totalRecuperado)}
            subValue={formatPercent(kpis.percentRecuperado)}
            trend={kpis.percentRecuperado > 20 ? "up" : "neutral"}
          />
          <KpiCard
            icon={Search}
            label="Bens encontrados"
            value={kpis.totalBens}
          />
          <KpiCard
            icon={Gavel}
            label="Bens penhorados"
            value={kpis.totalPenhoras}
          />
          <KpiCard
            icon={Handshake}
            label="Acordos ativos"
            value={kpis.totalAcordos}
          />
          <KpiCard
            icon={Target}
            label="Taxa cumprimento"
            value={formatPercent(kpis.taxaCumprimento)}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Alertas pend."
            value={kpis.totalAlertas}
            trend={kpis.totalAlertas > 5 ? "down" : "neutral"}
          />
        </div>

        {/* ===== ROW 1: Funnel + Monthly Evolution ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funnel de Recuperacao */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-gold" />
                Funil de Recuperacao
              </CardTitle>
              <CardDescription className="text-xs">
                Casos por estagio com taxas de conversao
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <RechartsTooltip
                        content={({ active, payload, label }) => (
                          <ChartTooltipContent
                            active={active}
                            payload={payload as never}
                            label={label as string}
                          />
                        )}
                      />
                      <Bar dataKey="value" name="Casos" radius={[0, 4, 4, 0]}>
                        {funnelData.map((_, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={FUNNEL_COLORS[idx % FUNNEL_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Conversion rates */}
                  {funnelConversionRates.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {funnelConversionRates.map((r, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] gap-1"
                        >
                          {r.from} → {r.to}:{" "}
                          <span className="font-bold">{formatPercent(r.rate)}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Sem dados suficientes para o funil
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evolucao Mensal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-gold" />
                Evolucao Mensal
              </CardTitle>
              <CardDescription className="text-xs">
                Volume em execucao vs. recuperado (ultimos 12 meses)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatCurrencyCompact(v)}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active}
                        payload={payload as never}
                        label={label as string}
                        valueFormatter={formatCurrency}
                      />
                    )}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px" }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Line
                    type="monotone"
                    dataKey="execucao"
                    stroke={BLUE}
                    strokeWidth={2}
                    name="Em execucao"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="recuperado"
                    stroke={GOLD}
                    strokeWidth={2}
                    name="Recuperado"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* ===== ROW 2: PieCharts + Top 10 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Distribuicao PF vs PJ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-gold" />
                Tipo de Devedor
              </CardTitle>
              <CardDescription className="text-xs">PF vs PJ</CardDescription>
            </CardHeader>
            <CardContent>
              {devedorDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={devedorDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                      label={((props: never) => {
                        const p = props as { name?: string; percent?: number }
                        return `${p.name ?? ""} (${((p.percent ?? 0) * 100).toFixed(0)}%)`
                      }) as never}
                      labelLine={false}
                    >
                      {devedorDistribution.map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => (
                        <ChartTooltipContent
                          active={active}
                          payload={payload as never}
                        />
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Sem dados
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Devedores */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="size-4 text-gold" />
                Top 10 Devedores
              </CardTitle>
              <CardDescription className="text-xs">
                Por valor total em execucao
              </CardDescription>
            </CardHeader>
            <CardContent>
              {top10Devedores.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={top10Devedores} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => formatCurrencyCompact(v)}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={150}
                      tick={{ fontSize: 10 }}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltipContent
                          active={active}
                          payload={payload as never}
                          label={label as string}
                          valueFormatter={formatCurrency}
                        />
                      )}
                    />
                    <Bar
                      dataKey="valor"
                      name="Valor execucao"
                      fill={GOLD}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Sem dados de devedores
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== ROW 3: Success Rate + Performance Table ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Taxa de Sucesso por Acao */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="size-4 text-gold" />
                Taxa de Sucesso por Acao
              </CardTitle>
              <CardDescription className="text-xs">
                Efetividade de cada tipo de medida
              </CardDescription>
            </CardHeader>
            <CardContent>
              {successByAction.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={successByAction}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => (
                        <ChartTooltipContent
                          active={active}
                          payload={payload as never}
                          label={label as string}
                        />
                      )}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px" }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fill={GRAY_LIGHT}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="sucesso"
                      name="Sucesso"
                      fill={GOLD}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  Sem dados de acoes
                </div>
              )}

              {/* Rates below chart */}
              {successByAction.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {successByAction.map((a) => (
                    <Badge
                      key={a.name}
                      variant="outline"
                      className="text-[10px] gap-1"
                    >
                      {a.name}:{" "}
                      <span className="font-bold">{a.taxa}%</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-gold" />
                Performance por Responsavel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceTable.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Responsavel</TableHead>
                      <TableHead className="text-xs text-right">Ativos</TableHead>
                      <TableHead className="text-xs text-right">Volume</TableHead>
                      <TableHead className="text-xs text-right">Recuperado</TableHead>
                      <TableHead className="text-xs text-right">%</TableHead>
                      <TableHead className="text-xs text-right">Acoes/Caso</TableHead>
                      <TableHead className="text-xs text-right">Score Medio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceTable.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-medium">
                          {row.nome}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.casosAtivos}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrencyCompact(row.volume)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatCurrencyCompact(row.recuperado)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <span
                            className={cn(
                              "font-medium",
                              row.percentual > 30
                                ? "text-green-600"
                                : row.percentual > 10
                                  ? "text-yellow-600"
                                  : "text-muted-foreground"
                            )}
                          >
                            {formatPercent(row.percentual)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {row.acoesMedia.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{row.scoreMedia.toFixed(0)}</span>
                            <Progress
                              value={row.scoreMedia}
                              className="w-12 h-1.5"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Nenhum caso atribuido
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===== ROW 4: Prescription Analysis + Portfolio Matrix ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Analise de Prescricao */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="size-4 text-gold" />
                Analise de Prescricao
              </CardTitle>
              <CardDescription className="text-xs">
                Casos com prescricao em ate 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prescriptionAnalysis.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Codigo</TableHead>
                      <TableHead className="text-xs">Devedor</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                      <TableHead className="text-xs text-right">Dias restantes</TableHead>
                      <TableHead className="text-xs">Fase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescriptionAnalysis.slice(0, 15).map((row) => {
                      let colorClass = "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                      if (row.daysLeft <= 30) {
                        colorClass = "text-red-600 bg-red-50 dark:bg-red-900/20"
                      } else if (row.daysLeft <= 90) {
                        colorClass = "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                      }

                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-mono">
                            {row.codigo}
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">
                            {row.devedor}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {formatCurrencyCompact(row.valor)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] font-bold", colorClass)}
                            >
                              {row.daysLeft <= 0
                                ? "PRESCRITO"
                                : `${row.daysLeft}d`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="text-[10px]">
                              {FASE_LABELS[row.fase] || row.fase}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Shield className="size-8 text-green-500/40 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum caso com prescricao proxima
                  </p>
                </div>
              )}

              {prescriptionAnalysis.length > 15 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Mostrando 15 de {prescriptionAnalysis.length} casos
                </p>
              )}
            </CardContent>
          </Card>

          {/* Analise de Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="size-4 text-gold" />
                Analise de Portfolio
              </CardTitle>
              <CardDescription className="text-xs">
                Segmentacao: Valor x Score de Recuperacao
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {portfolioMatrix.map((quadrant) => (
                  <Card
                    key={quadrant.label}
                    className="border-l-4"
                    style={{ borderLeftColor: quadrant.color }}
                  >
                    <CardContent className="pt-3 pb-3 px-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium leading-tight">
                            {quadrant.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {quadrant.description}
                          </p>
                        </div>
                        <span
                          className="text-lg font-bold"
                          style={{ color: quadrant.color }}
                        >
                          {quadrant.cases}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <p className="text-xs text-muted-foreground">
                        Volume: {formatCurrencyCompact(quadrant.valor)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Matrix legend */}
              <div className="mt-4 rounded-lg border p-3 bg-muted/30">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-3 rounded-sm shrink-0"
                      style={{ backgroundColor: GREEN }}
                    />
                    <span className="font-medium">Prioridade maxima</span>
                    <span className="text-muted-foreground">— foco total</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-3 rounded-sm shrink-0"
                      style={{ backgroundColor: ORANGE }}
                    />
                    <span className="font-medium">Alto valor dificil</span>
                    <span className="text-muted-foreground">— investigar mais</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-3 rounded-sm shrink-0"
                      style={{ backgroundColor: BLUE }}
                    />
                    <span className="font-medium">Baixo valor facil</span>
                    <span className="text-muted-foreground">— acordos rapidos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-3 rounded-sm shrink-0"
                      style={{ backgroundColor: GRAY }}
                    />
                    <span className="font-medium">Considerar cessao</span>
                    <span className="text-muted-foreground">— vender carteira</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== ROW 5: Tipo distribution (full width) ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="size-4 text-gold" />
              Distribuicao por Tipo de Titulo
            </CardTitle>
            <CardDescription className="text-xs">
              Quantidade de casos por tipo de divida/titulo executivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tipoDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tipoDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => (
                      <ChartTooltipContent
                        active={active}
                        payload={payload as never}
                        label={label as string}
                      />
                    )}
                  />
                  <Bar
                    dataKey="value"
                    name="Casos"
                    fill={GOLD}
                    radius={[4, 4, 0, 0]}
                  >
                    {tipoDistribution.map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                Sem dados de tipos
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
