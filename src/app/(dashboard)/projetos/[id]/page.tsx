import { ProjectDetail } from "@/components/projetos/project-detail"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6">
        <ProjectDetail projectId={id} />
      </div>
    </div>
  )
}
