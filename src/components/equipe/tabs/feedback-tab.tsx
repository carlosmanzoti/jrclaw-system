"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { FeedbackCard } from "@/components/equipe/FeedbackCard"
import {
  FEEDBACK_TYPE_CONFIG,
  LEGAL_COMPETENCY_LABELS,
} from "@/lib/constants/competencies"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type FeedbackType = "POSITIVO" | "CONSTRUTIVO" | "FEEDFORWARD" | "RECONHECIMENTO"
type Visibility = "PRIVATE" | "TEAM" | "MANAGERS_ONLY"
type Direction = "MANAGER_TO_REPORT" | "REPORT_TO_MANAGER" | "PEER_TO_PEER" | "SELF" | "CLIENT_ORIGINATED"

interface FeedbackFormState {
  targetId: string
  type: FeedbackType
  competency: string
  situation: string
  behavior: string
  impact: string
  feedforward: string
  caseId: string
  visibility: Visibility
  direction: Direction
}

const INITIAL_FORM: FeedbackFormState = {
  targetId: "",
  type: "POSITIVO",
  competency: "",
  situation: "",
  behavior: "",
  impact: "",
  feedforward: "",
  caseId: "",
  visibility: "PRIVATE",
  direction: "PEER_TO_PEER",
}

const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: "Privado (somente envolvidos)",
  TEAM: "Equipe (todos podem ver)",
  MANAGERS_ONLY: "Gestores",
}

