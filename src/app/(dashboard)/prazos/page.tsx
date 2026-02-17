import { DeadlinesDashboard } from "@/components/prazos/deadlines-dashboard"

export default function PrazosPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <DeadlinesDashboard />
      </div>
    </div>
  )
}
