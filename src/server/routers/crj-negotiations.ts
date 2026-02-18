import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import type { CRJNegContext } from "@/lib/ai/crj-harvey-prompts";

// ========== Helpers ==========

function toBigInt(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

function toBigIntOrNull(value: number | null | undefined): bigint | null {
  if (value == null) return null;
  return BigInt(Math.round(value * 100));
}

function fromBigInt(value: bigint | null | undefined): number {
  if (value == null) return 0;
  return Number(value) / 100;
}

// ========== Sub-routers ==========

const negotiationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        status: z.string().optional(),
        type: z.string().optional(),
        priority: z.string().optional(),
        assigned_to_id: z.string().optional(),
        credit_class: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        jrc_id: input.jrc_id,
      };
      if (input.status) where.status = input.status;
      if (input.type) where.type = input.type;
      if (input.priority) where.priority = input.priority;
      if (input.assigned_to_id) where.assigned_to_id = input.assigned_to_id;
      if (input.credit_class) where.credit_class = input.credit_class;
      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { creditor: { nome: { contains: input.search, mode: "insensitive" } } },
        ];
      }

      return ctx.db.cRJNegotiation.findMany({
        where: where as never,
        include: {
          creditor: {
            select: {
              id: true,
              nome: true,
              cpf_cnpj: true,
              classe: true,
              natureza: true,
              valor_original: true,
              valor_atualizado: true,
              status: true,
              person: { select: { id: true, nome: true, email: true, celular: true } },
            },
          },
          assigned_to: {
            select: { id: true, name: true, email: true, avatar_url: true },
          },
          _count: {
            select: {
              rounds: true,
              proposals: true,
              events: true,
              emails: true,
              installment_schedule: true,
            },
          },
        },
        orderBy: { updated_at: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const negotiation = await ctx.db.cRJNegotiation.findUnique({
        where: { id: input.id },
        include: {
          creditor: {
            select: {
              id: true,
              nome: true,
              cpf_cnpj: true,
              pessoa_fisica: true,
              classe: true,
              natureza: true,
              status: true,
              valor_original: true,
              valor_atualizado: true,
              valor_garantia: true,
              valor_quirografario: true,
              tipo_garantia: true,
              descricao_garantia: true,
              desagio_percentual: true,
              carencia_meses: true,
              parcelas: true,
              indexador: true,
              juros_percentual: true,
              observacoes: true,
              person: {
                select: {
                  id: true,
                  nome: true,
                  cpf_cnpj: true,
                  email: true,
                  email_secundario: true,
                  celular: true,
                  telefone_fixo: true,
                  cidade: true,
                  estado: true,
                },
              },
            },
          },
          jrc: {
            select: {
              id: true,
              case_id: true,
              status_rj: true,
              case_: {
                select: {
                  id: true,
                  numero_processo: true,
                  vara: true,
                  comarca: true,
                  tribunal: true,
                  uf: true,
                  cliente: { select: { id: true, nome: true } },
                },
              },
            },
          },
          assigned_to: {
            select: { id: true, name: true, email: true, avatar_url: true, oab_number: true },
          },
          rounds: {
            orderBy: { round_number: "desc" },
          },
          proposals: {
            orderBy: { version: "desc" },
          },
          events: {
            orderBy: { created_at: "desc" },
            take: 50,
            include: {
              user: { select: { id: true, name: true, avatar_url: true } },
            },
          },
          emails: {
            orderBy: { sent_at: "desc" },
            include: {
              proposal: { select: { id: true, version: true, status: true } },
            },
          },
          installment_schedule: {
            orderBy: { installment_number: "asc" },
          },
          collective_round_links: {
            include: {
              rj_negotiation: {
                select: {
                  id: true,
                  titulo: true,
                  fase: true,
                  prioridade: true,
                  total_credores: true,
                  valor_total_original: true,
                },
              },
            },
          },
        },
      });

      if (!negotiation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Negociação não encontrada" });
      }

      return negotiation;
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        creditor_id: z.string(),
        title: z.string().optional(),
        type: z.string().default("ACORDO_SIMPLES"),
        priority: z.string().default("MEDIA"),
        assigned_to_id: z.string().optional(),
        proposed_amount: z.number().optional(),
        installments: z.number().int().optional(),
        has_rotating_credit: z.boolean().default(false),
        rotating_credit_value: z.number().optional(),
        rotating_credit_cycles: z.number().int().optional(),
        has_credit_insurance: z.boolean().default(false),
        insurer_name: z.string().optional(),
        has_assignment: z.boolean().default(false),
        assignment_partner: z.string().optional(),
        assignment_percentage: z.number().optional(),
        entry_payment: z.number().optional(),
        entry_date: z.date().optional(),
        grace_period_months: z.number().int().optional(),
        payment_term_years: z.number().int().optional(),
        monetary_correction: z.string().optional(),
        notes: z.string().optional(),
        target_date: z.date().optional(),
        tags: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Pull creditor data from QGC
      const creditor = await ctx.db.rJCreditor.findUnique({
        where: { id: input.creditor_id },
        select: {
          nome: true,
          classe: true,
          valor_original: true,
          valor_atualizado: true,
        },
      });

      if (!creditor) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credor não encontrado no QGC" });
      }

      const creditAmount = creditor.valor_atualizado || creditor.valor_original;
      const creditClass = creditor.classe;
      const title = input.title || `Negociação — ${creditor.nome}`;

      // Calculate discount percentage
      let discountPercentage: number | null = null;
      if (input.proposed_amount && Number(creditAmount) > 0) {
        discountPercentage =
          ((Number(creditAmount) / 100 - input.proposed_amount) / (Number(creditAmount) / 100)) * 100;
      }

      const negotiation = await ctx.db.cRJNegotiation.create({
        data: {
          jrc_id: input.jrc_id,
          creditor_id: input.creditor_id,
          title,
          type: input.type as never,
          status: "MAPEAMENTO" as never,
          priority: input.priority as never,
          assigned_to_id: input.assigned_to_id || ctx.session.user.id,
          credit_amount: creditAmount,
          credit_class: creditClass,
          proposed_amount: toBigIntOrNull(input.proposed_amount),
          discount_percentage: discountPercentage,
          installments: input.installments,
          has_rotating_credit: input.has_rotating_credit,
          rotating_credit_value: toBigIntOrNull(input.rotating_credit_value),
          rotating_credit_cycles: input.rotating_credit_cycles,
          has_credit_insurance: input.has_credit_insurance,
          insurer_name: input.insurer_name,
          has_assignment: input.has_assignment,
          assignment_partner: input.assignment_partner,
          assignment_percentage: input.assignment_percentage,
          entry_payment: toBigIntOrNull(input.entry_payment),
          entry_date: input.entry_date,
          grace_period_months: input.grace_period_months,
          payment_term_years: input.payment_term_years,
          monetary_correction: input.monetary_correction,
          notes: input.notes,
          start_date: new Date(),
          target_date: input.target_date,
          tags: input.tags,
        },
      });

      // Create automatic event
      await ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: negotiation.id,
          type: "CRIACAO",
          description: `Negociação criada: ${title} (${input.type})`,
          user_id: ctx.session.user.id,
          is_automatic: true,
          metadata: {
            type: input.type,
            credit_amount: Number(creditAmount),
            credit_class: creditClass,
          } as any,
        },
      });

      return negotiation;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assigned_to_id: z.string().optional().nullable(),
        proposed_amount: z.number().optional().nullable(),
        agreed_amount: z.number().optional().nullable(),
        installments: z.number().int().optional().nullable(),
        has_rotating_credit: z.boolean().optional(),
        rotating_credit_value: z.number().optional().nullable(),
        rotating_credit_cycles: z.number().int().optional().nullable(),
        has_credit_insurance: z.boolean().optional(),
        insurer_name: z.string().optional().nullable(),
        has_assignment: z.boolean().optional(),
        assignment_partner: z.string().optional().nullable(),
        assignment_percentage: z.number().optional().nullable(),
        entry_payment: z.number().optional().nullable(),
        entry_date: z.date().optional().nullable(),
        grace_period_months: z.number().int().optional().nullable(),
        payment_term_years: z.number().int().optional().nullable(),
        monetary_correction: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        target_date: z.date().optional().nullable(),
        closed_date: z.date().optional().nullable(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, proposed_amount, agreed_amount, rotating_credit_value, entry_payment, status, ...rest } = input;

      // Get current state for status change event
      const current = await ctx.db.cRJNegotiation.findUnique({
        where: { id },
        select: { status: true, credit_amount: true },
      });
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      const data: Record<string, unknown> = {};

      // Map scalar fields
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
          if (key === "type" || key === "priority") {
            data[key] = value as never;
          } else {
            data[key] = value;
          }
        }
      }

      // Handle BigInt conversions
      if (proposed_amount !== undefined) {
        data.proposed_amount = toBigIntOrNull(proposed_amount);
        // Recalculate discount
        if (proposed_amount != null && Number(current.credit_amount) > 0) {
          data.discount_percentage =
            ((Number(current.credit_amount) / 100 - proposed_amount) / (Number(current.credit_amount) / 100)) * 100;
        }
      }
      if (agreed_amount !== undefined) data.agreed_amount = toBigIntOrNull(agreed_amount);
      if (rotating_credit_value !== undefined) data.rotating_credit_value = toBigIntOrNull(rotating_credit_value);
      if (entry_payment !== undefined) data.entry_payment = toBigIntOrNull(entry_payment);

      // Handle status change with event
      if (status && status !== current.status) {
        data.status = status as never;
        await ctx.db.cRJNegotiationEvent.create({
          data: {
            negotiation_id: id,
            type: "MUDANCA_STATUS",
            description: `Status alterado: ${current.status} → ${status}`,
            user_id: ctx.session.user.id,
            is_automatic: true,
            metadata: { from: current.status, to: status } as any,
          },
        });
      }

      return ctx.db.cRJNegotiation.update({
        where: { id },
        data: data as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete: set status to CANCELADA
      await ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: input.id,
          type: "MUDANCA_STATUS",
          description: "Negociação cancelada",
          user_id: ctx.session.user.id,
          is_automatic: true,
          metadata: { action: "delete" } as any,
        },
      });

      return ctx.db.cRJNegotiation.update({
        where: { id: input.id },
        data: { status: "CANCELADA" as never, closed_date: new Date() },
      });
    }),

  dashboard: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const negotiations = await ctx.db.cRJNegotiation.findMany({
        where: { jrc_id: input.jrc_id },
        select: {
          id: true,
          status: true,
          type: true,
          priority: true,
          credit_amount: true,
          proposed_amount: true,
          agreed_amount: true,
          discount_percentage: true,
          title: true,
          start_date: true,
          target_date: true,
          updated_at: true,
          creditor: {
            select: { nome: true, classe: true },
          },
          assigned_to: {
            select: { id: true, name: true },
          },
        },
      });

      const total = negotiations.length;
      const byStatus: Record<string, number> = {};
      let totalCreditAmount = BigInt(0);
      let totalAgreedAmount = BigInt(0);
      let totalProposedAmount = BigInt(0);
      let concludedCount = 0;
      let discountSum = 0;
      let discountCount = 0;

      for (const n of negotiations) {
        byStatus[n.status] = (byStatus[n.status] || 0) + 1;
        totalCreditAmount += n.credit_amount;
        if (n.agreed_amount) totalAgreedAmount += n.agreed_amount;
        if (n.proposed_amount) totalProposedAmount += n.proposed_amount;
        if (n.status === "CONCLUIDA") concludedCount++;
        if (n.discount_percentage != null) {
          discountSum += n.discount_percentage;
          discountCount++;
        }
      }

      const active = total - (byStatus["CONCLUIDA"] || 0) - (byStatus["CANCELADA"] || 0) - (byStatus["SUSPENSA"] || 0);
      const agreementRate = total > 0 ? (concludedCount / total) * 100 : 0;
      const avgDiscount = discountCount > 0 ? discountSum / discountCount : 0;

      // Recent events
      const recentEvents = await ctx.db.cRJNegotiationEvent.findMany({
        where: { negotiation: { jrc_id: input.jrc_id } },
        orderBy: { created_at: "desc" },
        take: 10,
        include: {
          negotiation: { select: { id: true, title: true } },
          user: { select: { id: true, name: true } },
        },
      });

      return {
        total,
        active,
        concluded: concludedCount,
        byStatus,
        totalCreditAmount,
        totalAgreedAmount,
        totalProposedAmount,
        agreementRate,
        avgDiscount,
        negotiations,
        recentEvents,
      };
    }),

  // Bulk create from QGC
  bulkCreate: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        creditor_ids: z.array(z.string()),
        type: z.string().default("ACORDO_SIMPLES"),
        assigned_to_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { id: { in: input.creditor_ids } },
        select: { id: true, nome: true, classe: true, valor_original: true, valor_atualizado: true },
      });

      const results = [];
      for (const creditor of creditors) {
        // Check if negotiation already exists for this creditor
        const existing = await ctx.db.cRJNegotiation.findFirst({
          where: {
            jrc_id: input.jrc_id,
            creditor_id: creditor.id,
            status: { notIn: ["CANCELADA"] },
          },
        });

        if (existing) continue;

        const creditAmount = creditor.valor_atualizado || creditor.valor_original;
        const neg = await ctx.db.cRJNegotiation.create({
          data: {
            jrc_id: input.jrc_id,
            creditor_id: creditor.id,
            title: `Negociação — ${creditor.nome}`,
            type: input.type as never,
            status: "MAPEAMENTO" as never,
            priority: "MEDIA" as never,
            assigned_to_id: input.assigned_to_id || ctx.session.user.id,
            credit_amount: creditAmount,
            credit_class: creditor.classe,
          },
        });

        await ctx.db.cRJNegotiationEvent.create({
          data: {
            negotiation_id: neg.id,
            type: "CRIACAO",
            description: `Negociação criada via importação do QGC: ${creditor.nome}`,
            user_id: ctx.session.user.id,
            is_automatic: true,
          },
        });

        results.push(neg);
      }

      return { created: results.length, skipped: input.creditor_ids.length - results.length };
    }),
});

