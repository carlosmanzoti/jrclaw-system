import { DocumentsPageClient } from "./client"

export default function DocumentosPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">Documentos</h1>
          <p className="text-[#666666]">
            Gestão Eletrônica de Documentos (GED) com versionamento.
          </p>
        </div>
        <DocumentsPageClient />
      </div>
    </div>
  )
}