const REACTION_EMOJI: Record<string, string> = {
  AGRADECIDO: "🙏",
  CONCORDO: "👍",
  PARCIALMENTE_CONCORDO: "🤔",
  DISCORDO: "❌",
  PRECISO_CONVERSAR: "💬",
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className="mt-1 text-2xl font-bold"
        style={{ color: color ?? "#374151" }}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EquipeFeedbackTab() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = React.useState<FeedbackFormState>(INITIAL_FORM)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [submitSuccess, setSubmitSuccess] = React.useState(false)

  // ── tRPC queries ────────────────────────────────────────────────────────────
  const feedbackListQuery = trpc.team.feedback.list.useQuery(
    { page: 1, perPage: 30 },
    { refetchOnWindowFocus: false }
  )

  const statsQuery = trpc.team.feedback.stats.useQuery(
    { weeks: 4 },
    { refetchOnWindowFocus: false }
  )

  const membersQuery = trpc.team.members.list.useQuery(
    { page: 1, perPage: 100 },
    { refetchOnWindowFocus: false }
  )

  // ── tRPC mutations ───────────────────────────────────────────────────────────
  const createMutation = trpc.team.feedback.create.useMutation({
    onSuccess: () => {
      setForm(INITIAL_FORM)
      setSubmitSuccess(true)
      feedbackListQuery.refetch()
      statsQuery.refetch()
      setTimeout(() => setSubmitSuccess(false), 3000)
    },
  })

  const reactMutation = trpc.team.feedback.react.useMutation({
    onSuccess: () => feedbackListQuery.refetch(),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function setField<K extends keyof FeedbackFormState>(key: K, value: FeedbackFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleHarveyAssist() {
    if (!form.situation.trim()) return
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/feedback-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          situation: form.situation,
          behavior: form.behavior,
          impact: form.impact,
          feedforward: form.feedforward,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.situation) setField("situation", data.situation)
        if (data.behavior) setField("behavior", data.behavior)
        if (data.impact) setField("impact", data.impact)
        if (data.feedforward) setField("feedforward", data.feedforward)
      }
    } catch {
      // silent — IA is optional enhancement
    } finally {
      setAiLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.targetId || !form.situation.trim() || !form.behavior.trim() || !form.impact.trim()) return
    createMutation.mutate({
      targetId: form.targetId,
      type: form.type,
      direction: form.direction,
      visibility: form.visibility,
      situation: form.situation,
      behavior: form.behavior,
      impact: form.impact,
      feedforward: form.feedforward || undefined,
      competency: (form.competency as any) || undefined,
      caseId: form.caseId || undefined,
      aiSuggested: false,
    })
  }

  function handleReact(feedbackId: string, reaction: string) {
    reactMutation.mutate({ id: feedbackId, reaction: reaction as any })
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  const feedbacks = feedbackListQuery.data?.items ?? []
  const members = membersQuery.data?.items ?? []
  const stats = statsQuery.data

  const isFormValid =
    !!form.targetId &&
    form.situation.trim().length > 0 &&
    form.behavior.trim().length > 0 &&
    form.impact.trim().length > 0

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-[#374151]">Feedback Contínuo</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Modelo SBI — Situação, Comportamento, Impacto — para feedbacks objetivos e acionáveis.
        </p>
      </div>

      {/* ── Main 2-column grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Feed ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#374151]">Feed de Feedbacks</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => feedbackListQuery.refetch()}
              disabled={feedbackListQuery.isFetching}
              className="text-xs text-gray-400 h-7 px-2"
            >
              {feedbackListQuery.isFetching ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>

          {feedbackListQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : feedbacks.length === 0 ? (
            <Card className="border-dashed border-gray-200">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-gray-400">Nenhum feedback encontrado.</p>
                <p className="text-xs text-gray-300 mt-1">
                  Use o formulário ao lado para enviar o primeiro.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {feedbacks.map((fb) => {
                const feedbackData = {
                  id: fb.id,
                  authorName: fb.author?.user?.name ?? "Anônimo",
                  authorAvatar: fb.author?.user?.avatar_url ?? undefined,
                  type: fb.type,
                  competency: fb.competency ?? undefined,
                  situation: fb.situation,
                  behavior: fb.behavior,
                  impact: fb.impact,
                  feedforward: fb.feedforward ?? undefined,
                  caseNumber: undefined,
                  createdAt: fb.createdAt instanceof Date ? fb.createdAt.toISOString() : String(fb.createdAt),
                  acknowledged: fb.acknowledged,
                  reaction: fb.reaction
                    ? REACTION_EMOJI[fb.reaction] ?? fb.reaction
                    : undefined,
                }
                return (
                  <FeedbackCard
                    key={fb.id}
                    feedback={feedbackData}
                    onReact={(emoji) => {
                      // Map emoji back to enum value
                      const reactionEntry = Object.entries(REACTION_EMOJI).find(
                        ([, e]) => e === emoji
                      )
                      if (reactionEntry) handleReact(fb.id, reactionEntry[0])
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Form ────────────────────────────────────────────────────── */}
        <div>
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-[#374151]">
                Dar Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Target select */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#374151]">
                    Para quem <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.targetId}
                    onValueChange={(v) => setField("targetId", v)}
                  >
                    <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                      <SelectValue placeholder="Selecione o membro da equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.user?.name ?? m.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type radio */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#374151]">
                    Tipo de feedback <span className="text-red-500">*</span>
                  </Label>
                  <div role="radiogroup" className="grid grid-cols-2 gap-2">
                    {(Object.entries(FEEDBACK_TYPE_CONFIG) as [string, { label: string; color: string; icon: string }][]).map(
                      ([key, cfg]) => (
                        <button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={form.type === key}
                          onClick={() => setField("type", key as FeedbackType)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border-2 px-3 py-2 cursor-pointer text-sm font-medium transition-colors text-left",
                            form.type === key
                              ? "border-[#C9A84C] bg-amber-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: cfg.color }}
                          />
                          {cfg.label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Competency select */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#374151]">
                    Competência
                  </Label>
                  <Select
                    value={form.competency}
                    onValueChange={(v) => setField("competency", v)}
                  >
                    <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                      <SelectValue placeholder="Selecione (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {Object.entries(LEGAL_COMPETENCY_LABELS).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* SBI fields */}
                <div className="rounded-lg border border-[#C9A84C]/30 bg-amber-50/40 px-3 py-2">
                  <p className="text-xs text-[#374151] font-medium">
                    Modelo <strong>SBI</strong> — Situação → Comportamento → Impacto
                  </p>
                </div>

                {/* Situação */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fb-situation"
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#374151]"
                  >
                    <span role="img" aria-hidden="true">📍</span>
                    Situação <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="fb-situation"
                    value={form.situation}
                    onChange={(e) => setField("situation", e.target.value)}
                    placeholder="Descreva o contexto específico — quando e onde o comportamento ocorreu."
                    rows={3}
                    className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                  />
                  <p className="text-xs text-gray-400">{form.situation.length} caracteres</p>
                </div>

                {/* Comportamento */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fb-behavior"
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#374151]"
                  >
                    <span role="img" aria-hidden="true">👁️</span>
                    Comportamento <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="fb-behavior"
                    value={form.behavior}
                    onChange={(e) => setField("behavior", e.target.value)}
                    placeholder="Descreva o comportamento observável — o que a pessoa fez ou disse, objetivamente."
                    rows={3}
                    className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                  />
                  <p className="text-xs text-gray-400">{form.behavior.length} caracteres</p>
                </div>

                {/* Impacto */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fb-impact"
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#374151]"
                  >
                    <span role="img" aria-hidden="true">⚡</span>
                    Impacto <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="fb-impact"
                    value={form.impact}
                    onChange={(e) => setField("impact", e.target.value)}
                    placeholder="Descreva o impacto gerado — em você, na equipe, no cliente ou nos resultados."
                    rows={3}
                    className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                  />
                  <p className="text-xs text-gray-400">{form.impact.length} caracteres</p>
                </div>

                {/* Feedforward (optional) */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fb-feedforward"
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#374151]"
                  >
                    <span role="img" aria-hidden="true">🔮</span>
                    Feedforward
                    <span className="text-xs font-normal text-gray-400">(opcional)</span>
                  </Label>
                  <Textarea
                    id="fb-feedforward"
                    value={form.feedforward}
                    onChange={(e) => setField("feedforward", e.target.value)}
                    placeholder="Sugira como a pessoa pode evoluir esse comportamento no futuro."
                    rows={2}
                    className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                  />
                </div>

                <Separator />

                {/* Visibility */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#374151]">Visibilidade</Label>
                  <Select
                    value={form.visibility}
                    onValueChange={(v) => setField("visibility", v as Visibility)}
                  >
                    <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(VISIBILITY_LABELS) as [Visibility, string][]).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleHarveyAssist}
                    disabled={aiLoading || !form.situation.trim()}
                    className="gap-1.5 text-xs border-[#C9A84C]/40 text-[#C9A84C] hover:bg-amber-50 hover:text-[#b8973e]"
                  >
                    {aiLoading ? (
                      <>
                        <span className="animate-spin inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                        Processando...
                      </>
                    ) : (
                      <>✨ Harvey: Melhorar Texto</>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    disabled={!isFormValid || createMutation.isPending}
                    className="ml-auto bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
                  >
                    {createMutation.isPending ? "Enviando..." : "Enviar Feedback"}
                  </Button>
                </div>

                {/* Success message */}
                {submitSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 font-medium">
                    Feedback enviado com sucesso!
                  </div>
                )}

                {/* Error message */}
                {createMutation.isError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Erro ao enviar: {createMutation.error?.message}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Stats section ──────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[#374151] mb-3">
          Estatísticas — últimas 4 semanas
        </h3>

        {statsQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Enviados"
              value={stats.totalGiven}
              sub="feedbacks dados"
              color="#3B82F6"
            />
            <StatCard
              label="Recebidos"
              value={stats.totalReceived}
              sub="feedbacks recebidos"
              color="#10B981"
            />
            <StatCard
              label="Positivos"
              value={`${Math.round(stats.positiveRatio * 100)}%`}
              sub={`${stats.positiveCount} positivos / reconhecimento`}
              color="#C9A84C"
            />
            <StatCard
              label="Construtivos"
              value={stats.constructiveCount}
              sub="oportunidades de melhoria"
              color="#F59E0B"
            />
          </div>
        ) : null}

        {/* Top competencies */}
        {stats && stats.topCompetencies.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Competências mais mencionadas
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.topCompetencies.map(({ competency, count }) => {
                const cfg = LEGAL_COMPETENCY_LABELS[competency]
                return (
                  <Badge
                    key={competency}
                    variant="outline"
                    className="text-xs gap-1.5"
                    style={{
                      backgroundColor: `${cfg?.color ?? "#6b7280"}15`,
                      borderColor: `${cfg?.color ?? "#6b7280"}50`,
                      color: cfg?.color ?? "#6b7280",
                    }}
                  >
                    {cfg?.label ?? competency}
                    <span className="font-bold">{count}×</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
