"use client"

import { useState, useEffect } from "react"
import { Send, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/components/ui/use-toast"
import type { OutlookMessage } from "@/lib/microsoft-graph"

interface EmailComposeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "new" | "reply" | "forward"
  replyTo: OutlookMessage | null
  isMock: boolean
  onSent: () => void
}

export function EmailCompose({ open, onOpenChange, mode, replyTo, isMock, onSent }: EmailComposeProps) {
  const { toast } = useToast()
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === "reply" && replyTo) {
      setTo(replyTo.from.email)
      setSubject(replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`)
      setBody(`\n\n---\nEm ${new Date(replyTo.receivedAt).toLocaleString("pt-BR")}, ${replyTo.from.name} escreveu:\n> ${replyTo.bodyPreview}`)
    } else if (mode === "forward" && replyTo) {
      setTo("")
      setSubject(replyTo.subject.startsWith("Fwd:") ? replyTo.subject : `Fwd: ${replyTo.subject}`)
      setBody(`\n\n--- Mensagem encaminhada ---\nDe: ${replyTo.from.name} <${replyTo.from.email}>\nData: ${new Date(replyTo.receivedAt).toLocaleString("pt-BR")}\nAssunto: ${replyTo.subject}\n\n${replyTo.bodyPreview}`)
    } else {
      setTo("")
      setSubject("")
      setBody("")
    }
    setCc("")
    setShowCc(false)
  }, [open, mode, replyTo])

  const handleSend = async () => {
    if (!to.trim()) {
      toast({ title: "Informe o destinatario", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const toList = to.split(/[,;]/).map(e => e.trim()).filter(Boolean).map(e => ({ email: e }))
      const ccList = cc ? cc.split(/[,;]/).map(e => e.trim()).filter(Boolean).map(e => ({ email: e })) : undefined
      const htmlBody = body.replace(/\n/g, "<br/>")

      if (mode === "reply" && replyTo) {
        await fetch(`/api/email/messages/${replyTo.id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body: htmlBody, bodyType: "HTML", to: toList, cc: ccList }),
        })
      } else if (mode === "forward" && replyTo) {
        await fetch(`/api/email/messages/${replyTo.id}/forward`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: toList, comment: htmlBody }),
        })
      } else {
        const res = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, body: htmlBody, bodyType: "HTML", to: toList, cc: ccList }),
        })
        const data = await res.json()
        if (data.mock) {
          toast({ title: "Modo demonstracao", description: "Conecte sua conta Microsoft em Configuracoes para enviar e-mails." })
        }
      }
      toast({ title: "E-mail enviado" })
      onSent()
    } catch {
      toast({ title: "Erro ao enviar", variant: "destructive" })
    }
    setSending(false)
  }

  const handleAi = async (action: string, tone?: string) => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/ai/email-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          originalEmail: replyTo,
          tone,
          userInstructions: body || undefined,
        }),
      })
      const data = await res.json()
      if (data.html) {
        // Convert HTML back to plain text for textarea
        const plainText = data.html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
        setBody(plainText)
      }
    } catch {
      toast({ title: "Erro na IA", variant: "destructive" })
    }
    setAiLoading(false)
  }

  const title = mode === "reply" ? "Responder" : mode === "forward" ? "Encaminhar" : "Novo E-mail"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="px-4 py-2 space-y-2 border-b">
            <div className="flex items-center gap-2">
              <Label className="text-xs w-10 shrink-0">Para:</Label>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-7 text-sm flex-1"
              />
              {!showCc && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCc(true)}>Cc</Button>
              )}
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <Label className="text-xs w-10 shrink-0">Cc:</Label>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@exemplo.com"
                  className="h-7 text-sm flex-1"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-10 shrink-0">Assunto:</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do e-mail"
                className="h-7 text-sm flex-1"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[300px] border-0 focus-visible:ring-0 resize-none text-sm rounded-none"
              placeholder="Escreva sua mensagem..."
            />
          </ScrollArea>
        </div>

        {/* Footer toolbar */}
        <div className="shrink-0 px-4 py-3 border-t flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#C9A961] hover:bg-[#B8984F] text-white gap-1.5"
            onClick={handleSend}
            disabled={sending}
          >
            <Send className="size-3.5" />
            {sending ? "Enviando..." : "Enviar"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-[#C9A961] border-[#C9A961]/30" disabled={aiLoading}>
                <Sparkles className="size-3.5" />
                {aiLoading ? "Processando..." : "Harvey Specter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => handleAi("compose_reply")}>
                Redigir resposta com IA
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAi("improve")}>
                Melhorar texto atual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAi("formalize")}>
                Formalizar linguagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAi("summarize")}>
                Resumir thread
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px]">Tom da resposta</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleAi("compose_reply", "combativo")}>
                Tom combativo / firme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAi("compose_reply", "tecnico")}>
                Tom tecnico / neutro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAi("compose_reply", "conciliatorio")}>
                Tom conciliatorio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAi("compose_reply", "didatico")}>
                Tom didatico / acessivel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => onOpenChange(false)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
