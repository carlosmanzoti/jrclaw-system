import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ========== Sub-routers ==========

const casesSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(20),
        fase: z.string().optional(),
        status: z.string().optional(),
        tipo: z.string().optional(),
        prioridade: z.string().optional(),
        responsavel_id: z.string().optional(),
        search: z.string().optional(),
        valor_min: z.number().optional(),
        valor_max: z.number().optional(),
        score_min: z.number().optional(),
        score_max: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, valor_min, valor_max, score_min, score_max, ...filters } = input;
      const skip = (page - 1) * pageSize;

      const where: Record<string, unknown> = {};

      if (filters.fase) where.fase = filters.fase as never;
      if (filters.status) where.status = filters.status as never;
      if (filters.tipo) where.tipo = filters.tipo as never;
      if (filters.prioridade) where.prioridade = filters.prioridade as never;
      if (filters.responsavel_id) where.responsavel_id = filters.responsavel_id;

      if (search) {
        where.OR = [
          { person: { nome: { contains: search, mode: "insensitive" } } },
          { person: { cpf_cnpj: { contains: search } } },
          { codigo: { contains: search, mode: "insensitive" } },
          { titulo: { contains: search, mode: "insensitive" } },
        ];
      }

      if (valor_min !== undefined || valor_max !== undefined) {
        where.valor_total_execucao = {
          ...(valor_min !== undefined && { gte: valor_min }),
          ...(valor_max !== undefined && { lte: valor_max }),
        };
      }

      if (score_min !== undefined || score_max !== undefined) {
        where.score_recuperacao = {
          ...(score_min !== undefined && { gte: score_min }),
          ...(score_max !== undefined && { lte: score_max }),
        };
      }

      const [items, totalCount] = await Promise.all([
        ctx.db.creditRecoveryCase.findMany({
          where: where as never,
          include: {
            person: {
              select: { id: true, nome: true, cpf_cnpj: true, email: true, celular: true },
            },
            case_: {
              select: { id: true, numero_processo: true, status: true, vara: true, comarca: true },
            },
            responsavel: {
              select: { id: true, name: true, email: true },
            },
            _count: {
              select: {
                investigacoes: true,
                bens: true,
                acoes_cobranca: true,
                penhoras: true,
                acordos: true,
                incidentes_desconsidera: true,
                monitoramentos: true,
                eventos: true,
                devedores_solidarios: true,
              },
            },
          },
          orderBy: { updated_at: "desc" },
          skip,
          take: pageSize,
        }),
        ctx.db.creditRecoveryCase.count({ where: where as never }),
      ]);

      // Pipeline counts by fase
      const allFases = await ctx.db.creditRecoveryCase.groupBy({
        by: ["fase"],
        _count: { id: true },
      });

      const pipeline: Record<string, number> = {};
      for (const f of allFases) {
        pipeline[f.fase as string] = f._count.id;
      }

      return { items, totalCount, pipeline };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const recoveryCase = await ctx.db.creditRecoveryCase.findUnique({
        where: { id: input.id },
        include: {
          person: {
            select: {
              id: true,
              nome: true,
              cpf_cnpj: true,
              email: true,
              celular: true,
              whatsapp: true,
              cidade: true,
              estado: true,
              segmento: true,
            },
          },
          case_: {
            select: {
              id: true,
              numero_processo: true,
              status: true,
              vara: true,
              comarca: true,
              tribunal: true,
              uf: true,
              valor_causa: true,
              cliente: { select: { id: true, nome: true } },
            },
          },
          responsavel: {
            select: { id: true, name: true, email: true },
          },
          investigacoes: {
            orderBy: { created_at: "desc" },
            include: {
              _count: { select: { buscas: true, bens: true } },
            },
          },
          bens: {
            orderBy: { created_at: "desc" },
          },
          acoes_cobranca: {
            orderBy: { created_at: "desc" },
          },
          penhoras: {
            orderBy: { created_at: "desc" },
          },
          acordos: {
            orderBy: { created_at: "desc" },
          },
          incidentes_desconsidera: {
            orderBy: { created_at: "desc" },
          },
          monitoramentos: {
            orderBy: { created_at: "desc" },
          },
          eventos: {
            take: 50,
            orderBy: { data: "desc" },
          },
          devedores_solidarios: {
            include: {
              person: {
                select: { id: true, nome: true, cpf_cnpj: true },
              },
            },
            orderBy: { created_at: "desc" },
          },
        },
      });

      if (!recoveryCase) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso de recuperacao de credito nao encontrado",
        });
      }

      return recoveryCase;
    }),

  create: protectedProcedure
    .input(
      z.object({
        person_id: z.string(),
        case_id: z.string().optional(),
        titulo: z.string().min(1),
        tipo: z.string().default("EXECUCAO"),
        fase: z.string().default("INVESTIGACAO"),
        status: z.string().default("ATIVO"),
        prioridade: z.string().default("MEDIA"),
        responsavel_id: z.string().optional(),
        valor_original: z.number().optional(),
        valor_atualizado: z.number().optional(),
        valor_total_execucao: z.number().optional(),
        titulo_tipo: z.string().optional(),
        titulo_numero: z.string().optional(),
        titulo_data_vencimento: z.date().optional(),
        titulo_data_prescricao: z.date().optional(),
        devedor_nome: z.string().optional(),
        devedor_cpf_cnpj: z.string().optional(),
        devedor_tipo: z.string().optional(),
        score_recuperacao: z.number().optional(),
        score_fatores: z.any().optional(),
        estrategia_ia: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const year = new Date().getFullYear();
      const count = await ctx.db.creditRecoveryCase.count({
        where: { codigo: { startsWith: `REC-${year}-` } },
      });
      const codigo = `REC-${year}-${String(count + 1).padStart(3, "0")}`;

      return ctx.db.creditRecoveryCase.create({
        data: {
          codigo,
          titulo: input.titulo,
          person_id: input.person_id,
          case_id: input.case_id,
          tipo: (input.tipo as never),
          fase: (input.fase as never),
          status: (input.status as never),
          prioridade: (input.prioridade as never),
          responsavel_id: input.responsavel_id || ctx.session.user.id,
          valor_original: input.valor_original ?? 0,
          valor_atualizado: input.valor_atualizado,
          valor_total_execucao: input.valor_total_execucao,
          titulo_tipo: input.titulo_tipo,
          titulo_numero: input.titulo_numero,
          titulo_data_vencimento: input.titulo_data_vencimento,
          titulo_data_prescricao: input.titulo_data_prescricao,
          devedor_nome: input.devedor_nome,
          devedor_cpf_cnpj: input.devedor_cpf_cnpj,
          devedor_tipo: input.devedor_tipo,
          score_recuperacao: input.score_recuperacao,
          score_fatores: input.score_fatores ?? undefined,
          estrategia_ia: input.estrategia_ia,
          observacoes: input.observacoes,
        },
      });
    }),

  createFromWizard: protectedProcedure
    .input(
      z.object({
        devedor: z.object({
          existing_person_id: z.string().optional(),
          nome: z.string(),
          cpf_cnpj: z.string().optional(),
          tipo: z.string().optional(),
          endereco: z.string().optional(),
          telefone: z.string().optional(),
          email: z.string().optional(),
          atividade: z.string().optional(),
          razao_social: z.string().optional(),
          cnae: z.string().optional(),
          socios: z.string().optional(),
        }),
        caso: z.object({
          tipo: z.string().default("EXECUCAO"),
          processo_vinculado: z.string().optional(),
          titulo: z.object({
            tipo: z.string().optional(),
            numero: z.string().optional(),
            data_vencimento: z.string().optional(),
            data_prescricao: z.string().optional(),
          }).optional(),
          valores: z.object({
            valor_original: z.number().optional(),
            correcao_monetaria: z.number().optional(),
            juros: z.number().optional(),
            multa_523: z.number().optional(),
            honorarios: z.number().optional(),
            custas: z.number().optional(),
            total: z.number().optional(),
          }).optional(),
          prioridade: z.string().default("MEDIA"),
          responsavel_id: z.string().optional(),
        }),
        ai_analysis: z.object({
          score: z.number().optional(),
          estrategia: z.string().optional(),
          riscos: z.any().optional(),
          timeline: z.any().optional(),
        }).optional(),
        corresponsaveis: z.array(z.object({
          person_id: z.string().optional(),
          nome: z.string(),
          cpf_cnpj: z.string().optional(),
          tipo: z.string().optional(),
          fundamentacao: z.string().optional(),
          patrimonio_estimado: z.number().optional(),
        })).optional(),
        monitoramentos: z.array(z.object({
          tipo: z.string(),
          fonte: z.string().optional(),
          frequencia: z.string().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { devedor, caso, ai_analysis, corresponsaveis, monitoramentos } = input;

      // 1. Get or create person
      let personId = devedor.existing_person_id;
      if (!personId) {
        const person = await ctx.db.person.create({
          data: {
            nome: devedor.nome,
            cpf_cnpj: devedor.cpf_cnpj,
            tipo: "PARTE_CONTRARIA" as never,
            subtipo: (devedor.tipo === "PJ" ? "PESSOA_JURIDICA" : "PESSOA_FISICA") as never,
            razao_social: devedor.razao_social,
            email: devedor.email,
            celular: devedor.telefone,
            logradouro: devedor.endereco,
            observacoes: [devedor.atividade, devedor.cnae, devedor.socios].filter(Boolean).join(" | ") || undefined,
          },
        });
        personId = person.id;
      }

      // 2. Generate code
      const year = new Date().getFullYear();
      const count = await ctx.db.creditRecoveryCase.count({
        where: { codigo: { startsWith: `REC-${year}-` } },
      });
      const codigo = `REC-${year}-${String(count + 1).padStart(3, "0")}`;

      // 3. Create recovery case
      const valores = caso.valores ?? {};
      const recoveryCase = await ctx.db.creditRecoveryCase.create({
        data: {
          codigo,
          titulo: `Recuperacao - ${devedor.nome}`,
          person_id: personId!,
          case_id: caso.processo_vinculado || undefined,
          tipo: (caso.tipo as never),
          fase: "INVESTIGACAO" as never,
          status: "ATIVO" as never,
          prioridade: (caso.prioridade as never),
          responsavel_id: caso.responsavel_id || ctx.session.user.id,
          valor_original: valores.valor_original ?? 0,
          valor_atualizado: (valores.valor_original ?? 0) + (valores.correcao_monetaria ?? 0) + (valores.juros ?? 0),
          valor_total_execucao: valores.total ?? 0,
          valor_honorarios: valores.honorarios,
          valor_custas: valores.custas,
          titulo_tipo: caso.titulo?.tipo,
          titulo_numero: caso.titulo?.numero,
          titulo_data_vencimento: caso.titulo?.data_vencimento ? new Date(caso.titulo.data_vencimento) : undefined,
          titulo_data_prescricao: caso.titulo?.data_prescricao ? new Date(caso.titulo.data_prescricao) : undefined,
          devedor_nome: devedor.nome,
          devedor_cpf_cnpj: devedor.cpf_cnpj,
          devedor_tipo: devedor.tipo,
          devedor_endereco: devedor.endereco,
          devedor_telefone: devedor.telefone,
          devedor_email: devedor.email,
          devedor_atividade: devedor.atividade,
          score_recuperacao: ai_analysis?.score ?? 0,
          score_fatores: ai_analysis ? { riscos: ai_analysis.riscos, timeline: ai_analysis.timeline } : undefined,
          estrategia_ia: ai_analysis?.estrategia,
        },
      });

      // 4. Create joint debtors
      if (corresponsaveis?.length) {
        for (const c of corresponsaveis) {
          await ctx.db.jointDebtor.create({
            data: {
              recovery_case_id: recoveryCase.id,
              person_id: c.person_id,
              nome: c.nome,
              cpf_cnpj: c.cpf_cnpj,
              tipo_responsabilidade: (c.tipo as never) || ("DEVEDOR_PRINCIPAL" as never),
              fundamentacao: c.fundamentacao,
              patrimonio_estimado: c.patrimonio_estimado,
              status: "IDENTIFICADO" as never,
            },
          });
        }
      }

      // 5. Create monitoring entries
      if (monitoramentos?.length) {
        for (const m of monitoramentos) {
          await ctx.db.debtorMonitoring.create({
            data: {
              recovery_case_id: recoveryCase.id,
              tipo: m.tipo as never,
              fonte: (m.fonte as never) || ("MANUAL" as never),
              ativo: true,
              frequencia: (m.frequencia as never) || ("SEMANAL" as never),
            },
          });
        }
      }

      return recoveryCase;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        person_id: z.string().optional(),
        case_id: z.string().optional().nullable(),
        tipo: z.string().optional(),
        fase: z.string().optional(),
        status: z.string().optional(),
        prioridade: z.string().optional(),
        responsavel_id: z.string().optional().nullable(),
        valor_original: z.number().optional(),
        valor_atualizado: z.number().optional(),
        valor_total_execucao: z.number().optional(),
        valor_honorarios: z.number().optional(),
        valor_custas: z.number().optional(),
        valor_recuperado: z.number().optional(),
        valor_bloqueado: z.number().optional(),
        valor_penhorado: z.number().optional(),
        percentual_recuperado: z.number().optional(),
        titulo_tipo: z.string().optional().nullable(),
        titulo_numero: z.string().optional().nullable(),
        titulo_data_vencimento: z.date().optional().nullable(),
        titulo_data_prescricao: z.date().optional().nullable(),
        devedor_nome: z.string().optional().nullable(),
        devedor_cpf_cnpj: z.string().optional().nullable(),
        devedor_tipo: z.string().optional().nullable(),
        devedor_endereco: z.string().optional().nullable(),
        devedor_telefone: z.string().optional().nullable(),
        devedor_email: z.string().optional().nullable(),
        devedor_atividade: z.string().optional().nullable(),
        data_constituicao: z.date().optional().nullable(),
        data_vencimento: z.date().optional().nullable(),
        data_distribuicao: z.date().optional().nullable(),
        data_citacao: z.date().optional().nullable(),
        data_penhora: z.date().optional().nullable(),
        data_acordo: z.date().optional().nullable(),
        data_encerramento: z.date().optional().nullable(),
        data_proxima_acao: z.date().optional().nullable(),
        proxima_acao: z.string().optional().nullable(),
        score_recuperacao: z.number().optional().nullable(),
        score_fatores: z.any().optional().nullable(),
        risco_prescricao: z.string().optional().nullable(),
        risco_insolvencia: z.string().optional().nullable(),
        estrategia_ia: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.creditRecoveryCase.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditRecoveryCase.delete({ where: { id: input.id } });
    }),

  dashboard: protectedProcedure
    .input(
      z.object({
        responsavel_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.responsavel_id) where.responsavel_id = input.responsavel_id;

      const cases = await ctx.db.creditRecoveryCase.findMany({
        where: where as never,
        select: {
          id: true,
          fase: true,
          status: true,
          valor_total_execucao: true,
          valor_recuperado: true,
          valor_bloqueado: true,
          valor_penhorado: true,
          percentual_recuperado: true,
          score_recuperacao: true,
        },
      });

      // Active cases (not ENCERRADO or CANCELADO)
      const activeCases = cases.filter(
        (c) => c.status !== "ENCERRADO" && c.status !== "CANCELADO"
      );
      const total_active = activeCases.length;

      // Sum of valor_total_execucao
      const total_valor_execucao = activeCases.reduce(
        (sum, c) => sum + (c.valor_total_execucao ?? 0),
        0
      );

      // Sum of valor_recuperado
      const total_valor_recuperado = cases.reduce(
        (sum, c) => sum + (c.valor_recuperado ?? 0),
        0
      );

      // Sum of valor_bloqueado + valor_penhorado
      const total_valor_constrito = cases.reduce(
        (sum, c) => sum + (c.valor_bloqueado ?? 0) + (c.valor_penhorado ?? 0),
        0
      );

      // Average percentual_recuperado (only cases with a value)
      const casesWithPct = cases.filter(
        (c) => c.percentual_recuperado != null && c.percentual_recuperado > 0
      );
      const avg_percentual_recuperado =
        casesWithPct.length > 0
          ? casesWithPct.reduce((sum, c) => sum + (c.percentual_recuperado ?? 0), 0) /
            casesWithPct.length
          : 0;

      // Average score_recuperacao
      const casesWithScore = activeCases.filter(
        (c) => c.score_recuperacao != null && c.score_recuperacao > 0
      );
      const avg_score_recuperacao =
        casesWithScore.length > 0
          ? casesWithScore.reduce((sum, c) => sum + (c.score_recuperacao ?? 0), 0) /
            casesWithScore.length
          : 0;

      // Counts by fase for pipeline
      const by_fase: Record<string, number> = {};
      for (const c of cases) {
        const fase = c.fase as string;
        by_fase[fase] = (by_fase[fase] || 0) + 1;
      }

      return {
        total_active,
        total_valor_execucao,
        total_valor_recuperado,
        total_valor_constrito,
        avg_percentual_recuperado,
        avg_score_recuperacao,
        by_fase,
      };
    }),

  updatePhase: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        fase: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditRecoveryCase.update({
        where: { id: input.id },
        data: { fase: input.fase as never },
      });
    }),
});

// ========== INVESTIGATIONS ==========

const investigationsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        status: z.string().optional(),
        tipo: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.status) where.status = input.status as never;
      if (input.tipo) where.tipo = input.tipo as never;

      return ctx.db.patrimonialInvestigation.findMany({
        where: where as never,
        include: {
          responsavel: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { buscas: true, bens: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const investigation = await ctx.db.patrimonialInvestigation.findUnique({
        where: { id: input.id },
        include: {
          responsavel: {
            select: { id: true, name: true, email: true },
          },
          buscas: {
            orderBy: { created_at: "desc" },
          },
          bens: {
            orderBy: { created_at: "desc" },
          },
        },
      });

      if (!investigation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Investigacao patrimonial nao encontrada",
        });
      }

      return investigation;
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().default("COMPLETA"),
        status: z.string().default("SOLICITADA"),
        fase: z.string().default("PLANEJAMENTO"),
        responsavel_id: z.string().optional(),
        investigar_imoveis: z.boolean().optional(),
        investigar_veiculos: z.boolean().optional(),
        investigar_contas: z.boolean().optional(),
        investigar_empresas: z.boolean().optional(),
        investigar_socios: z.boolean().optional(),
        investigar_grupo_eco: z.boolean().optional(),
        investigar_crypto: z.boolean().optional(),
        investigar_exterior: z.boolean().optional(),
        investigar_osint: z.boolean().optional(),
        data_inicio: z.date().optional(),
        prazo_estimado: z.date().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const year = new Date().getFullYear();
      const count = await ctx.db.patrimonialInvestigation.count({
        where: { codigo: { startsWith: `INV-${year}-` } },
      });
      const codigo = `INV-${year}-${String(count + 1).padStart(3, "0")}`;

      return ctx.db.patrimonialInvestigation.create({
        data: {
          codigo,
          recovery_case_id: input.recovery_case_id,
          tipo: (input.tipo as never),
          status: (input.status as never),
          fase: (input.fase as never),
          responsavel_id: input.responsavel_id || ctx.session.user.id,
          data_solicitacao: new Date(),
          data_inicio: input.data_inicio,
          prazo_estimado: input.prazo_estimado,
          investigar_imoveis: input.investigar_imoveis ?? true,
          investigar_veiculos: input.investigar_veiculos ?? true,
          investigar_contas: input.investigar_contas ?? true,
          investigar_empresas: input.investigar_empresas ?? true,
          investigar_socios: input.investigar_socios ?? true,
          investigar_grupo_eco: input.investigar_grupo_eco ?? true,
          investigar_crypto: input.investigar_crypto ?? false,
          investigar_exterior: input.investigar_exterior ?? false,
          investigar_osint: input.investigar_osint ?? false,
          observacoes: input.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        fase: z.string().optional(),
        responsavel_id: z.string().optional().nullable(),
        data_inicio: z.date().optional().nullable(),
        data_conclusao: z.date().optional().nullable(),
        prazo_estimado: z.date().optional().nullable(),
        total_bens_encontrados: z.number().optional().nullable(),
        valor_total_estimado: z.number().optional().nullable(),
        valor_penhoravel_estimado: z.number().optional().nullable(),
        patrimonio_visivel: z.number().optional().nullable(),
        patrimonio_oculto_est: z.number().optional().nullable(),
        red_flags: z.any().optional().nullable(),
        indicio_fraude: z.boolean().optional(),
        indicio_ocultacao: z.boolean().optional(),
        indicio_grupo_eco: z.boolean().optional(),
        relatorio_doc_id: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.patrimonialInvestigation.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.patrimonialInvestigation.delete({
        where: { id: input.id },
      });
    }),
});

// ========== SEARCHES (AssetSearch) ==========
// Prisma model: AssetSearch
// Fields: id, investigation_id, recovery_case_id?, sistema, tipo_consulta,
//   cpf_cnpj_consultado, nome_consultado?, data_consulta, data_resposta?,
//   status, resultado_resumo?, resultado_detalhado?, valor_encontrado?,
//   valor_bloqueado?, qtd_resultados?, numero_processo?, numero_ordem_judicial?,
//   juizo?, teimosinha_ativa, teimosinha_dias?, teimosinha_inicio?,
//   teimosinha_fim?, teimosinha_reiteracoes?, observacoes?, created_at

const searchesSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        investigation_id: z.string(),
        sistema: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        investigation_id: input.investigation_id,
      };
      if (input.sistema) where.sistema = input.sistema as never;
      if (input.status) where.status = input.status as never;

      return ctx.db.assetSearch.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        investigation_id: z.string(),
        recovery_case_id: z.string().optional(),
        sistema: z.string(),
        tipo_consulta: z.string(),
        cpf_cnpj_consultado: z.string(),
        nome_consultado: z.string().optional(),
        status: z.string().default("SOLICITADA"),
        data_consulta: z.date().optional(),
        data_resposta: z.date().optional(),
        resultado_resumo: z.string().optional(),
        resultado_detalhado: z.any().optional(),
        valor_encontrado: z.number().optional(),
        valor_bloqueado: z.number().optional(),
        qtd_resultados: z.number().optional(),
        numero_processo: z.string().optional(),
        numero_ordem_judicial: z.string().optional(),
        juizo: z.string().optional(),
        teimosinha_ativa: z.boolean().optional(),
        teimosinha_dias: z.number().optional(),
        teimosinha_inicio: z.date().optional(),
        teimosinha_fim: z.date().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assetSearch.create({
        data: {
          investigation_id: input.investigation_id,
          recovery_case_id: input.recovery_case_id,
          sistema: (input.sistema as never),
          tipo_consulta: (input.tipo_consulta as never),
          cpf_cnpj_consultado: input.cpf_cnpj_consultado,
          nome_consultado: input.nome_consultado,
          status: (input.status as never),
          data_consulta: input.data_consulta || new Date(),
          data_resposta: input.data_resposta,
          resultado_resumo: input.resultado_resumo,
          resultado_detalhado: input.resultado_detalhado ?? undefined,
          valor_encontrado: input.valor_encontrado,
          valor_bloqueado: input.valor_bloqueado,
          qtd_resultados: input.qtd_resultados,
          numero_processo: input.numero_processo,
          numero_ordem_judicial: input.numero_ordem_judicial,
          juizo: input.juizo,
          teimosinha_ativa: input.teimosinha_ativa ?? false,
          teimosinha_dias: input.teimosinha_dias,
          teimosinha_inicio: input.teimosinha_inicio,
          teimosinha_fim: input.teimosinha_fim,
          observacoes: input.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        data_resposta: z.date().optional().nullable(),
        resultado_resumo: z.string().optional().nullable(),
        resultado_detalhado: z.any().optional().nullable(),
        valor_encontrado: z.number().optional().nullable(),
        valor_bloqueado: z.number().optional().nullable(),
        qtd_resultados: z.number().optional(),
        teimosinha_ativa: z.boolean().optional(),
        teimosinha_dias: z.number().optional().nullable(),
        teimosinha_inicio: z.date().optional().nullable(),
        teimosinha_fim: z.date().optional().nullable(),
        teimosinha_reiteracoes: z.number().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.assetSearch.update({
        where: { id },
        data: rest as never,
      });
    }),

  bulkCreate: protectedProcedure
    .input(
      z.object({
        investigation_id: z.string(),
        recovery_case_id: z.string().optional(),
        cpf_cnpj_consultado: z.string(),
        searches: z.array(
          z.object({
            sistema: z.string(),
            tipo_consulta: z.string(),
            nome_consultado: z.string().optional(),
            status: z.string().default("SOLICITADA"),
            data_consulta: z.date().optional(),
            observacoes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = input.searches.map((s) => ({
        investigation_id: input.investigation_id,
        recovery_case_id: input.recovery_case_id,
        sistema: (s.sistema as never),
        tipo_consulta: (s.tipo_consulta as never),
        cpf_cnpj_consultado: input.cpf_cnpj_consultado,
        nome_consultado: s.nome_consultado,
        status: (s.status as never),
        data_consulta: s.data_consulta || new Date(),
        observacoes: s.observacoes,
      }));

      return ctx.db.assetSearch.createMany({
        data: data as never,
      });
    }),
});

// ========== ASSETS (AssetFound) ==========
// Prisma model: AssetFound
// Fields: id, recovery_case_id, investigation_id?, tipo, subtipo?,
//   descricao, identificador?, localizacao?, valor_estimado?, valor_avaliacao?,
//   valor_mercado?, valor_liquidacao?, status, penhoravel, motivo_impenhoravel?,
//   titular_nome?, titular_cpf_cnpj?, titular_relacao?, onus? (Json),
//   possui_onus, data_localizacao, data_penhora?, data_avaliacao?,
//   data_expropriacao?, fonte?, documento_id?, observacoes?

const assetsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        penhoravel: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.tipo) where.tipo = input.tipo as never;
      if (input.status) where.status = input.status as never;
      if (input.penhoravel !== undefined) where.penhoravel = input.penhoravel;

      return ctx.db.assetFound.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        investigation_id: z.string().optional(),
        tipo: z.string(),
        subtipo: z.string().optional(),
        descricao: z.string(),
        identificador: z.string().optional(),
        localizacao: z.string().optional(),
        valor_estimado: z.number().optional(),
        valor_avaliacao: z.number().optional(),
        valor_mercado: z.number().optional(),
        valor_liquidacao: z.number().optional(),
        status: z.string().default("LOCALIZADO"),
        penhoravel: z.boolean().optional(),
        motivo_impenhoravel: z.string().optional(),
        titular_nome: z.string().optional(),
        titular_cpf_cnpj: z.string().optional(),
        titular_relacao: z.string().optional(),
        onus: z.any().optional(),
        possui_onus: z.boolean().optional(),
        data_localizacao: z.date().optional(),
        fonte: z.string().optional(),
        documento_id: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assetFound.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          investigation_id: input.investigation_id,
          tipo: (input.tipo as never),
          subtipo: input.subtipo,
          descricao: input.descricao,
          identificador: input.identificador,
          localizacao: input.localizacao,
          valor_estimado: input.valor_estimado,
          valor_avaliacao: input.valor_avaliacao,
          valor_mercado: input.valor_mercado,
          valor_liquidacao: input.valor_liquidacao,
          status: (input.status as never),
          penhoravel: input.penhoravel ?? true,
          motivo_impenhoravel: input.motivo_impenhoravel,
          titular_nome: input.titular_nome,
          titular_cpf_cnpj: input.titular_cpf_cnpj,
          titular_relacao: input.titular_relacao,
          onus: input.onus ?? undefined,
          possui_onus: input.possui_onus ?? false,
          data_localizacao: input.data_localizacao || new Date(),
          fonte: input.fonte,
          documento_id: input.documento_id,
          observacoes: input.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        subtipo: z.string().optional().nullable(),
        descricao: z.string().optional(),
        identificador: z.string().optional().nullable(),
        localizacao: z.string().optional().nullable(),
        valor_estimado: z.number().optional().nullable(),
        valor_avaliacao: z.number().optional().nullable(),
        valor_mercado: z.number().optional().nullable(),
        valor_liquidacao: z.number().optional().nullable(),
        status: z.string().optional(),
        penhoravel: z.boolean().optional(),
        motivo_impenhoravel: z.string().optional().nullable(),
        titular_nome: z.string().optional().nullable(),
        titular_cpf_cnpj: z.string().optional().nullable(),
        titular_relacao: z.string().optional().nullable(),
        onus: z.any().optional().nullable(),
        possui_onus: z.boolean().optional(),
        data_localizacao: z.date().optional().nullable(),
        data_penhora: z.date().optional().nullable(),
        data_avaliacao: z.date().optional().nullable(),
        data_expropriacao: z.date().optional().nullable(),
        fonte: z.string().optional().nullable(),
        documento_id: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.assetFound.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.assetFound.delete({ where: { id: input.id } });
    }),
});

