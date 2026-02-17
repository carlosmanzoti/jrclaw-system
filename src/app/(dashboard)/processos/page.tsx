import { CasesList } from "@/components/processos/cases-list"

export default function ProcessosPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <CasesList />
      </div>
    </div>
  )
}
