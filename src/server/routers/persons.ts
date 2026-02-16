import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

const personCreateSchema = z.object({
  tipo: z.enum([
    "CLIENTE",
    "PARTE_CONTRARIA",
    "JUIZ",
    "DESEMBARGADOR",
    "PERITO",
    "ADMINISTRADOR_JUDICIAL",
    "CREDOR",
    "TESTEMUNHA",
    "OUTRO",
  ]),
  subtipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]),
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  razao_social: z.string().optional().nullable(),
  cpf_cnpj: z.string().optional().nullable(),
  rg: z.string().optional().nullable(),
  orgao_emissor: z.string().optional().nullable(),
  nacionalidade: z.string().optional().nullable(),
  estado_civil: z.string().optional().nullable(),
  profissao: z.string().optional().nullable(),
  data_nascimento: z.coerce.date().optional().nullable(),
  // Address
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  pais: z.string().optional().nullable(),
  // Contacts
  telefone_fixo: z.string().optional().nullable(),
  celular: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  email_secundario: z.string().email().optional().or(z.literal("")).nullable(),
  // Banking
  banco: z.string().optional().nullable(),
  agencia: z.string().optional().nullable(),
  conta: z.string().optional().nullable(),
  pix: z.string().optional().nullable(),
  // Other
  segmento: z
    .enum(["AGRO", "INDUSTRIA", "COMERCIO", "SERVICOS", "FINANCEIRO", "GOVERNO", "OUTRO"])
    .optional()
    .nullable(),
  observacoes: z.string().optional().nullable(),
  portal_access: z.boolean().optional(),
});

const personUpdateSchema = personCreateSchema.partial().extend({
  id: z.string(),
});

