"use client"

import dynamic from "next/dynamic"

const ConfeccaoDashboard = dynamic(
  () => import("@/components/confeccao/confeccao-dashboard").then((m) => m.ConfeccaoDashboard),
  { ssr: false }
)

export default function ConfeccaoPage() {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden p-4 md:p-6">
      <ConfeccaoDashboard />
    </div>
  )
}
