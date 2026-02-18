"use client"

import { Inbox, Send, FileEdit, Trash2, Archive, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmailFolder } from "@/lib/microsoft-graph"

const FOLDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  sentitems: Send,
  drafts: FileEdit,
  deleteditems: Trash2,
  archive: Archive,
  junkemail: ShieldAlert,
}

const FOLDER_NAMES: Record<string, string> = {
  inbox: "Caixa de Entrada",
  Inbox: "Caixa de Entrada",
  "Caixa de Entrada": "Caixa de Entrada",
  sentitems: "Enviados",
  "Sent Items": "Enviados",
  Enviados: "Enviados",
  drafts: "Rascunhos",
  Drafts: "Rascunhos",
  Rascunhos: "Rascunhos",
  deleteditems: "Lixeira",
  "Deleted Items": "Lixeira",
  Lixeira: "Lixeira",
  archive: "Arquivo",
  Archive: "Arquivo",
  Arquivo: "Arquivo",
  junkemail: "Spam",
  "Junk Email": "Spam",
  Spam: "Spam",
}

function getFolderIcon(folder: EmailFolder): React.ComponentType<{ className?: string }> {
  const key = folder.id.toLowerCase().replace(/[^a-z]/g, "")
  for (const [k, Icon] of Object.entries(FOLDER_ICONS)) {
    if (key.includes(k) || folder.displayName.toLowerCase().includes(k)) return Icon
  }
  return Inbox
}

function getFolderName(folder: EmailFolder): string {
  return FOLDER_NAMES[folder.displayName] || FOLDER_NAMES[folder.id] || folder.displayName
}

interface EmailFolderListProps {
  folders: EmailFolder[]
  selectedFolder: string
  onSelectFolder: (id: string) => void
}

export function EmailFolderList({ folders, selectedFolder, onSelectFolder }: EmailFolderListProps) {
  return (
    <div className="py-2">
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Pastas</p>
      <nav className="space-y-0.5 px-1.5">
        {folders.map((folder) => {
          const Icon = getFolderIcon(folder)
          const isSelected = selectedFolder === folder.id
          return (
            <button
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                isSelected ? "bg-[#C9A961]/10 text-[#C9A961] font-medium" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 text-left truncate">{getFolderName(folder)}</span>
              {folder.unreadCount > 0 && (
                <span className={cn(
                  "text-[10px] font-semibold min-w-[18px] text-center rounded-full px-1",
                  isSelected ? "bg-[#C9A961] text-white" : "bg-blue-500 text-white"
                )}>
                  {folder.unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
