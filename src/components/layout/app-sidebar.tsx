"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Scale,
  FolderKanban,
  Users,
  Calendar,
  Clock,
  FileText,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  ArrowRightLeft,
  Radar,
  DollarSign,
  BookOpen,
  MessageCircle,
  Mail,
  BarChart3,
  Upload,
  Settings,
  ChevronDown,
  Search,
  Database,
  Landmark,
  Gavel,
  UserCircle,
  UsersRound,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Processos",
    url: "/processos",
    icon: Scale,
    items: [
      { title: "Todos os Processos", url: "/processos" },
      { title: "Prazos", url: "/prazos" },
      { title: "Movimentações", url: "/monitoramento" },
    ],
  },
  {
    title: "Projetos",
    url: "/projetos",
    icon: FolderKanban,
    items: [
      { title: "Todos os Projetos", url: "/projetos" },
      { title: "Kanban", url: "/projetos?view=kanban" },
      { title: "Timeline", url: "/projetos?view=timeline" },
    ],
  },
  {
    title: "Cadastros",
    url: "/clientes",
    icon: Database,
    items: [
      { title: "Clientes", url: "/clientes" },
      { title: "Varas e Comarcas", url: "/cadastros/varas" },
      { title: "Adm. Judiciais", url: "/cadastros/administradores-judiciais" },
      { title: "Pessoas", url: "/pessoas" },
    ],
  },
  {
    title: "Calendário",
    url: "/calendario",
    icon: Calendar,
  },
  {
    title: "Prazos",
    url: "/prazos",
    icon: Clock,
    items: [
      { title: "Painel de Prazos", url: "/prazos" },
      { title: "Calculadora", url: "/prazos/calculadora" },
      { title: "Catálogo de Prazos", url: "/prazos/catalogo" },
      { title: "Calendário Judicial", url: "/prazos/calendario-judicial" },
      { title: "Depositário", url: "/prazos/depositario" },
    ],
  },
]

const navModules = [
  {
    title: "Documentos",
    url: "/documentos",
    icon: FileText,
  },
  {
    title: "Harvey Specter",
    url: "/confeccao",
    icon: Sparkles,
  },
  {
    title: "Recuperação Judicial",
    url: "/recuperacao-judicial",
    icon: ShieldAlert,
    items: [
      { title: "Quadro de Credores", url: "/recuperacao-judicial/quadro-credores" },
      { title: "Aprovação PRJ", url: "/recuperacao-judicial/aprovacao-prj" },
      { title: "Negociações", url: "/recuperacao-judicial/negociacoes" },
    ],
  },
  {
    title: "Reestruturação",
    url: "/reestruturacao",
    icon: ArrowRightLeft,
    items: [
      { title: "Negociações", url: "/reestruturacao" },
      { title: "Dashboard Estratégico", url: "/reestruturacao/estrategico" },
    ],
  },
  {
    title: "Recuperação de Crédito",
    url: "/recuperacao-credito",
    icon: ShieldCheck,
    items: [
      { title: "Todos os Casos", url: "/recuperacao-credito" },
      { title: "Dashboard Analítico", url: "/recuperacao-credito/analitico" },
      { title: "Investigação Patrimonial", url: "/recuperacao-credito/investigacao" },
    ],
  },
  {
    title: "Monitoramento",
    url: "/monitoramento",
    icon: Radar,
  },
]

const navAdmin = [
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
  },
  {
    title: "Biblioteca",
    url: "/biblioteca",
    icon: BookOpen,
  },
  {
    title: "WhatsApp",
    url: "/whatsapp",
    icon: MessageCircle,
  },
  {
    title: "E-mail",
    url: "/email",
    icon: Mail,
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
  },
  {
    title: "Importar Dados",
    url: "/importar",
    icon: Upload,
  },
  {
    title: "Equipe",
    url: "/equipe",
    icon: UsersRound,
    items: [
      { title: "Painel", url: "/equipe" },
      { title: "OKRs", url: "/equipe?tab=okrs" },
      { title: "Feedback", url: "/equipe?tab=feedback" },
      { title: "1:1s", url: "/equipe?tab=one-on-one" },
      { title: "Bem-Estar", url: "/equipe?tab=wellbeing" },
    ],
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
  },
]

function NavItem({
  item,
  pathname,
}: {
  item: {
    title: string
    url: string
    icon: React.ComponentType<{ className?: string }>
    items?: { title: string; url: string }[]
  }
  pathname: string
}) {
  const isActive =
    pathname === item.url || pathname.startsWith(item.url + "/") ||
    (item.items?.some((sub) => pathname === sub.url || pathname.startsWith(sub.url + "/")) ?? false)
  const hasSubItems = item.items && item.items.length > 0

  if (!hasSubItems) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
          <Link href={item.url}>
            <item.icon className="size-4 text-[#C9A961]" />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible
      asChild
      defaultOpen={isActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isActive} tooltip={item.title}>
            <item.icon className="size-4 text-[#C9A961]" />
            <span>{item.title}</span>
            <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items!.map((subItem) => (
              <SidebarMenuSubItem key={subItem.url}>
                <SidebarMenuSubButton
                  asChild
                  isActive={pathname === subItem.url}
                >
                  <Link href={subItem.url}>
                    <span>{subItem.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#1A1A2E]">
                  <span className="font-heading text-sm font-bold text-[#C9A961]">
                    JRC
                  </span>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    <span className="font-heading text-[#C9A961]">JRC</span>
                    <span className="font-body text-sidebar-foreground">Law</span>
                  </span>
                  <span className="truncate text-xs opacity-70">
                    Gestão Jurídica
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <NavItem key={item.url} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navModules.map((item) => (
                <NavItem key={item.url} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Ferramentas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navAdmin.map((item) => (
                <NavItem key={item.url} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="text-xs opacity-60">
              <span>v3.0 — JRCLaw System</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
