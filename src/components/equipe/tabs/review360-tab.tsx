"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadarCompetency } from "@/components/equipe/RadarCompetency"
import { NineBoxGrid } from "@/components/equipe/NineBoxGrid"
import { CompetencyBadge } from "@/components/equipe/CompetencyBadge"
import { LEGAL_COMPETENCY_LABELS } from "@/lib/constants/competencies"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type CycleStatus = "SETUP" | "COLLECTING" | "PROCESSING" | "REVIEW_360" | "RELEASED" | "CLOSED_360"

interface NewCycleForm {
  name: string
  period: string
  startDate: string
  endDate: string
  resultsDate: string
  competencies: string[]
  includeClients: boolean
  includePeers: boolean
  includeSelfReview: boolean
  anonymousComments: boolean
  minReviewersPerCategory: number
  participantIds: string[]
}

interface EvaluationScores {
  [competency: string]: {
    score: number
    comment: string
  }
}

const ALL_COMPETENCIES = Object.keys(LEGAL_COMPETENCY_LABELS)

const CYCLE_STATUS_CONFIG: Record<CycleStatus, { label: string; color: string }> = {
  SETUP: { label: "Configuração", color: "bg-gray-100 text-gray-700 border-gray-200" },
  COLLECTING: { label: "Coletando", color: "bg-blue-100 text-blue-700 border-blue-200" },
  PROCESSING: { label: "Processando", color: "bg-amber-100 text-amber-700 border-amber-200" },
  REVIEW_360: { label: "Em revisão", color: "bg-violet-100 text-violet-700 border-violet-200" },
  RELEASED: { label: "Liberado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CLOSED_360: { label: "Encerrado", color: "bg-gray-100 text-gray-500 border-gray-200" },
}

const SCORE_LABELS: Record<number, string> = {
  1: "1 — Abaixo das expectativas",
  2: "2 — Em desenvolvimento",
  3: "3 — Atende às expectativas",
  4: "4 — Supera as expectativas",
  5: "5 — Excepcional",
}

const INITIAL_NEW_CYCLE: NewCycleForm = {
  name: "",
  period: "",
  startDate: "",
  endDate: "",
  resultsDate: "",
  competencies: ALL_COMPETENCIES,
  includeClients: true,
  includePeers: true,
  includeSelfReview: true,
  anonymousComments: true,
  minReviewersPerCategory: 2,
  participantIds: [],
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CycleStatusBadge({ status }: { status: string }) {
  const cfg = CYCLE_STATUS_CONFIG[status as CycleStatus] ?? {
    label: status,
    color: "bg-gray-100 text-gray-600 border-gray-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.color
      )}
    >
      {cfg.label}
    </span>
  )
}

// ─── New Cycle Dialog ─────────────────────────────────────────────────────────

interface NewCycleDialogProps {
  open: boolean
  onClose: () => void
  members: { id: string; user: { name: string } | null }[]
  onSuccess: () => void
}

