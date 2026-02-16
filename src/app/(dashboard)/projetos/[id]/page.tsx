import { ProjectDetail } from "@/components/projetos/project-detail"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProjectDetail projectId={id} />
}
