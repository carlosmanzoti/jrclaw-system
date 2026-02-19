"use client";

import { useState, useMemo } from "react";
import {
  Settings,
  Check,
  X,
  Loader2,
  Shield,
  Search,
  Scale,
  Building2,
  Globe,
  Satellite,
  DollarSign,
  Zap,
  AlertTriangle,
  ExternalLink,
  TestTube2,
  Save,
  KeyRound,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";

// ── BRL formatter ──────────────────────────────────────────────
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// ── Category types ─────────────────────────────────────────────
type ProviderCategory =
  | "CADASTRAL"
  | "JUDICIAL"
  | "PATRIMONIAL"
  | "FINANCEIRO"
  | "COMPLIANCE"
  | "AMBIENTAL";

const CATEGORY_CONFIG: Record<
  ProviderCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  CADASTRAL: {
    label: "Cadastral",
    icon: Search,
    color: "text-blue-500",
  },
  JUDICIAL: {
    label: "Judicial",
    icon: Scale,
    color: "text-purple-500",
  },
  PATRIMONIAL: {
    label: "Patrimonial",
    icon: Building2,
    color: "text-amber-500",
  },
  FINANCEIRO: {
    label: "Financeiro",
    icon: DollarSign,
    color: "text-green-500",
  },
  COMPLIANCE: {
    label: "Compliance / Sancoes",
    icon: Shield,
    color: "text-red-500",
  },
  AMBIENTAL: {
    label: "Ambiental / Satelite",
    icon: Satellite,
    color: "text-emerald-500",
  },
};

// ── Provider definitions ───────────────────────────────────────
interface ProviderDef {
  id: string;
  name: string;
  category: ProviderCategory;
  costPerQuery: number;
  costCurrency: string;
  isFree: boolean;
  instructions: string;
  baseUrl: string;
}