export const personsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          tipo: z
            .enum([
              "CLIENTE",
              "PARTE_CONTRARIA",
              "JUIZ",
              "DESEMBARGADOR",
              "PERITO",
              "ADMINISTRADOR_JUDICIAL",
              "CREDOR",
              "TESTEMUNHA",
              "OUTRO",
            ])
            .optional(),
          subtipo: z.enum(["PESSOA_FISICA", "PESSOA_JURIDICA"]).optional(),
          segmento: z
            .enum(["AGRO", "INDUSTRIA", "COMERCIO", "SERVICOS", "FINANCEIRO", "GOVERNO", "OUTRO"])
            .optional(),
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const search = input?.search?.trim();

      const where = {
        ...(input?.tipo && { tipo: input.tipo }),
        ...(input?.subtipo && { subtipo: input.subtipo }),
        ...(input?.segmento && { segmento: input.segmento }),
        ...(search && {
          OR: [
            { nome: { contains: search, mode: "insensitive" as const } },
            { razao_social: { contains: search, mode: "insensitive" as const } },
            { cpf_cnpj: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { cidade: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.person.findMany({
          take: limit + 1,
          cursor: input?.cursor ? { id: input.cursor } : undefined,
          where,
          orderBy: { nome: "asc" },
        }),
        ctx.db.person.count({ where }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor, total };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const person = await ctx.db.person.findUnique({
        where: { id: input.id },
        include: {
          person_documents: {
            orderBy: { uploaded_at: "desc" },
            include: {
              uploaded_by: { select: { id: true, name: true } },
            },
          },
          case_parties: {
            include: {
              case_: {
                select: {
                  id: true,
                  numero_processo: true,
                  tipo: true,
                  status: true,
                  cliente: { select: { nome: true } },
                },
              },
            },
          },
          cases_as_client: {
            select: {
              id: true,
              numero_processo: true,
              tipo: true,
              status: true,
              vara: true,
              comarca: true,
            },
          },
          cases_as_judge: {
            select: {
              id: true,
              numero_processo: true,
              tipo: true,
              status: true,
            },
          },
          project_stakeholders: {
            include: {
              project: {
                select: {
                  id: true,
                  titulo: true,
                  codigo: true,
                  categoria: true,
                  status: true,
                },
              },
            },
          },
          projects_as_client: {
            select: {
              id: true,
              titulo: true,
              codigo: true,
              categoria: true,
              status: true,
            },
          },
          creditors: {
            include: {
              case_: {
                select: { id: true, numero_processo: true },
              },
            },
          },
          created_by: { select: { id: true, name: true } },
        },
      });

      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada" });
      }

      return person;
    }),

  create: protectedProcedure.input(personCreateSchema).mutation(async ({ ctx, input }) => {
    if (input.cpf_cnpj) {
      const existing = await ctx.db.person.findUnique({
        where: { cpf_cnpj: input.cpf_cnpj },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma pessoa cadastrada com este CPF/CNPJ",
        });
      }
    }

    return ctx.db.person.create({
      data: {
        ...input,
        email: input.email || null,
        email_secundario: input.email_secundario || null,
        created_by_id: ctx.session.user.id,
      },
    });
  }),

  update: protectedProcedure.input(personUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db.person.findUnique({ where: { id } });
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada" });
    }

    if (data.cpf_cnpj && data.cpf_cnpj !== existing.cpf_cnpj) {
      const duplicate = await ctx.db.person.findUnique({
        where: { cpf_cnpj: data.cpf_cnpj },
      });
      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma pessoa cadastrada com este CPF/CNPJ",
        });
      }
    }

    return ctx.db.person.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
        email_secundario: data.email_secundario || null,
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const person = await ctx.db.person.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              case_parties: true,
              cases_as_client: true,
              creditors: true,
              project_stakeholders: true,
              projects_as_client: true,
            },
          },
        },
      });

      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pessoa não encontrada" });
      }

      const totalRefs =
        person._count.case_parties +
        person._count.cases_as_client +
        person._count.creditors +
        person._count.project_stakeholders +
        person._count.projects_as_client;

      if (totalRefs > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Não é possível excluir esta pessoa pois ela está vinculada a processos ou projetos",
        });
      }

      return ctx.db.person.delete({ where: { id: input.id } });
    }),

  // Autocomplete search - lightweight for comboboxes
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        tipo: z
          .enum([
            "CLIENTE",
            "PARTE_CONTRARIA",
            "JUIZ",
            "DESEMBARGADOR",
            "PERITO",
            "ADMINISTRADOR_JUDICIAL",
            "CREDOR",
            "TESTEMUNHA",
            "OUTRO",
          ])
          .optional(),
        limit: z.number().min(1).max(20).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.person.findMany({
        take: input.limit,
        where: {
          ...(input.tipo && { tipo: input.tipo }),
          OR: [
            { nome: { contains: input.query, mode: "insensitive" } },
            { razao_social: { contains: input.query, mode: "insensitive" } },
            { cpf_cnpj: { contains: input.query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          nome: true,
          razao_social: true,
          cpf_cnpj: true,
          tipo: true,
          subtipo: true,
          cidade: true,
          estado: true,
        },
        orderBy: { nome: "asc" },
      });
    }),

  // Add document to person
  addDocument: protectedProcedure
    .input(
      z.object({
        person_id: z.string(),
        tipo: z.enum([
          "CNH",
          "RG",
          "CPF",
          "CNPJ_CARD",
          "CONTRATO_SOCIAL",
          "ALTERACAO_CONTRATO_SOCIAL",
          "PROCURACAO",
          "IMPOSTO_RENDA",
          "BALANCO",
          "DRE",
          "ESCRITURA",
          "CERTIDAO",
          "COMPROVANTE_ENDERECO",
          "DOCUMENTO_FINANCEIRO",
          "DOCUMENTO_FISCAL",
          "OUTRO",
        ]),
        titulo: z.string().min(1),
        arquivo_url: z.string().url(),
        data_validade: z.coerce.date().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.personDocument.create({
        data: {
          ...input,
          uploaded_by_id: ctx.session.user.id,
        },
      });
    }),

  // Remove document
  removeDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.personDocument.delete({ where: { id: input.id } });
    }),
});
