import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ─── Zod enums matching Prisma enums ──────────────────────

const clientRelationshipTypeEnum = z.enum([
  "SOCIO",
  "SOCIO_ADMINISTRADOR",
  "SOCIO_MINORITARIO",
  "ACIONISTA",
  "CONSELHEIRO",
  "CEO",
  "CFO",
  "COO",
  "DIRETOR",
  "GERENTE_GERAL",
  "GERENTE",
  "SUPERVISOR",
  "FUNCIONARIO",
  "CONTADOR_OP",
  "ADVOGADO_INTERNO",
  "CONSULTOR_EXT",
  "PREPOSTO",
  "CONJUGE",
  "FILHO",
  "PAI_MAE",
  "IRMAO",
  "PARENTE",
  "POLITICO",
  "CREDOR_CHAVE",
  "FORNECEDOR_CHAVE",
  "PARCEIRO_COMERCIAL",
  "AGENTE_FINANCEIRO",
  "CORRETOR",
  "DESPACHANTE",
  "PERITO_REL",
  "MEDIADOR",
  "ARBITRO",
  "LEILOEIRO",
  "TRADUTOR",
  "OUTRO_REL",
]);

const influenceLevelEnum = z.enum([
  "CRITICO",
  "ALTO_INF",
  "MEDIO_INF",
  "BAIXO_INF",
  "INFORMATIVO",
]);

// ─── Category mapping for influence map ───────────────────

const CATEGORY_MAP: Record<string, string[]> = {
  societario: [
    "SOCIO",
    "SOCIO_ADMINISTRADOR",
    "SOCIO_MINORITARIO",
    "ACIONISTA",
    "CONSELHEIRO",
  ],
  diretoria: [
    "CEO",
    "CFO",
    "COO",
    "DIRETOR",
    "GERENTE_GERAL",
    "GERENTE",
    "SUPERVISOR",
  ],
  operacional: [
    "FUNCIONARIO",
    "CONTADOR_OP",
    "ADVOGADO_INTERNO",
    "CONSULTOR_EXT",
    "PREPOSTO",
  ],
  familiar: ["CONJUGE", "FILHO", "PAI_MAE", "IRMAO", "PARENTE"],
  influencia: [
    "POLITICO",
    "CREDOR_CHAVE",
    "FORNECEDOR_CHAVE",
    "PARCEIRO_COMERCIAL",
    "AGENTE_FINANCEIRO",
    "CORRETOR",
    "DESPACHANTE",
  ],
  profissionais: [
    "PERITO_REL",
    "MEDIADOR",
    "ARBITRO",
    "LEILOEIRO",
    "TRADUTOR",
    "OUTRO_REL",
  ],
};

// ─── Client Relations Router ──────────────────────────────

