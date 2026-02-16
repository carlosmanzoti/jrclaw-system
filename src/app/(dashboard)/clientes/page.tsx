import { PersonsList } from "@/components/pessoas/persons-list"

export default function ClientesPage() {
  return (
    <div className="space-y-6">
      <PersonsList defaultTipo="CLIENTE" title="Clientes" />
    </div>
  )
}
