"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { MoodSelector } from "@/components/equipe/MoodSelector"
import { BURNOUT_RISK_CONFIG } from "@/lib/constants/competencies"
import {
  AlertTriangle,
  Battery,
  BookOpen,
  Brain,
  CheckCircle2,
  ExternalLink,
  Flame,
  HeartHandshake,
  Loader2,
  Moon,
  Phone,
  Smile,
  TrendingUp,
  Zap,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

type BurnoutRisk = "LOW" | "MODERATE" | "HIGH" | "CRITICAL"

interface WellbeingAlert {
  id: string
  memberId?: string
  memberName?: string
  severity: BurnoutRisk
  message: string
  aiSuggestion?: string
  createdAt: string
}

interface MemberSummary {
  memberId: string
  memberName: string
  avgMood: number
  avgEnergy: number
  avgWorkload: number
  avgSatisfaction: number
  checkinCount: number
  burnoutRisk: BurnoutRisk
}

interface DailyTrendPoint {
  day: string
  date?: string
  avgMood: number
  avgEnergy: number
  avgWorkload: number
  avgSatisfaction?: number
  count?: number
}

interface DashboardData {
  memberSummaries: MemberSummary[]
  burnoutIndex: number
  dailyTrend: DailyTrendPoint[]
  totalCheckins: number
  membersNeedingSupport: string[]
}

interface HistoryPoint {
  date: string
  mood: number
  energy: number
  workload: number
  satisfaction: number
}

// ─── Alert severity config ────────────────────────────────────────────────────

const ALERT_SEVERITY_CONFIG: Record<
  BurnoutRisk,
  { className: string; dotColor: string; label: string }
> = {
  LOW: {
    className: "bg-green-50 border-green-200 text-green-800",
    dotColor: "#10B981",
    label: "Baixo",
  },
  MODERATE: {
    className: "bg-yellow-50 border-yellow-200 text-yellow-800",
    dotColor: "#F59E0B",
    label: "Moderado",
  },
  HIGH: {
    className: "bg-orange-50 border-orange-200 text-orange-800",
    dotColor: "#F97316",
    label: "Alto",
  },
  CRITICAL: {
    className: "bg-red-50 border-red-200 text-red-800",
    dotColor: "#EF4444",
    label: "Crítico",
  },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SliderField({
  label,
  icon: Icon,
  value,
  onChange,
  min = 1,
  max = 5,
  lowLabel,
  highLabel,
  accentColor = "#C9A84C",
}: {
  label: string
  icon: React.ElementType
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  lowLabel?: string
  highLabel?: string
  accentColor?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color: accentColor }} />
          {label}
        </label>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: accentColor }}
        >
          {value}/{max}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accentColor} ${
            ((value - min) / (max - min)) * 100
          }%, #e5e7eb ${((value - min) / (max - min)) * 100}%)`,
          accentColor,
        }}
      />
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  )
}

function ToggleField({
  label,
  description,
  icon: Icon,
  value,
  onChange,
  color = "#EF4444",
}: {
  label: string
  description?: string
  icon: React.ElementType
  value: boolean
  onChange: (v: boolean) => void
  color?: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className="relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none ml-3 shrink-0"
        style={{ backgroundColor: value ? color : "#d1d5db" }}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  )
}

// ─── Daily Check-in Form ──────────────────────────────────────────────────────

