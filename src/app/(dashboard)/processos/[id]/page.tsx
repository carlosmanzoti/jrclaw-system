import { CaseDetail } from "@/components/processos/case-detail"

export default async function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CaseDetail caseId={id} />
}