// ========== COLLECTION ACTIONS ==========
// Prisma model: CollectionAction
// Fields: id, recovery_case_id, tipo, categoria, descricao (@db.Text),
//   data_acao, data_prazo?, data_resultado?, status, resultado? (@db.Text),
//   valor_envolvido?, valor_obtido?, protesto_cartorio?, protesto_protocolo?,
//   protesto_data_intimacao?, protesto_data_lavratura?, protesto_pago?,
//   negativacao_bureau?, negativacao_protocolo?, negativacao_data_inclusao?,
//   negativacao_data_exclusao?, leilao_leiloeiro?, leilao_data_1praca?,
//   leilao_data_2praca?, leilao_valor_minimo?, leilao_valor_arrematacao?,
//   leilao_arrematante?, leilao_comissao?, documento_id?, responsavel_id?,
//   observacoes?

const actionsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        categoria: z.string().optional(),
        tipo: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.categoria) where.categoria = input.categoria as never;
      if (input.tipo) where.tipo = input.tipo as never;
      if (input.status) where.status = input.status as never;

      return ctx.db.collectionAction.findMany({
        where: where as never,
        include: {
          responsavel: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        categoria: z.string(),
        tipo: z.string(),
        status: z.string().default("PLANEJADA"),
        descricao: z.string(),
        responsavel_id: z.string().optional(),
        data_acao: z.date().optional(),
        data_prazo: z.date().optional(),
        data_resultado: z.date().optional(),
        resultado: z.string().optional(),
        valor_envolvido: z.number().optional(),
        valor_obtido: z.number().optional(),
        // Protesto-specific fields
        protesto_cartorio: z.string().optional(),
        protesto_protocolo: z.string().optional(),
        protesto_data_intimacao: z.date().optional(),
        protesto_data_lavratura: z.date().optional(),
        protesto_pago: z.boolean().optional(),
        // Negativacao-specific fields
        negativacao_bureau: z.string().optional(),
        negativacao_protocolo: z.string().optional(),
        negativacao_data_inclusao: z.date().optional(),
        negativacao_data_exclusao: z.date().optional(),
        // Leilao-specific fields
        leilao_leiloeiro: z.string().optional(),
        leilao_data_1praca: z.date().optional(),
        leilao_data_2praca: z.date().optional(),
        leilao_valor_minimo: z.number().optional(),
        leilao_valor_arrematacao: z.number().optional(),
        leilao_arrematante: z.string().optional(),
        leilao_comissao: z.number().optional(),
        documento_id: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.collectionAction.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          categoria: (input.categoria as never),
          tipo: (input.tipo as never),
          status: (input.status as never),
          descricao: input.descricao,
          responsavel_id: input.responsavel_id || ctx.session.user.id,
          data_acao: input.data_acao || new Date(),
          data_prazo: input.data_prazo,
          data_resultado: input.data_resultado,
          resultado: input.resultado,
          valor_envolvido: input.valor_envolvido,
          valor_obtido: input.valor_obtido,
          protesto_cartorio: input.protesto_cartorio,
          protesto_protocolo: input.protesto_protocolo,
          protesto_data_intimacao: input.protesto_data_intimacao,
          protesto_data_lavratura: input.protesto_data_lavratura,
          protesto_pago: input.protesto_pago,
          negativacao_bureau: input.negativacao_bureau,
          negativacao_protocolo: input.negativacao_protocolo,
          negativacao_data_inclusao: input.negativacao_data_inclusao,
          negativacao_data_exclusao: input.negativacao_data_exclusao,
          leilao_leiloeiro: input.leilao_leiloeiro,
          leilao_data_1praca: input.leilao_data_1praca,
          leilao_data_2praca: input.leilao_data_2praca,
          leilao_valor_minimo: input.leilao_valor_minimo,
          leilao_valor_arrematacao: input.leilao_valor_arrematacao,
          leilao_arrematante: input.leilao_arrematante,
          leilao_comissao: input.leilao_comissao,
          documento_id: input.documento_id,
          observacoes: input.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        categoria: z.string().optional(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        descricao: z.string().optional(),
        responsavel_id: z.string().optional().nullable(),
        data_acao: z.date().optional().nullable(),
        data_prazo: z.date().optional().nullable(),
        data_resultado: z.date().optional().nullable(),
        resultado: z.string().optional().nullable(),
        valor_envolvido: z.number().optional().nullable(),
        valor_obtido: z.number().optional().nullable(),
        protesto_cartorio: z.string().optional().nullable(),
        protesto_protocolo: z.string().optional().nullable(),
        protesto_data_intimacao: z.date().optional().nullable(),
        protesto_data_lavratura: z.date().optional().nullable(),
        protesto_pago: z.boolean().optional().nullable(),
        negativacao_bureau: z.string().optional().nullable(),
        negativacao_protocolo: z.string().optional().nullable(),
        negativacao_data_inclusao: z.date().optional().nullable(),
        negativacao_data_exclusao: z.date().optional().nullable(),
        leilao_leiloeiro: z.string().optional().nullable(),
        leilao_data_1praca: z.date().optional().nullable(),
        leilao_data_2praca: z.date().optional().nullable(),
        leilao_valor_minimo: z.number().optional().nullable(),
        leilao_valor_arrematacao: z.number().optional().nullable(),
        leilao_arrematante: z.string().optional().nullable(),
        leilao_comissao: z.number().optional().nullable(),
        documento_id: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.collectionAction.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.collectionAction.delete({ where: { id: input.id } });
    }),
});

