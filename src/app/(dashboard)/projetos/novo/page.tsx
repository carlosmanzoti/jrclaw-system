import { ProjectForm } from "@/components/projetos/project-form"

export default function NovoProjetoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo Projeto</h1>
        <p className="text-muted-foreground">
          Crie um novo projeto gerencial com etapas, tarefas e marcos.
        </p>
      </div>
      <ProjectForm />
    </div>
  )
}
