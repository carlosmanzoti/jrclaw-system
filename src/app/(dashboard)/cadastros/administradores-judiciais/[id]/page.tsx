"use client"

import { useParams } from "next/navigation"
import { JudicialAdminDetail } from "@/components/cadastros/judicial-admin-detail"

export default function JudicialAdminDetailPage() {
  const params = useParams()
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <JudicialAdminDetail adminId={params.id as string} />
      </div>
    </div>
  )
}
