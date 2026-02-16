import { auth } from "@/lib/auth"
import {
  Clock,
  CalendarDays,
  FileText,
  Gavel,
  Scale,
  FolderKanban,
  Banknote,
  Handshake,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const kpiCards = [
  {
    title: "Prazos Hoje",
    value: "3",
    description: "2 fatais, 1 ordinário",
    icon: Clock,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    title: "Prazos da Semana",
    value: "12",
    description: "5 fatais, 7 ordinários",
    icon: CalendarDays,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    title: "Movimentações Não Lidas",
    value: "8",
    description: "3 decisões, 5 despachos",
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Próximas Audiências",
    value: "4",
    description: "Próxima: 18/02/2026",
    icon: Gavel,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    title: "Processos Ativos",
    value: "47",
    description: "5 novos este mês",
    icon: Scale,
    color: "text-primary",
    bg: "bg-primary/5",
  },
  {
    title: "Projetos com Ação Pendente",
    value: "6",
    description: "2 críticos, 4 alta prioridade",
    icon: FolderKanban,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Liberações de Valores",
    value: "3",
    description: "R$ 450.000 em andamento",
    icon: Banknote,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Negociações Pendentes",
    value: "5",
    description: "2 com contraproposta",
    icon: Handshake,
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
]

export default async function DashboardPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(" ")[0] || "Usuário"

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bem-vindo, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Aqui está o resumo do seu dia. Segunda-feira, 16 de fevereiro de 2026.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${kpi.bg}`}>
                <kpi.icon className={`size-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${kpi.color}`}>
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick sections placeholder */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Prazos Urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  processo: "0001234-56.2025.8.16.0001",
                  prazo: "Contestação",
                  data: "Hoje",
                  tipo: "FATAL",
                },
                {
                  processo: "0005678-90.2025.8.16.0001",
                  prazo: "Réplica",
                  data: "Amanhã",
                  tipo: "FATAL",
                },
                {
                  processo: "0009876-12.2024.8.16.0001",
                  prazo: "Juntada de documentos",
                  data: "18/02",
                  tipo: "ORDINARIO",
                },
              ].map((item) => (
                <div
                  key={item.processo}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {item.prazo}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {item.processo}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.tipo === "FATAL"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.data}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  acao: "Petição protocolada",
                  detalhe: "Agravo de Instrumento — Fazenda São Jorge",
                  tempo: "Há 2 horas",
                },
                {
                  acao: "Marco alcançado",
                  detalhe: "Alvará expedido — Projeto PRJ-2026-003",
                  tempo: "Há 4 horas",
                },
                {
                  acao: "Nova movimentação",
                  detalhe: "Decisão interlocutória — Proc. 0001234-56",
                  tempo: "Há 6 horas",
                },
              ].map((item) => (
                <div
                  key={item.detalhe}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.acao}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.detalhe}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.tempo}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
