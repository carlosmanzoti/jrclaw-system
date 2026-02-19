"use client"

import { useState } from "react"
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
  Sparkles,
  BookOpen,
  Scale,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── 1. AIInsightBanner ──────────────────────────────────────────
// Displays AI-generated insights (risk warnings, suggestions, info)

interface AIInsightBannerProps {
  level: "info" | "warning" | "danger" | "success"
  title: string
  message: string
  suggestion?: string
  onDismiss?: () => void
}

const LEVEL_CONFIG = {
  info: {
    bg: "bg-blue-50 border-blue-200",
    icon: Brain,
    iconColor: "text-blue-600",
    titleColor: "text-blue-800",
    textColor: "text-blue-700",
    badgeBg: "bg-blue-100 text-blue-700",
  },
  warning: {
    bg: "bg-amber-50 border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    titleColor: "text-amber-800",
    textColor: "text-amber-700",
    badgeBg: "bg-amber-100 text-amber-700",
  },
  danger: {
    bg: "bg-red-50 border-red-200",
    icon: AlertCircle,
    iconColor: "text-red-600",
    titleColor: "text-red-800",
    textColor: "text-red-700",
    badgeBg: "bg-red-100 text-red-700",
  },
  success: {
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle,
    iconColor: "text-green-600",
    titleColor: "text-green-800",
    textColor: "text-green-700",
    badgeBg: "bg-green-100 text-green-700",
  },
} as const

export function AIInsightBanner({ level, title, message, suggestion, onDismiss }: AIInsightBannerProps) {
  const config = LEVEL_CONFIG[level]
  const Icon = config.icon

  return (
    <div className={cn("rounded-lg border p-4 flex gap-3", config.bg)}>
      <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className={cn("text-sm font-semibold", config.titleColor)}>{title}</h4>
            <Badge className={cn("text-[10px]", config.badgeBg)}>
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className={cn("text-sm mt-1", config.textColor)}>{message}</p>
        {suggestion && (
          <div className="mt-2 flex items-start gap-1.5">
            <Sparkles className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.iconColor)} />
            <p className={cn("text-xs font-medium", config.textColor)}>
              Sugestao: {suggestion}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 2. AIProgressRing ───────────────────────────────────────────
// Circular progress indicator for workspace completion percentage

interface AIProgressRingProps {
  progress: number
  size?: number
  label?: string
}

export function AIProgressRing({ progress, size = 80, label }: AIProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, progress))
  const strokeWidth = size * 0.1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  const color =
    clamped >= 80 ? "text-green-500" :
    clamped >= 50 ? "text-blue-500" :
    clamped >= 25 ? "text-amber-500" :
    "text-red-500"

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-100"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn("transition-all duration-500 ease-out", color)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-800">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-muted-foreground text-center">{label}</span>
      )}
    </div>
  )
}

// ─── 3. AICitationCheck ─────────────────────────────────────────
// Displays citation verification results

interface Citation {
  texto: string
  tipo: "legislacao" | "jurisprudencia"
  status: "CORRETO" | "ATENCAO" | "VERIFICAR"
  nota: string
}

interface AICitationCheckProps {
  citations: Citation[]
  sugestoes?: string[]
}

const CITATION_STATUS_CONFIG = {
  CORRETO: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "Correto" },
  ATENCAO: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Atenção" },
  VERIFICAR: { color: "bg-red-100 text-red-700", icon: AlertCircle, label: "Verificar" },
} as const

