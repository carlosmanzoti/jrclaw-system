"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RecognitionCard } from "@/components/equipe/RecognitionCard"
import { StarOfWeek } from "@/components/equipe/StarOfWeek"
import { CompetencyBadge } from "@/components/equipe/CompetencyBadge"
import {
  RECOGNITION_CATEGORY_LABELS,
  LEGAL_COMPETENCY_LABELS,
} from "@/lib/constants/competencies"
import {
  AlertTriangle,
  Award,
  Filter,
  Heart,
  Loader2,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type RecognitionCategory = "HIGH_FIVE" | "STAR_OF_WEEK" | "MILESTONE_REC" | "CLIENT_PRAISE" | "INNOVATION" | "MENTORSHIP"

interface Recognition {
  id: string
  fromId: string
  fromName: string
  fromAvatar?: string
  toId: string
  toName: string
  toAvatar?: string
  message: string
  category: string
  competency?: string
  caseId?: string
  isPublic: boolean
  createdAt: string
  reactions?: Array<{ emoji: string; count: number }>
}

interface TeamMember {
  id: string
  name: string
  avatarUrl?: string
  role?: string
}

interface RecognitionStats {
  topGiver?: { name: string; count: number }
  topReceiver?: { name: string; count: number }
  topCompetencies: Array<{ competency: string; count: number }>
  badges: Array<{ key: string; label: string; description: string; memberId: string; memberName: string }>
}

// ─── Gamification Badge Config ────────────────────────────────────────────────

const GAMIFICATION_BADGES: Record<
  string,
  { label: string; description: string; icon: string; color: string }
> = {
  FIRST_KUDOS: {
    label: "Primeiro Kudos",
    description: "Enviou o primeiro reconhecimento",
    icon: "🌱",
    color: "#10B981",
  },
  MENTOR_DE_OURO: {
    label: "Mentor de Ouro",
    description: "Reconhecido 3× por mentoria",
    icon: "🥇",
    color: "#C9A84C",
  },
  STREAK: {
    label: "Streak 4 semanas",
    description: "Enviou reconhecimentos por 4 semanas consecutivas",
    icon: "🔥",
    color: "#F97316",
  },
  MOST_RECOGNIZED: {
    label: "Mais Reconhecido",
    description: "Membro mais reconhecido do período",
    icon: "⭐",
    color: "#6366F1",
  },
  INNOVATION_STAR: {
    label: "Estrela da Inovação",
    description: "Reconhecido por inovação este trimestre",
    icon: "💡",
    color: "#8B5CF6",
  },
}

const RECOGNITION_CATEGORY_KEYS = Object.keys(
  RECOGNITION_CATEGORY_LABELS
) as RecognitionCategory[]

const COMPETENCY_KEYS = Object.keys(LEGAL_COMPETENCY_LABELS)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

// ─── Stats Section ────────────────────────────────────────────────────────────

interface StatsSectionProps {
  stats: RecognitionStats
}

function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Estatísticas do Período
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top giver */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              Quem mais reconhece
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topGiver ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-sm font-bold text-rose-700">
                  {getInitials(stats.topGiver.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {stats.topGiver.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.topGiver.count} reconhecimentos enviados
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sem dados no período</p>
            )}
          </CardContent>
        </Card>

        {/* Top receiver */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Mais reconhecido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topReceiver ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700">
                  {getInitials(stats.topReceiver.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">
                    {stats.topReceiver.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.topReceiver.count} reconhecimentos recebidos
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sem dados no período</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top competencies */}
      {stats.topCompetencies.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Medal className="h-4 w-4 text-blue-500" />
              Competências mais reconhecidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topCompetencies.slice(0, 5).map((item) => {
              const max = stats.topCompetencies[0].count
              const pct = Math.round((item.count / Math.max(1, max)) * 100)
              return (
                <div key={item.competency} className="flex items-center gap-2">
                  <CompetencyBadge
                    competency={item.competency}
                    className="shrink-0"
                  />
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#C9A84C] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-5 text-right">
                    {item.count}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Gamification badges */}
      {stats.badges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              Conquistas da Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((badge, idx) => {
                const config =
                  GAMIFICATION_BADGES[badge.key] ?? {
                    label: badge.label,
                    description: badge.description,
                    icon: "🏅",
                    color: "#6b7280",
                  }
                return (
                  <div
                    key={`${badge.key}-${idx}`}
                    className="flex items-center gap-2 rounded-full border px-3 py-1.5"
                    style={{
                      borderColor: `${config.color}40`,
                      backgroundColor: `${config.color}10`,
                    }}
                    title={`${config.description} — ${badge.memberName}`}
                  >
                    <span>{config.icon}</span>
                    <div className="text-xs">
                      <span
                        className="font-semibold"
                        style={{ color: config.color }}
                      >
                        {config.label}
                      </span>
                      <span className="text-gray-500 ml-1">
                        · {badge.memberName}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  )
}

// ─── Give Recognition Form ────────────────────────────────────────────────────

interface GiveRecognitionFormProps {
  members: TeamMember[]
  cases?: Array<{ id: string; title: string }>
  onSuccess?: () => void
}

function GiveRecognitionForm({
  members,
  cases = [],
  onSuccess,
}: GiveRecognitionFormProps) {
  const utils = trpc.useUtils()

  const [toId, setToId] = React.useState("")
  const [category, setCategory] = React.useState<RecognitionCategory | "">("")
  const [message, setMessage] = React.useState("")
  const [competency, setCompetency] = React.useState("")
  const [caseId, setCaseId] = React.useState("")
  const [isPublic, setIsPublic] = React.useState(true)

  const createMutation = trpc.team.recognition.create.useMutation({
    onSuccess: () => {
      utils.team.recognition.list.invalidate()
      setToId("")
      setCategory("")
      setMessage("")
      setCompetency("")
      setCaseId("")
      setIsPublic(true)
      onSuccess?.()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!toId || !category || !message.trim()) return
    createMutation.mutate({
      toId,
      category: category as RecognitionCategory,
      message,
      competency: (competency || undefined) as Parameters<typeof createMutation.mutate>[0]["competency"],
      caseId: caseId || undefined,
      isPublic,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Target member — avatar grid */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">
          Para quem? <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const isSelected = toId === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setToId(m.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all focus-visible:outline-none ${
                  isSelected
                    ? "border-[#C9A84C] bg-amber-50"
                    : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.avatarUrl} alt={m.name} />
                  <AvatarFallback className="text-xs bg-gray-100">
                    {getInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-gray-600 text-center leading-tight max-w-[52px] truncate">
                  {m.name.split(" ")[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Categoria <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RECOGNITION_CATEGORY_KEYS.map((key) => {
            const cfg = RECOGNITION_CATEGORY_LABELS[key]
            const isSelected = category === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all focus-visible:outline-none ${
                  isSelected
                    ? "border-[#C9A84C] bg-amber-50 text-amber-800"
                    : "border-gray-200 text-gray-600 hover:border-[#C9A84C]/50"
                }`}
              >
                <span>{cfg.emoji}</span>
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Mensagem <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Descreva o que essa pessoa fez de especial..."
          required
          className="text-sm min-h-[80px]"
        />
      </div>

      {/* Competency (optional) */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Competência destacada (opcional)
        </label>
        <Select value={competency} onValueChange={setCompetency}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Selecione uma competência..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhuma</SelectItem>
            {COMPETENCY_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {LEGAL_COMPETENCY_LABELS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Case (optional) */}
      {cases.length > 0 && (
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Caso relacionado (opcional)
          </label>
          <Select value={caseId} onValueChange={setCaseId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione um caso..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Public toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <span className="text-sm text-gray-700">Reconhecimento público</span>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={() => setIsPublic((v) => !v)}
          className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none ${
            isPublic ? "bg-[#C9A84C]" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              isPublic ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {createMutation.isError && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" />
          {createMutation.error?.message ??
            "Erro ao enviar reconhecimento. Tente novamente."}
        </p>
      )}

      {createMutation.isSuccess && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Reconhecimento enviado com sucesso!
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={
          createMutation.isPending ||
          !toId ||
          !category ||
          !message.trim()
        }
      >
        {createMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Dar Reconhecimento
          </>
        )}
      </Button>
    </form>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EquipeRecognitionTab() {
  const [periodFilter, setPeriodFilter] = React.useState("30")
  const [personFilter, setPersonFilter] = React.useState("")
  const [competencyFilter, setCompetencyFilter] = React.useState("")
  const [showForm, setShowForm] = React.useState(false)

  const listQuery = trpc.team.recognition.list.useQuery(
    {
      toId: personFilter || undefined,
      onlyPublic: true,
    },
    { staleTime: 2 * 60 * 1000 }
  )

  const reactMutation = trpc.team.recognition.react.useMutation({
    onSuccess: () => {
      listQuery.refetch()
    },
  })

  const rawItems = listQuery.data?.items ?? []
  const recognitions: Recognition[] = rawItems.map((item: any) => ({
    id: item.id,
    fromId: item.from?.user?.id ?? item.fromId,
    fromName: item.from?.user?.name ?? "Desconhecido",
    fromAvatar: item.from?.user?.avatar_url,
    toId: item.to?.user?.id ?? item.toId,
    toName: item.to?.user?.name ?? "Desconhecido",
    toAvatar: item.to?.user?.avatar_url,
    message: item.message,
    category: item.category,
    competency: item.competency,
    caseId: item.caseId,
    isPublic: item.isPublic,
    createdAt: item.createdAt,
    reactions: item.reactions
      ? Object.entries(item.reactions as Record<string, number>).map(
          ([emoji, count]) => ({ emoji, count })
        )
      : [],
  }))

  // Compute Star of the Week from items: find the most recent STAR_OF_WEEK recognition
  const starOfWeekItem = rawItems.find((item: any) => item.category === "STAR_OF_WEEK")
  const starOfWeek = starOfWeekItem
    ? {
        toName: (starOfWeekItem as any).to?.user?.name ?? "Desconhecido",
        toAvatar: (starOfWeekItem as any).to?.user?.avatar_url,
        message: (starOfWeekItem as any).message,
        fromName: (starOfWeekItem as any).from?.user?.name ?? "Desconhecido",
      }
    : undefined

  // Members: fetch from a separate query for the form
  const membersQuery = trpc.team.members.list.useQuery(
    { perPage: 200 },
    { staleTime: 5 * 60 * 1000 }
  )
  const members: TeamMember[] = (membersQuery.data?.items ?? []).map((m: any) => ({
    id: m.id,
    name: m.user?.name ?? "Desconhecido",
    avatarUrl: m.user?.avatar_url,
    role: m.user?.role,
  }))

  // Stats: compute from items
  const stats: RecognitionStats = React.useMemo(() => {
    const giverCounts: Record<string, { name: string; count: number }> = {}
    const receiverCounts: Record<string, { name: string; count: number }> = {}
    const competencyCounts: Record<string, number> = {}

    for (const r of recognitions) {
      // Count givers
      if (!giverCounts[r.fromId]) giverCounts[r.fromId] = { name: r.fromName, count: 0 }
      giverCounts[r.fromId].count++

      // Count receivers
      if (!receiverCounts[r.toId]) receiverCounts[r.toId] = { name: r.toName, count: 0 }
      receiverCounts[r.toId].count++

      // Count competencies
      if (r.competency) {
        competencyCounts[r.competency] = (competencyCounts[r.competency] ?? 0) + 1
      }
    }

    const topGiver = Object.values(giverCounts).sort((a, b) => b.count - a.count)[0]
    const topReceiver = Object.values(receiverCounts).sort((a, b) => b.count - a.count)[0]
    const topCompetencies = Object.entries(competencyCounts)
      .map(([competency, count]) => ({ competency, count }))
      .sort((a, b) => b.count - a.count)

    return {
      topGiver,
      topReceiver,
      topCompetencies,
      badges: [],
    }
  }, [recognitions])

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecognitionSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (listQuery.isError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex items-center gap-3 p-6 text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Erro ao carregar reconhecimentos</p>
            <p className="text-sm text-red-600 mt-0.5">
              {listQuery.error?.message ??
                "Tente novamente em alguns instantes."}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ── Star of the Week ────────────────────────────────────────────────── */}
      {starOfWeek ? (
        <section>
          <StarOfWeek
            name={starOfWeek.toName}
            avatarUrl={starOfWeek.toAvatar}
            message={starOfWeek.message}
            fromName={starOfWeek.fromName}
          />
        </section>
      ) : (
        <section>
          <Card className="border-dashed border-[#C9A84C]/30 bg-amber-50/30">
            <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-amber-700">
              <Trophy className="h-8 w-8 opacity-50" />
              <p className="text-sm font-medium">
                Nenhuma Estrela da Semana ainda
              </p>
              <p className="text-xs text-amber-600 opacity-70">
                Reconheça um colega como Estrela da Semana!
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Header + Form toggle ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Mural de Reconhecimentos
        </h2>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? "outline" : "default"}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {showForm ? "Fechar formulário" : "Dar Reconhecimento"}
        </Button>
      </div>

      {/* ── Give Recognition inline form ────────────────────────────────────── */}
      {showForm && (
        <Card className="border-[#C9A84C]/30 bg-amber-50/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              Novo Reconhecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GiveRecognitionForm
              members={members}
              cases={[]}
              onSuccess={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-400" />

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={personFilter} onValueChange={setPersonFilter}>
          <SelectTrigger className="h-8 w-48 text-xs">
            <SelectValue placeholder="Filtrar por pessoa..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os membros</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={competencyFilter} onValueChange={setCompetencyFilter}>
          <SelectTrigger className="h-8 w-52 text-xs">
            <SelectValue placeholder="Filtrar por competência..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as competências</SelectItem>
            {COMPETENCY_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {LEGAL_COMPETENCY_LABELS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Recognition Feed ────────────────────────────────────────────────── */}
      <section>
        {recognitions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Heart className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhum reconhecimento no período.</p>
              <p className="text-xs">
                Seja o primeiro a reconhecer um colega!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recognitions.map((rec) => {
              const cardData = {
                id: rec.id,
                fromName: rec.fromName,
                fromAvatar: rec.fromAvatar,
                toName: rec.toName,
                toAvatar: rec.toAvatar,
                message: rec.message,
                category: rec.category,
                competency: rec.competency,
                createdAt: rec.createdAt,
                reactions: rec.reactions,
              }
              return (
                <RecognitionCard
                  key={rec.id}
                  recognition={cardData}
                  onReact={(emoji) =>
                    reactMutation.mutate({
                      id: rec.id,
                      emoji,
                    })
                  }
                />
              )
            })}
          </div>
        )}
      </section>

      {/* ── Stats Section ───────────────────────────────────────────────────── */}
      {(stats.topGiver ||
        stats.topReceiver ||
        stats.topCompetencies.length > 0 ||
        stats.badges.length > 0) && <StatsSection stats={stats} />}

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        <Users className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          A cultura de reconhecimento fortalece o engajamento da equipe.
          Reconhecimentos públicos são visíveis a todos os membros do
          escritório.
        </span>
      </div>
    </div>
  )
}
