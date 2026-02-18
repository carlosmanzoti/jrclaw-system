"use client"

import { useState, useEffect } from "react"
import {
  Calendar, Clock, AlertTriangle, MapPin, Link2, ArrowRight, ArrowLeft, Loader2, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc"
import type { OutlookMessage } from "@/lib/microsoft-graph"

interface EmailActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: OutlookMessage
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  PRAZO: "Prazo",
  AUDIENCIA: "Audiência",
  REUNIAO: "Reunião",
  DESPACHO: "Despacho",
  DILIGENCIA: "Diligência",
  PETICAO: "Petição",
  RECURSO: "Recurso",
  PROVIDENCIA: "Providência",
  OUTRO: "Outro",
}

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  PRAZO: "⚖️",
  AUDIENCIA: "🏛️",
  REUNIAO: "👥",
  DESPACHO: "📋",
  DILIGENCIA: "🔍",
  PETICAO: "📄",
  RECURSO: "📑",
  PROVIDENCIA: "✅",
  OUTRO: "📌",
}

export function EmailActivityModal({ open, onOpenChange, message }: EmailActivityModalProps) {
  const [step, setStep] = useState(1)

  // Step 1 - Extraction result
  const [tipo, setTipo] = useState("OUTRO")
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null)

  // Step 2 - Linkage
  const [caseId, setCaseId] = useState<string>("")
  const [projectId, setProjectId] = useState<string>("")
  const [responsavelId, setResponsavelId] = useState<string>("")

  // Step 2 - Deadline
  const [criarPrazo, setCriarPrazo] = useState(false)
  const [dataLimite, setDataLimite] = useState("")
  const [contagemTipo, setContagemTipo] = useState<"DIAS_UTEIS" | "DIAS_CORRIDOS">("DIAS_UTEIS")
  const [diasPrazo, setDiasPrazo] = useState<number | undefined>()
  const [tipoPrazo, setTipoPrazo] = useState<"FATAL" | "ORDINARIO">("ORDINARIO")

  // Step 2 - Calendar
  const [criarEvento, setCriarEvento] = useState(false)
  const [dataEvento, setDataEvento] = useState("")
  const [localEvento, setLocalEvento] = useState("")
  const [linkVirtual, setLinkVirtual] = useState("")
  const [sincronizarOutlook, setSincronizarOutlook] = useState(false)

  // Queries
  const casesQuery = trpc.cases.list.useQuery(
    { status: "ATIVO", limit: 100 },
    { enabled: open }
  )
  const projectsQuery = trpc.projects.list.useQuery(
    { limit: 100 },
    { enabled: open }
  )
  const usersQuery = trpc.users.list.useQuery(undefined, { enabled: open })

  // Mutations
  const extractMutation = trpc.emailActivity.extractData.useMutation()
  const createMutation = trpc.emailActivity.create.useMutation()

  // Extract on open
  useEffect(() => {
    if (open && message) {
      setStep(1)
      extractMutation.mutate(
        {
          subject: message.subject,
          bodyHtml: message.body?.content || message.bodyPreview || "",
          messageId: message.id,
          from: message.from.email,
          receivedAt: message.receivedAt,
        },
        {
          onSuccess: (data) => {
            setTipo(data.tipo)
            setTitulo(data.titulo)
            setDescricao(data.descricao || "")
            setExtractedData({
              deadline: data.deadline,
              meeting: data.meeting,
              court: data.court,
              processos: data.processos,
            })

            // Auto-fill deadline fields
            if (data.deadline) {
              setCriarPrazo(true)
              if (data.deadline.data_limite) {
                setDataLimite(data.deadline.data_limite.slice(0, 16))
              }
              if (data.deadline.dias) {
                setDiasPrazo(data.deadline.dias)
              }
              setContagemTipo(data.deadline.contagem)
              setTipoPrazo(data.deadline.tipo_prazo === "FATAL" ? "FATAL" : "ORDINARIO")
            }

            // Auto-fill meeting fields
            if (data.meeting) {
              setCriarEvento(true)
              if (data.meeting.data) {
                const dt = data.meeting.data.slice(0, 10)
                const time = data.meeting.hora || "09:00"
                setDataEvento(`${dt}T${time}`)
              }
              if (data.meeting.local) setLocalEvento(data.meeting.local)
              if (data.meeting.link) setLinkVirtual(data.meeting.link)
            }

            // Try to match process number to case
            if (data.processos && data.processos.length > 0 && casesQuery.data) {
              const firstProc = data.processos[0].numero
              const items = casesQuery.data as { items?: Array<{ id: string; numero_processo?: string | null }> }
              const matched = (items.items || []).find(
                (c) => c.numero_processo === firstProc
              )
              if (matched) {
                setCaseId(matched.id)
              }
            }
          },
        }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, message?.id])

  const handleCreate = () => {
    createMutation.mutate(
      {
        outlook_message_id: message.id,
        email_subject: message.subject,
        email_from: message.from.email,
        email_received_at: message.receivedAt,
        tipo: tipo as "PRAZO" | "AUDIENCIA" | "REUNIAO" | "DESPACHO" | "DILIGENCIA" | "PETICAO" | "RECURSO" | "PROVIDENCIA" | "OUTRO",
        titulo,
        descricao: descricao || undefined,
        case_id: caseId || undefined,
        project_id: projectId || undefined,
        responsavel_id: responsavelId || undefined,
        criar_prazo: criarPrazo,
        data_limite: dataLimite ? new Date(dataLimite) : undefined,
        contagem_tipo: contagemTipo,
        dias_prazo: diasPrazo,
        tipo_prazo: tipoPrazo,
        criar_evento: criarEvento,
        data_evento: dataEvento ? new Date(dataEvento) : undefined,
        local_evento: localEvento || undefined,
        link_virtual: linkVirtual || undefined,
        sincronizar_outlook: sincronizarOutlook,
        extracted_data: extractedData || undefined,
        reminders: [],
      },
      {
        onSuccess: () => {
          setStep(3)
        },
      }
    )
  }

  const resetForm = () => {
    setStep(1)
    setTipo("OUTRO")
    setTitulo("")
    setDescricao("")
    setCaseId("")
    setProjectId("")
    setResponsavelId("")
    setCriarPrazo(false)
    setDataLimite("")
    setCriarEvento(false)
    setDataEvento("")
    setLocalEvento("")
    setLinkVirtual("")
    setSincronizarOutlook(false)
    setExtractedData(null)
  }

  const casesList = (casesQuery.data as { items?: Array<{ id: string; numero_processo?: string | null; cliente?: { nome?: string } }> })?.items || []
  const projectsList = (projectsQuery.data as { items?: Array<{ id: string; titulo: string; codigo: string }> })?.items || []
  const usersList = (usersQuery.data as Array<{ id: string; name: string }>) || []

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Criar atividade do e-mail
            <Badge variant="outline" className="text-[10px]">
              Passo {step}/3
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Extraction */}
        {step === 1 && (
          <div className="space-y-4">
            {extractMutation.isPending && (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Analisando e-mail...</span>
              </div>
            )}

            {extractMutation.isSuccess && (
              <>
                {/* Smart banner with detected info */}
                {extractedData && (
                  <div className="rounded-md border bg-amber-50 p-3 text-xs space-y-1">
                    <p className="font-medium text-amber-800">Dados detectados automaticamente:</p>
                    {(() => {
                      const processos = extractedData.processos as Array<{ numero: string }> | undefined
                      if (!processos?.length) return null
                      return (
                        <p className="text-amber-700">
                          Processos: {processos.map(p => p.numero).join(", ")}
                        </p>
                      )
                    })()}
                    {(() => {
                      const deadline = extractedData.deadline as { dias: number; contagem: string } | null
                      if (!deadline) return null
                      return (
                        <p className="text-amber-700">
                          Prazo: {deadline.dias} dias ({deadline.contagem === "DIAS_UTEIS" ? "úteis" : "corridos"})
                        </p>
                      )
                    })()}
                    {(() => {
                      const meeting = extractedData.meeting as { link: string | null } | null
                      if (!meeting) return null
                      return (
                        <p className="text-amber-700">
                          Evento detectado{meeting.link ? " (com link)" : ""}
                        </p>
                      )
                    })()}
                    {(() => {
                      const court = extractedData.court as { vara?: string } | null
                      if (!court?.vara) return null
                      return (
                        <p className="text-amber-700">
                          Vara: {court.vara}
                        </p>
                      )
                    })()}
                  </div>
                )}

                {/* Type selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de atividade</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setTipo(key)}
                        className={`text-xs py-2 px-2 rounded-md border transition-colors ${
                          tipo === key
                            ? "bg-[#C9A961]/10 border-[#C9A961] text-[#C9A961] font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {ACTIVITY_TYPE_ICONS[key]} {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Título da atividade"
                    className="h-8 text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição (opcional)</Label>
                  <Textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Detalhes..."
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {extractMutation.isError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle className="size-4" />
                Erro ao analisar e-mail. Preencha manualmente.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Linkage */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vinculação
              </h4>

              <div className="space-y-1.5">
                <Label className="text-xs">Processo (opcional)</Label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar processo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {casesList.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.numero_processo || "Sem número"} — {c.cliente?.nome || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Projeto (opcional)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar projeto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {projectsList.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.codigo} — {p.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Responsável</Label>
                <Select value={responsavelId} onValueChange={setResponsavelId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usersList.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deadline section */}
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Criar prazo</span>
                </div>
                <Switch checked={criarPrazo} onCheckedChange={setCriarPrazo} />
              </div>

              {criarPrazo && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Data limite</Label>
                      <Input
                        type="datetime-local"
                        value={dataLimite}
                        onChange={(e) => setDataLimite(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Dias</Label>
                      <Input
                        type="number"
                        value={diasPrazo ?? ""}
                        onChange={(e) => setDiasPrazo(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="h-7 text-xs"
                        placeholder="15"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Contagem</Label>
                      <Select value={contagemTipo} onValueChange={(v) => setContagemTipo(v as "DIAS_UTEIS" | "DIAS_CORRIDOS")}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DIAS_UTEIS" className="text-xs">Dias úteis</SelectItem>
                          <SelectItem value="DIAS_CORRIDOS" className="text-xs">Dias corridos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Tipo do prazo</Label>
                      <Select value={tipoPrazo} onValueChange={(v) => setTipoPrazo(v as "FATAL" | "ORDINARIO")}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FATAL" className="text-xs">Fatal</SelectItem>
                          <SelectItem value="ORDINARIO" className="text-xs">Ordinário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!caseId && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="size-3" />
                      Selecione um processo acima para criar o prazo
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Calendar event section */}
            <div className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Criar evento no calendário</span>
                </div>
                <Switch checked={criarEvento} onCheckedChange={setCriarEvento} />
              </div>

              {criarEvento && (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Data e hora</Label>
                    <Input
                      type="datetime-local"
                      value={dataEvento}
                      onChange={(e) => setDataEvento(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Local</Label>
                    <div className="flex items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground shrink-0" />
                      <Input
                        value={localEvento}
                        onChange={(e) => setLocalEvento(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Sala, endereço..."
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Link virtual</Label>
                    <div className="flex items-center gap-1">
                      <Link2 className="size-3 text-muted-foreground shrink-0" />
                      <Input
                        value={linkVirtual}
                        onChange={(e) => setLinkVirtual(e.target.value)}
                        className="h-7 text-xs"
                        placeholder="Teams, Zoom..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px]">Sincronizar com Outlook</span>
                    <Switch
                      checked={sincronizarOutlook}
                      onCheckedChange={setSincronizarOutlook}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <CheckCircle2 className="size-12 text-emerald-500" />
            <h3 className="font-semibold">Atividade criada com sucesso!</h3>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              {criarPrazo && caseId && <p>Prazo processual criado</p>}
              {criarEvento && <p>Evento adicionado ao calendário</p>}
              {sincronizarOutlook && criarEvento && <p>Sincronizado com Outlook</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <Button
              onClick={() => setStep(2)}
              disabled={!titulo || extractMutation.isPending}
              className="gap-1"
              size="sm"
            >
              Próximo <ArrowRight className="size-3" />
            </Button>
          )}

          {step === 2 && (
            <div className="flex items-center gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="size-3" /> Voltar
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                size="sm"
                className="gap-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-3 animate-spin" /> Criando...
                  </>
                ) : (
                  <>Criar atividade</>
                )}
              </Button>
            </div>
          )}

          {step === 3 && (
            <Button size="sm" onClick={() => { resetForm(); onOpenChange(false) }}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
