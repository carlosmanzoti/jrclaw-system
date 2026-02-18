import { CalendarioJudicial } from "@/components/prazos/calendario-judicial"

export default function CalendarioJudicialPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <CalendarioJudicial />
      </div>
    </div>
  )
}
