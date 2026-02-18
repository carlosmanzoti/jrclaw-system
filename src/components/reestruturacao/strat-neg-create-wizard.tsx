"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import {
  STRAT_NEG_PRIORITY_LABELS,
  TKI_PROFILES,
  TKI_PROFILE_LABELS,
  TKI_PROFILE_COLORS,
} from "@/lib/strat-neg-constants";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Target,
  Users,
  Brain,
  Swords,
  FileText,
  Check,
  AlertTriangle,
} from "lucide-react";

// ============================================================
// LOCAL CONSTANTS (not yet in strat-neg-constants)
// ============================================================

const TIPO_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual (Credor Único)",
  COLETIVA_CLASSE: "Coletiva por Classe",
  COLETIVA_COMITE: "Coletiva por Comitê",
  EXTRAJUDICIAL: "Extrajudicial",
};

const CLASSE_LABELS: Record<string, string> = {
  I: "Classe I - Trabalhista",
  II: "Classe II - Garantia Real",
  III: "Classe III - Quirografário",
  IV: "Classe IV - ME/EPP",
};

const IMPORTANCIA_LABELS: Record<number, string> = {
  1: "Indiferente",
  2: "Desejável",
  3: "Importante",
  4: "Muito Importante",
  5: "Essencial",
};

const FLEXIBILIDADE_LABELS: Record<number, string> = {
  1: "Inflexível",
  2: "Pouco Flexível",
  3: "Moderado",
  4: "Flexível",
  5: "Muito Flexível",
};

const BATNA_ALTERNATIVES_DEVEDOR = [
  "Plano de RJ sem acordo individual",
  "Cram down judicial",
  "Novação compulsória via PRJ",
  "Alienação de ativos UPI",
  "Falência (cenário extremo)",
  "Acordo com outros credores para pressionar",
  "Mediação/Conciliação judicial",
  "Pagamento parcial via precatório",
  "Conversão de dívida em participação",
  "Renegociação direta após homologação",
];

const BATNA_ALTERNATIVES_CREDOR = [
  "Habilitação/impugnação de crédito",
  "Ação de execução individual",
  "Pedido de falência",
  "Excussão de garantia real",
  "Cessão de crédito a terceiros",
  "Formação de comitê de credores",
  "Voto contrário ao PRJ",
  "Ação revocatória/pauliana",
  "Denúncia ao MP de fraude",
  "Aguardar inadimplência do plano",
];

const CREATIVE_OPTIONS_TEMPLATES = [
  { id: "haircut", label: "Haircut (desconto no principal)", descricao: "Redução percentual do valor principal do crédito" },
  { id: "carencia", label: "Período de carência", descricao: "Prazo sem pagamento de principal e/ou juros" },
  { id: "alongamento", label: "Alongamento de prazo", descricao: "Extensão do prazo de pagamento" },
  { id: "taxa_reduzida", label: "Redução de taxa de juros", descricao: "Juros abaixo do contratual original" },
  { id: "debt_equity", label: "Conversão dívida-equity", descricao: "Transformação de parte da dívida em participação societária" },
  { id: "dacao_pagamento", label: "Dação em pagamento", descricao: "Entrega de ativo em quitação parcial ou total" },
  { id: "upi", label: "Pagamento via UPI", descricao: "Alienação de unidade produtiva isolada" },
  { id: "condicional", label: "Pagamento condicional (earn-out)", descricao: "Pagamento adicional condicionado a performance futura" },
  { id: "garantia_adicional", label: "Garantia adicional", descricao: "Oferecimento de garantia suplementar" },
  { id: "prioridade_pagamento", label: "Prioridade no pagamento", descricao: "Pagamento antecipado em relação a outros credores" },
  { id: "pagamento_unico", label: "Pagamento único com desconto", descricao: "Liquidação à vista com dedução significativa" },
  { id: "cessao_credito", label: "Cessão de créditos recebíveis", descricao: "Vinculação de recebíveis como fonte de pagamento" },
];

const TKI_PROFILE_DESCRIPTIONS: Record<string, string> = {
  COMPETITIVO: "Busca maximizar ganhos próprios, negocia com firmeza, usa pressão e prazo. Foca em posições, não em interesses.",
  COLABORATIVO: "Busca soluções ganha-ganha, disposto a explorar opções criativas. Valoriza relacionamento e resultado.",
  COMPROMISSO: "Aceita ceder algo para ganhar algo. Busca ponto médio rápido. Pragmático.",
  EVASIVO: "Evita confronto, adia decisões, delega. Pode estar inseguro ou sem autonomia para decidir.",
  ACOMODATIVO: "Prioriza o relacionamento sobre o resultado. Cede facilmente, evita conflito.",
};

const TKI_PROFILE_COUNTER_STRATEGY: Record<string, string> = {
  COMPETITIVO: "Mantenha firmeza, mostre BATNA forte, use dados objetivos. Não faça concessões sem contrapartida. Ancoragem alta.",
  COLABORATIVO: "Explore opções criativas juntos, compartilhe interesses (seletivamente). Construa confiança, mas proteja limites.",
  COMPROMISSO: "Prepare-se para split the difference. Comece com margem. Oferte pacotes, não valores isolados.",
  EVASIVO: "Crie urgência (deadline), facilite a decisão, reduza risco percebido. Identifique o verdadeiro decisor.",
  ACOMODATIVO: "Não abuse da boa vontade (risco de arrependimento/renegociação). Formalize rápido. Oferte segurança no acordo.",
};

const VOSS_NEGOTIATOR_DESCRIPTIONS: Record<string, string> = {
  ANALISTA: "Metódico, orientado a dados, precisa de tempo para decidir. Valoriza precisão e detalhes. Evita emoção. Perguntas detalhadas, e-mails longos.",
  ACOMODADOR: "Sociável, orientado a relacionamento, tempo = relação. Quer ser ouvido e validado. Pode prometer e não cumprir. Otimista.",
  ASSERTIVO: "Direto, orientado a resultado, tempo = dinheiro. Quer ser respeitado. Precisa sentir que ganhou. Comunica de forma curta e firme.",
};

