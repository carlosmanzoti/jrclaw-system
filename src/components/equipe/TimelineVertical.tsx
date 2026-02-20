"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TimelineItem {
  id: string
  date: string
  title: string
  description?: string
  icon?: React.ReactNode
  color?: string
}

interface TimelineVerticalProps {
  items: TimelineItem[]
  className?: string
}

export function TimelineVertical({ items, className }: TimelineVerticalProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">Nenhum evento registrado.</p>
    )
  }

  return (
    <ol className={cn("relative", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        const dotColor = item.color ?? "#C9A84C"

        return (
          <li key={item.id} className="relative flex gap-4 pb-6">
            {/* Connector line */}
            {!isLast && (
              <div
                className="absolute top-6 left-[11px] bottom-0 w-0.5"
                style={{ backgroundColor: "#e5e7eb" }}
                aria-hidden="true"
              />
            )}
            {/* Dot / Icon */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-white shadow-sm"
                style={{ backgroundColor: dotColor }}
                aria-hidden="true"
              >
                {item.icon ? (
                  <span className="text-xs leading-none">{item.icon}</span>
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-white block" />
                )}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[#374151] leading-tight">
                  {item.title}
                </p>
                <time
                  className="text-xs text-gray-400 whitespace-nowrap shrink-0"
                  dateTime={item.date}
                >
                  {new Date(item.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
              {item.description && (
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
