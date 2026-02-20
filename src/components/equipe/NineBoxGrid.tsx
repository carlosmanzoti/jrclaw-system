"use client"

import * as React from "react"
import { NINE_BOX_CONFIG } from "@/lib/constants/competencies"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  name: string
  avatarUrl?: string
  performance: number   // 1-3: 1=low, 2=medium, 3=high
  potential: number     // 1-3: 1=low, 2=medium, 3=high
  position: string
}

interface NineBoxGridProps {
  members: Member[]
  onMemberClick?: (id: string) => void
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

/**
 * Maps (performance, potential) => nine-box key using the convention:
 *   position = (perf - 1) * 3 + potential
 *   e.g. perf=1, pot=1 → key "1"; perf=3, pot=3 → key "9"
 */
function getNineBoxKey(performance: number, potential: number): string {
  return String((performance - 1) * 3 + potential)
}

interface CellDef {
  perfValue: number  // 1-3
  potValue: number   // 1-3
}

// Display layout: rows = performance (high→low), cols = potential (low→high)
const GRID_CELLS: CellDef[][] = [
  [{ perfValue: 3, potValue: 1 }, { perfValue: 3, potValue: 2 }, { perfValue: 3, potValue: 3 }],
  [{ perfValue: 2, potValue: 1 }, { perfValue: 2, potValue: 2 }, { perfValue: 2, potValue: 3 }],
  [{ perfValue: 1, potValue: 1 }, { perfValue: 1, potValue: 2 }, { perfValue: 1, potValue: 3 }],
]

const PERF_LABELS = ["Alta", "Média", "Baixa"]
const POT_LABELS = ["Baixo", "Médio", "Alto"]

export function NineBoxGrid({ members, onMemberClick }: NineBoxGridProps) {
  return (
    <TooltipProvider>
      <div className="w-full overflow-auto">
        <div className="flex">
          {/* Y-axis label */}
          <div className="flex flex-col items-center justify-center pr-2 shrink-0">
            <span
              className="text-xs font-semibold text-[#374151] tracking-wide select-none"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Performance →
            </span>
          </div>
          {/* Grid body */}
          <div className="flex-1 min-w-0">
            {GRID_CELLS.map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-stretch">
                {/* Row label */}
                <div className="w-10 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-gray-500 font-medium">
                    {PERF_LABELS[rowIdx]}
                  </span>
                </div>
                {row.map((cell) => {
                  const key = getNineBoxKey(cell.perfValue, cell.potValue)
                  const config = NINE_BOX_CONFIG[key]
                  const cellMembers = members.filter(
                    (m) => m.performance === cell.perfValue && m.potential === cell.potValue
                  )
                  return (
                    <div
                      key={key}
                      className="flex-1 min-h-[88px] border rounded-md m-0.5 p-2 flex flex-col gap-1 transition-shadow hover:shadow-md"
                      style={{
                        backgroundColor: `${config.color}18`,
                        borderColor: `${config.color}50`,
                      }}
                      title={`${config.label}: ${config.description}`}
                    >
                      <span
                        className="text-[10px] font-semibold leading-tight"
                        style={{ color: config.color }}
                      >
                        {config.label}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {cellMembers.map((member) => (
                          <Tooltip key={member.id}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onMemberClick?.(member.id)}
                                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] rounded-full"
                              >
                                <Avatar size="sm">
                                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(member.name)}
                                  </AvatarFallback>
                                </Avatar>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs opacity-80">{member.position}</p>
                              <p className="text-xs opacity-60">{config.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {/* X-axis labels */}
            <div className="flex mt-1 pl-10">
              {POT_LABELS.map((label) => (
                <div key={label} className="flex-1 text-center">
                  <span className="text-[10px] text-gray-500 font-medium">{label}</span>
                </div>
              ))}
            </div>
            <div className="text-center mt-0.5">
              <span className="text-xs font-semibold text-[#374151] tracking-wide">
                Potencial →
              </span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
