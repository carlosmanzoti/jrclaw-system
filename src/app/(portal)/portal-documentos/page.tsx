"use client"

import { useState, useEffect } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FolderOpen, Download, FileText } from "lucide-react"

export default function PortalDocumentosPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portal/data?section=documentos")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <PortalShell activeTab="documentos">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Documentos compartilhados pelo escritorio.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : !data?.documents?.length ? (
          <div className="text-center py-16 border rounded-lg border-dashed">
            <FolderOpen className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum documento compartilhado.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Documento</th>
                  <th className="px-4 py-2 text-left">Processo</th>
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-right">Acao</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{doc.titulo}</p>
                        <p className="text-xs text-muted-foreground">{doc.tipo}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {doc.case_?.numero_processo || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.arquivo_url && (
                        <a href={doc.arquivo_url} download>
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Download className="size-3 mr-1" /> Baixar
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  )
}
