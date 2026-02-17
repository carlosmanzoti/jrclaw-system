"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Send, User, Bot, Loader2, Crown, Paperclip, X, FileText, Trash2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CHAT_ACTIONS } from "@/lib/ai-prompt-builder"
import { MODEL_DISPLAY } from "@/lib/ai-model-map"
import type { ModelTier } from "@/lib/ai-model-map"
import {
  extractTextFromFile,
  isFileSupported,
  type ExtractedFile,
} from "@/lib/file-extractor"
import { ChatBibliotecaReferences } from "@/components/confeccao/biblioteca-references"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  modelTier?: ModelTier
  attachments?: { filename: string; chars: number }[]
  bibliotecaRefs?: { id: string; titulo: string; tipo: string }[]
}

interface ConfeccaoChatProps {
  sessionId: string
  caseId: string
  projectId: string
}

export function ConfeccaoChat({ sessionId, caseId, projectId }: ConfeccaoChatProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [nextMessageOpus, setNextMessageOpus] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<ExtractedFile[]>([])
  const [isExtracting, setIsExtracting] = useState(false)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(isFileSupported)
    if (validFiles.length === 0) return

    setIsExtracting(true)
    try {
      const extracted = await Promise.all(validFiles.map(extractTextFromFile))
      setAttachedFiles((prev) => [...prev, ...extracted])
    } catch {
      // Silently handle extraction errors
    } finally {
      setIsExtracting(false)
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      const useOpus = nextMessageOpus
      setNextMessageOpus(false)

      // Build content with file attachments
      let fullContent = content.trim()
      if (attachedFiles.length > 0) {
        fullContent += "\n\n---\n[DOCUMENTOS ANEXADOS]\n"
        attachedFiles.forEach((f) => {
          fullContent += `\n### ${f.filename}${f.label ? ` (${f.label})` : ""}\n${f.text}\n`
        })
      }

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: "user",
        content: content.trim(),
        attachments: attachedFiles.map((f) => ({ filename: f.filename, chars: f.chars })),
      }

      const allMessages = [...messages, userMsg]
      setMessages(allMessages)
      setInput("")
      setAttachedFiles([])
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
            messages: allMessages.map((m) => ({
              role: m.role,
              content: m === userMsg ? fullContent : m.content,
            })),
            sessionId,
            caseId: caseId && caseId !== "none" ? caseId : undefined,
            projectId: projectId && projectId !== "none" ? projectId : undefined,
            useOpus,
          }),
        })

        if (!res.ok) throw new Error("Erro na API")

        // Read tier from response header
        const tier = (res.headers.get("X-AI-Tier") as ModelTier) || (useOpus ? "premium" : "standard")

        // Read biblioteca refs from response header
        let bibRefs: { id: string; titulo: string; tipo: string }[] = []
        const bibRefsHeader = res.headers.get("X-Biblioteca-Refs")
        if (bibRefsHeader) {
          try {
            const refIds: string[] = JSON.parse(bibRefsHeader)
            // We only have IDs from the header; store them with minimal info
            bibRefs = refIds.map((id) => ({ id, titulo: "", tipo: "" }))
          } catch {}
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No stream")

        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          accumulated += chunk
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated, modelTier: tier, bibliotecaRefs: bibRefs.length > 0 ? bibRefs : undefined } : m))
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
    [messages, isLoading, sessionId, caseId, projectId, nextMessageOpus, attachedFiles]
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
      {/* Messages — scrollable area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4"
      >
        <div className="space-y-4 py-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="size-10 text-[#666666]/30 mx-auto" />
              <p className="text-sm text-[#666666] mt-3">
                Assistente Jurídico IA pronto para ajudar.
              </p>
              <p className="text-xs text-[#666666] mt-1">
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
                <div className="size-7 rounded-full bg-[#17A2B8]/10 flex items-center justify-center shrink-0">
                  <Bot className="size-4 text-[#17A2B8]" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-[#C9A961]/10 border border-[#C9A961]/30"
                    : "bg-[#F2F2F2]"
                }`}
              >
                {msg.role === "user" ? (
                  <div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.attachments.map((att, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            <FileText className="size-2.5 mr-1" />
                            {att.filename}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
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
                    <Crown className="size-2.5 mr-0.5 text-[#C9A961]" />
                    Opus 4.6
                  </Badge>
                )}
                {/* Biblioteca references for assistant messages */}
                {msg.role === "assistant" && msg.bibliotecaRefs && msg.bibliotecaRefs.length > 0 && msg.content && (
                  <ChatBibliotecaReferences entries={msg.bibliotecaRefs} />
                )}
              </div>
              {msg.role === "user" && (
                <div className="size-7 rounded-full bg-[#C9A961]/10 flex items-center justify-center shrink-0">
                  <User className="size-4 text-[#C9A961]" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="size-7 rounded-full bg-[#17A2B8]/10 flex items-center justify-center shrink-0">
                <Loader2 className="size-4 text-[#17A2B8] animate-spin" />
              </div>
              <Skeleton className="h-16 w-64 rounded-lg" />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — fixed at bottom */}
      <div className="border-t p-4 shrink-0">
        {/* Clear conversation */}
        {messages.length > 0 && (
          <div className="flex justify-end mb-2 max-w-3xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#666666] hover:text-[#DC3545]"
              onClick={() => {
                setMessages([])
                setInput("")
                setAttachedFiles([])
              }}
            >
              <Trash2 className="size-3 mr-1" />
              Limpar Conversa
            </Button>
          </div>
        )}

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 max-w-3xl mx-auto">
            {attachedFiles.map((file, index) => (
              <Badge key={`${file.filename}-${index}`} variant="outline" className="text-[10px] gap-1">
                <FileText className="size-2.5" />
                {file.filename}
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-1 hover:text-[#DC3545]"
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}

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
          {/* File attach button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-[44px] px-3"
                  disabled={isExtracting}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isExtracting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Paperclip className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Anexar arquivo (PDF, DOCX, TXT)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={(e) => {
              if (e.target.files) handleFileUpload(e.target.files)
              e.target.value = ""
            }}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant={nextMessageOpus ? "default" : "outline"}
                  className={`h-[44px] px-3 ${nextMessageOpus ? "bg-[#C9A961] hover:bg-[#C9A961]/80 text-white" : ""}`}
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
        <p className="text-[10px] text-[#666666] text-center mt-2">
          Shift+Enter para nova linha | Enter para enviar
          {nextMessageOpus && (
            <span className="text-[#C9A961] ml-2 font-medium">| Opus 4.6 ativado</span>
          )}
          {attachedFiles.length > 0 && (
            <span className="text-[#17A2B8] ml-2">| {attachedFiles.length} arquivo(s) anexado(s)</span>
          )}
        </p>
      </div>
    </div>
  )
}
