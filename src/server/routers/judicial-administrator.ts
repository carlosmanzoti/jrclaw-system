import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

const JudicialAdminRoleEnum = z.enum([
  "ADMINISTRADOR_PRINCIPAL",
  "ADVOGADO_AJ",
  "CONTADOR_AJ",
  "ECONOMISTA",
  "ANALISTA_AJ",
  "GESTOR_OPERACIONAL",
  "SECRETARIO_AJ",
  "ESTAGIARIO_AJ",
  "OUTRO_AJ",
]);

export const judicialAdminRouter = router({
  // ─── List administrators with filters ─────────────────────
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          state: z.string().optional(),
          rating: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search?.trim();

      const where = {
        isActive: true,
        ...(input?.state && { state: input.state }),
        ...(input?.rating && { rating: input.rating }),
        ...(search && {
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { tradeName: { contains: search, mode: "insensitive" as const } },
            { cnpj: { contains: search, mode: "insensitive" as const } },
            { mainContactName: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const items = await ctx.db.judicialAdministrator.findMany({
        where,
        include: {
          teamMembers: {
            where: { isActive: true },
          },
          _count: {
            select: { cases: true },
          },
        },
        orderBy: { companyName: "asc" },
      });

      return items;
    }),

  // ─── Get by ID with all relations ─────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const administrator = await ctx.db.judicialAdministrator.findUnique({
        where: { id: input.id },
        include: {
          teamMembers: {
            where: { isActive: true },
            orderBy: { role: "asc" },
          },
          cases: {
            include: {
              case: {
                include: {
                  cliente: true,
                },
              },
            },
            orderBy: { appointmentDate: "desc" },
          },
        },
      });

      if (!administrator) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Administrador judicial não encontrado",
        });
      }

      return administrator;
    }),

  // ─── Create administrator ─────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        tradeName: z.string().optional().nullable(),
        cnpj: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        mainContactName: z.string().optional().nullable(),
        mainContactEmail: z.string().optional().nullable(),
        mainContactPhone: z.string().optional().nullable(),
        rating: z.number().int().min(1).max(5).optional().nullable(),
        specialties: z.string().optional().nullable(),
        avgFeePercentage: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.cnpj) {
        const existing = await ctx.db.judicialAdministrator.findUnique({
          where: { cnpj: input.cnpj },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe um administrador judicial com este CNPJ",
          });
        }
      }

      return ctx.db.judicialAdministrator.create({
        data: input,
      });
    }),

  // ─── Update administrator ─────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        companyName: z.string().min(1).optional(),
        tradeName: z.string().optional().nullable(),
        cnpj: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        website: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        mainContactName: z.string().optional().nullable(),
        mainContactEmail: z.string().optional().nullable(),
        mainContactPhone: z.string().optional().nullable(),
        rating: z.number().int().min(1).max(5).optional().nullable(),
        specialties: z.string().optional().nullable(),
        avgFeePercentage: z.number().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      if (data.cnpj) {
        const existing = await ctx.db.judicialAdministrator.findFirst({
          where: { cnpj: data.cnpj, NOT: { id } },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Já existe outro administrador judicial com este CNPJ",
          });
        }
      }

      return ctx.db.judicialAdministrator.update({
        where: { id },
        data,
      });
    }),

  // ─── Soft delete ───────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.judicialAdministrator.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),

  // ─── Quick search for selects ──────────────────────────────
  search: protectedProcedure
    .input(z.object({ search: z.string() }))
    .query(async ({ ctx, input }) => {
      const search = input.search.trim();
      if (!search) return [];

      return ctx.db.judicialAdministrator.findMany({
        where: {
          isActive: true,
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { tradeName: { contains: search, mode: "insensitive" as const } },
            { cnpj: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          tradeName: true,
          cnpj: true,
          city: true,
          state: true,
        },
        orderBy: { companyName: "asc" },
        take: 20,
      });
    }),

  // ─── Team (nested router) ─────────────────────────────────
  team: router({
    // List team members of an administrator
    list: protectedProcedure
      .input(z.object({ administratorId: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.judicialAdminTeamMember.findMany({
          where: {
            administratorId: input.administratorId,
            isActive: true,
          },
          orderBy: { role: "asc" },
        });
      }),

    // Add team member
    add: protectedProcedure
      .input(
        z.object({
          administratorId: z.string(),
          name: z.string().min(1),
          role: JudicialAdminRoleEnum,
          customRole: z.string().optional().nullable(),
          cpf: z.string().optional().nullable(),
          oabNumber: z.string().optional().nullable(),
          crcNumber: z.string().optional().nullable(),
          email: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          cellphone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify the administrator exists
        const administrator = await ctx.db.judicialAdministrator.findUnique({
          where: { id: input.administratorId },
        });
        if (!administrator) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Administrador judicial não encontrado",
          });
        }

        return ctx.db.judicialAdminTeamMember.create({
          data: {
            ...input,
            role: input.role as never,
          },
        });
      }),

    // Update team member
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          role: JudicialAdminRoleEnum.optional(),
          customRole: z.string().optional().nullable(),
          cpf: z.string().optional().nullable(),
          oabNumber: z.string().optional().nullable(),
          crcNumber: z.string().optional().nullable(),
          email: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          cellphone: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return ctx.db.judicialAdminTeamMember.update({
          where: { id },
          data: {
            ...data,
            role: data.role as never,
          },
        });
      }),

    // Remove team member (soft delete)
    remove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.judicialAdminTeamMember.update({
          where: { id: input.id },
          data: { isActive: false },
        });
      }),
  }),

  // ─── Assign administrator to a case ───────────────────────
  assignToCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string(),
        administratorId: z.string(),
        appointmentDate: z.coerce.date().optional().nullable(),
        feePercentage: z.number().optional().nullable(),
        feeAmount: z.number().optional().nullable(),
        status: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify both the case and administrator exist
      const [caseExists, adminExists] = await Promise.all([
        ctx.db.case.findUnique({ where: { id: input.caseId } }),
        ctx.db.judicialAdministrator.findUnique({
          where: { id: input.administratorId },
        }),
      ]);

      if (!caseExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Processo não encontrado",
        });
      }
      if (!adminExists) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Administrador judicial não encontrado",
        });
      }

      // Check for existing assignment
      const existing = await ctx.db.caseAdministrator.findUnique({
        where: {
          caseId_administratorId: {
            caseId: input.caseId,
            administratorId: input.administratorId,
          },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este administrador já está vinculado a este processo",
        });
      }

      return ctx.db.caseAdministrator.create({
        data: {
          caseId: input.caseId,
          administratorId: input.administratorId,
          appointmentDate: input.appointmentDate ?? undefined,
          feePercentage: input.feePercentage ?? undefined,
          feeAmount: input.feeAmount != null ? BigInt(Math.round(input.feeAmount)) : undefined,
          status: input.status ?? undefined,
        },
      });
    }),

  // ─── Remove administrator from case (hard delete) ─────────
  removeFromCase: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.caseAdministrator.delete({
        where: { id: input.id },
      });
    }),
});
