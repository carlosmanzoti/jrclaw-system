"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Clock,
  FileText,
} from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

function getInitials(name: string | null | undefined): string {
  if (!name) return "U"
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getRoleLabel(role: string | undefined): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    SOCIO: "Sócio",
    ADVOGADO: "Advogado(a)",
    ESTAGIARIO: "Estagiário(a)",
  }
  return labels[role || ""] || role || ""
}

// Mock notification counts — will be replaced with real data via tRPC
const notifications = {
  prazosProximos: 3,
  movimentacoesNaoLidas: 5,
}

const totalNotifications =
  notifications.prazosProximos + notifications.movimentacoesNaoLidas

export function AppHeader() {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* Global search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar processos, clientes, documentos..."
          className="h-9 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-4 text-muted-foreground" />
              {totalNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold bg-destructive text-white border-2 border-white">
                  {totalNotifications}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notificações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/prazos")}
            >
              <Clock className="mr-2 size-4 text-amber-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Prazos próximos</p>
                <p className="text-xs text-muted-foreground">
                  {notifications.prazosProximos} prazos nos próximos 5 dias
                </p>
              </div>
              <Badge variant="secondary" className="ml-2">
                {notifications.prazosProximos}
              </Badge>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/monitoramento")}
            >
              <FileText className="mr-2 size-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Movimentações</p>
                <p className="text-xs text-muted-foreground">
                  {notifications.movimentacoesNaoLidas} não lidas
                </p>
              </div>
              <Badge variant="secondary" className="ml-2">
                {notifications.movimentacoesNaoLidas}
              </Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 h-9"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none">
                  {user?.name || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground leading-none mt-0.5">
                  {getRoleLabel(user?.role)}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/configuracoes")}
            >
              <User className="mr-2 size-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => router.push("/configuracoes")}
            >
              <Settings className="mr-2 size-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
