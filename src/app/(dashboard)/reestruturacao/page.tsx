"use client"

import { ArrowRightLeft, Plus, ShieldAlert, Handshake, TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ReestruturacaoPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Reestruturação</h1>
            <p className="text-[#666666]">
              Reestruturação extrajudicial de passivos e negociações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
              <ShieldAlert className="size-4 mr-2" />
              Converter para RJ
            </Button>
            <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
              <Plus className="size-4 mr-2" />
              Nova Reestruturação
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Reestruturações Ativas</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Nenhuma reestruturação em andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Credores Envolvidos</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Total de credores em negociação</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Valor Total de Passivo</CardDescription>
              <CardTitle className="text-2xl">R$ 0,00</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Passivo sob reestruturação</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Acordos Celebrados</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Acordos formalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[#C9A961]/10 flex items-center justify-center">
                  <Handshake className="size-5 text-[#C9A961]" />
                </div>
                <div>
                  <CardTitle className="text-base">Negociações Extrajudiciais</CardTitle>
                  <CardDescription className="text-xs">Gestão de acordos fora do processo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#666666]">
                Negocie diretamente com credores, registre propostas, contrapropostas e formalize acordos extrajudiciais.
              </p>
              <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => alert("Em desenvolvimento")}>
                <Plus className="size-3 mr-1" />
                Nova Negociação
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[#17A2B8]/10 flex items-center justify-center">
                  <BarChart3 className="size-5 text-[#17A2B8]" />
                </div>
                <div>
                  <CardTitle className="text-base">Análise de Viabilidade</CardTitle>
                  <CardDescription className="text-xs">Simulações e projeções financeiras</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#666666]">
                Simule cenários de pagamento, compare propostas e avalie a viabilidade da reestruturação.
              </p>
              <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => alert("Em desenvolvimento")}>
                <TrendingUp className="size-3 mr-1" />
                Simulador
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Empty state for the list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reestruturações</CardTitle>
            <CardDescription>Lista de processos de reestruturação extrajudicial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
              <ArrowRightLeft className="size-12 text-[#666666]/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma reestruturação cadastrada</h3>
              <p className="mt-2 text-sm text-[#666666] text-center">
                Inicie um processo de reestruturação extrajudicial para seus clientes.
              </p>
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
                  <Plus className="size-4 mr-2" />
                  Nova Reestruturação
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info card about converting to RJ */}
        <Card className="border-[#FFC107]/50 bg-[#FFC107]/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="size-4 text-[#FFC107]" />
              Conversão para Recuperação Judicial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#666666]">
              Caso a reestruturação extrajudicial não seja viável, é possível converter o caso em um processo de recuperação judicial.
              Todos os dados de credores e negociações serão migrados automaticamente.
            </p>
            <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => alert("Em desenvolvimento")}>
              <ShieldAlert className="size-3 mr-1" />
              Converter para RJ
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
