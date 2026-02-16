import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import {
  Clock,
  CalendarDays,
  FileText,
  Scale,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DEADLINE_TYPE_LABELS, formatCNJ, deadlineColor,
} from "@/lib/constants"

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function endOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  r.setDate(r.getDate() + diff);
  r.setHours(23, 59, 59, 999);
  return r;
}

export default async function DashboardPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(" ")[0] || "Usuario"
  const now = new Date()

  // Fetch real counts from DB in parallel
  const [
    prazosHoje,
    prazosSemana,
    movNaoLidas,
    processosAtivos,
    upcomingDeadlines,
    recentActivities,
  ] = await Promise.all([
    db.deadline.count({
      where: { status: "PENDENTE", data_limite: { gte: startOfDay(now), lte: endOfDay(now) } },
    }),
    db.deadline.count({
      where: { status: "PENDENTE", data_limite: { gte: startOfDay(now), lte: endOfWeek(now) } },
    }),
    db.caseMovement.count({ where: { lida: false } }),
    db.case.count({ where: { status: "ATIVO" } }),
    db.deadline.findMany({
      where: { status: "PENDENTE", data_limite: { gte: startOfDay(now) } },
      take: 5,
      orderBy: { data_limite: "asc" },
      include: {
        case_: { select: { id: true, numero_processo: true, cliente: { select: { nome: true } } } },
      },
    }),
    db.activity.findMany({
      take: 5,
      orderBy: { data: "desc" },
      include: { user: { select: { name: true } } },
    }),
  ])

  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  const kpiCards = [
    {
      title: "Prazos Hoje",
      value: String(prazosHoje),
      description: prazosHoje === 0 ? "Nenhum prazo hoje" : `${prazosHoje} prazo(s) vencem hoje`,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Prazos da Semana",
      value: String(prazosSemana),
      description: `Ate o fim da semana`,
      icon: CalendarDays,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Movimentacoes Nao Lidas",
      value: String(movNaoLidas),
      description: movNaoLidas === 0 ? "Tudo em dia" : `${movNaoLidas} pendente(s)`,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Processos Ativos",
      value: String(processosAtivos),
      description: "Em andamento",
      icon: Scale,
      color: "text-primary",
      bg: "bg-primary/5",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bem-vindo, {firstName}
        </h1>
        <p className="text-muted-foreground capitalize">{dateStr}</p>
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

      {/* Bottom sections */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Upcoming Deadlines */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Proximos Prazos</CardTitle>
            <Link href="/prazos" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum prazo proximo.</p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((d) => (
                  <Link
                    key={d.id}
                    href={`/processos/${d.case_.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.descricao}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {formatCNJ(d.case_.numero_processo)} — {d.case_.cliente.nome}
                      </p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {DEADLINE_TYPE_LABELS[d.tipo]}
                      </Badge>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${deadlineColor(d.data_limite)}`}>
                        {new Date(d.data_limite).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente.</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((a) => {
                  const diff = Math.floor((now.getTime() - new Date(a.data).getTime()) / 3600000)
                  const timeLabel = diff < 1 ? "Agora" : diff < 24 ? `Ha ${diff}h` : `Ha ${Math.floor(diff / 24)}d`

                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          por {a.user.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
