"use client"

import dynamic from "next/dynamic"

const ConfeccaoDashboard = dynamic(
  () => import("@/components/confeccao/confeccao-dashboard").then((m) => m.ConfeccaoDashboard),
  { ssr: false }
)

export default function ConfeccaoPage() {
  return <ConfeccaoDashboard />
}
