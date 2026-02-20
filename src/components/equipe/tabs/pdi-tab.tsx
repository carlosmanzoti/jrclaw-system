"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { CompetencyBadge } from "@/components/equipe/CompetencyBadge"
import { ProgressRing } from "@/components/equipe/ProgressRing"
import {
  LEGAL_COMPETENCY_LABELS,
  TEAM_ROLE_LABELS,
} from "@/lib/constants/competencies"
import {
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  BookOpen,
  Users,
  Wrench,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  ClipboardList,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA"

interface ActionFormData {
  experiencial_descricao: string
  experiencial_prazo: string
  social_descricao: string
  social_prazo: string
  formal_descricao: string
  formal_prazo: string
}

interface GoalFormData {
  competency: string
  current_level: number
  target_level: number
  actions: ActionFormData
}

interface PDIFormData {
  teamMemberId: string
  title: string
  period: string
  period_start: string
  period_end: string
  currentRole: string
  current_role: string
  target_role: string
  goals: GoalFormData[]
}

interface GROWFormData {
  goal: string
  goal_score: number
  reality: string
  reality_score: number
  options: string
  options_score: number
  will: string
  will_score: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_STATUS_CONFIG: Record<
  ActionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDENTE: {
    label: "Pendente",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <Circle className="size-3" />,
  },
  EM_ANDAMENTO: {
    label: "Em Andamento",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Loader2 className="size-3 animate-spin" />,
  },
  CONCLUIDA: {
    label: "Concluída",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="size-3" />,
  },
  CANCELADA: {
    label: "Cancelada",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: <XCircle className="size-3" />,
  },
}

const PDI_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  RASCUNHO: { label: "Rascunho", color: "bg-gray-100 text-gray-600 border-gray-200" },
  ATIVO: { label: "Ativo", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  EM_REVISAO: { label: "Em Revisão", color: "bg-amber-100 text-amber-700 border-amber-200" },
  CONCLUIDO: { label: "Concluído", color: "bg-blue-100 text-blue-700 border-blue-200" },
  CANCELADO: { label: "Cancelado", color: "bg-red-100 text-red-600 border-red-200" },
}

const ROLES = Object.entries(TEAM_ROLE_LABELS)
const COMPETENCIES = Object.keys(LEGAL_COMPETENCY_LABELS)
const LEVELS = [1, 2, 3, 4, 5]

// ─── Empty goal factory ───────────────────────────────────────────────────────

function emptyGoal(): GoalFormData {
  return {
    competency: "",
    current_level: 1,
    target_level: 3,
    actions: {
      experiencial_descricao: "",
      experiencial_prazo: "",
      social_descricao: "",
      social_prazo: "",
      formal_descricao: "",
      formal_prazo: "",
    },
  }
}

// ─── New PDI Dialog ───────────────────────────────────────────────────────────

function NovoPDIDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const utils = trpc.useUtils()

  const { data: membersData } = trpc.team.members.list.useQuery({ page: 1, perPage: 200 })

  const [form, setForm] = useState<PDIFormData>({
    teamMemberId: "",
    title: "",
    period: "",
    period_start: "",
    period_end: "",
    currentRole: "",
    current_role: "",
    target_role: "",
    goals: [emptyGoal()],
  })

  const createMutation = trpc.team.pdi.create.useMutation({
    onSuccess: () => {
      utils.team.pdi.list.invalidate(undefined)
      onClose()
      setForm({
        teamMemberId: "",
        title: "",
        period: "",
        period_start: "",
        period_end: "",
        currentRole: "",
        current_role: "",
        target_role: "",
        goals: [emptyGoal()],
      })
    },
  })

  function updateGoal(index: number, patch: Partial<GoalFormData>) {
    setForm((prev) => {
      const updated = [...prev.goals]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, goals: updated }
    })
  }

  function updateAction(index: number, patch: Partial<ActionFormData>) {
    setForm((prev) => {
      const updated = [...prev.goals]
      updated[index] = {
        ...updated[index],
        actions: { ...updated[index].actions, ...patch },
      }
      return { ...prev, goals: updated }
    })
  }

  function addGoal() {
    setForm((prev) => ({ ...prev, goals: [...prev.goals, emptyGoal()] }))
  }

  function removeGoal(index: number) {
    setForm((prev) => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }))
  }

  function handleSubmit() {
    const period = form.period_start && form.period_end
      ? `${form.period_start} — ${form.period_end}`
      : form.period_start || form.period_end || ""
    createMutation.mutate({
      teamMemberId: form.teamMemberId,
      title: form.title,
      period,
      currentRole: (form.current_role || form.currentRole) as "SOCIO" | "ADVOGADO_SENIOR" | "ADVOGADO_PLENO" | "ADVOGADO_JUNIOR" | "ESTAGIARIO" | "PARALEGAL" | "ADMINISTRATIVO",
      targetRole: (form.target_role || undefined) as "SOCIO" | "ADVOGADO_SENIOR" | "ADVOGADO_PLENO" | "ADVOGADO_JUNIOR" | "ESTAGIARIO" | "PARALEGAL" | "ADMINISTRATIVO" | undefined,
      goals: form.goals,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Plano de Desenvolvimento Individual</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team member selector */}
          <div className="space-y-1.5">
            <Label>Membro da equipe</Label>
            <Select
              value={form.teamMemberId}
              onValueChange={(v) => setForm((p) => ({ ...p, teamMemberId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                {(membersData?.items ?? []).map((m: Record<string, unknown>) => (
                  <SelectItem key={String(m.id)} value={String(m.id)}>
                    {String((m as any).user?.name ?? m.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Título do PDI</Label>
              <Input
                placeholder="ex: PDI 2026 — Desenvolvimento em Negociação"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Início do período</Label>
              <Input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm((p) => ({ ...p, period_start: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim do período</Label>
              <Input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm((p) => ({ ...p, period_end: e.target.value }))}
              />
            </div>
          </div>

          {/* Career path */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#374151]">Trilha de Carreira</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cargo atual</Label>
                <Select
                  value={form.current_role}
                  onValueChange={(v) => setForm((p) => ({ ...p, current_role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cargo alvo</Label>
                <Select
                  value={form.target_role}
                  onValueChange={(v) => setForm((p) => ({ ...p, target_role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Career path visualization */}
            {form.current_role && form.target_role && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                <span className="text-sm font-medium text-amber-800">
                  {TEAM_ROLE_LABELS[form.current_role] ?? form.current_role}
                </span>
                <ArrowRight className="size-4 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-amber-800">
                  {TEAM_ROLE_LABELS[form.target_role] ?? form.target_role}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Development goals */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#374151]">Metas de Desenvolvimento</p>
              <Button variant="outline" size="sm" onClick={addGoal}>
                <Plus className="size-3.5 mr-1" /> Adicionar Meta
              </Button>
            </div>

            {form.goals.map((goal, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Meta {idx + 1}
                  </p>
                  {form.goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGoal(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Competência</Label>
                    <Select
                      value={goal.competency}
                      onValueChange={(v) => updateGoal(idx, { competency: v })}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPETENCIES.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {LEGAL_COMPETENCY_LABELS[c].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nível atual (1–5)</Label>
                    <Select
                      value={String(goal.current_level)}
                      onValueChange={(v) => updateGoal(idx, { current_level: Number(v) })}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={String(l)} className="text-xs">
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nível alvo (1–5)</Label>
                    <Select
                      value={String(goal.target_level)}
                      onValueChange={(v) => updateGoal(idx, { target_level: Number(v) })}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={String(l)} className="text-xs">
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 70-20-10 Actions */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-600">
                    Ações — Modelo 70-20-10
                  </p>

                  {/* 70% Experiencial */}
                  <div className="rounded-md bg-white border border-orange-100 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="size-3 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-700">
                        Experiencial (70%) — Aprender fazendo
                      </span>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Descrição da ação prática..."
                      className="text-xs resize-none"
                      value={goal.actions.experiencial_descricao}
                      onChange={(e) =>
                        updateAction(idx, { experiencial_descricao: e.target.value })
                      }
                    />
                    <Input
                      type="date"
                      className="text-xs h-7"
                      value={goal.actions.experiencial_prazo}
                      onChange={(e) =>
                        updateAction(idx, { experiencial_prazo: e.target.value })
                      }
                    />
                  </div>

                  {/* 20% Social */}
                  <div className="rounded-md bg-white border border-blue-100 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3 text-blue-500" />
                      <span className="text-xs font-semibold text-blue-700">
                        Social (20%) — Aprender com outros
                      </span>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Mentoria, shadowing, feedback, etc..."
                      className="text-xs resize-none"
                      value={goal.actions.social_descricao}
                      onChange={(e) =>
                        updateAction(idx, { social_descricao: e.target.value })
                      }
                    />
                    <Input
                      type="date"
                      className="text-xs h-7"
                      value={goal.actions.social_prazo}
                      onChange={(e) =>
                        updateAction(idx, { social_prazo: e.target.value })
                      }
                    />
                  </div>

                  {/* 10% Formal */}
                  <div className="rounded-md bg-white border border-purple-100 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="size-3 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700">
                        Formal (10%) — Cursos, leituras, treinamentos
                      </span>
                    </div>
                    <Textarea
                      rows={2}
                      placeholder="Curso, livro, artigo, workshop..."
                      className="text-xs resize-none"
                      value={goal.actions.formal_descricao}
                      onChange={(e) =>
                        updateAction(idx, { formal_descricao: e.target.value })
                      }
                    />
                    <Input
                      type="date"
                      className="text-xs h-7"
                      value={goal.actions.formal_prazo}
                      onChange={(e) =>
                        updateAction(idx, { formal_prazo: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            Criar PDI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── GROW Coaching Form ───────────────────────────────────────────────────────

function GROWForm({ pdiId }: { pdiId: string }) {
  const [grow, setGrow] = useState<GROWFormData>({
    goal: "",
    goal_score: 5,
    reality: "",
    reality_score: 5,
    options: "",
    options_score: 5,
    will: "",
    will_score: 5,
  })

  const sections: {
    key: keyof GROWFormData
    scoreKey: keyof GROWFormData
    label: string
    placeholder: string
    color: string
  }[] = [
    {
      key: "goal",
      scoreKey: "goal_score",
      label: "Goal — Objetivo",
      placeholder: "O que você quer alcançar com este PDI?",
      color: "border-l-blue-400",
    },
    {
      key: "reality",
      scoreKey: "reality_score",
      label: "Reality — Realidade atual",
      placeholder: "Qual é a situação atual? O que já está funcionando?",
      color: "border-l-amber-400",
    },
    {
      key: "options",
      scoreKey: "options_score",
      label: "Options — Opções",
      placeholder: "Quais alternativas existem para alcançar o objetivo?",
      color: "border-l-green-400",
    },
    {
      key: "will",
      scoreKey: "will_score",
      label: "Will — Compromisso",
      placeholder: "Que compromisso você assume? Qual é o próximo passo concreto?",
      color: "border-l-purple-400",
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-[#374151]">Sessão de Coaching GROW</p>
      <div className="space-y-3">
        {sections.map((s) => (
          <div
            key={s.key}
            className={`rounded-md border border-gray-200 border-l-4 ${s.color} p-3 space-y-2`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#374151]">{s.label}</p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Score:</span>
                <Select
                  value={String(grow[s.scoreKey])}
                  onValueChange={(v) =>
                    setGrow((p) => ({ ...p, [s.scoreKey]: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-6 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-xs">
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea
              rows={2}
              className="text-xs resize-none"
              placeholder={s.placeholder}
              value={grow[s.key] as string}
              onChange={(e) => setGrow((p) => ({ ...p, [s.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({
  pdiId,
  type,
}: {
  pdiId: string
  type: "MID" | "FINAL"
}) {
  const utils = trpc.useUtils()
  const [notes, setNotes] = useState("")
  const [score, setScore] = useState(5)

  const reviewMutation = trpc.team.pdi.review.useMutation({
    onSuccess: () => {
      utils.team.pdi.list.invalidate(undefined)
      setNotes("")
    },
  })

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <p className="text-sm font-semibold text-[#374151]">
        {type === "MID" ? "Revisão de Meio de Período" : "Revisão Final"}
      </p>
      <div className="space-y-2">
        <Label className="text-xs">Notas da revisão</Label>
        <Textarea
          rows={3}
          placeholder="Observações, conquistas, ajustes necessários..."
          className="text-xs resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <Label className="text-xs">Score geral (1–10):</Label>
        <Select value={String(score)} onValueChange={(v) => setScore(Number(v))}>
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="ml-auto bg-[#C9A84C] hover:bg-[#B8963F] text-white text-xs h-7"
          disabled={!notes || reviewMutation.isPending}
          onClick={() =>
            reviewMutation.mutate({ id: pdiId, reviewType: type === "MID" ? "mid" : "final", reviewData: { notes, score } })
          }
        >
          {reviewMutation.isPending ? (
            <Loader2 className="size-3 animate-spin mr-1" />
          ) : null}
          Registrar Revisão
        </Button>
      </div>
    </div>
  )
}

// ─── PDI Card ─────────────────────────────────────────────────────────────────

function PDICard({ pdi }: { pdi: Record<string, unknown> }) {
  const utils = trpc.useUtils()
  const [expanded, setExpanded] = useState(false)
  const [harveyLoading, setHarveyLoading] = useState(false)
  const [harveySuggestion, setHarveySuggestion] = useState<string | null>(null)

  const updateActionMutation = trpc.team.pdi.updateGoalAction.useMutation({
    onSuccess: () => utils.team.pdi.list.invalidate(undefined),
  })

  const statusKey = (pdi.status as string) ?? "RASCUNHO"
  const statusConfig =
    PDI_STATUS_CONFIG[statusKey] ?? {
      label: statusKey,
      color: "bg-gray-100 text-gray-600 border-gray-200",
    }

  const goals = (pdi.goals as unknown[]) ?? []
  const completedActions = goals.reduce((acc: number, g: unknown) => {
    const goal = g as Record<string, unknown>
    const actions = (goal.actions as unknown[]) ?? []
    return acc + actions.filter((a: unknown) => (a as Record<string, unknown>).status === "CONCLUIDA").length
  }, 0)
  const totalActions = goals.reduce((acc: number, g: unknown) => {
    const goal = g as Record<string, unknown>
    return acc + ((goal.actions as unknown[]) ?? []).length
  }, 0)
  const progress = totalActions > 0 ? completedActions / totalActions : 0

  async function handleHarveySuggest() {
    setHarveyLoading(true)
    setHarveySuggestion(null)
    try {
      const res = await fetch("/api/ai/pdi-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdi_id: pdi.id }),
      })
      const data = await res.json()
      setHarveySuggestion(data.suggestion ?? "Sem sugestão disponível.")
    } catch {
      setHarveySuggestion("Erro ao obter sugestão. Tente novamente.")
    } finally {
      setHarveyLoading(false)
    }
  }

  return (
    <Card className="shadow-sm border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#374151] truncate">
                {pdi.title as string}
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                {String(pdi.member_name ?? "")}
              </span>
              {!!(pdi.current_role && pdi.target_role) && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {TEAM_ROLE_LABELS[pdi.current_role as string] ?? (pdi.current_role as string)}
                    <ArrowRight className="size-3" />
                    {TEAM_ROLE_LABELS[pdi.target_role as string] ?? (pdi.target_role as string)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ProgressRing progress={progress} size={52} strokeWidth={5} label="PDI" />
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={handleHarveySuggest}
              disabled={harveyLoading}
            >
              {harveyLoading ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Sparkles className="size-3 mr-1 text-amber-500" />
              )}
              Harvey
            </Button>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {completedActions}/{totalActions} ações concluídas
            </span>
            <span className="text-xs font-medium text-[#374151]">
              {Math.round(progress * 100)}%
            </span>
          </div>
          <Progress value={progress * 100} className="h-1.5" />
        </div>
      </CardHeader>

      {/* Harvey suggestion */}
      {harveySuggestion && (
        <div className="mx-4 mb-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
            <Sparkles className="size-3" /> Harvey — Sugestão de PDI
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">{harveySuggestion}</p>
        </div>
      )}

      {/* Collapsible detail */}
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1 pb-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3" /> Recolher detalhes
              </>
            ) : (
              <>
                <ChevronDown className="size-3" /> Expandir metas e ações
              </>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-5 border-t border-gray-100">
            {/* Goals */}
            {(goals as Record<string, unknown>[]).map((goal, gIdx) => {
              const actions = (goal.actions as Record<string, unknown>[]) ?? []
              const goalCompleted = actions.filter(
                (a) => a.status === "CONCLUIDA"
              ).length
              const goalProgress =
                actions.length > 0 ? goalCompleted / actions.length : 0

              return (
                <div key={gIdx} className="space-y-2 pt-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    {!!goal.competency && (
                      <CompetencyBadge competency={goal.competency as string} />
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-gray-500">
                        Nível {String(goal.current_level)} →{" "}
                        {String(goal.target_level)}
                      </span>
                    </div>
                  </div>

                  {/* Goal progress bar */}
                  <div className="space-y-1">
                    <Progress value={goalProgress * 100} className="h-1" />
                    <p className="text-xs text-gray-400">
                      {goalCompleted}/{actions.length} ações concluídas
                    </p>
                  </div>

                  {/* Actions */}
                  {actions.map((action, aIdx) => {
                    const status = (action.status as ActionStatus) ?? "PENDENTE"
                    const cfg =
                      ACTION_STATUS_CONFIG[status] ??
                      ACTION_STATUS_CONFIG["PENDENTE"]
                    const nextStatuses: ActionStatus[] = [
                      "PENDENTE",
                      "EM_ANDAMENTO",
                      "CONCLUIDA",
                      "CANCELADA",
                    ]

                    return (
                      <div
                        key={aIdx}
                        className="flex items-start gap-3 rounded-md bg-gray-50 border border-gray-100 p-2.5"
                      >
                        <div className="mt-0.5 shrink-0">
                          {action.type === "EXPERIENCIAL" && (
                            <Wrench className="size-3.5 text-orange-500" />
                          )}
                          {action.type === "SOCIAL" && (
                            <Users className="size-3.5 text-blue-500" />
                          )}
                          {action.type === "FORMAL" && (
                            <BookOpen className="size-3.5 text-purple-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-snug">
                            {String(action.description ?? "")}
                          </p>
                          {!!action.deadline && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Prazo:{" "}
                              {new Date(
                                action.deadline as string
                              ).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <Select
                          value={status}
                          onValueChange={(v) =>
                            updateActionMutation.mutate({
                              id: pdi.id as string,
                              goalIndex: gIdx,
                              actionIndex: aIdx,
                              done: v === "CONCLUIDA",
                              ...(v === "CONCLUIDA" ? { completedAt: new Date() } : {}),
                            })
                          }
                        >
                          <SelectTrigger
                            className={`h-6 w-28 text-[10px] rounded-full border ${cfg.color}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {nextStatuses.map((s) => (
                              <SelectItem
                                key={s}
                                value={s}
                                className="text-xs"
                              >
                                {ACTION_STATUS_CONFIG[s].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            <Separator />
            <GROWForm pdiId={pdi.id as string} />
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <ReviewSection pdiId={pdi.id as string} type="MID" />
              <ReviewSection pdiId={pdi.id as string} type="FINAL" />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function EquipePDITab() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: pdis, isLoading } = trpc.team.pdi.list.useQuery({ page: 1, perPage: 50 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#374151]">
            Plano de Desenvolvimento Individual
          </h2>
          <p className="text-sm text-gray-500">
            Trilhas de carreira, metas de competência e acompanhamento 70-20-10
          </p>
        </div>
        <Button
          className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4 mr-2" /> Novo PDI
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : !pdis || pdis.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <ClipboardList className="size-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            Nenhum PDI cadastrado
          </p>
          <p className="text-sm text-gray-400">
            Crie o primeiro Plano de Desenvolvimento Individual da equipe.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5 mr-1" /> Criar PDI
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {(pdis.items as unknown as Record<string, unknown>[]).map((pdi) => (
            <PDICard key={pdi.id as string} pdi={pdi} />
          ))}
        </div>
      )}

      <NovoPDIDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
