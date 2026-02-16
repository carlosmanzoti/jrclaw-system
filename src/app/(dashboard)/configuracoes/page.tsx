import Link from "next/link"
import { Settings, FolderKanban, Users, Building, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  {
    title: "Templates de Projeto",
    description: "Modelos reutilizáveis para criação rápida de projetos com fases, tarefas e marcos pré-definidos.",
    icon: FolderKanban,
    href: "/configuracoes/templates-projeto",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    title: "Usuários",
    description: "Gerenciamento de advogados, estagiários e demais membros da equipe.",
    icon: Users,
    href: "/configuracoes",
    color: "text-blue-600",
    bg: "bg-blue-50",
    disabled: true,
  },
  {
    title: "Escritório",
    description: "Dados do escritório, filiais, integrações e configurações gerais.",
    icon: Building,
    href: "/configuracoes",
    color: "text-amber-600",
    bg: "bg-amber-50",
    disabled: true,
  },
]

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Configurações do sistema, usuários e integrações.
        </p>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const content = (
            <Card className={`shadow-sm hover:shadow-md transition-shadow ${s.disabled ? "opacity-60" : "cursor-pointer"}`}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`rounded-lg p-3 ${s.bg}`}>
                  <s.icon className={`size-6 ${s.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {s.title}
                    {s.disabled && <span className="text-xs text-muted-foreground font-normal">(Em breve)</span>}
                  </CardTitle>
                </div>
                {!s.disabled && <ChevronRight className="size-4 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </CardContent>
            </Card>
          )

          return s.disabled ? (
            <div key={s.title}>{content}</div>
          ) : (
            <Link key={s.title} href={s.href}>{content}</Link>
          )
        })}
      </div>
    </div>
  )
}
