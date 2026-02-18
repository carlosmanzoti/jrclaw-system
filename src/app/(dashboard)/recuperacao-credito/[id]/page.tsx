"use client"

import { useParams } from "next/navigation"
import { RecoveryDetail } from "@/components/recovery/recovery-detail"

export default function RecoveryCaseDetailPage() {
  const params = useParams()
  const id = params.id as string
  return <RecoveryDetail caseId={id} />
}
