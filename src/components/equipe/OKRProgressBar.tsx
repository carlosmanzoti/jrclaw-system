"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OKRProgressBarProps {
  progress: number    // 0 to 1
  showLabel?: boolean
  className?: string
}

function getColor(progress: number): { bar: string; text: string; bg: string } {
  if (progress >= 0.7) return { bar: "#16a34a", text: "text-green-700", bg: "bg-green-50" }
  if (progress >= 0.4) return { bar: "#ca8a04", text: "text-yellow-700", bg: "bg-yellow-50" }
  return { bar: "#dc2626", text: "text-red-700", bg: "bg-red-50" }
}

function getScoreLabel(progress: number): string {
  if (progress >= 0.7) return "No prazo"
  if (progress >= 0.4) return "Em risco"
  return "Atrasado"
}

export function OKRProgressBar({ progress, showLabel = true, className }: OKRProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress))
  const colors = getColor(clampedProgress)
  const percentage = Math.round(clampedProgress * 100)
  const scoreLabel = getScoreLabel(clampedProgress)

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1.5">
        {showLabel && (
          <span className={cn("text-xs font-semibold", colors.text)}>
            {scoreLabel}
          </span>
        )}
        <span className={cn("text-xs font-bold ml-auto", colors.text)}>
          {percentage}%
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        {/* Zone markers */}
        <div
          className="absolute top-0 bottom-0 bg-red-100"
          style={{ left: 0, width: "40%" }}
        />
        <div
          className="absolute top-0 bottom-0 bg-yellow-100"
          style={{ left: "40%", width: "30%" }}
        />
        <div
          className="absolute top-0 bottom-0 bg-green-100"
          style={{ left: "70%", right: 0 }}
        />
        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 bottom-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: colors.bar,
          }}
        />
        {/* Threshold markers */}
        <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: "40%" }} />
        <div className="absolute top-0 bottom-0 w-px bg-white/80" style={{ left: "70%" }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-gray-400">0</span>
        <span className="text-[10px] text-gray-400" style={{ marginLeft: "38%" }}>40%</span>
        <span className="text-[10px] text-gray-400" style={{ marginLeft: "27%" }}>70%</span>
        <span className="text-[10px] text-gray-400">100%</span>
      </div>
    </div>
  )
}
