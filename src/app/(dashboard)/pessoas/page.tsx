import { PersonsList } from "@/components/pessoas/persons-list"

export default function PessoasPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <PersonsList />
      </div>
    </div>
  )
}
