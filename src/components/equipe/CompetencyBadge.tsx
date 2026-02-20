"use client"

import * as React from "react"
import { LEGAL_COMPETENCY_LABELS } from "@/lib/constants/competencies"
import { cn } from "@/lib/utils"

interface CompetencyBadgeProps {
  competency: string
  className?: string
}

export function CompetencyBadge({ competency, className }: CompetencyBadgeProps) {
  const config = LEGAL_COMPETENCY_LABELS[competency] ?? {
    label: competency,
    color: "#6b7280",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5",
        "text-xs font-medium whitespace-nowrap shrink-0 leading-none",
        className
      )}
      style={{
        backgroundColor: `${config.color}22`,
        color: config.color,
        border: `1px solid ${config.color}55`,
      }}
    >
      {config.label}
    </span>
  )
}
