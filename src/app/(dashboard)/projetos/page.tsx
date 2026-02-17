import { ProjectsList } from "@/components/projetos/projects-list"

export default function ProjetosPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <ProjectsList />
      </div>
    </div>
  )
}
