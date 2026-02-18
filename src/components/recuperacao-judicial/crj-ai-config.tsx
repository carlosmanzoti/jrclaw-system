"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  Zap,
  FileText,
  Database,
  History,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Sparkles,
  Mail,
  BarChart3,
  Clock,
  Link2,
  Target,
  Eye,
  Lightbulb,
  XCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassCondition {
  desagio_padrao: number;
  prazo_anos: number;
  carencia_meses: number;
  correcao: string;
  juros: number;
  observacoes: string;
}

const CLASS_LABELS: Record<string, string> = {
  I_TRABALHISTA: "Classe I — Trabalhista",
  II_GARANTIA_REAL: "Classe II — Garantia Real",
  III_QUIROGRAFARIO: "Classe III — Quirografario",
  IV_ME_EPP: "Classe IV — ME/EPP",
};

const TRIGGER_LABELS: Record<
  string,
  { label: string; description: string; icon: React.ElementType }
> = {
  trigger_on_create: {
    label: "Ao criar negociacao",
    description:
      "Analisa perfil do credor, sugere tipo de negociacao e faixa de desagio",
    icon: Sparkles,
  },
  trigger_on_proposal: {
    label: "Ao enviar proposta",
    description:
      "Agenda follow-ups, gera rascunho de acompanhamento, verifica termos de mercado",
    icon: FileText,
  },
  trigger_on_counter: {
    label: "Ao receber contraproposta",
    description:
      "Analisa distancia entre posicoes, calcula convergencia, sugere proxima rodada",
    icon: RefreshCw,
  },
  trigger_on_status: {
    label: "Ao mudar status",
    description:
      "Gera checklist contextual da nova fase com acoes obrigatorias",
    icon: Target,
  },
  trigger_on_deadline: {
    label: "Monitoramento de prazos",
    description:
      "Verifica prazos-alvo, inatividade, propostas sem resposta, parcelas vencendo",
    icon: Clock,
  },
  trigger_on_patterns: {
    label: "Deteccao de padroes",
    description:
      "Identifica credores do mesmo grupo, sugere rodadas coletivas, compara desagios",
    icon: Link2,
  },
  trigger_on_email: {
    label: "Ao vincular e-mail",
    description:
      "Analisa conteudo de e-mails recebidos, detecta contraproposta ou aceitacao",
    icon: Mail,
  },
};

