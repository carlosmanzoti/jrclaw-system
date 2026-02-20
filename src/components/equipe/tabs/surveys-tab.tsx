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
import { Switch } from "@/components/ui/switch"
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
import { ENPSGauge } from "@/components/equipe/ENPSGauge"
import {
  SURVEY_TYPE_LABELS,
  GALLUP_Q12,
} from "@/lib/constants/competencies"
import {
  Plus,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  BarChart2,
  Send,
  ChevronRight,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

type SurveyType =
  | "PULSE"
  | "ENPS"
  | "CLIMA"
  | "CUSTOM_SURVEY"
  | "ONBOARDING_SURVEY"
  | "EXIT_SURVEY"

type QuestionType = "SCALE_1_5" | "NPS_0_10" | "OPEN" | "CHOICE"

interface SurveyQuestion {
  id: string
  text: string
  type: QuestionType
  options?: string[]
}

interface SurveyFormData {
  title: string
  type: SurveyType | ""
  anonymous: boolean
  frequency: string
  startDate: string
  endDate: string
  questions: SurveyQuestion[]
}

interface ResponseAnswer {
  question_id: string
  value: number | string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SURVEY_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  RASCUNHO: { label: "Rascunho", color: "bg-gray-100 text-gray-600 border-gray-200" },
  ATIVO: { label: "Ativa", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  ENCERRADO: { label: "Encerrada", color: "bg-blue-100 text-blue-700 border-blue-200" },
  CANCELADO: { label: "Cancelada", color: "bg-red-100 text-red-600 border-red-200" },
}

const ENPS_QUESTION: SurveyQuestion = {
  id: "enps_q1",
  text: "Em uma escala de 0 a 10, o quanto você recomendaria este escritório como um ótimo lugar para trabalhar?",
  type: "NPS_0_10",
}

const ENPS_OPEN_QUESTION: SurveyQuestion = {
  id: "enps_q2",
  text: "O que motivou sua nota? Como podemos melhorar?",
  type: "OPEN",
}

const SCALE_LABELS: Record<number, string> = {
  1: "Discordo totalmente",
  2: "Discordo",
  3: "Neutro",
  4: "Concordo",
  5: "Concordo totalmente",
}

const SCALE_COLORS: Record<number, string> = {
  1: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
  2: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
  3: "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200",
  4: "bg-lime-100 text-lime-700 border-lime-300 hover:bg-lime-200",
  5: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
}

// ─── Question Builder ─────────────────────────────────────────────────────────

function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: SurveyQuestion[]
  onChange: (q: SurveyQuestion[]) => void
}) {
  function addQuestion() {
    onChange([
      ...questions,
      {
        id: `q_${Date.now()}`,
        text: "",
        type: "SCALE_1_5",
      },
    ])
  }

  function removeQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id))
  }

  function updateQuestion(id: string, patch: Partial<SurveyQuestion>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#374151]">Perguntas</p>
        <Button variant="outline" size="sm" onClick={addQuestion} className="text-xs">
          <Plus className="size-3 mr-1" /> Adicionar
        </Button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">
          Nenhuma pergunta adicionada.
        </p>
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 mt-1.5 shrink-0">
                {idx + 1}.
              </span>
              <Input
                className="text-xs flex-1"
                placeholder="Texto da pergunta..."
                value={q.text}
                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeQuestion(q.id)}
                className="mt-1.5 shrink-0 text-red-400 hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <Select
              value={q.type}
              onValueChange={(v) => updateQuestion(q.id, { type: v as QuestionType })}
            >
              <SelectTrigger className="text-xs h-7 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCALE_1_5" className="text-xs">
                  Escala 1–5 (Likert)
                </SelectItem>
                <SelectItem value="NPS_0_10" className="text-xs">
                  NPS 0–10
                </SelectItem>
                <SelectItem value="OPEN" className="text-xs">
                  Aberta (texto)
                </SelectItem>
                <SelectItem value="CHOICE" className="text-xs">
                  Múltipla escolha
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Nova Pesquisa Dialog ─────────────────────────────────────────────────────

function NovaPesquisaDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const utils = trpc.useUtils()

  const [form, setForm] = useState<SurveyFormData>({
    title: "",
    type: "",
    anonymous: true,
    frequency: "UNICA",
    startDate: "",
    endDate: "",
    questions: [],
  })

  const createMutation = trpc.team.surveys.create.useMutation({
    onSuccess: () => {
      utils.team.surveys.list.invalidate()
      onClose()
      setForm({
        title: "",
        type: "",
        anonymous: true,
        frequency: "UNICA",
        startDate: "",
        endDate: "",
        questions: [],
      })
    },
  })

  function handleTypeChange(type: SurveyType) {
    let questions: SurveyQuestion[] = []

    if (type === "CLIMA") {
      questions = GALLUP_Q12.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type as QuestionType,
      }))
    } else if (type === "ENPS") {
      questions = [ENPS_QUESTION, ENPS_OPEN_QUESTION]
    }

    setForm((prev) => ({ ...prev, type, questions }))
  }

  const canSubmit =
    form.title.trim() &&
    form.type &&
    form.startDate &&
    form.endDate &&
    form.questions.length > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Pesquisa</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input
              placeholder="ex: Pulse Survey — Fevereiro 2026"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipo de pesquisa</Label>
            <Select
              value={form.type}
              onValueChange={(v) => handleTypeChange(v as SurveyType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SURVEY_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Data de início</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data de encerramento</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>Frequência</Label>
            <Select
              value={form.frequency}
              onValueChange={(v) => setForm((p) => ({ ...p, frequency: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNICA">Única aplicação</SelectItem>
                <SelectItem value="MENSAL">Mensal</SelectItem>
                <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                <SelectItem value="ANUAL">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Anonymous */}
          <div className="flex items-center gap-3">
            <Switch
              id="anonymous"
              checked={form.anonymous}
              onCheckedChange={(v) => setForm((p) => ({ ...p, anonymous: v }))}
            />
            <Label htmlFor="anonymous" className="cursor-pointer">
              Respostas anônimas
            </Label>
          </div>

          <Separator />

          {/* Info for pre-loaded types */}
          {form.type === "CLIMA" && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs font-semibold text-blue-800 mb-1">
                Gallup Q12 carregado automaticamente
              </p>
              <p className="text-xs text-blue-700">
                12 perguntas adaptadas ao contexto jurídico foram inseridas. Você
                pode editá-las abaixo.
              </p>
            </div>
          )}

          {form.type === "ENPS" && (
            <div className="rounded-lg bg-purple-50 border border-purple-100 p-3">
              <p className="text-xs font-semibold text-purple-800 mb-1">
                Perguntas eNPS carregadas automaticamente
              </p>
              <p className="text-xs text-purple-700">
                Pergunta NPS 0–10 + pergunta aberta de justificativa inseridas.
              </p>
            </div>
          )}

          {/* Questions */}
          <QuestionBuilder
            questions={form.questions}
            onChange={(q) => setForm((p) => ({ ...p, questions: q }))}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
            onClick={() =>
              createMutation.mutate({
                title: form.title,
                type: form.type as SurveyType,
                questions: form.questions,
                anonymous: form.anonymous,
                frequency: form.frequency as any,
                startDate: form.startDate,
                endDate: form.endDate,
              })
            }
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            Criar Pesquisa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Response Form ────────────────────────────────────────────────────────────

function SurveyResponseForm({
  survey,
  onClose,
}: {
  survey: Record<string, unknown>
  onClose: () => void
}) {
  const utils = trpc.useUtils()
  const questions = (survey.questions as SurveyQuestion[]) ?? []
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [currentStep, setCurrentStep] = useState(0)

  const respondMutation = trpc.team.surveys.respond.useMutation({
    onSuccess: () => {
      utils.team.surveys.list.invalidate()
      onClose()
    },
  })

  function setAnswer(qId: string, value: number | string) {
    setAnswers((p) => ({ ...p, [qId]: value }))
  }

  const answeredCount = Object.keys(answers).length
  const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const currentQuestion = questions[currentStep]

  function handleSubmit() {
    const payload: ResponseAnswer[] = Object.entries(answers).map(
      ([question_id, value]) => ({ question_id, value })
    )
    respondMutation.mutate({
      surveyId: survey.id as string,
      answers: payload,
    })
  }

  if (!currentQuestion) return null

  const isAnswered = answers[currentQuestion.id] !== undefined

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {survey.title as string}
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Pergunta {currentStep + 1} de {questions.length}
            </span>
            <span>{Math.round(progressPct)}% concluído</span>
          </div>
          <Progress value={progressPct} className="h-1.5" />
        </div>

        {/* Question */}
        <div className="py-4 space-y-4 min-h-[160px]">
          <p className="text-sm font-medium text-[#374151] leading-relaxed">
            {currentQuestion.text}
          </p>

          {/* Scale 1-5 */}
          {currentQuestion.type === "SCALE_1_5" && (
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(currentQuestion.id, n)}
                  className={`flex-1 min-w-[60px] rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    answers[currentQuestion.id] === n
                      ? SCALE_COLORS[n] + " ring-2 ring-offset-1"
                      : SCALE_COLORS[n]
                  }`}
                >
                  <span className="block text-lg font-bold">{n}</span>
                  <span className="block text-[10px] leading-tight mt-0.5">
                    {SCALE_LABELS[n]}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* NPS 0-10 */}
          {currentQuestion.type === "NPS_0_10" && (
            <div className="space-y-3">
              <div className="flex gap-1.5 flex-wrap justify-center">
                {Array.from({ length: 11 }, (_, i) => i).map((n) => {
                  const color =
                    n <= 6
                      ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
                      : n <= 8
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200"
                      : "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                  const selected = answers[currentQuestion.id] === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(currentQuestion.id, n)}
                      className={`h-10 w-10 rounded-lg border text-sm font-bold transition-all ${color} ${
                        selected ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""
                      }`}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Definitivamente não recomendaria</span>
                <span>Definitivamente recomendaria</span>
              </div>
            </div>
          )}

          {/* Open text */}
          {currentQuestion.type === "OPEN" && (
            <div className="space-y-1.5">
              <Textarea
                rows={4}
                className="resize-none text-sm"
                placeholder="Escreva sua resposta..."
                value={(answers[currentQuestion.id] as string) ?? ""}
                onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
              />
              <p className="text-xs text-gray-400 text-right">
                {((answers[currentQuestion.id] as string) ?? "").length} caracteres
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((p) => p - 1)}
          >
            Anterior
          </Button>

          {currentStep < questions.length - 1 ? (
            <Button
              size="sm"
              className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
              disabled={!isAnswered}
              onClick={() => setCurrentStep((p) => p + 1)}
            >
              Próxima <ChevronRight className="size-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={answeredCount < questions.length || respondMutation.isPending}
              onClick={handleSubmit}
            >
              {respondMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <Send className="size-3.5 mr-1" />
              )}
              Enviar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Results View ─────────────────────────────────────────────────────────────

function SurveyResults({
  surveyId,
  onClose,
}: {
  surveyId: string
  onClose: () => void
}) {
  const { data: results, isLoading } = trpc.team.surveys.results.useQuery({
    surveyId,
  })

  if (isLoading) {
    return (
      <Dialog open onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resultados</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!results) return null

  const responseRate = (results as Record<string, unknown>).response_rate as number
  const questionResults = (results as Record<string, unknown>).questions as Record<string, unknown>[]
  const trendData = (results as Record<string, unknown>).trend as Record<string, unknown>[]
  const enpsScore = (results as Record<string, unknown>).enps_score as number | undefined

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resultados da Pesquisa</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Response rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#374151]">Taxa de resposta</p>
              <span
                className={`text-sm font-bold ${
                  responseRate >= 80 ? "text-green-600" : "text-amber-600"
                }`}
              >
                {responseRate}%
              </span>
            </div>
            <Progress value={responseRate} className="h-2" />
            {responseRate < 80 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  Taxa de resposta abaixo de 80%. Os resultados podem não ser
                  representativos. Envie lembretes para aumentar a participação.
                </p>
              </div>
            )}
          </div>

          {/* eNPS gauge */}
          {enpsScore !== undefined && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-semibold text-[#374151]">eNPS</p>
              <ENPSGauge score={enpsScore} />
            </div>
          )}

          {/* Question averages */}
          {questionResults && questionResults.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#374151]">
                Média por pergunta
              </p>
              {questionResults.map((qr, idx) => {
                const avg = qr.average as number
                const max = (qr.scale_max as number) ?? 5
                const pct = (avg / max) * 100
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-gray-700 leading-snug flex-1">
                        {qr.text as string}
                      </p>
                      <span className="text-xs font-bold text-[#374151] shrink-0">
                        {avg.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#C9A84C] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">
                        /{max}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {qr.response_count as number} respostas
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Trend line chart */}
          {trendData && trendData.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#374151]">
                Tendência — últimos 6 meses
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 5]}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#C9A84C"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Survey Card ──────────────────────────────────────────────────────────────

function SurveyCard({ survey }: { survey: Record<string, unknown> }) {
  const [respondMode, setRespondMode] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const status = (survey.status as string) ?? "RASCUNHO"
  const statusConfig =
    SURVEY_STATUS_CONFIG[status] ?? {
      label: status,
      color: "bg-gray-100 text-gray-600 border-gray-200",
    }
  const type = (survey.type as string) ?? ""
  const responseRate = (survey.response_rate as number) ?? 0

  return (
    <>
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[#374151] truncate">
                  {survey.title as string}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                >
                  {statusConfig.label}
                </span>
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {SURVEY_TYPE_LABELS[type] ?? type}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(survey.start_date as string).toLocaleDateString(
                    "pt-BR"
                  )}{" "}
                  –{" "}
                  {new Date(survey.end_date as string).toLocaleDateString(
                    "pt-BR"
                  )}
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-[#374151]">{responseRate}%</p>
              <p className="text-xs text-gray-400">responderam</p>
            </div>
          </div>

          {/* Response rate bar */}
          <Progress value={responseRate} className="h-1" />
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex gap-2 flex-wrap">
            {status === "ATIVO" && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setRespondMode(true)}
              >
                <Send className="size-3 mr-1" /> Responder
              </Button>
            )}
            {(status === "ATIVO" || status === "ENCERRADO") && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => setShowResults(true)}
              >
                <BarChart2 className="size-3 mr-1" /> Ver resultados
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {respondMode && (
        <SurveyResponseForm
          survey={survey}
          onClose={() => setRespondMode(false)}
        />
      )}

      {showResults && (
        <SurveyResults
          surveyId={survey.id as string}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function EquipeSurveysTab() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: surveys, isLoading } = trpc.team.surveys.list.useQuery({})

  const surveyItems = surveys?.items as Record<string, unknown>[] | undefined
  const activeSurveys = surveyItems?.filter(
    (s) => s.status === "ATIVO"
  )
  const closedSurveys = surveyItems?.filter(
    (s) => s.status !== "ATIVO"
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#374151]">
            Pulse Surveys &amp; eNPS
          </h2>
          <p className="text-sm text-gray-500">
            Pesquisas de clima, engajamento e NPS do colaborador
          </p>
        </div>
        <Button
          className="bg-[#C9A84C] hover:bg-[#B8963F] text-white"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="size-4 mr-2" /> Nova Pesquisa
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : !surveyItems || surveyItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <ClipboardList className="size-12 text-gray-300" />
          <p className="text-base font-medium text-gray-500">
            Nenhuma pesquisa cadastrada
          </p>
          <p className="text-sm text-gray-400">
            Crie uma pesquisa Pulse, eNPS ou de Clima Organizacional.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="size-3.5 mr-1" /> Criar pesquisa
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active surveys */}
          {activeSurveys && activeSurveys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-sm font-semibold text-[#374151]">
                  Pesquisas ativas
                </p>
              </div>
              {activeSurveys.map((s) => (
                <SurveyCard key={s.id as string} survey={s} />
              ))}
            </div>
          )}

          {/* Closed/draft surveys */}
          {closedSurveys && closedSurveys.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                <p className="text-sm font-semibold text-[#374151]">
                  Pesquisas encerradas
                </p>
              </div>
              {closedSurveys.map((s) => (
                <SurveyCard key={s.id as string} survey={s} />
              ))}
            </div>
          )}
        </div>
      )}

      <NovaPesquisaDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
