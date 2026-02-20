"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface SBIData {
  situation: string
  behavior: string
  impact: string
  feedforward?: string
}

interface SBIFormProps {
  onSubmit: (data: SBIData) => void
  initialValues?: Partial<SBIData>
  loading?: boolean
  className?: string
}

const FIELDS = [
  {
    key: "situation" as const,
    icon: "📍",
    label: "Situação",
    placeholder: "Descreva o contexto específico — quando e onde o comportamento ocorreu. Ex: 'Na reunião de cliente da última terça-feira...'",
    required: true,
  },
  {
    key: "behavior" as const,
    icon: "👁️",
    label: "Comportamento",
    placeholder: "Descreva o comportamento observável — o que a pessoa fez ou disse, de forma objetiva e sem julgamento. Ex: 'Você apresentou os dados do processo de forma clara e antecipou as dúvidas do cliente...'",
    required: true,
  },
  {
    key: "impact" as const,
    icon: "⚡",
    label: "Impacto",
    placeholder: "Descreva o impacto que esse comportamento gerou — em você, na equipe, no cliente ou nos resultados. Ex: 'Isso gerou confiança no cliente e contribuiu para a aprovação da proposta...'",
    required: true,
  },
  {
    key: "feedforward" as const,
    icon: "🔮",
    label: "Feedforward (opcional)",
    placeholder: "Sugira como a pessoa pode aproveitar ou evoluir esse comportamento no futuro. Ex: 'Seria ainda mais impactante se você também trouxesse os cenários de risco...'",
    required: false,
  },
]

export function SBIForm({ onSubmit, initialValues = {}, loading = false, className }: SBIFormProps) {
  const [values, setValues] = React.useState<SBIData>({
    situation: initialValues.situation ?? "",
    behavior: initialValues.behavior ?? "",
    impact: initialValues.impact ?? "",
    feedforward: initialValues.feedforward ?? "",
  })

  function handleChange(key: keyof SBIData, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: SBIData = {
      situation: values.situation,
      behavior: values.behavior,
      impact: values.impact,
    }
    if (values.feedforward?.trim()) {
      payload.feedforward = values.feedforward
    }
    onSubmit(payload)
  }

  const isValid = values.situation.trim() && values.behavior.trim() && values.impact.trim()

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      <div className="rounded-lg border border-[#C9A84C]/30 bg-amber-50/40 px-4 py-3">
        <p className="text-xs text-[#374151] font-medium leading-relaxed">
          O modelo <strong>SBI</strong> (Situação → Comportamento → Impacto) estrutura o feedback de forma objetiva, respeitosa e acionável.
        </p>
      </div>

      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <Label htmlFor={`sbi-${field.key}`} className="flex items-center gap-1.5 text-sm font-semibold text-[#374151]">
            <span role="img" aria-hidden="true">{field.icon}</span>
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id={`sbi-${field.key}`}
            value={values[field.key] ?? ""}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={3}
            className="resize-none text-sm focus-visible:ring-[#C9A84C]/50 focus-visible:border-[#C9A84C]"
          />
          <p className="text-xs text-gray-400">
            {(values[field.key] ?? "").length} caracteres
          </p>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!isValid || loading}
          className="bg-[#C9A84C] hover:bg-[#b8973e] text-white font-semibold"
        >
          {loading ? "Enviando..." : "Enviar Feedback"}
        </Button>
      </div>
    </form>
  )
}
