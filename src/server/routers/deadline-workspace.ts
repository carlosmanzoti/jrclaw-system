import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKSPACE_PHASES = ["RASCUNHO", "REVISAO", "APROVACAO", "PROTOCOLO", "CONCLUIDO"] as const;

const CHECKLIST_TEMPLATES: Record<string, { category: string; title: string; blocks_protocol: boolean; is_required: boolean }[]> = {
  CONTESTACAO: [
    { category: "REQUISITOS_FORMAIS", title: "Qualificação completa do réu", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Endereçamento correto (vara/juízo)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Número do processo informado", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Procuração ad judicia anexada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Documentos comprobatórios anexados", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Preliminares arguidas (se cabíveis)", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Impugnação específica dos fatos", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Fundamentação jurídica adequada", blocks_protocol: true, is_required: true },
    { category: "PEDIDOS", title: "Pedido de improcedência formulado", blocks_protocol: true, is_required: true },
    { category: "PEDIDOS", title: "Pedido de provas especificado", blocks_protocol: false, is_required: false },
    { category: "ASSINATURAS", title: "Assinatura do advogado com OAB", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo antes do protocolo", blocks_protocol: true, is_required: true },
  ],
  RECURSO_ESPECIAL: [
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade verificada", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Preparo (custas + porte de remessa)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Prequestionamento demonstrado", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Comprovante de preparo anexado", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Cópia do acórdão recorrido", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Violação de lei federal indicada (art. 105, III, a)", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Divergência jurisprudencial (se alínea c)", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Cotejo analítico realizado", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de provimento formulado", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura do advogado com OAB", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo de 15 dias úteis", blocks_protocol: true, is_required: true },
  ],
  AGRAVO_INSTRUMENTO: [
    { category: "REQUISITOS_FORMAIS", title: "Hipótese de cabimento verificada (art. 1.015 CPC)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (10 dias úteis)", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Cópia da decisão agravada", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Certidão de intimação", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Procuração e documentos essenciais", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Comprovante de preparo", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Demonstração do cabimento", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Pedido de tutela recursal (se cabível)", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de reforma da decisão", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Informar juízo a quo em 3 dias (art. 1.018)", blocks_protocol: false, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
  ],
  IMPUGNACAO_CUMPRIMENTO: [
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (15 dias úteis)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Garantia do juízo (se necessária)", blocks_protocol: false, is_required: false },
    { category: "FUNDAMENTACAO", title: "Hipóteses do art. 525 CPC verificadas", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Excesso de execução demonstrado com planilha", blocks_protocol: false, is_required: false },
    { category: "DOCUMENTOS", title: "Planilha de cálculos própria", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de extinção ou redução", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
  ],
  EMBARGOS_DECLARACAO: [
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
    { category: "REQUISITOS_FORMAIS", title: "Tempestividade (15 dias úteis)", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Preparo recolhido", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Comprovante de preparo", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Razões recursais fundamentadas", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Pedido de reforma ou anulação", blocks_protocol: true, is_required: true },
    { category: "FUNDAMENTACAO", title: "Prequestionamento para eventual recurso superior", blocks_protocol: false, is_required: false },
    { category: "PEDIDOS", title: "Pedido de provimento ao recurso", blocks_protocol: true, is_required: true },
    { category: "ASSINATURAS", title: "Assinatura com OAB", blocks_protocol: true, is_required: true },
    { category: "PROTOCOLO", title: "Verificar prazo fatal antes do protocolo", blocks_protocol: true, is_required: true },
  ],
  DEFAULT: [
    { category: "REQUISITOS_FORMAIS", title: "Endereçamento correto", blocks_protocol: true, is_required: true },
    { category: "REQUISITOS_FORMAIS", title: "Qualificação das partes", blocks_protocol: true, is_required: true },
    { category: "DOCUMENTOS", title: "Procuração anexada", blocks_protocol: true, is_required: true },
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
              theses: { orderBy: { order: "asc" } },
              comments: {
                where: { parent_id: null },
                orderBy: { created_at: "desc" },
                take: 50,
              },
              approvals: { orderBy: { created_at: "desc" } },
              activities: { orderBy: { created_at: "desc" }, take: 50 },
              document_versions: { orderBy: { version_number: "desc" }, take: 10 },
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
          theses: { orderBy: { order: "asc" } },
          comments: { where: { parent_id: null }, orderBy: { created_at: "desc" }, take: 50 },
          approvals: { orderBy: { created_at: "desc" } },
          activities: { orderBy: { created_at: "desc" }, take: 50 },
          document_versions: { orderBy: { version_number: "desc" }, take: 10 },
        },
      });

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
          theses: { orderBy: { order: "asc" } },
          comments: {
            where: { parent_id: null },
            orderBy: { created_at: "desc" },
            include: {
              replies: { orderBy: { created_at: "asc" } },
            },
          },
          approvals: { orderBy: { created_at: "desc" } },
          activities: { orderBy: { created_at: "desc" }, take: 100 },
          document_versions: { orderBy: { version_number: "desc" }, take: 20 },
        },
      });

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace não encontrado" });
      }

      return workspace;
    }),

  // ── Change phase ──
  changePhase: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      phase: z.enum(["RASCUNHO", "REVISAO", "APROVACAO", "PROTOCOLO", "CONCLUIDO"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.deadlineWorkspace.findUnique({
        where: { id: input.workspaceId },
        include: { checklist_items: true },
      });
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });

      // Validate: cannot go to PROTOCOLO if blocking checklist items unchecked
      if (input.phase === "PROTOCOLO") {
        const blocking = ws.checklist_items.filter(i => i.blocks_protocol && !i.checked);
        if (blocking.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `${blocking.length} item(ns) obrigatório(s) do checklist não foram verificados: ${blocking.map(b => b.title).join(", ")}`,
          });
        }
      }

      // Validate: CONCLUIDO requires protocol info
      if (input.phase === "CONCLUIDO" && !ws.protocol_number) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Informe o número do protocolo antes de concluir",
        });
      }

      const updated = await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          phase: input.phase,
          phase_changed_at: new Date(),
          phase_changed_by: ctx.session.user.id,
          activities: {
            create: {
              action: "PHASE_CHANGED",
              description: `Fase alterada: ${ws.phase} → ${input.phase}`,
              user_id: ctx.session.user.id,
              user_name: ctx.session.user.name || "Sistema",
              metadata: { from: ws.phase, to: input.phase },
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

  // ── Save editor content ──
  saveContent: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      contentJson: z.string(),
      contentHtml: z.string(),
      wordCount: z.number().optional(),
      charCount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          editor_content: input.contentJson,
          editor_html: input.contentHtml,
          editor_saved_at: new Date(),
          total_words: input.wordCount || 0,
          total_characters: input.charCount || 0,
          estimated_pages: Math.max(1, Math.ceil((input.wordCount || 0) / 300)),
        },
      });
      return ws;
    }),

  // ── Save version snapshot ──
  saveVersion: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      changeSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.deadlineWorkspace.findUnique({
        where: { id: input.workspaceId },
        include: { document_versions: { orderBy: { version_number: "desc" }, take: 1 } },
      });
      if (!ws) throw new TRPCError({ code: "NOT_FOUND" });

      const nextVersion = (ws.document_versions[0]?.version_number || 0) + 1;

      const version = await ctx.db.workspaceDocVersion.create({
        data: {
          workspace_id: input.workspaceId,
          version_number: nextVersion,
          title: `Versão ${nextVersion}`,
          content_json: ws.editor_content,
          content_html: ws.editor_html,
          change_summary: input.changeSummary || `Versão ${nextVersion} salva`,
          word_count: ws.total_words,
          created_by: ctx.session.user.id,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "VERSION_SAVED",
          description: `Versão ${nextVersion} salva${input.changeSummary ? `: ${input.changeSummary}` : ""}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
          metadata: { version_number: nextVersion },
        },
      });

      return version;
    }),

  // ── Restore version ──
  restoreVersion: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      versionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.workspaceDocVersion.findUnique({
        where: { id: input.versionId },
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          editor_content: version.content_json,
          editor_html: version.content_html,
          editor_saved_at: new Date(),
          total_words: version.word_count,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "CONTENT_EDITED",
          description: `Conteúdo restaurado para versão ${version.version_number}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
          metadata: { restored_version: version.version_number },
        },
      });

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

  // ═══ COMMENTS ═══

  addComment: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      content: z.string().min(1),
      type: z.string().optional(),
      parentId: z.string().optional(),
      anchorFrom: z.number().optional(),
      anchorTo: z.number().optional(),
      anchorText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.workspaceComment.create({
        data: {
          workspace_id: input.workspaceId,
          content: input.content,
          type: input.type || "GERAL",
          parent_id: input.parentId,
          anchor_from: input.anchorFrom,
          anchor_to: input.anchorTo,
          anchor_text: input.anchorText,
          user_id: ctx.session.user.id,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "COMMENT_ADDED",
          description: `Comentário adicionado${input.parentId ? " (resposta)" : ""}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return comment;
    }),

  resolveComment: protectedProcedure
    .input(z.object({ commentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.workspaceComment.update({
        where: { id: input.commentId },
        data: {
          resolved: true,
          resolved_by: ctx.session.user.id,
          resolved_at: new Date(),
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: comment.workspace_id,
          action: "COMMENT_RESOLVED",
          description: "Comentário resolvido",
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return comment;
    }),

  listComments: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      type: z.string().optional(),
      resolved: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workspaceComment.findMany({
        where: {
          workspace_id: input.workspaceId,
          parent_id: null,
          ...(input.type ? { type: input.type } : {}),
          ...(input.resolved !== undefined ? { resolved: input.resolved } : {}),
        },
        include: {
          replies: { orderBy: { created_at: "asc" } },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  // ═══ THESES ═══

  addThesis: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      title: z.string().min(1),
      type: z.string().optional(),
      issue: z.string().optional(),
      rule: z.string().optional(),
      analysis: z.string().optional(),
      conclusion: z.string().optional(),
      legalRefs: z.array(z.string()).optional(),
      caseRefs: z.array(z.string()).optional(),
      doctrineRefs: z.array(z.string()).optional(),
      strength: z.string().optional(),
      aiGenerated: z.boolean().optional(),
      aiConfidence: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.workspaceThesis.aggregate({
        where: { workspace_id: input.workspaceId },
        _max: { order: true },
      });

      const thesis = await ctx.db.workspaceThesis.create({
        data: {
          workspace_id: input.workspaceId,
          title: input.title,
          type: input.type || "MERITO",
          issue: input.issue,
          rule: input.rule,
          analysis: input.analysis,
          conclusion: input.conclusion,
          legal_refs: input.legalRefs || [],
          case_refs: input.caseRefs || [],
          doctrine_refs: input.doctrineRefs || [],
          strength: input.strength,
          ai_generated: input.aiGenerated || false,
          ai_confidence: input.aiConfidence,
          order: (maxOrder._max.order || 0) + 1,
          created_by: ctx.session.user.id,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "THESIS_ADDED",
          description: `Tese adicionada: ${input.title}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return thesis;
    }),

  updateThesis: protectedProcedure
    .input(z.object({
      thesisId: z.string(),
      title: z.string().optional(),
      type: z.string().optional(),
      status: z.string().optional(),
      issue: z.string().optional(),
      rule: z.string().optional(),
      analysis: z.string().optional(),
      conclusion: z.string().optional(),
      legalRefs: z.array(z.string()).optional(),
      caseRefs: z.array(z.string()).optional(),
      doctrineRefs: z.array(z.string()).optional(),
      strength: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { thesisId, legalRefs, caseRefs, doctrineRefs, ...rest } = input;
      return ctx.db.workspaceThesis.update({
        where: { id: thesisId },
        data: {
          ...rest,
          ...(legalRefs !== undefined ? { legal_refs: legalRefs } : {}),
          ...(caseRefs !== undefined ? { case_refs: caseRefs } : {}),
          ...(doctrineRefs !== undefined ? { doctrine_refs: doctrineRefs } : {}),
        },
      });
    }),

  deleteThesis: protectedProcedure
    .input(z.object({ thesisId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workspaceThesis.delete({ where: { id: input.thesisId } });
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
          content_snapshot: ws.editor_html,
        },
      });

      // Change phase to APROVACAO
      await ctx.db.deadlineWorkspace.update({
        where: { id: input.workspaceId },
        data: {
          phase: "APROVACAO",
          phase_changed_at: new Date(),
          phase_changed_by: ctx.session.user.id,
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
      correctionsRequired: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const approval = await ctx.db.workspaceApproval.update({
        where: { id: input.approvalId },
        data: {
          status: input.status,
          decided_at: new Date(),
          feedback: input.feedback,
          corrections_required: input.correctionsRequired,
        },
      });

      // If approved, advance to PROTOCOLO
      if (input.status === "APROVADO") {
        await ctx.db.deadlineWorkspace.update({
          where: { id: approval.workspace_id },
          data: {
            phase: "PROTOCOLO",
            phase_changed_at: new Date(),
            phase_changed_by: ctx.session.user.id,
          },
        });
      }

      // If rejected, go back to RASCUNHO
      if (input.status === "REPROVADO") {
        await ctx.db.deadlineWorkspace.update({
          where: { id: approval.workspace_id },
          data: {
            phase: "RASCUNHO",
            phase_changed_at: new Date(),
            phase_changed_by: ctx.session.user.id,
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
      description: z.string().optional(),
      isRequired: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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
          description: input.description,
          is_required: input.isRequired || false,
          order: (maxOrder._max.order || 0) + 1,
          uploaded_by: ctx.session.user.id,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: input.workspaceId,
          action: "DOCUMENT_UPLOADED",
          description: `Documento anexado: ${input.title}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return doc;
    }),

  validateDocument: protectedProcedure
    .input(z.object({
      documentId: z.string(),
      validated: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.workspaceDocument.update({
        where: { id: input.documentId },
        data: {
          is_validated: input.validated,
          validated_by: input.validated ? ctx.session.user.id : null,
          validated_at: input.validated ? new Date() : null,
        },
      });

      await ctx.db.workspaceActivity.create({
        data: {
          workspace_id: doc.workspace_id,
          action: "DOCUMENT_VALIDATED",
          description: `Documento ${input.validated ? "validado" : "invalidado"}: ${doc.title}`,
          user_id: ctx.session.user.id,
          user_name: ctx.session.user.name || "Sistema",
        },
      });

      return doc;
    }),

  removeDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workspaceDocument.delete({ where: { id: input.documentId } });
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

  // ═══ WORKSPACE ACTIONS (unified) ═══

  // Delegate deadline to another user
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

  // Lock/unlock workspace
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
      const [checklist, comments, theses, approvals, docs] = await Promise.all([
        ctx.db.workspaceChecklist.findMany({ where: { workspace_id: input.workspaceId } }),
        ctx.db.workspaceComment.count({ where: { workspace_id: input.workspaceId, resolved: false } }),
        ctx.db.workspaceThesis.count({ where: { workspace_id: input.workspaceId } }),
        ctx.db.workspaceApproval.findFirst({
          where: { workspace_id: input.workspaceId },
          orderBy: { created_at: "desc" },
        }),
        ctx.db.workspaceDocument.count({ where: { workspace_id: input.workspaceId } }),
      ]);

      const totalChecklist = checklist.length;
      const checkedChecklist = checklist.filter(c => c.checked).length;
      const blockingUnchecked = checklist.filter(c => c.blocks_protocol && !c.checked).length;

      return {
        checklistTotal: totalChecklist,
        checklistDone: checkedChecklist,
        checklistProgress: totalChecklist > 0 ? Math.round((checkedChecklist / totalChecklist) * 100) : 0,
        blockingUnchecked,
        openComments: comments,
        totalTheses: theses,
        lastApproval: approvals,
        totalDocuments: docs,
      };
    }),
});
