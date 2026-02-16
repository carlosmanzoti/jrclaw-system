import { FileText } from "lucide-react"

export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">
          Gestão Eletrônica de Documentos (GED) com versionamento.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <FileText className="size-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Em construção</h3>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          O GED será implementado na próxima fase.
        </p>
      </div>
    </div>
  )
}