// ========== PENHORAS ==========
// Prisma model: Penhora (client: ctx.db.penhora)
// Fields: id, recovery_case_id, asset_id? (@unique), tipo, status,
//   valor_solicitado?, valor_efetivado?, valor_excesso?,
//   data_solicitacao, data_efetivacao?, data_intimacao_devedor?,
//   data_impugnacao?, data_decisao_impugnacao?,
//   auto_penhora_numero?, depositario_nome?, depositario_cpf?,
//   avaliacao_valor?, avaliacao_data?, avaliacao_por?,
//   numero_processo?, observacoes?

const penhorasSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.tipo) where.tipo = input.tipo as never;
      if (input.status) where.status = input.status as never;

      return ctx.db.penhora.findMany({
        where: where as never,
        include: {
          asset: true,
        },
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        asset_id: z.string().optional(),
        tipo: z.string(),
        status: z.string().default("SOLICITADA"),
        valor_solicitado: z.number().optional(),
        valor_efetivado: z.number().optional(),
        valor_excesso: z.number().optional(),
        data_solicitacao: z.date().optional(),
        data_efetivacao: z.date().optional(),
        data_intimacao_devedor: z.date().optional(),
        data_impugnacao: z.date().optional(),
        data_decisao_impugnacao: z.date().optional(),
        auto_penhora_numero: z.string().optional(),
        depositario_nome: z.string().optional(),
        depositario_cpf: z.string().optional(),
        avaliacao_valor: z.number().optional(),
        avaliacao_data: z.date().optional(),
        avaliacao_por: z.string().optional(),
        numero_processo: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.penhora.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          asset_id: input.asset_id,
          tipo: (input.tipo as never),
          status: (input.status as never),
          valor_solicitado: input.valor_solicitado,
          valor_efetivado: input.valor_efetivado,
          valor_excesso: input.valor_excesso,
          data_solicitacao: input.data_solicitacao || new Date(),
          data_efetivacao: input.data_efetivacao,
          data_intimacao_devedor: input.data_intimacao_devedor,
          data_impugnacao: input.data_impugnacao,
          data_decisao_impugnacao: input.data_decisao_impugnacao,
          auto_penhora_numero: input.auto_penhora_numero,
          depositario_nome: input.depositario_nome,
          depositario_cpf: input.depositario_cpf,
          avaliacao_valor: input.avaliacao_valor,
          avaliacao_data: input.avaliacao_data,
          avaliacao_por: input.avaliacao_por,
          numero_processo: input.numero_processo,
          observacoes: input.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        valor_solicitado: z.number().optional().nullable(),
        valor_efetivado: z.number().optional().nullable(),
        valor_excesso: z.number().optional().nullable(),
        data_solicitacao: z.date().optional().nullable(),
        data_efetivacao: z.date().optional().nullable(),
        data_intimacao_devedor: z.date().optional().nullable(),
        data_impugnacao: z.date().optional().nullable(),
        data_decisao_impugnacao: z.date().optional().nullable(),
        auto_penhora_numero: z.string().optional().nullable(),
        depositario_nome: z.string().optional().nullable(),
        depositario_cpf: z.string().optional().nullable(),
        avaliacao_valor: z.number().optional().nullable(),
        avaliacao_data: z.date().optional().nullable(),
        avaliacao_por: z.string().optional().nullable(),
        numero_processo: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.penhora.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.penhora.delete({ where: { id: input.id } });
    }),
});

