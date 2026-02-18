"use client"

import { useState, useMemo, useCallback } from "react"
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock, AlertTriangle,
  Scale, Shield, Users, Gavel, FileText, Info, Calculator, Save, Loader2,
} from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { formatCNJ } from "@/lib/constants"
import {
  DEADLINE_TYPE_LABELS,
  DEADLINE_PRIORITY_LABELS,
  TRIGGER_EVENT_LABELS,
  TRIGGER_EVENTS,
  JURISDICTION_LABELS,
  JURISDICTIONS,
  COUNTING_MODE_LABELS,
  type TriggerEvent,
} from "@/lib/deadline-constants"

// ============================================================
// CONSTANTS
// ============================================================

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

const STEPS = [
  { number: 1, label: "Dados Basicos", icon: FileText },
  { number: 2, label: "Evento Gatilho", icon: CalendarDays },
  { number: 3, label: "Regras Especiais", icon: Scale },
  { number: 4, label: "Resultado", icon: Calculator },
]

// ============================================================
// TYPES
// ============================================================

interface DeadlineWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseId?: string
  onSuccess?: () => void
}

interface FormData {
  // Step 1
  case_id: string
  catalog_id: string
  titulo: string
  descricao: string
  tipo: string
  prazo_dias: number
  responsavel_id: string
  responsavel_backup_id: string
  prioridade: string
  categoria: string
  input_mode: "catalogo" | "manual"

  // Step 2
  trigger_event: string
  trigger_date: string
  contagem_tipo: string
  jurisdicao: string
  uf: string
  tribunal_codigo: string
  processo_eletronico: boolean
  data_disponibilizacao: string

  // Step 3
  dobra_fazenda: boolean
  dobra_mp: boolean
  dobra_defensoria: boolean
  dobra_litisconsorcio: boolean
  embargos_pendentes: boolean
  embargos_data_oposicao: string
  dias_corridos_rj: boolean

  // Step 4 (calculated)
  data_inicio_contagem: Date | null
  data_fim_prazo: Date | null
  prazo_dias_efetivo: number
}

// ============================================================
// STEP INDICATOR
// ============================================================

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between px-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon
        const isActive = currentStep === step.number
        const isCompleted = currentStep > step.number

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center size-9 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "bg-[#C9A961] border-[#C9A961] text-white"
                    : isActive
                      ? "border-[#C9A961] bg-[#C9A961]/10 text-[#C9A961]"
                      : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isActive ? "text-[#C9A961]" : isCompleted ? "text-[#2A2A2A]" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mt-[-16px] ${
                  isCompleted ? "bg-[#C9A961]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// CLIENT-SIDE DEADLINE CALCULATION (approximate preview)
// ============================================================

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (!isWeekend(result)) {
      added++
    }
  }
  return result
}

function addCalendarDays(startDate: Date, days: number): Date {
  const result = new Date(startDate)
  result.setDate(result.getDate() + days)
  return result
}

function calculateStartDate(triggerDate: Date, triggerEvent: string, dataDisponibilizacao: string): Date {
  // For electronic intimation: publication = next business day after disponibilizacao
  // Deadline starts on the business day after publication
  if (triggerEvent === "INTIMACAO_ELETRONICA" && dataDisponibilizacao) {
    const disp = new Date(dataDisponibilizacao)
    // Publication = next business day after disponibilizacao
    const publication = addBusinessDays(disp, 1)
    // Start counting = next business day after publication
    return publication
  }

  // For most events: deadline starts on next day (CPC Art. 224, caput)
  return triggerDate
}

