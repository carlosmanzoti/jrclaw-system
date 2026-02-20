"use client"

import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface WeekData {
  week: string   // e.g. "2025-W01"
  score: number  // 1-5
}

interface MemberData {
  memberId: string
  memberName: string
  weeks: WeekData[]
}

interface WellbeingHeatmapProps {
  data: MemberData[]
  className?: string
}

function getCellColor(score: number | null): string {
  if (score === null || score === 0) return "#f3f4f6"
  if (score >= 4.5) return "#15803d"
  if (score >= 3.5) return "#4ade80"
  if (score >= 2.5) return "#fde047"
  if (score >= 1.5) return "#fb923c"
  return "#ef4444"
}

function getCellLabel(score: number | null): string {
  if (score === null || score === 0) return "Sem dados"
  if (score >= 4.5) return "Muito bem"
  if (score >= 3.5) return "Bem"
  if (score >= 2.5) return "Neutro"
  if (score >= 1.5) return "Mal"
  return "Muito mal"
}

function formatWeekLabel(week: string): string {
  // week format: "2025-W01" → "S01"
  const match = week.match(/W(\d+)/)
  return match ? `S${match[1]}` : week
}

export function WellbeingHeatmap({ data, className }: WellbeingHeatmapProps) {
  // Collect all unique week keys (last 8)
  const allWeeks = React.useMemo(() => {
    const weekSet = new Set<string>()
    data.forEach((member) => member.weeks.forEach((w) => weekSet.add(w.week)))
    return Array.from(weekSet).sort().slice(-8)
  }, [data])

  return (
    <TooltipProvider>
      <div className={cn("overflow-auto", className)}>
        <table className="w-full border-separate" style={{ borderSpacing: "3px" }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 pb-1 pr-3 min-w-[120px]">
                Membro
              </th>
              {allWeeks.map((week) => (
                <th key={week} className="text-center text-xs font-medium text-gray-400 pb-1">
                  {formatWeekLabel(week)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((member) => {
              const scoreByWeek = Object.fromEntries(
                member.weeks.map((w) => [w.week, w.score])
              )
              return (
                <tr key={member.memberId}>
                  <td className="text-sm text-[#374151] font-medium pr-3 py-0.5 whitespace-nowrap">
                    {member.memberName}
                  </td>
                  {allWeeks.map((week) => {
                    const score = scoreByWeek[week] ?? null
                    const color = getCellColor(score)
                    const cellLabel = getCellLabel(score)
                    return (
                      <td key={week} className="text-center p-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="w-7 h-7 rounded-md mx-auto cursor-default border border-white/50"
                              style={{ backgroundColor: color }}
                              aria-label={`${member.memberName} — ${week}: ${cellLabel}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="font-medium">{member.memberName}</p>
                            <p className="text-xs opacity-80">{week}</p>
                            <p className="text-xs">
                              {score !== null ? `${score.toFixed(1)} — ${cellLabel}` : "Sem dados"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {/* Legend */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <span className="text-xs text-gray-400">Legenda:</span>
          {[
            { color: "#ef4444", label: "Muito mal (1)" },
            { color: "#fb923c", label: "Mal (2)" },
            { color: "#fde047", label: "Neutro (3)" },
            { color: "#4ade80", label: "Bem (4)" },
            { color: "#15803d", label: "Muito bem (5)" },
            { color: "#f3f4f6", label: "Sem dados" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div
                className="w-3.5 h-3.5 rounded-sm border border-gray-200"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
