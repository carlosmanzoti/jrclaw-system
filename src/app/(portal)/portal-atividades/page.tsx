"use client"

import { useState, useEffect } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, Gavel, FileText, Phone, Mail, Users } from "lucide-react"

const TIPO_ICONS: Record<string, typeof Gavel> = {
  REUNIAO: Users,
  AUDIENCIA: Gavel,
  PETICAO: FileText,
  EMAIL: Mail,
  TELEFONEMA: Phone,
}

export default function PortalAtividadesPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portal/data?section=atividades")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <PortalShell activeTab="atividades">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Atividades</h1>
          <p className="text-sm text-muted-foreground">Historico de atividades realizadas pelo escritorio.</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : !data?.activities?.length ? (
          <div className="text-center py-16 border rounded-lg border-dashed">
            <Clock className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.activities.map((act: any) => {
              const Icon = TIPO_ICONS[act.tipo] || FileText
              return (
                <div key={act.id} className="flex gap-3 p-3 bg-white border rounded-lg">
                  <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{act.descricao}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(act.data).toLocaleDateString("pt-BR")}</span>
                      {act.case_?.numero_processo && (
                        <>
                          <span>·</span>
                          <span>{act.case_.numero_processo}</span>
                        </>
                      )}
                      {act.user?.name && (
                        <>
                          <span>·</span>
                          <span>{act.user.name}</span>
                        </>
                      )}
                    </div>
                    {act.resultado && (
                      <p className="text-xs text-muted-foreground mt-1">Resultado: {act.resultado}</p>
                    )}
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
