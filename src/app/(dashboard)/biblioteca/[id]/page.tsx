import { BibliotecaDetail } from "@/components/biblioteca/biblioteca-detail"

interface Props {
  params: Promise<{ id: string }>
}

export default async function BibliotecaDetailPage({ params }: Props) {
  const { id } = await params
  return <BibliotecaDetail entryId={id} />
}