const BLACK_SWAN_STATUSES: Record<string, string> = {
  INVESTIGANDO: "Investigando",
  CONFIRMADO: "Confirmado",
  DESCARTADO: "Descartado",
};

// ============================================================
// TYPES
// ============================================================

interface Interest {
  descricao: string;
  importancia: number;
  flexibilidade: number;
}

interface BatnaData {
  descricao: string;
  alternativa: string;
  valor_estimado: number;
  probabilidade: number;
  tempo_meses: number;
}

interface CreativeOption {
  id: string;
  label: string;
  descricao: string;
  checked: boolean;
}

interface BlackSwan {
  hipotese: string;
  status: string;
  como_descobrir: string;
}

interface Decisor {
  nome: string;
  cargo: string;
  papel: string;
  contato: string;
}

interface VossLabel {
  label: string;
  objetivo: string;
}

interface VossAccusation {
  acusacao: string;
}

interface VossCalibratedQuestion {
  pergunta: string;
  objetivo: string;
}

interface VossOferta {
  oferta: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================
// STEP INDICATOR
// ============================================================

const STEPS = [
  { number: 1, label: "Identificação", icon: Target },
  { number: 2, label: "Harvard", icon: Users },
  { number: 3, label: "Perfil Negociador", icon: Brain },
  { number: 4, label: "Plano Tático", icon: Swords },
  { number: 5, label: "One-Sheet", icon: FileText },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex items-center justify-center size-9 rounded-full border-2 transition-colors ${
                  isCompleted
                    ? "bg-[#C9A961] border-[#C9A961] text-white"
                    : isActive
                      ? "border-[#C9A961] bg-[#C9A961]/10 text-[#C9A961]"
                      : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isActive ? "text-[#C9A961]" : isCompleted ? "text-[#2A2A2A]" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 mt-[-16px] ${
                  isCompleted ? "bg-[#C9A961]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// HELPER: Calculate TKI Profile
// ============================================================

function calculateTkiProfile(assertividade: number, cooperatividade: number): string {
  const highAssert = assertividade >= 6;
  const lowAssert = assertividade <= 4;
  const highCoop = cooperatividade >= 6;
  const lowCoop = cooperatividade <= 4;

  if (highAssert && lowCoop) return "COMPETITIVO";
  if (highAssert && highCoop) return "COLABORATIVO";
  if (lowAssert && lowCoop) return "EVASIVO";
  if (lowAssert && highCoop) return "ACOMODATIVO";
  return "COMPROMISSO";
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function StratNegCreateWizard({ open, onOpenChange }: Props) {
  const [step, setStep] = useState(1);

  // -- Step 1: Identificacao --
  const [tipo, setTipo] = useState("INDIVIDUAL");
  const [jrcId, setJrcId] = useState("");
  const [credorNome, setCredorNome] = useState("");
  const [classeColetiva, setClasseColetiva] = useState("");
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState("MEDIA");
  const [valorCredito, setValorCredito] = useState<number>(0);
  const [responsavelId, setResponsavelId] = useState("");
  const [dataLimite, setDataLimite] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // -- Step 2: Harvard --
  const [nossosInteresses, setNossosInteresses] = useState<Interest[]>([
    { descricao: "", importancia: 3, flexibilidade: 3 },
  ]);
  const [interessesCredor, setInteressesCredor] = useState<Interest[]>([
    { descricao: "", importancia: 3, flexibilidade: 3 },
  ]);
  const [batnaDevedor, setBatnaDevedor] = useState<BatnaData>({
    descricao: "",
    alternativa: "",
    valor_estimado: 0,
    probabilidade: 50,
    tempo_meses: 12,
  });
  const [batnaCredor, setBatnaCredor] = useState<BatnaData>({
    descricao: "",
    alternativa: "",
    valor_estimado: 0,
    probabilidade: 50,
    tempo_meses: 12,
  });
  const [zopaMax, setZopaMax] = useState<number>(0);
  const [zopaMin, setZopaMin] = useState<number>(0);
  const [creativeOptions, setCreativeOptions] = useState<CreativeOption[]>(
    CREATIVE_OPTIONS_TEMPLATES.map((t) => ({ ...t, checked: false }))
  );

  // -- Step 3: Perfil Negociador --
  const [tkiAssertividade, setTkiAssertividade] = useState(5);
  const [tkiCooperatividade, setTkiCooperatividade] = useState(5);
  const [vossTipo, setVossTipo] = useState("ANALISTA");
  const [blackSwans, setBlackSwans] = useState<BlackSwan[]>([
    { hipotese: "", status: "INVESTIGANDO", como_descobrir: "" },
  ]);

  // -- Step 4: Plano Tatico --
  const [missao, setMissao] = useState("");
  const [decisores, setDecisores] = useState<Decisor[]>([
    { nome: "", cargo: "", papel: "DECISOR", contato: "" },
  ]);
  const [orcTempo, setOrcTempo] = useState(5);
  const [orcEnergia, setOrcEnergia] = useState(5);
  const [orcDinheiro, setOrcDinheiro] = useState(5);
  const [orcEmocao, setOrcEmocao] = useState(5);
  const [poderLegitimidadeDev, setPoderLegitimidadeDev] = useState(5);
  const [poderLegitimidadeCre, setPoderLegitimidadeCre] = useState(5);
  const [poderComprometimentoDev, setPoderComprometimentoDev] = useState(5);
  const [poderComprometimentoCre, setPoderComprometimentoCre] = useState(5);
  const [poderConhecimentoDev, setPoderConhecimentoDev] = useState(5);
  const [poderConhecimentoCre, setPoderConhecimentoCre] = useState(5);
  const [poderRiscoDev, setPoderRiscoDev] = useState(5);
  const [poderRiscoCre, setPoderRiscoCre] = useState(5);
  const [poderTempoDev, setPoderTempoDev] = useState(5);
  const [poderTempoCre, setPoderTempoCre] = useState(5);
  const [poderAlternativasDev, setPoderAlternativasDev] = useState(5);
  const [poderAlternativasCre, setPoderAlternativasCre] = useState(5);

  // -- Step 5: One-Sheet (Voss) --
  const [objetivoEspecifico, setObjetivoEspecifico] = useState("");
  const [resumoSituacao, setResumoSituacao] = useState("");
  const [labelsPreparados, setLabelsPreparados] = useState<VossLabel[]>([
    { label: "", objetivo: "" },
  ]);
  const [accusationAudit, setAccusationAudit] = useState<VossAccusation[]>([
    { acusacao: "" },
  ]);
  const [calibratedQuestions, setCalibratedQuestions] = useState<VossCalibratedQuestion[]>([
    { pergunta: "", objetivo: "" },
  ]);
  const [ofertasNaoMonetarias, setOfertasNaoMonetarias] = useState<VossOferta[]>([
    { oferta: "" },
  ]);

  // -- tRPC queries --
  const jrcQuery = trpc.rj.cases.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.stratNeg.negotiations.create.useMutation({
    onSuccess: () => {
      utils.stratNeg.negotiations.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
  });

  // -- Calculated values --
  const tkiPerfil = calculateTkiProfile(tkiAssertividade, tkiCooperatividade);
  const zopaExists = zopaMax > zopaMin && zopaMax > 0;
  const zopaValue = zopaMax - zopaMin;

  const orcamentoScore =
    orcTempo * 1 + orcEnergia * 2 + orcDinheiro * 3 + orcEmocao * 4;

  const poderTotalDev =
    poderLegitimidadeDev +
    poderComprometimentoDev +
    poderConhecimentoDev +
    poderRiscoDev +
    poderTempoDev +
    poderAlternativasDev;
  const poderTotalCre =
    poderLegitimidadeCre +
    poderComprometimentoCre +
    poderConhecimentoCre +
    poderRiscoCre +
    poderTempoCre +
    poderAlternativasCre;

  // -- Auto-generate titulo --
  function generateTitulo() {
    if (tipo === "INDIVIDUAL" && credorNome) {
      return `Negociação - ${credorNome}`;
    }
    if (tipo === "COLETIVA_CLASSE" && classeColetiva) {
      return `Negociação Coletiva - ${CLASSE_LABELS[classeColetiva] || classeColetiva}`;
    }
    if (tipo === "COLETIVA_COMITE") {
      return "Negociação Coletiva - Comitê de Credores";
    }
    if (tipo === "EXTRAJUDICIAL") {
      return "Negociação Extrajudicial";
    }
    return "";
  }

  // -- Reset form --
  function resetForm() {
    setStep(1);
    setTipo("INDIVIDUAL");
    setJrcId("");
    setCredorNome("");
    setClasseColetiva("");
    setTitulo("");
    setPrioridade("MEDIA");
    setValorCredito(0);
    setResponsavelId("");
    setDataLimite("");
    setObservacoes("");
    setNossosInteresses([{ descricao: "", importancia: 3, flexibilidade: 3 }]);
    setInteressesCredor([{ descricao: "", importancia: 3, flexibilidade: 3 }]);
    setBatnaDevedor({ descricao: "", alternativa: "", valor_estimado: 0, probabilidade: 50, tempo_meses: 12 });
    setBatnaCredor({ descricao: "", alternativa: "", valor_estimado: 0, probabilidade: 50, tempo_meses: 12 });
    setZopaMax(0);
    setZopaMin(0);
    setCreativeOptions(CREATIVE_OPTIONS_TEMPLATES.map((t) => ({ ...t, checked: false })));
    setTkiAssertividade(5);
    setTkiCooperatividade(5);
    setVossTipo("ANALISTA");
    setBlackSwans([{ hipotese: "", status: "INVESTIGANDO", como_descobrir: "" }]);
    setMissao("");
    setDecisores([{ nome: "", cargo: "", papel: "DECISOR", contato: "" }]);
    setOrcTempo(5);
    setOrcEnergia(5);
    setOrcDinheiro(5);
    setOrcEmocao(5);
    setPoderLegitimidadeDev(5);
    setPoderLegitimidadeCre(5);
    setPoderComprometimentoDev(5);
    setPoderComprometimentoCre(5);
    setPoderConhecimentoDev(5);
    setPoderConhecimentoCre(5);
    setPoderRiscoDev(5);
    setPoderRiscoCre(5);
    setPoderTempoDev(5);
    setPoderTempoCre(5);
    setPoderAlternativasDev(5);
    setPoderAlternativasCre(5);
    setObjetivoEspecifico("");
    setResumoSituacao("");
    setLabelsPreparados([{ label: "", objetivo: "" }]);
    setAccusationAudit([{ acusacao: "" }]);
    setCalibratedQuestions([{ pergunta: "", objetivo: "" }]);
    setOfertasNaoMonetarias([{ oferta: "" }]);
  }

  // -- Mutation handler --
  function handleCreate() {
    const activeCreativeOptions = creativeOptions
      .filter((o) => o.checked)
      .map((o) => ({ id: o.id, label: o.label, descricao: o.descricao }));

    const fullData = {
      titulo: titulo || generateTitulo() || "Nova Negociação Estratégica",
      tipo: tipo === "COLETIVA_CLASSE" || tipo === "COLETIVA_COMITE" ? "COLETIVA" : tipo === "EXTRAJUDICIAL" ? "BILATERAL" : "BILATERAL",
      jrc_id: jrcId || undefined,
      contraparte_nome: credorNome || undefined,
      contraparte_tipo: tipo === "INDIVIDUAL" ? "PESSOA_JURIDICA" : undefined,
      prioridade,
      valor_credito: valorCredito || 0,
      responsavel_id: responsavelId || undefined,
      data_limite: dataLimite ? new Date(dataLimite) : undefined,
      observacoes: observacoes || undefined,
      zopa_min: zopaMin || undefined,
      zopa_max: zopaMax || undefined,
      batna: batnaDevedor.descricao || undefined,
      descricao: buildDescricao(),
    };

    createMutation.mutate(fullData);
  }

  function buildDescricao(): string {
    const parts: string[] = [];

    if (observacoes) {
      parts.push(`OBSERVACOES: ${observacoes}`);
    }

    // Step 1 metadata
    if (tipo === "COLETIVA_CLASSE" && classeColetiva) {
      parts.push(`CLASSE: ${CLASSE_LABELS[classeColetiva] || classeColetiva}`);
    }

    // Step 2: Harvard
    const nossosInteressesValidos = nossosInteresses.filter((i) => i.descricao.trim());
    if (nossosInteressesValidos.length > 0) {
      parts.push(
        `NOSSOS INTERESSES:\n${nossosInteressesValidos
          .map(
            (i) =>
              `- ${i.descricao} (Importancia: ${IMPORTANCIA_LABELS[i.importancia]}, Flexibilidade: ${FLEXIBILIDADE_LABELS[i.flexibilidade]})`
          )
          .join("\n")}`
      );
    }
    const interessesCredorValidos = interessesCredor.filter((i) => i.descricao.trim());
    if (interessesCredorValidos.length > 0) {
      parts.push(
        `INTERESSES DO CREDOR:\n${interessesCredorValidos
          .map(
            (i) =>
              `- ${i.descricao} (Importancia: ${IMPORTANCIA_LABELS[i.importancia]}, Flexibilidade: ${FLEXIBILIDADE_LABELS[i.flexibilidade]})`
          )
          .join("\n")}`
      );
    }

    if (batnaDevedor.descricao) {
      parts.push(
        `NOSSO BATNA: ${batnaDevedor.descricao} | Alternativa: ${batnaDevedor.alternativa} | Valor estimado: R$ ${batnaDevedor.valor_estimado.toLocaleString("pt-BR")} | Probabilidade: ${batnaDevedor.probabilidade}% | Prazo: ${batnaDevedor.tempo_meses} meses`
      );
    }
    if (batnaCredor.descricao) {
      parts.push(
        `BATNA DO CREDOR: ${batnaCredor.descricao} | Alternativa: ${batnaCredor.alternativa} | Valor estimado: R$ ${batnaCredor.valor_estimado.toLocaleString("pt-BR")} | Probabilidade: ${batnaCredor.probabilidade}% | Prazo: ${batnaCredor.tempo_meses} meses`
      );
    }

    if (zopaMax > 0 || zopaMin > 0) {
      parts.push(
        `ZOPA: Maximo devedor R$ ${zopaMax.toLocaleString("pt-BR")} / Minimo credor R$ ${zopaMin.toLocaleString("pt-BR")} ${zopaExists ? `(ZOPA: R$ ${zopaValue.toLocaleString("pt-BR")})` : "(Sem ZOPA)"}`
      );
    }

    const activeOptions = creativeOptions.filter((o) => o.checked);
    if (activeOptions.length > 0) {
      parts.push(
        `OPCOES CRIATIVAS:\n${activeOptions.map((o) => `- ${o.label}: ${o.descricao}`).join("\n")}`
      );
    }

    // Step 3: Perfil
    parts.push(
      `PERFIL TKI: ${TKI_PROFILE_LABELS[tkiPerfil as keyof typeof TKI_PROFILE_LABELS] || tkiPerfil} (Assertividade: ${tkiAssertividade}/10, Cooperatividade: ${tkiCooperatividade}/10)`
    );
    parts.push(`TIPO VOSS: ${vossTipo}`);

    const blackSwansValidos = blackSwans.filter((b) => b.hipotese.trim());
    if (blackSwansValidos.length > 0) {
      parts.push(
        `BLACK SWANS:\n${blackSwansValidos
          .map((b) => `- ${b.hipotese} [${BLACK_SWAN_STATUSES[b.status]}] - Como descobrir: ${b.como_descobrir}`)
          .join("\n")}`
      );
    }

    // Step 4: Plano Tatico
    if (missao) {
      parts.push(`MISSAO (CAMP): ${missao}`);
    }

    const decisoresValidos = decisores.filter((d) => d.nome.trim());
    if (decisoresValidos.length > 0) {
      parts.push(
        `DECISORES:\n${decisoresValidos.map((d) => `- ${d.nome} (${d.cargo}) [${d.papel}] ${d.contato}`).join("\n")}`
      );
    }

    parts.push(
      `ORCAMENTO 4 FATORES (CAMP): Tempo ${orcTempo}, Energia ${orcEnergia}, Dinheiro ${orcDinheiro}, Emocao ${orcEmocao} (Score: ${orcamentoScore})`
    );

    parts.push(
      `PODER (KARRASS): Devedor ${poderTotalDev} vs Credor ${poderTotalCre} - Vantagem: ${poderTotalDev > poderTotalCre ? "Devedor" : poderTotalDev < poderTotalCre ? "Credor" : "Equilibrado"}`
    );

    // Step 5: One-Sheet
    if (objetivoEspecifico) {
      parts.push(`OBJETIVO ESPECIFICO: ${objetivoEspecifico}`);
    }
    if (resumoSituacao) {
      parts.push(`RESUMO SITUACAO (That's Right): ${resumoSituacao}`);
    }

    const labelsValidos = labelsPreparados.filter((l) => l.label.trim());
    if (labelsValidos.length > 0) {
      parts.push(
        `LABELS PREPARADOS:\n${labelsValidos.map((l) => `- "${l.label}" -> Objetivo: ${l.objetivo}`).join("\n")}`
      );
    }

    const accusationsValidas = accusationAudit.filter((a) => a.acusacao.trim());
    if (accusationsValidas.length > 0) {
      parts.push(
        `ACCUSATION AUDIT:\n${accusationsValidas.map((a) => `- "${a.acusacao}"`).join("\n")}`
      );
    }

    const questionsValidas = calibratedQuestions.filter((q) => q.pergunta.trim());
    if (questionsValidas.length > 0) {
      parts.push(
        `PERGUNTAS CALIBRADAS:\n${questionsValidas.map((q) => `- "${q.pergunta}" -> Objetivo: ${q.objetivo}`).join("\n")}`
      );
    }

    const ofertasValidas = ofertasNaoMonetarias.filter((o) => o.oferta.trim());
    if (ofertasValidas.length > 0) {
      parts.push(
        `OFERTAS NAO MONETARIAS:\n${ofertasValidas.map((o) => `- ${o.oferta}`).join("\n")}`
      );
    }

    return parts.join("\n\n");
  }

  // ============================================================
  // RENDER STEPS
  // ============================================================

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Negociação</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); setTitulo(""); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jrc_id">RJ Vinculada</Label>
            <Select value={jrcId} onValueChange={setJrcId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a RJ" />
              </SelectTrigger>
              <SelectContent>
                {jrcQuery.data?.map((jrc) => (
                  <SelectItem key={jrc.id} value={jrc.id}>
                    {jrc.case_?.numero_processo || "Sem numero"} - {jrc.case_?.cliente?.nome || "N/A"}
                  </SelectItem>
                ))}
                {(!jrcQuery.data || jrcQuery.data.length === 0) && (
                  <SelectItem value="_none" disabled>
                    Nenhuma RJ cadastrada
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {tipo === "INDIVIDUAL" && (
          <div className="space-y-2">
            <Label htmlFor="credor_nome">Credor</Label>
            <Input
              id="credor_nome"
              value={credorNome}
              onChange={(e) => {
                setCredorNome(e.target.value);
                if (!titulo) setTitulo("");
              }}
              placeholder="Nome do credor"
            />
          </div>
        )}

        {tipo === "COLETIVA_CLASSE" && (
          <div className="space-y-2">
            <Label htmlFor="classe">Classe de Credores</Label>
            <Select value={classeColetiva} onValueChange={setClasseColetiva}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a classe" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLASSE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            value={titulo || generateTitulo()}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título da negociação (gerado automaticamente)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prioridade">Prioridade</Label>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STRAT_NEG_PRIORITY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor_credito">Valor do Crédito (R$)</Label>
            <Input
              id="valor_credito"
              type="number"
              value={valorCredito || ""}
              onChange={(e) => setValorCredito(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="responsavel_id">Responsável</Label>
            <Input
              id="responsavel_id"
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_limite">Data Limite</Label>
            <Input
              id="data_limite"
              type="date"
              value={dataLimite}
              onChange={(e) => setDataLimite(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações</Label>
          <Textarea
            id="observacoes"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Notas gerais sobre a negociação..."
            rows={3}
          />
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-6">
        {/* Interesses */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Interesses</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Nossos Interesses */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#C9A961]">Nossos Interesses</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNossosInteresses([
                      ...nossosInteresses,
                      { descricao: "", importancia: 3, flexibilidade: 3 },
                    ])
                  }
                >
                  <Plus className="size-3 mr-1" />
                  Adicionar Interesse
                </Button>
              </div>
              {nossosInteresses.map((interesse, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-center gap-2">
                    <Input
                      value={interesse.descricao}
                      onChange={(e) => {
                        const updated = [...nossosInteresses];
                        updated[idx] = { ...updated[idx], descricao: e.target.value };
                        setNossosInteresses(updated);
                      }}
                      placeholder="Descreva o interesse..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        const updated = nossosInteresses.filter((_, i) => i !== idx);
                        setNossosInteresses(updated.length > 0 ? updated : [{ descricao: "", importancia: 3, flexibilidade: 3 }]);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-500">Importância</Label>
                      <Select
                        value={String(interesse.importancia)}
                        onValueChange={(v) => {
                          const updated = [...nossosInteresses];
                          updated[idx] = { ...updated[idx], importancia: parseInt(v) };
                          setNossosInteresses(updated);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(IMPORTANCIA_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {val} - {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Flexibilidade</Label>
                      <Select
                        value={String(interesse.flexibilidade)}
                        onValueChange={(v) => {
                          const updated = [...nossosInteresses];
                          updated[idx] = { ...updated[idx], flexibilidade: parseInt(v) };
                          setNossosInteresses(updated);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FLEXIBILIDADE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {val} - {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Interesses do Credor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-[#C9A961]">Interesses do Credor</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setInteressesCredor([
                      ...interessesCredor,
                      { descricao: "", importancia: 3, flexibilidade: 3 },
                    ])
                  }
                >
                  <Plus className="size-3 mr-1" />
                  Adicionar Interesse
                </Button>
              </div>
              {interessesCredor.map((interesse, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-2 bg-white">
                  <div className="flex items-center gap-2">
                    <Input
                      value={interesse.descricao}
                      onChange={(e) => {
                        const updated = [...interessesCredor];
                        updated[idx] = { ...updated[idx], descricao: e.target.value };
                        setInteressesCredor(updated);
                      }}
                      placeholder="Descreva o interesse do credor..."
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        const updated = interessesCredor.filter((_, i) => i !== idx);
                        setInteressesCredor(updated.length > 0 ? updated : [{ descricao: "", importancia: 3, flexibilidade: 3 }]);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-500">Importância</Label>
                      <Select
                        value={String(interesse.importancia)}
                        onValueChange={(v) => {
                          const updated = [...interessesCredor];
                          updated[idx] = { ...updated[idx], importancia: parseInt(v) };
                          setInteressesCredor(updated);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(IMPORTANCIA_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {val} - {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-500">Flexibilidade</Label>
                      <Select
                        value={String(interesse.flexibilidade)}
                        onValueChange={(v) => {
                          const updated = [...interessesCredor];
                          updated[idx] = { ...updated[idx], flexibilidade: parseInt(v) };
                          setInteressesCredor(updated);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FLEXIBILIDADE_LABELS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {val} - {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BATNA */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">BATNA (Melhor Alternativa ao Acordo)</h3>
          <div className="grid grid-cols-2 gap-4">
            <Card className="py-4">
              <CardHeader className="pb-2 pt-0">
                <CardTitle className="text-sm text-[#C9A961]">Nosso BATNA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={batnaDevedor.descricao}
                    onChange={(e) => setBatnaDevedor({ ...batnaDevedor, descricao: e.target.value })}
                    placeholder="O que faremos se não houver acordo?"
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Alternativa Principal</Label>
                  <Select
                    value={batnaDevedor.alternativa}
                    onValueChange={(v) => setBatnaDevedor({ ...batnaDevedor, alternativa: v })}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BATNA_ALTERNATIVES_DEVEDOR.map((alt) => (
                        <SelectItem key={alt} value={alt}>
                          {alt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      value={batnaDevedor.valor_estimado || ""}
                      onChange={(e) =>
                        setBatnaDevedor({ ...batnaDevedor, valor_estimado: parseFloat(e.target.value) || 0 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Probabilidade (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={batnaDevedor.probabilidade || ""}
                      onChange={(e) =>
                        setBatnaDevedor({ ...batnaDevedor, probabilidade: parseFloat(e.target.value) || 0 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tempo (meses)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={batnaDevedor.tempo_meses || ""}
                      onChange={(e) =>
                        setBatnaDevedor({ ...batnaDevedor, tempo_meses: parseInt(e.target.value) || 0 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="py-4">
              <CardHeader className="pb-2 pt-0">
                <CardTitle className="text-sm text-[#C9A961]">BATNA do Credor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={batnaCredor.descricao}
                    onChange={(e) => setBatnaCredor({ ...batnaCredor, descricao: e.target.value })}
                    placeholder="O que o credor fará se não houver acordo?"
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Alternativa Principal</Label>
                  <Select
                    value={batnaCredor.alternativa}
                    onValueChange={(v) => setBatnaCredor({ ...batnaCredor, alternativa: v })}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BATNA_ALTERNATIVES_CREDOR.map((alt) => (
                        <SelectItem key={alt} value={alt}>
                          {alt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      value={batnaCredor.valor_estimado || ""}
                      onChange={(e) =>
                        setBatnaCredor({ ...batnaCredor, valor_estimado: parseFloat(e.target.value) || 0 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Probabilidade (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={batnaCredor.probabilidade || ""}
                      onChange={(e) =>
                        setBatnaCredor({ ...batnaCredor, probabilidade: parseFloat(e.target.value) || 0 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Tempo (meses)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={batnaCredor.tempo_meses || ""}
                      onChange={(e) =>
                        setBatnaCredor({ ...batnaCredor, tempo_meses: parseInt(e.target.value) || 0 })
                      }
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ZOPA */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">ZOPA (Zona de Possível Acordo)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Máximo que podemos pagar (R$)</Label>
              <Input
                type="number"
                value={zopaMax || ""}
                onChange={(e) => setZopaMax(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mínimo que credor aceitaria (R$ estimado)</Label>
              <Input
                type="number"
                value={zopaMin || ""}
                onChange={(e) => setZopaMin(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
          </div>
          {(zopaMax > 0 || zopaMin > 0) && (
            <div className="mt-2">
              {zopaExists ? (
                <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 border border-green-200">
                  <Check className="size-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    ZOPA: R$ {zopaValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-green-600">
                    (Margem de negociação existente)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-200">
                  <AlertTriangle className="size-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Sem ZOPA</span>
                  <span className="text-xs text-red-600">
                    (O mínimo do credor excede o máximo do devedor)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Opcoes Criativas */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Opções Criativas</h3>
          <div className="grid grid-cols-2 gap-2">
            {creativeOptions.map((option, idx) => (
              <div
                key={option.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  option.checked ? "border-[#C9A961] bg-[#C9A961]/5" : "border-gray-200 bg-white"
                }`}
              >
                <Switch
                  checked={option.checked}
                  onCheckedChange={(checked) => {
                    const updated = [...creativeOptions];
                    updated[idx] = { ...updated[idx], checked: !!checked };
                    setCreativeOptions(updated);
                  }}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-sm font-medium text-[#2A2A2A]">{option.label}</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">{option.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-6">
        {/* Thomas-Kilmann */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Thomas-Kilmann (Perfil do Credor)</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Assertividade do Credor</Label>
                <span className="text-sm font-semibold text-[#C9A961]">{tkiAssertividade}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={tkiAssertividade}
                onChange={(e) => setTkiAssertividade(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#C9A961]"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Baixa</span>
                <span>Alta</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Cooperatividade do Credor</Label>
                <span className="text-sm font-semibold text-[#C9A961]">{tkiCooperatividade}/10</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={tkiCooperatividade}
                onChange={(e) => setTkiCooperatividade(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#C9A961]"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Baixa</span>
                <span>Alta</span>
              </div>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg border bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Perfil detectado:</span>
              <Badge className={TKI_PROFILE_COLORS[tkiPerfil as keyof typeof TKI_PROFILE_COLORS] || ""}>
                {TKI_PROFILE_LABELS[tkiPerfil as keyof typeof TKI_PROFILE_LABELS] || tkiPerfil}
              </Badge>
            </div>
            <p className="text-xs text-gray-600">
              {TKI_PROFILE_DESCRIPTIONS[tkiPerfil] || ""}
            </p>
            <div className="pt-1 border-t">
              <span className="text-[10px] font-semibold text-[#C9A961] uppercase">Contra-estratégia recomendada:</span>
              <p className="text-xs text-gray-700 mt-1">
                {TKI_PROFILE_COUNTER_STRATEGY[tkiPerfil] || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Tipo Negociador (Voss) */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Tipo Negociador (Chris Voss)</h3>
          <div className="space-y-2">
            <Select value={vossTipo} onValueChange={setVossTipo}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ANALISTA">Analista</SelectItem>
                <SelectItem value="ACOMODADOR">Acomodador</SelectItem>
                <SelectItem value="ASSERTIVO">Assertivo</SelectItem>
              </SelectContent>
            </Select>
            <div className="p-3 rounded-lg border bg-gray-50">
              <p className="text-xs text-gray-700">
                {VOSS_NEGOTIATOR_DESCRIPTIONS[vossTipo] || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Black Swans */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#2A2A2A]">Black Swans (Hipóteses Ocultas)</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setBlackSwans([
                  ...blackSwans,
                  { hipotese: "", status: "INVESTIGANDO", como_descobrir: "" },
                ])
              }
            >
              <Plus className="size-3 mr-1" />
              Adicionar Hipótese
            </Button>
          </div>
          <div className="space-y-3">
            {blackSwans.map((swan, idx) => (
              <Card key={idx} className="py-3">
                <CardContent className="space-y-2 pt-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-gray-500">Hipótese</Label>
                      <Input
                        value={swan.hipotese}
                        onChange={(e) => {
                          const updated = [...blackSwans];
                          updated[idx] = { ...updated[idx], hipotese: e.target.value };
                          setBlackSwans(updated);
                        }}
                        placeholder="O que pode estar oculto nessa negociação?"
                        className="text-sm"
                      />
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-[10px] text-gray-500">Status</Label>
                      <Select
                        value={swan.status}
                        onValueChange={(v) => {
                          const updated = [...blackSwans];
                          updated[idx] = { ...updated[idx], status: v };
                          setBlackSwans(updated);
                        }}
                      >
                        <SelectTrigger className="w-full h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(BLACK_SWAN_STATUSES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = blackSwans.filter((_, i) => i !== idx);
                          setBlackSwans(
                            updated.length > 0
                              ? updated
                              : [{ hipotese: "", status: "INVESTIGANDO", como_descobrir: "" }]
                          );
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-gray-500">Como descobrir</Label>
                    <Input
                      value={swan.como_descobrir}
                      onChange={(e) => {
                        const updated = [...blackSwans];
                        updated[idx] = { ...updated[idx], como_descobrir: e.target.value };
                        setBlackSwans(updated);
                      }}
                      placeholder="Estratégia para confirmar ou descartar..."
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStep4() {
    const poderPairs: Array<{
      label: string;
      devValue: number;
      setDev: (v: number) => void;
      creValue: number;
      setCre: (v: number) => void;
    }> = [
      { label: "Legitimidade", devValue: poderLegitimidadeDev, setDev: setPoderLegitimidadeDev, creValue: poderLegitimidadeCre, setCre: setPoderLegitimidadeCre },
      { label: "Comprometimento", devValue: poderComprometimentoDev, setDev: setPoderComprometimentoDev, creValue: poderComprometimentoCre, setCre: setPoderComprometimentoCre },
      { label: "Conhecimento", devValue: poderConhecimentoDev, setDev: setPoderConhecimentoDev, creValue: poderConhecimentoCre, setCre: setPoderConhecimentoCre },
      { label: "Risco", devValue: poderRiscoDev, setDev: setPoderRiscoDev, creValue: poderRiscoCre, setCre: setPoderRiscoCre },
      { label: "Tempo", devValue: poderTempoDev, setDev: setPoderTempoDev, creValue: poderTempoCre, setCre: setPoderTempoCre },
      { label: "Alternativas", devValue: poderAlternativasDev, setDev: setPoderAlternativasDev, creValue: poderAlternativasCre, setCre: setPoderAlternativasCre },
    ];

    return (
      <div className="space-y-6">
        {/* Missao (Camp) */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Missão (Camp)</h3>
          <Textarea
            value={missao}
            onChange={(e) => setMissao(e.target.value)}
            placeholder="Nossa missão é proporcionar ao [Credor] a oportunidade de [benefício] através de [proposta], preservando [interesse mútuo]."
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Decisores (Camp) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#2A2A2A]">Decisores (CAMP)</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDecisores([...decisores, { nome: "", cargo: "", papel: "DECISOR", contato: "" }])
              }
            >
              <Plus className="size-3 mr-1" />
              Adicionar Decisor
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Nome</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Cargo</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Papel</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Contato</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {decisores.map((decisor, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="px-2 py-1">
                      <Input
                        value={decisor.nome}
                        onChange={(e) => {
                          const updated = [...decisores];
                          updated[idx] = { ...updated[idx], nome: e.target.value };
                          setDecisores(updated);
                        }}
                        placeholder="Nome"
                        className="text-xs h-8 border-0 shadow-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={decisor.cargo}
                        onChange={(e) => {
                          const updated = [...decisores];
                          updated[idx] = { ...updated[idx], cargo: e.target.value };
                          setDecisores(updated);
                        }}
                        placeholder="Cargo"
                        className="text-xs h-8 border-0 shadow-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Select
                        value={decisor.papel}
                        onValueChange={(v) => {
                          const updated = [...decisores];
                          updated[idx] = { ...updated[idx], papel: v };
                          setDecisores(updated);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-xs border-0 shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DECISOR">Decisor</SelectItem>
                          <SelectItem value="INFLUENCIADOR">Influenciador</SelectItem>
                          <SelectItem value="BLOQUEADOR">Bloqueador</SelectItem>
                          <SelectItem value="GATEKEEPER">Gatekeeper</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        value={decisor.contato}
                        onChange={(e) => {
                          const updated = [...decisores];
                          updated[idx] = { ...updated[idx], contato: e.target.value };
                          setDecisores(updated);
                        }}
                        placeholder="E-mail / Telefone"
                        className="text-xs h-8 border-0 shadow-none"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          const updated = decisores.filter((_, i) => i !== idx);
                          setDecisores(
                            updated.length > 0
                              ? updated
                              : [{ nome: "", cargo: "", papel: "DECISOR", contato: "" }]
                          );
                        }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Orcamento 4 Fatores (Camp) */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Orçamento 4 Fatores (CAMP)</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Tempo", value: orcTempo, setter: setOrcTempo, weight: 1 },
              { label: "Energia", value: orcEnergia, setter: setOrcEnergia, weight: 2 },
              { label: "Dinheiro", value: orcDinheiro, setter: setOrcDinheiro, weight: 3 },
              { label: "Emoção", value: orcEmocao, setter: setOrcEmocao, weight: 4 },
            ].map((factor) => (
              <div key={factor.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    {factor.label} <span className="text-gray-400">(peso x{factor.weight})</span>
                  </Label>
                  <span className="text-sm font-semibold text-[#C9A961]">{factor.value}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={factor.value}
                  onChange={(e) => factor.setter(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#C9A961]"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg border bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Investimento total ponderado:</span>
              <span className="text-sm font-bold text-[#2A2A2A]">{orcamentoScore}/100</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              {orcamentoScore <= 30
                ? "Investimento baixo: negociação acessível, sem grande comprometimento de recursos."
                : orcamentoScore <= 60
                  ? "Investimento moderado: exige atenção e recursos significativos do credor."
                  : "Investimento alto: credor está muito investido nesta negociação, pode haver pressão interna para fechar."}
            </p>
          </div>
        </div>

        {/* Poder (Karrass) */}
        <div>
          <h3 className="text-sm font-semibold text-[#2A2A2A] mb-3">Poder (Karrass)</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <span className="text-[10px] font-semibold text-center text-[#C9A961]">Devedor</span>
              <span className="text-[10px] font-semibold text-center text-gray-400">Fator</span>
              <span className="text-[10px] font-semibold text-center text-[#C9A961]">Credor</span>
            </div>
            {poderPairs.map((pair) => (
              <div key={pair.label} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={pair.devValue}
                    onChange={(e) => pair.setDev(parseInt(e.target.value))}
                    className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-[#C9A961]"
                  />
                  <span className="text-xs font-mono w-5 text-right">{pair.devValue}</span>
                </div>
                <span className="text-xs text-gray-500 w-28 text-center">{pair.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono w-5">{pair.creValue}</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={pair.creValue}
                    onChange={(e) => pair.setCre(parseInt(e.target.value))}
                    className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-[#C9A961]"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg border bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <span className="text-gray-500">Devedor:</span>{" "}
                <span className="font-bold text-[#2A2A2A]">{poderTotalDev}/60</span>
              </div>
              <div className="text-sm font-bold">
                {poderTotalDev > poderTotalCre ? (
                  <span className="text-green-600">Vantagem: Devedor</span>
                ) : poderTotalDev < poderTotalCre ? (
                  <span className="text-red-600">Vantagem: Credor</span>
                ) : (
                  <span className="text-blue-600">Equilibrado</span>
                )}
              </div>
              <div className="text-xs">
                <span className="text-gray-500">Credor:</span>{" "}
                <span className="font-bold text-[#2A2A2A]">{poderTotalCre}/60</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStep5() {
    return (
      <div className="space-y-6">
        {/* Objetivo Especifico */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#2A2A2A]">Objetivo Específico</Label>
          <Input
            value={objetivoEspecifico}
            onChange={(e) => setObjetivoEspecifico(e.target.value)}
            placeholder="Ex: Acordo com BB: R$ 25M, 10 anos, 6% a.a."
            className="text-sm"
          />
        </div>

        {/* Resumo Situacao */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-[#2A2A2A]">
            Resumo da Situação <span className="text-xs font-normal text-gray-400">(para provocar &quot;That&apos;s Right&quot;)</span>
          </Label>
          <Textarea
            value={resumoSituacao}
            onChange={(e) => setResumoSituacao(e.target.value)}
            placeholder="Resuma a situação do credor de forma que ele diria 'Isso mesmo!' ao ouvir..."
            rows={3}
            className="text-sm"
          />
        </div>

        {/* Labels Preparados */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold text-[#2A2A2A]">Labels Preparados</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLabelsPreparados([...labelsPreparados, { label: "", objetivo: "" }])
              }
            >
              <Plus className="size-3 mr-1" />
              Adicionar Label
            </Button>
          </div>
          <div className="space-y-2">
            {labelsPreparados.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...labelsPreparados];
                      updated[idx] = { ...updated[idx], label: e.target.value };
                      setLabelsPreparados(updated);
                    }}
                    placeholder="Parece que..."
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={item.objetivo}
                    onChange={(e) => {
                      const updated = [...labelsPreparados];
                      updated[idx] = { ...updated[idx], objetivo: e.target.value };
                      setLabelsPreparados(updated);
                    }}
                    placeholder="Objetivo deste label..."
                    className="text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const updated = labelsPreparados.filter((_, i) => i !== idx);
                    setLabelsPreparados(updated.length > 0 ? updated : [{ label: "", objetivo: "" }]);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Accusation Audit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold text-[#2A2A2A]">Accusation Audit</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setAccusationAudit([...accusationAudit, { acusacao: "" }])
              }
            >
              <Plus className="size-3 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {accusationAudit.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={item.acusacao}
                    onChange={(e) => {
                      const updated = [...accusationAudit];
                      updated[idx] = { acusacao: e.target.value };
                      setAccusationAudit(updated);
                    }}
                    placeholder="Voce provavelmente acha que..."
                    className="text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const updated = accusationAudit.filter((_, i) => i !== idx);
                    setAccusationAudit(updated.length > 0 ? updated : [{ acusacao: "" }]);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Calibrated Questions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold text-[#2A2A2A]">Perguntas Calibradas</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCalibratedQuestions([...calibratedQuestions, { pergunta: "", objetivo: "" }])
              }
            >
              <Plus className="size-3 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {calibratedQuestions.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={item.pergunta}
                    onChange={(e) => {
                      const updated = [...calibratedQuestions];
                      updated[idx] = { ...updated[idx], pergunta: e.target.value };
                      setCalibratedQuestions(updated);
                    }}
                    placeholder="Como podemos..."
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={item.objetivo}
                    onChange={(e) => {
                      const updated = [...calibratedQuestions];
                      updated[idx] = { ...updated[idx], objetivo: e.target.value };
                      setCalibratedQuestions(updated);
                    }}
                    placeholder="Objetivo desta pergunta..."
                    className="text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const updated = calibratedQuestions.filter((_, i) => i !== idx);
                    setCalibratedQuestions(updated.length > 0 ? updated : [{ pergunta: "", objetivo: "" }]);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Ofertas Nao Monetarias */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold text-[#2A2A2A]">Ofertas Não Monetárias</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setOfertasNaoMonetarias([...ofertasNaoMonetarias, { oferta: "" }])
              }
            >
              <Plus className="size-3 mr-1" />
              Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {ofertasNaoMonetarias.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    value={item.oferta}
                    onChange={(e) => {
                      const updated = [...ofertasNaoMonetarias];
                      updated[idx] = { oferta: e.target.value };
                      setOfertasNaoMonetarias(updated);
                    }}
                    placeholder="Descreva a oferta não monetária..."
                    className="text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const updated = ofertasNaoMonetarias.filter((_, i) => i !== idx);
                    setOfertasNaoMonetarias(updated.length > 0 ? updated : [{ oferta: "" }]);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-bold text-[#2A2A2A]">
            Nova Negociação Estratégica
          </DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        <div className="flex-1 overflow-y-auto pr-1 min-h-0">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Voltar
                </Button>
              )}
              {step < 5 && (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="bg-[#C9A961] hover:bg-[#B8944E] text-white"
                >
                  Próximo
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              )}
              {step === 5 && (
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="bg-[#C9A961] hover:bg-[#B8944E] text-white"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Negociação"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
