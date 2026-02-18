"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, ArrowLeft, ArrowRight, Loader2, Merge } from "lucide-react"

interface ConflictEvent {
  id: string
  titulo: string
  descricao: string | null
  data_inicio: string | Date
  data_fim: string | Date | null
  dia_inteiro: boolean
  local: string | null
  sync_conflict_data: {
    outlook_titulo: string
    outlook_descricao: string | null
    outlook_data_inicio: string
    outlook_data_fim: string | null
    outlook_dia_inteiro: boolean
    outlook_local: string | null
  } | null
}

interface CalendarSyncConflictModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: ConflictEvent | null
  onResolved: () => void
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—"
  const date = new Date(d)
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function CompareRow({
  label,
  local,
  outlook,
}: {
  label: string
  local: string | null | undefined
  outlook: string | null | undefined
}) {
  const isDiff = (local || "") !== (outlook || "")
  return (
    <div className={`grid grid-cols-[100px_1fr_1fr] gap-2 py-1.5 text-sm ${isDiff ? "bg-amber-50 -mx-2 px-2 rounded" : ""}`}>
      <span className="text-xs text-[#666666] font-medium">{label}</span>
      <span className="truncate">{local || "—"}</span>
      <span className="truncate">{outlook || "—"}</span>
    </div>
  )
}

export function CalendarSyncConflictModal({
  open,
  onOpenChange,
  event,
  onResolved,
}: CalendarSyncConflictModalProps) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"compare" | "manual">("compare")
  const [manualTitulo, setManualTitulo] = useState("")
  const [manualDescricao, setManualDescricao] = useState("")
  const [manualLocal, setManualLocal] = useState("")

  if (!event || !event.sync_conflict_data) return null

  const conflict = event.sync_conflict_data

  const handleResolve = async (resolution: "KEEP_LOCAL" | "KEEP_OUTLOOK" | "MANUAL") => {
    setLoading(true)
    try {
      await fetch("/api/calendar/sync/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          resolution,
          ...(resolution === "MANUAL" && {
            manualData: {
              titulo: manualTitulo,
              descricao: manualDescricao || null,
              local: manualLocal || null,
            },
          }),
        }),
      })
      onResolved()
      onOpenChange(false)
    } catch {
      // Error handling
    } finally {
      setLoading(false)
    }
  }

  const openManual = () => {
    setManualTitulo(event.titulo)
    setManualDescricao(event.descricao || "")
    setManualLocal(event.local || "")
    setMode("manual")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            Conflito de Sincronização
          </DialogTitle>
        </DialogHeader>

        {mode === "compare" ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-1">
              {/* Header */}
              <div className="grid grid-cols-[100px_1fr_1fr] gap-2 pb-2 border-b">
                <span />
                <Badge variant="outline" className="justify-center">JRCLaw</Badge>
                <Badge variant="outline" className="justify-center">Outlook</Badge>
              </div>

              <CompareRow
                label="Título"
                local={event.titulo}
                outlook={conflict.outlook_titulo}
              />
              <CompareRow
                label="Início"
                local={formatDate(event.data_inicio)}
                outlook={formatDate(conflict.outlook_data_inicio)}
              />
              <CompareRow
                label="Fim"
                local={formatDate(event.data_fim)}
                outlook={formatDate(conflict.outlook_data_fim)}
              />
              <CompareRow
                label="Local"
                local={event.local}
                outlook={conflict.outlook_local}
              />
              <CompareRow
                label="Descrição"
                local={event.descricao?.slice(0, 100)}
                outlook={conflict.outlook_descricao?.slice(0, 100)}
              />
              <CompareRow
                label="Dia inteiro"
                local={event.dia_inteiro ? "Sim" : "Não"}
                outlook={conflict.outlook_dia_inteiro ? "Sim" : "Não"}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleResolve("KEEP_LOCAL")}
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ArrowRight className="size-4 mr-1" />}
                Manter JRCLaw
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolve("KEEP_OUTLOOK")}
                disabled={loading}
              >
                {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ArrowLeft className="size-4 mr-1" />}
                Manter Outlook
              </Button>
              <Button onClick={openManual} disabled={loading}>
                <Merge className="size-4 mr-1" />
                Mesclar manualmente
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input value={manualTitulo} onChange={(e) => setManualTitulo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Local</Label>
                <Input value={manualLocal} onChange={(e) => setManualLocal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={manualDescricao} onChange={(e) => setManualDescricao(e.target.value)} rows={3} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setMode("compare")} disabled={loading}>
                Voltar
              </Button>
              <Button
                onClick={() => handleResolve("MANUAL")}
                disabled={!manualTitulo || loading}
              >
                {loading ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                Salvar e Sincronizar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
