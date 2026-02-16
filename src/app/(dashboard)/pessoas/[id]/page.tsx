import { PersonForm } from "@/components/pessoas/person-form"

export default async function EditarPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PersonForm personId={id} />
}
