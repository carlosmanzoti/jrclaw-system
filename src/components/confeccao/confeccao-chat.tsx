"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Send, User, Bot, Loader2, Crown } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CHAT_ACTIONS } from "@/lib/ai-prompt-builder"
import { MODEL_DISPLAY } from "@/lib/ai-model-map"
import type { ModelTier } from "@/lib/ai-model-map"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  modelTier?: ModelTier
}

interface ConfeccaoChatProps {
  sessionId: string
  caseId: string
  projectId: string
}

export function ConfeccaoChat({ sessionId, caseId, projectId }: ConfeccaoChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [nextMessageOpus, setNextMessageOpus] = useState(false)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const useOpus = nextMessageOpus
      setNextMessageOpus(false)

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: content.trim(),
      }

      const allMessages = [...messages, userMsg]
      setMessages(allMessages)
      setInput("")
      setIsLoading(true)

      const assistantId = `assistant_${Date.now()}`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", modelTier: useOpus ? "premium" : "standard" },
      ])

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
            sessionId,
            caseId: caseId && caseId !== "none" ? caseId : undefined,
            projectId: projectId && projectId !== "none" ? projectId : undefined,
            useOpus,
          }),
        })

        if (!res.ok) throw new Error("Erro na API")

        // Read tier from response header
        const tier = (res.headers.get("X-AI-Tier") as ModelTier) || (useOpus ? "premium" : "standard")

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No stream")

        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          // Text stream response sends plain text chunks
          accumulated += chunk
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated, modelTier: tier } : m))
          )
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "Erro ao comunicar com a IA. Tente novamente." }
              : m
          )
        )
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, sessionId, caseId, projectId, nextMessageOpus]
  )

  const handleAction = (actionKey: string) => {
    const actionPrompt = CHAT_ACTIONS[actionKey]
    if (actionPrompt) {
      sendMessage(actionPrompt)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-4 py-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="size-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">
                Assistente Jurídico IA pronto para ajudar.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vincule um processo ou projeto na sidebar para enriquecer o contexto.
              </p>

              {/* Quick actions */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {Object.entries(CHAT_ACTIONS).map(([key]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAction(key)}
                  >
                    {key
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="size-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="size-4 text-indigo-600" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : msg.content ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Skeleton className="h-8 w-48" />
                )}
                {/* Model tier badge for assistant messages */}
                {msg.role === "assistant" && msg.modelTier === "premium" && msg.content && (
                  <Badge variant="outline" className={`text-[10px] mt-2 ${MODEL_DISPLAY.premium.badgeClass}`}>
                    <Crown className="size-2.5 mr-0.5" />
                    Opus 4.6
                  </Badge>
                )}
              </div>
              {msg.role === "user" && (
                <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="size-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="size-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Loader2 className="size-4 text-indigo-600 animate-spin" />
              </div>
              <Skeleton className="h-16 w-64 rounded-lg" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao assistente jurídico..."
              className="min-h-[44px] max-h-32 resize-none pr-12 text-sm"
              rows={1}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={nextMessageOpus ? "default" : "outline"}
                  className={`h-[44px] px-3 ${nextMessageOpus ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}`}
                  onClick={() => setNextMessageOpus(!nextMessageOpus)}
                >
                  <Crown className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {nextMessageOpus ? "Opus 4.6 ativado para próxima mensagem" : "Consultar com Opus 4.6"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()} className="h-[44px]">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Shift+Enter para nova linha | Enter para enviar
          {nextMessageOpus && (
            <span className="text-amber-600 ml-2 font-medium">| Opus 4.6 ativado</span>
          )}
        </p>
      </div>
    </div>
  )
}
