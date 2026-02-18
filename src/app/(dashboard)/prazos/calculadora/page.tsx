import { CalculadoraPrazos } from "@/components/prazos/calculadora-prazos"

export default function CalculadoraPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <CalculadoraPrazos />
      </div>
    </div>
  )
}
