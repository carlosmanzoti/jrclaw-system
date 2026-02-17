"use client"

import Link from "next/link"
import { Handshake, Plus, FileText, Mail, MessageSquare, Sparkles, ArrowLeft, Phone, Send, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NegociacoesPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/recuperacao">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight font-heading">Negociações</h1>
              <p className="text-[#666666]">
                Gestão de negociações com credores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
              <FileText className="size-4 mr-2" />
              Gerar Relatório
            </Button>
            <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
              <Plus className="size-4 mr-2" />
              Nova Proposta
            </Button>
          </div>
        </div>

        {/* Action Buttons Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações Rápidas</CardTitle>
            <CardDescription>Ferramentas para gestão de negociações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
                <Plus className="size-4 mr-2" />
                Nova Proposta
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
                <Send className="size-4 mr-2" />
                Registrar Contraproposta
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
                <Phone className="size-4 mr-2" />
                Registrar Contato
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
                <Mail className="size-4 mr-2" />
                Enviar por E-mail
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("Em desenvolvimento")}>
                <MessageSquare className="size-4 mr-2" />
                Enviar por WhatsApp
              </Button>
              <Link href="/confeccao">
                <Button variant="outline" size="sm">
                  <Sparkles className="size-4 mr-2 text-[#17A2B8]" />
                  Sugerir Estratégia Harvey Specter
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Negociações Ativas</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Propostas Enviadas</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Acordos Fechados</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Em Impasse</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Negotiations List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Negociações</CardTitle>
            <CardDescription>Acompanhamento de todas as negociações com credores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
              <Handshake className="size-12 text-[#666666]/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma negociação registrada</h3>
              <p className="mt-2 text-sm text-[#666666] text-center">
                Inicie uma negociação a partir do quadro de credores ou crie uma nova proposta.
              </p>
              <div className="flex gap-2 mt-4">
                <Link href="/recuperacao/credores">
                  <Button variant="outline" size="sm">
                    Ver Credores
                  </Button>
                </Link>
                <Button size="sm" onClick={() => alert("Em desenvolvimento")}>
                  <Plus className="size-4 mr-2" />
                  Nova Proposta
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4 text-[#666666]" />
              Histórico de Negociações
            </CardTitle>
            <CardDescription>Timeline de propostas, contrapropostas e contatos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
              <p className="text-sm text-[#666666]">Nenhuma atividade de negociação registrada.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
