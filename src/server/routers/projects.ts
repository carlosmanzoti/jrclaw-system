import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

export const projectsRouter = router({
  // ─── List with search, filters, and count ─────────────
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.string().optional(),
          categoria: z.string().optional(),
          prioridade: z.string().optional(),
          cliente_id: z.string().optional(),
          advogado_id: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const search = input?.search?.trim();

      const where = {
        ...(input?.status && { status: input.status as never }),
        ...(input?.categoria && { categoria: input.categoria as never }),
        ...(input?.prioridade && { prioridade: input.prioridade as never }),
        ...(input?.cliente_id && { cliente_id: input.cliente_id }),
        ...(input?.advogado_id && { advogado_responsavel_id: input.advogado_id }),
        ...(search && {
          OR: [
            { titulo: { contains: search, mode: "insensitive" as const } },
            { codigo: { contains: search, mode: "insensitive" as const } },
            { cliente: { nome: { contains: search, mode: "insensitive" as const } } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.project.findMany({
          take: limit + 1,
          cursor: input?.cursor ? { id: input.cursor } : undefined,
          where,
          include: {
            cliente: { select: { id: true, nome: true } },
            advogado_responsavel: { select: { id: true, name: true } },
            tarefas: { select: { status: true } },
            _count: { select: { tarefas: true, marcos: true, processos: true } },
          },
          orderBy: { updated_at: "desc" },
        }),
        ctx.db.project.count({ where }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor, total };
    }),

  // ─── Stats / KPIs ─────────────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [ativos, aguardando, concluidosMes, valorTotal] = await Promise.all([
      ctx.db.project.count({
        where: { status: { in: ["EM_ANDAMENTO", "PLANEJAMENTO"] } },
      }),
      ctx.db.project.count({
        where: { status: { in: ["AGUARDANDO_CLIENTE", "AGUARDANDO_TERCEIRO", "AGUARDANDO_ORGAO"] } },
      }),
      ctx.db.project.count({
        where: {
          status: "CONCLUIDO",
          data_conclusao_real: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      ctx.db.project.aggregate({
        where: { status: { notIn: ["CANCELADO", "CONCLUIDO"] } },
        _sum: { valor_envolvido: true },
      }),
    ]);

    return {
      ativos,
      aguardando,
      concluidosMes,
      valorTotal: valorTotal._sum.valor_envolvido,
    };
  }),

  // ─── Get by ID (full detail) ──────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          cliente: true,
          advogado_responsavel: { select: { id: true, name: true, email: true } },
          equipe: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
          stakeholders: { include: { person: { select: { id: true, nome: true, cpf_cnpj: true, tipo: true } } } },
          etapas: {
            orderBy: { ordem: "asc" },
            include: {
              tarefas: {
                orderBy: { created_at: "asc" },
                include: {
                  responsavel: { select: { id: true, name: true } },
                  checklist: { orderBy: { ordem: "asc" } },
                  _count: { select: { comentarios: true, documentos: true } },
                },
              },
            },
          },
          marcos: { orderBy: { data_prevista: "asc" } },
          tarefas: {
            orderBy: { created_at: "desc" },
            include: {
              responsavel: { select: { id: true, name: true } },
              phase: { select: { id: true, titulo: true } },
              checklist: { orderBy: { ordem: "asc" } },
              _count: { select: { comentarios: true, documentos: true } },
            },
          },
          processos: {
            select: {
              id: true, numero_processo: true, tipo: true, status: true,
              advogado_responsavel: { select: { name: true } },
              prazos: { where: { status: "PENDENTE" }, orderBy: { data_limite: "asc" }, take: 1 },
              cliente: { select: { nome: true } },
            },
          },
          despesas: { orderBy: { data: "desc" } },
          anotacoes: {
            orderBy: [{ fixada: "desc" }, { created_at: "desc" }],
            include: { user: { select: { id: true, name: true } } },
          },
          atividades: {
            orderBy: { data: "desc" },
            take: 50,
            include: { user: { select: { id: true, name: true } } },
          },
        },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
      return project;
    }),

  // ─── Create ───────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        titulo: z.string().min(1),
        cliente_id: z.string(),
        categoria: z.string(),
        descricao: z.string().optional().nullable(),
        valor_envolvido: z.number().optional().nullable(),
        valor_honorarios: z.number().optional().nullable(),
        prioridade: z.string().optional(),
        data_inicio: z.coerce.date().optional().nullable(),
        data_prevista_conclusao: z.coerce.date().optional().nullable(),
        advogado_responsavel_id: z.string(),
        visivel_portal: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        template_id: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-generate code: PRJ-YYYY-NNN
      const year = new Date().getFullYear();
      const count = await ctx.db.project.count({
        where: { codigo: { startsWith: `PRJ-${year}-` } },
      });
      const codigo = `PRJ-${year}-${String(count + 1).padStart(3, "0")}`;

      const { template_id, ...data } = input;

      const project = await ctx.db.project.create({
        data: {
          ...data,
          codigo,
          categoria: data.categoria as never,
          prioridade: (data.prioridade as never) || ("MEDIA" as never),
          valor_envolvido: data.valor_envolvido ?? undefined,
          valor_honorarios: data.valor_honorarios ?? undefined,
          tags: data.tags || [],
          created_by_id: ctx.session.user.id,
        },
      });

      // Apply template if provided
      if (template_id) {
        const template = await ctx.db.projectTemplate.findUnique({ where: { id: template_id } });
        if (template) {
          // Create phases from template
          const fasesRaw = template.fases_padrao as Array<{
            titulo: string;
            descricao?: string;
            ordem: number;
            tarefas_padrao?: Array<{ titulo: string; tipo?: string; descricao?: string }>;
          }> | null;

          if (fasesRaw) {
            for (const fase of fasesRaw) {
              const createdPhase = await ctx.db.projectPhase.create({
                data: {
                  project_id: project.id,
                  titulo: fase.titulo,
                  descricao: fase.descricao || null,
                  ordem: fase.ordem,
                },
              });

              // Create tasks from template phase
              if (fase.tarefas_padrao) {
                for (const tarefa of fase.tarefas_padrao) {
                  await ctx.db.projectTask.create({
                    data: {
                      project_id: project.id,
                      phase_id: createdPhase.id,
                      titulo: tarefa.titulo,
                      descricao: tarefa.descricao || null,
                      tipo: (tarefa.tipo as never) || ("OUTRO" as never),
                      responsavel_id: input.advogado_responsavel_id,
                    },
                  });
                }
              }
            }
          }

          // Create milestones from template
          const marcosRaw = template.marcos_padrao as Array<{
            titulo: string;
            descricao?: string;
            offset_dias: number;
          }> | null;

          if (marcosRaw && input.data_inicio) {
            const startDate = new Date(input.data_inicio);
            for (const marco of marcosRaw) {
              const dataPrevista = new Date(startDate);
              dataPrevista.setDate(dataPrevista.getDate() + marco.offset_dias);
              await ctx.db.projectMilestone.create({
                data: {
                  project_id: project.id,
                  titulo: marco.titulo,
                  descricao: marco.descricao || null,
                  data_prevista: dataPrevista,
                },
              });
            }
          }
        }
      }

      return project;
    }),

  // ─── Update ───────────────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        descricao: z.string().optional().nullable(),
        categoria: z.string().optional(),
        status: z.string().optional(),
        prioridade: z.string().optional(),
        valor_envolvido: z.number().optional().nullable(),
        valor_honorarios: z.number().optional().nullable(),
        data_inicio: z.coerce.date().optional().nullable(),
        data_prevista_conclusao: z.coerce.date().optional().nullable(),
        data_conclusao_real: z.coerce.date().optional().nullable(),
        advogado_responsavel_id: z.string().optional(),
        visivel_portal: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.project.update({
        where: { id },
        data: {
          ...data,
          categoria: data.categoria as never,
          status: data.status as never,
          prioridade: data.prioridade as never,
          valor_envolvido: data.valor_envolvido ?? undefined,
          valor_honorarios: data.valor_honorarios ?? undefined,
        },
      });
    }),

  // ─── Templates ────────────────────────────────────────
  templates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.projectTemplate.findMany({
      where: { ativo: true },
      orderBy: { titulo: "asc" },
    });
  }),

  // ─── Template CRUD (admin) ──────────────────────────
  allTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.projectTemplate.findMany({
      orderBy: [{ ativo: "desc" }, { titulo: "asc" }],
    });
  }),

  templateById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.projectTemplate.findUnique({
        where: { id: input.id },
      });
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template não encontrado" });
      }
      return template;
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        titulo: z.string().min(1, "Título é obrigatório"),
        categoria: z.string(),
        descricao: z.string().optional().nullable(),
        fases_padrao: z.any().optional().nullable(),
        marcos_padrao: z.any().optional().nullable(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTemplate.create({
        data: {
          titulo: input.titulo,
          categoria: input.categoria as never,
          descricao: input.descricao ?? null,
          fases_padrao: input.fases_padrao ?? undefined,
          marcos_padrao: input.marcos_padrao ?? undefined,
          ativo: input.ativo ?? true,
        },
      });
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().min(1).optional(),
        categoria: z.string().optional(),
        descricao: z.string().optional().nullable(),
        fases_padrao: z.any().optional().nullable(),
        marcos_padrao: z.any().optional().nullable(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.projectTemplate.update({
        where: { id },
        data: {
          ...data,
          categoria: data.categoria as never,
          fases_padrao: data.fases_padrao ?? undefined,
          marcos_padrao: data.marcos_padrao ?? undefined,
        },
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTemplate.delete({ where: { id: input.id } });
    }),

  // ─── Phase CRUD ───────────────────────────────────────
  addPhase: protectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        titulo: z.string().min(1),
        descricao: z.string().optional().nullable(),
        ordem: z.number().optional(),
        cor: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ordem = input.ordem ?? (await ctx.db.projectPhase.count({ where: { project_id: input.project_id } }));
      return ctx.db.projectPhase.create({
        data: { ...input, ordem },
      });
    }),

  updatePhase: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        descricao: z.string().optional().nullable(),
        status: z.string().optional(),
        ordem: z.number().optional(),
        cor: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.projectPhase.update({
        where: { id },
        data: { ...data, status: data.status as never },
      });
    }),

  deletePhase: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectPhase.delete({ where: { id: input.id } });
    }),

  // ─── Task CRUD ────────────────────────────────────────
  addTask: protectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        phase_id: z.string().optional().nullable(),
        case_id: z.string().optional().nullable(),
        titulo: z.string().min(1),
        descricao: z.string().optional().nullable(),
        tipo: z.string().optional(),
        prioridade: z.string().optional(),
        responsavel_id: z.string().optional().nullable(),
        data_limite: z.coerce.date().optional().nullable(),
        data_alerta: z.coerce.date().optional().nullable(),
        estimativa_horas: z.number().optional().nullable(),
        campos_especificos: z.any().optional().nullable(),
        dependencia_tarefa_id: z.string().optional().nullable(),
        notificar_cliente: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTask.create({
        data: {
          ...input,
          tipo: (input.tipo as never) || ("OUTRO" as never),
          prioridade: (input.prioridade as never) || ("MEDIA" as never),
          estimativa_horas: input.estimativa_horas ?? undefined,
          campos_especificos: input.campos_especificos ?? undefined,
        },
      });
    }),

  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        descricao: z.string().optional().nullable(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        prioridade: z.string().optional(),
        phase_id: z.string().optional().nullable(),
        responsavel_id: z.string().optional().nullable(),
        data_limite: z.coerce.date().optional().nullable(),
        data_alerta: z.coerce.date().optional().nullable(),
        estimativa_horas: z.number().optional().nullable(),
        horas_gastas: z.number().optional().nullable(),
        campos_especificos: z.any().optional().nullable(),
        dependencia_tarefa_id: z.string().optional().nullable(),
        notificar_cliente: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const task = await ctx.db.projectTask.update({
        where: { id },
        data: {
          ...data,
          tipo: data.tipo as never,
          status: data.status as never,
          prioridade: data.prioridade as never,
          estimativa_horas: data.estimativa_horas ?? undefined,
          horas_gastas: data.horas_gastas ?? undefined,
          campos_especificos: data.campos_especificos ?? undefined,
          data_conclusao: data.status === "CONCLUIDA" ? new Date() : undefined,
        },
      });

      // Recalculate phase progress if task has a phase
      if (task.phase_id) {
        const phaseTasks = await ctx.db.projectTask.findMany({
          where: { phase_id: task.phase_id },
          select: { status: true },
        });
        const total = phaseTasks.length;
        const done = phaseTasks.filter((t) => t.status === "CONCLUIDA").length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        await ctx.db.projectPhase.update({
          where: { id: task.phase_id },
          data: { percentual_conclusao: pct },
        });
      }

      // Create activity if task completed and notificar_cliente
      if (data.status === "CONCLUIDA" && task.notificar_cliente) {
        await ctx.db.activity.create({
          data: {
            project_id: task.project_id,
            task_id: task.id,
            user_id: ctx.session.user.id!,
            tipo: "TAREFA_PROJETO",
            descricao: `Tarefa concluída: ${task.titulo}`,
            data: new Date(),
            visivel_portal: true,
          },
        });
      }

      return task;
    }),

  updateTaskStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.projectTask.update({
        where: { id: input.id },
        data: {
          status: input.status as never,
          data_conclusao: input.status === "CONCLUIDA" ? new Date() : null,
        },
      });

      // Recalculate phase progress
      if (task.phase_id) {
        const phaseTasks = await ctx.db.projectTask.findMany({
          where: { phase_id: task.phase_id },
          select: { status: true },
        });
        const total = phaseTasks.length;
        const done = phaseTasks.filter((t) => t.status === "CONCLUIDA").length;
        await ctx.db.projectPhase.update({
          where: { id: task.phase_id },
          data: { percentual_conclusao: total > 0 ? Math.round((done / total) * 100) : 0 },
        });
      }

      return task;
    }),

  deleteTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTask.delete({ where: { id: input.id } });
    }),

  // ─── Task detail (for modal) ──────────────────────────
  getTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.projectTask.findUnique({
        where: { id: input.id },
        include: {
          responsavel: { select: { id: true, name: true } },
          phase: { select: { id: true, titulo: true } },
          checklist: { orderBy: { ordem: "asc" }, include: { concluido_por: { select: { name: true } } } },
          comentarios: {
            orderBy: { created_at: "desc" },
            include: { user: { select: { id: true, name: true } } },
          },
          dependencia_tarefa: { select: { id: true, titulo: true, status: true } },
          tarefas_dependentes: { select: { id: true, titulo: true, status: true } },
        },
      });
    }),

  // ─── Milestones ───────────────────────────────────────
  addMilestone: protectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        titulo: z.string().min(1),
        descricao: z.string().optional().nullable(),
        data_prevista: z.coerce.date().optional().nullable(),
        impacto: z.string().optional(),
        notificar_cliente: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMilestone.create({
        data: {
          ...input,
          impacto: (input.impacto as never) || ("MEDIO" as never),
        },
      });
    }),

  updateMilestone: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        titulo: z.string().optional(),
        descricao: z.string().optional().nullable(),
        data_prevista: z.coerce.date().optional().nullable(),
        status: z.string().optional(),
        impacto: z.string().optional(),
        notificar_cliente: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const milestone = await ctx.db.projectMilestone.update({
        where: { id },
        data: {
          ...data,
          status: data.status as never,
          impacto: data.impacto as never,
          data_alcancada: data.status === "ALCANCADO" ? new Date() : undefined,
        },
      });

      // Create activity if milestone achieved and notificar_cliente
      if (data.status === "ALCANCADO" && milestone.notificar_cliente) {
        await ctx.db.activity.create({
          data: {
            project_id: milestone.project_id,
            user_id: ctx.session.user.id!,
            tipo: "MARCO_ALCANCADO",
            descricao: `Marco alcançado: ${milestone.titulo}`,
            data: new Date(),
            visivel_portal: true,
          },
        });
      }

      return milestone;
    }),

  deleteMilestone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectMilestone.delete({ where: { id: input.id } });
    }),

  // ─── Notes ────────────────────────────────────────────
  addNote: protectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        conteudo: z.string().min(1),
        fixada: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectNote.create({
        data: { ...input, user_id: ctx.session.user.id! },
      });
    }),

  updateNote: protectedProcedure
    .input(z.object({ id: z.string(), conteudo: z.string().optional(), fixada: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.projectNote.update({ where: { id }, data });
    }),

  deleteNote: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectNote.delete({ where: { id: input.id } });
    }),

  // ─── Stakeholders ─────────────────────────────────────
  addStakeholder: protectedProcedure
    .input(z.object({ project_id: z.string(), person_id: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectStakeholder.create({
        data: { ...input, role: input.role as never },
      });
    }),

  removeStakeholder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectStakeholder.delete({ where: { id: input.id } });
    }),

  // ─── Team ─────────────────────────────────────────────
  addTeamMember: protectedProcedure
    .input(z.object({ project_id: z.string(), user_id: z.string(), role: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTeam.create({
        data: { ...input, role: input.role as never },
      });
    }),

  removeTeamMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTeam.delete({ where: { id: input.id } });
    }),

  // ─── Checklist ────────────────────────────────────────
  addCheckItem: protectedProcedure
    .input(z.object({ task_id: z.string(), descricao: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.projectTaskCheckItem.aggregate({
        where: { task_id: input.task_id },
        _max: { ordem: true },
      });
      return ctx.db.projectTaskCheckItem.create({
        data: { ...input, ordem: (maxOrder._max.ordem ?? -1) + 1 },
      });
    }),

  toggleCheckItem: protectedProcedure
    .input(z.object({ id: z.string(), concluido: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTaskCheckItem.update({
        where: { id: input.id },
        data: {
          concluido: input.concluido,
          concluido_por_id: input.concluido ? ctx.session.user.id : null,
          concluido_em: input.concluido ? new Date() : null,
        },
      });
    }),

  deleteCheckItem: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTaskCheckItem.delete({ where: { id: input.id } });
    }),

  // ─── Comments ─────────────────────────────────────────
  addComment: protectedProcedure
    .input(z.object({ task_id: z.string(), conteudo: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTaskComment.create({
        data: { ...input, user_id: ctx.session.user.id! },
        include: { user: { select: { id: true, name: true } } },
      });
    }),

  deleteComment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectTaskComment.delete({ where: { id: input.id } });
    }),

  // ─── Expenses ────────────────────────────────────────
  listExpenses: protectedProcedure
    .input(z.object({ project_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.projectExpense.findMany({
        where: { project_id: input.project_id },
        orderBy: { data: "desc" },
      });
    }),

  addExpense: protectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        descricao: z.string().min(1),
        valor: z.number().positive(),
        data: z.coerce.date(),
        categoria: z.string(),
        comprovante_url: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectExpense.create({
        data: { ...input, created_by_id: ctx.session.user.id },
      });
    }),

  deleteExpense: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.projectExpense.delete({ where: { id: input.id } });
    }),

  // ─── Communication Activities ───────────────────────
  addCommunication: protectedProcedure
    .input(
      z.object({
        project_id: z.string(),
        tipo: z.string(),
        descricao: z.string().min(1),
        resultado: z.string().optional().nullable(),
        duracao_minutos: z.number().optional().nullable(),
        data: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.activity.create({
        data: {
          project_id: input.project_id,
          user_id: ctx.session.user.id!,
          tipo: input.tipo as never,
          descricao: input.descricao,
          resultado: input.resultado,
          duracao_minutos: input.duracao_minutos,
          data: input.data ?? new Date(),
          visivel_portal: false,
        },
        include: { user: { select: { id: true, name: true } } },
      });
    }),

  // ─── Cases for linking (filtered by client) ─────────
  casesForLinkByClient: protectedProcedure
    .input(z.object({ cliente_id: z.string(), exclude_project_id: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.case.findMany({
        where: {
          cliente_id: input.cliente_id,
          status: "ATIVO",
          ...(input.exclude_project_id && {
            OR: [
              { projeto_id: null },
              { projeto_id: input.exclude_project_id },
            ],
          }),
        },
        select: { id: true, numero_processo: true, tipo: true, status: true, projeto_id: true },
        orderBy: { updated_at: "desc" },
      });
    }),

  linkCase: protectedProcedure
    .input(z.object({ case_id: z.string(), project_id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.case.update({
        where: { id: input.case_id },
        data: { projeto_id: input.project_id },
      });
    }),

  unlinkCase: protectedProcedure
    .input(z.object({ case_id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.case.update({
        where: { id: input.case_id },
        data: { projeto_id: null },
      });
    }),

  // ─── Helpers ──────────────────────────────────────────
  casesForLink: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.case.findMany({
        where: {
          status: "ATIVO",
          ...(input?.search && {
            OR: [
              { numero_processo: { contains: input.search, mode: "insensitive" as const } },
              { cliente: { nome: { contains: input.search, mode: "insensitive" as const } } },
            ],
          }),
        },
        select: { id: true, numero_processo: true, tipo: true, cliente: { select: { nome: true } } },
        take: 20,
        orderBy: { updated_at: "desc" },
      });
    }),
});
