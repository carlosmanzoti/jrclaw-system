import { DocumentsPageClient } from "./client"

export default function DocumentosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">
          Gestão Eletrônica de Documentos (GED) com versionamento.
        </p>
      </div>
      <DocumentsPageClient />
    </div>
  )
}
