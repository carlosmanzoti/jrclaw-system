"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  FormEvent,
} from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { getSuggestedQuestions } from "@/lib/ai/crj-harvey-prompts";
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
  Bot,
  FileText,
  Mail,
  ArrowRight,
  Eye,
  Link2,
  Clock,
  CheckCircle,
  XCircle,
  Target,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CRJAIAssistantProps {
  negotiationId?: string | null;
  jrcId?: string | null;
  negotiationStatus?: string | null;
  negotiationTitle?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INSIGHT_TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  OPORTUNIDADE: { icon: Zap, color: "text-amber-600", label: "Oportunidade" },
  RISCO: { icon: AlertTriangle, color: "text-red-500", label: "Risco" },
  SUGESTAO: { icon: Lightbulb, color: "text-blue-500", label: "Sugestao" },
  ANALISE: { icon: BarChart3, color: "text-emerald-600", label: "Analise" },
  CONEXAO: { icon: Link2, color: "text-purple-500", label: "Conexao" },
  URGENCIA: { icon: Clock, color: "text-red-600", label: "Urgencia" },
  CHECKLIST: { icon: CheckCircle, color: "text-teal-500", label: "Checklist" },
};

const ACTION_TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string }
> = {
  GERAR_PROPOSTA: { icon: FileText, label: "Gerar Proposta" },
  ENVIAR_EMAIL: { icon: Mail, label: "Enviar E-mail" },
  NOVA_RODADA: { icon: ArrowRight, label: "Nova Rodada" },
  MUDAR_STATUS: { icon: Target, label: "Mudar Status" },
  FOLLOW_UP: { icon: RefreshCw, label: "Follow-up" },
  VER_NEGOCIACAO: { icon: Eye, label: "Ver Negociacao" },
  GERAR_CHECKLIST: { icon: CheckCircle, label: "Gerar Checklist" },
};

