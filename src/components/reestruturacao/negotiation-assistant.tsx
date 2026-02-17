"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  RefreshCw,
  MessageCircle,
  BookOpen,
  Bot,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Insight {
  id: string;
  tipo: "OPORTUNIDADE" | "RISCO" | "SUGESTAO" | "ANALISE";
  titulo: string;
  descricao: string;
  acao_sugerida?: string;
  framework?: string;
  prioridade?: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
}

interface PlaybookSection {
  titulo: string;
  conteudo: string;
  subsections?: { titulo: string; conteudo: string }[];
}

interface Playbook {
  sections: PlaybookSection[];
  generated_at?: string;
  model?: string;
}

export interface NegotiationAssistantProps {
  negotiationId?: string;
  negotiation?: any;
  fase?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the combined text content from a UIMessage's parts array.
 */
function getMessageText(msg: { parts?: Array<{ type: string; text?: string }> }): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return "";
  return msg.parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  PREPARACAO: [
    "Qual estrategia usar?",
    "Qual deve ser nossa primeira oferta?",
    "Quais Black Swans investigar?",
  ],
  ENGAJAMENTO: [
    "Como abrir a proxima reuniao?",
    "Quais labels usar?",
    "Script para criar rapport",
  ],
  BARGANHA: [
    "Como responder a esta contraproposta?",
    "Devemos conceder isso?",
    "O credor esta blefando?",
  ],
  COMPROMISSO: [
    "Quais termos incluir no acordo?",
    "Pontos de atencao na minuta?",
  ],
  ENCERRADA: [
    "Gerar relatorio de licoes aprendidas",
    "Salvar como precedente",
  ],
};

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  OPORTUNIDADE: Zap,
  RISCO: AlertTriangle,
  SUGESTAO: Lightbulb,
  ANALISE: BarChart3,
};