// ========== AGREEMENTS ==========
// Prisma model: RecoveryAgreement (client: ctx.db.recoveryAgreement)
// Fields: id, recovery_case_id, tipo, status, valor_divida_original,
//   valor_acordo, desconto_percentual?, entrada?, parcelas?, valor_parcela?,
//   taxa_juros_mensal?, dia_vencimento?, dacao_bem_descricao?, dacao_bem_valor?,
//   parcelas_pagas?, valor_pago_total?, parcelas_atraso?,
//   data_ultima_parcela?, proxima_parcela?, data_proposta,
//   data_formalizacao?, data_inicio_pagamento?, data_ultima_cobranca?,
//   clausulas_especiais?, documento_id?, responsavel_id?
//
// Prisma model: AgreementInstallment (client: ctx.db.agreementInstallment)
// Fields: id, agreement_id, numero, valor, data_vencimento, data_pagamento?,
//   valor_pago?, status, dias_atraso?, multa_atraso?, comprovante_id?

const agreementsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.status) where.status = input.status as never;

      return ctx.db.recoveryAgreement.findMany({
        where: where as never,
        include: {
          responsavel: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agreement = await ctx.db.recoveryAgreement.findUnique({
        where: { id: input.id },
        include: {
          responsavel: {
            select: { id: true, name: true, email: true },
          },
          parcelas_detalhes: {
            orderBy: { numero: "asc" },
          },
        },
      });

      if (!agreement) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Acordo nao encontrado",
        });
      }

      return agreement;
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().default("PARCELAMENTO"),
        status: z.string().default("PROPOSTA"),
        responsavel_id: z.string().optional(),
        valor_divida_original: z.number(),
        valor_acordo: z.number(),
        desconto_percentual: z.number().optional(),
        entrada: z.number().optional(),
        parcelas: z.number().optional(),
        valor_parcela: z.number().optional(),
        taxa_juros_mensal: z.number().optional(),
        dia_vencimento: z.number().optional(),
        dacao_bem_descricao: z.string().optional(),
        dacao_bem_valor: z.number().optional(),
        data_proposta: z.date().optional(),
        data_formalizacao: z.date().optional(),
        data_inicio_pagamento: z.date().optional(),
        clausulas_especiais: z.string().optional(),
        documento_id: z.string().optional(),
        // Auto-generate installments
        gerar_parcelas: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { gerar_parcelas, ...agreementData } = input;

      const agreement = await ctx.db.recoveryAgreement.create({
        data: {
          recovery_case_id: agreementData.recovery_case_id,
          tipo: (agreementData.tipo as never),
          status: (agreementData.status as never),
          responsavel_id: agreementData.responsavel_id || ctx.session.user.id,
          valor_divida_original: agreementData.valor_divida_original,
          valor_acordo: agreementData.valor_acordo,
          desconto_percentual: agreementData.desconto_percentual,
          entrada: agreementData.entrada ?? 0,
          parcelas: agreementData.parcelas ?? 1,
          valor_parcela: agreementData.valor_parcela,
          taxa_juros_mensal: agreementData.taxa_juros_mensal,
          dia_vencimento: agreementData.dia_vencimento,
          dacao_bem_descricao: agreementData.dacao_bem_descricao,
          dacao_bem_valor: agreementData.dacao_bem_valor,
          data_proposta: agreementData.data_proposta || new Date(),
          data_formalizacao: agreementData.data_formalizacao,
          data_inicio_pagamento: agreementData.data_inicio_pagamento,
          clausulas_especiais: agreementData.clausulas_especiais,
          documento_id: agreementData.documento_id,
        },
      });

      // Auto-generate installments if requested
      if (
        gerar_parcelas &&
        agreementData.parcelas &&
        agreementData.parcelas > 0 &&
        agreementData.data_inicio_pagamento
      ) {
        const numParcelas = agreementData.parcelas;
        const valorAcordado = agreementData.valor_acordo;
        const entradaVal = agreementData.entrada ?? 0;
        const valorRestante = valorAcordado - entradaVal;
        const valorParcela =
          agreementData.valor_parcela ??
          Math.round((valorRestante / numParcelas) * 100) / 100;

        const installments = [];
        const primeiraData = new Date(agreementData.data_inicio_pagamento);

        // If there's an entry, add it as installment #0
        if (entradaVal > 0) {
          installments.push({
            agreement_id: agreement.id,
            numero: 0,
            data_vencimento: agreementData.data_proposta || new Date(),
            valor: entradaVal,
            status: "PENDENTE" as never,
          });
        }

        for (let i = 0; i < numParcelas; i++) {
          const dataVencimento = new Date(primeiraData);
          dataVencimento.setMonth(dataVencimento.getMonth() + i);

          // Last installment adjusts for rounding
          const isLast = i === numParcelas - 1;
          const previousSum = valorParcela * i;
          const valor = isLast
            ? Math.round((valorRestante - previousSum) * 100) / 100
            : valorParcela;

          installments.push({
            agreement_id: agreement.id,
            numero: i + 1,
            data_vencimento: dataVencimento,
            valor,
            status: "PENDENTE" as never,
          });
        }

        if (installments.length > 0) {
          await ctx.db.agreementInstallment.createMany({
            data: installments as never,
          });
        }
      }

      return agreement;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        responsavel_id: z.string().optional().nullable(),
        valor_divida_original: z.number().optional(),
        valor_acordo: z.number().optional(),
        desconto_percentual: z.number().optional().nullable(),
        entrada: z.number().optional(),
        parcelas: z.number().optional(),
        valor_parcela: z.number().optional().nullable(),
        taxa_juros_mensal: z.number().optional().nullable(),
        dia_vencimento: z.number().optional().nullable(),
        dacao_bem_descricao: z.string().optional().nullable(),
        dacao_bem_valor: z.number().optional().nullable(),
        parcelas_pagas: z.number().optional(),
        valor_pago_total: z.number().optional(),
        parcelas_atraso: z.number().optional(),
        data_ultima_parcela: z.date().optional().nullable(),
        proxima_parcela: z.date().optional().nullable(),
        data_proposta: z.date().optional().nullable(),
        data_formalizacao: z.date().optional().nullable(),
        data_inicio_pagamento: z.date().optional().nullable(),
        data_ultima_cobranca: z.date().optional().nullable(),
        clausulas_especiais: z.string().optional().nullable(),
        documento_id: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.recoveryAgreement.update({
        where: { id },
        data: rest as never,
      });
    }),

  updateInstallment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().optional(),
        valor: z.number().optional(),
        valor_pago: z.number().optional().nullable(),
        data_vencimento: z.date().optional(),
        data_pagamento: z.date().optional().nullable(),
        dias_atraso: z.number().optional().nullable(),
        multa_atraso: z.number().optional().nullable(),
        comprovante_id: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.agreementInstallment.update({
        where: { id },
        data: rest as never,
      });
    }),
});

