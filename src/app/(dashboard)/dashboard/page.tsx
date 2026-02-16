import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import {
  Clock,
  CalendarDays,
  FileText,
  Scale,
  ChevronRight,
  FolderKanban,
  Landmark,
  Plus,
  AlertTriangle,
  Target,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DEADLINE_TYPE_LABELS, formatCNJ, deadlineColor, formatCurrency,
  ACTIVITY_TYPE_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  PRIORITY_LABELS, PRIORITY_COLORS,
} from "@/lib/constants"

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
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

  // Fetch all data in parallel
  const [
    prazosHoje,
    prazosSemana,
    movNaoLidas,
    processosAtivos,
    upcomingDeadlines,
    recentActivities,
    projetosComAcao,
    liberacoesEmAndamento,
    projetosAtivos,
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
      take: 8,
      orderBy: { data: "desc" },
      include: {
        user: { select: { name: true } },
        case_: { select: { id: true, numero_processo: true } },
        project: { select: { id: true, titulo: true, codigo: true } },
      },
    }),
    // Projects with overdue tasks or overdue milestones
    db.project.findMany({
      where: {
        status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO", "AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO", "AGUARDANDO_ORGAO"] },
        OR: [
          { tarefas: { some: { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, data_limite: { lt: now } } } },
          { marcos: { some: { status: { in: ["PENDENTE", "ATRASADO"] }, data_prevista: { lt: now } } } },
        ],
      },
      select: {
        id: true, titulo: true, codigo: true, prioridade: true, status: true,
        cliente: { select: { nome: true } },
        tarefas: { where: { status: { notIn: ["CONCLUIDA", "CANCELADA"] }, data_limite: { lt: now } }, select: { id: true } },
        marcos: { where: { status: { in: ["PENDENTE", "ATRASADO"] }, data_prevista: { lt: now } }, select: { id: true } },
      },
      take: 5,
      orderBy: { prioridade: "asc" },
    }),
    // Liberações em andamento (ALVARA_LIBERACAO projects)
    db.project.findMany({
      where: {
        categoria: "ALVARA_LIBERACAO",
        status: "EM_ANDAMENTO",
      },
      select: {
        id: true, titulo: true, codigo: true, valor_envolvido: true, status: true,
        cliente: { select: { nome: true } },
        tarefas: {
          where: { tipo: { in: ["OBTENCAO_ALVARA", "LIBERACAO_VALORES"] }, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
          select: { id: true, titulo: true, status: true, campos_especificos: true },
          take: 1,
          orderBy: { created_at: "asc" },
        },
      },
      take: 5,
    }),
    // Active projects count
    db.project.count({
      where: { status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO"] } },
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
    {
      title: "Projetos Ativos",
      value: String(projetosAtivos),
      description: projetosComAcao.length > 0 ? `${projetosComAcao.length} com acao pendente` : "Todos em dia",
      icon: FolderKanban,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Liberacoes em Andamento",
      value: String(liberacoesEmAndamento.length),
      description: liberacoesEmAndamento.length > 0
        ? `${formatCurrency(liberacoesEmAndamento.reduce((acc, p) => acc + Number(p.valor_envolvido || 0), 0))} total`
        : "Nenhuma liberacao ativa",
      icon: Landmark,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome + Quick Actions */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bem-vindo, {firstName}
          </h1>
          <p className="text-muted-foreground capitalize">{dateStr}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/processos/novo">
              <Plus className="size-4 mr-1" />
              Novo Processo
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/projetos/novo">
              <Plus className="size-4 mr-1" />
              Novo Projeto
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      {/* Middle section: Projects needing attention + Liberações */}
      {(projetosComAcao.length > 0 || liberacoesEmAndamento.length > 0) && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Projects with pending action */}
          {projetosComAcao.length > 0 && (
            <Card className="shadow-sm border-amber-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <CardTitle className="text-base">Projetos com Acao Pendente</CardTitle>
                </div>
                <Link href="/projetos" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projetosComAcao.map((p) => {
                    const overdueTasks = p.tarefas.length
                    const overdueMilestones = p.marcos.length
                    return (
                      <Link
                        key={p.id}
                        href={`/projetos/${p.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{p.codigo}</span>
                            <Badge className={`text-[10px] ${PRIORITY_COLORS[p.prioridade] || ""}`}>
                              {PRIORITY_LABELS[p.prioridade] || p.prioridade}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium truncate mt-0.5">{p.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.cliente.nome}</p>
                        </div>
                        <div className="ml-3 flex flex-col items-end gap-1">
                          {overdueTasks > 0 && (
                            <span className="text-xs text-red-600">{overdueTasks} tarefa(s) atrasada(s)</span>
                          )}
                          {overdueMilestones > 0 && (
                            <span className="text-xs text-red-600">{overdueMilestones} marco(s) atrasado(s)</span>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liberações em andamento */}
          {liberacoesEmAndamento.length > 0 && (
            <Card className="shadow-sm border-emerald-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-emerald-600" />
                  <CardTitle className="text-base">Liberacoes em Andamento</CardTitle>
                </div>
                <Link href="/projetos?categoria=ALVARA_LIBERACAO" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver todos <ChevronRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {liberacoesEmAndamento.map((p) => {
                    const proximaTarefa = p.tarefas[0]
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const statusLiberacao = (proximaTarefa?.campos_especificos as any)?.status_liberacao
                    return (
                      <Link
                        key={p.id}
                        href={`/projetos/${p.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{p.titulo}</p>
                          <p className="text-xs text-muted-foreground truncate">{p.cliente.nome}</p>
                        </div>
                        <div className="ml-3 flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-emerald-600">
                            {formatCurrency(p.valor_envolvido)}
                          </span>
                          {statusLiberacao && (
                            <Badge variant="outline" className="text-[10px]">
                              {statusLiberacao.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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

        {/* Recent Activity (now includes project activities) */}
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
                  const isProjectActivity = a.tipo === "TAREFA_PROJETO" || a.tipo === "MARCO_ALCANCADO"
                  const linkHref = a.project
                    ? `/projetos/${a.project.id}`
                    : a.case_
                      ? `/processos/${a.case_.id}`
                      : undefined

                  const dotColor = isProjectActivity ? "bg-indigo-500" : "bg-primary"
                  const typeLabel = ACTIVITY_TYPE_LABELS[a.tipo] || a.tipo

                  const content = (
                    <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                      <div className={`mt-0.5 size-2 rounded-full ${dotColor} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">por {a.user.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{typeLabel}</Badge>
                          {a.project && (
                            <span className="text-[10px] text-indigo-600 font-mono">{a.project.codigo}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeLabel}
                      </span>
                    </div>
                  )

                  return linkHref ? (
                    <Link key={a.id} href={linkHref}>{content}</Link>
                  ) : (
                    <div key={a.id}>{content}</div>
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
