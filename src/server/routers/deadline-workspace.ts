import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import {
  onDocumentUploaded,
  onWorkspaceCreated,
} from "@/lib/ai/workspace-reactive-engine";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKSPACE_PHASES = ["RASCUNHO", "REVISAO", "APROVACAO", "PROTOCOLO", "CONCLUIDO"] as const;

const CHECKLIST_TEMPLATES: Record<string, { category: string; title: string; blocks_protocol: boolean; is_required: boolean }[]> = {
  CONTESTACAO: [
    { category: "DOCUMENTOS", title: "Procuração ad judicia anexada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Documentos comprobatórios anexados", blocks_protocol: false, is_required: false },
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Qualificação completa do réu", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Endereçamento correto (vara/juízo)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Número do processo informado", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Preliminares arguidas (se cabíveis)", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Impugnação específica dos fatos", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Fundamentação jurídica adequada", blocks_protocol: true, is_required: true },
    { category: "PEDIDOS", title: "Pedido de improcedência formulado", blocks_protocol: true, is_required: true },
    { category: "PEDIDOS", title: "Pedido de provas especificado", blocks_protocol: false, is_required: false },
    { category: "ASSINATURAS", title: "Assinatura do advogado com OAB", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo antes do protocolo", blocks_protocol: true, is_required: true },
  ],
  RECURSO_ESPECIAL: [
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Comprovante de preparo anexado", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Cópia do acórdão recorrido", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade verificada", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Preparo (custas + porte de remessa)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Prequestionamento demonstrado", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Violação de lei federal indicada (art. 105, III, a)", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Divergência jurisprudencial (se alínea c)", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Cotejo analítico realizado", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de provimento formulado", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura do advogado com OAB", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo de 15 dias úteis", blocks_protocol: true, is_required: true },
  ],
  AGRAVO_INSTRUMENTO: [
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Cópia da decisão agravada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Certidão de intimação", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Procuração e documentos essenciais", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Comprovante de preparo", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Hipótese de cabimento verificada (art. 1.015 CPC)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (10 dias úteis)", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Demonstração do cabimento", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Pedido de tutela recursal (se cabível)", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de reforma da decisão", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Informar juízo a quo em 3 dias (art. 1.018)", blocks_protocol: false, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
  ],
  IMPUGNACAO_CUMPRIMENTO: [
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Planilha de cálculos própria", blocks_protocol: false, is_required: false },
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (15 dias úteis)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Garantia do juízo (se necessária)", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Hipóteses do art. 525 CPC verificadas", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Excesso de execução demonstrado com planilha", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de extinção ou redução", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
  ],
  EMBARGOS_DECLARACAO: [
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (5 dias)", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Omissão identificada e demonstrada", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Contradição identificada e demonstrada", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Obscuridade identificada e demonstrada", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Erro material identificado", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Efeito prequestionador indicado (se aplicável)", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de integração/correção do julgado", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
  ],
  APELACAO: [
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Comprovante de preparo", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (15 dias úteis)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Preparo recolhido", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Razões recursais fundamentadas", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Pedido de reforma ou anulação", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Prequestionamento para eventual recurso superior", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de provimento ao recurso", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo fatal antes do protocolo", blocks_protocol: true, is_required: true },
  ],
  DEFAULT: [
    { category: "DOCUMENTOS", title: "Minuta principal (Word) juntada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Procuração anexada", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Endereçamento correto", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Qualificação das partes", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Fundamentação jurídica adequada", blocks_protocol: true, is_required: true },
    { category: "PEDIDOS", title: "Pedidos formulados", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura do advogado", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo antes do protocolo", blocks_protocol: true, is_required: true },
  ],
};

function getChecklistTemplate(tipo: string): typeof CHECKLIST_TEMPLATES.DEFAULT {
  return CHECKLIST_TEMPLATES[tipo] || CHECKLIST_TEMPLATES.DEFAULT;
}

// ---------------------------------------------------------------------------
// Workspace sub-router
// ---------------------------------------------------------------------------

export const workspaceRouter = router({
  // ── Get or create workspace for a deadline ──
  getOrCreate: protectedProcedure
    .input(z.object({ deadlineId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deadline = await ctx.db.deadlineNew.findUnique({
        where: { id: input.deadlineId },
        include: {
          workspace: {
            include: {
              documents: { orderBy: { order: "asc" } },
              checklist_items: { orderBy: { order: "asc" } },
              comments: {
                orderBy: { created_at: "asc" },
                take: 100,
              },
              approvals: { orderBy: { created_at: "desc" } },
              activities: { orderBy: { created_at: "desc" }, take: 50 },
            },
          },
          responsavel: { select: { id: true, name: true, avatar_url: true, role: true } },
          responsavel_backup: { select: { id: true, name: true, avatar_url: true } },
          case_: {
            select: {
              id: true, numero_processo: true, tipo: true, uf: true, vara: true,
              cliente: { select: { id: true, nome: true } },
            },
          },
        },
      });

      if (!deadline) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prazo não encontrado" });
      }

      if (deadline.workspace) {
        return { deadline, workspace: deadline.workspace };
      }

      // Create workspace with checklist template
      const checklistItems = getChecklistTemplate(deadline.tipo);

      const workspace = await ctx.db.deadlineWorkspace.create({
        data: {
          deadline_id: input.deadlineId,
          phase: "RASCUNHO",
          phase_changed_by: ctx.session.user.id,
          checklist_items: {
            create: checklistItems.map((item, idx) => ({
              ...item,
              order: idx,
              template_source: deadline.tipo,
            })),
          },
          activities: {
            create: {
              action: "CREATED",
              description: `Workspace criado para o prazo ${deadline.codigo}`,
              user_id: ctx.session.user.id,
              user_name: ctx.session.user.name || "Sistema",
            },
          },
        },
        include: {
          documents: { orderBy: { order: "asc" } },
          checklist_items: { orderBy: { order: "asc" } },
          comments: { orderBy: { created_at: "asc" }, take: 100 },
          approvals: { orderBy: { created_at: "desc" } },
          activities: { orderBy: { created_at: "desc" }, take: 50 },
        },
      });

      // Fire-and-forget: AI generates initial briefing
      onWorkspaceCreated(workspace.id, input.deadlineId).catch(() => {});

      return { deadline, workspace };
    }),

  // ── Get workspace by ID ──
  get: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.deadlineWorkspace.findUnique({
        where: { id: input.workspaceId },
        include: {
          deadline: {
            include: {
              responsavel: { select: { id: true, name: true, avatar_url: true, role: true } },
              responsavel_backup: { select: { id: true, name: true, avatar_url: true } },
              case_: {
                select: {
                  id: true, numero_processo: true, tipo: true, uf: true, vara: true,
                  cliente: { select: { id: true, nome: true } },
                },
              },
            },
          },
          documents: { orderBy: { order: "asc" } },
          checklist_items: { orderBy: { order: "asc" } },
          comments: {
            orderBy: { created_at: "asc" },
          },
          approvals: { orderBy: { created_at: "desc" } },
          activities: { orderBy: { created_at: "desc" }, take: 100 },
        },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace não encontrado" });
      }

      return workspace;
    }),

  // ── Change phase with validations ──
  changePhase: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      phase: z.enum(["RASCUNHO", "REVISAO", "APROVACAO", "PROTOCOLO", "CONCLUIDO"]),
      motivo: z.string().optional(), // reason for returning to previous phase
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.deadlineWorkspace.findUnique({
        where: { id: input.workspaceId },
        include: {
          checklist_items: true,
          documents: true,
          approvals: { where: { status: "PENDENTE" } },
        },
      });
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });

      // Validate: RASCUNHO → REVISAO requires minuta principal
      if (input.phase === "REVISAO") {
        const hasMinuta = ws.documents.some(d => d.is_minuta_principal);
        if (!hasMinuta) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Junte a minuta principal (arquivo Word) antes de enviar para revisão.",
          });
        }
        // Check required checklist items
        const blocking = ws.checklist_items.filter(i => i.is_required && i.blocks_protocol && !i.checked);
        if (blocking.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Item(ns) obrigatório(s) pendente(s): ${blocking.map(b => b.title).join(", ")}`,
          });
        }
      }

      // Validate: cannot go to PROTOCOLO if blocking checklist items unchecked
      if (input.phase === "PROTOCOLO") {
        const blocking = ws.checklist_items.filter(i => i.blocks_protocol && !i.checked);
        if (blocking.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `${blocking.length} item(ns) obrigatório(s) do checklist não foram verificados: ${blocking.map(b => b.title).join(", ")}`,
          });
        }

        // All approvals must be decided
        const pendingApprovals = ws.approvals.length;
        if (pendingApprovals > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Existem ${pendingApprovals} aprovação(ões) pendente(s).`,
          });
        }
      }

      // Validate: CONCLUIDO requires protocol info
      if (input.phase === "CONCLUIDO" && !ws.protocol_number) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Informe o número do protocolo antes de concluir.",
        });
      }

      const description = input.motivo
        ? `Fase alterada: ${ws.phase} → ${input.phase} — Motivo: ${input.motivo}`
        : `Fase alterada: ${ws.phase} → ${input.phase}`;

      const updated = await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          phase: input.phase,
          phase_changed_at: new Date(),
          phase_changed_by: ctx.session.user.id,
          activities: {
            create: {
              action: "PHASE_CHANGED",
              description,
              user_id: ctx.session.user.id,
              user_name: ctx.session.user.name || "Sistema",
              metadata: { from: ws.phase, to: input.phase, motivo: input.motivo },
            },
          },
        },
      });

      // If CONCLUIDO, mark deadline as CUMPRIDO
      if (input.phase === "CONCLUIDO") {
        await ctx.db.deadlineNew.update({
          where: { id: ws.deadline_id },
          data: {
            status: "CUMPRIDO",
            data_cumprimento: new Date(),
          },
        });
      }

      return updated;
    }),

  // ── Register protocol ──
  registerProtocol: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      protocolNumber: z.string(),
      protocolDate: z.coerce.date(),
      protocolSystem: z.string().optional(),
      receiptUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          protocol_number: input.protocolNumber,
          protocol_date: input.protocolDate,
          protocol_system: input.protocolSystem,
          protocol_receipt_url: input.receiptUrl,
          activities: {
            create: {
              action: "PROTOCOL_REGISTERED",
              description: `Protocolo registrado: ${input.protocolNumber} (${input.protocolSystem || "manual"})`,
              user_id: ctx.session.user.id,
              user_name: ctx.session.user.name || "Sistema",
              metadata: {
                protocol_number: input.protocolNumber,
                protocol_system: input.protocolSystem,
              },
            },
          },
        },
      });
      return updated;
    }),

  // ── Set reviewer ──
  setRevisor: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      revisorId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: { revisor_id: input.revisorId },
      });
    }),

  // ═══ COMMENTS (simplified — flat feed) ═══

  addComment: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.workspaceComment.create({
        data: {
          workspace_id: input.workspaceId,
          content: input.content,
          type: "GERAL",
          user_id: ctx.session.user.id,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "COMMENT_ADDED",
          description: "Comentário adicionado",
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return comment;
    }),

  // ═══ CHECKLIST ═══

  toggleChecklist: protectedProcedure
    .input(z.object({
      itemId: z.string(),
      checked: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.workspaceChecklist.update({
        where: { id: input.itemId },
        data: {
          checked: input.checked,
          checked_by: input.checked ? ctx.session.user.id : null,
          checked_at: input.checked ? new Date() : null,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: item.workspace_id,
          action: "CHECKLIST_CHECKED",
          description: `${input.checked ? "✓" : "✗"} ${item.title}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return item;
    }),

  addChecklistItem: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      title: z.string().min(1),
      category: z.string().optional(),
      blocksProtocol: z.boolean().optional(),
      isRequired: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.workspaceChecklist.aggregate({
        where: { workspace_id: input.workspaceId },
        _max: { order: true },
      });

      return ctx.db.workspaceChecklist.create({
        data: {
          workspace_id: input.workspaceId,
          title: input.title,
          category: input.category || "GERAL",
          blocks_protocol: input.blocksProtocol || false,
          is_required: input.isRequired || false,
          order: (maxOrder._max.order || 0) + 1,
        },
      });
    }),

  deleteChecklistItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workspaceChecklist.delete({ where: { id: input.itemId } });
    }),

  // ═══ APPROVALS ═══

  requestApproval: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      approverId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.deadlineWorkspace.findUnique({
        where: { id: input.workspaceId },
        include: { approvals: { orderBy: { round: "desc" }, take: 1 } },
      });
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });

      const nextRound = (ws.approvals[0]?.round || 0) + 1;

      const approval = await ctx.db.workspaceApproval.create({
        data: {
          workspace_id: input.workspaceId,
          round: nextRound,
          requested_by: ctx.session.user.id,
          approver_id: input.approverId,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "APPROVAL_REQUESTED",
          description: `Aprovação solicitada (rodada ${nextRound})`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
          metadata: { round: nextRound, approver_id: input.approverId },
        },
      });

      return approval;
    }),

  decideApproval: protectedProcedure
    .input(z.object({
      approvalId: z.string(),
      status: z.enum(["APROVADO", "REPROVADO", "APROVADO_COM_RESSALVAS"]),
      feedback: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const approval = await ctx.db.workspaceApproval.update({
        where: { id: input.approvalId },
        data: {
          status: input.status,
          decided_at: new Date(),
          feedback: input.feedback,
          corrections_required: input.status === "REPROVADO" ? input.feedback : undefined,
        },
      });

      // If rejected, go back to RASCUNHO + auto comment
      if (input.status === "REPROVADO") {
        await ctx.db.deadlineWorkspace.update({
          where: { id: approval.workspace_id },
          data: {
            phase: "RASCUNHO",
            phase_changed_at: new Date(),
            phase_changed_by: ctx.session.user.id,
          },
        });

        // Auto-comment with rejection reason
        await ctx.db.workspaceComment.create({
          data: {
            workspace_id: approval.workspace_id,
            content: `Devolvido para ajustes por ${ctx.session.user.name || "aprovador"}. Motivo: ${input.feedback || "Não informado"}`,
            type: "GERAL",
            user_id: ctx.session.user.id,
          },
        });
      }

      // If approved with caveats, also add comment
      if (input.status === "APROVADO_COM_RESSALVAS" && input.feedback) {
        await ctx.db.workspaceComment.create({
          data: {
            workspace_id: approval.workspace_id,
            content: `Aprovado com ressalvas por ${ctx.session.user.name || "aprovador"}: ${input.feedback}`,
            type: "GERAL",
            user_id: ctx.session.user.id,
          },
        });
      }

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: approval.workspace_id,
          action: "APPROVAL_DECIDED",
          description: `Aprovação ${input.status === "APROVADO" ? "concedida" : input.status === "REPROVADO" ? "reprovada" : "concedida com ressalvas"} (rodada ${approval.round})`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
          metadata: { status: input.status, round: approval.round },
        },
      });

      return approval;
    }),

  // ═══ DOCUMENTS ═══

  addDocument: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      title: z.string(),
      fileUrl: z.string(),
      fileName: z.string(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
      category: z.string().optional(),
      isMinutaPrincipal: z.boolean().optional(),
      isRequired: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // If marking as minuta principal, unmark any existing one
      if (input.isMinutaPrincipal) {
        await ctx.db.workspaceDocument.updateMany({
          where: { workspace_id: input.workspaceId, is_minuta_principal: true },
          data: { is_minuta_principal: false },
        });
      }

      const maxOrder = await ctx.db.workspaceDocument.aggregate({
        where: { workspace_id: input.workspaceId },
        _max: { order: true },
      });

      const doc = await ctx.db.workspaceDocument.create({
        data: {
          workspace_id: input.workspaceId,
          title: input.title,
          file_url: input.fileUrl,
          file_name: input.fileName,
          file_size: input.fileSize || 0,
          mime_type: input.mimeType,
          category: input.category || "ANEXO",
          is_minuta_principal: input.isMinutaPrincipal || false,
          is_required: input.isRequired || false,
          order: input.isMinutaPrincipal ? 0 : (maxOrder._max.order || 0) + 1,
          uploaded_by: ctx.session.user.id,
          uploaded_by_name: ctx.session.user.name,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "DOCUMENT_UPLOADED",
          description: input.isMinutaPrincipal
            ? `Minuta principal juntada: ${input.fileName}`
            : `Anexo juntado: ${input.title} (${input.fileName})`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      // Fire-and-forget: AI classifies document, auto-checks checklist
      onDocumentUploaded(input.workspaceId, doc.id).catch(() => {});

      return doc;
    }),

  updateDocument: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      title: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { documentId, ...data } = input;
      return ctx.db.workspaceDocument.update({
        where: { id: documentId },
        data,
      });
    }),

  removeDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.workspaceDocument.delete({ where: { id: input.documentId } });

      // If removed minuta, clear AI analysis
      if (doc.is_minuta_principal) {
        await ctx.db.deadlineWorkspace.update({
          where: { id: doc.workspace_id },
          data: {
            analise_ia: null,
            analise_ia_data: null,
            analise_ia_arquivo: null,
          },
        });
      }

      return doc;
    }),

  // ═══ ACTIVITY LOG ═══

  listActivities: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      action: z.string().optional(),
      page: z.number().default(1),
      perPage: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        workspace_id: input.workspaceId,
        ...(input.action ? { action: input.action } : {}),
      };

      const [items, total] = await Promise.all([
        ctx.db.workspaceActivity.findMany({
          where,
          orderBy: { created_at: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
        }),
        ctx.db.workspaceActivity.count({ where }),
      ]);

      return { items, total, page: input.page, perPage: input.perPage };
    }),

  // ═══ WORKSPACE ACTIONS ═══

  delegate: protectedProcedure
    .input(z.object({
      deadlineId: z.string(),
      newResponsavelId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dl = await ctx.db.deadlineNew.update({
        where: { id: input.deadlineId },
        data: { responsavel_id: input.newResponsavelId },
      });

      const ws = await ctx.db.deadlineWorkspace.findUnique({
        where: { deadline_id: input.deadlineId },
      });

      if (ws) {
        await ctx.db.workspaceActivity.create({
          data: {
            workspace_id: ws.id,
            action: "DELEGATED",
            description: `Prazo delegado para outro responsável${input.reason ? `: ${input.reason}` : ""}`,
            user_id: ctx.session.user.id,
            user_name: ctx.session.user.name || "Sistema",
            metadata: { new_responsavel_id: input.newResponsavelId },
          },
        });
      }

      return dl;
    }),

  toggleLock: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      locked: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          locked: input.locked,
          locked_by: input.locked ? ctx.session.user.id : null,
          locked_at: input.locked ? new Date() : null,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: input.locked ? "LOCKED" : "UNLOCKED",
          description: input.locked ? "Workspace bloqueado para edição" : "Workspace desbloqueado",
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return ws;
    }),

  // Stats for workspace summary
  stats: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [checklist, comments, approvals, docs, minuta] = await Promise.all([
        ctx.db.workspaceChecklist.findMany({ where: { workspace_id: input.workspaceId } }),
        ctx.db.workspaceComment.count({ where: { workspace_id: input.workspaceId } }),
        ctx.db.workspaceApproval.findFirst({
          where: { workspace_id: input.workspaceId },
          orderBy: { created_at: "desc" },
        }),
        ctx.db.workspaceDocument.count({ where: { workspace_id: input.workspaceId } }),
        ctx.db.workspaceDocument.findFirst({ where: { workspace_id: input.workspaceId, is_minuta_principal: true } }),
      ]);

      const totalChecklist = checklist.length;
      const checkedChecklist = checklist.filter(c => c.checked).length;
      const blockingUnchecked = checklist.filter(c => c.blocks_protocol && !c.checked).length;

      return {
        checklistTotal: totalChecklist,
        checklistDone: checkedChecklist,
        checklistProgress: totalChecklist > 0 ? Math.round((checkedChecklist / totalChecklist) * 100) : 0,
        blockingUnchecked,
        totalComments: comments,
        lastApproval: approvals,
        totalDocuments: docs,
        hasMinuta: !!minuta,
      };
    }),
});
