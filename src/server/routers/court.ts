import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ─── Zod enums matching Prisma enums ──────────────────────

const courtTypeEnum = z.enum([
  "VARA_CIVEL",
  "VARA_EMPRESARIAL",
  "VARA_FAZENDA_PUBLICA",
  "VARA_TRABALHO",
  "VARA_FEDERAL",
  "VARA_FAMILIA",
  "VARA_CRIMINAL",
  "VARA_FALENCIAS_RJ",
  "JUIZADO_ESPECIAL",
  "TURMA_RECURSAL",
  "CAMARA_CIVEL",
  "CAMARA_EMPRESARIAL",
  "TURMA_TRF",
  "SECAO_TRF",
  "TURMA_TST",
  "TURMA_STJ",
  "TURMA_STF",
  "PLENARIO",
  "CORTE_ESPECIAL",
  "OUTRO_COURT",
]);

const courtInstanceEnum = z.enum([
  "PRIMEIRA",
  "SEGUNDA",
  "SUPERIOR",
  "SUPREMO",
]);

const judgeTitleEnum = z.enum([
  "JUIZ",
  "JUIZ_FEDERAL",
  "JUIZ_TRABALHO",
  "JUIZ_SUBSTITUTO",
  "DESEMBARGADOR_TJ",
  "DESEMBARGADOR_FEDERAL",
  "MINISTRO_STJ",
  "MINISTRO_TST",
  "MINISTRO_STF",
]);

const courtStaffRoleEnum = z.enum([
  "ESCRIVAO",
  "ESCREVENTE",
  "ANALISTA_JUDICIARIO",
  "OFICIAL_JUSTICA",
  "ASSESSOR",
  "SECRETARIO_CAMARA",
  "CONCILIADOR",
  "PERITO_JUDICIAL",
  "CONTADOR_JUDICIAL",
  "ESTAGIARIO_COURT",
  "OUTRO_STAFF",
]);

// ─── Court Router ─────────────────────────────────────────

