"use client"

import * as React from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { OKRProgressBar } from "@/components/equipe/OKRProgressBar"
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Pencil,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Loader2,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type OKRCategory = "PRODUTIVIDADE" | "QUALIDADE" | "CAPTACAO" | "DESENVOLVIMENTO" | "FINANCEIRO" | "OPERACIONAL"
type OKRStatus   = "DRAFT" | "ACTIVE" | "REVIEW" | "CLOSED"

interface KeyResult {
  title: string
  metric: string
  targetValue: number
  currentValue: number
  unit?: string
  weight: number
}

interface OKR {
  id: string
  objective: string
  quarter: number
  year: number
  category: OKRCategory
  status: OKRStatus
  overallProgress: number
  keyResults: KeyResult[]
  teamMember?: {
    id: string
    user: { id: string; name: string; avatar_url: string | null }
  }
  parentOkr?: { id: string; objective: string } | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<OKRCategory, string> = {
  PRODUTIVIDADE: "Produtividade",
  QUALIDADE:     "Qualidade",
  CAPTACAO:      "Captação",
  DESENVOLVIMENTO: "Desenvolvimento",
  FINANCEIRO:    "Financeiro",
  OPERACIONAL:   "Operacional",
}

const STATUS_CONFIG: Record<OKRStatus, { label: string; className: string }> = {
  DRAFT:  { label: "Rascunho", className: "bg-gray-100 text-gray-700 border-gray-200" },
  ACTIVE: { label: "Ativo",    className: "bg-green-100 text-green-800 border-green-200" },
  REVIEW: { label: "Revisão",  className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  CLOSED: { label: "Encerrado",className: "bg-blue-100 text-blue-700 border-blue-200" },
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

// ─── Key Result form row ──────────────────────────────────────────────────────

interface KRRowProps {
  index: number
  kr: Partial<KeyResult>
  onChange: (index: number, field: keyof KeyResult, value: string | number) => void
  onRemove: (index: number) => void
}

function KRRow({ index, kr, onChange, onRemove }: KRRowProps) {
  return (
    <div className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-gray-50 border border-gray-100">
      <div className="col-span-12 sm:col-span-5">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Resultado-Chave</label>
        <Input
          placeholder="Ex: Reduzir tempo médio de resposta"
          value={kr.title ?? ""}
          onChange={(e) => onChange(index, "title", e.target.value)}
          className="text-sm h-8"
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Métrica</label>
        <Input
          placeholder="Ex: dias"
          value={kr.metric ?? ""}
          onChange={(e) => onChange(index, "metric", e.target.value)}
          className="text-sm h-8"
        />
      </div>
      <div className="col-span-6 sm:col-span-2">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Meta</label>
        <Input
          type="number"
          placeholder="100"
          value={kr.targetValue ?? ""}
          onChange={(e) => onChange(index, "targetValue", parseFloat(e.target.value) || 0)}
          className="text-sm h-8"
        />
      </div>
      <div className="col-span-5 sm:col-span-2">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Atual</label>
        <Input
          type="number"
          placeholder="0"
          value={kr.currentValue ?? ""}
          onChange={(e) => onChange(index, "currentValue", parseFloat(e.target.value) || 0)}
          className="text-sm h-8"
        />
      </div>
      <div className="col-span-1 flex items-end pb-0.5 justify-center">
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
          title="Remover KR"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Check-in inline row ──────────────────────────────────────────────────────

interface CheckinRowProps {
  krIndex: number
  kr: KeyResult
  editingValue: string
  isEditing: boolean
  onStartEdit: () => void
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}

function CheckinRow({ kr, editingValue, isEditing, onStartEdit, onChange, onSave, onCancel }: CheckinRowProps) {
  const pct = kr.targetValue > 0 ? Math.min(1, kr.currentValue / kr.targetValue) : 0

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 truncate">{kr.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <OKRProgressBar progress={pct} showLabel={false} className="flex-1" />
          <span className="text-xs text-gray-500 shrink-0">
            {kr.currentValue}{kr.unit ? ` ${kr.unit}` : ""} / {kr.targetValue}{kr.unit ? ` ${kr.unit}` : ""}
          </span>
        </div>
      </div>
      {isEditing ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={editingValue}
            onChange={(e) => onChange(e.target.value)}
            className="w-20 h-7 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave()
              if (e.key === "Escape") onCancel()
            }}
          />
          <button onClick={onSave} className="text-green-600 hover:text-green-700" title="Salvar">
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600" title="Cancelar">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={onStartEdit}
          className="text-gray-400 hover:text-blue-600 transition-colors"
          title="Editar valor atual"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── OKR card ─────────────────────────────────────────────────────────────────

interface OKRCardProps {
  okr: OKR
  onCheckin: (okrId: string, updates: { index: number; currentValue: number }[]) => void
  onClose: (okrId: string) => void
  isClosing: boolean
}

function OKRCard({ okr, onCheckin, onClose, isClosing }: OKRCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [editingKRIndex, setEditingKRIndex] = React.useState<number | null>(null)
  const [editingValue, setEditingValue] = React.useState("")
  const [pendingUpdates, setPendingUpdates] = React.useState<Record<number, number>>({})
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false)

  const krs: KeyResult[] = Array.isArray(okr.keyResults) ? okr.keyResults : []
  const progress = (okr.overallProgress ?? 0) / 100
  const statusCfg = STATUS_CONFIG[okr.status]

  function handleSaveKR(index: number) {
    const val = parseFloat(editingValue)
    if (!isNaN(val)) {
      setPendingUpdates((prev) => ({ ...prev, [index]: val }))
    }
    setEditingKRIndex(null)
  }

  function handleCheckinSave() {
    if (Object.keys(pendingUpdates).length === 0) return
    const updates = Object.entries(pendingUpdates).map(([idx, val]) => ({
      index: parseInt(idx),
      currentValue: val,
    }))
    onCheckin(okr.id, updates)
    setPendingUpdates({})
  }

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 mb-1">
              {okr.teamMember?.user.name ?? "—"} · Q{okr.quarter}/{okr.year}
            </p>
            <CardTitle className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
              {okr.objective}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className={`text-xs border ${statusCfg.className}`}>{statusCfg.label}</Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[okr.category] ?? okr.category}
            </Badge>
          </div>
        </div>
        {okr.parentOkr && (
          <p className="text-xs text-blue-600 mt-1">
            Alinhado a: {okr.parentOkr.objective}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <OKRProgressBar progress={progress} showLabel />

        {/* Expand / collapse KRs */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors w-full"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {krs.length} resultado{krs.length !== 1 ? "s" : ""}-chave
        </button>

        {expanded && (
          <div className="space-y-1 mt-1">
            {krs.map((kr, i) => {
              const effectiveCurrent = pendingUpdates[i] !== undefined ? pendingUpdates[i] : kr.currentValue
              return (
                <CheckinRow
                  key={i}
                  krIndex={i}
                  kr={{ ...kr, currentValue: effectiveCurrent }}
                  editingValue={editingValue}
                  isEditing={editingKRIndex === i}
                  onStartEdit={() => {
                    setEditingKRIndex(i)
                    setEditingValue(String(effectiveCurrent))
                  }}
                  onChange={setEditingValue}
                  onSave={() => handleSaveKR(i)}
                  onCancel={() => setEditingKRIndex(null)}
                />
              )
            })}

            {Object.keys(pendingUpdates).length > 0 && (
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={handleCheckinSave}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Salvar Check-in
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Close cycle button */}
        {okr.status === "ACTIVE" && (
          <div className="pt-1">
            {showCloseConfirm ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-700 flex-1">Encerrar este ciclo de OKR?</p>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-xs px-2"
                  disabled={isClosing}
                  onClick={() => onClose(okr.id)}
                >
                  {isClosing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirmar"}
                </Button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs w-full border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setShowCloseConfirm(true)}
              >
                Encerrar Ciclo
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── New OKR dialog ───────────────────────────────────────────────────────────

interface NewOKRDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  members: { id: string; user: { name: string } }[]
  existingOKRs: OKR[]
  onSuccess: () => void
}

function NewOKRDialog({ open, onOpenChange, members, existingOKRs, onSuccess }: NewOKRDialogProps) {
  const [memberId, setMemberId]     = React.useState("")
  const [quarter, setQuarter]       = React.useState<string>("1")
  const [year, setYear]             = React.useState<string>(String(CURRENT_YEAR))
  const [objective, setObjective]   = React.useState("")
  const [category, setCategory]     = React.useState<OKRCategory>("PRODUTIVIDADE")
  const [parentOkrId, setParentOkrId] = React.useState<string>("")
  const [krs, setKRs]               = React.useState<Partial<KeyResult>[]>([
    { title: "", metric: "", targetValue: 0, currentValue: 0, unit: "", weight: 100 },
  ])
  const [harveyLoading, setHarveyLoading] = React.useState(false)

  const createMutation = trpc.team.okrs.create.useMutation({
    onSuccess: () => {
      onSuccess()
      onOpenChange(false)
      resetForm()
    },
  })

  function resetForm() {
    setMemberId(""); setQuarter("1"); setYear(String(CURRENT_YEAR))
    setObjective(""); setCategory("PRODUTIVIDADE"); setParentOkrId("")
    setKRs([{ title: "", metric: "", targetValue: 0, currentValue: 0, unit: "", weight: 100 }])
  }

  function handleKRChange(index: number, field: keyof KeyResult, value: string | number) {
    setKRs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addKR() {
    setKRs((prev) => [
      ...prev,
      { title: "", metric: "", targetValue: 0, currentValue: 0, unit: "", weight: 100 },
    ])
  }

  function removeKR(index: number) {
    setKRs((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleHarvey() {
    if (!objective.trim() || !memberId) return
    setHarveyLoading(true)
    try {
      const res = await fetch("/api/ai/okr-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective, category, memberId, quarter: parseInt(quarter), year: parseInt(year) }),
      })
      if (!res.ok) throw new Error("Falha na resposta da IA")
      const data = await res.json()
      if (data.keyResults && Array.isArray(data.keyResults)) {
        setKRs(
          data.keyResults.map((kr: any) => ({
            title: kr.title ?? "",
            metric: kr.metric ?? "",
            targetValue: kr.targetValue ?? 0,
            currentValue: 0,
            unit: kr.unit ?? "",
            weight: kr.weight ?? 100,
          }))
        )
      }
      if (data.objective && !objective) setObjective(data.objective)
    } catch {
      // Harvey falhou silenciosamente — mantém o estado atual
    } finally {
      setHarveyLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !objective.trim() || krs.length === 0) return

    const validKRs = krs.filter((kr) => kr.title && kr.targetValue !== undefined) as KeyResult[]
    if (validKRs.length === 0) return

    createMutation.mutate({
      teamMemberId: memberId,
      quarter: parseInt(quarter),
      year: parseInt(year),
      objective,
      category,
      keyResults: validKRs.map((kr) => ({
        title: kr.title,
        metric: kr.metric ?? "",
        targetValue: kr.targetValue,
        currentValue: kr.currentValue ?? 0,
        unit: kr.unit ?? undefined,
        weight: kr.weight ?? 100,
      })),
      parentOkrId: parentOkrId || undefined,
      status: "DRAFT",
    })
  }

  const isSubmitting = createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo OKR</DialogTitle>
          <DialogDescription>
            Defina o objetivo e os resultados-chave para o ciclo selecionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Member + Quarter + Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
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
              <label className="text-xs font-medium text-gray-700 mb-1 block">Trimestre *</label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Ano *</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Categoria *</label>
            <Select value={category} onValueChange={(v) => setCategory(v as OKRCategory)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Objective */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">Objetivo *</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-xs border-[#C9A84C] text-[#C9A84C] hover:bg-amber-50"
                onClick={handleHarvey}
                disabled={harveyLoading || !memberId}
              >
                {harveyLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Harvey: Sugerir OKRs
              </Button>
            </div>
            <Textarea
              placeholder="Ex: Entregar peças processuais com excelência e dentro dos prazos"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Parent OKR alignment */}
          {existingOKRs.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                OKR pai (alinhamento, opcional)
              </label>
              <Select value={parentOkrId} onValueChange={setParentOkrId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {existingOKRs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      Q{o.quarter}/{o.year} — {o.objective.slice(0, 60)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Key Results */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Resultados-Chave *</label>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addKR}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar KR
              </Button>
            </div>
            <div className="space-y-2">
              {krs.map((kr, i) => (
                <KRRow
                  key={i}
                  index={i}
                  kr={kr}
                  onChange={handleKRChange}
                  onRemove={removeKR}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          {createMutation.isError && (
            <p className="text-xs text-red-600">
              Erro ao criar OKR: {createMutation.error?.message}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !memberId || !objective.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Criar OKR
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EquipeOKRsTab() {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [filterMemberId, setFilterMemberId] = React.useState<string>("")
  const [filterQuarter, setFilterQuarter]   = React.useState<string>("")
  const [filterYear, setFilterYear]         = React.useState<string>("")
  const [filterStatus, setFilterStatus]     = React.useState<string>("")

  const okrsQuery = trpc.team.okrs.list.useQuery(
    {
      page: 1,
      perPage: 50,
      teamMemberId: filterMemberId || undefined,
      quarter: filterQuarter ? parseInt(filterQuarter) : undefined,
      year: filterYear ? parseInt(filterYear) : undefined,
      status: filterStatus as OKRStatus | undefined || undefined,
    },
    { staleTime: 2 * 60 * 1000 }
  )

  const membersQuery = trpc.team.members.list.useQuery(
    { page: 1, perPage: 100 },
    { staleTime: 10 * 60 * 1000 }
  )

  const checkinMutation = trpc.team.okrs.checkin.useMutation({
    onSuccess: () => okrsQuery.refetch(),
  })

  const closeMutation = trpc.team.okrs.close.useMutation({
    onSuccess: () => okrsQuery.refetch(),
  })

  const members = (membersQuery.data?.items ?? []) as any[]
  const okrs    = (okrsQuery.data?.items ?? []) as unknown as OKR[]

  function handleCheckin(okrId: string, updates: { index: number; currentValue: number }[]) {
    checkinMutation.mutate({ id: okrId, keyResults: updates })
  }

  function handleClose(okrId: string) {
    closeMutation.mutate({ id: okrId })
  }

  const isLoading = okrsQuery.isLoading || membersQuery.isLoading

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">OKRs da Equipe</h2>
          <p className="text-sm text-gray-500">
            {okrsQuery.data?.total ?? 0} OKRs cadastrados
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo OKR
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterMemberId} onValueChange={setFilterMemberId}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Todos os membros" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os membros</SelectItem>
            {members.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterQuarter} onValueChange={setFilterQuarter}>
          <SelectTrigger className="h-8 w-28 text-xs">
            <SelectValue placeholder="Trimestre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {[1, 2, 3, 4].map((q) => (
              <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterMemberId || filterQuarter || filterYear || filterStatus) && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-gray-500"
            onClick={() => {
              setFilterMemberId("")
              setFilterQuarter("")
              setFilterYear("")
              setFilterStatus("")
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : okrsQuery.isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-6 text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Erro ao carregar OKRs</p>
              <p className="text-sm text-red-600 mt-0.5">{okrsQuery.error?.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : okrs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <TrendingUpIcon className="h-12 w-12 opacity-30" />
            <p className="font-medium">Nenhum OKR encontrado</p>
            <p className="text-sm text-center max-w-xs">
              Crie o primeiro OKR para começar a acompanhar o progresso da equipe.
            </p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Criar OKR
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {okrs.map((okr) => (
            <OKRCard
              key={okr.id}
              okr={okr}
              onCheckin={handleCheckin}
              onClose={handleClose}
              isClosing={closeMutation.isPending && closeMutation.variables?.id === okr.id}
            />
          ))}
        </div>
      )}

      {/* ── New OKR dialog ────────────────────────────────────────────────── */}
      <NewOKRDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        existingOKRs={okrs}
        onSuccess={() => okrsQuery.refetch()}
      />
    </div>
  )
}

// Inline icon to avoid import issues
function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
