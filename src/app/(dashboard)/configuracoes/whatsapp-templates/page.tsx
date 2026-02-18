"use client"

import { useState } from "react"
import {
  MessageCircle, Plus, Check, X, AlertTriangle, Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { trpc } from "@/lib/trpc"

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  APPROVED: { label: "Aprovado", class: "bg-emerald-100 text-emerald-700", icon: <Check className="size-3" /> },
  PENDING: { label: "Pendente", class: "bg-amber-100 text-amber-700", icon: <AlertTriangle className="size-3" /> },
  REJECTED: { label: "Rejeitado", class: "bg-red-100 text-red-700", icon: <X className="size-3" /> },
}

export default function WhatsAppTemplatesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [category, setCategory] = useState<"UTILITY" | "MARKETING">("UTILITY")
  const [bodyText, setBodyText] = useState("")

  const templatesQuery = trpc.whatsapp.templates.useQuery()
  const utils = trpc.useUtils()
  const createMutation = trpc.whatsapp.createTemplate.useMutation({
    onSuccess: () => {
      setCreateOpen(false)
      setName("")
      setDisplayName("")
      setBodyText("")
      utils.whatsapp.templates.invalidate()
    },
  })

  const templates = (templatesQuery.data?.items || []) as Array<{
    id: string
    name: string
    display_name: string
    category: string
    language: string
    body_text: string
    variables: unknown
    approval_status: string
    rejection_reason: string | null
  }>

  // Count variables in body text
  const varCount = (bodyText.match(/\{\{\d+\}\}/g) || []).length
  const varNames = Array.from({ length: varCount }, (_, i) => `variavel_${i + 1}`)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
              <MessageCircle className="size-6 text-emerald-600" />
              Templates WhatsApp
            </h1>
            <p className="text-[#666666] text-sm">
              Gerencie templates de mensagem aprovados pela Meta.
            </p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" /> Novo template
          </Button>
        </div>

        {/* Info */}
        <div className="rounded-md border bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
          <p className="font-medium">Sobre templates WhatsApp:</p>
          <p>Templates precisam ser aprovados pela Meta antes de serem enviados. Use variáveis como {"{{1}}"}, {"{{2}}"} para campos dinâmicos.</p>
          <p>Templates da categoria UTILITY são aprovados mais rapidamente. Templates MARKETING exigem opt-in do usuário.</p>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Categoria</TableHead>
                <TableHead className="text-xs">Idioma</TableHead>
                <TableHead className="text-xs">Corpo</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => {
                const statusCfg = STATUS_CONFIG[tpl.approval_status] || STATUS_CONFIG.PENDING
                return (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{tpl.display_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{tpl.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {tpl.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{tpl.language}</TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-[300px]">
                        {tpl.body_text}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] gap-1 ${statusCfg.class}`}>
                        {statusCfg.icon} {statusCfg.label}
                      </Badge>
                      {tpl.rejection_reason && (
                        <p className="text-[10px] text-red-500 mt-0.5">{tpl.rejection_reason}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="size-7">
                        <Pencil className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum template cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome técnico</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                  placeholder="nome_do_template"
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome de exibição</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nome de Exibição"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as "UTILITY" | "MARKETING")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY" className="text-xs">Utilidade</SelectItem>
                  <SelectItem value="MARKETING" className="text-xs">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Corpo da mensagem
                <span className="text-muted-foreground ml-1">
                  (use {"{{1}}"}, {"{{2}}"} para variáveis)
                </span>
              </Label>
              <Textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Prezado(a) {{1}}, informamos que..."
                rows={4}
                className="text-sm"
              />
              {varCount > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {varCount} variável(is) detectada(s): {varNames.join(", ")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!name || !displayName || !bodyText || createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  name,
                  display_name: displayName,
                  category,
                  body_text: bodyText,
                  variables: varNames,
                })
              }}
            >
              Criar template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
