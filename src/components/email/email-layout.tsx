"use client"

import { useState, useEffect, useCallback } from "react"
import { Mail, PenSquare, RefreshCw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { EmailFolderList } from "./email-folder-list"
import { EmailList } from "./email-list"
import { EmailViewer } from "./email-viewer"
import { EmailCompose } from "./email-compose"
import type { OutlookMessage, EmailFolder } from "@/lib/microsoft-graph"

export function EmailLayout() {
  const [folders, setFolders] = useState<EmailFolder[]>([])
  const [messages, setMessages] = useState<OutlookMessage[]>([])
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedMessage, setSelectedMessage] = useState<OutlookMessage | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState("")
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "forward">("new")
  const [replyToMessage, setReplyToMessage] = useState<OutlookMessage | null>(null)
  const [nextLink, setNextLink] = useState<string | null>(null)

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/email/folders")
      if (res.ok) {
        const data = await res.json()
        setFolders(data.folders || [])
        setIsMock(data.mock || false)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchMessages = useCallback(async (folder?: string, search?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("folder", folder || selectedFolder)
      if (search) params.set("search", search)
      const res = await fetch(`/api/email/messages?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
        setNextLink(data.nextLink || null)
        setIsMock(data.mock || false)
        setLastSync(new Date())
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [selectedFolder])

  const fetchMessage = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/email/messages/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedMessage(data)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  useEffect(() => {
    fetchMessages(selectedFolder, searchTerm || undefined)
    setSelectedMessageId(null)
    setSelectedMessage(null)
  }, [selectedFolder]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedMessageId) fetchMessage(selectedMessageId)
  }, [selectedMessageId, fetchMessage])

  // Check connected account
  useEffect(() => {
    fetch("/api/email/folders").then(r => r.json()).then(d => {
      if (!d.mock) setConnectedEmail("Conta Microsoft conectada")
      else setConnectedEmail("")
    }).catch(() => {})
  }, [])

  const handleRefresh = () => {
    fetchFolders()
    fetchMessages(selectedFolder, searchTerm || undefined)
  }

  const handleSearch = () => {
    fetchMessages(selectedFolder, searchTerm || undefined)
  }

  const handleReply = (msg: OutlookMessage) => {
    setReplyToMessage(msg)
    setComposeMode("reply")
    setComposeOpen(true)
  }

  const handleForward = (msg: OutlookMessage) => {
    setReplyToMessage(msg)
    setComposeMode("forward")
    setComposeOpen(true)
  }

  const handleCompose = () => {
    setReplyToMessage(null)
    setComposeMode("new")
    setComposeOpen(true)
  }

  const handleSelectMessage = (msg: OutlookMessage) => {
    setSelectedMessageId(msg.id)
    // Mark as read
    if (!msg.isRead) {
      fetch(`/api/email/messages/${msg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m))
    }
  }

  const _inboxUnread = folders.find(f => f.id === "inbox" || f.displayName === "Caixa de Entrada" || f.displayName === "Inbox")?.unreadCount || 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5 bg-white shrink-0">
        <Mail className="size-5 text-[#C9A961]" />
        <h1 className="text-lg font-semibold">E-mail</h1>
        {connectedEmail && (
          <Badge variant="outline" className="text-xs">{connectedEmail}</Badge>
        )}
        {isMock && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Modo demonstracao</Badge>
        )}
        <div className="flex-1" />
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar e-mails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-8 h-8 text-sm"
          />
          {searchTerm && (
            <Button variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 size-6" onClick={() => { setSearchTerm(""); fetchMessages(selectedFolder); }}>
              <X className="size-3" />
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" className="bg-[#C9A961] hover:bg-[#B8984F] text-white gap-1.5" onClick={handleCompose}>
          <PenSquare className="size-3.5" />
          Compor
        </Button>
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Folder panel */}
        <div className="hidden lg:block w-56 border-r bg-[#FAFAFA] overflow-y-auto shrink-0">
          <EmailFolderList
            folders={folders}
            selectedFolder={selectedFolder}
            onSelectFolder={(id) => setSelectedFolder(id)}
          />
        </div>

        {/* Message list panel */}
        <div className={`w-full lg:w-[380px] lg:max-w-[380px] border-r flex flex-col shrink-0 ${selectedMessageId ? "hidden lg:flex" : "flex"}`}>
          <EmailList
            messages={messages}
            selectedId={selectedMessageId}
            loading={loading}
            onSelect={handleSelectMessage}
          />
          {lastSync && (
            <div className="text-[10px] text-muted-foreground px-3 py-1 border-t bg-[#FAFAFA]">
              Ultima sincronizacao: {lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} | {messages.length} e-mails
            </div>
          )}
        </div>

        {/* Message viewer panel */}
        <div className={`flex-1 min-w-0 ${selectedMessageId ? "flex" : "hidden lg:flex"} flex-col`}>
          {selectedMessage ? (
            <EmailViewer
              message={selectedMessage}
              onReply={handleReply}
              onForward={handleForward}
              onBack={() => { setSelectedMessageId(null); setSelectedMessage(null) }}
              isMock={isMock}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="size-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Selecione um e-mail para visualizar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <EmailCompose
        open={composeOpen}
        onOpenChange={setComposeOpen}
        mode={composeMode}
        replyTo={replyToMessage}
        isMock={isMock}
        onSent={() => {
          setComposeOpen(false)
          fetchMessages(selectedFolder)
        }}
      />
    </div>
  )
}
