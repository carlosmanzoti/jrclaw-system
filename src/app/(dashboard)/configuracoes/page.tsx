import Link from "next/link"
import { Settings, FolderKanban, Users, Building, ChevronRight, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  {
    title: "Templates de Projeto",
    description: "Modelos reutilizáveis para criação rápida de projetos com fases, tarefas e marcos pré-definidos.",
    icon: FolderKanban,
    href: "/configuracoes/templates-projeto",
    color: "text-[#C9A961]",
    bg: "bg-[#C9A961]/10",
  },
  {
    title: "Uso de IA",
    description: "Dashboard de consumo de IA: chamadas, tokens, custos estimados e breakdown por modelo (Sonnet/Opus).",
    icon: Brain,
    href: "/configuracoes/uso-ia",
    color: "text-[#C9A961]",
    bg: "bg-[#C9A961]/10",
  },
  {
    title: "Usuários",
    description: "Gerenciamento de advogados, estagiários e demais membros da equipe.",
    icon: Users,
    href: "/configuracoes",
    color: "text-[#17A2B8]",
    bg: "bg-[#17A2B8]/10",
    disabled: true,
  },
  {
    title: "Escritório",
    description: "Dados do escritório, filiais, integrações e configurações gerais.",
    icon: Building,
    href: "/configuracoes",
    color: "text-[#C9A961]",
    bg: "bg-[#C9A961]/10",
    disabled: true,
  },
]

export default function ConfiguracoesPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-heading">Configurações</h1>
          <p className="text-[#666666]">
            Configurações do sistema, usuários e integrações.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const content = (
              <Card className={`shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-md transition-shadow ${s.disabled ? "opacity-60" : "cursor-pointer"}`}>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className={`rounded-lg p-3 ${s.bg}`}>
                    <s.icon className={`size-6 ${s.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {s.title}
                      {s.disabled && <span className="text-xs text-[#666666] font-normal">(Em breve)</span>}
                    </CardTitle>
                  </div>
                  {!s.disabled && <ChevronRight className="size-4 text-[#666666]" />}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#666666]">{s.description}</p>
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
    </div>
  )
}
