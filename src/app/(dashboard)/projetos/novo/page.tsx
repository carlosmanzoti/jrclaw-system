import { ProjectForm } from "@/components/projetos/project-form"

export default function NovoProjetoPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">Novo Projeto</h1>
          <p className="text-[#666666]">
            Crie um novo projeto gerencial com etapas, tarefas e marcos.
          </p>
        </div>
        <ProjectForm />
      </div>
    </div>
  )
}