// ========== DESCONSIDERACAO ==========
// Prisma model: DesconsideracaoIncident (client: ctx.db.desconsideracaoIncident)
// Fields: id, recovery_case_id, tipo, teoria, status, fundamento_legal,
//   hipotese, evidencias? (Json), confusao_patrimonial? (Json),
//   desvio_finalidade? (Json), alvos? (Json), valor_alcancado?,
//   decisao_resumo?, data_decisao?, recurso?, data_peticao?,
//   data_citacao_alvos?, data_resposta?, prazo_resposta?,
//   documento_peticao_id?, numero_incidente?

const desconsideracaoSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.tipo) where.tipo = input.tipo as never;
      if (input.status) where.status = input.status as never;

      return ctx.db.desconsideracaoIncident.findMany({
        where: where as never,
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().default("DIRETA"),
        teoria: z.string(),
        status: z.string().default("ANALISE_VIABILIDADE"),
        fundamento_legal: z.string(),
        hipotese: z.string(),
        evidencias: z.any().optional(),
        confusao_patrimonial: z.any().optional(),
        desvio_finalidade: z.any().optional(),
        alvos: z.any().optional(),
        valor_alcancado: z.number().optional(),
        decisao_resumo: z.string().optional(),
        data_decisao: z.date().optional(),
        recurso: z.string().optional(),
        data_peticao: z.date().optional(),
        data_citacao_alvos: z.date().optional(),
        data_resposta: z.date().optional(),
        prazo_resposta: z.date().optional(),
        documento_peticao_id: z.string().optional(),
        numero_incidente: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.desconsideracaoIncident.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          tipo: (input.tipo as never),
          teoria: (input.teoria as never),
          status: (input.status as never),
          fundamento_legal: input.fundamento_legal,
          hipotese: (input.hipotese as never),
          evidencias: input.evidencias ?? undefined,
          confusao_patrimonial: input.confusao_patrimonial ?? undefined,
          desvio_finalidade: input.desvio_finalidade ?? undefined,
          alvos: input.alvos ?? undefined,
          valor_alcancado: input.valor_alcancado,
          decisao_resumo: input.decisao_resumo,
          data_decisao: input.data_decisao,
          recurso: input.recurso,
          data_peticao: input.data_peticao,
          data_citacao_alvos: input.data_citacao_alvos,
          data_resposta: input.data_resposta,
          prazo_resposta: input.prazo_resposta,
          documento_peticao_id: input.documento_peticao_id,
          numero_incidente: input.numero_incidente,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        teoria: z.string().optional(),
        status: z.string().optional(),
        fundamento_legal: z.string().optional(),
        hipotese: z.string().optional(),
        evidencias: z.any().optional().nullable(),
        confusao_patrimonial: z.any().optional().nullable(),
        desvio_finalidade: z.any().optional().nullable(),
        alvos: z.any().optional().nullable(),
        valor_alcancado: z.number().optional().nullable(),
        decisao_resumo: z.string().optional().nullable(),
        data_decisao: z.date().optional().nullable(),
        recurso: z.string().optional().nullable(),
        data_peticao: z.date().optional().nullable(),
        data_citacao_alvos: z.date().optional().nullable(),
        data_resposta: z.date().optional().nullable(),
        prazo_resposta: z.date().optional().nullable(),
        documento_peticao_id: z.string().optional().nullable(),
        numero_incidente: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.desconsideracaoIncident.update({
        where: { id },
        data: rest as never,
      });
    }),
});

