"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, MessageSquare, FileText, CheckCircle, AlertTriangle, Crown } from "lucide-react"
import { ConfeccaoSidebar } from "./confeccao-sidebar"
import { ConfeccaoChat } from "./confeccao-chat"
import { ConfeccaoGenerate } from "./confeccao-generate"
import { ConfeccaoReview } from "./confeccao-review"
import { CHAT_ACTIONS } from "@/lib/ai-prompt-builder"
import { MODEL_DISPLAY } from "@/lib/ai-model-map"

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function ConfeccaoDashboard() {
  const [activeTab, setActiveTab] = useState("chat")
  const [sessionId] = useState(generateSessionId)

  // Context
  const [caseId, setCaseId] = useState("")
  const [projectId, setProjectId] = useState("")

  // Settings
  const [tom, setTom] = useState("tecnico")
  const [destinatario, setDestinatario] = useState("Juiz")
  const [incluirJurisprudencia, setIncluirJurisprudencia] = useState(true)
  const [incluirModelos, setIncluirModelos] = useState(true)
  const [modoDetalhado, setModoDetalhado] = useState(false)

  // Pre-selected type for generate mode
  const [preselectedType, setPreselectedType] = useState("")

  const handleDocAction = useCallback(
    (tipo: string, isAction?: boolean) => {
      if (isAction) {
        // Chat actions — switch to chat tab
        setActiveTab("chat")
      } else {
        // Document generation — switch to generate tab
        setPreselectedType(tipo)
        setActiveTab("gerar")
      }
    },
    []
  )

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Confecção IA</h1>
            <Badge variant="outline" className={`text-xs ${MODEL_DISPLAY.standard.badgeClass}`}>
              <Sparkles className="size-3 mr-1" />
              {MODEL_DISPLAY.standard.name}
            </Badge>
            <Badge variant="outline" className={`text-xs ${MODEL_DISPLAY.premium.badgeClass}`}>
              <Crown className="size-3 mr-1" />
              {MODEL_DISPLAY.premium.name}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Assistente jurídico com IA dual: Sonnet 4.5 para docs simples, Opus 4.6 com extended thinking para peças complexas.
          </p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3">
        <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">
          Toda produção de IA exige revisão humana antes de uso profissional.
        </p>
      </div>

      {/* Main content */}
      <div className="flex flex-1 border rounded-lg overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className="w-[280px] border-r bg-muted/20 shrink-0">
          <ConfeccaoSidebar
            caseId={caseId}
            projectId={projectId}
            onCaseChange={setCaseId}
            onProjectChange={setProjectId}
            onDocAction={handleDocAction}
            tom={tom}
            onTomChange={setTom}
            destinatario={destinatario}
            onDestinatarioChange={setDestinatario}
            incluirJurisprudencia={incluirJurisprudencia}
            onIncluirJurisprudenciaChange={setIncluirJurisprudencia}
            incluirModelos={incluirModelos}
            onIncluirModelosChange={setIncluirModelos}
            modoDetalhado={modoDetalhado}
            onModoDetalhadoChange={setModoDetalhado}
          />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
            <div className="border-b px-4">
              <TabsList className="h-10">
                <TabsTrigger value="chat" className="text-xs gap-1.5">
                  <MessageSquare className="size-3.5" />
                  Chat Jurídico
                </TabsTrigger>
                <TabsTrigger value="gerar" className="text-xs gap-1.5">
                  <FileText className="size-3.5" />
                  Gerar Documento
                </TabsTrigger>
                <TabsTrigger value="revisar" className="text-xs gap-1.5">
                  <CheckCircle className="size-3.5" />
                  Revisar Documento
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 mt-0 data-[state=inactive]:hidden">
              <ConfeccaoChat
                sessionId={sessionId}
                caseId={caseId}
                projectId={projectId}
              />
            </TabsContent>

            <TabsContent value="gerar" className="flex-1 mt-0 data-[state=inactive]:hidden">
              <ConfeccaoGenerate
                caseId={caseId}
                projectId={projectId}
                tom={tom}
                destinatario={destinatario}
                incluirJurisprudencia={incluirJurisprudencia}
                modoDetalhado={modoDetalhado}
                preselectedType={preselectedType}
              />
            </TabsContent>

            <TabsContent value="revisar" className="flex-1 mt-0 data-[state=inactive]:hidden">
              <ConfeccaoReview caseId={caseId} projectId={projectId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
