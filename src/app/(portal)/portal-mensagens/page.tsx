"use client"

import { useState, useEffect, useRef } from "react"
import { PortalShell } from "@/components/portal/portal-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Send, Loader2 } from "lucide-react"

export default function PortalMensagensPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = () => {
    fetch("/api/portal/data?section=mensagens")
      .then(r => r.json())
      .then(data => setMessages(data.messages || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/portal/mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      if (res.ok) {
        setNewMessage("")
        loadMessages()
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <PortalShell activeTab="mensagens">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Mensagens</h1>
          <p className="text-sm text-muted-foreground">Comunicacao com o escritorio.</p>
        </div>

        <div className="bg-white border rounded-lg flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 400 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-2/3" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem para o escritorio.</p>
              </div>
            ) : (
              <>
                {[...messages].reverse().map((msg: any) => {
                  const isClient = msg.direction === "CLIENTE_PARA_ESCRITORIO"
                  return (
                    <div key={msg.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        isClient ? "bg-primary text-white" : "bg-gray-100 text-gray-900"
                      }`}>
                        {!isClient && msg.sender_name && (
                          <p className="text-xs font-medium mb-0.5 opacity-70">{msg.sender_name}</p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isClient ? "text-white/60" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <input
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            />
            <Button size="sm" disabled={!newMessage.trim() || sending} onClick={handleSend}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}
