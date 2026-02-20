"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const MOODS = [
  { value: 1, emoji: "😫", label: "Muito mal" },
  { value: 2, emoji: "😟", label: "Mal" },
  { value: 3, emoji: "😐", label: "Neutro" },
  { value: 4, emoji: "🙂", label: "Bem" },
  { value: 5, emoji: "😊", label: "Muito bem" },
]

const SIZE_MAP = {
  sm: { button: "h-8 w-8 text-lg", ring: "ring-2" },
  md: { button: "h-10 w-10 text-2xl", ring: "ring-2" },
  lg: { button: "h-14 w-14 text-4xl", ring: "ring-[3px]" },
}

interface MoodSelectorProps {
  value: number | null
  onChange: (value: number) => void
  size?: "sm" | "md" | "lg"
}

export function MoodSelector({ value, onChange, size = "md" }: MoodSelectorProps) {
  const sizeConfig = SIZE_MAP[size]

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {MOODS.map((mood) => {
          const isSelected = value === mood.value
          return (
            <Tooltip key={mood.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(mood.value)}
                  aria-label={mood.label}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-150",
                    "hover:scale-110 hover:bg-amber-50 focus-visible:outline-none",
                    sizeConfig.button,
                    isSelected && [
                      sizeConfig.ring,
                      "ring-[#C9A84C] ring-offset-2 bg-amber-50 scale-110",
                    ],
                    !isSelected && "opacity-70 hover:opacity-100"
                  )}
                >
                  <span role="img" aria-hidden="true">
                    {mood.emoji}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{mood.label}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
