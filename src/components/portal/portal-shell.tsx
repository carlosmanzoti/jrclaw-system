"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Scale, Home, FileText, FolderOpen, Clock, MessageSquare,
  LogOut, Menu, X, Download, ExternalLink, ChevronRight,
} from "lucide-react"

interface PortalSession {
  personId: string
  nome: string
  cpfCnpj: string
  email?: string
}

const TABS = [
  { key: "inicio", href: "/portal-processos", label: "Inicio", icon: Home },
  { key: "processos", href: "/portal-processos", label: "Processos", icon: Scale },
  { key: "documentos", href: "/portal-documentos", label: "Documentos", icon: FolderOpen },
  { key: "atividades", href: "/portal-atividades", label: "Atividades", icon: Clock },
  { key: "mensagens", href: "/portal-mensagens", label: "Mensagens", icon: MessageSquare },
]

export function PortalShell({ children, activeTab }: { children: React.ReactNode; activeTab: string }) {
  const router = useRouter()
  const [session, setSession] = useState<PortalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    fetch("/api/portal/session")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.session) setSession(data.session)
        else router.push("/portal-login")
      })
      .catch(() => router.push("/portal-login"))
      .finally(() => setLoading(false))
  }, [router])

  const handleLogout = async () => {
    await fetch("/api/portal/session", { method: "DELETE" })
    router.push("/portal-login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="size-5 text-primary" />
            <span className="font-semibold text-sm">Portal do Cliente</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {session.nome}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-3.5 mr-1.5" /> Sair
            </Button>
            <Button variant="ghost" size="icon" className="sm:hidden size-8" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </div>

        {/* Tabs — desktop */}
        <nav className="max-w-5xl mx-auto px-4 hidden sm:flex gap-1">
          {TABS.map(tab => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="sm:hidden border-t px-4 py-2 space-y-1">
            {TABS.map(tab => (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  activeTab === tab.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
