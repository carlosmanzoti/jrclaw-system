"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Send, Paperclip, X, Plus, ChevronDown } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiationId: string;
  /** Pre-filled creditor email */
  creditorEmail?: string;
  creditorName?: string;
  /** Link a proposal to this email */
  proposalId?: string;
  proposalVersion?: number;
}

export function CRJEmailComposer({
  open,
  onOpenChange,
  negotiationId,
  creditorEmail,
  creditorName,
  proposalId,
  proposalVersion,
}: Props) {
  const [to, setTo] = useState(creditorEmail || "");
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(
    proposalVersion
      ? `Proposta de Acordo — v${proposalVersion}`
      : "Proposta de Acordo — Recuperação Judicial"
  );
  const [body, setBody] = useState(
    getDefaultBody(creditorName, proposalVersion)
  );
  const [bodyType, setBodyType] = useState<"HTML" | "Text">("Text");

  const utils = trpc.useUtils();
  const sendMutation = trpc.crjNeg.emails.send.useMutation({
    onSuccess: () => {
      utils.crjNeg.negotiations.invalidate();
      utils.crjNeg.emails.invalidate();
      onOpenChange(false);
    },
  });

  const handleSend = () => {
    const toAddresses = to
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ email, name: creditorName }));

    const ccAddresses = cc
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    if (toAddresses.length === 0) return;

    sendMutation.mutate({
      negotiation_id: negotiationId,
      to: toAddresses,
      cc: ccAddresses,
      subject,
      body: bodyType === "HTML" ? wrapHtml(body) : body,
      bodyType,
      proposal_id: proposalId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Enviar E-mail ao Credor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* To */}
          <div>
            <Label className="text-xs">Para</Label>
            <div className="flex items-center gap-2">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="email@credor.com"
                className="text-sm"
              />
              {!showCc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => setShowCc(true)}
                >
                  Cc
                </Button>
              )}
            </div>
          </div>

          {/* CC */}
          {showCc && (
            <div>
              <Label className="text-xs">Cc</Label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="email@cc.com (separados por vírgula)"
                className="text-sm"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <Label className="text-xs">Assunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Proposal badge */}
          {proposalId && (
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge variant="outline" className="text-[10px]">
                Proposta v{proposalVersion || "?"} vinculada
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                O status será atualizado para &quot;Enviada&quot;
              </span>
            </div>
          )}

          {/* Body type toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Formato:</Label>
            <Select
              value={bodyType}
              onValueChange={(v) => setBodyType(v as "HTML" | "Text")}
            >
              <SelectTrigger className="h-7 w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Text">Texto</SelectItem>
                <SelectItem value="HTML">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Body */}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!to.trim() || !subject.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                "Enviando..."
              ) : (
                <>
                  <Send className="mr-1 h-3 w-3" />
                  Enviar
                </>
              )}
            </Button>
          </div>

          {sendMutation.isError && (
            <p className="text-xs text-destructive">
              Erro ao enviar: {sendMutation.error.message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultBody(
  creditorName?: string,
  proposalVersion?: number
): string {
  const greeting = creditorName ? `Prezado(a) ${creditorName},` : "Prezado(a),";

  if (proposalVersion) {
    return `${greeting}

Seguem em anexo os termos da Proposta de Acordo v${proposalVersion}, conforme negociação em curso no âmbito da Recuperação Judicial.

Solicitamos a análise e manifestação no prazo de 15 (quinze) dias úteis.

Permanecemos à disposição para esclarecimentos.

Atenciosamente,
Equipe JRCLaw`;
  }

  return `${greeting}

Entramos em contato para tratar sobre a negociação dos créditos no âmbito da Recuperação Judicial.



Atenciosamente,
Equipe JRCLaw`;
}

function wrapHtml(text: string): string {
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<html><body style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${html}</body></html>`;
}
