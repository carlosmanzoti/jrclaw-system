"use client"

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot, User, Send, Sparkles, Loader2,
  FileText, Scale, CheckCircle, Search,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface WorkspaceAIChatProps {
  deadlineId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  workspacePhase?: string
  deadlineTitle?: string
}

// ---------------------------------------------------------------------------
// Quick actions definition
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  { action: "gerar_rascunho", label: "Gerar rascunho", icon: FileText },
  { action: "sugerir_teses", label: "Sugerir teses", icon: Scale },
  { action: "verificar_citacoes", label: "Verificar citacoes", icon: Search },
  { action: "analisar_coerencia", label: "Analisar coerencia", icon: CheckCircle },
] as const

// ---------------------------------------------------------------------------
// Loading dots animation
// ---------------------------------------------------------------------------

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkspaceAIChat({
  deadlineId,
  open,
  onOpenChange,
  workspacePhase,
  deadlineTitle,
}: WorkspaceAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Keyboard shortcut (Ctrl+Shift+A) ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "A" && e.ctrlKey && e.shiftKey) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  // ── Auto-scroll to bottom ───────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming, scrollToBottom])

  // ── Focus textarea when opened ──────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 300)
    }
  }, [open])

  // ── Stream chat message ─────────────────────────────────────────────
  const sendMessage = useCallback(async (userContent: string) => {
    if (!userContent.trim() || isStreaming) return

    const userMsg: ChatMessage = { role: "user", content: userContent.trim() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput("")
    setIsStreaming(true)

    const assistantMsg: ChatMessage = { role: "assistant", content: "" }
    setMessages([...updatedMessages, assistantMsg])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(`/api/ai/workspace/${deadlineId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Erro ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("Stream indisponivel")

      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk

        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "assistant", content: accumulated }
          return updated
        })
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return

      const errorMessage = (error as Error).message || "Erro ao comunicar com o assistente."
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Desculpe, ocorreu um erro: ${errorMessage}`,
        }
        return updated
      })
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [deadlineId, isStreaming, messages])

  // ── Execute quick action (non-streaming) ────────────────────────────
  const executeQuickAction = useCallback(async (action: string, label: string) => {
    if (isStreaming || quickActionLoading) return

    setQuickActionLoading(action)

    const userMsg: ChatMessage = { role: "user", content: label }
    setMessages(prev => [...prev, userMsg])

    try {
      const response = await fetch(`/api/ai/workspace/${deadlineId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Erro ${response.status}`)
      }

      // Check if the response is streaming (some actions stream)
      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("text/plain") || contentType.includes("text/event-stream")) {
        // Streaming response
        const reader = response.body?.getReader()
        if (!reader) throw new Error("Stream indisponivel")

        const decoder = new TextDecoder()
        let accumulated = ""

        const assistantMsg: ChatMessage = { role: "assistant", content: "" }
        setMessages(prev => [...prev, assistantMsg])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          accumulated += decoder.decode(value, { stream: true })
          setMessages(prev => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: "assistant", content: accumulated }
            return updated
          })
        }
      } else {
        // JSON response
        const data = await response.json()
        const resultText = typeof data.result === "string"
          ? data.result
          : JSON.stringify(data.result, null, 2)

        setMessages(prev => [
          ...prev,
          { role: "assistant", content: resultText },
        ])
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `Erro ao executar "${label}": ${(error as Error).message}`,
        },
      ])
    } finally {
      setQuickActionLoading(null)
    }
  }, [deadlineId, isStreaming, quickActionLoading])

  // ── Handle keyboard in textarea ─────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  // ── Determine busy state ────────────────────────────────────────────
  const isBusy = isStreaming || !!quickActionLoading

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className="w-full sm:max-w-md flex flex-col p-0 gap-0"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <SheetHeader className="border-b px-4 py-3 space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm">Assistente IA</SheetTitle>
              <p className="text-xs text-muted-foreground truncate">
                {deadlineTitle || "Workspace"}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              Ctrl+Shift+A
            </Badge>
          </div>

          {workspacePhase && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Fase:
              </span>
              <Badge variant="secondary" className="text-[10px] h-5">
                {workspacePhase}
              </Badge>
            </div>
          )}
        </SheetHeader>

        {/* ── Messages ───────────────────────────────────────────── */}
        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                  <Sparkles className="size-5 text-primary/60" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assistente juridico IA
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                  Pergunte sobre o prazo, solicite rascunhos, analises de teses
                  ou use as acoes rapidas abaixo.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.content || (isStreaming && idx === messages.length - 1 && <LoadingDots />)}
                </div>

                {msg.role === "user" && (
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="size-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <div className="shrink-0 border-t px-3 py-2">
          <div className="flex gap-1.5 flex-wrap">
            {QUICK_ACTIONS.map(({ action, label, icon: Icon }) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1 px-2"
                disabled={isBusy}
                onClick={() => executeQuickAction(action, label)}
              >
                {quickActionLoading === action ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Icon className="size-3" />
                )}
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Input Area ─────────────────────────────────────────── */}
        <div className="shrink-0 border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao assistente..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isBusy}
            />
            <Button
              size="icon"
              className="size-9 shrink-0"
              disabled={!input.trim() || isBusy}
              onClick={() => sendMessage(input)}
            >
              {isStreaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Enter para enviar &middot; Shift+Enter para nova linha
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
