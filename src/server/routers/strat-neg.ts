import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ========== Helper: convert reais (Float) to BigInt centavos ==========

function toBigInt(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

function toBigIntOrNull(value: number | null | undefined): bigint | null {
  if (value == null) return null;
  return BigInt(Math.round(value * 100));
}

// ========== Sub-routers ==========

const negotiationsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string().optional(),
        case_id: z.string().optional(),
        fase: z.string().optional(),
        status: z.string().optional(),
        prioridade: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.jrc_id && { jrc_id: input.jrc_id }),
        ...(input.case_id && { case_id: input.case_id }),
        ...(input.fase && { fase: input.fase as never }),
        ...(input.status && { status: input.status as never }),
        ...(input.prioridade && { prioridade: input.prioridade as never }),
      };

      return ctx.db.stratNegotiation.findMany({
        where,
        include: {
          case_: {
            select: {
              id: true,
              numero_processo: true,
              status: true,
              cliente: { select: { id: true, nome: true } },
            },
          },
          person: {
            select: { id: true, nome: true, cpf_cnpj: true, email: true, celular: true },
          },
          responsavel: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              eventos: true,
              rodadas: true,
              propostas: true,
              concessoes: true,
            },
          },
        },
        orderBy: { updated_at: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const negotiation = await ctx.db.stratNegotiation.findUnique({
        where: { id: input.id },
        include: {
          case_: {
            select: {
              id: true,
              numero_processo: true,
              status: true,
              vara: true,
              comarca: true,
              tribunal: true,
              uf: true,
              cliente: { select: { id: true, nome: true } },
            },
          },
          person: {
            select: { id: true, nome: true, cpf_cnpj: true, email: true, celular: true },
          },
          responsavel: {
            select: { id: true, name: true, email: true },
          },
          eventos: {
            take: 50,
            orderBy: { data: "desc" },
          },
          rodadas: {
            orderBy: { numero: "desc" },
          },
          propostas: {
            orderBy: { numero: "desc" },
          },
          concessoes: {
            orderBy: { data: "desc" },
          },
          one_sheets: {
            orderBy: { created_at: "desc" },
          },
          rj_creditor: {
            select: {
              id: true,
              nome: true,
              classe: true,
              valor_atualizado: true,
            },
          },
        },
      });

      if (!negotiation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Negociação estratégica não encontrada",
        });
      }

      return negotiation;
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string().optional(),
        case_id: z.string().optional(),
        creditor_id: z.string().optional(),
        person_id: z.string().optional(),
        titulo: z.string().min(1),
        tipo: z.string().default("INDIVIDUAL"),
        fase: z.string().default("PREPARACAO"),
        status: z.string().default("NAO_INICIADA"),
        prioridade: z.string().default("MEDIA"),
        responsavel_id: z.string().optional(),
        valor_credito: z.number().optional(),
        valor_meta_acordo: z.number().optional(),
        valor_proposta_atual: z.number().optional(),
        valor_pedido_credor: z.number().optional(),
        zopa_min: z.number().optional(),
        zopa_max: z.number().optional(),
        data_inicio: z.date().optional(),
        data_limite: z.date().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-generate codigo: NEG-YYYY-NNN
      const year = new Date().getFullYear();
      const count = await ctx.db.stratNegotiation.count({
        where: {
          codigo: { startsWith: `NEG-${year}-` },
        },
      });
      const codigo = `NEG-${year}-${String(count + 1).padStart(3, "0")}`;

      const {
        valor_credito,
        valor_meta_acordo,
        valor_proposta_atual,
        valor_pedido_credor,
        zopa_min,
        zopa_max,
        ...rest
      } = input;

      return ctx.db.stratNegotiation.create({
        data: {
          titulo: rest.titulo,
          codigo,
          tipo: (rest.tipo as never),
          fase: (rest.fase as never),
          status: (rest.status as never),
          prioridade: (rest.prioridade as never),
          case_id: rest.case_id,
          jrc_id: rest.jrc_id,
          creditor_id: rest.creditor_id,
          person_id: rest.person_id,
          responsavel_id: rest.responsavel_id || ctx.session.user.id,
          valor_credito: toBigInt(valor_credito ?? 0),
          valor_meta_acordo: toBigIntOrNull(valor_meta_acordo),
          valor_proposta_atual: toBigIntOrNull(valor_proposta_atual),
          valor_pedido_credor: toBigIntOrNull(valor_pedido_credor),
          zopa_min: toBigIntOrNull(zopa_min),
          zopa_max: toBigIntOrNull(zopa_max),
          data_inicio: rest.data_inicio || new Date(),
          data_limite: rest.data_limite,
          observacoes: rest.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        tipo: z.string().optional(),
        fase: z.string().optional(),
        status: z.string().optional(),
        prioridade: z.string().optional(),
        person_id: z.string().optional().nullable(),
        creditor_id: z.string().optional().nullable(),
        responsavel_id: z.string().optional().nullable(),
        valor_credito: z.number().optional(),
        valor_meta_acordo: z.number().optional().nullable(),
        valor_proposta_atual: z.number().optional().nullable(),
        valor_pedido_credor: z.number().optional().nullable(),
        valor_acordado: z.number().optional().nullable(),
        haircut_percentual: z.number().optional().nullable(),
        zopa_min: z.number().optional().nullable(),
        zopa_max: z.number().optional().nullable(),
        data_inicio: z.date().optional().nullable(),
        data_limite: z.date().optional().nullable(),
        data_acordo: z.date().optional().nullable(),
        data_proxima_acao: z.date().optional().nullable(),
        proxima_acao: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        valor_credito,
        valor_meta_acordo,
        valor_proposta_atual,
        valor_pedido_credor,
        valor_acordado,
        zopa_min,
        zopa_max,
        ...rest
      } = input;

      const data: Record<string, unknown> = { ...rest };

      if (valor_credito !== undefined) data.valor_credito = toBigInt(valor_credito);
      if (valor_meta_acordo !== undefined) data.valor_meta_acordo = toBigIntOrNull(valor_meta_acordo);
      if (valor_proposta_atual !== undefined) data.valor_proposta_atual = toBigIntOrNull(valor_proposta_atual);
      if (valor_pedido_credor !== undefined) data.valor_pedido_credor = toBigIntOrNull(valor_pedido_credor);
      if (valor_acordado !== undefined) data.valor_acordado = toBigIntOrNull(valor_acordado);
      if (zopa_min !== undefined) data.zopa_min = toBigIntOrNull(zopa_min);
      if (zopa_max !== undefined) data.zopa_max = toBigIntOrNull(zopa_max);

      return ctx.db.stratNegotiation.update({
        where: { id },
        data: data as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stratNegotiation.delete({ where: { id: input.id } });
    }),

  dashboard: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        ...(input.jrc_id && { jrc_id: input.jrc_id }),
      };

      const negotiations = await ctx.db.stratNegotiation.findMany({
        where,
        select: {
          id: true,
          fase: true,
          status: true,
          prioridade: true,
          valor_credito: true,
          valor_acordado: true,
          haircut_percentual: true,
        },
      });

      // Total active negotiations
      const total_ativas = negotiations.filter(
        (n) => n.status !== "ACORDO" && n.status !== "FRACASSADA"
      ).length;

      // Total value of active negotiations (sum of valor_credito)
      const activeNegs = negotiations.filter(
        (n) => n.status !== "ACORDO" && n.status !== "FRACASSADA"
      );
      const total_valor = activeNegs.reduce(
        (sum, n) => sum + n.valor_credito,
        BigInt(0)
      );

      // Haircut medio (weighted average of haircut_percentual for ACORDO negotiations)
      const acordoNegs = negotiations.filter(
        (n) => n.status === "ACORDO"
      );
      let haircut_medio = 0;
      if (acordoNegs.length > 0) {
        let totalWeight = BigInt(0);
        let weightedSum = 0;
        for (const n of acordoNegs) {
          if (n.haircut_percentual != null) {
            const weight = n.valor_credito;
            totalWeight += weight;
            weightedSum += n.haircut_percentual * Number(weight);
          }
        }
        if (totalWeight > BigInt(0)) {
          haircut_medio = weightedSum / Number(totalWeight);
        }
      }

      // Taxa de sucesso: % ACORDO vs total ENCERRADA
      const encerradas = negotiations.filter(
        (n) => n.status === "ACORDO" || n.status === "FRACASSADA"
      );
      const acordadas = negotiations.filter(
        (n) => n.status === "ACORDO"
      );
      const taxa_sucesso =
        encerradas.length > 0
          ? (acordadas.length / encerradas.length) * 100
          : 0;

      // By phase (count per fase)
      const by_phase: Record<string, number> = {};
      for (const n of negotiations) {
        const fase = n.fase as string;
        by_phase[fase] = (by_phase[fase] || 0) + 1;
      }

      // By status (count per status)
      const by_status: Record<string, number> = {};
      for (const n of negotiations) {
        const status = n.status as string;
        by_status[status] = (by_status[status] || 0) + 1;
      }

      return {
        total_ativas,
        total_valor,
        haircut_medio,
        taxa_sucesso,
        by_phase,
        by_status,
      };
    }),
});

const roundsSubRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        titulo: z.string().optional(),
        data_inicio: z.date(),
        ackerman_target: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-calculate numero (max + 1)
      const maxRound = await ctx.db.stratNegRound.findFirst({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (maxRound?.numero ?? 0) + 1;

      // Calculate Ackerman sequence if target provided
      let ackerman_seq: number[] | null = null;
      if (input.ackerman_target != null) {
        const target = input.ackerman_target;
        // [65%, 85%, 95%, 100%] of target with non-round values
        ackerman_seq = [
          Math.round(target * 0.65 * 100 + 1) / 100,    // add 1 cent to make non-round
          Math.round(target * 0.85 * 100 + 3) / 100,    // add 3 cents to make non-round
          Math.round(target * 0.95 * 100 + 7) / 100,    // add 7 cents to make non-round
          Math.round(target * 1.00 * 100 + 11) / 100,   // add 11 cents to make non-round
        ];
      }

      return ctx.db.stratNegRound.create({
        data: {
          negotiation_id: input.negotiation_id,
          numero,
          titulo: input.titulo || `Rodada ${numero}`,
          data_inicio: input.data_inicio,
          status: "ABERTA" as never,
          ackerman_target: input.ackerman_target != null
            ? toBigInt(input.ackerman_target)
            : null,
          ackerman_seq: ackerman_seq ?? undefined,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        data_fim: z.date().optional().nullable(),
        valor_proposto_devedor: z.number().optional().nullable(),
        valor_pedido_credor: z.number().optional().nullable(),
        resultado: z.string().optional().nullable(),
        ackerman_passo: z.number().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, valor_proposto_devedor, valor_pedido_credor, ...rest } = input;

      const data: Record<string, unknown> = { ...rest };

      if (valor_proposto_devedor !== undefined) {
        data.valor_proposto_devedor = toBigIntOrNull(valor_proposto_devedor);
      }
      if (valor_pedido_credor !== undefined) {
        data.valor_pedido_credor = toBigIntOrNull(valor_pedido_credor);
      }

      return ctx.db.stratNegRound.update({
        where: { id },
        data: data as never,
      });
    }),

  close: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["ENCERRADA_ACORDO", "ENCERRADA_IMPASSE", "ENCERRADA_ADIADA"]),
        resultado: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stratNegRound.update({
        where: { id: input.id },
        data: {
          status: input.status as never,
          resultado: input.resultado,
          data_fim: new Date(),
        },
      });
    }),
});

const eventsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        round_id: z.string().optional(),
        tipo: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.stratNegEvent.findMany({
        where: {
          negotiation_id: input.negotiation_id,
          ...(input.round_id && { round_id: input.round_id }),
          ...(input.tipo && { tipo: input.tipo as never }),
        },
        orderBy: { data: "desc" },
        take: input.limit,
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        round_id: z.string().optional(),
        data: z.date(),
        tipo: z.string(),
        canal: z.string().optional(),
        descricao: z.string(),
        participantes: z.array(z.string()).optional(),
        valor_mencionado: z.number().optional(),
        tecnicas_usadas: z.array(z.string()).optional(),
        sentimento: z.string().optional(),
        insights: z.string().optional(),
        documento_id: z.string().optional(),
        responsavel_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { valor_mencionado, ...rest } = input;

      return ctx.db.stratNegEvent.create({
        data: {
          ...rest,
          tipo: rest.tipo as never,
          canal: rest.canal as never,
          sentimento: rest.sentimento as never,
          valor_mencionado: toBigIntOrNull(valor_mencionado),
          responsavel_id: rest.responsavel_id || ctx.session.user.id,
          participantes: rest.participantes || [],
          tecnicas_usadas: rest.tecnicas_usadas || [],
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stratNegEvent.delete({ where: { id: input.id } });
    }),
});

const proposalsSubRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.stratNegProposal.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { numero: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        tipo: z.string(),
        data: z.date(),
        valor_principal: z.number(),
        haircut_pct: z.number().optional(),
        taxa_juros: z.number().optional(),
        carencia_meses: z.number().optional(),
        prazo_pagamento_meses: z.number().optional(),
        parcelas: z.number().optional(),
        debt_equity_swap: z.boolean().optional(),
        equity_pct: z.number().optional(),
        warrants: z.boolean().optional(),
        pik_toggle: z.boolean().optional(),
        contingent_value: z.boolean().optional(),
        condicoes_especiais: z.string().optional(),
        npv_devedor: z.number().optional(),
        npv_credor: z.number().optional(),
        taxa_desconto: z.number().optional(),
        recovery_rate: z.number().optional(),
        status: z.string().optional(),
        justificativa: z.string().optional(),
        documento_id: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-increment numero
      const maxProposal = await ctx.db.stratNegProposal.findFirst({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (maxProposal?.numero ?? 0) + 1;

      const {
        valor_principal,
        npv_devedor,
        npv_credor,
        ...rest
      } = input;

      return ctx.db.stratNegProposal.create({
        data: {
          ...rest,
          numero,
          tipo: rest.tipo as never,
          status: (rest.status || "RASCUNHO") as never,
          valor_principal: toBigInt(valor_principal),
          npv_devedor: toBigIntOrNull(npv_devedor),
          npv_credor: toBigIntOrNull(npv_credor),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        justificativa: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      return ctx.db.stratNegProposal.update({
        where: { id },
        data: rest as never,
      });
    }),
});

const concessionsSubRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.stratNegConcession.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { data: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        data: z.date(),
        direcao: z.string(),
        descricao: z.string(),
        valor_impacto: z.number().optional(),
        justificativa: z.string(),
        contrapartida: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { valor_impacto, ...rest } = input;

      return ctx.db.stratNegConcession.create({
        data: {
          ...rest,
          direcao: rest.direcao as never,
          valor_impacto: toBigIntOrNull(valor_impacto),
        },
      });
    }),

  summary: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const concessions = await ctx.db.stratNegConcession.findMany({
        where: { negotiation_id: input.negotiation_id },
      });

      let dadas_count = 0;
      let dadas_total = BigInt(0);
      let recebidas_count = 0;
      let recebidas_total = BigInt(0);

      for (const c of concessions) {
        const direcao = c.direcao as string;
        const impacto = c.valor_impacto ?? BigInt(0);

        if (direcao === "DADA") {
          dadas_count++;
          dadas_total += impacto;
        } else if (direcao === "RECEBIDA") {
          recebidas_count++;
          recebidas_total += impacto;
        }
      }

      const ratio =
        recebidas_total > BigInt(0)
          ? Number(dadas_total) / Number(recebidas_total)
          : dadas_count > 0
            ? Infinity
            : 0;

      return {
        dadas: { count: dadas_count, total_valor: dadas_total },
        recebidas: { count: recebidas_count, total_valor: recebidas_total },
        ratio,
      };
    }),
});

