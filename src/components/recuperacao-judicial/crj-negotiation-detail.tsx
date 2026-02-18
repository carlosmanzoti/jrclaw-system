"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers";
import { trpc } from "@/lib/trpc";
import {
  CRJ_STATUS_LABELS,
  CRJ_STATUS_COLORS,
  CRJ_STATUS_ORDER,
  CRJ_TYPE_LABELS,
  CRJ_PRIORITY_LABELS,
  CRJ_PRIORITY_COLORS,
  CRJ_EVENT_TYPE_LABELS,
  CRJ_ROUND_TYPE_LABELS,
  CRJ_ROUND_OUTCOME_LABELS,
  CRJ_ROUND_OUTCOME_COLORS,
  CRJ_PROPOSAL_STATUS_LABELS,
  CRJ_INSTALLMENT_STATUS_LABELS,
  formatBRL,
  formatPercent,
  daysSince,
} from "@/lib/crj-constants";
import { CREDIT_CLASS_SHORT_LABELS, formatCentavos } from "@/lib/rj-constants";
import {
  ArrowLeft,
  User,
  Clock,
  DollarSign,
  Target,
  Calendar,
  Plus,
  Send,
  FileText,
  MessageSquare,
  Handshake,
  ChevronRight,
  CheckCircle,
  Mail,
  MailOpen,
  RefreshCw,
  Phone,
  Users,
  Bell,
  UserCheck,
  Inbox,
  AlertCircle,
  Link2,
  Wand2,
} from "lucide-react";
import { CRJProposalGenerator } from "./crj-proposal-generator";
import { CRJEmailComposer } from "./crj-email-composer";
import { CRJConversationView } from "./crj-conversation-view";

// Icon map for timeline events
const EVENT_ICONS: Record<string, React.ReactNode> = {
  CRIACAO: <Plus className="h-3 w-3" />,
  MUDANCA_STATUS: <RefreshCw className="h-3 w-3" />,
  PROPOSTA_ENVIADA: <Send className="h-3 w-3" />,
  PROPOSTA_RECEBIDA: <Inbox className="h-3 w-3" />,
  REUNIAO: <Users className="h-3 w-3" />,
  LIGACAO: <Phone className="h-3 w-3" />,
  EMAIL_ENVIADO: <Mail className="h-3 w-3" />,
  EMAIL_RECEBIDO: <MailOpen className="h-3 w-3" />,
  DOCUMENTO_GERADO: <FileText className="h-3 w-3" />,
  ACORDO: <CheckCircle className="h-3 w-3" />,
  OBSERVACAO: <MessageSquare className="h-3 w-3" />,
  LEMBRETE: <Bell className="h-3 w-3" />,
  CONTATO_CREDOR: <UserCheck className="h-3 w-3" />,
};

interface CRJNegotiationDetailProps {
  negotiationId: string;
  onBack: () => void;
}

