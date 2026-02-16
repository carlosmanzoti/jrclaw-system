import { FolderKanban } from "lucide-react"

export default function ProjetosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
        <p className="text-muted-foreground">
          Gestão de projetos gerenciais e acompanhamento de demandas.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <FolderKanban className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          O módulo de projetos será implementado na próxima fase.
        </p>
      </div>
    </div>
  )
}
