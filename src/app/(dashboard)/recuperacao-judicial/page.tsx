"use client"

import { useState } from "react"
import Link from "next/link"
import { ShieldAlert, Users, BarChart3, Handshake, ArrowRight, Loader2, Plus, Scale, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Label } from "@/components/ui/label"
import { trpc } from "@/lib/trpc"
import { JR_STATUS_LABELS, JR_STATUS_COLORS } from "@/lib/rj-constants"

function formatCurrency(centavos: bigint | number | string): string {
  const val = Number(centavos) / 100
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("pt-BR")
}

export default function RecuperacaoJudicialPage() {
  const utils = trpc.useUtils()
  const { data: cases, isLoading } = trpc.rj.cases.list.useQuery()

  // Vincular dialog state
  const [showVincular, setShowVincular] = useState(false)
  const [selectedCaseId, setSelectedCaseId] = useState("")
  const [statusRj, setStatusRj] = useState("PROCESSAMENTO")

  const createJrc = trpc.rj.cases.create.useMutation({
    onSuccess: () => {
      utils.rj.cases.list.invalidate()
      setShowVincular(false)
      setSelectedCaseId("")
      setStatusRj("PROCESSAMENTO")
    },
  })

  // Available RJ cases (Cases with tipo RECUPERACAO_JUDICIAL without a JRC)
  const { data: availableCases } = trpc.rj.cases.availableCases.useQuery(undefined, {
    enabled: showVincular,
  })

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#C9A961]" />
        </div>
      </div>
    )
  }

  const rjCases = cases ?? []
  const totalCredores = rjCases.reduce((s, c) => s + c.total_credores, 0)
  const totalCredito = rjCases.reduce((s, c) => s + Number(c.total_credito), 0)

  const handleVincular = () => {
    if (!selectedCaseId) return
    createJrc.mutate({
      case_id: selectedCaseId,
      status_rj: statusRj,
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Recuperação Judicial</h1>
            <p className="text-[#666666]">
              Gestão de processos de recuperação judicial, credores e negociações.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href="/importar">
                <Upload className="size-3.5 mr-1.5" />
                Importar Credores
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
              asChild
            >
              <Link href="/processos?tipo=RECUPERACAO_JUDICIAL">
                <Plus className="size-3.5 mr-1.5" />
                Novo Processo de RJ
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Processos de RJ</CardDescription>
              <CardTitle className="text-2xl">{rjCases.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">
                {rjCases.length === 0 ? "Nenhum processo cadastrado" : `${rjCases.length} caso${rjCases.length > 1 ? "s" : ""} ativo${rjCases.length > 1 ? "s" : ""}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total de Credores</CardDescription>
              <CardTitle className="text-2xl">{totalCredores}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">
                {totalCredores === 0 ? "Nenhum credor cadastrado" : `Em ${rjCases.length} processo${rjCases.length > 1 ? "s" : ""}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Valor Total do Passivo</CardDescription>
              <CardTitle className="text-xl">{formatCurrency(totalCredito)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Soma de todos os créditos habilitados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Planos Aprovados</CardDescription>
              <CardTitle className="text-2xl">
                {rjCases.filter(c => c.plano_aprovado).length} / {rjCases.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">
                {rjCases.filter(c => c.plano_aprovado).length === 0
                  ? "Nenhum plano aprovado ainda"
                  : "Planos de recuperação aprovados"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RJ Cases Cards */}
        {rjCases.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShieldAlert className="size-12 text-[#666666]/30" />
              <h3 className="mt-4 font-semibold">Nenhum caso de Recuperação Judicial</h3>
              <p className="mt-2 text-sm text-[#666666] text-center max-w-md">
                Processos do tipo &quot;Recuperação Judicial&quot; aparecem automaticamente aqui.
                Crie um novo processo ou importe credores para começar.
              </p>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/processos">
                    <Scale className="size-4 mr-2" />
                    Ir para Processos
                  </Link>
                </Button>
                <Button
                  className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
                  asChild
                >
                  <Link href="/importar">
                    <Upload className="size-4 mr-2" />
                    Importar Credores
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Casos de Recuperação Judicial</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {rjCases.map((jrc) => (
                <Card key={jrc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {jrc.case_?.cliente?.nome || "Cliente"}
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {jrc.case_?.numero_processo || "Sem número"}
                        </CardDescription>
                      </div>
                      <Badge className={JR_STATUS_COLORS[jrc.status_rj] || "bg-gray-100"}>
                        {JR_STATUS_LABELS[jrc.status_rj] || jrc.status_rj}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-[#666666]">Vara/Comarca:</span>
                        <p className="font-medium">
                          {[jrc.case_?.vara, jrc.case_?.comarca, jrc.case_?.uf].filter(Boolean).join(" / ") || "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#666666]">Administrador Judicial:</span>
                        <p className="font-medium">{jrc.administrador_judicial?.nome || "—"}</p>
                      </div>
                      <div>
                        <span className="text-[#666666]">Deferimento:</span>
                        <p className="font-medium">{formatDate(jrc.data_deferimento)}</p>
                      </div>
                      <div>
                        <span className="text-[#666666]">AGC:</span>
                        <p className="font-medium">{formatDate(jrc.data_agc)}</p>
                      </div>
                    </div>

                    {/* Creditor summary */}
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Credores: {jrc.total_credores}</span>
                        <span className="text-sm font-medium">Passivo: {formatCurrency(jrc.total_credito)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-xs">
                        <div className="text-center">
                          <div className="font-medium text-[#DC3545]">Classe I</div>
                          <div>{formatCurrency(jrc.total_classe_i)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-[#C9A961]">Classe II</div>
                          <div>{formatCurrency(jrc.total_classe_ii)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-[#17A2B8]">Classe III</div>
                          <div>{formatCurrency(jrc.total_classe_iii)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-[#28A745]">Classe IV</div>
                          <div>{formatCurrency(jrc.total_classe_iv)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href="/recuperacao-judicial/quadro-credores">
                          <Users className="size-3.5 mr-1.5" />
                          Credores
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href="/recuperacao-judicial/aprovacao-prj">
                          <BarChart3 className="size-3.5 mr-1.5" />
                          Votação PRJ
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href="/recuperacao-judicial/negociacoes">
                          <Handshake className="size-3.5 mr-1.5" />
                          Negociações
                        </Link>
                      </Button>
                      {jrc.case_?.id && (
                        <Button variant="ghost" size="sm" asChild className="shrink-0">
                          <Link href={`/processos/${jrc.case_.id}`}>
                            <Scale className="size-3.5 mr-1.5" />
                            Processo
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/recuperacao-judicial/quadro-credores">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="size-10 rounded-lg bg-[#17A2B8]/10 flex items-center justify-center shrink-0">
                  <Users className="size-5 text-[#17A2B8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">Quadro de Credores</h3>
                  <p className="text-xs text-[#666666] truncate">Gerenciar credores e classes</p>
                </div>
                <ArrowRight className="size-4 text-[#666666] group-hover:text-[#C9A961] transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/recuperacao-judicial/aprovacao-prj">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="size-10 rounded-lg bg-[#28A745]/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="size-5 text-[#28A745]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">Aprovação do PRJ</h3>
                  <p className="text-xs text-[#666666] truncate">Simulador de votação arts. 45, 56, 58</p>
                </div>
                <ArrowRight className="size-4 text-[#666666] group-hover:text-[#C9A961] transition-colors" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/recuperacao-judicial/negociacoes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="size-10 rounded-lg bg-[#C9A961]/10 flex items-center justify-center shrink-0">
                  <Handshake className="size-5 text-[#C9A961]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">Negociações</h3>
                  <p className="text-xs text-[#666666] truncate">Propostas e contrapropostas com credores</p>
                </div>
                <ArrowRight className="size-4 text-[#666666] group-hover:text-[#C9A961] transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Vincular Processo Dialog */}
      <Dialog open={showVincular} onOpenChange={setShowVincular}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Processo de RJ</DialogTitle>
            <DialogDescription>
              Selecione um processo existente do tipo &quot;Recuperação Judicial&quot; para vincular ao módulo de RJ.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Processo *</Label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  {availableCases?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero_processo || "Sem número"} — {c.cliente?.nome || ""}
                    </SelectItem>
                  ))}
                  {availableCases?.length === 0 && (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Todos os processos de RJ já estão vinculados.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fase da RJ</Label>
              <Select value={statusRj} onValueChange={setStatusRj}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(JR_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVincular(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#C9A961] text-[#2A2A2A] hover:bg-[#B8984F]"
              onClick={handleVincular}
              disabled={!selectedCaseId || createJrc.isPending}
            >
              {createJrc.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