const oneSheetsSubRouter = router({
  list: protectedProcedure
    .input(z.object({ negotiation_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.stratNegOneSheet.findMany({
        where: { negotiation_id: input.negotiation_id },
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        negotiation_id: z.string(),
        objetivo_especifico: z.string(),
        resumo_situacao: z.string(),
        labels_preparados: z.any(),
        accusation_audit: z.any(),
        calibrated_questions: z.any(),
        ofertas_nao_monetarias: z.any().optional(),
        black_swans_investigar: z.any().optional(),
        reuniao_data: z.date().optional(),
        reuniao_local: z.string().optional(),
        preparado_por: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stratNegOneSheet.create({
        data: {
          negotiation_id: input.negotiation_id,
          objetivo_especifico: input.objetivo_especifico,
          resumo_situacao: input.resumo_situacao,
          labels_preparados: input.labels_preparados,
          accusation_audit: input.accusation_audit,
          calibrated_questions: input.calibrated_questions,
          ofertas_nao_monetarias: input.ofertas_nao_monetarias,
          black_swans_investigar: input.black_swans_investigar,
          reuniao_data: input.reuniao_data,
          reuniao_local: input.reuniao_local,
          preparado_por: input.preparado_por || ctx.session.user.name,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const oneSheet = await ctx.db.stratNegOneSheet.findUnique({
        where: { id: input.id },
      });

      if (!oneSheet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One-sheet não encontrado",
        });
      }

      return oneSheet;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.stratNegOneSheet.delete({ where: { id: input.id } });
    }),
});

// ========== Main stratNeg Router ==========

export const stratNegRouter = router({
  negotiations: negotiationsSubRouter,
  rounds: roundsSubRouter,
  events: eventsSubRouter,
  proposals: proposalsSubRouter,
  concessions: concessionsSubRouter,
  oneSheets: oneSheetsSubRouter,
});
