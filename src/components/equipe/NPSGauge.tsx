"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface NPSGaugeProps {
  score: number
  maxScore?: number
  label?: string
  className?: string
}

function getColor(score: number, maxScore: number): string {
  const ratio = score / maxScore
  if (ratio >= 0.9) return "#16a34a"   // green (9-10 scale)
  if (ratio >= 0.7) return "#ca8a04"   // yellow (7-8)
  return "#dc2626"                      // red (0-6)
}

function getCategory(score: number, maxScore: number): string {
  const ratio = score / maxScore
  if (ratio >= 0.9) return "Promotor"
  if (ratio >= 0.7) return "Neutro"
  return "Detrator"
}

export function NPSGauge({ score, maxScore = 10, label, className }: NPSGaugeProps) {
  const clampedScore = Math.min(maxScore, Math.max(0, score))
  const color = getColor(clampedScore, maxScore)
  const category = getCategory(clampedScore, maxScore)

  const W = 200
  const H = 110
  const cx = W / 2
  const cy = H - 10
  const r = 80
  const startAngle = Math.PI
  const endAngle = 0

  // Map score to angle (left = 0, right = max)
  const ratio = clampedScore / maxScore
  const angle = Math.PI - ratio * Math.PI  // from π to 0

  const arcX = (a: number) => cx + r * Math.cos(a)
  const arcY = (a: number) => cy - r * Math.sin(a)  // SVG y-axis is flipped

  // Colored arc path
  const arcPath = (from: number, to: number) => {
    const x1 = arcX(from), y1 = arcY(from)
    const x2 = arcX(to), y2 = arcY(to)
    const large = Math.abs(to - from) > Math.PI ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`
  }

  // Needle tip position
  const needleX = arcX(angle)
  const needleY = arcY(angle)

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={W} height={H} aria-label={label ?? `Pontuação: ${score}`}>
        {/* Background track */}
        <path
          d={arcPath(Math.PI, 0)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={14}
          strokeLinecap="round"
        />
        {/* Red zone 0-0.6 */}
        <path
          d={arcPath(Math.PI, Math.PI - 0.6 * Math.PI)}
          fill="none"
          stroke="#fee2e2"
          strokeWidth={14}
          strokeLinecap="butt"
        />
        {/* Yellow zone 0.6-0.8 */}
        <path
          d={arcPath(Math.PI - 0.6 * Math.PI, Math.PI - 0.8 * Math.PI)}
          fill="none"
          stroke="#fef9c3"
          strokeWidth={14}
          strokeLinecap="butt"
        />
        {/* Green zone 0.8-1.0 */}
        <path
          d={arcPath(Math.PI - 0.8 * Math.PI, 0)}
          fill="none"
          stroke="#dcfce7"
          strokeWidth={14}
          strokeLinecap="butt"
        />
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
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize={28} fontWeight="700" fill="#374151">
          {clampedScore.toFixed(1)}
        </text>
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize={11} fill={color} fontWeight="600">
          {category}
        </text>
        {/* Min/max labels */}
        <text x={arcX(Math.PI) - 4} y={arcY(Math.PI) + 14} textAnchor="middle" fontSize={10} fill="#6b7280">0</text>
        <text x={arcX(0) + 4} y={arcY(0) + 14} textAnchor="middle" fontSize={10} fill="#6b7280">{maxScore}</text>
      </svg>
      {label && (
        <span className="text-xs text-gray-500 font-medium mt-1">{label}</span>
      )}
    </div>
  )
}