export const courtRouter = router({
  // ─── List courts with filters ─────────────────────────
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          state: z.string().optional(),
          tribunal: z.string().optional(),
          courtType: courtTypeEnum.optional(),
          instance: courtInstanceEnum.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search?.trim();

      const where = {
        isActive: true,
        ...(input?.state && { state: input.state }),
        ...(input?.tribunal && {
          tribunal: { contains: input.tribunal, mode: "insensitive" as const },
        }),
        ...(input?.courtType && { courtType: input.courtType }),
        ...(input?.instance && { instance: input.instance }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { shortName: { contains: search, mode: "insensitive" as const } },
            { comarca: { contains: search, mode: "insensitive" as const } },
            { tribunal: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const courts = await ctx.db.court.findMany({
        where,
        include: {
          judges: true,
          _count: {
            select: {
              cases: true,
              staffMembers: true,
            },
          },
        },
        orderBy: [{ state: "asc" }, { comarca: "asc" }, { name: "asc" }],
      });

      return courts;
    }),

  // ─── Get court by ID with all relations ───────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const court = await ctx.db.court.findUnique({
        where: { id: input.id },
        include: {
          judges: {
            where: { isActive: true },
          },
          staffMembers: {
            where: { isActive: true },
          },
          cases: {
            take: 50,
            include: {
              cliente: true,
            },
            orderBy: { created_at: "desc" },
          },
        },
      });

      if (!court) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vara não encontrada.",
        });
      }

      return court;
    }),

  // ─── Create a court ───────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        shortName: z.string().optional(),
        courtType: courtTypeEnum,
        instance: courtInstanceEnum,
        comarca: z.string().min(1, "Comarca é obrigatória"),
        city: z.string().min(1, "Cidade é obrigatória"),
        state: z.string().min(1, "Estado é obrigatório"),
        tribunal: z.string().min(1, "Tribunal é obrigatório"),
        tribunalCode: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        address: z.string().optional(),
        cep: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const court = await ctx.db.court.create({
        data: {
          name: input.name,
          shortName: input.shortName,
          courtType: input.courtType,
          instance: input.instance,
          comarca: input.comarca,
          city: input.city,
          state: input.state,
          tribunal: input.tribunal,
          tribunalCode: input.tribunalCode,
          phone: input.phone,
          email: input.email || undefined,
          address: input.address,
          cep: input.cep,
          notes: input.notes,
        },
      });

      return court;
    }),

  // ─── Update a court ───────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        shortName: z.string().optional().nullable(),
        courtType: courtTypeEnum.optional(),
        instance: courtInstanceEnum.optional(),
        comarca: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        state: z.string().min(1).optional(),
        tribunal: z.string().min(1).optional(),
        tribunalCode: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        address: z.string().optional().nullable(),
        cep: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.court.findUnique({ where: { id } });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vara não encontrada.",
        });
      }

      const court = await ctx.db.court.update({
        where: { id },
        data,
      });

      return court;
    }),

  // ─── Soft delete a court ──────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.court.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vara não encontrada.",
        });
      }

      await ctx.db.court.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  // ─── Quick search for selects ─────────────────────────
  search: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        state: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const search = input.search.trim();
      if (!search) return [];

      const courts = await ctx.db.court.findMany({
        where: {
          isActive: true,
          ...(input.state && { state: input.state }),
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { shortName: { contains: search, mode: "insensitive" as const } },
            { comarca: { contains: search, mode: "insensitive" as const } },
            { tribunal: { contains: search, mode: "insensitive" as const } },
          ],
        },
        select: {
          id: true,
          name: true,
          shortName: true,
          comarca: true,
          state: true,
          tribunal: true,
        },
        take: 20,
        orderBy: [{ state: "asc" }, { name: "asc" }],
      });

      return courts;
    }),

  // ─── Judges sub-router ────────────────────────────────
  judges: router({
    // List judges with filters
    list: protectedProcedure
      .input(
        z
          .object({
            courtId: z.string().optional(),
            search: z.string().optional(),
            title: judgeTitleEnum.optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        const search = input?.search?.trim();

        const where = {
          isActive: true,
          ...(input?.courtId && { courtId: input.courtId }),
          ...(input?.title && { title: input.title }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                registrationNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }),
        };

        const judges = await ctx.db.judge.findMany({
          where,
          include: {
            court: {
              select: {
                id: true,
                name: true,
                shortName: true,
                comarca: true,
                state: true,
              },
            },
          },
          orderBy: { name: "asc" },
        });

        return judges;
      }),

    // Get judge by ID with cases
    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const judge = await ctx.db.judge.findUnique({
          where: { id: input.id },
          include: {
            court: true,
            cases: {
              include: {
                case: {
                  select: {
                    id: true,
                    numero_processo: true,
                    tipo: true,
                    status: true,
                    vara: true,
                    comarca: true,
                    cliente: {
                      select: { id: true, nome: true },
                    },
                  },
                },
              },
              orderBy: { startDate: "desc" },
            },
          },
        });

        if (!judge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Juiz não encontrado.",
          });
        }

        return judge;
      }),

    // Create a judge
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          title: judgeTitleEnum,
          registrationNumber: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          cellphone: z.string().optional(),
          assistantName: z.string().optional(),
          assistantEmail: z.string().email().optional().or(z.literal("")),
          assistantPhone: z.string().optional(),
          courtId: z.string().optional().nullable(),
          chamberName: z.string().optional(),
          specialty: z.string().optional(),
          appointmentDate: z.coerce.date().optional().nullable(),
          tendencyNotes: z.string().optional(),
          avgDecisionDays: z.number().int().positive().optional().nullable(),
          relevantDecisions: z.string().optional(),
          photoUrl: z.string().url().optional().or(z.literal("")),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const judge = await ctx.db.judge.create({
          data: {
            name: input.name,
            title: input.title,
            registrationNumber: input.registrationNumber,
            email: input.email || undefined,
            phone: input.phone,
            cellphone: input.cellphone,
            assistantName: input.assistantName,
            assistantEmail: input.assistantEmail || undefined,
            assistantPhone: input.assistantPhone,
            courtId: input.courtId,
            chamberName: input.chamberName,
            specialty: input.specialty,
            appointmentDate: input.appointmentDate,
            tendencyNotes: input.tendencyNotes,
            avgDecisionDays: input.avgDecisionDays,
            relevantDecisions: input.relevantDecisions,
            photoUrl: input.photoUrl || undefined,
            notes: input.notes,
          },
          include: {
            court: {
              select: { id: true, name: true, shortName: true },
            },
          },
        });

        return judge;
      }),

    // Update a judge
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          title: judgeTitleEnum.optional(),
          registrationNumber: z.string().optional().nullable(),
          email: z.string().email().optional().nullable().or(z.literal("")),
          phone: z.string().optional().nullable(),
          cellphone: z.string().optional().nullable(),
          assistantName: z.string().optional().nullable(),
          assistantEmail: z
            .string()
            .email()
            .optional()
            .nullable()
            .or(z.literal("")),
          assistantPhone: z.string().optional().nullable(),
          courtId: z.string().optional().nullable(),
          chamberName: z.string().optional().nullable(),
          specialty: z.string().optional().nullable(),
          appointmentDate: z.coerce.date().optional().nullable(),
          tendencyNotes: z.string().optional().nullable(),
          avgDecisionDays: z
            .number()
            .int()
            .positive()
            .optional()
            .nullable(),
          relevantDecisions: z.string().optional().nullable(),
          photoUrl: z.string().url().optional().nullable().or(z.literal("")),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        const existing = await ctx.db.judge.findUnique({ where: { id } });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Juiz não encontrado.",
          });
        }

        const judge = await ctx.db.judge.update({
          where: { id },
          data,
          include: {
            court: {
              select: { id: true, name: true, shortName: true },
            },
          },
        });

        return judge;
      }),

    // Soft delete a judge
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.judge.findUnique({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Juiz não encontrado.",
          });
        }

        await ctx.db.judge.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        return { success: true };
      }),

    // Quick search for selects
    search: protectedProcedure
      .input(
        z.object({
          search: z.string(),
          courtId: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const search = input.search.trim();
        if (!search) return [];

        const judges = await ctx.db.judge.findMany({
          where: {
            isActive: true,
            ...(input.courtId && { courtId: input.courtId }),
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                registrationNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            title: true,
            courtId: true,
            court: {
              select: {
                name: true,
                shortName: true,
              },
            },
          },
          take: 20,
          orderBy: { name: "asc" },
        });

        return judges;
      }),
  }),

  // ─── Court Staff sub-router ───────────────────────────
  staff: router({
    // List court staff
    list: protectedProcedure
      .input(
        z.object({
          courtId: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const staff = await ctx.db.courtStaff.findMany({
          where: {
            courtId: input.courtId,
            isActive: true,
          },
          include: {
            court: {
              select: { id: true, name: true, shortName: true },
            },
          },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        });

        return staff;
      }),

    // Create a staff member
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          role: courtStaffRoleEnum,
          customRole: z.string().optional(),
          courtId: z.string(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          cellphone: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify the court exists
        const court = await ctx.db.court.findUnique({
          where: { id: input.courtId },
        });
        if (!court) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vara não encontrada.",
          });
        }

        const member = await ctx.db.courtStaff.create({
          data: {
            name: input.name,
            role: input.role,
            customRole: input.customRole,
            courtId: input.courtId,
            email: input.email || undefined,
            phone: input.phone,
            cellphone: input.cellphone,
            notes: input.notes,
          },
          include: {
            court: {
              select: { id: true, name: true, shortName: true },
            },
          },
        });

        return member;
      }),

    // Update a staff member
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          role: courtStaffRoleEnum.optional(),
          customRole: z.string().optional().nullable(),
          courtId: z.string().optional(),
          email: z.string().email().optional().nullable().or(z.literal("")),
          phone: z.string().optional().nullable(),
          cellphone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        const existing = await ctx.db.courtStaff.findUnique({
          where: { id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Servidor não encontrado.",
          });
        }

        const member = await ctx.db.courtStaff.update({
          where: { id },
          data,
          include: {
            court: {
              select: { id: true, name: true, shortName: true },
            },
          },
        });

        return member;
      }),

    // Hard delete a staff member
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.courtStaff.findUnique({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Servidor não encontrado.",
          });
        }

        await ctx.db.courtStaff.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),
  }),

  // ─── Case Judges sub-router ───────────────────────────
  caseJudges: router({
    // Assign a judge to a case
    assign: protectedProcedure
      .input(
        z.object({
          caseId: z.string(),
          judgeId: z.string(),
          role: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify case exists
        const caseRecord = await ctx.db.case.findUnique({
          where: { id: input.caseId },
        });
        if (!caseRecord) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Processo não encontrado.",
          });
        }

        // Verify judge exists
        const judge = await ctx.db.judge.findUnique({
          where: { id: input.judgeId },
        });
        if (!judge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Juiz não encontrado.",
          });
        }

        // Set all existing current judges on this case to not current
        await ctx.db.caseJudge.updateMany({
          where: {
            caseId: input.caseId,
            isCurrent: true,
          },
          data: {
            isCurrent: false,
            endDate: new Date(),
          },
        });

        // Create the new assignment (upsert in case of re-assignment)
        const assignment = await ctx.db.caseJudge.upsert({
          where: {
            caseId_judgeId: {
              caseId: input.caseId,
              judgeId: input.judgeId,
            },
          },
          create: {
            caseId: input.caseId,
            judgeId: input.judgeId,
            role: input.role,
            startDate: new Date(),
            isCurrent: true,
          },
          update: {
            role: input.role,
            startDate: new Date(),
            endDate: null,
            isCurrent: true,
          },
          include: {
            judge: {
              select: { id: true, name: true, title: true },
            },
            case: {
              select: { id: true, numero_processo: true },
            },
          },
        });

        return assignment;
      }),

    // Remove a judge from a case
    remove: protectedProcedure
      .input(
        z.object({
          caseId: z.string(),
          judgeId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.caseJudge.findUnique({
          where: {
            caseId_judgeId: {
              caseId: input.caseId,
              judgeId: input.judgeId,
            },
          },
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Vínculo juiz-processo não encontrado.",
          });
        }

        await ctx.db.caseJudge.delete({
          where: {
            caseId_judgeId: {
              caseId: input.caseId,
              judgeId: input.judgeId,
            },
          },
        });

        return { success: true };
      }),
  }),
});
