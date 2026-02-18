import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

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

// ========== Main Router ==========

export const crjNegotiationsRouter = router({
  negotiations: negotiationsRouter,
  rounds: roundsRouter,
  proposals: proposalsRouter,
  events: eventsRouter,
  installments: installmentsRouter,
  emails: emailsRouter,
  templates: templatesRouter,
});