export function AICitationCheck({ citations, sugestoes }: AICitationCheckProps) {
  const counts = {
    CORRETO: citations.filter(c => c.status === "CORRETO").length,
    ATENCAO: citations.filter(c => c.status === "ATENCAO").length,
    VERIFICAR: citations.filter(c => c.status === "VERIFICAR").length,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-purple-600" />
          Verificação de Citações
          <Badge className="bg-purple-100 text-purple-700 text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" /> IA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary counts */}
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-700">
            <CheckCircle className="h-3.5 w-3.5" /> {counts.CORRETO} corretas
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {counts.ATENCAO} atenção
          </span>
          <span className="flex items-center gap-1 text-red-700">
            <AlertCircle className="h-3.5 w-3.5" /> {counts.VERIFICAR} verificar
          </span>
        </div>

        {/* Citations list */}
        <div className="space-y-2">
          {citations.map((citation, idx) => {
            const cfg = CITATION_STATUS_CONFIG[citation.status]
            const StatusIcon = cfg.icon
            return (
              <div key={idx} className="rounded-md border p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 flex-1">{citation.texto}</p>
                  <Badge className={cn("text-[10px] shrink-0", cfg.color)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {cfg.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {citation.tipo === "legislacao" ? "Legislação" : "Jurisprudência"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{citation.nota}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Suggestions */}
        {sugestoes && sugestoes.length > 0 && (
          <div className="bg-blue-50 rounded-md p-3 space-y-1">
            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Sugestões
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {sugestoes.map((s, i) => (
                <li key={i} className="text-xs text-blue-700">{s}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 4. AICorrectionsMap ─────────────────────────────────────────
// Displays revision corrections from AI review, grouped by severity

interface Revisao {
  tipo: "erro" | "melhoria" | "estilo"
  severidade: "CRITICA" | "IMPORTANTE" | "MENOR"
  trecho: string
  sugestao: string
  explicacao: string
}

interface AICorrectionsMapProps {
  revisoes: Revisao[]
  resumo?: string
}

const SEVERITY_CONFIG = {
  CRITICA: { color: "bg-red-100 text-red-700 border-red-200", label: "Crítica", order: 0 },
  IMPORTANTE: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Importante", order: 1 },
  MENOR: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Menor", order: 2 },
} as const

const TIPO_LABELS = {
  erro: "Erro",
  melhoria: "Melhoria",
  estilo: "Estilo",
} as const

export function AICorrectionsMap({ revisoes, resumo }: AICorrectionsMapProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const toggleItem = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const grouped = {
    CRITICA: revisoes.filter(r => r.severidade === "CRITICA"),
    IMPORTANTE: revisoes.filter(r => r.severidade === "IMPORTANTE"),
    MENOR: revisoes.filter(r => r.severidade === "MENOR"),
  }

  const sortedKeys = (["CRITICA", "IMPORTANTE", "MENOR"] as const).filter(
    k => grouped[k].length > 0
  )

  let globalIdx = 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Scale className="h-4 w-4 text-orange-600" />
          Mapa de Correções
          <Badge className="bg-orange-100 text-orange-700 text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" /> IA
          </Badge>
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            {revisoes.length} {revisoes.length === 1 ? "revisão" : "revisões"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {resumo && (
          <p className="text-xs text-muted-foreground bg-gray-50 rounded-md p-2">{resumo}</p>
        )}

        {sortedKeys.map(severity => {
          const cfg = SEVERITY_CONFIG[severity]
          const items = grouped[severity]
          return (
            <div key={severity} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[10px]", cfg.color)}>{cfg.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  ({items.length})
                </span>
              </div>
              {items.map(rev => {
                const idx = globalIdx++
                const isOpen = expanded[idx] ?? false
                return (
                  <div key={idx} className={cn("rounded-md border p-3", cfg.color.split(" ")[0])}>
                    <button
                      onClick={() => toggleItem(idx)}
                      className="w-full flex items-start justify-between gap-2 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            {TIPO_LABELS[rev.tipo]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-1">
                          &ldquo;{rev.trecho}&rdquo;
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                            Trecho original
                          </p>
                          <p className="text-xs bg-red-50 text-red-800 rounded p-2 line-through">
                            {rev.trecho}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                            Sugestão
                          </p>
                          <p className="text-xs bg-green-50 text-green-800 rounded p-2">
                            {rev.sugestao}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">
                            Explicação
                          </p>
                          <p className="text-xs text-gray-600">{rev.explicacao}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {revisoes.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm">Nenhuma correção necessária</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 5. AICoherenceReport ────────────────────────────────────────
// Displays coherence analysis results with score gauge

interface Inconsistencia {
  severidade: "ALTA" | "MEDIA" | "BAIXA"
  descricao: string
  sugestao: string
}

interface CoberturaTese {
  tese: string
  coberta: boolean
  secao?: string
}

interface AICoherenceReportProps {
  score: number
  inconsistencias: Inconsistencia[]
  coberturaTeses: CoberturaTese[]
  resumo?: string
}

const INCON_SEV_COLOR = {
  ALTA: "text-red-600 bg-red-50 border-red-200",
  MEDIA: "text-amber-600 bg-amber-50 border-amber-200",
  BAIXA: "text-blue-600 bg-blue-50 border-blue-200",
} as const

const INCON_SEV_LABEL = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
} as const

export function AICoherenceReport({ score, inconsistencias, coberturaTeses, resumo }: AICoherenceReportProps) {
  const clampedScore = Math.min(100, Math.max(0, score))

  const scoreColor =
    clampedScore >= 80 ? "text-green-600" :
    clampedScore >= 60 ? "text-amber-600" :
    "text-red-600"

  const scoreLabel =
    clampedScore >= 80 ? "Excelente" :
    clampedScore >= 60 ? "Bom" :
    clampedScore >= 40 ? "Regular" :
    "Necessita revisão"

  const coveredCount = coberturaTeses.filter(t => t.coberta).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-600" />
          Análise de Coerência
          <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" /> IA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score gauge */}
        <div className="flex items-center gap-4">
          <AIProgressRing progress={clampedScore} size={72} />
          <div>
            <p className={cn("text-lg font-bold", scoreColor)}>{scoreLabel}</p>
            <p className="text-xs text-muted-foreground">
              Pontuação de coerência: {clampedScore}/100
            </p>
          </div>
        </div>

        {resumo && (
          <p className="text-xs text-muted-foreground bg-gray-50 rounded-md p-2">{resumo}</p>
        )}

        {/* Inconsistencies */}
        {inconsistencias.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Inconsistências ({inconsistencias.length})
            </h4>
            {inconsistencias.map((inc, idx) => (
              <div
                key={idx}
                className={cn("rounded-md border p-3 space-y-1", INCON_SEV_COLOR[inc.severidade])}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {INCON_SEV_LABEL[inc.severidade]}
                  </Badge>
                </div>
                <p className="text-sm">{inc.descricao}</p>
                <p className="text-xs opacity-80 flex items-start gap-1">
                  <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                  {inc.sugestao}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Thesis coverage checklist */}
        {coberturaTeses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Cobertura de Teses ({coveredCount}/{coberturaTeses.length})
            </h4>
            <div className="space-y-1">
              {coberturaTeses.map((tese, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-start gap-2 rounded-md p-2 text-sm",
                    tese.coberta ? "bg-green-50" : "bg-red-50"
                  )}
                >
                  {tese.coberta ? (
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm",
                      tese.coberta ? "text-green-800" : "text-red-800"
                    )}>
                      {tese.tese}
                    </p>
                    {tese.secao && (
                      <p className="text-xs text-muted-foreground">Seção: {tese.secao}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 6. AIProtocolValidation ─────────────────────────────────────
// Pre-protocol validation checklist

interface ValidationItem {
  label: string
  status: "pass" | "warn" | "fail"
  detalhe: string
}

interface AIProtocolValidationProps {
  itens: ValidationItem[]
  pronto: boolean
  observacoes?: string
}

const VALIDATION_STATUS_CONFIG = {
  pass: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50", label: "OK" },
  warn: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", label: "Atenção" },
  fail: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Falha" },
} as const

export function AIProtocolValidation({ itens, pronto, observacoes }: AIProtocolValidationProps) {
  const passCount = itens.filter(i => i.status === "pass").length
  const warnCount = itens.filter(i => i.status === "warn").length
  const failCount = itens.filter(i => i.status === "fail").length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-teal-600" />
          Validação Pré-Protocolo
          <Badge className="bg-teal-100 text-teal-700 text-[10px]">
            <Sparkles className="h-3 w-3 mr-1" /> IA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall status banner */}
        <div
          className={cn(
            "rounded-md p-3 flex items-center gap-3 border",
            pronto
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          )}
        >
          {pronto ? (
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <div>
            <p className={cn(
              "text-sm font-semibold",
              pronto ? "text-green-800" : "text-red-800"
            )}>
              {pronto ? "Pronto para protocolo" : "Pendências para resolver"}
            </p>
            <p className="text-xs text-muted-foreground">
              {passCount} aprovados, {warnCount} alertas, {failCount} falhas
            </p>
          </div>
        </div>

        {/* Validation items */}
        <div className="space-y-1.5">
          {itens.map((item, idx) => {
            const cfg = VALIDATION_STATUS_CONFIG[item.status]
            const StatusIcon = cfg.icon
            return (
              <div
                key={idx}
                className={cn("flex items-start gap-3 rounded-md p-2.5", cfg.bg)}
              >
                <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", cfg.color)}>
                      {cfg.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detalhe}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Observations */}
        {observacoes && (
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1 mb-1">
              <Info className="h-3 w-3" /> Observações
            </p>
            <p className="text-xs text-gray-600">{observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 7. AILoadingState ───────────────────────────────────────────
// Loading placeholder for AI operations with three animation variants

interface AILoadingStateProps {
  message?: string
  variant?: "spinner" | "pulse" | "dots"
}

export function AILoadingState({
  message = "Analisando com IA...",
  variant = "spinner",
}: AILoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      {variant === "spinner" && (
        <div className="relative">
          <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
          <Sparkles className="h-3 w-3 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
        </div>
      )}

      {variant === "pulse" && (
        <div className="flex items-center justify-center">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-purple-200 animate-ping opacity-40" />
            <div className="absolute inset-2 rounded-full bg-purple-300 animate-ping opacity-40 animation-delay-150" />
            <div className="relative flex items-center justify-center h-12 w-12 rounded-full bg-purple-100">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {variant === "dots" && (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-purple-500 animate-bounce [animation-delay:300ms]" />
        </div>
      )}

      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
        {message}
      </p>
    </div>
  )
}
