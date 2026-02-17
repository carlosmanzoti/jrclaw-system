import { PersonsList } from "@/components/pessoas/persons-list"

export default function ClientesPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <PersonsList defaultTipo="CLIENTE" title="Clientes" />
      </div>
    </div>
  )
}