export function CRJNegotiationDetail({
  negotiationId,
  onBack,
}: CRJNegotiationDetailProps) {
  const [activeTab, setActiveTab] = useState("resumo");

  const { data: neg, isLoading } =
    trpc.crjNeg.negotiations.getById.useQuery({ id: negotiationId });

  const utils = trpc.useUtils();

  const updateMutation = trpc.crjNeg.negotiations.update.useMutation({
    onSuccess: () => utils.crjNeg.negotiations.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!neg) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Negociação não encontrada</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const creditAmountReais = Number(neg.credit_amount) / 100;
  const proposedAmountReais = neg.proposed_amount ? Number(neg.proposed_amount) / 100 : null;
  const agreedAmountReais = neg.agreed_amount ? Number(neg.agreed_amount) / 100 : null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base font-semibold">{neg.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{neg.creditor?.nome}</span>
              {neg.creditor?.cpf_cnpj && (
                <>
                  <span>|</span>
                  <span>{neg.creditor.cpf_cnpj}</span>
                </>
              )}
              {neg.creditor?.classe && (
                <>
                  <span>|</span>
                  <Badge variant="outline" className="text-[9px]">
                    {CREDIT_CLASS_SHORT_LABELS[neg.creditor.classe] || neg.creditor.classe}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`${CRJ_STATUS_COLORS[neg.status] || "bg-gray-100 text-gray-700"}`}
          >
            {CRJ_STATUS_LABELS[neg.status] || neg.status}
          </Badge>
          <Badge
            variant="outline"
            className={CRJ_PRIORITY_COLORS[neg.priority] || ""}
          >
            {CRJ_PRIORITY_LABELS[neg.priority] || neg.priority}
          </Badge>
          {/* Status change */}
          <Select
            value={neg.status}
            onValueChange={(v) => updateMutation.mutate({ id: neg.id, status: v })}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Alterar status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CRJ_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-9">
            <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
            <TabsTrigger value="rodadas" className="text-xs">Rodadas</TabsTrigger>
            <TabsTrigger value="propostas" className="text-xs">Propostas</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            <TabsTrigger value="parcelas" className="text-xs">Parcelas</TabsTrigger>
            <TabsTrigger value="emails" className="text-xs">E-mails</TabsTrigger>
            <TabsTrigger value="conversa" className="text-xs">Conversa</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="resumo" className="m-0">
            <TabResumo neg={neg} creditAmountReais={creditAmountReais} proposedAmountReais={proposedAmountReais} agreedAmountReais={agreedAmountReais} />
          </TabsContent>
          <TabsContent value="rodadas" className="m-0">
            <TabRodadas neg={neg} />
          </TabsContent>
          <TabsContent value="propostas" className="m-0">
            <TabPropostas neg={neg} />
          </TabsContent>
          <TabsContent value="timeline" className="m-0">
            <TabTimeline neg={neg} />
          </TabsContent>
          <TabsContent value="parcelas" className="m-0">
            <TabParcelas neg={neg} />
          </TabsContent>
          <TabsContent value="emails" className="m-0">
            <TabEmails neg={neg} />
          </TabsContent>
          <TabsContent value="conversa" className="m-0 h-full">
            <CRJConversationView negotiationId={neg.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Helper type for the full negotiation data
type RouterOutput = inferRouterOutputs<AppRouter>;
type NegData = RouterOutput["crjNeg"]["negotiations"]["getById"];

// ========== Tab Resumo ==========

function TabResumo({ neg, creditAmountReais, proposedAmountReais, agreedAmountReais }: {
  neg: NegData;
  creditAmountReais: number;
  proposedAmountReais: number | null;
  agreedAmountReais: number | null;
}) {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 p-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Crédito</p>
            <p className="text-lg font-bold">{fmt(creditAmountReais)}</p>
            <p className="text-[10px] text-muted-foreground">{neg.credit_class || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Proposto</p>
            <p className="text-lg font-bold">{proposedAmountReais ? fmt(proposedAmountReais) : "—"}</p>
            {neg.discount_percentage != null && (
              <p className="text-[10px] text-emerald-600">
                Deságio: {formatPercent(neg.discount_percentage)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Acordado</p>
            <p className="text-lg font-bold">{agreedAmountReais ? fmt(agreedAmountReais) : "—"}</p>
            <p className="text-[10px] text-muted-foreground">
              {neg.installments ? `${neg.installments}x parcelas` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Rodadas</p>
            <p className="text-lg font-bold">{neg.rounds?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">
              {neg.events?.length || 0} eventos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two column: Details + Creditor */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Detalhes da Negociação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Tipo: </span>
                <span className="font-medium">{CRJ_TYPE_LABELS[neg.type] || neg.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Responsável: </span>
                <span className="font-medium">{neg.assigned_to?.name || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Início: </span>
                <span className="font-medium">
                  {neg.start_date ? new Date(neg.start_date).toLocaleDateString("pt-BR") : "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Data alvo: </span>
                <span className="font-medium">
                  {neg.target_date ? new Date(neg.target_date).toLocaleDateString("pt-BR") : "—"}
                </span>
              </div>
              {neg.grace_period_months != null && (
                <div>
                  <span className="text-muted-foreground">Carência: </span>
                  <span className="font-medium">{neg.grace_period_months} meses</span>
                </div>
              )}
              {neg.payment_term_years != null && (
                <div>
                  <span className="text-muted-foreground">Prazo: </span>
                  <span className="font-medium">{neg.payment_term_years} anos</span>
                </div>
              )}
              {neg.monetary_correction && (
                <div>
                  <span className="text-muted-foreground">Correção: </span>
                  <span className="font-medium">{neg.monetary_correction}</span>
                </div>
              )}
            </div>
            {/* Special features */}
            {(neg.has_rotating_credit || neg.has_credit_insurance || neg.has_assignment) && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {neg.has_rotating_credit && (
                  <Badge variant="outline" className="text-[9px]">
                    Crédito Rotativo
                    {neg.rotating_credit_value && ` — ${formatBRL(neg.rotating_credit_value)}`}
                  </Badge>
                )}
                {neg.has_credit_insurance && (
                  <Badge variant="outline" className="text-[9px]">
                    Seguro: {neg.insurer_name || "—"}
                  </Badge>
                )}
                {neg.has_assignment && (
                  <Badge variant="outline" className="text-[9px]">
                    Cessão: {neg.assignment_partner || "—"}
                    {neg.assignment_percentage != null && ` (${neg.assignment_percentage}%)`}
                  </Badge>
                )}
              </div>
            )}
            {neg.notes && (
              <div className="mt-2 rounded border bg-muted/30 p-2 text-xs">
                {neg.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Creditor info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Dados do Credor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Nome: </span>
                <span className="font-medium">{neg.creditor?.nome || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CPF/CNPJ: </span>
                <span className="font-medium">{neg.creditor?.cpf_cnpj || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Classe: </span>
                <span className="font-medium">{neg.creditor?.classe || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Natureza: </span>
                <span className="font-medium">{neg.creditor?.natureza || "—"}</span>
              </div>
            </div>
            {neg.creditor?.person && (
              <>
                <Separator className="my-2" />
                <p className="text-[10px] font-semibold text-muted-foreground">CONTATO</p>
                <div className="grid grid-cols-2 gap-2">
                  {neg.creditor.person.email && (
                    <div>
                      <span className="text-muted-foreground">E-mail: </span>
                      <span className="font-medium">{neg.creditor.person.email}</span>
                    </div>
                  )}
                  {neg.creditor.person.celular && (
                    <div>
                      <span className="text-muted-foreground">Celular: </span>
                      <span className="font-medium">{neg.creditor.person.celular}</span>
                    </div>
                  )}
                  {neg.creditor.person.cidade && (
                    <div>
                      <span className="text-muted-foreground">Local: </span>
                      <span className="font-medium">
                        {neg.creditor.person.cidade}/{neg.creditor.person.estado}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Link to QGC */}
            <a
              href={`/recuperacao-judicial/quadro-credores`}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver no Quadro de Credores <ChevronRight className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Linked collective rounds */}
      {neg.collective_round_links && neg.collective_round_links.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Link2 className="h-4 w-4" />
              Rodadas Coletivas Vinculadas
              <Badge variant="outline" className="text-[10px]">
                {neg.collective_round_links.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {neg.collective_round_links.map(
                (link: {
                  rj_negotiation: {
                    id: string;
                    titulo: string;
                    fase: string;
                    prioridade: string;
                    total_credores: number;
                    valor_total_original: bigint | number;
                  };
                }) => (
                  <div
                    key={link.rj_negotiation.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Handshake className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">
                          {link.rj_negotiation.titulo}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {link.rj_negotiation.total_credores} credores |{" "}
                          {formatBRL(link.rj_negotiation.valor_total_original)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {link.rj_negotiation.fase}
                    </Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Process info */}
      {neg.jrc?.case_ && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="text-xs">
              <span className="text-muted-foreground">Processo: </span>
              <span className="font-medium">{neg.jrc.case_.numero_processo || "—"}</span>
              <span className="text-muted-foreground"> | Vara: </span>
              <span className="font-medium">{neg.jrc.case_.vara}</span>
              <span className="text-muted-foreground"> | {neg.jrc.case_.comarca}/{neg.jrc.case_.uf}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Cliente: {neg.jrc.case_.cliente?.nome || "—"}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== Tab Rodadas ==========

function TabRodadas({ neg }: { neg: NegData }) {
  const [addOpen, setAddOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [roundType, setRoundType] = useState("PROPOSTA_INICIAL");
  const [proposedByUs, setProposedByUs] = useState(true);
  const [valueProposed, setValueProposed] = useState("");

  const utils = trpc.useUtils();
  const createRound = trpc.crjNeg.rounds.create.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
      setAddOpen(false);
      setDesc("");
      setValueProposed("");
    },
  });

  const rounds = neg.rounds || [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Rodadas de Negociação ({rounds.length})</h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs">
              <Plus className="mr-1 h-3 w-3" /> Nova Rodada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Rodada</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={roundType} onValueChange={setRoundType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CRJ_ROUND_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={proposedByUs}
                  onChange={(e) => setProposedByUs(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label className="text-xs">Proposta enviada por nós</Label>
              </div>
              <div>
                <Label className="text-xs">Valor proposto (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valueProposed}
                  onChange={(e) => setValueProposed(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Descrição *</Label>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button
                className="w-full"
                disabled={!desc.trim() || createRound.isPending}
                onClick={() =>
                  createRound.mutate({
                    negotiation_id: neg.id,
                    type: roundType,
                    description: desc,
                    proposed_by_us: proposedByUs,
                    value_proposed: valueProposed ? parseFloat(valueProposed) : undefined,
                  })
                }
              >
                {createRound.isPending ? "Criando..." : "Registrar Rodada"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rounds.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Nenhuma rodada registrada
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => (
            <Card key={round.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        #{round.round_number}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {CRJ_ROUND_TYPE_LABELS[round.type] || round.type}
                      </Badge>
                      {round.outcome && (
                        <Badge className={`text-[10px] ${CRJ_ROUND_OUTCOME_COLORS[round.outcome] || ""}`}>
                          {CRJ_ROUND_OUTCOME_LABELS[round.outcome] || round.outcome}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs">{round.description}</p>
                    {round.creditor_response && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Resposta: {round.creditor_response}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    {round.value_proposed && (
                      <p className="font-medium">{formatBRL(round.value_proposed)}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(round.date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                {round.next_steps && (
                  <p className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
                    Próximos passos: {round.next_steps}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Tab Propostas ==========

function TabPropostas({ neg }: { neg: NegData }) {
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const proposals = neg.proposals || [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Propostas e Documentos ({proposals.length})</h3>
        <Button size="sm" className="h-8 text-xs" onClick={() => setGeneratorOpen(true)}>
          <Wand2 className="mr-1 h-3 w-3" /> Gerar Proposta
        </Button>
      </div>

      <CRJProposalGenerator
        open={generatorOpen}
        onOpenChange={setGeneratorOpen}
        negotiationId={neg.id}
      />

      {proposals.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Nenhuma proposta gerada
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Proposta v{proposal.version}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{proposal.template_type}</span>
                      <span>
                        {new Date(proposal.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {CRJ_PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}
                  </Badge>
                  {proposal.sent_via_email && (
                    <Badge className="bg-blue-50 text-[9px] text-blue-700">
                      Enviada por e-mail
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Tab Timeline ==========

function TabTimeline({ neg }: { neg: NegData }) {
  const [addNote, setAddNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  const utils = trpc.useUtils();
  const createEvent = trpc.crjNeg.events.create.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
      setAddNote(false);
      setNoteText("");
    },
  });

  const events = neg.events || [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Timeline ({events.length})</h3>
        <Dialog open={addNote} onOpenChange={setAddNote}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Plus className="mr-1 h-3 w-3" /> Adicionar Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Observação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Descreva a observação..."
                rows={4}
                className="text-sm"
              />
              <Button
                className="w-full"
                disabled={!noteText.trim() || createEvent.isPending}
                onClick={() =>
                  createEvent.mutate({
                    negotiation_id: neg.id,
                    type: "OBSERVACAO",
                    description: noteText,
                  })
                }
              >
                {createEvent.isPending ? "Salvando..." : "Salvar Observação"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Nenhum evento registrado
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 h-full w-px bg-border" />

          {events.map((event, i) => (
            <div key={event.id} className="relative flex items-start gap-4 pb-4">
              {/* Dot */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                {EVENT_ICONS[event.type] || <MessageSquare className="h-3 w-3" />}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {CRJ_EVENT_TYPE_LABELS[event.type] || event.type}
                  </Badge>
                  {event.is_automatic && (
                    <span className="text-[9px] text-muted-foreground">automático</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs">{event.description}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {event.user?.name && <span>{event.user.name}</span>}
                  <span>
                    {new Date(event.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== Tab Parcelas ==========

function TabParcelas({ neg }: { neg: NegData }) {
  const installments = neg.installment_schedule || [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cronograma de Parcelas ({installments.length})</h3>
      </div>

      {installments.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Nenhuma parcela gerada. Use a calculadora para gerar o cronograma de pagamentos.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">Vencimento</th>
                <th className="pb-2 pr-3 text-right">Valor</th>
                <th className="pb-2 pr-3 text-right">Pago</th>
                <th className="pb-2 pr-3 text-right">Saldo</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => (
                <tr key={inst.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-xs">
                    {inst.installment_number === 0 ? "Entrada" : inst.installment_number}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {new Date(inst.due_date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-2 pr-3 text-right text-xs font-medium">
                    {formatBRL(inst.amount)}
                  </td>
                  <td className="py-2 pr-3 text-right text-xs">
                    {inst.paid_amount ? formatBRL(inst.paid_amount) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right text-xs text-muted-foreground">
                    {formatBRL(inst.remaining_balance)}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline" className="text-[10px]">
                      {CRJ_INSTALLMENT_STATUS_LABELS[inst.status] || inst.status}
                    </Badge>
                  </td>
                  <td className="py-2 text-xs text-muted-foreground">
                    {inst.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ========== Tab Emails ==========

function TabEmails({ neg }: { neg: NegData }) {
  const [composeOpen, setComposeOpen] = useState(false);
  const emails = neg.emails || [];

  const creditorEmail = neg.creditor?.person?.email || "";
  const creditorName = neg.creditor?.nome || "";

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">E-mails ({emails.length})</h3>
        <Button size="sm" className="h-8 text-xs" onClick={() => setComposeOpen(true)}>
          <Send className="mr-1 h-3 w-3" /> Novo E-mail
        </Button>
      </div>

      <CRJEmailComposer
        open={composeOpen}
        onOpenChange={setComposeOpen}
        negotiationId={neg.id}
        creditorEmail={creditorEmail}
        creditorName={creditorName}
      />

      {emails.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Nenhum e-mail vinculado a esta negociação
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <Card key={email.id}>
              <CardContent className="flex items-start gap-3 p-3">
                <div className="mt-0.5">
                  {email.direction === "ENVIADO" ? (
                    <Send className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Inbox className="h-4 w-4 text-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-medium">{email.subject}</p>
                    {email.proposal && (
                      <Badge variant="outline" className="shrink-0 text-[9px]">
                        Proposta v{email.proposal.version}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {email.direction === "ENVIADO" ? "Para: " : "De: "}
                    {email.direction === "ENVIADO"
                      ? email.to_addresses.join(", ")
                      : email.from_address}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {email.body_preview}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(email.sent_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