const INSIGHT_COLORS: Record<string, string> = {
  OPORTUNIDADE: "text-amber-600",
  RISCO: "text-red-500",
  SUGESTAO: "text-blue-500",
  ANALISE: "text-emerald-600",
};

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  CRITICA: "bg-red-100 text-red-700 border-red-200",
  ALTA: "bg-orange-100 text-orange-700 border-orange-200",
  MEDIA: "bg-yellow-100 text-yellow-700 border-yellow-200",
  BAIXA: "bg-gray-100 text-gray-600 border-gray-200",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = INSIGHT_ICONS[insight.tipo] ?? Lightbulb;
  const iconColor = INSIGHT_COLORS[insight.tipo] ?? "text-gray-500";
  const priorityColor =
    PRIORITY_BADGE_COLORS[insight.prioridade ?? "MEDIA"] ??
    PRIORITY_BADGE_COLORS.MEDIA;

  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 shrink-0 ${iconColor}`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[#2A2A2A] truncate">
                {insight.titulo}
              </span>
              {insight.framework && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-[#C9A961] text-[#C9A961]"
                >
                  {insight.framework}
                </Badge>
              )}
              {insight.prioridade && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 h-4 ${priorityColor}`}
                >
                  {insight.prioridade}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {insight.descricao}
            </p>
            {insight.acao_sugerida && (
              <>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 mt-1.5 text-xs font-medium text-[#C9A961] hover:text-[#b8953a] transition-colors"
                >
                  Acao sugerida
                  {expanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
                <div
                  className="overflow-hidden transition-all duration-200"
                  style={{
                    maxHeight: expanded ? "200px" : "0px",
                    opacity: expanded ? 1 : 0,
                  }}
                >
                  <p className="text-xs text-muted-foreground mt-1 bg-[#FAFAFA] rounded p-2">
                    {insight.acao_sugerida}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-3">
          <div className="flex items-start gap-2">
            <Skeleton className="size-4 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlaybookSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border p-3 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function PlaybookSectionCard({ section }: { section: PlaybookSection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{section.titulo}</CardTitle>
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            )}
          </div>
        </CardHeader>
      </button>
      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: expanded ? "1000px" : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <CardContent className="p-3 pt-2">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {section.conteudo}
          </p>
          {section.subsections && section.subsections.length > 0 && (
            <div className="mt-2 space-y-2">
              {section.subsections.map((sub, idx) => (
                <div
                  key={idx}
                  className="bg-[#FAFAFA] rounded p-2 border border-gray-100"
                >
                  <p className="text-xs font-medium text-[#2A2A2A]">
                    {sub.titulo}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                    {sub.conteudo}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NegotiationAssistant({
  negotiationId,
  negotiation,
  fase,
}: NegotiationAssistantProps) {
  // -- Panel state --
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const [useOpus, setUseOpus] = useState(false);

  // -- Insights state --
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [hasUnreadInsights, setHasUnreadInsights] = useState(false);

  // -- Playbook state --
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [playbookLoading, setPlaybookLoading] = useState(false);
  const [playbookError, setPlaybookError] = useState<string | null>(null);

  // -- Chat input state (managed manually for AI SDK v6) --
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Build transport with memoized body that includes negotiationId and model choice
  const chatTransport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/ai/neg/chat",
        body: { negotiationId, useOpus },
      }),
    [negotiationId, useOpus]
  );

  const { messages, sendMessage, status } = useChat({
    transport: chatTransport,
  });

  const chatBusy = status === "submitted" || status === "streaming";

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Clear unread badge when opening insights tab
  useEffect(() => {
    if (isOpen && activeTab === "insights") {
      setHasUnreadInsights(false);
    }
  }, [isOpen, activeTab]);

  // -- Fetch insights --
  const fetchInsights = useCallback(async () => {
    if (!negotiationId) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res = await fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negotiationId,
          type: "health_score",
          useOpus,
        }),
      });
      if (!res.ok) {
        throw new Error(`Erro ao buscar insights (${res.status})`);
      }
      const data = await res.json();
      const parsed: Insight[] = Array.isArray(data?.insights)
        ? data.insights
        : Array.isArray(data)
          ? data
          : [];
      setInsights(parsed);
      if (parsed.length > 0 && !isOpen) {
        setHasUnreadInsights(true);
      }
    } catch (err: any) {
      setInsightsError(
        err?.message ?? "Erro ao carregar insights. Tente novamente."
      );
    } finally {
      setInsightsLoading(false);
    }
  }, [negotiationId, useOpus, isOpen]);

  // -- Fetch playbook --
  const fetchPlaybook = useCallback(async () => {
    if (!negotiationId) return;
    setPlaybookLoading(true);
    setPlaybookError(null);
    try {
      // Try to use the negotiation object's ai_playbook first
      if (negotiation?.ai_playbook) {
        const pb =
          typeof negotiation.ai_playbook === "string"
            ? JSON.parse(negotiation.ai_playbook)
            : negotiation.ai_playbook;
        if (pb?.sections) {
          setPlaybook(pb);
          setPlaybookLoading(false);
          return;
        }
      }
      const res = await fetch("/api/ai/neg/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          negotiationId,
          type: "playbook",
          useOpus,
        }),
      });
      if (!res.ok) {
        throw new Error(`Erro ao gerar playbook (${res.status})`);
      }
      const data = await res.json();
      const pb: Playbook = data?.playbook ?? data ?? { sections: [] };
      setPlaybook(pb);
    } catch (err: any) {
      setPlaybookError(
        err?.message ?? "Erro ao carregar playbook. Tente novamente."
      );
    } finally {
      setPlaybookLoading(false);
    }
  }, [negotiationId, negotiation, useOpus]);

  // -- Suggested questions based on phase --
  const currentPhase = fase ?? negotiation?.fase ?? "PREPARACAO";
  const suggestedQuestions =
    SUGGESTED_QUESTIONS[currentPhase] ?? SUGGESTED_QUESTIONS.PREPARACAO;

  // -- Toggle panel --
  const togglePanel = useCallback(() => {
    setIsOpen((prev) => {
      const opening = !prev;
      if (opening && insights.length === 0 && !insightsLoading) {
        // Auto-fetch insights on first open
        fetchInsights();
      }
      return opening;
    });
  }, [insights.length, insightsLoading, fetchInsights]);

  // -- Handle suggested question click --
  const handleSuggestionClick = useCallback((question: string) => {
    setChatInput(question);
  }, []);

  // -- Handle chat submit --
  const handleChatSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const text = chatInput.trim();
      if (!text || chatBusy) return;
      sendMessage({ text });
      setChatInput("");
    },
    [chatInput, chatBusy, sendMessage]
  );

  // -- Determine context label --
  const contextLabel = negotiation?.titulo
    ? `Analisando: ${negotiation.titulo}`
    : negotiationId
      ? `Negociacao #${negotiationId.slice(0, 8)}`
      : "Visao Global";

  return (
    <>
      {/* ================================================================= */}
      {/* FLOATING BUTTON                                                    */}
      {/* ================================================================= */}
      <button
        onClick={togglePanel}
        aria-label={
          isOpen ? "Fechar assistente" : "Abrir assistente de negociacao"
        }
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2"
        style={{
          width: 56,
          height: 56,
          backgroundColor: "#C9A961",
        }}
      >
        <Sparkles className="size-6 text-white" />
        {/* Pulse ring for unread insights */}
        {hasUnreadInsights && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[#C9A961] opacity-30" />
        )}
      </button>

      {/* ================================================================= */}
      {/* BACKDROP (click to close on mobile)                                */}
      {/* ================================================================= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 transition-opacity duration-200 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* ================================================================= */}
      {/* SLIDE-OUT PANEL                                                    */}
      {/* ================================================================= */}
      <aside
        className="fixed top-0 right-0 z-40 h-screen w-[400px] max-w-[100vw] bg-white border-l border-gray-200 shadow-xl flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
        role="dialog"
        aria-label="Assistente de negociacao"
        aria-hidden={!isOpen}
      >
        {/* --------------------------------------------------------------- */}
        {/* HEADER                                                           */}
        {/* --------------------------------------------------------------- */}
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: "#C9A961",
                }}
              >
                <Bot className="size-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[#2A2A2A] truncate">
                  Harvey Specter — Estrategista
                </h2>
                <Badge
                  variant="outline"
                  className="mt-0.5 text-[10px] px-1.5 py-0 h-4 max-w-[220px] truncate border-gray-300 text-muted-foreground"
                >
                  {contextLabel}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-[#2A2A2A] hover:bg-gray-100 transition-colors"
              aria-label="Fechar painel"
            >
              <X className="size-5" />
            </button>
          </div>
          {/* Model toggle */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-muted-foreground">Modelo:</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${!useOpus ? "text-[#C9A961]" : "text-muted-foreground"}`}
              >
                Sonnet 4.5
              </span>
              <Switch
                checked={useOpus}
                onCheckedChange={setUseOpus}
                size="sm"
                aria-label="Alternar modelo de IA"
              />
              <span
                className={`text-xs font-medium ${useOpus ? "text-[#C9A961]" : "text-muted-foreground"}`}
              >
                Opus 4.6
              </span>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* TABS                                                             */}
        {/* --------------------------------------------------------------- */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="shrink-0 px-4 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="insights" className="flex-1 gap-1 text-xs">
                <Zap className="size-3" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-1 text-xs">
                <MessageCircle className="size-3" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="playbook" className="flex-1 gap-1 text-xs">
                <BookOpen className="size-3" />
                Playbook
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============================================================= */}
          {/* TAB: INSIGHTS                                                  */}
          {/* ============================================================= */}
          <TabsContent
            value="insights"
            className="flex-1 min-h-0 flex flex-col"
          >
            <ScrollArea className="flex-1">
              {insightsLoading ? (
                <InsightsSkeleton />
              ) : insightsError ? (
                <div className="p-4">
                  <Card className="gap-0 py-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="size-4 shrink-0" />
                        <p className="text-sm">{insightsError}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={fetchInsights}
                      >
                        <RefreshCw className="size-3" />
                        Tentar novamente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : insights.length === 0 ? (
                <div className="p-4">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div
                      className="flex items-center justify-center rounded-full mb-3"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: "#C9A96120",
                      }}
                    >
                      <Lightbulb className="size-5 text-[#C9A961]" />
                    </div>
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      Nenhum insight disponivel
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clique abaixo para analisar a negociacao
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={fetchInsights}
                      disabled={!negotiationId}
                    >
                      <Sparkles className="size-3" />
                      Gerar Insights com IA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 p-4">
                  {insights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              )}
            </ScrollArea>
            {/* Refresh button at bottom */}
            {insights.length > 0 && (
              <div className="shrink-0 border-t border-gray-200 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={fetchInsights}
                  disabled={insightsLoading || !negotiationId}
                >
                  <RefreshCw
                    className={`size-3 ${insightsLoading ? "animate-spin" : ""}`}
                  />
                  Atualizar Insights
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB: CHAT                                                      */}
          {/* ============================================================= */}
          <TabsContent value="chat" className="flex-1 min-h-0 flex flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-3 p-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div
                      className="flex items-center justify-center rounded-full mb-3"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: "#C9A96120",
                      }}
                    >
                      <MessageCircle className="size-5 text-[#C9A961]" />
                    </div>
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      Converse com Harvey Specter
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                      Pergunte sobre estrategia, taticas de negociacao, analise
                      de contraproposta e muito mais.
                    </p>
                  </div>
                )}

                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  const text = getMessageText(msg as any);
                  if (!text) return null;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-2 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* Avatar */}
                        {!isUser && (
                          <div
                            className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                            style={{
                              width: 28,
                              height: 28,
                              backgroundColor: "#C9A961",
                            }}
                          >
                            <Bot className="size-3.5 text-white" />
                          </div>
                        )}
                        {/* Bubble */}
                        <div
                          className={`rounded-xl px-3 py-2 text-sm ${
                            isUser
                              ? "bg-[#C9A961] text-white"
                              : "bg-[#F5F5F5] text-[#2A2A2A]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {text}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="flex gap-2 max-w-[85%]">
                      <div
                        className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                        style={{
                          width: 28,
                          height: 28,
                          backgroundColor: "#C9A961",
                        }}
                      >
                        <Bot className="size-3.5 text-white" />
                      </div>
                      <div className="rounded-xl bg-[#F5F5F5] px-3 py-2">
                        <div className="flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A961] animate-bounce" />
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A961] animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full bg-[#C9A961] animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Suggested questions */}
            <div className="shrink-0 border-t border-gray-200 bg-white">
              {messages.length < 3 && (
                <div className="flex flex-wrap gap-1.5 px-3 pt-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestionClick(q)}
                      className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-muted-foreground hover:text-[#2A2A2A] hover:border-[#C9A961] hover:bg-[#C9A96110] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat input */}
              <form
                onSubmit={handleChatSubmit}
                className="flex items-center gap-2 p-3"
              >
                <div className="relative flex-1">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pergunte ao Harvey..."
                    className="pr-10 text-sm h-9 bg-[#FAFAFA]"
                    disabled={chatBusy}
                  />
                  <Badge
                    variant="outline"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] px-1 py-0 h-3.5 border-gray-300 text-muted-foreground pointer-events-none"
                  >
                    {useOpus ? "Opus" : "Sonnet"}
                  </Badge>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={chatBusy || !chatInput.trim()}
                  className="shrink-0"
                  style={{ backgroundColor: "#C9A961" }}
                >
                  <Send className="size-4 text-white" />
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB: PLAYBOOK                                                  */}
          {/* ============================================================= */}
          <TabsContent
            value="playbook"
            className="flex-1 min-h-0 flex flex-col"
          >
            <ScrollArea className="flex-1">
              {playbookLoading ? (
                <PlaybookSkeleton />
              ) : playbookError ? (
                <div className="p-4">
                  <Card className="gap-0 py-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="size-4 shrink-0" />
                        <p className="text-sm">{playbookError}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={fetchPlaybook}
                      >
                        <RefreshCw className="size-3" />
                        Tentar novamente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : !playbook || playbook.sections.length === 0 ? (
                <div className="p-4">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div
                      className="flex items-center justify-center rounded-full mb-3"
                      style={{
                        width: 48,
                        height: 48,
                        backgroundColor: "#C9A96120",
                      }}
                    >
                      <BookOpen className="size-5 text-[#C9A961]" />
                    </div>
                    <p className="text-sm font-medium text-[#2A2A2A]">
                      Nenhum playbook gerado
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                      Gere um playbook estrategico personalizado com base na
                      analise completa desta negociacao.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={fetchPlaybook}
                      disabled={!negotiationId || playbookLoading}
                    >
                      <Sparkles className="size-3" />
                      Gerar Playbook com IA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 p-4">
                  {playbook.generated_at && (
                    <p className="text-[10px] text-muted-foreground text-right">
                      Gerado em:{" "}
                      {new Date(playbook.generated_at).toLocaleString("pt-BR")}
                      {playbook.model && ` | ${playbook.model}`}
                    </p>
                  )}
                  {playbook.sections.map((section, idx) => (
                    <PlaybookSectionCard key={idx} section={section} />
                  ))}
                </div>
              )}
            </ScrollArea>
            {/* Refresh button at bottom */}
            {playbook && playbook.sections.length > 0 && (
              <div className="shrink-0 border-t border-gray-200 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={fetchPlaybook}
                  disabled={playbookLoading || !negotiationId}
                >
                  <RefreshCw
                    className={`size-3 ${playbookLoading ? "animate-spin" : ""}`}
                  />
                  Atualizar Playbook
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </aside>
    </>
  );
}