const QUICK_ACTIONS = [
  {
    id: "analyze",
    icon: BarChart3,
    label: "Analisar Negociacao",
    description: "Analise estrategica completa com recomendacoes",
  },
  {
    id: "proposal",
    icon: FileText,
    label: "Sugerir Proposta",
    description: "IA sugere valores e termos para proposta",
  },
  {
    id: "email",
    icon: Mail,
    label: "Rascunhar E-mail",
    description: "Gerar e-mail profissional ao credor",
  },
  {
    id: "risk",
    icon: AlertTriangle,
    label: "Mapa de Riscos",
    description: "Identificar riscos e contingencias",
  },
  {
    id: "compare",
    icon: Target,
    label: "Benchmark Desagio",
    description: "Comparar com mercado e portfolio",
  },
  {
    id: "timeline",
    icon: Clock,
    label: "Projecao Timeline",
    description: "Prever proximas etapas e prazos",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMessageText(msg: {
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return "";
  return msg.parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InsightCard({
  insight,
  onDismiss,
  onAction,
}: {
  insight: {
    id: string;
    type: string;
    title: string;
    description: string;
    suggested_action: string | null;
    action_type: string | null;
    confidence: number;
    is_read: boolean;
  };
  onDismiss: (id: string) => void;
  onAction?: (actionType: string, insightId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = INSIGHT_TYPE_CONFIG[insight.type] ?? INSIGHT_TYPE_CONFIG.SUGESTAO;
  const Icon = cfg.icon;
  const actionCfg = insight.action_type
    ? ACTION_TYPE_CONFIG[insight.action_type]
    : null;

  return (
    <Card
      className={`gap-0 py-0 overflow-hidden transition-all ${!insight.is_read ? "border-l-2 border-l-[#C9A961]" : ""}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
            <Icon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-[#2A2A2A] truncate">
                {insight.title}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-gray-300 text-muted-foreground"
              >
                {Math.round(insight.confidence * 100)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {insight.description}
            </p>

            {/* Expand / Actions */}
            <div className="flex items-center gap-2 mt-2">
              {insight.suggested_action && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-[#C9A961] hover:text-[#b8953a] transition-colors"
                >
                  Detalhes
                  {expanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
              )}
              {actionCfg && onAction && (
                <button
                  onClick={() =>
                    onAction(insight.action_type!, insight.id)
                  }
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <actionCfg.icon className="size-3" />
                  {actionCfg.label}
                </button>
              )}
              <button
                onClick={() => onDismiss(insight.id)}
                className="ml-auto text-xs text-muted-foreground hover:text-red-500 transition-colors"
                title="Dispensar"
              >
                <XCircle className="size-3.5" />
              </button>
            </div>

            {/* Expanded details */}
            {insight.suggested_action && (
              <div
                className="overflow-hidden transition-all duration-200"
                style={{
                  maxHeight: expanded ? "200px" : "0px",
                  opacity: expanded ? 1 : 0,
                }}
              >
                <p className="text-xs text-muted-foreground mt-2 bg-[#FAFAFA] rounded p-2">
                  {insight.suggested_action}
                </p>
              </div>
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

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CRJAIAssistant({
  negotiationId,
  jrcId,
  negotiationStatus,
  negotiationTitle,
}: CRJAIAssistantProps) {
  // -- Panel state --
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const [useOpus, setUseOpus] = useState(false);

  // -- Chat input state --
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // -- Model tier --
  const modelTier = useOpus ? "premium" : "standard";

  // -- Chat transport --
  const chatTransport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/ai/crj/chat",
        body: {
          negotiationId: negotiationId || undefined,
          jrcId: jrcId || undefined,
          modelTier,
        },
      }),
    [negotiationId, jrcId, modelTier]
  );

  const { messages, sendMessage, status } = useChat({
    transport: chatTransport,
  });

  const chatBusy = status === "submitted" || status === "streaming";

  // -- Insights queries --
  const insightsQuery = trpc.crjNeg.insights.list.useQuery(
    {
      negotiation_id: negotiationId || undefined,
      jrc_id: !negotiationId ? (jrcId || undefined) : undefined,
    },
    { enabled: isOpen && activeTab === "insights" }
  );

  const unreadCountQuery = trpc.crjNeg.insights.unreadCount.useQuery(
    {
      negotiation_id: negotiationId || undefined,
      jrc_id: !negotiationId ? (jrcId || undefined) : undefined,
    },
    { refetchInterval: 60000 }
  );

  const unreadCount = unreadCountQuery.data || 0;

  // -- Mutations --
  const dismissMutation = trpc.crjNeg.insights.dismiss.useMutation({
    onSuccess: () => {
      utils.crjNeg.insights.list.invalidate();
      utils.crjNeg.insights.unreadCount.invalidate();
    },
  });

  const markReadMutation = trpc.crjNeg.insights.markRead.useMutation({
    onSuccess: () => {
      utils.crjNeg.insights.unreadCount.invalidate();
    },
  });

  const generateMutation = trpc.crjNeg.insights.generate.useMutation({
    onSuccess: () => {
      utils.crjNeg.insights.list.invalidate();
      utils.crjNeg.insights.unreadCount.invalidate();
    },
  });

  // -- Scroll chat to bottom --
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // -- Mark insights as read when viewing --
  useEffect(() => {
    if (isOpen && activeTab === "insights" && insightsQuery.data) {
      const unreadIds = insightsQuery.data
        .filter((i) => !i.is_read)
        .map((i) => i.id);
      if (unreadIds.length > 0) {
        markReadMutation.mutate({ ids: unreadIds });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab, insightsQuery.data]);

  // -- Suggested questions --
  const suggestedQuestions = getSuggestedQuestions(negotiationStatus || null);

  // -- Toggle panel --
  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // -- Handle quick action --
  const handleQuickAction = useCallback(
    (actionId: string) => {
      const prompts: Record<string, string> = {
        analyze:
          "Faca uma analise estrategica completa desta negociacao. Avalie pontos fortes, fracos, riscos e oportunidades. Sugira os proximos passos concretos.",
        proposal:
          "Com base nos dados desta negociacao, sugira os termos ideais para a proxima proposta: desagio, parcelas, carencia, correcao monetaria. Justifique cada parametro.",
        email:
          "Redija um e-mail profissional para o credor, considerando o estagio atual da negociacao. Use tom formal mas cordial.",
        risk: "Identifique e classifique todos os riscos desta negociacao. Para cada risco, indique probabilidade, impacto e acao de mitigacao.",
        compare:
          "Compare os termos desta negociacao com benchmarks de mercado e com as demais negociacoes do portfolio. O desagio esta dentro da faixa razoavel?",
        timeline:
          "Projete uma timeline realista para esta negociacao. Quais as proximas etapas, prazos estimados e marcos importantes?",
      };

      const prompt = prompts[actionId];
      if (prompt) {
        setActiveTab("chat");
        setChatInput(prompt);
      }
    },
    []
  );

  // -- Handle insight action --
  const handleInsightAction = useCallback(
    (actionType: string, _insightId: string) => {
      // Route action to the chat tab with a contextual prompt
      const actionPrompts: Record<string, string> = {
        GERAR_PROPOSTA:
          "Gere uma proposta detalhada com os termos recomendados para esta negociacao.",
        ENVIAR_EMAIL:
          "Redija um e-mail para o credor com base na situacao atual.",
        NOVA_RODADA:
          "Analise o cenario e sugira a estrategia para a proxima rodada de negociacao.",
        MUDAR_STATUS:
          "Avalie se o status da negociacao deve ser atualizado. Se sim, para qual e por que?",
        FOLLOW_UP:
          "Sugira o proximo follow-up: quando, como e com qual conteudo entrar em contato.",
        GERAR_CHECKLIST:
          "Gere um checklist completo de proximas acoes para esta negociacao.",
      };
      const prompt = actionPrompts[actionType];
      if (prompt) {
        setActiveTab("chat");
        setChatInput(prompt);
      }
    },
    []
  );

  // -- Handle suggestion click --
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

  // -- Context label --
  const contextLabel = negotiationTitle
    ? `Analisando: ${negotiationTitle}`
    : negotiationId
      ? `Negociacao #${negotiationId.slice(0, 8)}`
      : "Visao Global do Portfolio";

  return (
    <>
      {/* ================================================================= */}
      {/* FLOATING BUTTON                                                    */}
      {/* ================================================================= */}
      <button
        onClick={togglePanel}
        aria-label={
          isOpen
            ? "Fechar assistente Harvey"
            : "Abrir assistente Harvey Specter"
        }
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2"
        style={{
          width: 56,
          height: 56,
          backgroundColor: "#C9A961",
        }}
      >
        <Sparkles className="size-6 text-white" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <>
            <span className="absolute inset-0 rounded-full animate-ping bg-[#C9A961] opacity-30" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* ================================================================= */}
      {/* BACKDROP                                                           */}
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
        aria-label="Harvey Specter — Assistente de Negociacoes CRJ"
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
                  Harvey Specter — CRJ
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
                {unreadCount > 0 && (
                  <Badge className="ml-1 h-4 px-1 text-[9px] bg-red-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 gap-1 text-xs">
                <MessageCircle className="size-3" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 gap-1 text-xs">
                <Target className="size-3" />
                Acoes
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
              {insightsQuery.isLoading ? (
                <InsightsSkeleton />
              ) : insightsQuery.error ? (
                <div className="p-4">
                  <Card className="gap-0 py-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="size-4 shrink-0" />
                        <p className="text-sm">
                          Erro ao carregar insights. Tente novamente.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => insightsQuery.refetch()}
                      >
                        <RefreshCw className="size-3" />
                        Tentar novamente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : !insightsQuery.data || insightsQuery.data.length === 0 ? (
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
                      Gere insights com IA para esta negociacao
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() =>
                        generateMutation.mutate({
                          negotiation_id: negotiationId || undefined,
                          jrc_id: jrcId || undefined,
                          trigger_source: "MANUAL",
                        })
                      }
                      disabled={generateMutation.isPending}
                    >
                      <Sparkles className="size-3" />
                      {generateMutation.isPending
                        ? "Gerando..."
                        : "Gerar Insights com IA"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 p-4">
                  {insightsQuery.data.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onDismiss={(id) => dismissMutation.mutate({ id })}
                      onAction={handleInsightAction}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
            {/* Bottom actions */}
            <div className="shrink-0 border-t border-gray-200 p-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  generateMutation.mutate({
                    negotiation_id: negotiationId || undefined,
                    jrc_id: jrcId || undefined,
                    trigger_source: "MANUAL",
                  })
                }
                disabled={generateMutation.isPending}
              >
                <Sparkles
                  className={`size-3 ${generateMutation.isPending ? "animate-spin" : ""}`}
                />
                {generateMutation.isPending ? "Gerando..." : "Gerar Novos"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => insightsQuery.refetch()}
                disabled={insightsQuery.isRefetching}
              >
                <RefreshCw
                  className={`size-3 ${insightsQuery.isRefetching ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>
            </div>
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
                      Pergunte sobre estrategia, analise de credores, desagio, propostas e muito mais.
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
                  {suggestedQuestions.slice(0, 3).map((q) => (
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
          {/* TAB: QUICK ACTIONS                                             */}
          {/* ============================================================= */}
          <TabsContent
            value="actions"
            className="flex-1 min-h-0 flex flex-col"
          >
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Acoes rapidas com IA para a{" "}
                  {negotiationId
                    ? "negociacao selecionada"
                    : "visao global do portfolio"}
                  .
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        className="flex flex-col items-start gap-1.5 rounded-lg border border-gray-200 p-3 text-left hover:border-[#C9A961] hover:bg-[#C9A96108] transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="size-4 text-[#C9A961]" />
                          <span className="text-xs font-medium text-[#2A2A2A]">
                            {action.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {action.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Context info */}
                <div className="mt-4 rounded-lg bg-[#FAFAFA] border border-gray-100 p-3">
                  <p className="text-xs font-medium text-[#2A2A2A] mb-1">
                    Contexto atual
                  </p>
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    {negotiationTitle && (
                      <p>Negociacao: {negotiationTitle}</p>
                    )}
                    {negotiationStatus && (
                      <p>Status: {negotiationStatus}</p>
                    )}
                    {!negotiationId && jrcId && (
                      <p>Modo: Visao global do portfolio</p>
                    )}
                    <p>Modelo: {useOpus ? "Claude Opus 4.6" : "Claude Sonnet 4.5"}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </aside>
    </>
  );
}