const PROVIDERS: ProviderDef[] = [
  {
    id: "BRASIL_API",
    name: "BrasilAPI",
    category: "CADASTRAL",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "API publica e gratuita. Nao requer chave de API. Utiliza dados abertos do governo brasileiro para consultas de CNPJ, CEP e bancos.",
    baseUrl: "https://brasilapi.com.br/api",
  },
  {
    id: "CNPJA",
    name: "CNPJa",
    category: "CADASTRAL",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "API gratuita para consultas basicas de CNPJ. Acesse cnpja.com para criar uma conta gratuita e obter seu token de acesso.",
    baseUrl: "https://api.cnpja.com",
  },
  {
    id: "DATAJUD",
    name: "DataJud",
    category: "JUDICIAL",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "Base de dados publica do CNJ (Conselho Nacional de Justica). Acesse datajud.cnj.jus.br e cadastre-se para obter a chave de API publica.",
    baseUrl: "https://datajud-wiki.cnj.jus.br/api",
  },
  {
    id: "CVM",
    name: "CVM",
    category: "FINANCEIRO",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "Dados abertos da Comissao de Valores Mobiliarios. Acesso publico sem necessidade de autenticacao para consultas de fundos e participantes do mercado.",
    baseUrl: "https://dados.cvm.gov.br/api",
  },
  {
    id: "BACEN",
    name: "BACEN",
    category: "FINANCEIRO",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "API publica do Banco Central do Brasil. Permite consultas de instituicoes financeiras, taxas e registros publicos. Nao requer autenticacao.",
    baseUrl: "https://olinda.bcb.gov.br/olinda/servico",
  },
  {
    id: "MAPBIOMAS",
    name: "MapBiomas",
    category: "AMBIENTAL",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "Plataforma de monitoramento de uso e cobertura do solo. Acesse plataforma.alerta.mapbiomas.org e solicite acesso a API para alertas de desmatamento.",
    baseUrl: "https://plataforma.alerta.mapbiomas.org/api",
  },
  {
    id: "OPEN_SANCTIONS",
    name: "OpenSanctions",
    category: "COMPLIANCE",
    costPerQuery: 0,
    costCurrency: "BRL",
    isFree: true,
    instructions:
      "Base de dados aberta de sancoes internacionais e PEPs. Oferece plano trial gratuito. Acesse opensanctions.org/api para obter sua chave de API.",
    baseUrl: "https://api.opensanctions.org",
  },
  {
    id: "INFOSIMPLES",
    name: "InfoSimples",
    category: "CADASTRAL",
    costPerQuery: 0.15,
    costCurrency: "BRL",
    isFree: false,
    instructions:
      "Plataforma de consultas cadastrais e documentais. Cadastre-se em infosimples.com/api, adicione creditos e copie o token de API do painel.",
    baseUrl: "https://api.infosimples.com/api/v2",
  },
  {
    id: "ESCAVADOR",
    name: "Escavador",
    category: "JUDICIAL",
    costPerQuery: 0.2,
    costCurrency: "BRL",
    isFree: false,
    instructions:
      "Plataforma de busca juridica e monitoramento processual. Acesse escavador.com, contrate um plano API e obtenha suas credenciais no painel de desenvolvedor.",
    baseUrl: "https://api.escavador.com/api/v2",
  },
  {
    id: "ASSERTIVA",
    name: "Assertiva",
    category: "PATRIMONIAL",
    costPerQuery: 0.25,
    costCurrency: "BRL",
    isFree: false,
    instructions:
      "Solucao de inteligencia de dados. Entre em contato com o comercial da Assertiva (assertivasolucoes.com.br) para contratar o plano API e receber credenciais.",
    baseUrl: "https://api.assertivasolucoes.com.br",
  },
  {
    id: "SERPRO",
    name: "SERPRO",
    category: "CADASTRAL",
    costPerQuery: 0.3,
    costCurrency: "BRL",
    isFree: false,
    instructions:
      "Servico Federal de Processamento de Dados. Acesse servicos.serpro.gov.br, cadastre-se no portal do desenvolvedor e contrate o pacote de consultas desejado.",
    baseUrl: "https://gateway.apiserpro.serpro.gov.br",
  },
  {
    id: "COMPLY_ADVANTAGE",
    name: "ComplyAdvantage",
    category: "COMPLIANCE",
    costPerQuery: 0.25,
    costCurrency: "USD",
    isFree: false,
    instructions:
      "Plataforma global de compliance e AML. Acesse complyadvantage.com, solicite demo comercial e receba credenciais de API apos contratacao. Cobranca em dolar americano.",
    baseUrl: "https://api.complyadvantage.com/v1",
  },
  {
    id: "OPEN_CORPORATES",
    name: "OpenCorporates",
    category: "PATRIMONIAL",
    costPerQuery: 0.1,
    costCurrency: "BRL",
    isFree: false,
    instructions:
      "Maior banco de dados aberto de empresas do mundo. Acesse opencorporates.com/api_accounts para criar conta e obter seu token de API.",
    baseUrl: "https://api.opencorporates.com/v0.4",
  },
];

// ── Provider state type ────────────────────────────────────────
interface ProviderState {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  monthlyBudget: string;
  isActive: boolean;
  isConfigured: boolean;
  monthlyUsage: number;
  monthlySpent: number;
}

// ── Status badge component ─────────────────────────────────────
function StatusBadge({
  isConfigured,
  isFree,
}: {
  isConfigured: boolean;
  isFree: boolean;
}) {
  if (isFree && isConfigured) {
    return (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px]">
        <Check className="size-3" />
        Gratuito
      </Badge>
    );
  }
  if (isFree && !isConfigured) {
    return (
      <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 text-[10px]">
        Gratuito
      </Badge>
    );
  }
  if (isConfigured) {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px]">
        <Check className="size-3" />
        Configurado
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px]">
      Nao configurado
    </Badge>
  );
}