function NewCycleDialog({ open, onClose, members, onSuccess }: NewCycleDialogProps) {
  const [form, setForm] = React.useState<NewCycleForm>(INITIAL_NEW_CYCLE)

  const createCycleMutation = trpc.team.review360.createCycle.useMutation({
    onSuccess: () => {
      setForm(INITIAL_NEW_CYCLE)
      onSuccess()
      onClose()
    },
  })

  function setField<K extends keyof NewCycleForm>(key: K, value: NewCycleForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleCompetency(key: string) {
    setForm((prev) => ({
      ...prev,
      competencies: prev.competencies.includes(key)
        ? prev.competencies.filter((c) => c !== key)
        : [...prev.competencies, key],
    }))
  }

  function toggleParticipant(id: string) {
    setForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(id)
        ? prev.participantIds.filter((p) => p !== id)
        : [...prev.participantIds, id],
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.period || !form.startDate || !form.endDate) return
    createCycleMutation.mutate({
      name: form.name,
      period: form.period,
      startDate: form.startDate,
      endDate: form.endDate,
      resultsDate: form.resultsDate || undefined,
      competencies: form.competencies,
      includeClients: form.includeClients,
      includePeers: form.includePeers,
      includeSelfReview: form.includeSelfReview,
      anonymousComments: form.anonymousComments,
      minReviewersPerCategory: form.minReviewersPerCategory,
      participantIds: form.participantIds,
    })
  }

  const isValid =
    !!form.name && !!form.period && !!form.startDate && !!form.endDate &&
    form.competencies.length > 0 && form.participantIds.length > 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Ciclo de Avaliação 360°</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-semibold">Nome do ciclo *</Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Ex: Avaliação 360° — 1º Semestre 2026"
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Período *</Label>
              <Input
                value={form.period}
                onChange={(e) => setField("period", e.target.value)}
                placeholder="Ex: 2026-S1"
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Mín. avaliadores/categoria</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.minReviewersPerCategory}
                onChange={(e) => setField("minReviewersPerCategory", Number(e.target.value))}
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Início das coletas *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setField("startDate", e.target.value)}
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Fim das coletas *</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setField("endDate", e.target.value)}
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-semibold">Data de divulgação dos resultados</Label>
              <Input
                type="date"
                value={form.resultsDate}
                onChange={(e) => setField("resultsDate", e.target.value)}
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
          </div>

          <Separator />

          {/* Config options */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Configurações</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "includeSelfReview" as const, label: "Autoavaliação" },
                { key: "includePeers" as const, label: "Avaliação por pares" },
                { key: "includeClients" as const, label: "Avaliação por clientes" },
                { key: "anonymousComments" as const, label: "Comentários anônimos" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`cfg-${key}`}
                    checked={form[key]}
                    onCheckedChange={(v) => setField(key, !!v)}
                  />
                  <Label htmlFor={`cfg-${key}`} className="text-sm cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Competencies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Competências a avaliar ({form.competencies.length})
              </Label>
              <button
                type="button"
                className="text-xs text-[#C9A84C] hover:underline"
                onClick={() =>
                  setField(
                    "competencies",
                    form.competencies.length === ALL_COMPETENCIES.length ? [] : ALL_COMPETENCIES
                  )
                }
              >
                {form.competencies.length === ALL_COMPETENCIES.length
                  ? "Desmarcar todas"
                  : "Marcar todas"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-3">
              {ALL_COMPETENCIES.map((key) => {
                const cfg = LEGAL_COMPETENCY_LABELS[key]
                return (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`comp-${key}`}
                      checked={form.competencies.includes(key)}
                      onCheckedChange={() => toggleCompetency(key)}
                    />
                    <Label htmlFor={`comp-${key}`} className="text-xs cursor-pointer leading-tight">
                      {cfg.label}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Participants */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Participantes ({form.participantIds.length} selecionados)
            </Label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-lg p-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`part-${m.id}`}
                    checked={form.participantIds.includes(m.id)}
                    onCheckedChange={() => toggleParticipant(m.id)}
                  />
                  <Label htmlFor={`part-${m.id}`} className="text-xs cursor-pointer leading-tight">
                    {m.user?.name ?? m.id}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {createCycleMutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createCycleMutation.error?.message}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={(e) => handleSubmit(e as any)}
            disabled={!isValid || createCycleMutation.isPending}
            className="bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
          >
            {createCycleMutation.isPending ? "Criando..." : "Criar Ciclo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Evaluation Form ──────────────────────────────────────────────────────────

interface EvaluationFormProps {
  participantId: string
  competencies: string[]
  reviewType: "self" | "manager" | "peer" | "client"
  onSuccess: () => void
}

function EvaluationForm({ participantId, competencies, reviewType, onSuccess }: EvaluationFormProps) {
  const [scores, setScores] = React.useState<EvaluationScores>(() =>
    Object.fromEntries(competencies.map((c) => [c, { score: 3, comment: "" }]))
  )
  const [mainStrength, setMainStrength] = React.useState("")
  const [mainOpportunity, setMainOpportunity] = React.useState("")

  const evaluateMutation = trpc.team.review360.evaluate.useMutation({
    onSuccess,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    evaluateMutation.mutate({
      participantId,
      reviewType,
      scores: {
        competencies: scores,
        mainStrength,
        mainOpportunity,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2">
        <p className="text-xs text-blue-700 font-medium">
          Avalie cada competência de 1 (abaixo das expectativas) a 5 (excepcional).
          Seus comentários são confidenciais.
        </p>
      </div>

      {competencies.map((key) => {
        const cfg = LEGAL_COMPETENCY_LABELS[key]
        const entry = scores[key] ?? { score: 3, comment: "" }
        return (
          <div key={key} className="space-y-2 rounded-lg border border-gray-100 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[#374151]">{cfg?.label ?? key}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cfg?.description}</p>
              </div>
              <CompetencyBadge competency={key} className="shrink-0" />
            </div>

            {/* 1-5 scale */}
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setScores((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], score: n },
                    }))
                  }
                  className={cn(
                    "flex-1 rounded-md border py-1.5 text-sm font-semibold transition-all",
                    entry.score === n
                      ? "border-[#C9A84C] bg-[#C9A84C] text-white shadow-sm"
                      : "border-gray-200 text-gray-500 hover:border-[#C9A84C]/50 hover:bg-amber-50"
                  )}
                  title={SCORE_LABELS[n]}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 italic">{SCORE_LABELS[entry.score]}</p>

            <Textarea
              value={entry.comment}
              onChange={(e) =>
                setScores((prev) => ({
                  ...prev,
                  [key]: { ...prev[key], comment: e.target.value },
                }))
              }
              placeholder="Comentário (opcional)..."
              rows={2}
              className="resize-none text-xs focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
            />
          </div>
        )
      })}

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#374151]">
            Maior ponto forte
          </Label>
          <Textarea
            value={mainStrength}
            onChange={(e) => setMainStrength(e.target.value)}
            placeholder="Descreva o principal ponto forte desta pessoa..."
            rows={3}
            className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#374151]">
            Maior oportunidade de desenvolvimento
          </Label>
          <Textarea
            value={mainOpportunity}
            onChange={(e) => setMainOpportunity(e.target.value)}
            placeholder="Descreva a principal área de melhoria..."
            rows={3}
            className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
          />
        </div>
      </div>

      {evaluateMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {evaluateMutation.error?.message}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={evaluateMutation.isPending}
          className="bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
        >
          {evaluateMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
        </Button>
      </div>
    </form>
  )
}

// ─── Results View ─────────────────────────────────────────────────────────────

interface ResultsViewProps {
  participantId: string
  cycleName: string
}

function ResultsView({ participantId, cycleName }: ResultsViewProps) {
  const resultsQuery = trpc.team.review360.getResults.useQuery(
    { participantId },
    { refetchOnWindowFocus: false }
  )

  const participant = resultsQuery.data

  if (resultsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (!participant) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Resultados não disponíveis.
      </p>
    )
  }

  // Build radar data from scores
  const selfReview = (participant.selfReview as any)?.competencies ?? {}
  const peerReviews = (participant.peerReviews as any)?.competencies ?? {}
  const managerReview = (participant.managerReview as any)?.competencies ?? {}
  const competencies = (participant.cycle?.competencies as string[]) ?? ALL_COMPETENCIES

  const radarData = competencies.map((key) => {
    const label = LEGAL_COMPETENCY_LABELS[key]?.label ?? key
    return {
      competency: label.length > 12 ? label.slice(0, 12) + "…" : label,
      self: selfReview[key]?.score ?? undefined,
      average: peerReviews[key]?.score ?? undefined,
      manager: managerReview[key]?.score ?? undefined,
    }
  })

  const strengths: string[] = [
    ...(participant.strengthsSummary ? [participant.strengthsSummary as string] : []),
    ...((selfReview as any)?.mainStrength ? [(selfReview as any).mainStrength] : []),
  ].slice(0, 3)

  const devAreas: string[] = [
    ...(participant.developmentAreas ? [participant.developmentAreas as string] : []),
    ...((selfReview as any)?.mainOpportunity ? [(selfReview as any).mainOpportunity] : []),
  ].slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Radar chart */}
      <div>
        <h4 className="text-sm font-semibold text-[#374151] mb-3">
          Radar de Competências — {cycleName}
        </h4>
        {radarData.length > 0 ? (
          <RadarCompetency data={radarData} showLegend />
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">
            Dados insuficientes para o gráfico radar.
          </p>
        )}
      </div>

      {/* Competency table */}
      <div>
        <h4 className="text-sm font-semibold text-[#374151] mb-3">
          Notas por Competência
        </h4>
        <div className="rounded-lg border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-gray-500">Competência</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-center">Auto</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-center">Pares</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-center">Gestor</th>
              </tr>
            </thead>
            <tbody>
              {competencies.map((key, idx) => {
                const cfg = LEGAL_COMPETENCY_LABELS[key]
                const self = selfReview[key]?.score
                const peer = peerReviews[key]?.score
                const mgr = managerReview[key]?.score
                return (
                  <tr
                    key={key}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}
                  >
                    <td className="px-3 py-2 text-xs font-medium text-[#374151]">
                      {cfg?.label ?? key}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {self != null ? (
                        <span className="font-bold" style={{ color: "#C9A84C" }}>{self}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {peer != null ? (
                        <span className="font-bold text-[#374151]">{peer}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {mgr != null ? (
                        <span className="font-bold text-blue-600">{mgr}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strengths & development */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
          <h5 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
            Top 3 Pontos Fortes
          </h5>
          {strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">Sem dados disponíveis.</p>
          )}
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-4">
          <h5 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Top 3 Oportunidades
          </h5>
          {devAreas.length > 0 ? (
            <ul className="space-y-1.5">
              {devAreas.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-amber-500 font-bold shrink-0">{i + 1}.</span>
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400">Sem dados disponíveis.</p>
          )}
        </div>
      </div>

      {/* AI narrative */}
      {participant.aiNarrative && (
        <div className="rounded-lg border border-[#C9A84C]/30 bg-amber-50/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#C9A84C] font-semibold text-xs uppercase tracking-wide">
              ✨ Narrativa Harvey (IA)
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {participant.aiNarrative as string}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── 9-Box Section ────────────────────────────────────────────────────────────

interface NineBoxSectionProps {
  cycleId: string
}

function NineBoxSection({ cycleId }: NineBoxSectionProps) {
  const nineBoxQuery = trpc.team.review360.nineBox.useQuery(
    { cycleId },
    { refetchOnWindowFocus: false }
  )

  if (nineBoxQuery.isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  const raw = nineBoxQuery.data ?? []

  // Map server data to NineBoxGrid member format
  const members = raw
    .filter((p) => p.performanceScore != null && p.potentialScore != null)
    .map((p) => {
      const perf = p.performanceScore!
      const pot = p.potentialScore!
      // Server stores 1-5; NineBoxGrid expects 1-3 (low/med/high)
      const mapTo3 = (v: number) => (v <= 1.7 ? 1 : v <= 3.3 ? 2 : 3)
      return {
        id: p.teamMemberId,
        name: p.name,
        avatarUrl: p.avatarUrl ?? undefined,
        performance: mapTo3(perf),
        potential: mapTo3(pot),
        position: p.nineBoxPosition ?? "",
      }
    })

  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center">
        <p className="text-sm text-gray-400">
          Nenhum participante com performance e potencial mapeados ainda.
        </p>
      </div>
    )
  }

  return <NineBoxGrid members={members} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Equipe360Tab() {
  const [showNewCycleDialog, setShowNewCycleDialog] = React.useState(false)
  const [selectedCycleId, setSelectedCycleId] = React.useState<string | null>(null)
  const [selectedParticipantId, setSelectedParticipantId] = React.useState<string | null>(null)
  const [activeView, setActiveView] = React.useState<"list" | "evaluate" | "results" | "nineBox">("list")

  // ── tRPC queries ────────────────────────────────────────────────────────────
  const cyclesQuery = trpc.team.review360.listCycles.useQuery(
    { page: 1, perPage: 20 },
    { refetchOnWindowFocus: false }
  )

  const selectedCycleQuery = trpc.team.review360.getCycle.useQuery(
    { id: selectedCycleId! },
    { enabled: !!selectedCycleId, refetchOnWindowFocus: false }
  )

  const membersQuery = trpc.team.members.list.useQuery(
    { page: 1, perPage: 100 },
    { refetchOnWindowFocus: false }
  )

  // ── Derived state ────────────────────────────────────────────────────────────
  const cycles = cyclesQuery.data?.items ?? []
  const members = membersQuery.data?.items ?? []
  const selectedCycle = selectedCycleQuery.data
  const competenciesToEval = (selectedCycle?.competencies as string[]) ?? ALL_COMPETENCIES

  function openCycle(id: string, status: string) {
    setSelectedCycleId(id)
    if (status === "COLLECTING") {
      setActiveView("evaluate")
    } else if (status === "RELEASED" || status === "CLOSED_360") {
      setActiveView("results")
    } else {
      setActiveView("list")
    }
    setSelectedParticipantId(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#374151]">Avaliação 360°</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ciclos de avaliação por competências com visão radar, nine-box e IA narrativa.
          </p>
        </div>
        <Button
          onClick={() => setShowNewCycleDialog(true)}
          className="bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
        >
          + Novo Ciclo
        </Button>
      </div>

      {/* ── Cycles list ─────────────────────────────────────────────────────── */}
      {cyclesQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : cycles.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-gray-400">Nenhum ciclo de avaliação criado.</p>
            <p className="text-xs text-gray-300 mt-1">
              Clique em "Novo Ciclo" para iniciar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Card
              key={cycle.id}
              className={cn(
                "shadow-sm border-gray-100 cursor-pointer transition-shadow hover:shadow-md",
                selectedCycleId === cycle.id && "ring-2 ring-[#C9A84C]/50"
              )}
              onClick={() => openCycle(cycle.id, cycle.status)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-[#374151]">{cycle.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Período: {cycle.period} · {cycle._count?.participants ?? 0} participante(s)
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(cycle.startDate).toLocaleDateString("pt-BR")} →{" "}
                      {new Date(cycle.endDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CycleStatusBadge status={cycle.status} />
                    {(cycle.status === "COLLECTING" || cycle.status === "RELEASED" || cycle.status === "CLOSED_360") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          openCycle(cycle.id, cycle.status)
                        }}
                      >
                        {cycle.status === "COLLECTING" ? "Avaliar" : "Ver resultados"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Evaluate / Results panel ──────────────────────────────────────── */}
      {selectedCycleId && selectedCycle && (
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold text-[#374151]">
                {selectedCycle.name}
              </CardTitle>
              <div className="flex gap-2">
                {selectedCycle.status === "COLLECTING" && (
                  <Button
                    size="sm"
                    variant={activeView === "evaluate" ? "default" : "outline"}
                    className={cn(
                      "text-xs h-7",
                      activeView === "evaluate"
                        ? "bg-[#C9A84C] hover:bg-[#b8973e] text-white"
                        : ""
                    )}
                    onClick={() => setActiveView("evaluate")}
                  >
                    Formulário de Avaliação
                  </Button>
                )}
                {(selectedCycle.status === "RELEASED" || selectedCycle.status === "CLOSED_360") && (
                  <>
                    <Button
                      size="sm"
                      variant={activeView === "results" ? "default" : "outline"}
                      className={cn(
                        "text-xs h-7",
                        activeView === "results"
                          ? "bg-[#C9A84C] hover:bg-[#b8973e] text-white"
                          : ""
                      )}
                      onClick={() => setActiveView("results")}
                    >
                      Resultados
                    </Button>
                    <Button
                      size="sm"
                      variant={activeView === "nineBox" ? "default" : "outline"}
                      className={cn(
                        "text-xs h-7",
                        activeView === "nineBox"
                          ? "bg-[#C9A84C] hover:bg-[#b8973e] text-white"
                          : ""
                      )}
                      onClick={() => setActiveView("nineBox")}
                    >
                      Nine-Box Grid
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>

            {/* Evaluation form */}
            {activeView === "evaluate" && selectedCycle.status === "COLLECTING" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#374151]">
                    Quem você está avaliando?
                  </Label>
                  <Select
                    value={selectedParticipantId ?? ""}
                    onValueChange={setSelectedParticipantId}
                  >
                    <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                      <SelectValue placeholder="Selecione o participante" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCycle.participants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.teamMember?.user?.name ?? p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedParticipantId && (
                  <EvaluationForm
                    participantId={selectedParticipantId}
                    competencies={competenciesToEval}
                    reviewType="peer"
                    onSuccess={() => {
                      setSelectedParticipantId(null)
                      cyclesQuery.refetch()
                    }}
                  />
                )}
              </div>
            )}

            {/* Results */}
            {activeView === "results" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#374151]">
                    Ver resultados de:
                  </Label>
                  <Select
                    value={selectedParticipantId ?? ""}
                    onValueChange={setSelectedParticipantId}
                  >
                    <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                      <SelectValue placeholder="Selecione o participante" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCycle.participants.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.teamMember?.user?.name ?? p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedParticipantId && (
                  <ResultsView
                    participantId={selectedParticipantId}
                    cycleName={selectedCycle.name}
                  />
                )}
              </div>
            )}

            {/* Nine-Box */}
            {activeView === "nineBox" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2">
                  <p className="text-xs text-[#374151] font-medium">
                    O nine-box exibe apenas participantes com performance e potencial mapeados pelos sócios após a coleta.
                  </p>
                </div>
                <NineBoxSection cycleId={selectedCycleId} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── New cycle dialog ─────────────────────────────────────────────── */}
      <NewCycleDialog
        open={showNewCycleDialog}
        onClose={() => setShowNewCycleDialog(false)}
        members={members}
        onSuccess={() => cyclesQuery.refetch()}
      />
    </div>
  )
}
