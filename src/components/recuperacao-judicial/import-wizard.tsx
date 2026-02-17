"use client";

import { useState, useCallback } from "react";
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
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jrcId: string;
}

export function ImportWizard({ open, onOpenChange, jrcId }: ImportWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"csv" | "excel">("excel");
  const [result, setResult] = useState<{ imported: number; errors: Array<{ row: number; field: string; message: string; severity: string }>; total: number } | null>(null);

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

  const handleImport = useCallback(async () => {
    if (!file) return;
    setStep(3);
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    importMutation.mutate({ jrc_id: jrcId, data: base64, format });
  }, [file, jrcId, format, importMutation]);

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Credores</DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {s}
              </div>
              <span className={step === s ? "font-medium text-foreground" : ""}>
                {s === 1 ? "Upload" : s === 2 ? "Confirmar" : s === 3 ? "Processando" : "Resultado"}
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
              <p className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</p>
              <p className="mt-1 text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls, .csv</p>
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
                nome, cpf_cnpj, classe, natureza, valor_original, valor_atualizado, tipo_garantia, valor_garantia, observacoes
              </p>
              <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs">
                <Download className="mr-1 h-3 w-3" /> Baixar planilha modelo
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && file && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileSpreadsheet className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB — Formato: {format.toUpperCase()}
                </p>
              </div>
            </div>
            <p className="text-sm">
              O arquivo será processado e os dados validados antes da importação.
              Credores com erros serão ignorados.
            </p>
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
                          <Badge variant="outline" className={`text-[10px] ${
                            e.severity === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                          }`}>
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
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => { setStep(1); setFile(null); }}>Voltar</Button>
              <Button onClick={handleImport}>Importar</Button>
            </>
          )}
          {step === 4 && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
