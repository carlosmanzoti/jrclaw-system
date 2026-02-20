"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ENPSGauge } from "@/components/equipe/ENPSGauge"
import { NPSGauge } from "@/components/equipe/NPSGauge"
import { OKRProgressBar } from "@/components/equipe/OKRProgressBar"
import { RecognitionCard } from "@/components/equipe/RecognitionCard"
import {
  AlertTriangle,
  Users,
  MessageSquare,
  CalendarCheck,
  TrendingUp,
  Flame,
  Heart,
  Bell,
} from "lucide-react"

// ─── Burnout badge ───────────────────────────────────────────────────────────

type BurnoutLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL"

const BURNOUT_CONFIG: Record<BurnoutLevel, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  LOW:      { label: "Baixo",    variant: "default",     className: "bg-green-100 text-green-800 border-green-200" },
  MODERATE: { label: "Moderado", variant: "secondary",   className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  HIGH:     { label: "Alto",     variant: "destructive",  className: "bg-orange-100 text-orange-800 border-orange-200" },
  CRITICAL: { label: "Crítico",  variant: "destructive",  className: "bg-red-100 text-red-800 border-red-200" },
}

function getBurnoutLevel(index: number): BurnoutLevel {
  if (index < 25) return "LOW"
  if (index < 50) return "MODERATE"
  if (index < 75) return "HIGH"
  return "CRITICAL"
}

// ─── Skeleton helpers ────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-3 w-16 mt-2" />
      </CardContent>
    </Card>
  )
}

function RecognitionSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </CardContent>
    </Card>
  )
}

// ─── Stat cards ──────────────────────────────────────────────────────────────

interface FeedbackStatProps {
  count: number
  goal?: number
}

function FeedbackStat({ count, goal = 20 }: FeedbackStatProps) {
  const pct = Math.min(100, Math.round((count / goal) * 100))
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-4xl font-bold text-gray-800">{count}</span>
      <span className="text-xs text-gray-500">
        Meta: <span className="font-semibold">{goal}</span>
      </span>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#dc2626",
          }}
        />
      </div>
      <span className="text-xs text-gray-400">{pct}% da meta</span>
    </div>
  )
}

interface OneOnOneStatProps {
  completed: number
  scheduled: number
}

function OneOnOneStat({ completed, scheduled }: OneOnOneStatProps) {
  const pct = scheduled > 0 ? Math.min(100, Math.round((completed / scheduled) * 100)) : 0
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="text-4xl font-bold text-gray-800">{completed}</span>
      <span className="text-xs text-gray-500">
        Agendados: <span className="font-semibold">{scheduled}</span>
      </span>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct >= 80 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#dc2626",
          }}
        />
      </div>
      <span className="text-xs text-gray-400">{pct}% realizados</span>
    </div>
  )
}

// ─── Alert item ──────────────────────────────────────────────────────────────

interface AlertItemProps {
  message: string
  severity: "info" | "warning" | "error"
}