const INSIGHT_TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  OPORTUNIDADE: { icon: Zap, color: "text-amber-600" },
  RISCO: { icon: AlertTriangle, color: "text-red-500" },
  SUGESTAO: { icon: Lightbulb, color: "text-blue-500" },
  ANALISE: { icon: BarChart3, color: "text-emerald-600" },
  CONEXAO: { icon: Link2, color: "text-purple-500" },
  URGENCIA: { icon: Clock, color: "text-red-600" },
  CHECKLIST: { icon: CheckCircle, color: "text-teal-500" },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CRJAIConfigProps {
  jrcId?: string | null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CRJAIConfig({ jrcId }: CRJAIConfigProps) {
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("modelo");

  const utils = trpc.useUtils();

  // Fetch config
  const { data: config, isLoading } = trpc.crjNeg.aiConfig.get.useQuery(
    { jrc_id: jrcId || undefined },
    { enabled: true }
  );

  // Fetch insight stats
  const { data: insightStats } = trpc.crjNeg.aiConfig.insightStats.useQuery(
    { jrc_id: jrcId || undefined },
    { enabled: activeTab === "historico" }
  );

  // Fetch insight history
  const { data: insightHistory } = trpc.crjNeg.aiConfig.insightHistory.useQuery(
    { jrc_id: jrcId || undefined, limit: 50 },
    { enabled: activeTab === "historico" }
  );

  // Local form state
  const [form, setForm] = useState<Record<string, any>>({});

  // Sync form with config when loaded
  useEffect(() => {
    if (config) {
      setForm({ ...config });
    }
  }, [config]);

  // Update mutation
  const updateMutation = trpc.crjNeg.aiConfig.update.useMutation({
    onSuccess: () => {
      utils.crjNeg.aiConfig.get.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      jrc_id: jrcId || undefined,
      ...form,
    });
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateClassCondition = (
    classKey: string,
    field: string,
    value: number | string
  ) => {
    setForm((prev) => {
      const conditions = { ...(prev.class_conditions || {}) };
      conditions[classKey] = { ...(conditions[classKey] || {}), [field]: value };
      return { ...prev, class_conditions: conditions };
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading flex items-center gap-2">
              <Settings className="size-6 text-[#C9A961]" />
              Configuracoes da IA — Negociacoes
            </h1>
            <p className="text-[#666666]">
              Personalize o comportamento do Harvey Specter e da IA em todo o
              modulo de negociacoes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="size-3 mr-1" />
                Salvo
              </Badge>
            )}
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              style={{ backgroundColor: "#C9A961" }}
              className="text-white"
            >
              <Save className="size-4 mr-1" />
              {updateMutation.isPending ? "Salvando..." : "Salvar Configuracoes"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="modelo" className="gap-1">
              <Brain className="size-3.5" />
              Modelo
            </TabsTrigger>
            <TabsTrigger value="triggers" className="gap-1">
              <Zap className="size-3.5" />
              Triggers
            </TabsTrigger>
            <TabsTrigger value="prompts" className="gap-1">
              <FileText className="size-3.5" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="referencia" className="gap-1">
              <Database className="size-3.5" />
              Referencia
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1">
              <History className="size-3.5" />
              Historico
            </TabsTrigger>
          </TabsList>

          {/* ============================================================= */}
          {/* TAB 1: MODELO E PERFORMANCE                                    */}
          {/* ============================================================= */}
          <TabsContent value="modelo" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modelo Padrao</CardTitle>
                <CardDescription>
                  Selecione o modelo de IA utilizado como padrao em todas as operacoes do modulo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Modelo de IA</Label>
                    <p className="text-xs text-muted-foreground">
                      Sonnet 4.5 e mais rapido e economico. Opus 4.6 e mais profundo e detalhado.
                    </p>
                  </div>
                  <Select
                    value={form.default_model || "standard"}
                    onValueChange={(v) => updateField("default_model", v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        Sonnet 4.5 (Rapido)
                      </SelectItem>
                      <SelectItem value="premium">
                        Opus 4.6 (Profundo)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comportamento da IA</CardTitle>
                <CardDescription>
                  Controle como a IA interage proativamente com o modulo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">IA Proativa</Label>
                    <p className="text-xs text-muted-foreground">
                      Gera insights automaticos sem o usuario pedir (triggers).
                    </p>
                  </div>
                  <Switch
                    checked={form.proactive_ai ?? true}
                    onCheckedChange={(v) => updateField("proactive_ai", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Frequencia do Briefing Diario</Label>
                    <p className="text-xs text-muted-foreground">
                      Quando gerar o resumo inteligente do portfolio.
                    </p>
                  </div>
                  <Select
                    value={form.briefing_frequency || "daily"}
                    onValueChange={(v) => updateField("briefing_frequency", v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="login">A cada login</SelectItem>
                      <SelectItem value="daily">1x por dia</SelectItem>
                      <SelectItem value="disabled">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Autocomplete na Conversa</Label>
                    <p className="text-xs text-muted-foreground">
                      Sugestoes de texto ao digitar na thread da negociacao.
                    </p>
                  </div>
                  <Switch
                    checked={form.autocomplete_enabled ?? true}
                    onCheckedChange={(v) => updateField("autocomplete_enabled", v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 2: TRIGGERS                                                */}
          {/* ============================================================= */}
          <TabsContent value="triggers" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Triggers Automaticos</CardTitle>
                <CardDescription>
                  Ative ou desative cada trigger individualmente. Triggers geram insights automaticos no painel Harvey Specter.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {Object.entries(TRIGGER_LABELS).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md bg-[#C9A961]/10 p-1.5">
                          <Icon className="size-4 text-[#C9A961]" />
                        </div>
                        <div>
                          <Label className="font-medium">{cfg.label}</Label>
                          <p className="text-xs text-muted-foreground max-w-md">
                            {cfg.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={form[key] ?? true}
                        onCheckedChange={(v) => updateField(key, v)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thresholds de Alerta</CardTitle>
                <CardDescription>
                  Configure os limites para alertas automaticos de inatividade e prazos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">
                      Dias sem atividade
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Alertar se negociacao ficar parada
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={form.days_inactive_alert ?? 14}
                        onChange={(e) =>
                          updateField(
                            "days_inactive_alert",
                            parseInt(e.target.value) || 14
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Dias sem resposta a proposta
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Alertar se proposta enviada sem retorno
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={form.days_no_response ?? 10}
                        onChange={(e) =>
                          updateField(
                            "days_no_response",
                            parseInt(e.target.value) || 10
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      Dias antes do prazo-alvo
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Alertar antes da data-alvo vencer
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={form.days_before_target ?? 7}
                        onChange={(e) =>
                          updateField(
                            "days_before_target",
                            parseInt(e.target.value) || 7
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 3: TEMPLATES DE PROMPT                                     */}
          {/* ============================================================= */}
          <TabsContent value="prompts" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Prompt do Harvey Specter</CardTitle>
                <CardDescription>
                  Personalize o prompt base que define a personalidade e comportamento do assistente. Deixe vazio para usar o padrao.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.custom_system_prompt || ""}
                  onChange={(e) =>
                    updateField("custom_system_prompt", e.target.value || null)
                  }
                  placeholder="Voce e Harvey Specter, estrategista de negociacoes juridicas do escritorio JRCLaw, especializado em recuperacao judicial brasileira (Lei 11.101/2005)..."
                  className="min-h-[120px] font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Variaveis disponiveis: {"{{credor}}"}, {"{{classe}}"}, {"{{valor}}"}, {"{{status}}"}, {"{{historico_rodadas}}"}, {"{{portfolio}}"}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <FileText className="size-3.5 text-[#C9A961]" />
                    Prompt — Proposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={form.prompt_proposal || ""}
                    onChange={(e) =>
                      updateField("prompt_proposal", e.target.value || null)
                    }
                    placeholder="Instrucoes adicionais para geracao de propostas..."
                    className="min-h-[100px] font-mono text-xs"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Mail className="size-3.5 text-[#C9A961]" />
                    Prompt — E-mail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={form.prompt_email || ""}
                    onChange={(e) =>
                      updateField("prompt_email", e.target.value || null)
                    }
                    placeholder="Instrucoes adicionais para redacao de e-mails..."
                    className="min-h-[100px] font-mono text-xs"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <BarChart3 className="size-3.5 text-[#C9A961]" />
                    Prompt — Analise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={form.prompt_analysis || ""}
                    onChange={(e) =>
                      updateField("prompt_analysis", e.target.value || null)
                    }
                    placeholder="Instrucoes adicionais para analises estrategicas..."
                    className="min-h-[100px] font-mono text-xs"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Instrucoes Persistentes
                </CardTitle>
                <CardDescription>
                  Texto que SEMPRE sera incluido em todas as interacoes com a IA.
                  Use para regras do escritorio, preferencias estrategicas e
                  diretrizes especificas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.persistent_instructions || ""}
                  onChange={(e) =>
                    updateField(
                      "persistent_instructions",
                      e.target.value || null
                    )
                  }
                  placeholder={`Exemplos:\n- O escritorio prefere propostas com credito rotativo sempre que o credor e fornecedor\n- Para bancos, o desagio minimo aceitavel e 60%\n- Sempre mencionar a possibilidade de cessao de credito como alternativa\n- Tom de comunicacao: profissional e cordial, nunca agressivo`}
                  className="min-h-[140px] font-mono text-xs"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 4: DADOS DE REFERENCIA                                     */}
          {/* ============================================================= */}
          <TabsContent value="referencia" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Condicoes Gerais do PRJ por Classe
                </CardTitle>
                <CardDescription>
                  Valores de referencia utilizados pela IA para comparar propostas e sugerir termos.
                  Edite conforme as condicoes do Plano de Recuperacao Judicial vigente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(CLASS_LABELS).map(([classKey, label]) => {
                  const conditions: ClassCondition = (form.class_conditions ||
                    {})[classKey] || {
                    desagio_padrao: 0,
                    prazo_anos: 1,
                    carencia_meses: 0,
                    correcao: "IPCA",
                    juros: 0,
                    observacoes: "",
                  };

                  return (
                    <div
                      key={classKey}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <h4 className="text-sm font-semibold text-[#2A2A2A]">
                        {label}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <Label className="text-xs">Desagio (%)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={conditions.desagio_padrao}
                            onChange={(e) =>
                              updateClassCondition(
                                classKey,
                                "desagio_padrao",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Prazo (anos)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={30}
                            value={conditions.prazo_anos}
                            onChange={(e) =>
                              updateClassCondition(
                                classKey,
                                "prazo_anos",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Carencia (meses)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={60}
                            value={conditions.carencia_meses}
                            onChange={(e) =>
                              updateClassCondition(
                                classKey,
                                "carencia_meses",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Correcao</Label>
                          <Select
                            value={conditions.correcao || "IPCA"}
                            onValueChange={(v) =>
                              updateClassCondition(classKey, "correcao", v)
                            }
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                form.correction_indices || [
                                  "INPC",
                                  "IPCA",
                                  "IGPM",
                                  "CDI",
                                ]
                              ).map((idx: string) => (
                                <SelectItem key={idx} value={idx}>
                                  {idx}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Juros (% a.a.)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={20}
                            step={0.5}
                            value={conditions.juros}
                            onChange={(e) =>
                              updateClassCondition(
                                classKey,
                                "juros",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Observacoes</Label>
                        <Input
                          value={conditions.observacoes || ""}
                          onChange={(e) =>
                            updateClassCondition(
                              classKey,
                              "observacoes",
                              e.target.value
                            )
                          }
                          placeholder="Notas sobre esta classe..."
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Taxa de Desconto para VPL
                  </CardTitle>
                  <CardDescription>
                    Taxa anual usada para calculo do Valor Presente Liquido das
                    propostas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={form.vpn_discount_rate ?? 12}
                      onChange={(e) =>
                        updateField(
                          "vpn_discount_rate",
                          parseFloat(e.target.value) || 12
                        )
                      }
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">% a.a.</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Indices de Correcao Disponiveis
                  </CardTitle>
                  <CardDescription>
                    Indices monetarios que aparecem como opcao nas propostas e
                    calculadora.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {["INPC", "IPCA", "IGPM", "CDI", "TR", "Selic"].map(
                      (idx) => {
                        const isActive = (
                          form.correction_indices || [
                            "INPC",
                            "IPCA",
                            "IGPM",
                            "CDI",
                          ]
                        ).includes(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const current = form.correction_indices || [
                                "INPC",
                                "IPCA",
                                "IGPM",
                                "CDI",
                              ];
                              if (isActive) {
                                updateField(
                                  "correction_indices",
                                  current.filter((i: string) => i !== idx)
                                );
                              } else {
                                updateField("correction_indices", [
                                  ...current,
                                  idx,
                                ]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isActive
                                ? "bg-[#C9A961] text-white border-[#C9A961]"
                                : "bg-white text-muted-foreground border-gray-200 hover:border-[#C9A961]"
                            }`}
                          >
                            {idx}
                          </button>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============================================================= */}
          {/* TAB 5: HISTORICO                                               */}
          {/* ============================================================= */}
          <TabsContent value="historico" className="space-y-4 mt-4">
            {/* Metrics cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {insightStats?.total ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Insights Gerados
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {insightStats?.accepted ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Aceitos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">
                    {insightStats?.dismissed ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Descartados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {insightStats?.read ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Lidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-[#C9A961]">
                    {insightStats?.acceptanceRate?.toFixed(0) ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Taxa Aceitacao
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* By type breakdown */}
            {insightStats?.byType && insightStats.byType.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Insights por Tipo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {insightStats.byType.map((t) => {
                      const cfg = INSIGHT_TYPE_ICONS[t.type] || {
                        icon: Lightbulb,
                        color: "text-gray-500",
                      };
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={t.type}
                          className="flex items-center gap-2 rounded-lg border px-3 py-2"
                        >
                          <Icon className={`size-4 ${cfg.color}`} />
                          <span className="text-sm font-medium">{t.type}</span>
                          <Badge variant="secondary" className="text-xs">
                            {t.count}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Historico de Insights
                </CardTitle>
                <CardDescription>
                  Ultimos insights gerados pela IA com status de leitura e acao.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!insightHistory?.items || insightHistory.items.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="size-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum insight gerado ainda.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Insights aparecerao aqui conforme a IA analisa as negociacoes.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {insightHistory.items.map((item) => {
                        const cfg = INSIGHT_TYPE_ICONS[item.type] || {
                          icon: Lightbulb,
                          color: "text-gray-500",
                        };
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 py-2 border-b last:border-0"
                          >
                            <Icon
                              className={`size-4 mt-0.5 shrink-0 ${cfg.color}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium truncate">
                                  {item.title}
                                </span>
                                {item.is_dismissed && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 border-red-200 text-red-500"
                                  >
                                    <XCircle className="size-2.5 mr-0.5" />
                                    Descartado
                                  </Badge>
                                )}
                                {item.is_read && !item.is_dismissed && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 border-green-200 text-green-600"
                                  >
                                    <Eye className="size-2.5 mr-0.5" />
                                    Lido
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                <span>
                                  {new Date(item.created_at).toLocaleDateString(
                                    "pt-BR"
                                  )}{" "}
                                  {new Date(item.created_at).toLocaleTimeString(
                                    "pt-BR",
                                    { hour: "2-digit", minute: "2-digit" }
                                  )}
                                </span>
                                {item.negotiation && (
                                  <span>
                                    | {item.negotiation.creditor?.nome || item.negotiation.title}
                                  </span>
                                )}
                                {item.trigger_source && (
                                  <span>| Trigger: {item.trigger_source}</span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 h-4 shrink-0"
                            >
                              {Math.round(item.confidence * 100)}%
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
