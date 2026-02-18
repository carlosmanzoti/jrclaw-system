import { DepositarioCalendarios } from "@/components/prazos/depositario-calendarios"

export default function DepositarioPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <DepositarioCalendarios />
      </div>
    </div>
  )
}
