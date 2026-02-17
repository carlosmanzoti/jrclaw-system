"use client"

import dynamic from "next/dynamic"

const CalendarDashboard = dynamic(
  () => import("@/components/calendario/calendar-dashboard"),
  { ssr: false }
)

export function CalendarPageClient() {
  return <CalendarDashboard />
}
