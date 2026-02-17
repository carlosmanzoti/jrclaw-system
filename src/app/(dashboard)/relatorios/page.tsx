import { ReportsPageClient } from "./client"

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Geração de relatórios ao cliente com KPIs, gráficos e exportação PDF.
        </p>
      </div>
      <ReportsPageClient />
    </div>
  )
}
