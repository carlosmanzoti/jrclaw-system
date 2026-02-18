"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  FileText, CheckSquare, Scale, MessageSquare, Paperclip, Shield,
  Activity, Save, Lock, Unlock, Users, ArrowRight, Search,
} from "lucide-react"

interface CommandPaletteProps {
  workspaceId: string
  deadlineId: string
  phase: string
  onAction: (action: string, payload?: Record<string, unknown>) => void
}

export function WorkspaceCommandPalette({ workspaceId, deadlineId, phase, onAction }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSelect = useCallback((value: string) => {
    setOpen(false)

    switch (value) {
      case "tab-editor": onAction("setTab", { tab: "editor" }); break
      case "tab-checklist": onAction("setTab", { tab: "checklist" }); break
      case "tab-teses": onAction("setTab", { tab: "teses" }); break
      case "tab-comentarios": onAction("setTab", { tab: "comentarios" }); break
      case "tab-documentos": onAction("setTab", { tab: "documentos" }); break
      case "tab-aprovacao": onAction("setTab", { tab: "aprovacao" }); break
      case "tab-atividades": onAction("setTab", { tab: "atividades" }); break
      case "save-version": onAction("saveVersion"); break
      case "request-approval": onAction("requestApproval"); break
      case "toggle-lock": onAction("toggleLock"); break
      case "advance-phase": onAction("advancePhase"); break
      case "back-to-list": router.push("/prazos"); break
      default: break
    }
  }, [onAction, router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <Command className="rounded-xl border shadow-2xl bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 border-b">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="O que deseja fazer?"
              className="flex-1 h-12 text-sm bg-transparent outline-none"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum comando encontrado.
            </Command.Empty>

            <Command.Group heading="Navegação">
              <Command.Item value="tab-editor" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <FileText className="size-4" /> Editor
              </Command.Item>
              <Command.Item value="tab-checklist" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <CheckSquare className="size-4" /> Checklist
              </Command.Item>
              <Command.Item value="tab-teses" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Scale className="size-4" /> Teses
              </Command.Item>
              <Command.Item value="tab-comentarios" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <MessageSquare className="size-4" /> Comentários
              </Command.Item>
              <Command.Item value="tab-documentos" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Paperclip className="size-4" /> Documentos
              </Command.Item>
              <Command.Item value="tab-aprovacao" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Shield className="size-4" /> Aprovação
              </Command.Item>
              <Command.Item value="tab-atividades" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Activity className="size-4" /> Atividades
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Ações">
              <Command.Item value="save-version" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Save className="size-4" /> Salvar versão
              </Command.Item>
              <Command.Item value="request-approval" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Shield className="size-4" /> Solicitar aprovação
              </Command.Item>
              <Command.Item value="toggle-lock" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Lock className="size-4" /> Bloquear/Desbloquear edição
              </Command.Item>
              <Command.Item value="advance-phase" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <ArrowRight className="size-4" /> Avançar fase
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Outros">
              <Command.Item value="back-to-list" onSelect={handleSelect} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer aria-selected:bg-gray-100">
                <Users className="size-4" /> Voltar à lista de prazos
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t px-4 py-2 text-[10px] text-muted-foreground flex justify-between">
            <span>↑↓ navegar · Enter selecionar · Esc fechar</span>
            <span>Ctrl+K</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
