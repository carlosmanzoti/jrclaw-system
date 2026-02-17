"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PERSON_TYPE_LABELS, PERSON_SUBTYPE_LABELS } from "@/lib/constants"

interface PersonQuickCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTipo?: string
  onCreated: (id: string, nome: string) => void
}

export function PersonQuickCreate({
  open,
  onOpenChange,
  defaultTipo,
  onCreated,
}: PersonQuickCreateProps) {
  const [tipo, setTipo] = useState(defaultTipo || "CLIENTE")
  const [subtipo, setSubtipo] = useState("PESSOA_FISICA")
  const [nome, setNome] = useState("")
  const [cpfCnpj, setCpfCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [celular, setCelular] = useState("")

  const utils = trpc.useUtils()

  const createMutation = trpc.persons.create.useMutation({
    onSuccess: (data) => {
      utils.persons.list.invalidate()
      utils.persons.search.invalidate()
      onCreated(data.id, data.nome)
      // Reset form
      setNome("")
      setCpfCnpj("")
      setEmail("")
      setCelular("")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      tipo: tipo as "CLIENTE",
      subtipo: subtipo as "PESSOA_FISICA",
      nome,
      cpf_cnpj: cpfCnpj || null,
      email: email || null,
      celular: celular || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[500px] max-w-lg max-w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* FIXED HEADER */}
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>Cadastro Rápido de Pessoa</DialogTitle>
            <DialogDescription>
              Preencha os dados essenciais. Você pode completar o cadastro depois.
            </DialogDescription>
          </DialogHeader>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERSON_TYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Subtipo</Label>
                <Select value={subtipo} onValueChange={setSubtipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PERSON_SUBTYPE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={subtipo === "PESSOA_JURIDICA" ? "Nome fantasia" : "Nome completo"}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{subtipo === "PESSOA_JURIDICA" ? "CNPJ" : "CPF"}</Label>
              <Input
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(e.target.value)}
                placeholder={
                  subtipo === "PESSOA_JURIDICA" ? "00.000.000/0000-00" : "000.000.000-00"
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Celular</Label>
                <Input
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            {createMutation.error && (
              <p className="text-sm text-destructive">{createMutation.error.message}</p>
            )}
          </div>

          {/* FIXED FOOTER */}
          <DialogFooter className="shrink-0 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !nome}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