// ========== Rounds ==========

const roundsRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cRJNegotiationRound.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { round_number: "asc" },
        include: {
          proposals: { select: { id: true, version: true, status: true, template_type: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        type: z.string().default("PROPOSTA_INICIAL"),
        date: z.date().optional(),
        description: z.string(),
        proposed_by_us: z.boolean().default(true),
        value_proposed: z.number().optional(),
        discount_proposed: z.number().optional(),
        installments_proposed: z.number().int().optional(),
        has_rotating_credit: z.boolean().optional(),
        rotating_value: z.number().optional(),
        rotating_cycles: z.number().int().optional(),
        entry_payment: z.number().optional(),
        payment_term_years: z.number().int().optional(),
        conditions_summary: z.string().optional(),
        next_steps: z.string().optional(),
        attachments: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-increment round number
      const lastRound = await ctx.db.cRJNegotiationRound.findFirst({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { round_number: "desc" },
        select: { round_number: true },
      });
      const roundNumber = (lastRound?.round_number || 0) + 1;

      const { value_proposed, rotating_value, entry_payment, ...rest } = input;

      const round = await ctx.db.cRJNegotiationRound.create({
        data: {
          ...rest,
          type: rest.type as never,
          date: rest.date || new Date(),
          round_number: roundNumber,
          value_proposed: toBigIntOrNull(value_proposed),
          rotating_value: toBigIntOrNull(rotating_value),
          entry_payment: toBigIntOrNull(entry_payment),
        },
      });

      // Create event
      await ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: input.negotiation_id,
          type: input.proposed_by_us ? "PROPOSTA_ENVIADA" : "PROPOSTA_RECEBIDA",
          description: `Rodada #${roundNumber} registrada: ${rest.type}${value_proposed ? ` — R$ ${value_proposed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}`,
          user_id: ctx.session.user.id,
          is_automatic: true,
          metadata: { round_id: round.id, round_number: roundNumber, type: rest.type } as any,
        },
      });

      return round;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().optional(),
        creditor_response: z.string().optional(),
        creditor_counter_value: z.number().optional().nullable(),
        outcome: z.string().optional(),
        next_steps: z.string().optional(),
        conditions_summary: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, creditor_counter_value, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (rest.outcome) data.outcome = rest.outcome as never;
      if (creditor_counter_value !== undefined) {
        data.creditor_counter_value = toBigIntOrNull(creditor_counter_value);
      }
      return ctx.db.cRJNegotiationRound.update({
        where: { id },
        data: data as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cRJNegotiationRound.delete({ where: { id: input.id } });
    }),
});

// ========== Proposals ==========

const proposalsRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cRJProposal.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { version: "desc" },
        include: {
          round: { select: { id: true, round_number: true, type: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        round_id: z.string().optional(),
        template_type: z.string().default("ACORDO_SIMPLES"),
        data: z.record(z.string(), z.any()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-increment version
      const lastProposal = await ctx.db.cRJProposal.findFirst({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = (lastProposal?.version || 0) + 1;

      const proposal = await ctx.db.cRJProposal.create({
        data: {
          negotiation_id: input.negotiation_id,
          round_id: input.round_id,
          template_type: input.template_type as never,
          version,
          data: input.data as any,
        },
      });

      // Create event
      await ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: input.negotiation_id,
          type: "DOCUMENTO_GERADO",
          description: `Proposta v${version} gerada (${input.template_type})`,
          user_id: ctx.session.user.id,
          is_automatic: true,
          metadata: { proposal_id: proposal.id, version, template_type: input.template_type } as any,
        },
      });

      return proposal;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        generated_pdf_path: z.string().optional(),
        generated_docx_path: z.string().optional(),
        sent_via_email: z.boolean().optional(),
        sent_at: z.date().optional(),
        email_id: z.string().optional(),
        data: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (rest.status) data.status = rest.status as never;

      return ctx.db.cRJProposal.update({
        where: { id },
        data: data as never,
      });
    }),
});

// ========== Events / Timeline ==========

const eventsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        type: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        negotiation_id: input.negotiation_id,
      };
      if (input.type) where.type = input.type;

      const events = await ctx.db.cRJNegotiationEvent.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          user: { select: { id: true, name: true, avatar_url: true } },
        },
      });

      let nextCursor: string | undefined;
      if (events.length > input.limit) {
        const next = events.pop();
        nextCursor = next!.id;
      }

      return { events, nextCursor };
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        type: z.string().default("OBSERVACAO"),
        description: z.string(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: input.negotiation_id,
          type: input.type as never,
          description: input.description,
          metadata: input.metadata as any,
          user_id: ctx.session.user.id,
          is_automatic: false,
        },
      });
    }),
});

// ========== Installments ==========

const installmentsRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cRJInstallmentSchedule.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { installment_number: "asc" },
      });
    }),

  generate: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        proposal_id: z.string().optional(),
        total_amount: z.number(),
        entry_amount: z.number().optional(),
        entry_date: z.date().optional(),
        num_installments: z.number().int().min(1),
        first_due_date: z.date(),
        periodicity_months: z.number().int().default(1),
        grace_months: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Delete existing schedule for this negotiation
      await ctx.db.cRJInstallmentSchedule.deleteMany({
        where: { negotiation_id: input.negotiation_id },
      });

      const schedules = [];
      let remaining = input.total_amount;
      let installmentNumber = 1;

      // Entry payment
      if (input.entry_amount && input.entry_amount > 0) {
        remaining -= input.entry_amount;
        schedules.push({
          negotiation_id: input.negotiation_id,
          proposal_id: input.proposal_id,
          installment_number: 0,
          due_date: input.entry_date || new Date(),
          amount: toBigInt(input.entry_amount),
          remaining_balance: toBigInt(remaining),
          notes: "Entrada",
        });
      }

      // Regular installments
      const installmentAmount = remaining / input.num_installments;
      const startDate = new Date(input.first_due_date);
      startDate.setMonth(startDate.getMonth() + input.grace_months);

      for (let i = 0; i < input.num_installments; i++) {
        remaining -= installmentAmount;
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i * input.periodicity_months);

        schedules.push({
          negotiation_id: input.negotiation_id,
          proposal_id: input.proposal_id,
          installment_number: installmentNumber++,
          due_date: dueDate,
          amount: toBigInt(installmentAmount),
          remaining_balance: toBigInt(Math.max(0, remaining)),
        });
      }

      await ctx.db.cRJInstallmentSchedule.createMany({ data: schedules as never[] });

      return { count: schedules.length };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        paid_at: z.date().optional(),
        paid_amount: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, paid_amount, ...rest } = input;
      const data: Record<string, unknown> = { ...rest };
      if (rest.status) data.status = rest.status as never;
      if (paid_amount !== undefined) data.paid_amount = toBigIntOrNull(paid_amount);

      return ctx.db.cRJInstallmentSchedule.update({
        where: { id },
        data: data as never,
      });
    }),
});

// ========== Emails ==========

const emailsRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cRJNegotiationEmail.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { sent_at: "desc" },
        include: {
          proposal: { select: { id: true, version: true, template_type: true, status: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        microsoft_message_id: z.string().optional(),
        direction: z.string().default("ENVIADO"),
        from_address: z.string(),
        to_addresses: z.array(z.string()),
        cc_addresses: z.array(z.string()).default([]),
        subject: z.string(),
        body_preview: z.string(),
        has_attachments: z.boolean().default(false),
        attachment_paths: z.array(z.string()).default([]),
        proposal_id: z.string().optional(),
        sent_at: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const email = await ctx.db.cRJNegotiationEmail.create({
        data: {
          ...input,
          direction: input.direction as never,
          sent_at: input.sent_at || new Date(),
        },
      });

      // Create event
      const eventType = input.direction === "ENVIADO" ? "EMAIL_ENVIADO" : "EMAIL_RECEBIDO";
      await ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: input.negotiation_id,
          type: eventType as never,
          description: `E-mail ${input.direction === "ENVIADO" ? "enviado para" : "recebido de"} ${input.direction === "ENVIADO" ? input.to_addresses.join(", ") : input.from_address} — "${input.subject}"`,
          user_id: ctx.session.user.id,
          is_automatic: true,
          metadata: { email_id: email.id, subject: input.subject, direction: input.direction } as any,
        },
      });

      // If email carries a proposal, update proposal status
      if (input.proposal_id && input.direction === "ENVIADO") {
        await ctx.db.cRJProposal.update({
          where: { id: input.proposal_id },
          data: {
            sent_via_email: true,
            sent_at: new Date(),
            email_id: email.microsoft_message_id,
            status: "ENVIADA",
          },
        });
      }

      return email;
    }),

  send: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        to: z.array(z.object({ name: z.string().optional(), email: z.string() })),
        cc: z.array(z.object({ name: z.string().optional(), email: z.string() })).default([]),
        subject: z.string(),
        body: z.string(),
        bodyType: z.enum(["HTML", "Text"]).default("HTML"),
        proposal_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Try to send via Microsoft Graph
      let microsoft_message_id: string | undefined;
      try {
        const { MicrosoftGraphMailService } = await import("@/lib/microsoft-graph-mail");
        const mail = new MicrosoftGraphMailService(ctx.session.user.id);
        await mail.sendMail({
          subject: input.subject,
          body: input.body,
          bodyType: input.bodyType,
          to: input.to,
          cc: input.cc,
        });
      } catch {
        // If Graph fails, still record the email as sent (manual send)
      }

      // Get user email for from_address
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true },
      });

      const email = await ctx.db.cRJNegotiationEmail.create({
        data: {
          negotiation_id: input.negotiation_id,
          microsoft_message_id: microsoft_message_id || null,
          direction: "ENVIADO",
          from_address: user?.email || "noreply@jrclaw.com.br",
          to_addresses: input.to.map((t) => t.email),
          cc_addresses: input.cc.map((c) => c.email),
          subject: input.subject,
          body_preview: input.body.slice(0, 500),
          has_attachments: false,
          proposal_id: input.proposal_id || null,
          sent_at: new Date(),
        },
      });

      // Create event
      await ctx.db.cRJNegotiationEvent.create({
        data: {
          negotiation_id: input.negotiation_id,
          type: "EMAIL_ENVIADO",
          description: `E-mail enviado para ${input.to.map((t) => t.email).join(", ")} — "${input.subject}"`,
          user_id: ctx.session.user.id,
          is_automatic: true,
          metadata: { email_id: email.id, subject: input.subject } as any,
        },
      });

      // If email carries a proposal, update proposal status
      if (input.proposal_id) {
        await ctx.db.cRJProposal.update({
          where: { id: input.proposal_id },
          data: {
            sent_via_email: true,
            sent_at: new Date(),
            email_id: email.microsoft_message_id,
            status: "ENVIADA",
          },
        });
      }

      return email;
    }),
});

// ========== Templates ==========

const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.cRJDocumentTemplate.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cRJDocumentTemplate.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
        description: z.string().optional(),
        template_path: z.string(),
        placeholders: z.record(z.string(), z.string()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cRJDocumentTemplate.create({
        data: {
          name: input.name,
          type: input.type as never,
          description: input.description,
          template_path: input.template_path,
          placeholders: input.placeholders as any,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        template_path: z.string().optional(),
        placeholders: z.record(z.string(), z.string()).optional(),
        is_active: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, placeholders, ...rest } = input;
      return ctx.db.cRJDocumentTemplate.update({
        where: { id },
        data: {
          ...rest,
          ...(placeholders !== undefined && { placeholders: placeholders as any }),
        },
      });
    }),
});

// ========== AI Analysis ==========

const aiAnalyzeProcedure = protectedProcedure
  .input(z.object({ negotiation_id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Fetch full negotiation data for AI context
    const neg = await ctx.db.cRJNegotiation.findUnique({
      where: { id: input.negotiation_id },
      include: {
        creditor: {
          select: {
            nome: true,
            classe: true,
            natureza: true,
            valor_original: true,
            valor_atualizado: true,
            valor_garantia: true,
            tipo_garantia: true,
            desagio_percentual: true,
            carencia_meses: true,
            parcelas: true,
            indexador: true,
            juros_percentual: true,
            observacoes: true,
            person: {
              select: { nome: true, segmento: true, cidade: true, estado: true },
            },
          },
        },
        rounds: { orderBy: { round_number: "asc" } },
        proposals: { orderBy: { version: "desc" }, take: 3 },
        events: {
          orderBy: { created_at: "desc" },
          take: 20,
          select: { type: true, description: true, created_at: true },
        },
        jrc: {
          select: {
            status_rj: true,
            case_: { select: { tipo: true, vara: true, comarca: true, uf: true } },
          },
        },
      },
    });

    if (!neg) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Negociação não encontrada" });
    }

    // Build context for AI
    const creditAmount = fromBigInt(neg.credit_amount);
    const proposedAmount = neg.proposed_amount ? fromBigInt(neg.proposed_amount) : null;
    const agreedAmount = neg.agreed_amount ? fromBigInt(neg.agreed_amount) : null;

    const roundsSummary = neg.rounds.map((r) => ({
      number: r.round_number,
      type: r.type,
      date: r.date,
      proposed_by_us: r.proposed_by_us,
      value: r.value_proposed ? fromBigInt(r.value_proposed) : null,
      outcome: r.outcome,
      creditor_response: r.creditor_response,
      next_steps: r.next_steps,
    }));

    const prompt = `Você é um consultor jurídico especialista em recuperação judicial brasileira (Lei 11.101/2005). Analise os dados desta negociação individual com credor e forneça sugestões estratégicas.

## Dados da Negociação

**Credor:** ${neg.creditor?.nome || "N/A"}
**Classe:** ${neg.creditor?.classe || "N/A"}
**Natureza:** ${neg.creditor?.natureza || "N/A"}
**Localidade:** ${neg.creditor?.person?.cidade || "N/A"}/${neg.creditor?.person?.estado || "N/A"}
**Segmento:** ${neg.creditor?.person?.segmento || "N/A"}

**Valor do crédito original:** R$ ${creditAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
**Valor atualizado:** R$ ${neg.creditor?.valor_atualizado ? fromBigInt(neg.creditor.valor_atualizado).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "N/A"}
${neg.creditor?.valor_garantia ? `**Valor da garantia real:** R$ ${fromBigInt(neg.creditor.valor_garantia).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
${neg.creditor?.tipo_garantia ? `**Tipo de garantia:** ${neg.creditor.tipo_garantia}` : ""}

**Status atual:** ${neg.status}
**Tipo de negociação:** ${neg.type}
**Prioridade:** ${neg.priority}
${proposedAmount ? `**Valor proposto:** R$ ${proposedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
${agreedAmount ? `**Valor acordado:** R$ ${agreedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
${neg.discount_percentage != null ? `**Deságio atual:** ${neg.discount_percentage.toFixed(1)}%` : ""}
${neg.installments ? `**Parcelas previstas:** ${neg.installments}` : ""}
${neg.grace_period_months ? `**Carência:** ${neg.grace_period_months} meses` : ""}
${neg.monetary_correction ? `**Correção monetária:** ${neg.monetary_correction}` : ""}
${neg.has_rotating_credit ? `**Crédito rotativo:** Sim` : ""}
${neg.has_credit_insurance ? `**Seguro de crédito:** ${neg.insurer_name || "Sim"}` : ""}
${neg.has_assignment ? `**Cessão de crédito:** ${neg.assignment_partner || "Sim"} (${neg.assignment_percentage || "?"}%)` : ""}

**Processo:** ${neg.jrc?.case_?.tipo || "N/A"} — ${neg.jrc?.case_?.vara || ""} — ${neg.jrc?.case_?.comarca || ""}/${neg.jrc?.case_?.uf || ""}
**Status da RJ:** ${neg.jrc?.status_rj || "N/A"}

**Observações:** ${neg.notes || "Sem observações"}

## Histórico de Rodadas (${roundsSummary.length})
${roundsSummary.length > 0 ? JSON.stringify(roundsSummary, null, 2) : "Nenhuma rodada registrada"}

## Eventos Recentes
${neg.events.map((e) => `- [${e.type}] ${e.description} (${new Date(e.created_at).toLocaleDateString("pt-BR")})`).join("\n")}

---

Responda EXCLUSIVAMENTE em JSON válido com a seguinte estrutura:
{
  "summary": "Resumo geral da situação negocial em 2-3 frases",
  "suggestions": [
    {
      "category": "ESTRATEGIA|RISCO|DESAGIO|ARGUMENTO|PROXIMO_PASSO",
      "title": "Título curto",
      "content": "Descrição detalhada da sugestão com fundamentação jurídica quando aplicável",
      "confidence": "ALTA|MEDIA|BAIXA"
    }
  ],
  "recommendedDiscount": {
    "min": 25,
    "max": 40,
    "justification": "Justificativa para a faixa de deságio"
  },
  "riskFactors": ["Risco 1", "Risco 2"],
  "negotiationStrength": "FORTE|MODERADA|FRACA",
  "strengthJustification": "Justificativa para a avaliação de força"
}

Considere:
- Classe do crédito e implicações na votação do PRJ (arts. 45, 56, 58 da Lei 11.101)
- Garantias reais e seu impacto no poder de barganha
- Deságios praticados no mercado brasileiro para a classe
- Histórico das rodadas e evolução da negociação
- Argumentos jurídicos aplicáveis (ex: cram down, novação, consolidação processual)
- Riscos de impugnação, litígio, ou bloqueio da aprovação do plano

Forneça entre 3 e 6 sugestões. Seja prático e específico.`;

    try {
      const { generateText } = await import("ai");
      const { anthropic } = await import("@/lib/ai");

      const { text } = await generateText({
        model: anthropic("claude-sonnet-4-5-20250929"),
        prompt,
        maxOutputTokens: 4096,
        temperature: 0.3,
      });

      // Clean JSON from markdown fences if present
      let cleaned = text.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }

      return { result: cleaned.trim() };
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erro na análise IA: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      });
    }
  });

// ========== AI Insights ==========

const insightsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string().optional(),
        jrc_id: z.string().optional(),
        include_dismissed: z.boolean().default(false),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.negotiation_id) where.negotiation_id = input.negotiation_id;
      if (input.jrc_id) where.jrc_id = input.jrc_id;
      if (!input.include_dismissed) where.is_dismissed = false;

      return ctx.db.cRJAIInsight.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
        take: input.limit,
      });
    }),

  unreadCount: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string().optional(),
        jrc_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        is_read: false,
        is_dismissed: false,
      };
      if (input.negotiation_id) where.negotiation_id = input.negotiation_id;
      if (input.jrc_id) where.jrc_id = input.jrc_id;

      return ctx.db.cRJAIInsight.count({ where: where as never });
    }),

  markRead: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cRJAIInsight.updateMany({
        where: { id: { in: input.ids } },
        data: { is_read: true },
      });
      return { updated: input.ids.length };
    }),

  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.cRJAIInsight.update({
        where: { id: input.id },
        data: { is_dismissed: true },
      });
    }),

  generate: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string().optional(),
        jrc_id: z.string().optional(),
        trigger_source: z.string().default("MANUAL"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { buildInsightGenerationPrompt } = await import(
        "@/lib/ai/crj-harvey-prompts"
      );

      const negCtx: CRJNegContext = {};

      // Load negotiation if provided
      if (input.negotiation_id) {
        const neg = await ctx.db.cRJNegotiation.findUnique({
          where: { id: input.negotiation_id },
          include: {
            creditor: {
              select: {
                nome: true,
                cpf_cnpj: true,
                classe: true,
                natureza: true,
                valor_original: true,
                valor_atualizado: true,
                valor_garantia: true,
                tipo_garantia: true,
                person: {
                  select: { nome: true, segmento: true, cidade: true, estado: true, email: true },
                },
              },
            },
            rounds: {
              orderBy: { round_number: "asc" as const },
              select: {
                round_number: true,
                type: true,
                date: true,
                description: true,
                proposed_by_us: true,
                value_proposed: true,
                outcome: true,
                creditor_response: true,
                next_steps: true,
              },
            },
            proposals: {
              orderBy: { version: "desc" as const },
              take: 5,
              select: {
                version: true,
                template_type: true,
                status: true,
                sent_via_email: true,
                created_at: true,
              },
            },
            emails: {
              orderBy: { sent_at: "desc" as const },
              take: 10,
              select: { direction: true, subject: true, body_preview: true, sent_at: true },
            },
            installment_schedule: {
              orderBy: { installment_number: "asc" as const },
              select: { installment_number: true, due_date: true, amount: true, status: true },
            },
            jrc: {
              select: {
                status_rj: true,
                total_credores: true,
                total_credito: true,
                case_: {
                  select: {
                    numero_processo: true,
                    vara: true,
                    comarca: true,
                    uf: true,
                    cliente: { select: { nome: true } },
                  },
                },
              },
            },
          },
        });
        if (neg) {
          negCtx.negotiation = neg as any;
          negCtx.jrc = neg.jrc as any;
        }
      }

      // Load JRC data
      const effectiveJrcId = input.jrc_id || negCtx.negotiation?.jrc_id;
      if (effectiveJrcId) {
        if (!negCtx.jrc) {
          const jrc = await ctx.db.judicialRecoveryCase.findUnique({
            where: { id: effectiveJrcId },
            select: {
              status_rj: true,
              total_credores: true,
              total_credito: true,
              case_: {
                select: {
                  numero_processo: true,
                  vara: true,
                  comarca: true,
                  uf: true,
                  cliente: { select: { nome: true } },
                },
              },
            },
          });
          if (jrc) negCtx.jrc = jrc as any;
        }

        // Portfolio summary
        const negotiations = await ctx.db.cRJNegotiation.findMany({
          where: { jrc_id: effectiveJrcId },
          select: { status: true, credit_amount: true, agreed_amount: true, discount_percentage: true },
        });
        const byStatus: Record<string, number> = {};
        let totalCredit = BigInt(0);
        let totalAgreed = BigInt(0);
        let discountSum = 0;
        let discountCount = 0;
        for (const n of negotiations) {
          byStatus[n.status] = (byStatus[n.status] || 0) + 1;
          totalCredit += n.credit_amount;
          if (n.agreed_amount) totalAgreed += n.agreed_amount;
          if (n.discount_percentage != null) {
            discountSum += n.discount_percentage;
            discountCount++;
          }
        }
        negCtx.portfolio = {
          total: negotiations.length,
          byStatus,
          avgDiscount: discountCount > 0 ? discountSum / discountCount : 0,
          totalCreditAmount: totalCredit,
          totalAgreedAmount: totalAgreed,
        };
      }

      // Generate insights via AI
      const prompt = buildInsightGenerationPrompt(negCtx, input.trigger_source);

      try {
        const { generateText } = await import("ai");
        const { anthropic } = await import("@/lib/ai");

        const { text } = await generateText({
          model: anthropic("claude-sonnet-4-5-20250929"),
          prompt,
          maxOutputTokens: 4096,
          temperature: 0.3,
        });

        // Clean JSON
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
        else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
        if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);

        const parsed = JSON.parse(cleaned.trim());
        const insightsData = parsed.insights || [];

        // Save insights to DB
        const created = [];
        for (const ins of insightsData) {
          const insight = await ctx.db.cRJAIInsight.create({
            data: {
              negotiation_id: input.negotiation_id || null,
              jrc_id: effectiveJrcId || null,
              type: ins.type || "SUGESTAO",
              title: ins.title || "Insight",
              description: ins.description || "",
              suggested_action: ins.suggested_action || null,
              action_type: ins.action_type || null,
              action_payload: ins.action_payload || null,
              confidence: ins.confidence || 0.8,
              trigger_source: input.trigger_source,
            },
          });
          created.push(insight);
        }

        return { generated: created.length, insights: created };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao gerar insights: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
        });
      }
    }),
});

