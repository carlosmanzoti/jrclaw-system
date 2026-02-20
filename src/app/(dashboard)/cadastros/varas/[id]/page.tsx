"use client"
import { useParams } from "next/navigation"
import { CourtDetail } from "@/components/cadastros/court-detail"

export default function CourtDetailPage() {
  const params = useParams()
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <CourtDetail courtId={params.id as string} />
      </div>
    </div>
  )
}
