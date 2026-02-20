"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CompetencyBadge } from "./CompetencyBadge"
import { cn } from "@/lib/utils"

interface FeedbackData {
  id: string
  authorName: string
  authorAvatar?: string
  type: string
  competency?: string
  situation: string
  behavior: string
  impact: string
  feedforward?: string
  caseNumber?: string
  createdAt: string
  acknowledged: boolean
  reaction?: string
}

interface FeedbackCardProps {
  feedback: FeedbackData
  onReact?: (reaction: string) => void
  className?: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  POSITIVO: { label: "Positivo", color: "bg-green-100 text-green-800 border-green-200" },
  CONSTRUTIVO: { label: "Construtivo", color: "bg-amber-100 text-amber-800 border-amber-200" },
  RECONHECIMENTO: { label: "Reconhecimento", color: "bg-blue-100 text-blue-800 border-blue-200" },
}

const REACTIONS = ["👏", "💡", "❤️", "🔥"]

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

export function FeedbackCard({ feedback, onReact, className }: FeedbackCardProps) {
  const typeConfig = TYPE_CONFIG[feedback.type] ?? { label: feedback.type, color: "bg-gray-100 text-gray-700 border-gray-200" }
  const date = new Date(feedback.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

  return (
    <Card className={cn("shadow-sm border-gray-100", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar>
              <AvatarImage src={feedback.authorAvatar} alt={feedback.authorName} />
              <AvatarFallback>{getInitials(feedback.authorName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-[#374151]">{feedback.authorName}</p>
              <p className="text-xs text-gray-500">{date}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", typeConfig.color)}>
              {typeConfig.label}
            </span>
            {feedback.competency && <CompetencyBadge competency={feedback.competency} />}
            {feedback.acknowledged && (
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                Confirmado
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {feedback.caseNumber && (
          <p className="text-xs text-gray-400 font-mono">Processo: {feedback.caseNumber}</p>
        )}
        <SBISection icon="📍" label="Situação" text={feedback.situation} />
        <SBISection icon="👁️" label="Comportamento" text={feedback.behavior} />
        <SBISection icon="⚡" label="Impacto" text={feedback.impact} />
        {feedback.feedforward && (
          <SBISection icon="🔮" label="Feedforward" text={feedback.feedforward} />
        )}
        {onReact && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-400">Reagir:</span>
            <div className="flex gap-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className={cn(
                    "h-7 w-7 flex items-center justify-center rounded-full text-base",
                    "hover:bg-amber-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]",
                    feedback.reaction === emoji && "bg-amber-100 ring-1 ring-[#C9A84C]"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SBISection({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="flex gap-2.5">
      <span className="text-base leading-tight mt-0.5 shrink-0" role="img" aria-label={label}>{icon}</span>
      <div>
        <span className="text-xs font-semibold text-[#374151] uppercase tracking-wide">{label}: </span>
        <span className="text-sm text-gray-700">{text}</span>
      </div>
    </div>
  )
}