// ========== AI Config ==========

const DEFAULT_CLASS_CONDITIONS = {
  I_TRABALHISTA: {
    desagio_padrao: 0,
    prazo_anos: 1,
    carencia_meses: 12,
    correcao: "INPC",
    juros: 0,
    observacoes: "Art. 54, Lei 11.101 — pagamento em até 1 ano",
  },
  II_GARANTIA_REAL: {
    desagio_padrao: 20,
    prazo_anos: 10,
    carencia_meses: 24,
    correcao: "IPCA",
    juros: 1,
    observacoes: "Limitado ao valor da garantia",
  },
  III_QUIROGRAFARIO: {
    desagio_padrao: 60,
    prazo_anos: 15,
    carencia_meses: 36,
    correcao: "IPCA",
    juros: 0,
    observacoes: "Classe principal para negociação",
  },
  IV_ME_EPP: {
    desagio_padrao: 50,
    prazo_anos: 5,
    carencia_meses: 12,
    correcao: "INPC",
    juros: 0,
    observacoes: "Art. 71, Lei 11.101 — parcelamento em até 36 meses",
  },
};

const aiConfigRouter = router({
  get: protectedProcedure
    .input(z.object({ jrc_id: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let config = await ctx.db.cRJAIConfig.findFirst({
        where: input.jrc_id ? { jrc_id: input.jrc_id } : {},
      });

      if (!config) {
        // Return default config (not yet saved)
        return {
          id: null,
          jrc_id: input.jrc_id || null,
          default_model: "standard",
          proactive_ai: true,
          briefing_frequency: "daily",
          autocomplete_enabled: true,
          trigger_on_create: true,
          trigger_on_proposal: true,
          trigger_on_counter: true,
          trigger_on_status: true,
          trigger_on_deadline: true,
          trigger_on_patterns: true,
          trigger_on_email: true,
          days_inactive_alert: 14,
          days_no_response: 10,
          days_before_target: 7,
          custom_system_prompt: null as string | null,
          prompt_proposal: null as string | null,
          prompt_email: null as string | null,
          prompt_analysis: null as string | null,
          persistent_instructions: null as string | null,
          class_conditions: DEFAULT_CLASS_CONDITIONS,
          vpn_discount_rate: 12.0,
          correction_indices: ["INPC", "IPCA", "IGPM", "CDI"],
        };
      }

      // Ensure class_conditions has defaults if empty
      if (
        !config.class_conditions ||
        Object.keys(config.class_conditions as object).length === 0
      ) {
        config = {
          ...config,
          class_conditions: DEFAULT_CLASS_CONDITIONS,
        };
      }

      return config;
    }),

  update: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string().optional(),
        // Section 1
        default_model: z.string().optional(),
        proactive_ai: z.boolean().optional(),
        briefing_frequency: z.string().optional(),
        autocomplete_enabled: z.boolean().optional(),
        // Section 2
        trigger_on_create: z.boolean().optional(),
        trigger_on_proposal: z.boolean().optional(),
        trigger_on_counter: z.boolean().optional(),
        trigger_on_status: z.boolean().optional(),
        trigger_on_deadline: z.boolean().optional(),
        trigger_on_patterns: z.boolean().optional(),
        trigger_on_email: z.boolean().optional(),
        days_inactive_alert: z.number().int().optional(),
        days_no_response: z.number().int().optional(),
        days_before_target: z.number().int().optional(),
        // Section 3
        custom_system_prompt: z.string().optional().nullable(),
        prompt_proposal: z.string().optional().nullable(),
        prompt_email: z.string().optional().nullable(),
        prompt_analysis: z.string().optional().nullable(),
        persistent_instructions: z.string().optional().nullable(),
        // Section 4
        class_conditions: z.record(z.string(), z.any()).optional(),
        vpn_discount_rate: z.number().optional(),
        correction_indices: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jrc_id, class_conditions, ...rest } = input;

      const data: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) data[key] = value;
      }
      if (class_conditions !== undefined) {
        data.class_conditions = class_conditions as any;
      }

      // Upsert: create if not exists, update if exists
      const existing = await ctx.db.cRJAIConfig.findFirst({
        where: jrc_id ? { jrc_id } : {},
      });

      if (existing) {
        return ctx.db.cRJAIConfig.update({
          where: { id: existing.id },
          data: data as never,
        });
      }

      return ctx.db.cRJAIConfig.create({
        data: {
          jrc_id: jrc_id || null,
          ...data,
          class_conditions: (class_conditions as any) || DEFAULT_CLASS_CONDITIONS,
        } as never,
      });
    }),

  insightStats: protectedProcedure
    .input(z.object({ jrc_id: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.jrc_id) where.jrc_id = input.jrc_id;

      const [total, read, dismissed, byType] = await Promise.all([
        ctx.db.cRJAIInsight.count({ where: where as never }),
        ctx.db.cRJAIInsight.count({
          where: { ...where, is_read: true } as never,
        }),
        ctx.db.cRJAIInsight.count({
          where: { ...where, is_dismissed: true } as never,
        }),
        ctx.db.cRJAIInsight.groupBy({
          by: ["type"],
          where: where as never,
          _count: { id: true },
        }),
      ]);

      const accepted = read - dismissed;
      const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;

      return {
        total,
        read,
        dismissed,
        accepted,
        acceptanceRate,
        byType: byType.map((t) => ({
          type: t.type,
          count: t._count.id,
        })),
      };
    }),

  insightHistory: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.jrc_id) where.jrc_id = input.jrc_id;

      const items = await ctx.db.cRJAIInsight.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          negotiation: {
            select: { id: true, title: true, creditor: { select: { nome: true } } },
          },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next!.id;
      }

      return { items, nextCursor };
    }),
});

// ========== Main Router ==========

export const crjNegotiationsRouter = router({
  negotiations: negotiationsRouter,
  rounds: roundsRouter,
  proposals: proposalsRouter,
  events: eventsRouter,
  installments: installmentsRouter,
  emails: emailsRouter,
  templates: templatesRouter,
  insights: insightsRouter,
  aiConfig: aiConfigRouter,
  aiAnalyze: aiAnalyzeProcedure,
});
