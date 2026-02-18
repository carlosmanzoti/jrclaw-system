"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  buildTemplateContext,
  resolveTemplate,
  DEFAULT_TEMPLATES,
  PLACEHOLDER_DESCRIPTIONS,
  type CRJTemplateContext,
} from "@/lib/crj-template-engine";
import { CRJ_TYPE_LABELS } from "@/lib/crj-constants";
import { FileText, Download, Eye, Wand2, Copy, Check } from "lucide-react";

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  ACORDO_SIMPLES: "Acordo Simples",
  CREDOR_PARCEIRO_ROTATIVO: "Credor Parceiro + Rotativo",
  CESSAO_CREDITOS: "Cessão de Créditos",
  SUBCLASSE_MODALIDADES: "Subclasse com Modalidades",
  CUSTOMIZADO: "Customizado",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiationId: string;
}

export function CRJProposalGenerator({
  open,
  onOpenChange,
  negotiationId,
}: Props) {
  const [templateType, setTemplateType] = useState("ACORDO_SIMPLES");
  const [editedContent, setEditedContent] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const { data: neg } = trpc.crjNeg.negotiations.getById.useQuery(
    { id: negotiationId },
    { enabled: open }
  );

  const { data: savedTemplates } = trpc.crjNeg.templates.list.useQuery(
    undefined,
    { enabled: open }
  );

  const utils = trpc.useUtils();
  const createProposal = trpc.crjNeg.proposals.create.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
      onOpenChange(false);
    },
  });

  // Build context from negotiation data
  const context: CRJTemplateContext | null = useMemo(() => {
    if (!neg) return null;
    return buildTemplateContext({
      negotiation: neg as unknown as Record<string, unknown>,
      creditor: neg.creditor as unknown as Record<string, unknown>,
      jrc: neg.jrc as unknown as Record<string, unknown>,
      assignee: neg.assigned_to as unknown as Record<string, unknown>,
    });
  }, [neg]);

  // Resolve template when type changes
  const resolvedContent = useMemo(() => {
    if (!context) return "";
    // Check if there's a saved template of this type
    const saved = savedTemplates?.find(
      (t: { type: string }) => t.type === templateType
    );
    const rawTemplate = saved
      ? String(saved.template_path) // For saved templates, template_path contains the content
      : DEFAULT_TEMPLATES[templateType] || DEFAULT_TEMPLATES.CUSTOMIZADO;
    return resolveTemplate(rawTemplate, context);
  }, [context, templateType, savedTemplates]);

  // Initialize edited content when resolved content changes
  const handleTemplateChange = useCallback(
    (type: string) => {
      setTemplateType(type);
      if (!context) return;
      const saved = savedTemplates?.find(
        (t: { type: string }) => t.type === type
      );
      const rawTemplate = saved
        ? String(saved.template_path)
        : DEFAULT_TEMPLATES[type] || DEFAULT_TEMPLATES.CUSTOMIZADO;
      setEditedContent(resolveTemplate(rawTemplate, context));
    },
    [context, savedTemplates]
  );

  // Auto-fill on first open
  const initContent = useCallback(() => {
    if (resolvedContent && !editedContent) {
      setEditedContent(resolvedContent);
    }
  }, [resolvedContent, editedContent]);

  // Call initContent on load
  if (open && resolvedContent && !editedContent) {
    initContent();
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([editedContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${neg?.creditor?.nome || "credor"}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePDF = async () => {
    if (!context || !neg) return;
    setGenerating(true);
    try {
      // Dynamic import to avoid SSR issues
      const { pdf } = await import("@react-pdf/renderer");
      const { createElement } = await import("react");
      const { CRJProposalPDFDocument } = await import(
        "@/lib/pdf/crj-proposal-pdf"
      );

      const pdfData = {
        title: `Proposta — ${neg.title}`,
        content: editedContent,
        isDraft: true,
        metadata: {
          process_number: context.process_number,
          client_name: context.client_name,
          creditor_name: context.creditor_name,
          creditor_cpf_cnpj: context.creditor_cpf_cnpj,
          creditor_class: context.creditor_class,
          credit_amount: context.credit_amount,
          proposed_amount: context.proposed_amount,
          discount_percentage: context.discount_percentage,
          installments: context.installments,
          date: context.current_date_extenso,
          assignee_name: context.assignee_name,
          assignee_oab: context.assignee_oab,
        },
      };

      const doc = createElement(CRJProposalPDFDocument, { data: pdfData });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(doc as any).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proposta-${neg.creditor?.nome || "credor"}-v${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveProposal = () => {
    createProposal.mutate({
      negotiation_id: negotiationId,
      template_type: templateType,
      data: {
        content: editedContent,
        template_type: templateType,
        context: context || {},
      } as Record<string, unknown>,
    });
  };

  if (!neg) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Gerar Proposta — {neg.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Template selection */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs">Modelo de documento</Label>
              <Select value={templateType} onValueChange={handleTemplateChange}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1 pt-4">
              <Badge variant="outline" className="text-[10px]">
                {neg.creditor?.nome}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {CRJ_TYPE_LABELS[neg.type] || neg.type}
              </Badge>
            </div>
          </div>

          {/* Tabs: Edit / Preview / Placeholders */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="h-8">
              <TabsTrigger value="edit" className="text-xs">
                <FileText className="mr-1 h-3 w-3" />
                Editar
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                <Eye className="mr-1 h-3 w-3" />
                Pré-visualizar
              </TabsTrigger>
              <TabsTrigger value="placeholders" className="text-xs">
                Variáveis
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="edit" className="m-0 h-full">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="h-[400px] resize-none font-mono text-xs"
                />
              </TabsContent>

              <TabsContent value="preview" className="m-0 h-full">
                <div className="h-[400px] overflow-y-auto rounded border bg-white p-6">
                  <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                    {editedContent}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="placeholders" className="m-0 h-full">
                <div className="h-[400px] overflow-y-auto rounded border p-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Use {"{{variavel}}"} no texto para inserir dados automaticamente.
                    Clique para copiar.
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(PLACEHOLDER_DESCRIPTIONS).map(
                      ([key, desc]) => (
                        <button
                          key={key}
                          className="flex items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-muted"
                          onClick={() => {
                            navigator.clipboard.writeText(`{{${key}}}`);
                          }}
                        >
                          <span className="font-mono text-primary">
                            {`{{${key}}}`}
                          </span>
                          <span className="ml-2 truncate text-muted-foreground">
                            {desc}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                {copied ? "Copiado!" : "Copiar Texto"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleDownloadTxt}
              >
                <Download className="mr-1 h-3 w-3" />
                Download .txt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={handleGeneratePDF}
                disabled={generating}
              >
                <FileText className="mr-1 h-3 w-3" />
                {generating ? "Gerando..." : "Gerar PDF"}
              </Button>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleSaveProposal}
              disabled={createProposal.isPending}
            >
              {createProposal.isPending
                ? "Salvando..."
                : "Salvar como Proposta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