// ========== JOINT DEBTORS ==========
// Prisma model: JointDebtor (client: ctx.db.jointDebtor)
// Fields: id, recovery_case_id, person_id?, nome, cpf_cnpj?,
//   tipo_responsabilidade, fundamentacao?, patrimonio_estimado?, status

const jointDebtorsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.jointDebtor.findMany({
        where: { recovery_case_id: input.recovery_case_id },
        include: {
          person: {
            select: {
              id: true,
              nome: true,
              cpf_cnpj: true,
              email: true,
              celular: true,
              cidade: true,
              estado: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        person_id: z.string().optional(),
        nome: z.string(),
        cpf_cnpj: z.string().optional(),
        tipo_responsabilidade: z.string().default("DEVEDOR_PRINCIPAL"),
        fundamentacao: z.string().optional(),
        patrimonio_estimado: z.number().optional(),
        status: z.string().default("IDENTIFICADO"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.jointDebtor.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          person_id: input.person_id,
          nome: input.nome,
          cpf_cnpj: input.cpf_cnpj,
          tipo_responsabilidade: (input.tipo_responsabilidade as never),
          fundamentacao: input.fundamentacao,
          patrimonio_estimado: input.patrimonio_estimado,
          status: (input.status as never),
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        person_id: z.string().optional().nullable(),
        nome: z.string().optional(),
        cpf_cnpj: z.string().optional().nullable(),
        tipo_responsabilidade: z.string().optional(),
        fundamentacao: z.string().optional().nullable(),
        patrimonio_estimado: z.number().optional().nullable(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.jointDebtor.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.jointDebtor.delete({ where: { id: input.id } });
    }),
});

// ========== MONITORING ==========
// Prisma model: DebtorMonitoring (client: ctx.db.debtorMonitoring)
// Fields: id, recovery_case_id, tipo, fonte, ativo, frequencia,
//   ultima_verificacao?, ultimo_resultado? (Json), alertas_pendentes?,
//   configuracao? (Json), webhook_url?

const monitoringSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        recovery_case_id: input.recovery_case_id,
      };
      if (input.tipo) where.tipo = input.tipo as never;
      if (input.ativo !== undefined) where.ativo = input.ativo;

      return ctx.db.debtorMonitoring.findMany({
        where: where as never,
        include: {
          _count: {
            select: { alertas: true },
          },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string(),
        fonte: z.string(),
        ativo: z.boolean().optional(),
        frequencia: z.string(),
        configuracao: z.any().optional(),
        webhook_url: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.debtorMonitoring.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          tipo: (input.tipo as never),
          fonte: (input.fonte as never),
          ativo: input.ativo ?? true,
          frequencia: (input.frequencia as never),
          configuracao: input.configuracao ?? undefined,
          webhook_url: input.webhook_url,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tipo: z.string().optional(),
        fonte: z.string().optional(),
        ativo: z.boolean().optional(),
        frequencia: z.string().optional(),
        ultima_verificacao: z.date().optional().nullable(),
        ultimo_resultado: z.any().optional().nullable(),
        alertas_pendentes: z.number().optional().nullable(),
        configuracao: z.any().optional().nullable(),
        webhook_url: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;

      return ctx.db.debtorMonitoring.update({
        where: { id },
        data: rest as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.debtorMonitoring.delete({ where: { id: input.id } });
    }),
});

// ========== ALERTS ==========
// Prisma model: MonitoringAlert (client: ctx.db.monitoringAlert)
// Fields: id, monitoring_id, tipo, severidade, titulo, descricao (@db.Text),
//   dados? (Json), lido, acao_tomada?, data_acao?

const alertsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        monitoring_id: z.string().optional(),
        recovery_case_id: z.string().optional(),
        severidade: z.string().optional(),
        lido: z.boolean().optional(),
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, ...filters } = input;
      const skip = (page - 1) * pageSize;

      const where: Record<string, unknown> = {};
      if (filters.monitoring_id) where.monitoring_id = filters.monitoring_id;
      if (filters.recovery_case_id) {
        where.monitoring = { recovery_case_id: filters.recovery_case_id };
      }
      if (filters.severidade) where.severidade = filters.severidade as never;
      if (filters.lido !== undefined) where.lido = filters.lido;

      const [items, totalCount] = await Promise.all([
        ctx.db.monitoringAlert.findMany({
          where: where as never,
          include: {
            monitoring: {
              select: {
                id: true,
                tipo: true,
                recovery_case_id: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
          skip,
          take: pageSize,
        }),
        ctx.db.monitoringAlert.count({ where: where as never }),
      ]);

      return { items, totalCount };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.monitoringAlert.update({
        where: { id: input.id },
        data: { lido: true },
      });
    }),

  markAction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        acao_tomada: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.monitoringAlert.update({
        where: { id: input.id },
        data: {
          acao_tomada: input.acao_tomada,
          data_acao: new Date(),
          lido: true,
        },
      });
    }),

  unreadCount: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { lido: false };
      if (input.recovery_case_id) {
        where.monitoring = { recovery_case_id: input.recovery_case_id };
      }

      return ctx.db.monitoringAlert.count({ where: where as never });
    }),
});