function calculateDeadline(formData: FormData): {
  startDate: Date
  endDate: Date
  effectiveDays: number
  rules: string[]
  warnings: string[]
} {
  const rules: string[] = []
  const warnings: string[] = []

  if (!formData.trigger_date) {
    return {
      startDate: new Date(),
      endDate: new Date(),
      effectiveDays: 0,
      rules: [],
      warnings: ["Data do evento gatilho nao informada."],
    }
  }

  const triggerDate = new Date(formData.trigger_date + "T12:00:00")
  let effectiveDays = formData.prazo_dias

  // Apply doubling rules
  const doublingRules: string[] = []
  if (formData.dobra_fazenda) doublingRules.push("Fazenda Publica (Art. 183 CPC)")
  if (formData.dobra_mp) doublingRules.push("Ministerio Publico (Art. 180 CPC)")
  if (formData.dobra_defensoria) doublingRules.push("Defensoria Publica (Art. 186 CPC)")
  if (formData.dobra_litisconsorcio && !formData.processo_eletronico) {
    doublingRules.push("Litisconsorcio (Art. 229 CPC)")
  }

  if (doublingRules.length > 0) {
    effectiveDays = effectiveDays * 2
    rules.push(`Prazo dobrado: ${doublingRules.join(", ")}`)
  }

  // Determine counting mode
  const useDiasCorridos = formData.contagem_tipo === "DIAS_CORRIDOS" || formData.dias_corridos_rj

  if (formData.dias_corridos_rj) {
    rules.push("Contagem em dias corridos (Lei 11.101/2005)")
  }

  // Calculate start date
  const startDate = calculateStartDate(triggerDate, formData.trigger_event, formData.data_disponibilizacao)

  if (formData.trigger_event === "INTIMACAO_ELETRONICA" && formData.data_disponibilizacao) {
    rules.push("Intimacao eletronica: publicacao = dia util seguinte a disponibilizacao (Art. 231, par. 2 e 3 CPC)")
  }

  // Calculate end date
  let endDate: Date
  if (useDiasCorridos) {
    endDate = addCalendarDays(startDate, effectiveDays)
    rules.push("Contagem em dias corridos")
  } else {
    endDate = addBusinessDays(startDate, effectiveDays)
    rules.push("Contagem em dias uteis (Art. 219 CPC)")
  }

  // Check recess overlap (Dec 20 - Jan 20)
  const endMonth = endDate.getMonth()
  const endDay = endDate.getDate()
  if (
    (endMonth === 11 && endDay >= 20) ||
    endMonth === 0 ||
    (endMonth === 0 && endDay <= 20)
  ) {
    warnings.push("O prazo pode ser afetado pelo recesso forense (20/dez a 20/jan, Art. 220 CPC). O calculo exato sera feito pelo servidor.")
  }

  // Embargos de declaracao
  if (formData.embargos_pendentes) {
    rules.push("Embargos de declaracao pendentes interrompem o prazo (Art. 1.026 CPC)")
    warnings.push("O prazo sera recalculado apos julgamento dos embargos de declaracao.")
  }

  return { startDate, endDate, effectiveDays, rules, warnings }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function DeadlineWizard({ open, onOpenChange, caseId, onSuccess }: DeadlineWizardProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    // Step 1
    case_id: caseId || "",
    catalog_id: "",
    titulo: "",
    descricao: "",
    tipo: "",
    prazo_dias: 15,
    responsavel_id: "",
    responsavel_backup_id: "",
    prioridade: "ALTA",
    categoria: "PARTE",
    input_mode: "catalogo",

    // Step 2
    trigger_event: "",
    trigger_date: "",
    contagem_tipo: "DIAS_UTEIS",
    jurisdicao: "ESTADUAL",
    uf: "PR",
    tribunal_codigo: "",
    processo_eletronico: true,
    data_disponibilizacao: "",

    // Step 3
    dobra_fazenda: false,
    dobra_mp: false,
    dobra_defensoria: false,
    dobra_litisconsorcio: false,
    embargos_pendentes: false,
    embargos_data_oposicao: "",
    dias_corridos_rj: false,

    // Step 4 (calculated)
    data_inicio_contagem: null,
    data_fim_prazo: null,
    prazo_dias_efetivo: 0,
  })

  // tRPC queries
  const { data: cases } = trpc.deadlines.casesForSelect.useQuery()
  const { data: users } = trpc.deadlines.usersForSelect.useQuery()
  const { data: catalogEntries } = trpc.deadlines.catalog.list.useQuery()
  const utils = trpc.useUtils()

  const createMutation = trpc.deadlines.create.useMutation({
    onSuccess: () => {
      utils.deadlines.dashboardStats.invalidate()
      utils.deadlines.listNew.invalidate()
      utils.deadlines.list.invalidate()
      utils.deadlines.stats.invalidate()
      onSuccess?.()
      onOpenChange(false)
      resetForm()
    },
  })

  // Calculated result for step 4
  const calculationResult = useMemo(() => {
    if (step === 4) {
      return calculateDeadline(formData)
    }
    return null
  }, [step, formData])

  // Helpers
  const set = useCallback(<K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  function resetForm() {
    setStep(1)
    setFormData({
      case_id: caseId || "",
      catalog_id: "",
      titulo: "",
      descricao: "",
      tipo: "",
      prazo_dias: 15,
      responsavel_id: "",
      responsavel_backup_id: "",
      prioridade: "ALTA",
      categoria: "PARTE",
      input_mode: "catalogo",
      trigger_event: "",
      trigger_date: "",
      contagem_tipo: "DIAS_UTEIS",
      jurisdicao: "ESTADUAL",
      uf: "PR",
      tribunal_codigo: "",
      processo_eletronico: true,
      data_disponibilizacao: "",
      dobra_fazenda: false,
      dobra_mp: false,
      dobra_defensoria: false,
      dobra_litisconsorcio: false,
      embargos_pendentes: false,
      embargos_data_oposicao: "",
      dias_corridos_rj: false,
      data_inicio_contagem: null,
      data_fim_prazo: null,
      prazo_dias_efetivo: 0,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleCatalogSelect(catalogId: string, catalog: any) {
    set("catalog_id", catalogId)
    if (catalog) {
      set("titulo", catalog.titulo || "")
      set("tipo", catalog.tipo || "")
      set("prazo_dias", catalog.prazo_dias || 15)
      if (catalog.contagem_tipo) set("contagem_tipo", catalog.contagem_tipo)
      if (catalog.tipo === "FATAL") set("prioridade", "CRITICA")
    }
  }

  // Validation per step
  function validateStep(s: number): boolean {
    switch (s) {
      case 1:
        return !!(formData.case_id && formData.titulo && formData.tipo && formData.prazo_dias > 0 && formData.responsavel_id)
      case 2:
        return !!(formData.trigger_event && formData.trigger_date)
      case 3:
        return true // All optional
      case 4:
        return true
      default:
        return false
    }
  }

  function handleNext() {
    if (validateStep(step) && step < 4) {
      setStep(step + 1)
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1)
  }

  function handleSave() {
    const calc = calculateDeadline(formData)

    const dobra = formData.dobra_fazenda || formData.dobra_mp || formData.dobra_defensoria || formData.dobra_litisconsorcio
    const dobraMotivo = [
      formData.dobra_fazenda && "Fazenda Pública (Art. 183 CPC)",
      formData.dobra_mp && "Ministério Público (Art. 180 CPC)",
      formData.dobra_defensoria && "Defensoria Pública (Art. 186 CPC)",
      formData.dobra_litisconsorcio && "Litisconsórcio (Art. 229 CPC)",
    ].filter(Boolean).join("; ")

    createMutation.mutate({
      case_id: formData.case_id || undefined,
      titulo: formData.titulo,
      descricao: formData.descricao || undefined,
      tipo: formData.tipo,
      categoria: formData.categoria,
      contagem_tipo: formData.dias_corridos_rj ? "DIAS_CORRIDOS" : formData.contagem_tipo,
      prazo_dias: formData.prazo_dias,
      prazo_dias_efetivo: calc.effectiveDays,
      dobra_aplicada: dobra,
      dobra_motivo: dobraMotivo || undefined,
      dobra_fator: dobra ? 2 : undefined,
      data_evento_gatilho: new Date(formData.trigger_date),
      metodo_intimacao: formData.trigger_event || undefined,
      data_disponibilizacao: formData.data_disponibilizacao ? new Date(formData.data_disponibilizacao) : undefined,
      data_inicio_contagem: calc.startDate,
      data_fim_prazo: calc.endDate,
      status: "CORRENDO",
      prioridade: formData.prioridade,
      tribunal_codigo: formData.tribunal_codigo || undefined,
      uf: formData.uf || undefined,
      responsavel_id: formData.responsavel_id || undefined,
      responsavel_backup_id: formData.responsavel_backup_id || undefined,
      suspensoes_aplicadas: {
        dobra_fazenda: formData.dobra_fazenda,
        dobra_mp: formData.dobra_mp,
        dobra_defensoria: formData.dobra_defensoria,
        dobra_litisconsorcio: formData.dobra_litisconsorcio,
        embargos_pendentes: formData.embargos_pendentes,
        dias_corridos_rj: formData.dias_corridos_rj,
      },
      observacoes: formData.embargos_pendentes
        ? `Embargos opostos em ${formData.embargos_data_oposicao}`
        : undefined,
    })
  }

  function daysUntilDate(date: Date): number {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ============================================================
  // STEP 1: Dados Basicos
  // ============================================================

  function renderStep1() {
    return (
      <div className="space-y-4">
        {/* Case selection */}
        <div className="space-y-2">
          <Label>Processo *</Label>
          <Select value={formData.case_id} onValueChange={(v) => set("case_id", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar processo" />
            </SelectTrigger>
            <SelectContent>
              {cases?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {formatCNJ(c.numero_processo) || "Sem numero"} -- {c.cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input mode toggle */}
        <div className="space-y-2">
          <Label>Tipo de entrada</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.input_mode === "catalogo" ? "default" : "outline"}
              size="sm"
              onClick={() => set("input_mode", "catalogo")}
              className={formData.input_mode === "catalogo" ? "bg-[#C9A961] hover:bg-[#B8944E] text-white" : ""}
            >
              Selecionar do catalogo
            </Button>
            <Button
              type="button"
              variant={formData.input_mode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                set("input_mode", "manual")
                set("catalog_id", "")
              }}
              className={formData.input_mode === "manual" ? "bg-[#C9A961] hover:bg-[#B8944E] text-white" : ""}
            >
              Prazo manual
            </Button>
          </div>
        </div>

        {/* Catalog selection */}
        {formData.input_mode === "catalogo" && (
          <div className="space-y-2">
            <Label>Prazo do catalogo</Label>
            <Select
              value={formData.catalog_id}
              onValueChange={(v) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entry = catalogEntries?.find((e: any) => e.id === v)
                handleCatalogSelect(v, entry)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar prazo do catalogo" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {catalogEntries?.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.titulo} ({e.prazo_dias} dias)
                  </SelectItem>
                ))}
                {(!catalogEntries || catalogEntries.length === 0) && (
                  <SelectItem value="_none" disabled>
                    Nenhum prazo cadastrado no catalogo
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label>Titulo *</Label>
          <Input
            value={formData.titulo}
            onChange={(e) => set("titulo", e.target.value)}
            placeholder="Ex: Contestacao, Apelacao, Embargos de Declaracao..."
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Descricao</Label>
          <Textarea
            value={formData.descricao}
            onChange={(e) => set("descricao", e.target.value)}
            placeholder="Detalhes adicionais sobre o prazo..."
            rows={2}
          />
        </div>

        {/* Type + Days */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(v) => {
                set("tipo", v)
                if (v === "FATAL") set("prioridade", "CRITICA")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo do prazo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEADLINE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dias do prazo *</Label>
            <Input
              type="number"
              min={1}
              value={formData.prazo_dias || ""}
              onChange={(e) => set("prazo_dias", parseInt(e.target.value) || 0)}
              placeholder="15"
            />
          </div>
        </div>

        {/* Responsible + Backup */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Responsavel *</Label>
            <Select value={formData.responsavel_id} onValueChange={(v) => set("responsavel_id", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {users?.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsavel backup</Label>
            <Select value={formData.responsavel_backup_id} onValueChange={(v) => set("responsavel_backup_id", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {users?.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <div className="flex gap-2">
            {(["CRITICA", "ALTA", "MEDIA", "BAIXA"] as const).map((p) => (
              <Button
                key={p}
                type="button"
                variant={formData.prioridade === p ? "default" : "outline"}
                size="sm"
                onClick={() => set("prioridade", p)}
                className={formData.prioridade === p
                  ? p === "CRITICA"
                    ? "bg-[#DC3545] hover:bg-[#C82333] text-white"
                    : p === "ALTA"
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : p === "MEDIA"
                        ? "bg-[#C9A961] hover:bg-[#B8944E] text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                  : ""
                }
              >
                {DEADLINE_PRIORITY_LABELS[p]}
              </Button>
            ))}
          </div>
          {formData.tipo === "FATAL" && formData.prioridade !== "CRITICA" && (
            <p className="text-xs text-[#DC3545]">
              Prazos fatais geralmente possuem prioridade Critica.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // STEP 2: Evento Gatilho & Jurisdicao
  // ============================================================

  function renderStep2() {
    return (
      <div className="space-y-4">
        {/* Trigger event */}
        <div className="space-y-2">
          <Label>Evento gatilho *</Label>
          <Select value={formData.trigger_event} onValueChange={(v) => set("trigger_event", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecionar evento que inicia o prazo" />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_EVENTS.map((ev) => (
                <SelectItem key={ev} value={ev}>
                  {TRIGGER_EVENT_LABELS[ev]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Electronic intimation extra fields */}
        {formData.trigger_event === "INTIMACAO_ELETRONICA" && (
          <div className="space-y-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Para intimacao eletronica, a data de publicacao e o dia util seguinte a disponibilizacao.
                O prazo comeca no dia util seguinte a publicacao (Art. 231, par. 2 e par. 3 CPC).
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Data de disponibilizacao</Label>
              <Input
                type="date"
                value={formData.data_disponibilizacao}
                onChange={(e) => set("data_disponibilizacao", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Trigger date */}
        <div className="space-y-2">
          <Label>Data do evento *</Label>
          <Input
            type="date"
            value={formData.trigger_date}
            onChange={(e) => set("trigger_date", e.target.value)}
          />
          <p className="text-[10px] text-[#666666]">
            Data em que o evento gatilho ocorreu (ex: data da intimacao, publicacao, audiencia).
          </p>
        </div>

        {/* Counting mode */}
        <div className="space-y-2">
          <Label>Modo de contagem</Label>
          <div className="flex gap-2">
            {(["DIAS_UTEIS", "DIAS_CORRIDOS"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={formData.contagem_tipo === mode ? "default" : "outline"}
                size="sm"
                onClick={() => set("contagem_tipo", mode)}
                className={formData.contagem_tipo === mode ? "bg-[#C9A961] hover:bg-[#B8944E] text-white" : ""}
              >
                {COUNTING_MODE_LABELS[mode]}
              </Button>
            ))}
          </div>
        </div>

        {/* Jurisdiction + UF */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Jurisdicao</Label>
            <Select value={formData.jurisdicao} onValueChange={(v) => set("jurisdicao", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {JURISDICTIONS.map((j) => (
                  <SelectItem key={j} value={j}>{JURISDICTION_LABELS[j]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>UF</Label>
            <Select value={formData.uf} onValueChange={(v) => set("uf", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_BRASIL.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tribunal */}
        <div className="space-y-2">
          <Label>Tribunal</Label>
          <Input
            value={formData.tribunal_codigo}
            onChange={(e) => set("tribunal_codigo", e.target.value)}
            placeholder="Ex: TJPR, TRF4, TRT9..."
          />
          <p className="text-[10px] text-[#666666]">
            Opcional. Codigo ou sigla do tribunal.
          </p>
        </div>

        {/* Electronic process */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
          <Checkbox
            checked={formData.processo_eletronico}
            onCheckedChange={(checked) => set("processo_eletronico", !!checked)}
          />
          <div>
            <Label className="text-sm cursor-pointer">Processo eletronico</Label>
            <p className="text-[10px] text-[#666666] mt-0.5">
              Processos eletronicos afetam a regra de litisconsorcio (Art. 229, par. 2 CPC).
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // STEP 3: Regras Especiais
  // ============================================================

  function renderStep3() {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 p-3 rounded-lg border border-[#C9A961]/30 bg-[#C9A961]/5">
          <Info className="size-4 text-[#C9A961] mt-0.5 shrink-0" />
          <p className="text-xs text-[#666666]">
            As regras marcadas serao aplicadas automaticamente no calculo do prazo.
            Selecione apenas as que se aplicam ao caso concreto.
          </p>
        </div>

        {/* Dobra Fazenda Publica */}
        <SpecialRuleCard
          checked={formData.dobra_fazenda}
          onCheckedChange={(v) => set("dobra_fazenda", v)}
          icon={<Shield className="size-4 text-blue-600" />}
          title="Prazo em dobro -- Fazenda Publica"
          article="Art. 183 CPC"
          description="A Uniao, Estados, DF, Municipios e suas autarquias/fundacoes tem prazo em dobro para todas as manifestacoes processuais."
        />

        {/* Dobra MP */}
        <SpecialRuleCard
          checked={formData.dobra_mp}
          onCheckedChange={(v) => set("dobra_mp", v)}
          icon={<Gavel className="size-4 text-purple-600" />}
          title="Prazo em dobro -- Ministerio Publico"
          article="Art. 180 CPC"
          description="O Ministerio Publico goza de prazo em dobro para manifestar-se nos autos."
        />

        {/* Dobra Defensoria */}
        <SpecialRuleCard
          checked={formData.dobra_defensoria}
          onCheckedChange={(v) => set("dobra_defensoria", v)}
          icon={<Shield className="size-4 text-green-600" />}
          title="Prazo em dobro -- Defensoria Publica"
          article="Art. 186 CPC"
          description="A Defensoria Publica goza de prazo em dobro para todas as suas manifestacoes processuais."
        />

        {/* Dobra Litisconsorcio */}
        <div className={`p-3 rounded-lg border transition-colors ${
          formData.processo_eletronico
            ? "border-gray-200 bg-gray-50 opacity-60"
            : formData.dobra_litisconsorcio
              ? "border-[#C9A961] bg-[#C9A961]/5"
              : "border-gray-200 bg-white"
        }`}>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={formData.dobra_litisconsorcio}
              onCheckedChange={(checked) => set("dobra_litisconsorcio", !!checked)}
              disabled={formData.processo_eletronico}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-amber-600" />
                <span className="text-sm font-medium text-[#2A2A2A]">
                  Prazo em dobro -- Litisconsortes
                </span>
                <Badge variant="secondary" className="text-[10px]">Art. 229 CPC</Badge>
              </div>
              <p className="text-xs text-[#666666] mt-1">
                Litisconsortes com procuradores de escritorios diferentes terao prazos contados em dobro.
              </p>
              {formData.processo_eletronico && (
                <div className="flex items-center gap-1.5 mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                  <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-700 font-medium">
                    Art. 229, par. 2: NAO se aplica em processo eletronico!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Embargos de Declaracao */}
        <div className={`p-3 rounded-lg border transition-colors ${
          formData.embargos_pendentes
            ? "border-[#C9A961] bg-[#C9A961]/5"
            : "border-gray-200 bg-white"
        }`}>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={formData.embargos_pendentes}
              onCheckedChange={(checked) => set("embargos_pendentes", !!checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-indigo-600" />
                <span className="text-sm font-medium text-[#2A2A2A]">
                  Embargos de declaracao pendentes
                </span>
                <Badge variant="secondary" className="text-[10px]">Art. 1.026 CPC</Badge>
              </div>
              <p className="text-xs text-[#666666] mt-1">
                Embargos de declaracao interrompem o prazo para interposicao de recurso.
              </p>
              {formData.embargos_pendentes && (
                <div className="mt-2 space-y-2">
                  <Label className="text-xs">Data de oposicao dos embargos</Label>
                  <Input
                    type="date"
                    value={formData.embargos_data_oposicao}
                    onChange={(e) => set("embargos_data_oposicao", e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dias corridos RJ */}
        <SpecialRuleCard
          checked={formData.dias_corridos_rj}
          onCheckedChange={(v) => {
            set("dias_corridos_rj", v)
            if (v) set("contagem_tipo", "DIAS_CORRIDOS")
          }}
          icon={<Clock className="size-4 text-red-600" />}
          title="Dias corridos (RJ/Falencia)"
          article="Lei 11.101/2005"
          description="Prazos da Lei 11.101 sao contados em dias corridos, nao uteis."
        />
      </div>
    )
  }

  // ============================================================
  // STEP 4: Resultado do Calculo
  // ============================================================

  function renderStep4() {
    if (!calculationResult) return null

    const { startDate, endDate, effectiveDays, rules, warnings } = calculationResult
    const daysRemaining = daysUntilDate(endDate)
    const isFatal = formData.tipo === "FATAL" || formData.prioridade === "CRITICA"

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-gray-200">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-[10px] text-[#666666] uppercase tracking-wide">Prazo Original</p>
              <p className="text-xl font-bold text-[#2A2A2A] mt-1">
                {formData.prazo_dias} dias
              </p>
              <p className="text-[10px] text-[#666666]">
                {formData.contagem_tipo === "DIAS_CORRIDOS" || formData.dias_corridos_rj
                  ? "corridos"
                  : "uteis"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-[10px] text-[#666666] uppercase tracking-wide">Prazo Efetivo</p>
              <p className={`text-xl font-bold mt-1 ${effectiveDays !== formData.prazo_dias ? "text-[#C9A961]" : "text-[#2A2A2A]"}`}>
                {effectiveDays} dias
              </p>
              {effectiveDays !== formData.prazo_dias && (
                <p className="text-[10px] text-[#C9A961]">dobrado</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-[10px] text-[#666666] uppercase tracking-wide">Dias Restantes</p>
              <p className={`text-xl font-bold mt-1 ${
                daysRemaining < 0 ? "text-[#DC3545]"
                  : daysRemaining <= 2 ? "text-[#DC3545]"
                    : daysRemaining <= 5 ? "text-[#C9A961]"
                      : "text-[#28A745]"
              }`}>
                {daysRemaining < 0 ? `${Math.abs(daysRemaining)} atrasado` : daysRemaining}
              </p>
              <p className="text-[10px] text-[#666666]">
                {daysRemaining === 0 ? "HOJE" : daysRemaining === 1 ? "amanha" : daysRemaining < 0 ? "dias" : "dias uteis aprox."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main deadline card */}
        <Card className={`${isFatal ? "border-[#DC3545] border-2" : "border-[#C9A961] border-2"}`}>
          <CardContent className="py-5">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {isFatal && <AlertTriangle className="size-5 text-[#DC3545] animate-pulse" />}
                <p className="text-xs font-semibold uppercase tracking-wider text-[#666666]">
                  Data Limite
                </p>
                {isFatal && <AlertTriangle className="size-5 text-[#DC3545] animate-pulse" />}
              </div>
              <p className={`text-3xl font-bold ${isFatal ? "text-[#DC3545]" : "text-[#2A2A2A]"}`}>
                {endDate.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {isFatal && (
                <Badge className="mt-2 bg-[#DC3545] text-white">PRAZO FATAL</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-[#2A2A2A] uppercase tracking-wide">
            Trilha de Auditoria
          </Label>
          <div className="space-y-2 p-3 rounded-lg border bg-gray-50">
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[#666666] w-32 shrink-0">Evento gatilho:</span>
              <span className="font-medium">
                {TRIGGER_EVENT_LABELS[formData.trigger_event as TriggerEvent] || formData.trigger_event}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-[#666666] w-32 shrink-0">Data do evento:</span>
              <span className="font-medium">
                {formData.trigger_date
                  ? new Date(formData.trigger_date + "T12:00:00").toLocaleDateString("pt-BR")
                  : "--"}
              </span>
            </div>
            {formData.trigger_event === "INTIMACAO_ELETRONICA" && formData.data_disponibilizacao && (
              <div className="flex items-center gap-3 text-sm">
                <div className="size-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-[#666666] w-32 shrink-0">Disponibilizacao:</span>
                <span className="font-medium">
                  {new Date(formData.data_disponibilizacao + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-[#C9A961] shrink-0" />
              <span className="text-[#666666] w-32 shrink-0">Inicio contagem:</span>
              <span className="font-medium">
                {startDate.toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className={`size-2 rounded-full shrink-0 ${isFatal ? "bg-[#DC3545]" : "bg-[#28A745]"}`} />
              <span className="text-[#666666] w-32 shrink-0">Data limite:</span>
              <span className={`font-bold ${isFatal ? "text-[#DC3545]" : "text-[#2A2A2A]"}`}>
                {endDate.toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        {/* Applied rules */}
        {rules.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#2A2A2A] uppercase tracking-wide">
              Regras Aplicadas
            </Label>
            <div className="space-y-1">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200">
                  <Check className="size-3.5 text-green-600 shrink-0" />
                  <span className="text-xs text-green-800">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#2A2A2A] uppercase tracking-wide">
              Alertas
            </Label>
            <div className="space-y-1">
              {warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border bg-amber-50 border-amber-200">
                  <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="text-xs text-amber-800">{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approximate notice */}
        <div className="flex items-start gap-2 p-3 rounded-lg border border-blue-200 bg-blue-50">
          <Info className="size-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            Este e um calculo aproximado. O calculo exato (considerando feriados nacionais, estaduais, municipais e recessos)
            sera realizado pelo servidor ao salvar o prazo.
          </p>
        </div>
      </div>
    )
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  const stepTitles: Record<number, { title: string; subtitle: string }> = {
    1: { title: "Dados Basicos", subtitle: "Selecione o processo, tipo e responsavel pelo prazo" },
    2: { title: "Evento Gatilho & Jurisdicao", subtitle: "Defina o marco inicial e parametros de contagem" },
    3: { title: "Regras Especiais", subtitle: "Selecione regras de contagem aplicaveis ao caso" },
    4: { title: "Resultado do Calculo", subtitle: "Confira as datas calculadas e salve o prazo" },
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* FIXED HEADER */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#2A2A2A]">
              Novo Prazo -- Assistente de Calculo
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <StepIndicator currentStep={step} />

          {/* Step title */}
          <div>
            <h3 className="text-sm font-semibold text-[#2A2A2A]">
              {stepTitles[step].title}
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              {stepTitles[step].subtitle}
            </p>
          </div>

          {/* Progress */}
          <Progress value={(step / 4) * 100} className="h-1" />
        </div>

        {/* SCROLLABLE BODY */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-4">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>
        </ScrollArea>

        {/* FIXED FOOTER */}
        <DialogFooter className="shrink-0 px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); resetForm() }}
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="size-4 mr-1" />
                  Voltar
                </Button>
              )}
              {step < 4 && (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(step)}
                  className="bg-[#C9A961] hover:bg-[#B8944E] text-white"
                >
                  Proximo
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              )}
              {step === 4 && (
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="bg-[#C9A961] hover:bg-[#B8944E] text-white"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 mr-1 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="size-4 mr-1" />
                      Salvar Prazo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          {createMutation.isError && (
            <div className="w-full mt-2 p-2 rounded bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">
                Erro ao salvar prazo: {createMutation.error?.message || "Erro desconhecido"}
              </p>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// SPECIAL RULE CARD (reusable sub-component)
// ============================================================

function SpecialRuleCard({
  checked,
  onCheckedChange,
  icon,
  title,
  article,
  description,
  disabled,
  children,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  icon: React.ReactNode
  title: string
  article: string
  description: string
  disabled?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      disabled
        ? "border-gray-200 bg-gray-50 opacity-60"
        : checked
          ? "border-[#C9A961] bg-[#C9A961]/5"
          : "border-gray-200 bg-white"
    }`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(!!v)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium text-[#2A2A2A]">{title}</span>
            <Badge variant="secondary" className="text-[10px]">{article}</Badge>
          </div>
          <p className="text-xs text-[#666666] mt-1">{description}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
