"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ENPSGaugeProps {
  score: number    // -100 to +100
  label?: string
  className?: string
}

function getColor(score: number): string {
  if (score > 30) return "#16a34a"   // green
  if (score >= 0) return "#ca8a04"   // yellow
  return "#dc2626"                    // red
}

function getCategory(score: number): string {
  if (score > 30) return "Excelente"
  if (score >= 0) return "Bom"
  return "Crítico"
}

export function ENPSGauge({ score, label, className }: ENPSGaugeProps) {
  const clampedScore = Math.min(100, Math.max(-100, score))
  const color = getColor(clampedScore)
  const category = getCategory(clampedScore)

  const W = 220
  const H = 120
  const cx = W / 2
  const cy = H - 10
  const r = 85

  // Map score from [-100, 100] to angle [π, 0]
  const ratio = (clampedScore + 100) / 200
  const angle = Math.PI - ratio * Math.PI

  const arcX = (a: number) => cx + r * Math.cos(a)
  const arcY = (a: number) => cy - r * Math.sin(a)

  const arcPath = (from: number, to: number) => {
    const x1 = arcX(from), y1 = arcY(from)
    const x2 = arcX(to), y2 = arcY(to)
    const large = Math.abs(to - from) > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`
  }

  const needleX = arcX(angle)
  const needleY = arcY(angle)

  // Zone boundaries in angle space
  const zeroAngle = Math.PI - 0.5 * Math.PI    // score=0 is at 50% of arc
  const thirtyAngle = Math.PI - (130 / 200) * Math.PI  // score=30 is at 65%

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={W} height={H} aria-label={label ?? `eNPS: ${score}`}>
        {/* Zone fills */}
        <path d={arcPath(Math.PI, zeroAngle)} fill="none" stroke="#fee2e2" strokeWidth={14} strokeLinecap="butt" />
        <path d={arcPath(zeroAngle, thirtyAngle)} fill="none" stroke="#fef9c3" strokeWidth={14} strokeLinecap="butt" />
        <path d={arcPath(thirtyAngle, 0)} fill="none" stroke="#dcfce7" strokeWidth={14} strokeLinecap="butt" />
        {/* Background track border */}
        <path d={arcPath(Math.PI, 0)} fill="none" stroke="#d1d5db" strokeWidth={1} />
        {/* Progress arc */}
        <path
          d={arcPath(Math.PI, angle)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          style={{ transition: "all 0.5s ease" }}
        />
        {/* Needle dot */}
        <circle cx={needleX} cy={needleY} r={5} fill={color} />
        {/* Score text */}
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize={30} fontWeight="700" fill="#374151">
          {clampedScore > 0 ? `+${clampedScore}` : clampedScore}
        </text>
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize={11} fill={color} fontWeight="600">
          {category}
        </text>
        {/* Boundary labels */}
        <text x={arcX(Math.PI) - 6} y={arcY(Math.PI) + 14} textAnchor="middle" fontSize={10} fill="#6b7280">-100</text>
        <text x={arcX(zeroAngle)} y={arcY(zeroAngle) - 8} textAnchor="middle" fontSize={9} fill="#6b7280">0</text>
        <text x={arcX(thirtyAngle)} y={arcY(thirtyAngle) - 8} textAnchor="middle" fontSize={9} fill="#6b7280">30</text>
        <text x={arcX(0) + 6} y={arcY(0) + 14} textAnchor="middle" fontSize={10} fill="#6b7280">+100</text>
      </svg>
      {label && (
        <span className="text-xs text-gray-500 font-medium mt-1">{label}</span>
      )}
    </div>
  )
}
