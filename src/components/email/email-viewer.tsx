"use client"

import { useState } from "react"
import DOMPurify from "dompurify"
import { Reply, Forward, MoreHorizontal, ArrowLeft, Paperclip, Download, Sparkles, Scale, Flag, MailOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import type { OutlookMessage } from "@/lib/microsoft-graph"

interface EmailViewerProps {
  message: OutlookMessage
  onReply: (msg: OutlookMessage) => void
  onForward: (msg: OutlookMessage) => void
  onBack: () => void
  isMock: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export function EmailViewer({ message, onReply, onForward, onBack, isMock }: EmailViewerProps) {
  const [aiLoading, setAiLoading] = useState(false)

  const sanitizedHtml = typeof window !== "undefined"
    ? DOMPurify.sanitize(message.body?.content || message.bodyPreview || "", {
        ALLOWED_TAGS: ["p", "br", "b", "i", "u", "strong", "em", "a", "img", "table", "thead", "tbody", "tr", "td", "th", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "div", "span", "blockquote", "pre", "code", "hr"],
        ALLOWED_ATTR: ["href", "src", "alt", "style", "class", "colspan", "rowspan"],
      })
    : ""

  const handleAiReply = async () => {
    setAiLoading(true)
    onReply(message)
    setAiLoading(false)
  }

  const handleFlag = async () => {
    const flagged = message.flag.flagStatus !== "flagged"
    await fetch(`/api/email/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flagged }),
    })
  }

  const handleMarkUnread = async () => {
    await fetch(`/api/email/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: false }),
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="size-7 lg:hidden" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-base font-semibold flex-1 line-clamp-1">{message.subject || "(sem assunto)"}</h2>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="size-8 rounded-full bg-[#C9A961]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#C9A961]">
              {(message.from.name || message.from.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{message.from.name}</p>
            <p className="text-xs text-muted-foreground">{message.from.email}</p>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(message.receivedAt)}</span>
        </div>

        {/* Recipients */}
        {message.toRecipients.length > 0 && (
          <p className="text-xs text-muted-foreground mb-1">
            <span className="font-medium">Para:</span>{" "}
            {message.toRecipients.map(r => r.name || r.email).join(", ")}
          </p>
        )}
        {message.ccRecipients && message.ccRecipients.length > 0 && (
          <p className="text-xs text-muted-foreground mb-1">
            <span className="font-medium">Cc:</span>{" "}
            {message.ccRecipients.map(r => r.name || r.email).join(", ")}
          </p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-2">
          {message.importance === "high" && (
            <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">Alta prioridade</Badge>
          )}
          {message.linkedCaseId && (
            <Badge variant="outline" className="text-[10px] text-[#C9A961] border-[#C9A961]/30">
              <Scale className="size-3 mr-1" /> Vinculado
            </Badge>
          )}
          {message.flag.flagStatus === "flagged" && (
            <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200">
              <Flag className="size-3 mr-1" /> Sinalizado
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-3">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onReply(message)}>
            <Reply className="size-3" /> Responder
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onForward(message)}>
            <Forward className="size-3" /> Encaminhar
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-[#C9A961] border-[#C9A961]/30 hover:bg-[#C9A961]/5" onClick={handleAiReply} disabled={aiLoading}>
            <Sparkles className="size-3" /> Harvey IA
          </Button>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleFlag}>
                <Flag className="size-3.5 mr-2" />
                {message.flag.flagStatus === "flagged" ? "Remover sinalizacao" : "Sinalizar"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMarkUnread}>
                <MailOpen className="size-3.5 mr-2" /> Marcar como nao lido
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="email-body" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="px-4 pb-4">
            <Separator className="mb-3" />
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Paperclip className="size-3.5" /> {message.attachments.length} anexo(s)
            </p>
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((att) => (
                <a
                  key={att.id}
                  href={isMock ? "#" : `/api/email/messages/${message.id}/attachments/${att.id}`}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs hover:bg-muted transition-colors"
                  onClick={isMock ? (e) => e.preventDefault() : undefined}
                >
                  <Paperclip className="size-3.5 text-muted-foreground" />
                  <span className="font-medium max-w-[160px] truncate">{att.name}</span>
                  <span className="text-muted-foreground">{formatFileSize(att.size)}</span>
                  <Download className="size-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
