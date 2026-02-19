"use client";

import { useState } from "react";
import {
  FileText,
  Sparkles,
  Download,
  Save,
  Loader2,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

// ── Report types ───────────────────────────────────────────────
const REPORT_TYPES = [
  {
    value: "DOSSIE_COMPLETO",
    label: "Dossie Patrimonial Completo",
    description: "Consolidacao de todos os ativos e patrimonio rastreado",
    includes: ["Imoveis", "Veiculos", "Participacoes societarias", "Aplicacoes financeiras", "Bens moveis"],
  },
  {
    value: "RESUMO_PATRIMONIAL",
    label: "Resumo Patrimonial Executivo",
    description: "Sumario gerencial para tomada de decisao rapida",
    includes: ["Resumo patrimonial", "Riscos principais", "Recomendacoes estrategicas"],
  },
  {
    value: "RELATORIO_BENS",
    label: "Relatorio de Bens e Dividas",
    description: "Panorama completo de bens e endividamento do investigado",
    includes: ["Divida ativa", "Protestos", "Acoes de execucao", "Pendencias financeiras"],
  },
  {
    value: "RELATORIO_PROCESSOS",
    label: "Relatorio de Processos Judiciais",
    description: "Todos os processos encontrados e analise de risco",
    includes: ["Processos ativos", "Processos passivos", "Execucoes", "Valor envolvido"],
  },
  {
    value: "RELATORIO_SOCIETARIO",
    label: "Relatorio de Rede Societaria",
    description: "Mapeamento completo da estrutura corporativa",
    includes: ["Empresas vinculadas", "Socios", "Administradores", "Participacoes cruzadas"],
  },
  {
    value: "RELATORIO_COMPLIANCE",
    label: "Analise de Risco e Compliance",
    description: "Score de risco, sancoes e alertas regulatorios",
    includes: ["Score de risco", "PEP", "Sancoes internacionais", "Alertas de compliance"],
  },
  {
    value: "PETICAO_MEDIDA_CONSTRITIVA",
    label: "Estrategia de Constricao Patrimonial",
    description: "Recomendacoes de penhora e bloqueio de bens",
    includes: ["Bens penhoraveis", "Ordem de prioridade", "Metodo de constricao", "Prazos estimados"],
  },
  {
    value: "LAUDO_AVALIACAO",
    label: "Laudo de Avaliacao",
    description: "Imoveis rurais, CAR, uso do solo e alertas ambientais",
    includes: ["Imoveis rurais", "Codigo CAR", "Uso do solo", "Alertas de desmatamento"],
  },
] as const;

type ReportTypeValue = (typeof REPORT_TYPES)[number]["value"];

// ── Main component ─────────────────────────────────────────────
interface ReportGeneratorDialogProps {
  investigationId: string;
  targetName: string;
  trigger?: React.ReactNode;
}

export function ReportGeneratorDialog({
  investigationId,
  targetName,
  trigger,
}: ReportGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportTypeValue | "">("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const generateReport = trpc.investigation.generateReport.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
    },
  });

  const selectedReportConfig = REPORT_TYPES.find(
    (r) => r.value === selectedType
  );

  function handleGenerate() {
    if (!selectedType) return;
    setGeneratedContent(null);
    generateReport.mutate({
      investigationId,
      reportType: selectedType,
    });
  }

  function handleSave() {
    // Placeholder for save logic — would call another mutation
    console.log("Saving report:", { investigationId, selectedType, generatedContent });
    setOpen(false);
    resetState();
  }

  function resetState() {
    setSelectedType("");
    setGeneratedContent(null);
    generateReport.reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <FileText className="size-4" />
            Gerar Relatorio
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Gerar Relatorio de Investigacao</DialogTitle>
          <DialogDescription>
            Alvo: <span className="font-medium text-foreground">{targetName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Report type selector */}
          <div className="space-y-2">
            <Label>Tipo de Relatorio</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v as ReportTypeValue);
                setGeneratedContent(null);
                generateReport.reset();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo de relatorio..." />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview section — what data will be included */}
          {selectedReportConfig && !generatedContent && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">
                {selectedReportConfig.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedReportConfig.description}
              </p>
              <div className="pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Dados incluidos no relatorio:
                </p>
                <div className="space-y-1">
                  {selectedReportConfig.includes.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <ChevronRight className="size-3 text-amber-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Generation loading state */}
          {generateReport.isPending && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="size-8 text-amber-500 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Gerando relatorio com IA...
              </p>
              <p className="text-xs text-muted-foreground">
                Isso pode levar alguns segundos
              </p>
            </div>
          )}

          {/* Error state */}
          {generateReport.isError && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-4 text-sm text-destructive">
              Erro ao gerar relatorio: {generateReport.error.message}
            </div>
          )}

          {/* Generated content preview */}
          {generatedContent && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Relatorio gerado com sucesso
                </span>
              </div>
              <ScrollArea className="h-[300px] rounded-lg border bg-muted/20 p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {generatedContent}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {!generatedContent ? (
            <Button
              onClick={handleGenerate}
              disabled={!selectedType || generateReport.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {generateReport.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Gerar com IA
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled title="Em breve">
                <Download className="size-4" />
                Baixar PDF
              </Button>
              <Button
                onClick={handleSave}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Save className="size-4" />
                Salvar
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