function AlertItem({ message, severity }: AlertItemProps) {
  const config = {
    info:    { icon: Bell,          className: "text-blue-600 bg-blue-50 border-blue-200" },
    warning: { icon: AlertTriangle, className: "text-yellow-700 bg-yellow-50 border-yellow-200" },
    error:   { icon: Flame,         className: "text-red-700 bg-red-50 border-red-200" },
  }[severity]

  const Icon = config.icon

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${config.className}`}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EquipePainelTab() {
  const { data, isLoading, isError, error } = trpc.team.panelData.get.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stat card grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        {/* Recognitions skeleton */}
        <div>
          <Skeleton className="h-5 w-40 mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <RecognitionSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 p-6 text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar o painel</p>
            <p className="text-sm text-red-600 mt-0.5">{error?.message ?? "Tente novamente em alguns instantes."}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // ── Derived values ───────────────────────────────────────────────────────

  const burnoutLevel = getBurnoutLevel(data.burnoutIndex)
  const burnoutConfig = BURNOUT_CONFIG[burnoutLevel]

  const okrProgress = (data.avgOKRProgress ?? 0) / 100

  // Alerts list — built from returned data signals
  const alerts: AlertItemProps[] = []

  if (data.wellbeingAlertCount > 0) {
    alerts.push({
      severity: data.wellbeingAlertCount >= 3 ? "error" : "warning",
      message: `${data.wellbeingAlertCount} membro(s) com sinais de esgotamento ou suporte necessário nesta semana.`,
    })
  }
  if (burnoutLevel === "HIGH" || burnoutLevel === "CRITICAL") {
    alerts.push({
      severity: "error",
      message: `Índice de burnout da equipe em nível ${burnoutConfig.label}. Ação imediata recomendada.`,
    })
  }
  if (data.recentFeedbackCount === 0) {
    alerts.push({
      severity: "warning",
      message: "Nenhum feedback registrado nos últimos 30 dias. Incentive a cultura de feedback.",
    })
  }
  if (data.recentOneOnOneCount === 0) {
    alerts.push({
      severity: "warning",
      message: "Nenhum 1:1 concluído no mês. Agende conversas individuais com a equipe.",
    })
  }
  if (okrProgress < 0.3 && data.activeOKRCount > 0) {
    alerts.push({
      severity: "warning",
      message: `Progresso médio dos OKRs está em ${Math.round(okrProgress * 100)}%. Revise as metas e obstáculos.`,
    })
  }
  if (alerts.length === 0) {
    alerts.push({
      severity: "info",
      message: "Sem alertas críticos no momento. A equipe está nos trilhos!",
    })
  }

  // Recognition data mapped to RecognitionCard shape
  const recognitions = data.recentRecognitions.map((r: any) => ({
    id: r.id,
    fromName: r.from?.user?.name ?? "—",
    fromAvatar: r.from?.user?.avatar_url ?? undefined,
    toName: r.to?.user?.name ?? "—",
    toAvatar: r.to?.user?.avatar_url ?? undefined,
    message: r.message,
    category: r.category,
    competency: r.competency ?? undefined,
    createdAt: r.createdAt,
    reactions: r.reactions ?? [],
  }))

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Section: Stat cards 2×3 grid ─────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Indicadores da Equipe
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Card 1 — eNPS */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Heart className="h-4 w-4 text-rose-500" />
                eNPS — Engajamento
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center flex-1 pt-2">
              {data.eNPS !== null ? (
                <ENPSGauge score={data.eNPS} label="Employee NPS" />
              ) : (
                <div className="flex flex-col items-center justify-center h-24 gap-1 text-gray-400 text-sm">
                  <span className="text-3xl font-bold text-gray-300">—</span>
                  <span>Sem pesquisa recente</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2 — Client NPS */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Users className="h-4 w-4 text-blue-500" />
                NPS de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center flex-1 pt-2">
              {data.clientNPS !== null ? (
                <NPSGauge score={Math.max(0, (data.clientNPS + 100) / 2)} maxScore={100} label="Satisfação de Clientes" />
              ) : (
                <div className="flex flex-col items-center justify-center h-24 gap-1 text-gray-400 text-sm">
                  <span className="text-3xl font-bold text-gray-300">—</span>
                  <span>Sem feedbacks recentes</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 3 — Burnout Risk */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Flame className="h-4 w-4 text-orange-500" />
                Índice de Burnout
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center flex-1 gap-3 py-4">
              <span className="text-5xl font-bold text-gray-800">{data.burnoutIndex}</span>
              <span className="text-xs text-gray-400">pontos de risco (0–100)</span>
              <Badge className={`text-sm px-3 py-1 border ${burnoutConfig.className}`}>
                {burnoutConfig.label}
              </Badge>
              <p className="text-xs text-center text-gray-500 leading-relaxed">
                Calculado a partir dos níveis de risco individuais dos membros da equipe.
              </p>
            </CardContent>
          </Card>

          {/* Card 4 — Feedbacks esta semana */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MessageSquare className="h-4 w-4 text-purple-500" />
                Feedbacks (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2">
              <FeedbackStat count={data.recentFeedbackCount} goal={20} />
            </CardContent>
          </Card>

          {/* Card 5 — 1:1s this month */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <CalendarCheck className="h-4 w-4 text-teal-500" />
                1:1s no Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pt-2">
              <OneOnOneStat
                completed={data.recentOneOnOneCount}
                scheduled={Math.max(data.recentOneOnOneCount, data.activeOKRCount)}
              />
            </CardContent>
          </Card>

          {/* Card 6 — OKR Progress */}
          <Card className="flex flex-col">
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Progresso OKRs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center gap-3 pt-2">
              <div className="text-center">
                <span className="text-4xl font-bold text-gray-800">
                  {data.activeOKRCount}
                </span>
                <span className="text-sm text-gray-500 ml-1">OKRs ativos</span>
              </div>
              <OKRProgressBar progress={okrProgress} showLabel />
              <p className="text-xs text-center text-gray-400">
                Média de progresso da equipe
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section: Alerts ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Alertas e Atenções
        </h2>
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <AlertItem key={i} {...alert} />
          ))}
        </div>
      </section>

      {/* ── Section: Recent recognitions ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Reconhecimentos Recentes
        </h2>
        {recognitions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
              <Heart className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhum reconhecimento nos últimos 7 dias.</p>
              <p className="text-xs">Que tal reconhecer alguém da equipe agora?</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recognitions.map((rec: any) => (
              <RecognitionCard key={rec.id} recognition={rec} />
            ))}
          </div>
        )}
      </section>

      {/* ── Section: Personal snapshot (if myData available) ─────────────── */}
      {data.myData && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Meu Resumo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* My active OKR */}
            {data.myData.activeOKR && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-gray-700">Meu OKR Ativo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {(data.myData.activeOKR as any).objective}
                  </p>
                  <OKRProgressBar
                    progress={((data.myData.activeOKR as any).overallProgress ?? 0) / 100}
                    showLabel
                  />
                  <Badge variant="outline" className="text-xs">
                    Q{(data.myData.activeOKR as any).quarter} · {(data.myData.activeOKR as any).year}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Pending feedback */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Feedbacks Pendentes</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <span className="text-5xl font-bold text-gray-800">
                  {data.myData.pendingFeedbackCount}
                </span>
              </CardContent>
            </Card>

            {/* Wellbeing / burnout */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Meu Risco de Burnout</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-4">
                {data.myData.burnoutRiskLevel ? (
                  <>
                    <Badge
                      className={`text-sm px-3 py-1 border ${BURNOUT_CONFIG[data.myData.burnoutRiskLevel as BurnoutLevel]?.className ?? ""}`}
                    >
                      {BURNOUT_CONFIG[data.myData.burnoutRiskLevel as BurnoutLevel]?.label ?? data.myData.burnoutRiskLevel}
                    </Badge>
                    {data.myData.lastWellbeingScore != null && (
                      <span className="text-xs text-gray-400">
                        Último bem-estar: {data.myData.lastWellbeingScore}/10
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-gray-400">Sem avaliação recente</span>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  )
}
