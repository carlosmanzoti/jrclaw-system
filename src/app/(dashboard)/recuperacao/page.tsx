"use client"

import Link from "next/link"
import { Users, Handshake, FileText, BarChart3, Scale, Plus, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RecuperacaoPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Recuperação Judicial</h1>
            <p className="text-[#666666]">
              Gestão de processos de recuperação judicial, credores e negociações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
              <FileText className="size-4 mr-2" />
              Gerar Relatório
            </Button>
            <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
              <Plus className="size-4 mr-2" />
              Nova RJ
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Processos de RJ Ativos</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Nenhum processo cadastrado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total de Credores</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Nenhum credor cadastrado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Negociações em Andamento</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Nenhuma negociação ativa</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Valor Total Sujeito ao Plano</CardDescription>
              <CardTitle className="text-2xl">R$ 0,00</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[#666666]">Nenhum valor cadastrado</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/recuperacao/credores">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-[#17A2B8]/10 flex items-center justify-center">
                    <Users className="size-5 text-[#17A2B8]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Quadro de Credores</CardTitle>
                    <CardDescription className="text-xs">Gerenciar credores e classes</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#666666]">
                  Cadastro, importação e classificação de credores por classe (trabalhista, garantia real, quirografário, ME/EPP).
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/recuperacao/negociacoes">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-[#C9A961]/10 flex items-center justify-center">
                    <Handshake className="size-5 text-[#C9A961]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Negociações</CardTitle>
                    <CardDescription className="text-xs">Propostas e contrapropostas</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#666666]">
                  Acompanhe negociações individuais e coletivas com credores, propostas e acordos.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-[#28A745]/10 flex items-center justify-center">
                  <BarChart3 className="size-5 text-[#28A745]" />
                </div>
                <div>
                  <CardTitle className="text-base">Votação do Plano</CardTitle>
                  <CardDescription className="text-xs">Simulador arts. 45, 56 e 58</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#666666]">
                Simulação de votação do plano de recuperação judicial com quórum por classe.
              </p>
              <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => alert("Em desenvolvimento")}>
                <Scale className="size-3 mr-1" />
                Abrir Simulador
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Alerts / Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#FFC107]" />
              Pendências e Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
              <Clock className="size-8 text-[#666666]/30" />
              <p className="mt-2 text-sm text-[#666666]">
                Nenhuma pendência no momento.
              </p>
              <p className="text-xs text-[#666666] mt-1">
                Alertas de prazos, habilitações e assembleias aparecerão aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
