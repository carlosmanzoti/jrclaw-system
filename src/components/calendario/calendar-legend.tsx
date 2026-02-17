"use client"

import {
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_EVENT_TYPE_COLORS,
} from "@/lib/constants"

const EVENT_TYPES = Object.keys(CALENDAR_EVENT_TYPE_LABELS)

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#666666]">
      {EVENT_TYPES.map((type) => (
        <div key={type} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: CALENDAR_EVENT_TYPE_COLORS[type] }}
          />
          <span>{CALENDAR_EVENT_TYPE_LABELS[type]}</span>
        </div>
      ))}
    </div>
  )
}