export const clientRelationsRouter = router({
  // ─── List related persons for a client ────────────────
  list: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const persons = await ctx.db.clientRelatedPerson.findMany({
        where: {
          clientId: input.clientId,
          isActive: true,
        },
        include: {
          linkedPerson: {
            select: {
              id: true,
              nome: true,
              tipo: true,
            },
          },
        },
        orderBy: [
          { isKeyPerson: "desc" },
          { influenceLevel: "asc" },
          { name: "asc" },
        ],
      });

      return persons;
    }),

  // ─── Get structured data for influence map visualization ─
  getInfluenceMap: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const persons = await ctx.db.clientRelatedPerson.findMany({
        where: {
          clientId: input.clientId,
          isActive: true,
        },
        include: {
          linkedPerson: {
            select: {
              id: true,
              nome: true,
              tipo: true,
            },
          },
        },
        orderBy: [
          { isKeyPerson: "desc" },
          { influenceLevel: "asc" },
          { name: "asc" },
        ],
      });

      const keyPersons = persons.filter((p) => p.isKeyPerson);

      const byCategory = {
        societario: persons.filter((p) =>
          CATEGORY_MAP.societario.includes(p.relationship)
        ),
        diretoria: persons.filter((p) =>
          CATEGORY_MAP.diretoria.includes(p.relationship)
        ),
        operacional: persons.filter((p) =>
          CATEGORY_MAP.operacional.includes(p.relationship)
        ),
        familiar: persons.filter((p) =>
          CATEGORY_MAP.familiar.includes(p.relationship)
        ),
        influencia: persons.filter((p) =>
          CATEGORY_MAP.influencia.includes(p.relationship)
        ),
        profissionais: persons.filter((p) =>
          CATEGORY_MAP.profissionais.includes(p.relationship)
        ),
      };

      const highInfluenceCount = persons.filter(
        (p) => p.influenceLevel === "CRITICO" || p.influenceLevel === "ALTO_INF"
      ).length;

      const withDecisionPowerCount = persons.filter(
        (p) => p.decisionPower
      ).length;

      const stats = {
        total: persons.length,
        keyPersons: keyPersons.length,
        highInfluence: highInfluenceCount,
        withDecisionPower: withDecisionPowerCount,
      };

      return {
        keyPersons,
        byCategory,
        stats,
      };
    }),

  // ─── Create a related person ──────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        name: z.string().min(1, "Nome é obrigatório"),
        relationship: clientRelationshipTypeEnum,
        customRelationship: z.string().optional(),
        cpf: z.string().optional(),
        rg: z.string().optional(),
        birthDate: z.coerce.date().optional().nullable(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        cellphone: z.string().optional(),
        whatsapp: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        cep: z.string().optional(),
        company: z.string().optional(),
        position: z.string().optional(),
        department: z.string().optional(),
        influenceLevel: influenceLevelEnum,
        influenceNotes: z.string().optional(),
        decisionPower: z.boolean().optional(),
        isKeyPerson: z.boolean().optional(),
        contactFrequency: z.string().optional(),
        lastContactDate: z.coerce.date().optional().nullable(),
        preferredChannel: z.string().optional(),
        relatedCaseIds: z.string().optional().nullable(),
        linkedPersonId: z.string().optional().nullable(),
        photoUrl: z.string().url().optional().or(z.literal("")),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const person = await ctx.db.clientRelatedPerson.create({
        data: {
          clientId: input.clientId,
          name: input.name,
          relationship: input.relationship,
          customRelationship: input.customRelationship,
          cpf: input.cpf,
          rg: input.rg,
          birthDate: input.birthDate,
          email: input.email || undefined,
          phone: input.phone,
          cellphone: input.cellphone,
          whatsapp: input.whatsapp,
          address: input.address,
          city: input.city,
          state: input.state,
          cep: input.cep,
          company: input.company,
          position: input.position,
          department: input.department,
          influenceLevel: input.influenceLevel,
          influenceNotes: input.influenceNotes,
          decisionPower: input.decisionPower,
          isKeyPerson: input.isKeyPerson,
          contactFrequency: input.contactFrequency,
          lastContactDate: input.lastContactDate,
          preferredChannel: input.preferredChannel,
          relatedCaseIds: input.relatedCaseIds,
          linkedPersonId: input.linkedPersonId,
          photoUrl: input.photoUrl || undefined,
          notes: input.notes,
        },
        include: {
          linkedPerson: {
            select: {
              id: true,
              nome: true,
              tipo: true,
            },
          },
        },
      });

      return person;
    }),

  // ─── Update a related person ──────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        relationship: clientRelationshipTypeEnum.optional(),
        customRelationship: z.string().optional().nullable(),
        cpf: z.string().optional().nullable(),
        rg: z.string().optional().nullable(),
        birthDate: z.coerce.date().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal("")),
        phone: z.string().optional().nullable(),
        cellphone: z.string().optional().nullable(),
        whatsapp: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        city: z.string().optional().nullable(),
        state: z.string().optional().nullable(),
        cep: z.string().optional().nullable(),
        company: z.string().optional().nullable(),
        position: z.string().optional().nullable(),
        department: z.string().optional().nullable(),
        influenceLevel: influenceLevelEnum.optional(),
        influenceNotes: z.string().optional().nullable(),
        decisionPower: z.boolean().optional(),
        isKeyPerson: z.boolean().optional(),
        contactFrequency: z.string().optional().nullable(),
        lastContactDate: z.coerce.date().optional().nullable(),
        preferredChannel: z.string().optional().nullable(),
        relatedCaseIds: z.string().optional().nullable(),
        linkedPersonId: z.string().optional().nullable(),
        photoUrl: z.string().url().optional().nullable().or(z.literal("")),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db.clientRelatedPerson.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pessoa relacionada não encontrada.",
        });
      }

      const person = await ctx.db.clientRelatedPerson.update({
        where: { id },
        data: data as any,
        include: {
          linkedPerson: {
            select: {
              id: true,
              nome: true,
              tipo: true,
            },
          },
        },
      });

      return person;
    }),

  // ─── Soft delete a related person ─────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.clientRelatedPerson.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pessoa relacionada não encontrada.",
        });
      }

      await ctx.db.clientRelatedPerson.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return { success: true };
    }),

  // ─── Register a contact with the person ───────────────
  registerContact: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.clientRelatedPerson.findUnique({
        where: { id: input.id },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pessoa relacionada não encontrada.",
        });
      }

      const updateData: Record<string, unknown> = {
        lastContactDate: new Date(),
      };

      if (input.note) {
        const timestamp = new Date().toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });
        const contactEntry = `[${timestamp}] ${input.note}`;
        updateData.notes = existing.notes
          ? `${existing.notes}\n${contactEntry}`
          : contactEntry;
      }

      const person = await ctx.db.clientRelatedPerson.update({
        where: { id: input.id },
        data: updateData,
      });

      return person;
    }),
});
