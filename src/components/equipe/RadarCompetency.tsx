"use client"

import * as React from "react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts"
import { cn } from "@/lib/utils"

interface RadarDataPoint {
  competency: string
  self?: number
  average?: number
  manager?: number
}

interface RadarCompetencyProps {
  data: RadarDataPoint[]
  showLegend?: boolean
  className?: string
}

const LINES = [
  { key: "self",    label: "Autoavaliação", color: "#C9A84C", fillOpacity: 0.15 },
  { key: "average", label: "Média da Equipe", color: "#374151", fillOpacity: 0.10 },
  { key: "manager", label: "Gestor",         color: "#3b82f6", fillOpacity: 0.10 },
] as const

export function RadarCompetency({ data, showLegend = true, className }: RadarCompetencyProps) {
  // Determine which series have data
  const activeLines = LINES.filter((line) =>
    data.some((d) => d[line.key] !== undefined && d[line.key] !== null)
  )

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="competency"
            tick={{ fill: "#374151", fontSize: 11, fontWeight: 500 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              fontSize: "12px",
              color: "#374151",
            }}
            formatter={(value: unknown, name: unknown) => [
              `${Number(value).toFixed(1)}`,
              LINES.find((l) => l.key === String(name))?.label ?? String(name),
            ]}
          />
          {activeLines.map((line) => (
            <Radar
              key={line.key}
              name={line.key}
              dataKey={line.key}
              stroke={line.color}
              fill={line.color}
              fillOpacity={line.fillOpacity}
              strokeWidth={2}
              dot={{ r: 3, fill: line.color }}
            />
          ))}
          {showLegend && (
            <Legend
              formatter={(value) =>
                LINES.find((l) => l.key === value)?.label ?? value
              }
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
