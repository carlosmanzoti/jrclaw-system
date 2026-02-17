import { CalendarPageClient } from "./client"

export default function CalendarioPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">Calendário</h1>
          <p className="text-[#666666]">
            Calendário unificado com audiências, reuniões e prazos.
          </p>
        </div>
        <CalendarPageClient />
      </div>
    </div>
  )
}
