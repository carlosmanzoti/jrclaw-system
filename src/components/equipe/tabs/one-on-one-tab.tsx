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
import { Switch } from "@/components/ui/switch"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { MoodSelector } from "@/components/equipe/MoodSelector"
import { OKRProgressBar } from "@/components/equipe/OKRProgressBar"
import { TimelineVertical } from "@/components/equipe/TimelineVertical"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type OneOnOneStatus =
  | "SCHEDULED"
  | "IN_PROGRESS_1ON1"
  | "COMPLETED_1ON1"
  | "CANCELLED_1ON1"
  | "RESCHEDULED"

type Frequency = "WEEKLY_1ON1" | "BIWEEKLY_1ON1" | "MONTHLY_1ON1"

interface ActionItem {
  id: string
  description: string
  done: boolean
  dueDate?: string
  assigneeId?: string
}

interface AgendaItem {
  id: string
  text: string
  checked: boolean
}

interface ScheduleForm {
  subordinateId: string
  scheduledAt: string
  duration: number
  location: string
  recurring: boolean
  frequency: Frequency
}

interface ConductState {
  mood: number | null
  energy: number
  workload: number
  personalCheckIn: string
  agenda: AgendaItem[]
  sbiSituation: string
  sbiBehavior: string
  sbiImpact: string
  actionItems: ActionItem[]
  notes: string
  okrCheckIn: string
}

