import { PersonForm } from "@/components/pessoas/person-form"

export default function NovaPessoaPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6">
        <PersonForm />
      </div>
    </div>
  )
}