// ── Main page component ────────────────────────────────────────
export default function ApisInvestigacaoPage() {
  const [selectedProvider, setSelectedProvider] = useState<ProviderDef | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Local state for provider configs (simulating loaded data)
  const [providerStates, setProviderStates] = useState<
    Record<string, ProviderState>
  >(() => {
    const initial: Record<string, ProviderState> = {};
    for (const p of PROVIDERS) {
      initial[p.id] = {
        apiKey: "",
        apiSecret: "",
        baseUrl: p.baseUrl,
        monthlyBudget: p.isFree ? "0" : "100",
        isActive: p.isFree,
        isConfigured: false,
        monthlyUsage: 0,
        monthlySpent: 0,
      };
    }
    return initial;
  });

  // Form state for current dialog
  const [formState, setFormState] = useState<ProviderState>({
    apiKey: "",
    apiSecret: "",
    baseUrl: "",
    monthlyBudget: "100",
    isActive: false,
    isConfigured: false,
    monthlyUsage: 0,
    monthlySpent: 0,
  });

  const configureProvider = trpc.investigation.configureProvider.useMutation({
    onSuccess: () => {
      if (selectedProvider) {
        setProviderStates((prev) => ({
          ...prev,
          [selectedProvider.id]: {
            ...formState,
            isConfigured: true,
          },
        }));
      }
      setDialogOpen(false);
    },
  });

  // Computed totals
  const { totalSpentThisMonth, totalBudget, budgetPercentage } = useMemo(() => {
    let spent = 0;
    let budget = 0;
    for (const state of Object.values(providerStates)) {
      spent += state.monthlySpent;
      budget += Number(state.monthlyBudget) || 0;
    }
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    return { totalSpentThisMonth: spent, totalBudget: budget, budgetPercentage: pct };
  }, [providerStates]);

  // Group providers by category
  const groupedProviders = useMemo(() => {
    const groups: Record<ProviderCategory, ProviderDef[]> = {
      CADASTRAL: [],
      JUDICIAL: [],
      PATRIMONIAL: [],
      FINANCEIRO: [],
      COMPLIANCE: [],
      AMBIENTAL: [],
    };
    for (const p of PROVIDERS) {
      groups[p.category].push(p);
    }
    return groups;
  }, []);

  function openConfigDialog(provider: ProviderDef) {
    setSelectedProvider(provider);
    setFormState({ ...providerStates[provider.id] });
    setTestResult(null);
    setTestingConnection(false);
    setDialogOpen(true);
  }

  function handleTestConnection() {
    setTestingConnection(true);
    setTestResult(null);
    // Simulate connection test
    setTimeout(() => {
      setTestingConnection(false);
      if (formState.apiKey || selectedProvider?.isFree) {
        setTestResult({ success: true, message: "Conexao estabelecida com sucesso!" });
      } else {
        setTestResult({
          success: false,
          message: "Falha na conexao. Verifique as credenciais.",
        });
      }
    }, 1500);
  }

  function handleSave() {
    if (!selectedProvider) return;
    configureProvider.mutate({
      provider: selectedProvider.id as any,
      apiKey: formState.apiKey || undefined,
      apiSecret: formState.apiSecret || undefined,
      baseUrl: formState.baseUrl,
      monthlyBudget: Number(formState.monthlyBudget) || 0,
      isActive: formState.isActive,
    });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          APIs de Investigacao
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure os provedores de dados para investigacoes patrimoniais e de
          compliance
        </p>
      </div>

      {/* Cost summary card */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="size-5 text-amber-500" />
              <CardTitle className="text-base">Resumo de Custos</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date().toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Gasto este mes</p>
              <p className="text-2xl font-bold">{brl.format(totalSpentThisMonth)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Orcamento total</p>
              <p className="text-lg font-semibold">{brl.format(totalBudget)}</p>
            </div>
          </div>
          <Progress value={budgetPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {budgetPercentage.toFixed(1)}% do orcamento mensal utilizado
          </p>
        </CardContent>
      </Card>

      {/* Provider cards grouped by category */}
      {(Object.entries(groupedProviders) as [ProviderCategory, ProviderDef[]][]).map(
        ([category, providers]) => {
          if (providers.length === 0) return null;
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={`size-5 ${config.color}`} />
                <h2 className="text-lg font-semibold">{config.label}</h2>
                <Badge variant="secondary" className="text-xs">
                  {providers.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {providers.map((provider) => {
                  const state = providerStates[provider.id];
                  return (
                    <Card
                      key={provider.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700"
                      onClick={() => openConfigDialog(provider)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {provider.name}
                          </CardTitle>
                          <StatusBadge
                            isConfigured={state.isConfigured}
                            isFree={provider.isFree}
                          />
                        </div>
                        <CardDescription className="text-xs">
                          {config.label}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Custo por consulta
                          </span>
                          <span className="font-medium">
                            {provider.isFree
                              ? "Gratuito"
                              : `${provider.costCurrency === "USD" ? "US$" : "R$"} ${provider.costPerQuery.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Uso mensal
                          </span>
                          <span className="font-medium">
                            {state.monthlyUsage} consultas
                          </span>
                        </div>
                        {!provider.isFree && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Gasto no mes
                            </span>
                            <span className="font-medium">
                              {brl.format(state.monthlySpent)}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        }
      )}

      {/* Configuration dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-5 text-amber-500" />
              Configurar {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.isFree
                ? "Provedor gratuito — configure a URL base e ative a integracao."
                : "Insira suas credenciais de API para ativar este provedor."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-5 pr-2">
              {/* Instructions */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <KeyRound className="size-4 shrink-0 mt-0.5 text-amber-500" />
                  <p>{selectedProvider?.instructions}</p>
                </div>
              </div>

              {/* API Key */}
              {!selectedProvider?.isFree && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">Chave de API (API Key)</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Insira sua chave de API..."
                      value={formState.apiKey}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, apiKey: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">
                      Segredo da API (API Secret)
                    </Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      placeholder="Insira o segredo da API (se aplicavel)..."
                      value={formState.apiSecret}
                      onChange={(e) =>
                        setFormState((s) => ({
                          ...s,
                          apiSecret: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              {/* Base URL */}
              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL Base</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.example.com"
                  value={formState.baseUrl}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, baseUrl: e.target.value }))
                  }
                />
              </div>

              {/* Monthly budget */}
              {!selectedProvider?.isFree && (
                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">Orcamento Mensal (R$)</Label>
                  <Input
                    id="monthlyBudget"
                    type="number"
                    min="0"
                    step="10"
                    placeholder="100"
                    value={formState.monthlyBudget}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        monthlyBudget: e.target.value,
                      }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    O sistema bloqueara consultas quando o orcamento mensal for atingido
                  </p>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Integracao Ativa
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Quando ativa, o provedor sera utilizado nas investigacoes
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formState.isActive}
                  onCheckedChange={(checked) =>
                    setFormState((s) => ({ ...s, isActive: checked }))
                  }
                />
              </div>

              {/* Cost info */}
              {selectedProvider && (
                <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">
                    Custo por consulta
                  </span>
                  <span className="font-medium">
                    {selectedProvider.isFree
                      ? "Gratuito"
                      : `${selectedProvider.costCurrency === "USD" ? "US$" : "R$"} ${selectedProvider.costPerQuery.toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Test connection */}
              <Separator />
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="w-full"
                >
                  {testingConnection ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <TestTube2 className="size-4" />
                  )}
                  Testar Conexao
                </Button>

                {testResult && (
                  <div
                    className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
                      testResult.success
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border border-green-200 dark:border-green-800"
                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-800"
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="size-4 shrink-0" />
                    ) : (
                      <X className="size-4 shrink-0" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={configureProvider.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {configureProvider.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
