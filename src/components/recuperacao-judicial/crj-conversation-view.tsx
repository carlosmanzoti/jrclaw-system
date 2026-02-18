"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CRJ_EVENT_TYPE_LABELS,
  CRJ_STATUS_LABELS,
  CRJ_ROUND_TYPE_LABELS,
  CRJ_ROUND_OUTCOME_LABELS,
  formatBRL,
} from "@/lib/crj-constants";
import {
  Send,
  Mail,
  MailOpen,
  MessageSquare,
  Phone,
  Users,
  FileText,
  RefreshCw,
  CheckCircle,
  Bell,
  UserCheck,
  Plus,
  Inbox,
  Filter,
  ChevronDown,
} from "lucide-react";

interface Props {
  negotiationId: string;
}

// Icon map for event types
const TYPE_ICONS: Record<string, React.ReactNode> = {
  CRIACAO: <Plus className="h-3.5 w-3.5" />,
  MUDANCA_STATUS: <RefreshCw className="h-3.5 w-3.5" />,
  PROPOSTA_ENVIADA: <Send className="h-3.5 w-3.5" />,
  PROPOSTA_RECEBIDA: <Inbox className="h-3.5 w-3.5" />,
  REUNIAO: <Users className="h-3.5 w-3.5" />,
  LIGACAO: <Phone className="h-3.5 w-3.5" />,
  EMAIL_ENVIADO: <Mail className="h-3.5 w-3.5" />,
  EMAIL_RECEBIDO: <MailOpen className="h-3.5 w-3.5" />,
  DOCUMENTO_GERADO: <FileText className="h-3.5 w-3.5" />,
  ACORDO: <CheckCircle className="h-3.5 w-3.5" />,
  OBSERVACAO: <MessageSquare className="h-3.5 w-3.5" />,
  LEMBRETE: <Bell className="h-3.5 w-3.5" />,
  CONTATO_CREDOR: <UserCheck className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  CRIACAO: "bg-emerald-100 text-emerald-700",
  MUDANCA_STATUS: "bg-blue-100 text-blue-700",
  PROPOSTA_ENVIADA: "bg-violet-100 text-violet-700",
  PROPOSTA_RECEBIDA: "bg-amber-100 text-amber-700",
  REUNIAO: "bg-pink-100 text-pink-700",
  LIGACAO: "bg-cyan-100 text-cyan-700",
  EMAIL_ENVIADO: "bg-blue-100 text-blue-700",
  EMAIL_RECEBIDO: "bg-green-100 text-green-700",
  DOCUMENTO_GERADO: "bg-orange-100 text-orange-700",
  ACORDO: "bg-emerald-100 text-emerald-700",
  OBSERVACAO: "bg-gray-100 text-gray-700",
  LEMBRETE: "bg-yellow-100 text-yellow-700",
  CONTATO_CREDOR: "bg-indigo-100 text-indigo-700",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateGroup(date: string | Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function CRJConversationView({ negotiationId }: Props) {
  const [message, setMessage] = useState("");
  const [eventType, setEventType] = useState("OBSERVACAO");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: neg } = trpc.crjNeg.negotiations.getById.useQuery({
    id: negotiationId,
  });

  const utils = trpc.useUtils();
  const createEvent = trpc.crjNeg.events.create.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
      setMessage("");
    },
  });

  // Combine events, rounds, and emails into a unified timeline
  const timelineItems = (() => {
    if (!neg) return [];

    const items: {
      id: string;
      type: string;
      category: "event" | "round" | "email";
      date: Date;
      title: string;
      description: string;
      user?: string;
      isAutomatic?: boolean;
      metadata?: Record<string, unknown>;
    }[] = [];

    // Events
    for (const event of neg.events || []) {
      items.push({
        id: event.id,
        type: event.type,
        category: "event",
        date: new Date(event.created_at),
        title: CRJ_EVENT_TYPE_LABELS[event.type] || event.type,
        description: event.description,
        user: event.user?.name,
        isAutomatic: event.is_automatic,
      });
    }

    // Rounds
    for (const round of neg.rounds || []) {
      items.push({
        id: round.id,
        type: "RODADA",
        category: "round",
        date: new Date(round.date),
        title: `Rodada #${round.round_number} — ${CRJ_ROUND_TYPE_LABELS[round.type] || round.type}`,
        description: round.description,
        metadata: {
          outcome: round.outcome,
          value_proposed: round.value_proposed,
          creditor_response: round.creditor_response,
          next_steps: round.next_steps,
          proposed_by_us: round.proposed_by_us,
        },
      });
    }

    // Emails
    for (const email of neg.emails || []) {
      items.push({
        id: email.id,
        type: email.direction === "ENVIADO" ? "EMAIL_ENVIADO" : "EMAIL_RECEBIDO",
        category: "email",
        date: new Date(email.sent_at),
        title: email.subject,
        description: email.body_preview,
        metadata: {
          direction: email.direction,
          from: email.from_address,
          to: email.to_addresses,
          has_attachments: email.has_attachments,
        },
      });
    }

    // Sort by date (newest first for initial view, but we'll reverse for display)
    items.sort((a, b) => a.date.getTime() - b.date.getTime());

    return items;
  })();

  // Filter
  const filteredItems =
    typeFilter === "ALL"
      ? timelineItems
      : typeFilter === "MANUAL"
      ? timelineItems.filter((i) => !i.isAutomatic)
      : timelineItems.filter((i) => i.type === typeFilter);

  // Group by date
  const groupedItems: { date: string; items: typeof timelineItems }[] = [];
  let currentGroup = "";
  for (const item of filteredItems) {
    const group = formatDateGroup(item.date);
    if (group !== currentGroup) {
      groupedItems.push({ date: group, items: [] });
      currentGroup = group;
    }
    groupedItems[groupedItems.length - 1].items.push(item);
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredItems.length]);

  const handleSend = () => {
    if (!message.trim()) return;
    createEvent.mutate({
      negotiation_id: negotiationId,
      type: eventType,
      description: message,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with filter */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            Conversa ({filteredItems.length})
          </h3>
          {neg && (
            <Badge variant="outline" className="text-[10px]">
              {CRJ_STATUS_LABELS[neg.status] || neg.status}
            </Badge>
          )}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-7 w-[160px] text-xs">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="MANUAL">Apenas manuais</SelectItem>
            <Separator className="my-1" />
            <SelectItem value="OBSERVACAO">Observações</SelectItem>
            <SelectItem value="EMAIL_ENVIADO">E-mails enviados</SelectItem>
            <SelectItem value="EMAIL_RECEBIDO">E-mails recebidos</SelectItem>
            <SelectItem value="REUNIAO">Reuniões</SelectItem>
            <SelectItem value="LIGACAO">Ligações</SelectItem>
            <SelectItem value="MUDANCA_STATUS">Mudanças de status</SelectItem>
            <SelectItem value="PROPOSTA_ENVIADA">Propostas</SelectItem>
            <SelectItem value="RODADA">Rodadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Nenhuma atividade registrada
              </p>
              <p className="text-xs text-muted-foreground">
                Registre observações, reuniões e ligações abaixo.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedItems.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="relative mb-4 flex items-center justify-center">
                  <div className="absolute inset-x-0 top-1/2 border-t" />
                  <Badge
                    variant="outline"
                    className="relative z-10 bg-background text-[10px]"
                  >
                    {group.date}
                  </Badge>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex gap-3 ${
                        item.category === "email" &&
                        item.type === "EMAIL_ENVIADO"
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      {/* Avatar / Icon */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          TYPE_COLORS[item.type] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {TYPE_ICONS[item.type] || (
                          <MessageSquare className="h-3.5 w-3.5" />
                        )}
                      </div>

                      {/* Content bubble */}
                      <Card
                        className={`max-w-[75%] ${
                          item.category === "email" &&
                          item.type === "EMAIL_ENVIADO"
                            ? "bg-blue-50/50"
                            : item.category === "round"
                            ? "bg-violet-50/50"
                            : ""
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[9px]"
                            >
                              {item.title}
                            </Badge>
                            {item.isAutomatic && (
                              <span className="text-[9px] text-muted-foreground">
                                auto
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs">{item.description}</p>

                          {/* Round-specific info */}
                          {item.category === "round" && item.metadata && (
                            <div className="mt-2 space-y-1 border-t pt-2 text-[10px]">
                              {item.metadata.value_proposed != null && (
                                <p>
                                  <span className="text-muted-foreground">
                                    Valor:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {formatBRL(item.metadata.value_proposed as bigint)}
                                  </span>
                                </p>
                              )}
                              {item.metadata.outcome != null &&
                                String(item.metadata.outcome) !== "PENDENTE" && (
                                  <p>
                                    <span className="text-muted-foreground">
                                      Resultado:{" "}
                                    </span>
                                    <span className="font-medium">
                                      {CRJ_ROUND_OUTCOME_LABELS[
                                        String(item.metadata.outcome)
                                      ] || String(item.metadata.outcome)}
                                    </span>
                                  </p>
                                )}
                              {item.metadata.creditor_response != null && (
                                <p>
                                  <span className="text-muted-foreground">
                                    Resposta:{" "}
                                  </span>
                                  <span>{String(item.metadata.creditor_response)}</span>
                                </p>
                              )}
                              {item.metadata.next_steps != null && (
                                <p>
                                  <span className="text-muted-foreground">
                                    Próximos passos:{" "}
                                  </span>
                                  <span>{String(item.metadata.next_steps)}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {/* Email-specific info */}
                          {item.category === "email" && item.metadata && (
                            <div className="mt-1 text-[10px] text-muted-foreground">
                              {String(item.metadata.direction) === "ENVIADO"
                                ? `Para: ${(item.metadata.to as string[])?.join(", ")}`
                                : `De: ${String(item.metadata.from)}`}
                            </div>
                          )}

                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                            {item.user && <span>{item.user}</span>}
                            <span>{formatDateTime(item.date)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OBSERVACAO">Observação</SelectItem>
              <SelectItem value="REUNIAO">Reunião</SelectItem>
              <SelectItem value="LIGACAO">Ligação</SelectItem>
              <SelectItem value="CONTATO_CREDOR">Contato credor</SelectItem>
              <SelectItem value="LEMBRETE">Lembrete</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Registrar atividade..."
            rows={1}
            className="min-h-[36px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            disabled={!message.trim() || createEvent.isPending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