// ========== EVENTS ==========
// Prisma model: RecoveryEvent (client: ctx.db.recoveryEvent)
// Fields: id, recovery_case_id, data, tipo, descricao (@db.Text),
//   valor_mencionado?, responsavel_id?, documento_id?,
//   analise_ia?, sentimento?, acao_recomendada?

const eventsSubRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string().optional(),
        page: z.number().optional().default(1),
        pageSize: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, ...filters } = input;
      const skip = (page - 1) * pageSize;

      const where: Record<string, unknown> = {
        recovery_case_id: filters.recovery_case_id,
      };
      if (filters.tipo) where.tipo = filters.tipo as never;

      const [items, totalCount] = await Promise.all([
        ctx.db.recoveryEvent.findMany({
          where: where as never,
          include: {
            responsavel: {
              select: { id: true, name: true },
            },
          },
          orderBy: { data: "desc" },
          skip,
          take: pageSize,
        }),
        ctx.db.recoveryEvent.count({ where: where as never }),
      ]);

      return { items, totalCount };
    }),

  create: protectedProcedure
    .input(
      z.object({
        recovery_case_id: z.string(),
        tipo: z.string(),
        data: z.date(),
        descricao: z.string(),
        responsavel_id: z.string().optional(),
        valor_mencionado: z.number().optional(),
        documento_id: z.string().optional(),
        analise_ia: z.string().optional(),
        sentimento: z.string().optional(),
        acao_recomendada: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.recoveryEvent.create({
        data: {
          recovery_case_id: input.recovery_case_id,
          tipo: (input.tipo as never),
          data: input.data,
          descricao: input.descricao,
          responsavel_id: input.responsavel_id || ctx.session.user.id,
          valor_mencionado: input.valor_mencionado,
          documento_id: input.documento_id,
          analise_ia: input.analise_ia,
          sentimento: input.sentimento,
          acao_recomendada: input.acao_recomendada,
        },
      });
    }),
});

// ========== AI ==========

const aiSubRouter = router({
  updateScore: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        score_recuperacao: z.number().min(0).max(100),
        score_fatores: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditRecoveryCase.update({
        where: { id: input.id },
        data: {
          score_recuperacao: input.score_recuperacao,
          score_fatores: input.score_fatores,
        },
      });
    }),

  updateStrategy: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        estrategia_ia: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditRecoveryCase.update({
        where: { id: input.id },
        data: {
          estrategia_ia: input.estrategia_ia,
        },
      });
    }),
});

// ========== Main Recovery Router ==========

export const recoveryRouter = router({
  cases: casesSubRouter,
  investigations: investigationsSubRouter,
  searches: searchesSubRouter,
  assets: assetsSubRouter,
  actions: actionsSubRouter,
  penhoras: penhorasSubRouter,
  agreements: agreementsSubRouter,
  desconsideracao: desconsideracaoSubRouter,
  jointDebtors: jointDebtorsSubRouter,
  monitoring: monitoringSubRouter,
  alerts: alertsSubRouter,
  events: eventsSubRouter,
  ai: aiSubRouter,
});
