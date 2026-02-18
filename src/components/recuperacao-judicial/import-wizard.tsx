"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Sparkles,
  Zap,
  ArrowRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
}

// ---------------------------------------------------------------------------
// Template download helper — generates a multi-sheet .xlsx with example data,
// instruction notes, and an extraconcursais sheet.
// ---------------------------------------------------------------------------
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // ---- Sheet 1: Credores ----
  const credoresHeader = [
    "nome",
    "cpf_cnpj",
    "classe",
    "natureza",
    "valor_original",
    "valor_atualizado",
    "tipo_garantia",
    "valor_garantia",
    "observacoes",
  ];
  const credoresData = [
    credoresHeader,
    [
      "Banco do Brasil S.A.",
      "00.000.000/0001-91",
      "Classe II - Garantia Real",
      "Cédula de Crédito Bancário com Alienação Fiduciária",
      40000000.0,
      42500000.0,
      "Alienação Fiduciária de Imóvel Rural",
      35000000.0,
      "Matrícula 12345 CRI Maringá",
    ],
    [
      "José da Silva",
      "123.456.789-00",
      "Classe I - Trabalhista",
      "Verbas Rescisórias",
      85000.0,
      92000.0,
      "",
      "",
      "FGTS + multa 40%",
    ],
    [
      "Fornecedora Agro Ltda",
      "12.345.678/0001-00",
      "Classe III - Quirografário",
      "Fornecimento de insumos",
      500000.0,
      535000.0,
      "",
      "",
      "NFs 1234, 1235, 1236",
    ],
  ];

  const wsCredores = XLSX.utils.aoa_to_sheet(credoresData);

  // Column widths
  wsCredores["!cols"] = [
    { wch: 30 }, // nome
    { wch: 22 }, // cpf_cnpj
    { wch: 30 }, // classe
    { wch: 45 }, // natureza
    { wch: 18 }, // valor_original
    { wch: 18 }, // valor_atualizado
    { wch: 38 }, // tipo_garantia
    { wch: 18 }, // valor_garantia
    { wch: 35 }, // observacoes
  ];

  // Header styling — dark fill with white bold text
  const headerStyle = {
    fill: { fgColor: { rgb: "1F2937" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    alignment: { horizontal: "center" as const },
  };

  credoresHeader.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (wsCredores[cellRef]) {
      wsCredores[cellRef].s = headerStyle;
    }
  });

  XLSX.utils.book_append_sheet(wb, wsCredores, "Credores");

  // ---- Sheet 2: Instruções ----
  const instrucoesData = [
    ["Instruções para preenchimento da planilha de credores"],
    [""],
    ["1. Preencha a aba 'Credores' com os dados de cada credor"],
    [
      "2. A coluna 'classe' aceita: Classe I - Trabalhista, Classe II - Garantia Real, Classe III - Quirografário, Classe IV - ME/EPP",
    ],
    [
      "3. Valores monetários podem estar no formato brasileiro (1.234.567,89) ou americano (1234567.89)",
    ],
    ["4. CPF/CNPJ pode estar com ou sem formatação"],
    ["5. A coluna 'tipo_garantia' é importante para credores Classe II"],
    [
      "6. O sistema aceita variações nos nomes das colunas e normaliza automaticamente",
    ],
    [
      "7. Se preferir, use a Importação com IA que aceita planilhas em QUALQUER formato",
    ],
  ];

  const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoesData);
  wsInstrucoes["!cols"] = [{ wch: 90 }];

  // Style title row
  const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (wsInstrucoes[titleRef]) {
    wsInstrucoes[titleRef].s = {
      font: { bold: true, sz: 14, color: { rgb: "1F2937" } },
    };
  }

  XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instruções");

  // ---- Sheet 3: Extraconcursais ----
  const extraHeader = [
    "nome",
    "cpf_cnpj",
    "tipo_garantia",
    "descricao_garantia",
    "valor_total",
    "valor_garantia",
    "saldo_devedor",
    "matricula_registro",
    "situacao_bem",
    "essencial_atividade",
    "observacoes",
  ];
  const wsExtra = XLSX.utils.aoa_to_sheet([extraHeader]);
  wsExtra["!cols"] = [
    { wch: 30 }, // nome
    { wch: 22 }, // cpf_cnpj
    { wch: 30 }, // tipo_garantia
    { wch: 40 }, // descricao_garantia
    { wch: 18 }, // valor_total
    { wch: 18 }, // valor_garantia
    { wch: 18 }, // saldo_devedor
    { wch: 25 }, // matricula_registro
    { wch: 20 }, // situacao_bem
    { wch: 20 }, // essencial_atividade
    { wch: 35 }, // observacoes
  ];

  extraHeader.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (wsExtra[cellRef]) {
      wsExtra[cellRef].s = headerStyle;
    }
  });

  XLSX.utils.book_append_sheet(wb, wsExtra, "Extraconcursais");

  // Write and trigger download
  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo_importacao_credores_rj.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ImportWizard({ open, onOpenChange, jrcId }: ImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"csv" | "excel">("excel");
  const [result, setResult] = useState<{
    imported: number;
    errors: Array<{
      row: number;
      field: string;
      message: string;
      severity: string;
    }>;
    total: number;
  } | null>(null);

  const utils = trpc.useUtils();

  const importMutation = trpc.rj.creditors.import.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setStep(4);
      utils.rj.creditors.invalidate();
      utils.rj.cases.invalidate();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const ext = f.name.split(".").pop()?.toLowerCase();
      setFormat(ext === "csv" ? "csv" : "excel");
      setStep(2);
    }
  };

  const handleImportRapida = useCallback(async () => {
    if (!file) return;
    setStep(3);
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    importMutation.mutate({ jrc_id: jrcId, data: base64, format });
  }, [file, jrcId, format, importMutation]);

  const handleImportIA = useCallback(() => {
    onOpenChange(false);
    router.push(`/importar?entityType=RJ_CREDITOR`);
  }, [router, onOpenChange]);

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  const stepLabels = ["Upload", "Confirmar", "Processando", "Resultado"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Credores</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {s}
              </div>
              <span
                className={step === s ? "font-medium text-foreground" : ""}
              >
                {stepLabels[s - 1]}
              </span>
              {s < 4 && <div className="mx-1 h-px w-4 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Arraste o arquivo ou clique para selecionar
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Formatos aceitos: .xlsx, .xls, .csv
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="mt-3 text-sm"
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium">Colunas esperadas:</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                nome, cpf_cnpj, classe, natureza, valor_original,
                valor_atualizado, tipo_garantia, valor_garantia, observacoes
              </p>
              <Button
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-xs"
                onClick={downloadTemplate}
              >
                <Download className="mr-1 h-3 w-3" /> Baixar planilha modelo
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm — two import options */}
        {step === 2 && file && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB — Formato:{" "}
                  {format.toUpperCase()}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Escolha como deseja processar o arquivo:
            </p>

            <div className="grid gap-3">
              {/* Quick import */}
              <button
                type="button"
                onClick={handleImportRapida}
                className="group flex items-start gap-3 rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    Importação Rápida
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                    Processa direto com as colunas padrao. Ideal para planilhas
                    no formato do modelo.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* AI import */}
              <button
                type="button"
                onClick={handleImportIA}
                className="group flex items-start gap-3 rounded-lg border-2 border-violet-200 bg-violet-50/50 p-4 text-left transition-colors hover:border-violet-400 hover:bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30 dark:hover:border-violet-700 dark:hover:bg-violet-950/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                    Importação com IA
                  </p>
                  <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">
                    Aceita planilhas em qualquer formato. A IA mapeia
                    automaticamente as colunas e valida os dados.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-violet-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm">Processando arquivo...</p>
            <Progress value={50} className="mt-3 w-48" />
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold">Importação concluída</p>
                <p className="text-xs text-muted-foreground">
                  {result.imported} de {result.total} credores importados
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-2 py-1 text-left">Linha</th>
                      <th className="px-2 py-1 text-left">Campo</th>
                      <th className="px-2 py-1 text-left">Problema</th>
                      <th className="px-2 py-1">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{e.row}</td>
                        <td className="px-2 py-1">{e.field}</td>
                        <td className="px-2 py-1">{e.message}</td>
                        <td className="px-2 py-1 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              e.severity === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {e.severity === "error" ? "Erro" : "Aviso"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}
          {step === 2 && (
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setFile(null);
              }}
            >
              Voltar
            </Button>
          )}
          {step === 4 && <Button onClick={handleClose}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
