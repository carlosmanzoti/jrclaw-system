"use client"

import { Paperclip, AlertCircle, Scale, Flag, ListTodo } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { OutlookMessage } from "@/lib/microsoft-graph"

interface EmailListProps {
  messages: OutlookMessage[]
  selectedId: string | null
  loading: boolean
  onSelect: (msg: OutlookMessage) => void
  messageActivityIds?: Set<string>
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export function EmailList({ messages, selectedId, loading, onSelect, messageActivityIds }: EmailListProps) {
  if (loading && messages.length === 0) {
    return (
      <div className="space-y-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
        <p className="text-sm text-center">Nenhum e-mail encontrado</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((msg) => (
        <button
          key={msg.id}
          onClick={() => onSelect(msg)}
          className={cn(
            "w-full text-left px-3 py-2.5 border-b transition-colors",
            selectedId === msg.id ? "bg-[#C9A961]/5 border-l-2 border-l-[#C9A961]" : "hover:bg-muted/50",
            !msg.isRead && "bg-blue-50/50"
          )}
        >
          <div className="flex items-center gap-2 mb-0.5">
            {!msg.isRead && <span className="size-2 rounded-full bg-blue-500 shrink-0" />}
            <span className={cn("text-xs flex-1 truncate", !msg.isRead ? "font-semibold" : "text-muted-foreground")}>
              {msg.from.name || msg.from.email}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(msg.receivedAt)}</span>
          </div>
          <p className={cn("text-sm truncate mb-0.5", !msg.isRead && "font-medium")}>
            {msg.subject || "(sem assunto)"}
          </p>
          <div className="flex items-center gap-1">
            <p className="text-xs text-muted-foreground flex-1 line-clamp-1">{msg.bodyPreview}</p>
            <div className="flex items-center gap-1 shrink-0">
              {msg.hasAttachments && <Paperclip className="size-3 text-muted-foreground" />}
              {msg.importance === "high" && <AlertCircle className="size-3 text-red-500" />}
              {msg.linkedCaseId && <Scale className="size-3 text-[#C9A961]" />}
              {msg.flag.flagStatus === "flagged" && <Flag className="size-3 text-orange-500 fill-orange-500" />}
              {messageActivityIds?.has(msg.id) && <ListTodo className="size-3 text-emerald-500" />}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