function DailyCheckinForm() {
  const utils = trpc.useUtils()

  const [mood, setMood] = React.useState<number | null>(null)
  const [energy, setEnergy] = React.useState(3)
  const [workload, setWorkload] = React.useState(3)
  const [satisfaction, setSatisfaction] = React.useState(3)
  const [notes, setNotes] = React.useState("")
  const [feelingBurnout, setFeelingBurnout] = React.useState(false)
  const [needSupport, setNeedSupport] = React.useState(false)

  const checkinMutation = trpc.team.wellbeing.checkin.useMutation({
    onSuccess: () => {
      utils.team.wellbeing.myHistory.invalidate()
      utils.team.wellbeing.dashboard.invalidate()
      utils.team.wellbeing.alerts.invalidate()
      setMood(null)
      setEnergy(3)
      setWorkload(3)
      setSatisfaction(3)
      setNotes("")
      setFeelingBurnout(false)
      setNeedSupport(false)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mood === null) return
    checkinMutation.mutate({
      mood,
      energy,
      workload,
      satisfaction,
      notes: notes.trim() || undefined,
      feelingBurnout,
      needsSupport: needSupport,
    })
  }

  return (
    <Card className="border-[#C9A84C]/20 bg-gradient-to-br from-amber-50/30 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Smile className="h-4 w-4 text-[#C9A84C]" />
          Check-in Diário de Bem-estar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mood */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">
              Como você está hoje?{" "}
              {mood === null && (
                <span className="text-red-400 font-normal">(obrigatório)</span>
              )}
            </p>
            <MoodSelector value={mood} onChange={setMood} size="lg" />
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            <SliderField
              label="Energia"
              icon={Zap}
              value={energy}
              onChange={setEnergy}
              lowLabel="Sem energia"
              highLabel="Cheio de energia"
              accentColor="#F59E0B"
            />
            <SliderField
              label="Carga de trabalho"
              icon={Battery}
              value={workload}
              onChange={setWorkload}
              lowLabel="Muito leve"
              highLabel="Sobrecarregado"
              accentColor="#6366F1"
            />
            <SliderField
              label="Satisfação"
              icon={TrendingUp}
              value={satisfaction}
              onChange={setSatisfaction}
              lowLabel="Muito insatisfeito"
              highLabel="Muito satisfeito"
              accentColor="#10B981"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Observações (opcional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algo que queira compartilhar sobre como está se sentindo..."
              className="text-sm min-h-[60px]"
            />
          </div>

          {/* Burnout / Support toggles */}
          <div className="space-y-2">
            <ToggleField
              label="Estou me sentindo burnout"
              description="Esgotamento emocional e físico"
              icon={Flame}
              value={feelingBurnout}
              onChange={setFeelingBurnout}
              color="#EF4444"
            />
            <ToggleField
              label="Preciso de apoio"
              description="Gostaria de conversar com alguém"
              icon={HeartHandshake}
              value={needSupport}
              onChange={setNeedSupport}
              color="#8B5CF6"
            />
          </div>

          {/* Alerts */}
          {checkinMutation.isError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {checkinMutation.error?.message ??
                "Erro ao registrar check-in. Tente novamente."}
            </p>
          )}

          {checkinMutation.isSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Check-in registrado! Obrigado por compartilhar como está.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={mood === null || checkinMutation.isPending}
          >
            {checkinMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Registrar Check-in
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Team Dashboard ───────────────────────────────────────────────────────────

function TeamWellbeingDashboard() {
  const { data, isLoading, isError } =
    trpc.team.wellbeing.dashboard.useQuery({}, {
      staleTime: 5 * 60 * 1000,
    })

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 p-4 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Erro ao carregar dashboard da equipe.
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const dashboard = data as unknown as DashboardData

  // Derive burnout risk level from burnoutIndex
  const teamBurnoutRisk: BurnoutRisk =
    dashboard.burnoutIndex >= 75
      ? "CRITICAL"
      : dashboard.burnoutIndex >= 50
        ? "HIGH"
        : dashboard.burnoutIndex >= 25
          ? "MODERATE"
          : "LOW"

  const riskCfg = BURNOUT_RISK_CONFIG[teamBurnoutRisk] ?? {
    label: teamBurnoutRisk,
    color: "#6b7280",
  }

  // Compute team averages from member summaries
  const membersWithCheckins = dashboard.memberSummaries.filter(
    (m) => m.checkinCount > 0
  )
  const teamMoodAvg =
    membersWithCheckins.length > 0
      ? membersWithCheckins.reduce((sum, m) => sum + m.avgMood, 0) /
        membersWithCheckins.length
      : undefined
  const teamEnergyAvg =
    membersWithCheckins.length > 0
      ? membersWithCheckins.reduce((sum, m) => sum + m.avgEnergy, 0) /
        membersWithCheckins.length
      : undefined

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p
              className="text-2xl font-bold"
              style={{ color: riskCfg.color }}
            >
              {dashboard.burnoutIndex}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Índice de Burnout</p>
            <Badge
              className="mt-1 text-[10px] px-2 py-0.5 border"
              style={{
                backgroundColor: `${riskCfg.color}15`,
                color: riskCfg.color,
                borderColor: `${riskCfg.color}40`,
              }}
            >
              {riskCfg.label}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {teamMoodAvg?.toFixed(1) ?? "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Humor médio (1–5)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {teamEnergyAvg?.toFixed(1) ?? "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Energia média (1–5)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">
              {dashboard.memberSummaries.length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Membros monitorados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend Chart */}
      {dashboard.dailyTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Tendência de Bem-estar da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={dashboard.dailyTrend.map((d) => ({
                  date: new Date(d.day || d.date || "").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  }),
                  Humor: d.avgMood,
                  Energia: d.avgEnergy,
                  "Carga de trabalho": d.avgWorkload,
                  Satisfação: d.avgSatisfaction ?? 0,
                }))}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Line type="monotone" dataKey="Humor" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Energia" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Satisfação" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Carga de trabalho" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertsPanel() {
  const { data, isLoading } = trpc.team.wellbeing.alerts.useQuery(undefined, {
    staleTime: 3 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const alerts = [
    ...(data?.lowMoodAlerts ?? []),
    ...(data?.highWorkloadAlerts ?? []),
    ...(data?.supportAlerts ?? []),
  ] as unknown as WellbeingAlert[]

  if (alerts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
          <CheckCircle2 className="h-7 w-7 opacity-40" />
          <p className="text-sm">Nenhum alerta ativo no momento.</p>
          <p className="text-xs">A equipe está bem!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const cfg = ALERT_SEVERITY_CONFIG[alert.severity]
        return (
          <div
            key={alert.id}
            className={`rounded-lg border p-3 ${cfg.className}`}
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-1 h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: cfg.dotColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {alert.memberName && (
                    <span className="text-xs font-semibold">
                      {alert.memberName}
                    </span>
                  )}
                  <Badge
                    className="text-[10px] px-1.5 py-0 border"
                    style={{
                      backgroundColor: `${cfg.dotColor}20`,
                      color: cfg.dotColor,
                      borderColor: `${cfg.dotColor}50`,
                    }}
                  >
                    {cfg.label}
                  </Badge>
                  <span className="text-[10px] opacity-60 ml-auto">
                    {new Date(alert.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed">{alert.message}</p>
                {alert.aiSuggestion && (
                  <div className="mt-2 flex items-start gap-1.5 border-t border-current border-opacity-20 pt-2">
                    <Brain className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                    <p className="text-[11px] opacity-80 italic leading-relaxed">
                      <span className="font-semibold not-italic opacity-100">
                        IA sugere:{" "}
                      </span>
                      {alert.aiSuggestion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Personal History Chart ───────────────────────────────────────────────────

function PersonalHistoryChart() {
  const { data, isLoading } = trpc.team.wellbeing.myHistory.useQuery(
    {},
    { staleTime: 5 * 60 * 1000 }
  )

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  const history = (data?.items ?? []) as unknown as HistoryPoint[]

  if (history.length < 2) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
          <TrendingUp className="h-7 w-7 opacity-40" />
          <p className="text-sm">
            Faça check-ins por pelo menos 2 dias para ver as tendências.
          </p>
        </CardContent>
      </Card>
    )
  }

  const chartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    }),
    Humor: h.mood,
    Energia: h.energy,
    "Carga de trabalho": h.workload,
    Satisfação: h.satisfaction,
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          Meu Histórico de Bem-estar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            <Line
              type="monotone"
              dataKey="Humor"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Energia"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Satisfação"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Carga de trabalho"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ─── Resources Section ────────────────────────────────────────────────────────

const RESOURCES = [
  {
    icon: Phone,
    label: "CVV — Centro de Valorização da Vida",
    description: "Apoio emocional gratuito 24h. Ligue 188.",
    href: "https://www.cvv.org.br",
    color: "#EF4444",
  },
  {
    icon: Brain,
    label: "Zenklub — Terapia Online",
    description: "Psicólogos e coaches disponíveis online.",
    href: "https://zenklub.com.br",
    color: "#8B5CF6",
  },
  {
    icon: HeartHandshake,
    label: "OAB — Saúde Mental do Advogado",
    description: "Programa de atenção à saúde mental da OAB.",
    href: "https://www.oab.org.br",
    color: "#3B82F6",
  },
  {
    icon: BookOpen,
    label: "Política de Saúde Mental do Escritório",
    description: "Limites de jornada, descanso e suporte interno.",
    href: "#",
    color: "#10B981",
  },
  {
    icon: Moon,
    label: "Dia de Recuperação",
    description: "Solicite um dia de descanso via RH quando necessário.",
    href: "#",
    color: "#6366F1",
  },
]

function ResourcesSection() {
  return (
    <section>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Recursos e Suporte
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RESOURCES.map((resource) => {
          const Icon = resource.icon
          const isExternal =
            resource.href.startsWith("http")
          return (
            <a
              key={resource.label}
              href={resource.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3 hover:shadow-sm hover:border-gray-200 transition-all group"
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${resource.color}15` }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: resource.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1 group-hover:text-gray-900">
                  {resource.label}
                  {isExternal && (
                    <ExternalLink className="h-3 w-3 text-gray-400 shrink-0" />
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {resource.description}
                </p>
              </div>
            </a>
          )
        })}
      </div>
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EquipeWellbeingTab() {
  return (
    <div className="space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <HeartHandshake className="h-4 w-4" />
          Bem-estar e Prevenção de Burnout
        </h2>
      </div>

      {/* ── Daily Check-in ──────────────────────────────────────────────────── */}
      <section>
        <DailyCheckinForm />
      </section>

      {/* ── Team Dashboard (managers view) ──────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Dashboard da Equipe
        </h3>
        <TeamWellbeingDashboard />
      </section>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          Alertas Ativos
        </h3>
        <AlertsPanel />
      </section>

      {/* ── Personal History ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Meu Histórico Pessoal
        </h3>
        <PersonalHistoryChart />
      </section>

      {/* ── Resources ───────────────────────────────────────────────────────── */}
      <ResourcesSection />

      {/* ── Office policy reminder ──────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs text-purple-700">
        <Brain className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          A saúde mental é prioridade. A jornada máxima é de{" "}
          <strong>44h semanais</strong>. Utilize o banco de horas e os dias de
          descanso quando necessário. Conversas com o RH são confidenciais. Você
          não está sozinho.
        </span>
      </div>
    </div>
  )
}