const STATUS_CONFIG: Record<OneOnOneStatus, { label: string; color: string }> = {
  SCHEDULED: { label: "Agendado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  IN_PROGRESS_1ON1: { label: "Em andamento", color: "bg-amber-100 text-amber-700 border-amber-200" },
  COMPLETED_1ON1: { label: "Concluído", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED_1ON1: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200" },
  RESCHEDULED: { label: "Reagendado", color: "bg-gray-100 text-gray-600 border-gray-200" },
}

const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY_1ON1: "Semanal",
  BIWEEKLY_1ON1: "Quinzenal",
  MONTHLY_1ON1: "Mensal",
}

const SLIDER_LABELS: Record<string, Record<number, string>> = {
  energy: { 1: "Esgotado", 2: "Cansado", 3: "Normal", 4: "Bem-disposto", 5: "Com muita energia" },
  workload: { 1: "Muito leve", 2: "Leve", 3: "Adequado", 4: "Pesado", 5: "Excessivo" },
}

const INITIAL_SCHEDULE: ScheduleForm = {
  subordinateId: "",
  scheduledAt: "",
  duration: 45,
  location: "",
  recurring: true,
  frequency: "BIWEEKLY_1ON1",
}

const INITIAL_CONDUCT: ConductState = {
  mood: null,
  energy: 3,
  workload: 3,
  personalCheckIn: "",
  agenda: [
    { id: "1", text: "Revisão da semana / quinzena", checked: false },
    { id: "2", text: "Atualizações dos projetos", checked: false },
    { id: "3", text: "Desafios e obstáculos", checked: false },
    { id: "4", text: "Plano para próximo período", checked: false },
  ],
  sbiSituation: "",
  sbiBehavior: "",
  sbiImpact: "",
  actionItems: [],
  notes: "",
  okrCheckIn: "",
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as OneOnOneStatus] ?? {
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

// ─── Timer ────────────────────────────────────────────────────────────────────

interface TimerProps {
  totalSeconds: number
}

function MeetingTimer({ totalSeconds }: TimerProps) {
  const [remaining, setRemaining] = React.useState(totalSeconds)
  const [running, setRunning] = React.useState(false)

  React.useEffect(() => {
    if (!running || remaining <= 0) return
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [running, remaining])

  const pct = Math.round(((totalSeconds - remaining) / totalSeconds) * 100)
  const isLow = remaining < totalSeconds * 0.2

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="relative h-16 w-16 shrink-0">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#f3f4f6" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            stroke={isLow ? "#EF4444" : "#C9A84C"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 28}`}
            strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-xs font-bold", isLow ? "text-red-600" : "text-[#374151]")}>
          {pct}%
        </span>
      </div>
      <div className="flex-1">
        <p className={cn("text-3xl font-mono font-bold tracking-tight", isLow ? "text-red-600" : "text-[#374151]")}>
          {formatDuration(remaining)}
        </p>
        <p className="text-xs text-gray-400">
          {isLow ? "Tempo quase esgotado!" : "restantes"}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRunning((r) => !r)}
          className={cn(
            "text-xs font-semibold",
            running ? "border-amber-300 text-amber-600 hover:bg-amber-50" : "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
          )}
        >
          {running ? "Pausar" : "Iniciar"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setRemaining(totalSeconds); setRunning(false) }}
          className="text-xs text-gray-400"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

// ─── Expandable section wrapper ───────────────────────────────────────────────

function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string
  icon: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 text-left transition-colors hover:bg-gray-100/60"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[#374151]">
            <span role="img" aria-hidden="true">{icon}</span>
            {title}
          </span>
          <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-b-lg border border-t-0 border-gray-100 px-4 py-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ─── Schedule Dialog ──────────────────────────────────────────────────────────

interface ScheduleDialogProps {
  open: boolean
  onClose: () => void
  members: { id: string; user: { name: string } | null }[]
  onSuccess: () => void
}

function ScheduleDialog({ open, onClose, members, onSuccess }: ScheduleDialogProps) {
  const [form, setForm] = React.useState<ScheduleForm>(INITIAL_SCHEDULE)

  const createMutation = trpc.team.oneOnOne.create.useMutation({
    onSuccess: () => {
      setForm(INITIAL_SCHEDULE)
      onSuccess()
      onClose()
    },
  })

  function setField<K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subordinateId || !form.scheduledAt) return
    // Use first member id as managerId (current user's team member record)
    createMutation.mutate({
      managerId: members[0]?.id ?? "",
      subordinateId: form.subordinateId,
      scheduledAt: form.scheduledAt,
      duration: form.duration,
      location: form.location || undefined,
      recurring: form.recurring,
      frequency: form.frequency,
    })
  }

  const isValid = !!form.subordinateId && !!form.scheduledAt

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar 1:1</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Colaborador *</Label>
            <Select
              value={form.subordinateId}
              onValueChange={(v) => setField("subordinateId", v)}
            >
              <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                <SelectValue placeholder="Selecione o colaborador" />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Data e hora *</Label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setField("scheduledAt", e.target.value)}
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Duração (min)</Label>
              <Input
                type="number"
                min={15}
                max={180}
                step={15}
                value={form.duration}
                onChange={(e) => setField("duration", Number(e.target.value))}
                className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Local / link</Label>
            <Input
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="Sala de reunião, Teams, etc."
              className="focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
            />
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5">
            <Switch
              id="recurring"
              checked={form.recurring}
              onCheckedChange={(v) => setField("recurring", v)}
            />
            <Label htmlFor="recurring" className="text-sm cursor-pointer">
              Recorrente
            </Label>
          </div>

          {form.recurring && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Frequência</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setField("frequency", v as Frequency)}
              >
                <SelectTrigger className="focus:ring-[#C9A84C]/50 focus:border-[#C9A84C]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(FREQUENCY_LABELS) as [Frequency, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {createMutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createMutation.error?.message}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={(e) => handleSubmit(e as any)}
            disabled={!isValid || createMutation.isPending}
            className="bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
          >
            {createMutation.isPending ? "Agendando..." : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Conduct Panel ────────────────────────────────────────────────────────────

interface ConductPanelProps {
  oneOnOneId: string
  duration: number
  subordinateName: string
  onComplete: () => void
}

function ConductPanel({ oneOnOneId, duration, subordinateName, onComplete }: ConductPanelProps) {
  const [state, setState] = React.useState<ConductState>(INITIAL_CONDUCT)

  const completeMutation = trpc.team.oneOnOne.complete.useMutation({
    onSuccess: onComplete,
  })

  const updateMutation = trpc.team.oneOnOne.update.useMutation()

  // Periodic auto-save
  React.useEffect(() => {
    const id = setInterval(() => {
      updateMutation.mutate({
        id: oneOnOneId,
        status: "IN_PROGRESS_1ON1",
        moodScore: state.mood ?? undefined,
        energyLevel: state.energy,
        workloadPerception: state.workload,
        notes: state.notes,
        actionItems: state.actionItems,
        agenda: state.agenda,
      })
    }, 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, oneOnOneId])

  function set<K extends keyof ConductState>(key: K, value: ConductState[K]) {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  function toggleAgendaItem(id: string) {
    setState((prev) => ({
      ...prev,
      agenda: prev.agenda.map((a) => (a.id === id ? { ...a, checked: !a.checked } : a)),
    }))
  }

  function addAgendaItem(text: string) {
    if (!text.trim()) return
    setState((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { id: newId(), text, checked: false }],
    }))
  }

  function addActionItem() {
    setState((prev) => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        { id: newId(), description: "", done: false, dueDate: "" },
      ],
    }))
  }

  function updateActionItem(id: string, patch: Partial<ActionItem>) {
    setState((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }

  function removeActionItem(id: string) {
    setState((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((a) => a.id !== id),
    }))
  }

  function handleComplete() {
    completeMutation.mutate({
      id: oneOnOneId,
      notes: state.notes,
      actionItems: state.actionItems,
    })
  }

  const [newAgendaText, setNewAgendaText] = React.useState("")

  return (
    <div className="space-y-4">
      {/* Timer */}
      <MeetingTimer totalSeconds={duration * 60} />

      <div className="space-y-2">
        {/* 1. Check-in Pessoal */}
        <Section title={`Check-in Pessoal — ${subordinateName}`} icon="🧠" defaultOpen>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
                Como você está hoje?
              </Label>
              <MoodSelector
                value={state.mood}
                onChange={(v) => set("mood", v)}
                size="md"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
                  Nível de energia
                </Label>
                <span className="text-xs text-gray-400">
                  {SLIDER_LABELS.energy[state.energy]}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={state.energy}
                onChange={(e) => set("energy", Number(e.target.value))}
                className="w-full accent-[#C9A84C]"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Esgotado</span>
                <span>Com energia</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
                  Percepção de carga
                </Label>
                <span className="text-xs text-gray-400">
                  {SLIDER_LABELS.workload[state.workload]}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={state.workload}
                onChange={(e) => set("workload", Number(e.target.value))}
                className="w-full accent-[#C9A84C]"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Muito leve</span>
                <span>Excessiva</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
                Texto livre
              </Label>
              <Textarea
                value={state.personalCheckIn}
                onChange={(e) => set("personalCheckIn", e.target.value)}
                placeholder="Como a pessoa está se sentindo pessoal e profissionalmente..."
                rows={3}
                className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
          </div>
        </Section>

        {/* 2. Agenda do Colaborador */}
        <Section title="Agenda do Colaborador" icon="📋">
          <div className="space-y-3">
            {state.agenda.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <Checkbox
                  id={`ag-${item.id}`}
                  checked={item.checked}
                  onCheckedChange={() => toggleAgendaItem(item.id)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`ag-${item.id}`}
                  className={cn(
                    "text-sm cursor-pointer leading-snug",
                    item.checked && "line-through text-gray-400"
                  )}
                >
                  {item.text}
                </Label>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input
                value={newAgendaText}
                onChange={(e) => setNewAgendaText(e.target.value)}
                placeholder="Adicionar item à agenda..."
                className="text-sm h-8 focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addAgendaItem(newAgendaText)
                    setNewAgendaText("")
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => { addAgendaItem(newAgendaText); setNewAgendaText("") }}
                className="h-8 text-xs"
              >
                + Add
              </Button>
            </div>
          </div>
        </Section>

        {/* 3. Feedback (mini SBI) */}
        <Section title="Feedback Rápido (SBI)" icon="💬">
          <div className="space-y-3">
            <div className="rounded-lg border border-[#C9A84C]/30 bg-amber-50/40 px-3 py-2">
              <p className="text-xs text-[#374151] font-medium">
                Situação → Comportamento → Impacto
              </p>
            </div>
            {[
              { key: "sbiSituation" as const, icon: "📍", label: "Situação", placeholder: "Contexto específico..." },
              { key: "sbiBehavior" as const, icon: "👁️", label: "Comportamento", placeholder: "O que foi observado..." },
              { key: "sbiImpact" as const, icon: "⚡", label: "Impacto", placeholder: "Efeito gerado..." },
            ].map(({ key, icon, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <Label className="flex items-center gap-1 text-xs font-semibold text-[#374151]">
                  <span role="img" aria-hidden="true">{icon}</span>
                  {label}
                </Label>
                <Textarea
                  value={state[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  rows={2}
                  className="resize-none text-xs focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                />
              </div>
            ))}
          </div>
        </Section>

        {/* 4. Desenvolvimento: PDI + OKR */}
        <Section title="Desenvolvimento" icon="🚀">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#374151] mb-2 uppercase tracking-wide">
                Progresso PDI
              </p>
              <OKRProgressBar progress={0.55} showLabel />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#374151] uppercase tracking-wide">
                Check-in OKR
              </Label>
              <Textarea
                value={state.okrCheckIn}
                onChange={(e) => set("okrCheckIn", e.target.value)}
                placeholder="Status dos resultados-chave deste período..."
                rows={3}
                className="resize-none text-xs focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
              />
            </div>
          </div>
        </Section>

        {/* 5. Ações */}
        <Section title="Ações e Compromissos" icon="✅" defaultOpen>
          <div className="space-y-3">
            {state.actionItems.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhuma ação registrada ainda.</p>
            ) : (
              state.actionItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-100 p-3"
                >
                  <Checkbox
                    checked={item.done}
                    onCheckedChange={(v) => updateActionItem(item.id, { done: !!v })}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Input
                      value={item.description}
                      onChange={(e) => updateActionItem(item.id, { description: e.target.value })}
                      placeholder="Descrição da ação..."
                      className={cn(
                        "text-sm h-7 focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]",
                        item.done && "line-through text-gray-400"
                      )}
                    />
                    <Input
                      type="date"
                      value={item.dueDate ?? ""}
                      onChange={(e) => updateActionItem(item.id, { dueDate: e.target.value })}
                      className="text-xs h-6 focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeActionItem(item.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addActionItem}
              className="text-xs border-dashed"
            >
              + Adicionar ação
            </Button>
          </div>
        </Section>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold text-[#374151]">
            Notas da reunião
          </Label>
          <Textarea
            value={state.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Resumo, decisões tomadas, próximos passos gerais..."
            rows={4}
            className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
          />
        </div>
      </div>

      {/* Complete button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleComplete}
          disabled={completeMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
        >
          {completeMutation.isPending ? "Concluindo..." : "✓ Concluir Reunião"}
        </Button>
      </div>

      {completeMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {completeMutation.error?.message}
        </div>
      )}
    </div>
  )
}

// ─── Action Items Tracker ─────────────────────────────────────────────────────

interface ActionItemsTrackerProps {
  oneOnOnes: Array<{
    id: string
    subordinate?: { user?: { name?: string | null } | null } | null
    scheduledAt: Date | string
    actionItems?: unknown
  }>
}

function ActionItemsTracker({ oneOnOnes }: ActionItemsTrackerProps) {
  const pendingWithMeta: Array<{ item: ActionItem; meetingId: string; subordinateName: string; date: string }> = []

  for (const oo of oneOnOnes) {
    const items = (oo.actionItems as ActionItem[] | null) ?? []
    const pending = items.filter((a) => !a.done)
    for (const item of pending) {
      pendingWithMeta.push({
        item,
        meetingId: oo.id,
        subordinateName: oo.subordinate?.user?.name ?? "—",
        date: oo.scheduledAt instanceof Date
          ? oo.scheduledAt.toLocaleDateString("pt-BR")
          : new Date(oo.scheduledAt).toLocaleDateString("pt-BR"),
      })
    }
  }

  if (pendingWithMeta.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
        <p className="text-sm text-gray-400">Nenhuma ação pendente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pendingWithMeta.map(({ item, subordinateName, date }, idx) => (
        <div
          key={`${item.id}-${idx}`}
          className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm"
        >
          <div
            className="mt-0.5 h-2 w-2 rounded-full bg-amber-400 shrink-0 mt-2"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#374151] leading-snug">
              {item.description || "Sem descrição"}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400">{subordinateName}</span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400">1:1 de {date}</span>
              {item.dueDate && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="text-xs text-red-400 font-medium">
                    Vence: {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EquipeOneOnOneTab() {
  const [showScheduleDialog, setShowScheduleDialog] = React.useState(false)
  const [conductingId, setConductingId] = React.useState<string | null>(null)
  const [activeSection, setActiveSection] = React.useState<"upcoming" | "history" | "actions">("upcoming")

  // ── tRPC queries ────────────────────────────────────────────────────────────
  const upcomingQuery = trpc.team.oneOnOne.list.useQuery(
    { page: 1, perPage: 20, status: "SCHEDULED" },
    { refetchOnWindowFocus: false }
  )

  const historyQuery = trpc.team.oneOnOne.list.useQuery(
    { page: 1, perPage: 20, status: "COMPLETED_1ON1" },
    { refetchOnWindowFocus: false }
  )

  const allQuery = trpc.team.oneOnOne.list.useQuery(
    { page: 1, perPage: 100 },
    { refetchOnWindowFocus: false, enabled: activeSection === "actions" }
  )

  const membersQuery = trpc.team.members.list.useQuery(
    { page: 1, perPage: 100 },
    { refetchOnWindowFocus: false }
  )

  // ── Derived state ────────────────────────────────────────────────────────────
  const upcoming = upcomingQuery.data?.items ?? []
  const history = historyQuery.data?.items ?? []
  const allOneOnOnes = allQuery.data?.items ?? []
  const members = membersQuery.data?.items ?? []

  const conductingRecord = upcoming.find((o) => o.id === conductingId)

  // Timeline items from history
  const timelineItems = history.map((oo) => ({
    id: oo.id,
    date: oo.scheduledAt instanceof Date ? oo.scheduledAt.toISOString() : String(oo.scheduledAt),
    title: `1:1 com ${oo.subordinate?.user?.name ?? "—"}`,
    description: oo.notes
      ? String(oo.notes).slice(0, 100) + (String(oo.notes).length > 100 ? "..." : "")
      : "Reunião concluída",
    color: "#10B981",
  }))

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[#374151]">Reuniões 1:1</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie e conduza suas reuniões individuais com a equipe.
          </p>
        </div>
        <Button
          onClick={() => setShowScheduleDialog(true)}
          className="bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
        >
          + Agendar 1:1
        </Button>
      </div>

      {/* ── Conduct panel (full view) ─────────────────────────────────────── */}
      {conductingId && conductingRecord && (
        <Card className="shadow-sm border-[#C9A84C]/30 ring-1 ring-[#C9A84C]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base font-semibold text-[#374151]">
                Conduzindo: 1:1 com{" "}
                {conductingRecord.subordinate?.user?.name ?? "—"}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConductingId(null)}
                className="text-xs text-gray-400"
              >
                ← Voltar à lista
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ConductPanel
              oneOnOneId={conductingId}
              duration={conductingRecord.duration ?? 45}
              subordinateName={conductingRecord.subordinate?.user?.name ?? "Colaborador"}
              onComplete={() => {
                setConductingId(null)
                upcomingQuery.refetch()
                historyQuery.refetch()
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Section tabs ─────────────────────────────────────────────────── */}
      {!conductingId && (
        <>
          <div className="flex gap-1 border-b border-gray-100">
            {(
              [
                { key: "upcoming", label: "Próximas" },
                { key: "history", label: "Histórico" },
                { key: "actions", label: "Ações Pendentes" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeSection === key
                    ? "border-[#C9A84C] text-[#C9A84C]"
                    : "border-transparent text-gray-500 hover:text-[#374151]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Upcoming 1:1s */}
          {activeSection === "upcoming" && (
            <div className="space-y-3">
              {upcomingQuery.isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
              ) : upcoming.length === 0 ? (
                <Card className="border-dashed border-gray-200">
                  <CardContent className="py-12 text-center">
                    <p className="text-sm text-gray-400">Nenhuma 1:1 agendada.</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Clique em "Agendar 1:1" para começar.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                upcoming.map((oo) => {
                  const scheduledDate =
                    oo.scheduledAt instanceof Date
                      ? oo.scheduledAt
                      : new Date(oo.scheduledAt)
                  return (
                    <Card
                      key={oo.id}
                      className="shadow-sm border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[#374151]">
                                1:1 com {oo.subordinate?.user?.name ?? "—"}
                              </p>
                              <StatusBadge status={oo.status} />
                              {oo.recurring && (
                                <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                                  {oo.frequency
                                    ? FREQUENCY_LABELS[oo.frequency as Frequency] ?? oo.frequency
                                    : "Recorrente"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>
                                {scheduledDate.toLocaleDateString("pt-BR", {
                                  weekday: "short",
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                              <span>
                                {scheduledDate.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>{oo.duration ?? 45} min</span>
                              {oo.location && <span>{oo.location}</span>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setConductingId(oo.id)}
                            className="bg-[#C9A84C] hover:bg-[#b8973e] text-white text-xs font-semibold"
                          >
                            Iniciar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          )}

          {/* History timeline */}
          {activeSection === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#374151]">
                  Histórico de Reuniões
                </h3>
                <p className="text-xs text-gray-400">
                  {history.length} reunião(ões) concluída(s)
                </p>
              </div>

              {historyQuery.isLoading ? (
                <Skeleton className="h-64 w-full rounded-xl" />
              ) : (
                <TimelineVertical items={timelineItems} className="pl-2" />
              )}
            </div>
          )}

          {/* Action items tracker */}
          {activeSection === "actions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#374151]">
                  Ações Pendentes de todas as 1:1s
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => allQuery.refetch()}
                  className="text-xs text-gray-400 h-7"
                >
                  Atualizar
                </Button>
              </div>

              {allQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-xl" />
              ) : (
                <ActionItemsTracker oneOnOnes={allOneOnOnes} />
              )}
            </div>
          )}
        </>
      )}

      {/* ── Schedule Dialog ───────────────────────────────────────────────── */}
      <ScheduleDialog
        open={showScheduleDialog}
        onClose={() => setShowScheduleDialog(false)}
        members={members}
        onSuccess={() => upcomingQuery.refetch()}
      />
    </div>
  )
}
