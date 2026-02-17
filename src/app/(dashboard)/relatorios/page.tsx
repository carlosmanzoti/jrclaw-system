"use client"

import dynamic from "next/dynamic"

const ReportsPageClient = dynamic(() => import("./client").then((m) => m.ReportsPageClient), {
  ssr: false,
})

export default function RelatoriosPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">Relatórios</h1>
          <p className="text-[#666666]">
            Geração de relatórios ao cliente com KPIs, gráficos e exportação PDF.
          </p>
        </div>
        <ReportsPageClient />
      </div>
    </div>
  )
}
