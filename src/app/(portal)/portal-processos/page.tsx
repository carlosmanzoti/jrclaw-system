"use client"

import { useState, useEffect } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Scale, Clock, ChevronRight } from "lucide-react"

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ATIVO: { label: "Ativo", className: "bg-green-100 text-green-700" },
  SUSPENSO: { label: "Suspenso", className: "bg-amber-100 text-amber-700" },
  ARQUIVADO: { label: "Arquivado", className: "bg-gray-100 text-gray-600" },
  ENCERRADO: { label: "Encerrado", className: "bg-blue-100 text-blue-700" },
}

export default function MeusProcessosPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portal/data?section=processos")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <PortalShell activeTab="processos">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Meus Processos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus processos judiciais.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : !data?.cases?.length ? (
          <div className="text-center py-16 border rounded-lg border-dashed">
            <Scale className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum processo encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.cases.map((c: any) => {
              const st = STATUS_LABELS[c.status] || STATUS_LABELS.ATIVO
              return (
                <div key={c.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{c.numero_processo || "Sem numero"}</span>
                        <Badge className={st.className}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {c.tipo} · {c.vara || "—"} · {c.comarca || "—"}/{c.uf || "—"}
                      </p>
                      {c.fase_processual && (
                        <p className="text-xs text-muted-foreground">Fase: {c.fase_processual}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Responsavel: {c.advogado_responsavel?.name || "—"}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PortalShell>
  )
}
