"use client"

import { useState, useEffect, useRef } from "react"
import {
  MessageCircle, Search, Plus, Archive, Send, Paperclip, FileText,
  Phone, Scale, Folder, User, Clock, Check, CheckCheck, AlertTriangle,
  Image, File, Mic, Video, ChevronDown, MoreVertical, X, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { trpc } from "@/lib/trpc"

// ═══ Types ═══

interface Conversation {
  id: string
  phone_number: string
  contact_name: string | null
  last_message: string | null
  last_message_at: string | null
  last_interaction_at: string | null
  unread_count: number
  status: string
  person_id: string | null
  case_id: string | null
  project_id: string | null
  person?: { id: string; nome: string; tipo: string } | null
  case_?: { id: string; numero_processo: string | null } | null
  project?: { id: string; titulo: string; codigo: string } | null
  messages?: Message[]
}

interface Message {
  id: string
  direction: string
  type: string
  content: string | null
  media_url: string | null
  media_filename: string | null
  template_name: string | null
  status: string
  created_at: string
}

interface Template {
  id: string
  name: string
  display_name: string
  body_text: string
  variables: unknown
}

// ═══ Helpers ═══

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return formatTime(iso)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Ontem"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function formatPhone(phone: string): string {
  if (phone.length === 13 && phone.startsWith("55")) {
    return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`
  }
  return phone
}

function isWithin24h(lastInteraction: string | null): boolean {
  if (!lastInteraction) return false
  const diff = Date.now() - new Date(lastInteraction).getTime()
  return diff < 24 * 60 * 60 * 1000
}

function MessageStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "READ":
      return <CheckCheck className="size-3 text-blue-500" />
    case "DELIVERED":
      return <CheckCheck className="size-3 text-gray-400" />
    case "SENT":
      return <Check className="size-3 text-gray-400" />
    case "FAILED":
      return <AlertTriangle className="size-3 text-red-500" />
    default:
      return <Clock className="size-3 text-gray-400" />
  }
}

function MessageTypeIcon({ type }: { type: string }) {
  switch (type) {
    case "IMAGE": return <Image className="size-3" />
    case "DOCUMENT": return <File className="size-3" />
    case "AUDIO": return <Mic className="size-3" />
    case "VIDEO": return <Video className="size-3" />
    case "TEMPLATE": return <FileText className="size-3" />
    default: return null
  }
}

// ═══ Main Layout ═══

export function WhatsAppLayout() {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [newPhone, setNewPhone] = useState("")
  const [newName, setNewName] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Queries
  const convsQuery = trpc.whatsapp.conversations.useQuery({
    status: showArchived ? "ARCHIVED" : "ACTIVE",
    search: searchTerm || undefined,
  })
  const messagesQuery = trpc.whatsapp.messages.useQuery(
    { conversationId: selectedConv?.id || "" },
    { enabled: !!selectedConv?.id, refetchInterval: 5000 }
  )
  const templatesQuery = trpc.whatsapp.templates.useQuery()
  const quickRepliesQuery = trpc.whatsapp.quickReplies.useQuery()

  // Mutations
  const utils = trpc.useUtils()
  const sendText = trpc.whatsapp.sendText.useMutation({
    onSuccess: () => {
      setMessageText("")
      utils.whatsapp.messages.invalidate()
      utils.whatsapp.conversations.invalidate()
    },
  })
  const sendTemplate = trpc.whatsapp.sendTemplate.useMutation({
    onSuccess: () => {
      setTemplateOpen(false)
      utils.whatsapp.messages.invalidate()
      utils.whatsapp.conversations.invalidate()
    },
  })
  const markRead = trpc.whatsapp.markRead.useMutation({
    onSuccess: () => utils.whatsapp.conversations.invalidate(),
  })
  const archiveConv = trpc.whatsapp.archiveConversation.useMutation({
    onSuccess: () => {
      setSelectedConv(null)
      utils.whatsapp.conversations.invalidate()
    },
  })
  const createConv = trpc.whatsapp.createConversation.useMutation({
    onSuccess: (data) => {
      setNewConvOpen(false)
      setNewPhone("")
      setNewName("")
      utils.whatsapp.conversations.invalidate()
      setSelectedConv(data as unknown as Conversation)
    },
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messagesQuery.data])

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedConv?.id && selectedConv.unread_count > 0) {
      markRead.mutate({ conversationId: selectedConv.id })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConv?.id])

  const conversations = (convsQuery.data?.items || []) as Conversation[]
  const messages = (messagesQuery.data?.items || []) as Message[]
  const isMock = convsQuery.data?.mock ?? true
  const windowOpen = selectedConv ? isWithin24h(selectedConv.last_interaction_at) : false

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv) return
    sendText.mutate({
      conversationId: selectedConv.id,
      phone: selectedConv.phone_number,
      text: messageText.trim(),
    })
  }

  const handleSendTemplate = (tpl: Template, vars: string[]) => {
    if (!selectedConv) return
    sendTemplate.mutate({
      conversationId: selectedConv.id,
      phone: selectedConv.phone_number,
      templateName: tpl.name,
      variables: vars,
    })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-2.5 bg-white shrink-0">
        <MessageCircle className="size-5 text-emerald-600" />
        <h1 className="text-lg font-semibold">WhatsApp</h1>
        {isMock && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
            Modo demonstração
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="size-8" onClick={() => convsQuery.refetch()}>
          <RefreshCw className={`size-4 ${convsQuery.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Main 2-panel */}
      <div className="flex flex-1 min-h-0">
        {/* Left — Conversations list */}
        <div className={cn(
          "w-full lg:w-[360px] lg:max-w-[360px] border-r flex flex-col shrink-0",
          selectedConv ? "hidden lg:flex" : "flex"
        )}>
          {/* Search + New */}
          <div className="p-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button size="icon" className="size-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => setNewConvOpen(true)}>
                <Plus className="size-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant={!showArchived ? "default" : "ghost"}
                size="sm"
                className={cn("h-6 text-[10px]", !showArchived && "bg-emerald-600 hover:bg-emerald-700")}
                onClick={() => setShowArchived(false)}
              >
                Ativas
              </Button>
              <Button
                variant={showArchived ? "default" : "ghost"}
                size="sm"
                className={cn("h-6 text-[10px] gap-1", showArchived && "bg-emerald-600 hover:bg-emerald-700")}
                onClick={() => setShowArchived(true)}
              >
                <Archive className="size-2.5" /> Arquivadas
              </Button>
            </div>
          </div>

          {/* Conversation items */}
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b transition-colors",
                    selectedConv?.id === conv.id
                      ? "bg-emerald-50 border-l-2 border-l-emerald-600"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-emerald-700">
                        {(conv.contact_name || conv.phone_number).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate flex-1">
                          {conv.contact_name || formatPhone(conv.phone_number)}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {conv.last_message_at ? formatDate(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-muted-foreground flex-1 line-clamp-1">
                          {conv.last_message || "Sem mensagens"}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="flex items-center justify-center size-4.5 min-w-[18px] rounded-full bg-emerald-600 text-white text-[10px] font-bold px-1">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right — Chat view */}
        <div className={cn(
          "flex-1 min-w-0 flex flex-col",
          selectedConv ? "flex" : "hidden lg:flex"
        )}>
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="shrink-0 px-4 py-2.5 border-b bg-white flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 lg:hidden"
                  onClick={() => setSelectedConv(null)}
                >
                  <X className="size-4" />
                </Button>
                <div className="size-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold text-emerald-700">
                    {(selectedConv.contact_name || selectedConv.phone_number).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedConv.contact_name || formatPhone(selectedConv.phone_number)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatPhone(selectedConv.phone_number)}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5">
                  {selectedConv.person && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <User className="size-2.5" /> {selectedConv.person.nome}
                    </Badge>
                  )}
                  {selectedConv.case_ && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-[#C9A961] border-[#C9A961]/30">
                      <Scale className="size-2.5" /> {selectedConv.case_.numero_processo || "Processo"}
                    </Badge>
                  )}
                  {selectedConv.project && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Folder className="size-2.5" /> {selectedConv.project.codigo}
                    </Badge>
                  )}
                </div>

                {/* 24h window indicator */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] gap-1",
                    windowOpen
                      ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                      : "text-red-700 border-red-300 bg-red-50"
                  )}
                >
                  <Clock className="size-2.5" />
                  {windowOpen ? "Janela aberta" : "Fora da janela 24h"}
                </Badge>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      archiveConv.mutate({
                        conversationId: selectedConv.id,
                        archive: selectedConv.status !== "ARCHIVED",
                      })
                    }}>
                      <Archive className="size-3.5 mr-2" />
                      {selectedConv.status === "ARCHIVED" ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Phone className="size-3.5 mr-2" /> Ligar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 bg-[#ECE5DD]">
                <div className="p-4 space-y-1 min-h-full flex flex-col justify-end">
                  {messages.map((msg) => {
                    const isOutbound = msg.direction === "OUTBOUND"
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          isOutbound ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-sm",
                            isOutbound
                              ? "bg-[#DCF8C6] text-gray-900 rounded-tr-none"
                              : "bg-white text-gray-900 rounded-tl-none"
                          )}
                        >
                          {/* Template badge */}
                          {msg.template_name && (
                            <div className="flex items-center gap-1 mb-1">
                              <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                                <FileText className="size-2 mr-0.5" /> Template
                              </Badge>
                            </div>
                          )}

                          {/* Media indicator */}
                          {msg.type !== "TEXT" && msg.type !== "TEMPLATE" && (
                            <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                              <MessageTypeIcon type={msg.type} />
                              {msg.media_filename && (
                                <span className="truncate">{msg.media_filename}</span>
                              )}
                              {!msg.media_filename && <span>{msg.type.toLowerCase()}</span>}
                            </div>
                          )}

                          {/* Content */}
                          {msg.content && (
                            <p className="whitespace-pre-wrap break-words text-[13px]">
                              {msg.content}
                            </p>
                          )}

                          {/* Timestamp + status */}
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[10px] text-gray-500">
                              {formatTime(msg.created_at)}
                            </span>
                            {isOutbound && <MessageStatusIcon status={msg.status} />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="shrink-0 border-t bg-white p-2">
                {/* 24h window warning */}
                {!windowOpen && (
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span className="flex-1">Fora da janela de 24h. Use um template aprovado.</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] border-red-300"
                      onClick={() => setTemplateOpen(true)}
                    >
                      <FileText className="size-2.5 mr-1" /> Templates
                    </Button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  {/* Quick replies */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0">
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground">
                        Respostas rápidas
                      </p>
                      {(quickRepliesQuery.data || []).map((qr) => (
                        <DropdownMenuItem
                          key={qr.id}
                          onClick={() => setMessageText(qr.text)}
                          className="text-xs"
                        >
                          {qr.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTemplateOpen(true)} className="text-xs">
                        <FileText className="size-3 mr-2" /> Enviar template
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Attach */}
                  <Button variant="ghost" size="icon" className="size-8 shrink-0">
                    <Paperclip className="size-4" />
                  </Button>

                  {/* Text input */}
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={windowOpen ? "Digite uma mensagem..." : "Use template (fora da janela 24h)"}
                    disabled={!windowOpen}
                    className="min-h-[36px] max-h-[120px] text-sm resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />

                  {/* Send */}
                  <Button
                    size="icon"
                    className="size-8 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                    disabled={!messageText.trim() || !windowOpen || sendText.isPending}
                    onClick={handleSend}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-[#F0F2F5]">
              <div className="text-center">
                <MessageCircle className="size-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-gray-500">JRCLaw WhatsApp</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Selecione uma conversa para começar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New conversation dialog */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone (com DDD)</Label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="5544999001001"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do contato (opcional)</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="João Silva"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!newPhone || createConv.isPending}
              onClick={() => {
                createConv.mutate({
                  phone_number: newPhone,
                  contact_name: newName || undefined,
                })
              }}
            >
              Iniciar conversa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template picker dialog */}
      <TemplatePicker
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        templates={(templatesQuery.data?.items || []) as Template[]}
        onSend={handleSendTemplate}
      />
    </div>
  )
}

// ═══ Template Picker ═══

function TemplatePicker({
  open,
  onOpenChange,
  templates,
  onSend,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  templates: Template[]
  onSend: (tpl: Template, vars: string[]) => void
}) {
  const [selectedTpl, setSelectedTpl] = useState<Template | null>(null)
  const [variables, setVariables] = useState<string[]>([])

  useEffect(() => {
    if (selectedTpl) {
      const vars = selectedTpl.variables as string[] | null
      setVariables(new Array(vars?.length || 0).fill(""))
    }
  }, [selectedTpl])

  const preview = selectedTpl
    ? variables.reduce(
        (text, v, i) => text.replace(`{{${i + 1}}}`, v || `{{${i + 1}}}`),
        selectedTpl.body_text
      )
    : ""

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedTpl(null); onOpenChange(v) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar template</DialogTitle>
        </DialogHeader>

        {!selectedTpl ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTpl(tpl)}
                className="w-full text-left p-3 rounded-md border hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{tpl.display_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {tpl.body_text}
                </p>
              </button>
            ))}
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum template disponível
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{selectedTpl.display_name}</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedTpl(null)}>
                Trocar
              </Button>
            </div>

            {/* Variable inputs */}
            {(selectedTpl.variables as string[] | null)?.map((varName, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{varName}</Label>
                <Input
                  value={variables[i] || ""}
                  onChange={(e) => {
                    const newVars = [...variables]
                    newVars[i] = e.target.value
                    setVariables(newVars)
                  }}
                  className="h-7 text-xs"
                  placeholder={`Valor para ${varName}`}
                />
              </div>
            ))}

            {/* Preview */}
            <div className="rounded-md bg-[#DCF8C6] p-3 text-xs">
              <p className="text-[10px] font-medium text-gray-500 mb-1">Preview:</p>
              <p className="whitespace-pre-wrap">{preview}</p>
            </div>
          </div>
        )}

        {selectedTpl && (
          <DialogFooter>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onSend(selectedTpl, variables)}
            >
              <Send className="size-3 mr-1" /> Enviar template
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
