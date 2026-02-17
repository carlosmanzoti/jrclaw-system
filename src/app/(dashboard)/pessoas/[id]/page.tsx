import { PersonForm } from "@/components/pessoas/person-form"

export default async function EditarPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6">
        <PersonForm personId={id} />
      </div>
    </div>
  )
}
