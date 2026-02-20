"use client"

import * as React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CompetencyBadge } from "./CompetencyBadge"
import { cn } from "@/lib/utils"

interface Reaction {
  emoji: string
  count: number
}

interface RecognitionData {
  id: string
  fromName: string
  fromAvatar?: string
  toName: string
  toAvatar?: string
  message: string
  category: string
  competency?: string
  createdAt: string
  reactions?: Reaction[]
}

interface RecognitionCardProps {
  recognition: RecognitionData
  onReact?: (emoji: string) => void
  className?: string
}

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  EXCELENCIA: { label: "Excelência", emoji: "🏆", color: "text-[#C9A84C]" },
  COLABORACAO: { label: "Colaboração", emoji: "🤝", color: "text-blue-600" },
  INOVACAO: { label: "Inovação", emoji: "💡", color: "text-purple-600" },
  CLIENTE: { label: "Foco no Cliente", emoji: "❤️", color: "text-rose-500" },
  LIDERANCA: { label: "Liderança", emoji: "🌟", color: "text-amber-500" },
}

const QUICK_REACTIONS = ["👏", "❤️", "🔥", "🎉", "💪"]

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
}

export function RecognitionCard({ recognition, onReact, className }: RecognitionCardProps) {
  const category = CATEGORY_CONFIG[recognition.category] ?? { label: recognition.category, emoji: "⭐", color: "text-gray-600" }
  const date = new Date(recognition.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

  return (
    <Card className={cn("shadow-sm border-gray-100 hover:shadow-md transition-shadow", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={category.label}>{category.emoji}</span>
            <span className={cn("text-sm font-semibold", category.color)}>{category.label}</span>
          </div>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* From → To */}
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src={recognition.fromAvatar} alt={recognition.fromName} />
            <AvatarFallback>{getInitials(recognition.fromName)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-500">{recognition.fromName}</span>
          <span className="text-gray-300 text-sm">→</span>
          <Avatar size="sm">
            <AvatarImage src={recognition.toAvatar} alt={recognition.toName} />
            <AvatarFallback className="bg-[#C9A84C]/20 text-[#C9A84C]">
              {getInitials(recognition.toName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-semibold text-[#374151]">{recognition.toName}</span>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 leading-relaxed border-l-2 border-[#C9A84C] pl-3 italic">
          "{recognition.message}"
        </p>

        {/* Competency badge */}
        {recognition.competency && (
          <CompetencyBadge competency={recognition.competency} />
        )}

        {/* Reactions */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          {/* Existing reactions */}
          {recognition.reactions && recognition.reactions.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {recognition.reactions.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => onReact?.(r.emoji)}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-sm hover:bg-amber-50 hover:border-[#C9A84C] transition-colors"
                >
                  <span>{r.emoji}</span>
                  <span className="text-xs text-gray-600">{r.count}</span>
                </button>
              ))}
            </div>
          )}
          {/* Add reaction */}
          {onReact && (
            <div className="flex gap-1 ml-auto">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-base hover:bg-amber-50 transition-colors opacity-40 hover:opacity-100 focus-visible:outline-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
