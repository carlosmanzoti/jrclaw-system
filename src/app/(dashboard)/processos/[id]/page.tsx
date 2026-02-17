import { CaseDetail } from "@/components/processos/case-detail"

export default async function ProcessoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6">
        <CaseDetail caseId={id} />
      </div>
    </div>
  )
}
