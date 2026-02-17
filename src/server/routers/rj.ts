import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";
import {
  getCreditorSummary,
  recalculateTotals,
  validateCreditorClass,
  validateImportRows,
  parseExcelFile,
  parseCSVContent,
  bulkCreateCreditors,
  exportToExcel,
} from "@/lib/services/creditor-service";
import {
  validateSubclassSTJ,
  analyzeCramDownRisk,
  recalculateSubclassStats,
} from "@/lib/services/subclass-service";
import {
  generatePaymentSchedule,
  calculateNPV,
  compareRJvsBankruptcy,
  calculateHaircutTaxImpact,
} from "@/lib/services/payment-calculator";
import {
  simulateVoting,
  runWhatIfScenario,
  calculateQuorumProgress,
  type VoteOverride,
} from "@/lib/services/voting-simulator-service";
import {
  projectDRE,
  projectCashFlow,
  calculateDSCRProjection,
  runSensitivityAnalysis,
  runStressTests,
  runReverseStressTest,
  estimateDebtService,
} from "@/lib/services/financial-projection-service";

// ========== Sub-routers ==========

const casesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Auto-sync: find Cases with tipo RECUPERACAO_JUDICIAL that don't have a JudicialRecoveryCase yet
    const rjCasesWithoutJrc = await ctx.db.case.findMany({
      where: {
        tipo: "RECUPERACAO_JUDICIAL",
        judicialRecoveryCase: null,
      },
      select: { id: true },
    });

    // Auto-create JudicialRecoveryCase for each
    if (rjCasesWithoutJrc.length > 0) {
      for (const c of rjCasesWithoutJrc) {
        await ctx.db.judicialRecoveryCase.create({
          data: {
            case_id: c.id,
            status_rj: "PROCESSAMENTO" as never,
          },
        });
      }
    }

    return ctx.db.judicialRecoveryCase.findMany({
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
            juiz: { select: { id: true, nome: true } },
          },
        },
        administrador_judicial: { select: { id: true, nome: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }),

  // List Cases with tipo RECUPERACAO_JUDICIAL that can be linked (for the "Vincular" modal)
  availableCases: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.case.findMany({
      where: {
        tipo: "RECUPERACAO_JUDICIAL",
        judicialRecoveryCase: null,
      },
      select: {
        id: true,
        numero_processo: true,
        status: true,
        vara: true,
        comarca: true,
        uf: true,
        valor_causa: true,
        cliente: { select: { id: true, nome: true } },
        juiz: { select: { id: true, nome: true } },
      },
      orderBy: { created_at: "desc" },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const jrc = await ctx.db.judicialRecoveryCase.findUnique({
        where: { id: input.id },
        include: {
          case_: {
            include: {
              cliente: { select: { id: true, nome: true, cpf_cnpj: true } },
              juiz: { select: { id: true, nome: true } },
              advogado_responsavel: { select: { id: true, name: true } },
            },
          },
          administrador_judicial: { select: { id: true, nome: true, cpf_cnpj: true } },
        },
      });
      if (!jrc) throw new TRPCError({ code: "NOT_FOUND", message: "Caso RJ não encontrado" });
      return jrc;
    }),

  create: protectedProcedure
    .input(
      z.object({
        case_id: z.string(),
        status_rj: z.string().default("PROCESSAMENTO"),
        data_pedido: z.date().optional(),
        data_deferimento: z.date().optional(),
        administrador_judicial_id: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check case exists and is RECUPERACAO_JUDICIAL type
      const existingCase = await ctx.db.case.findUnique({ where: { id: input.case_id } });
      if (!existingCase) throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });

      return ctx.db.judicialRecoveryCase.create({
        data: {
          case_id: input.case_id,
          status_rj: input.status_rj as never,
          data_pedido: input.data_pedido,
          data_deferimento: input.data_deferimento,
          administrador_judicial_id: input.administrador_judicial_id,
          observacoes: input.observacoes,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status_rj: z.string().optional(),
        data_pedido: z.date().optional().nullable(),
        data_deferimento: z.date().optional().nullable(),
        data_agc: z.date().optional().nullable(),
        data_aprovacao_plano: z.date().optional().nullable(),
        data_homologacao: z.date().optional().nullable(),
        data_encerramento: z.date().optional().nullable(),
        administrador_judicial_id: z.string().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.judicialRecoveryCase.update({
        where: { id },
        data: data as never,
      });
    }),
});

const creditorsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        search: z.string().optional(),
        classe: z.string().optional(),
        status: z.string().optional(),
        subclass_id: z.string().optional().nullable(),
        limit: z.number().min(1).max(500).default(100),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit;
      const where = {
        jrc_id: input.jrc_id,
        ...(input.classe && { classe: input.classe as never }),
        ...(input.status && { status: input.status as never }),
        ...(input.subclass_id !== undefined && { subclass_id: input.subclass_id }),
        ...(input.search && {
          OR: [
            { nome: { contains: input.search, mode: "insensitive" as const } },
            { cpf_cnpj: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        ctx.db.rJCreditor.findMany({
          take: limit + 1,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          where,
          include: {
            subclass: { select: { id: true, nome: true, cor: true } },
          },
          orderBy: [{ classe: "asc" }, { valor_atualizado: "desc" }],
        }),
        ctx.db.rJCreditor.count({ where }),
      ]);

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const next = items.pop();
        nextCursor = next!.id;
      }

      return { items, nextCursor, total };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const creditor = await ctx.db.rJCreditor.findUnique({
        where: { id: input.id },
        include: {
          subclass: true,
          documentos: true,
          impugnacoes: true,
          parcelas_pgto: { orderBy: { numero: "asc" } },
          person: { select: { id: true, nome: true, cpf_cnpj: true, email: true, celular: true } },
        },
      });
      if (!creditor) throw new TRPCError({ code: "NOT_FOUND" });
      return creditor;
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        nome: z.string().min(1),
        cpf_cnpj: z.string().optional(),
        pessoa_fisica: z.boolean().default(false),
        person_id: z.string().optional(),
        classe: z.string(),
        natureza: z.string(),
        valor_original: z.number(),
        valor_atualizado: z.number().optional(),
        tipo_garantia: z.string().default("NONE"),
        valor_garantia: z.number().default(0),
        valor_avaliacao_garantia: z.number().default(0),
        descricao_garantia: z.string().optional(),
        matricula_imovel: z.string().optional(),
        desagio_percentual: z.number().optional(),
        carencia_meses: z.number().optional(),
        parcelas: z.number().optional(),
        indexador: z.string().optional(),
        juros_percentual: z.number().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const valOriginal = BigInt(Math.round(input.valor_original * 100));
      const valAtualizado = BigInt(Math.round((input.valor_atualizado ?? input.valor_original) * 100));
      const valGarantia = BigInt(Math.round(input.valor_garantia * 100));
      const valAvalGarantia = BigInt(Math.round(input.valor_avaliacao_garantia * 100));

      // Validate class limits
      const validation = validateCreditorClass({
        classe: input.classe,
        valor_atualizado: valAtualizado,
        valor_garantia: valGarantia,
        valor_avaliacao_garantia: valAvalGarantia,
      });

      const creditor = await ctx.db.rJCreditor.create({
        data: {
          jrc_id: input.jrc_id,
          nome: input.nome,
          cpf_cnpj: input.cpf_cnpj,
          pessoa_fisica: input.pessoa_fisica,
          person_id: input.person_id,
          classe: input.classe as never,
          natureza: input.natureza as never,
          valor_original: valOriginal,
          valor_atualizado: valAtualizado,
          tipo_garantia: input.tipo_garantia as never,
          valor_garantia: valGarantia,
          valor_avaliacao_garantia: valAvalGarantia,
          descricao_garantia: input.descricao_garantia,
          matricula_imovel: input.matricula_imovel,
          valor_trabalhista_150sm: validation.valor_trabalhista_150sm,
          valor_trabalhista_excedente: validation.valor_trabalhista_excedente,
          valor_quirografario: validation.valor_quirografario,
          desagio_percentual: input.desagio_percentual,
          carencia_meses: input.carencia_meses,
          parcelas: input.parcelas,
          indexador: input.indexador as never,
          juros_percentual: input.juros_percentual,
          observacoes: input.observacoes,
        },
      });

      await recalculateTotals(ctx.db, input.jrc_id);
      return { creditor, warnings: validation.warnings };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nome: z.string().optional(),
        cpf_cnpj: z.string().optional().nullable(),
        pessoa_fisica: z.boolean().optional(),
        person_id: z.string().optional().nullable(),
        classe: z.string().optional(),
        natureza: z.string().optional(),
        status: z.string().optional(),
        valor_original: z.number().optional(),
        valor_atualizado: z.number().optional(),
        tipo_garantia: z.string().optional(),
        valor_garantia: z.number().optional(),
        valor_avaliacao_garantia: z.number().optional(),
        descricao_garantia: z.string().optional().nullable(),
        matricula_imovel: z.string().optional().nullable(),
        desagio_percentual: z.number().optional().nullable(),
        carencia_meses: z.number().optional().nullable(),
        parcelas: z.number().optional().nullable(),
        indexador: z.string().optional().nullable(),
        juros_percentual: z.number().optional().nullable(),
        subclass_id: z.string().optional().nullable(),
        voto: z.string().optional().nullable(),
        presente_agc: z.boolean().optional(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, valor_original, valor_atualizado, valor_garantia, valor_avaliacao_garantia, ...rest } = input;

      const existing = await ctx.db.rJCreditor.findUnique({ where: { id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const data: Record<string, unknown> = { ...rest };

      if (valor_original !== undefined) data.valor_original = BigInt(Math.round(valor_original * 100));
      if (valor_atualizado !== undefined) data.valor_atualizado = BigInt(Math.round(valor_atualizado * 100));
      if (valor_garantia !== undefined) data.valor_garantia = BigInt(Math.round(valor_garantia * 100));
      if (valor_avaliacao_garantia !== undefined) data.valor_avaliacao_garantia = BigInt(Math.round(valor_avaliacao_garantia * 100));

      const creditor = await ctx.db.rJCreditor.update({
        where: { id },
        data: data as never,
      });

      await recalculateTotals(ctx.db, existing.jrc_id);

      // Recalculate subclass stats if changed
      if (input.subclass_id !== undefined) {
        if (existing.subclass_id) await recalculateSubclassStats(ctx.db, existing.subclass_id);
        if (input.subclass_id) await recalculateSubclassStats(ctx.db, input.subclass_id);
      }

      return creditor;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const creditor = await ctx.db.rJCreditor.findUnique({ where: { id: input.id } });
      if (!creditor) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.rJCreditor.delete({ where: { id: input.id } });
      await recalculateTotals(ctx.db, creditor.jrc_id);
      if (creditor.subclass_id) await recalculateSubclassStats(ctx.db, creditor.subclass_id);
    }),

  summary: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getCreditorSummary(ctx.db, input.jrc_id);
    }),

  import: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        data: z.string(), // base64 encoded file content
        format: z.enum(["csv", "excel"]),
        columnMapping: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.data, "base64");
      let rows;

      if (input.format === "excel") {
        rows = parseExcelFile(buffer);
      } else {
        const content = buffer.toString("utf-8");
        rows = parseCSVContent(content);
      }

      const { valid, errors } = validateImportRows(rows);

      if (valid.length === 0) {
        return { imported: 0, errors, total: rows.length };
      }

      const result = await bulkCreateCreditors(
        ctx.db,
        input.jrc_id,
        valid,
        input.format === "excel" ? "IMPORT_EXCEL" : "IMPORT_CSV"
      );

      return { imported: result.count, errors, total: rows.length };
    }),

  export: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const buffer = await exportToExcel(ctx.db, input.jrc_id);
      return { data: buffer.toString("base64"), filename: `quadro-credores-${Date.now()}.xlsx` };
    }),

  bulkUpdatePaymentTerms: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        desagio_percentual: z.number().optional(),
        carencia_meses: z.number().optional(),
        parcelas: z.number().optional(),
        indexador: z.string().optional(),
        juros_percentual: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ids, ...terms } = input;
      const data: Record<string, unknown> = {};
      if (terms.desagio_percentual !== undefined) data.desagio_percentual = terms.desagio_percentual;
      if (terms.carencia_meses !== undefined) data.carencia_meses = terms.carencia_meses;
      if (terms.parcelas !== undefined) data.parcelas = terms.parcelas;
      if (terms.indexador !== undefined) data.indexador = terms.indexador;
      if (terms.juros_percentual !== undefined) data.juros_percentual = terms.juros_percentual;

      await ctx.db.rJCreditor.updateMany({
        where: { id: { in: ids } },
        data: data as never,
      });

      return { updated: ids.length };
    }),
});

const subclassesRouter = router({
  list: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.creditorSubclass.findMany({
        where: { jrc_id: input.jrc_id },
        include: {
          credores: {
            select: { id: true, nome: true, valor_atualizado: true },
            take: 5,
          },
          _count: { select: { credores: true } },
        },
        orderBy: [{ classe_base: "asc" }, { ordem: "asc" }],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
        classe_base: z.string(),
        criterios_objetivos: z.any().optional(),
        justificativa_interesse_homogeneo: z.string().optional(),
        protecao_direitos: z.string().optional(),
        desagio_percentual: z.number().optional(),
        carencia_meses: z.number().optional(),
        parcelas: z.number().optional(),
        indexador: z.string().optional(),
        juros_percentual: z.number().optional(),
        cor: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditorSubclass.create({
        data: {
          jrc_id: input.jrc_id,
          nome: input.nome,
          descricao: input.descricao,
          classe_base: input.classe_base as never,
          criterios_objetivos: input.criterios_objetivos,
          justificativa_interesse_homogeneo: input.justificativa_interesse_homogeneo,
          protecao_direitos: input.protecao_direitos,
          desagio_percentual: input.desagio_percentual,
          carencia_meses: input.carencia_meses,
          parcelas: input.parcelas,
          indexador: input.indexador as never,
          juros_percentual: input.juros_percentual,
          cor: input.cor,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nome: z.string().optional(),
        descricao: z.string().optional().nullable(),
        criterios_objetivos: z.any().optional(),
        justificativa_interesse_homogeneo: z.string().optional().nullable(),
        protecao_direitos: z.string().optional().nullable(),
        desagio_percentual: z.number().optional().nullable(),
        carencia_meses: z.number().optional().nullable(),
        parcelas: z.number().optional().nullable(),
        indexador: z.string().optional().nullable(),
        juros_percentual: z.number().optional().nullable(),
        validacao: z.string().optional(),
        validacao_notas: z.string().optional().nullable(),
        risco_cram_down: z.string().optional().nullable(),
        cor: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.creditorSubclass.update({
        where: { id },
        data: data as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Unassign creditors first
      await ctx.db.rJCreditor.updateMany({
        where: { subclass_id: input.id },
        data: { subclass_id: null },
      });
      return ctx.db.creditorSubclass.delete({ where: { id: input.id } });
    }),

  validate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subclass = await ctx.db.creditorSubclass.findUniqueOrThrow({ where: { id: input.id } });
      return validateSubclassSTJ({
        criterios_objetivos: subclass.criterios_objetivos as never,
        justificativa_interesse_homogeneo: subclass.justificativa_interesse_homogeneo,
        protecao_direitos: subclass.protecao_direitos,
      });
    }),

  assignCreditors: protectedProcedure
    .input(z.object({
      subclass_id: z.string(),
      creditor_ids: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.rJCreditor.updateMany({
        where: { id: { in: input.creditor_ids } },
        data: { subclass_id: input.subclass_id },
      });
      await recalculateSubclassStats(ctx.db, input.subclass_id);
    }),

  cramDownRisk: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subclasses = await ctx.db.creditorSubclass.findMany({
        where: { jrc_id: input.jrc_id },
      });
      return analyzeCramDownRisk(subclasses);
    }),
});

const versionsRouter = router({
  list: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.creditorTableVersion.findMany({
        where: { jrc_id: input.jrc_id },
        orderBy: { versao: "desc" },
        select: {
          id: true,
          versao: true,
          tipo: true,
          titulo: true,
          descricao: true,
          publicada: true,
          data_publicacao: true,
          created_at: true,
          summary_data: true,
        },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.creditorTableVersion.findUniqueOrThrow({ where: { id: input.id } });
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        tipo: z.string(),
        titulo: z.string(),
        descricao: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current creditor snapshot
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { jrc_id: input.jrc_id },
        include: { subclass: { select: { nome: true } } },
        orderBy: [{ classe: "asc" }, { valor_atualizado: "desc" }],
      });

      const summary = await getCreditorSummary(ctx.db, input.jrc_id);

      // Determine next version number
      const lastVersion = await ctx.db.creditorTableVersion.findFirst({
        where: { jrc_id: input.jrc_id },
        orderBy: { versao: "desc" },
      });

      const nextVersao = (lastVersion?.versao ?? 0) + 1;

      // Create snapshot (serialize BigInts to strings for JSON)
      const snapshot = creditors.map((c) => ({
        ...c,
        valor_original: c.valor_original.toString(),
        valor_atualizado: c.valor_atualizado.toString(),
        valor_garantia: c.valor_garantia.toString(),
        valor_quirografario: c.valor_quirografario.toString(),
        valor_trabalhista_150sm: c.valor_trabalhista_150sm.toString(),
        valor_trabalhista_excedente: c.valor_trabalhista_excedente.toString(),
        valor_avaliacao_garantia: c.valor_avaliacao_garantia.toString(),
      }));

      const summaryData = {
        total_credores: summary.total_credores,
        total_credito: summary.total_credito.toString(),
        por_classe: Object.fromEntries(
          Object.entries(summary.por_classe).map(([k, v]) => [k, { count: v.count, valor: v.valor.toString() }])
        ),
        media_desagio: summary.media_desagio,
      };

      return ctx.db.creditorTableVersion.create({
        data: {
          jrc_id: input.jrc_id,
          versao: nextVersao,
          tipo: input.tipo as never,
          titulo: input.titulo,
          descricao: input.descricao,
          snapshot_data: snapshot,
          summary_data: summaryData,
          created_by_id: ctx.session.user.id,
        },
      });
    }),

  compare: protectedProcedure
    .input(z.object({
      version_a_id: z.string(),
      version_b_id: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const [a, b] = await Promise.all([
        ctx.db.creditorTableVersion.findUniqueOrThrow({ where: { id: input.version_a_id } }),
        ctx.db.creditorTableVersion.findUniqueOrThrow({ where: { id: input.version_b_id } }),
      ]);

      const snapshotA = a.snapshot_data as Array<{ nome: string; cpf_cnpj: string; classe: string; valor_atualizado: string; status: string }>;
      const snapshotB = b.snapshot_data as Array<{ nome: string; cpf_cnpj: string; classe: string; valor_atualizado: string; status: string }>;

      // Build maps by cpf_cnpj or name
      const mapA = new Map(snapshotA.map((c) => [c.cpf_cnpj || c.nome, c]));
      const mapB = new Map(snapshotB.map((c) => [c.cpf_cnpj || c.nome, c]));

      const added = snapshotB.filter((c) => !mapA.has(c.cpf_cnpj || c.nome));
      const removed = snapshotA.filter((c) => !mapB.has(c.cpf_cnpj || c.nome));
      const modified = snapshotB.filter((c) => {
        const key = c.cpf_cnpj || c.nome;
        const prev = mapA.get(key);
        if (!prev) return false;
        return prev.valor_atualizado !== c.valor_atualizado || prev.classe !== c.classe || prev.status !== c.status;
      });

      return {
        version_a: { id: a.id, versao: a.versao, titulo: a.titulo, tipo: a.tipo },
        version_b: { id: b.id, versao: b.versao, titulo: b.titulo, tipo: b.tipo },
        summary_a: a.summary_data,
        summary_b: b.summary_data,
        changes: {
          added: added.length,
          removed: removed.length,
          modified: modified.length,
          details: { added, removed, modified },
        },
      };
    }),
});

const challengesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        tipo: z.string().optional(),
        resolucao: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.creditorChallenge.findMany({
        where: {
          jrc_id: input.jrc_id,
          ...(input.tipo && { tipo: input.tipo as never }),
          ...(input.resolucao && { resolucao: input.resolucao as never }),
        },
        include: {
          creditor: { select: { id: true, nome: true, cpf_cnpj: true, classe: true, valor_atualizado: true } },
        },
        orderBy: { created_at: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        creditor_id: z.string().optional(),
        tipo: z.string(),
        requerente_nome: z.string(),
        requerente_cpf_cnpj: z.string().optional(),
        valor_pretendido: z.number().default(0),
        classe_pretendida: z.string().optional(),
        numero_processo: z.string().optional(),
        data_protocolo: z.date().optional(),
        fundamentacao: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.creditorChallenge.create({
        data: {
          jrc_id: input.jrc_id,
          creditor_id: input.creditor_id,
          tipo: input.tipo as never,
          requerente_nome: input.requerente_nome,
          requerente_cpf_cnpj: input.requerente_cpf_cnpj,
          valor_pretendido: BigInt(Math.round(input.valor_pretendido * 100)),
          classe_pretendida: input.classe_pretendida as never,
          numero_processo: input.numero_processo,
          data_protocolo: input.data_protocolo,
          fundamentacao: input.fundamentacao,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resolucao: z.string().optional(),
        valor_reconhecido: z.number().optional(),
        classe_reconhecida: z.string().optional(),
        data_resolucao: z.date().optional(),
        decisao: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, valor_reconhecido, ...rest } = input;
      return ctx.db.creditorChallenge.update({
        where: { id },
        data: {
          ...rest,
          ...(valor_reconhecido !== undefined && { valor_reconhecido: BigInt(Math.round(valor_reconhecido * 100)) }),
        } as never,
      });
    }),
});

const calculationsRouter = router({
  paymentSchedule: protectedProcedure
    .input(
      z.object({
        valorOriginal: z.number(),
        desagioPercentual: z.number(),
        carenciaMeses: z.number(),
        parcelas: z.number(),
        jurosAnual: z.number(),
        indexador: z.string(),
        dataInicio: z.date(),
      })
    )
    .query(({ input }) => {
      return generatePaymentSchedule(input);
    }),

  npv: protectedProcedure
    .input(
      z.object({
        cashflows: z.array(z.number()),
        discountRateAnnual: z.number(),
      })
    )
    .query(({ input }) => {
      return calculateNPV(input.cashflows, input.discountRateAnnual);
    }),

  rjVsBankruptcy: protectedProcedure
    .input(
      z.object({
        totalAtivos: z.number(),
        custosProcessuais: z.number(),
        creditosTrabalhistas: z.number(),
        creditosGarantiaReal: z.number(),
        creditosQuirografarios: z.number(),
        creditosMEEPP: z.number(),
        creditosFiscais: z.number(),
      })
    )
    .query(({ input }) => {
      return compareRJvsBankruptcy(input);
    }),

  taxImpact: protectedProcedure
    .input(
      z.object({
        valorOriginal: z.number(),
        desagioPercentual: z.number(),
        aliquotaIRPJ: z.number().default(25),
        aliquotaCSLL: z.number().default(9),
      })
    )
    .query(({ input }) => {
      return calculateHaircutTaxImpact(
        input.valorOriginal,
        input.desagioPercentual,
        input.aliquotaIRPJ,
        input.aliquotaCSLL
      );
    }),
});

// ========== Voting Simulator ==========

const votingRouter = router({
  simulate: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        overrides: z.record(z.string(), z.object({
          voto: z.string().optional(),
          presente_agc: z.boolean().optional(),
        })).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { jrc_id: input.jrc_id, status: { not: "EXCLUIDO" } },
        select: {
          id: true,
          nome: true,
          classe: true,
          valor_atualizado: true,
          voto: true,
          presente_agc: true,
          subclass_id: true,
        },
      });

      return simulateVoting(
        creditors.map((c) => ({
          ...c,
          voto: c.voto as string | null,
          classe: c.classe as string,
        })),
        (input.overrides || {}) as Record<string, VoteOverride>
      );
    }),

  whatIf: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        base_overrides: z.record(z.string(), z.object({
          voto: z.string().optional(),
          presente_agc: z.boolean().optional(),
        })).optional(),
        creditor_id: z.string(),
        new_vote: z.string(),
        new_presente: z.boolean(),
      })
    )
    .query(async ({ ctx, input }) => {
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { jrc_id: input.jrc_id, status: { not: "EXCLUIDO" } },
        select: {
          id: true,
          nome: true,
          classe: true,
          valor_atualizado: true,
          voto: true,
          presente_agc: true,
          subclass_id: true,
        },
      });

      return runWhatIfScenario(
        creditors.map((c) => ({
          ...c,
          voto: c.voto as string | null,
          classe: c.classe as string,
        })),
        (input.base_overrides || {}) as Record<string, VoteOverride>,
        input.creditor_id,
        input.new_vote,
        input.new_presente
      );
    }),

  scenarios: router({
    list: protectedProcedure
      .input(z.object({ jrc_id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.votingScenario.findMany({
          where: { jrc_id: input.jrc_id, ativo: true },
          orderBy: { created_at: "desc" },
        });
      }),

    create: protectedProcedure
      .input(
        z.object({
          jrc_id: z.string(),
          nome: z.string().min(1),
          tipo: z.string().default("BASE"),
          descricao: z.string().optional(),
          overrides: z.any().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Run simulation to cache results
        const creditors = await ctx.db.rJCreditor.findMany({
          where: { jrc_id: input.jrc_id, status: { not: "EXCLUIDO" } },
          select: {
            id: true,
            nome: true,
            classe: true,
            valor_atualizado: true,
            voto: true,
            presente_agc: true,
            subclass_id: true,
          },
        });

        const result = simulateVoting(
          creditors.map((c) => ({
            ...c,
            voto: c.voto as string | null,
            classe: c.classe as string,
          })),
          (input.overrides || {}) as Record<string, VoteOverride>
        );

        return ctx.db.votingScenario.create({
          data: {
            jrc_id: input.jrc_id,
            nome: input.nome,
            tipo: input.tipo as never,
            descricao: input.descricao,
            overrides: input.overrides || {},
            resultado: result as never,
            aprovado: result.plano_aprovado,
            cram_down_viavel: result.cram_down.viavel,
            created_by_id: ctx.session.user.id,
          },
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.votingScenario.update({
          where: { id: input.id },
          data: { ativo: false },
        });
      }),
  }),
});

// ========== Financial Projections ==========

const projectionsRouter = router({
  list: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.financialProjection.findMany({
        where: { jrc_id: input.jrc_id },
        orderBy: { created_at: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.financialProjection.findUniqueOrThrow({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        nome: z.string().min(1),
        tipo: z.string().default("BASE"),
        anos_projecao: z.number().min(1).max(20).default(5),
        receita_ano_base: z.number(),
        taxa_crescimento: z.number().default(0),
        margem_ebitda: z.number().default(0),
        capex_percentual: z.number().default(0),
        capital_giro_pct: z.number().default(0),
        taxa_desconto: z.number().default(12),
        aliquota_ir: z.number().default(34),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.financialProjection.create({
        data: {
          jrc_id: input.jrc_id,
          nome: input.nome,
          tipo: input.tipo as never,
          anos_projecao: input.anos_projecao,
          receita_ano_base: BigInt(Math.round(input.receita_ano_base * 100)),
          taxa_crescimento: input.taxa_crescimento,
          margem_ebitda: input.margem_ebitda,
          capex_percentual: input.capex_percentual,
          capital_giro_pct: input.capital_giro_pct,
          taxa_desconto: input.taxa_desconto,
          aliquota_ir: input.aliquota_ir,
          observacoes: input.observacoes,
          created_by_id: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        nome: z.string().optional(),
        tipo: z.string().optional(),
        status: z.string().optional(),
        anos_projecao: z.number().optional(),
        receita_ano_base: z.number().optional(),
        taxa_crescimento: z.number().optional(),
        margem_ebitda: z.number().optional(),
        capex_percentual: z.number().optional(),
        capital_giro_pct: z.number().optional(),
        taxa_desconto: z.number().optional(),
        aliquota_ir: z.number().optional(),
        observacoes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, receita_ano_base, ...rest } = input;
      return ctx.db.financialProjection.update({
        where: { id },
        data: {
          ...rest,
          ...(receita_ano_base !== undefined && {
            receita_ano_base: BigInt(Math.round(receita_ano_base * 100)),
          }),
        } as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.financialProjection.delete({ where: { id: input.id } });
    }),

  // Run DRE + Cash Flow + DSCR projection
  runProjection: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        params: z.object({
          anos_projecao: z.number(),
          receita_ano_base: z.number(),
          taxa_crescimento: z.number(),
          margem_ebitda: z.number(),
          capex_percentual: z.number(),
          capital_giro_pct: z.number(),
          taxa_desconto: z.number(),
          aliquota_ir: z.number(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get creditor debt service schedule
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { jrc_id: input.jrc_id, status: { not: "EXCLUIDO" } },
        select: {
          valor_atualizado: true,
          desagio_percentual: true,
          parcelas: true,
          carencia_meses: true,
        },
      });

      const servicoDivida = estimateDebtService(
        creditors.map((c) => ({
          valor_atualizado: Number(c.valor_atualizado) / 100,
          desagio_percentual: c.desagio_percentual,
          parcelas: c.parcelas,
          carencia_meses: c.carencia_meses,
        })),
        input.params.anos_projecao
      );

      const dre = projectDRE(input.params);
      const cashFlow = projectCashFlow(input.params, servicoDivida);
      const dscr = calculateDSCRProjection(input.params, servicoDivida);

      return { dre, cashFlow, dscr, servicoDivida };
    }),

  // Sensitivity analysis
  sensitivity: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        params: z.object({
          anos_projecao: z.number(),
          receita_ano_base: z.number(),
          taxa_crescimento: z.number(),
          margem_ebitda: z.number(),
          capex_percentual: z.number(),
          capital_giro_pct: z.number(),
          taxa_desconto: z.number(),
          aliquota_ir: z.number(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { jrc_id: input.jrc_id, status: { not: "EXCLUIDO" } },
        select: {
          valor_atualizado: true,
          desagio_percentual: true,
          parcelas: true,
          carencia_meses: true,
        },
      });

      const servicoDivida = estimateDebtService(
        creditors.map((c) => ({
          valor_atualizado: Number(c.valor_atualizado) / 100,
          desagio_percentual: c.desagio_percentual,
          parcelas: c.parcelas,
          carencia_meses: c.carencia_meses,
        })),
        input.params.anos_projecao
      );

      return runSensitivityAnalysis(input.params, servicoDivida);
    }),

  // Stress tests
  stressTest: protectedProcedure
    .input(
      z.object({
        jrc_id: z.string(),
        params: z.object({
          anos_projecao: z.number(),
          receita_ano_base: z.number(),
          taxa_crescimento: z.number(),
          margem_ebitda: z.number(),
          capex_percentual: z.number(),
          capital_giro_pct: z.number(),
          taxa_desconto: z.number(),
          aliquota_ir: z.number(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const creditors = await ctx.db.rJCreditor.findMany({
        where: { jrc_id: input.jrc_id, status: { not: "EXCLUIDO" } },
        select: {
          valor_atualizado: true,
          desagio_percentual: true,
          parcelas: true,
          carencia_meses: true,
        },
      });

      const servicoDivida = estimateDebtService(
        creditors.map((c) => ({
          valor_atualizado: Number(c.valor_atualizado) / 100,
          desagio_percentual: c.desagio_percentual,
          parcelas: c.parcelas,
          carencia_meses: c.carencia_meses,
        })),
        input.params.anos_projecao
      );

      const stressTests = runStressTests(input.params, servicoDivida);
      const reverseStress = runReverseStressTest(input.params, servicoDivida);

      return { stressTests, reverseStress };
    }),
});

// ========== Negotiations ==========

const negotiationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      jrc_id: z.string(),
      fase: z.string().optional(),
      prioridade: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.rJNegotiation.findMany({
        where: {
          jrc_id: input.jrc_id,
          ...(input.fase && { fase: input.fase as never }),
          ...(input.prioridade && { prioridade: input.prioridade as never }),
        },
        include: {
          _count: { select: { credores: true, atividades: true } },
        },
        orderBy: { updated_at: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const neg = await ctx.db.rJNegotiation.findUnique({
        where: { id: input.id },
        include: {
          credores: {
            include: {
              creditor: {
                select: { id: true, nome: true, cpf_cnpj: true, classe: true, valor_atualizado: true, voto: true },
              },
            },
            orderBy: { updated_at: "desc" },
          },
          atividades: { orderBy: { data_atividade: "desc" }, take: 20 },
          _count: { select: { credores: true, atividades: true } },
        },
      });
      if (!neg) throw new TRPCError({ code: "NOT_FOUND", message: "Negociação não encontrada" });
      return neg;
    }),

  create: protectedProcedure
    .input(z.object({
      jrc_id: z.string(),
      titulo: z.string().min(1),
      descricao: z.string().optional(),
      fase: z.string().default("MAPEAMENTO"),
      prioridade: z.string().default("MEDIA"),
      data_limite: z.date().optional(),
      desagio_proposto: z.number().optional(),
      carencia_proposta: z.number().optional(),
      parcelas_propostas: z.number().optional(),
      juros_proposto: z.number().optional(),
      programa_parceiro: z.boolean().default(false),
      beneficio_parceiro: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rJNegotiation.create({
        data: {
          jrc_id: input.jrc_id,
          titulo: input.titulo,
          descricao: input.descricao,
          fase: input.fase as never,
          prioridade: input.prioridade as never,
          data_limite: input.data_limite,
          desagio_proposto: input.desagio_proposto,
          carencia_proposta: input.carencia_proposta,
          parcelas_propostas: input.parcelas_propostas,
          juros_proposto: input.juros_proposto,
          programa_parceiro: input.programa_parceiro,
          beneficio_parceiro: input.beneficio_parceiro,
          created_by_id: ctx.session.user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      titulo: z.string().optional(),
      descricao: z.string().optional().nullable(),
      fase: z.string().optional(),
      prioridade: z.string().optional(),
      data_limite: z.date().optional().nullable(),
      data_conclusao: z.date().optional().nullable(),
      desagio_proposto: z.number().optional().nullable(),
      carencia_proposta: z.number().optional().nullable(),
      parcelas_propostas: z.number().optional().nullable(),
      juros_proposto: z.number().optional().nullable(),
      valor_proposta_atual: z.number().optional(),
      programa_parceiro: z.boolean().optional(),
      beneficio_parceiro: z.string().optional().nullable(),
      mediacao_ativa: z.boolean().optional(),
      mediador_nome: z.string().optional().nullable(),
      mediador_contato: z.string().optional().nullable(),
      proxima_sessao: z.date().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, valor_proposta_atual, ...rest } = input;
      return ctx.db.rJNegotiation.update({
        where: { id },
        data: {
          ...rest,
          ...(valor_proposta_atual !== undefined && {
            valor_proposta_atual: BigInt(Math.round(valor_proposta_atual * 100)),
          }),
        } as never,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.rJNegotiation.delete({ where: { id: input.id } });
    }),

  // Dashboard summary
  dashboard: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const negotiations = await ctx.db.rJNegotiation.findMany({
        where: { jrc_id: input.jrc_id },
        include: {
          _count: { select: { credores: true } },
        },
      });

      const byPhase: Record<string, { count: number; valor: bigint }> = {};
      let totalCredores = 0;
      let totalValorOriginal = BigInt(0);
      let totalValorAcordado = BigInt(0);
      let totalAcordados = 0;

      for (const neg of negotiations) {
        const fase = neg.fase;
        if (!byPhase[fase]) byPhase[fase] = { count: 0, valor: BigInt(0) };
        byPhase[fase].count++;
        byPhase[fase].valor += neg.valor_total_original;
        totalCredores += neg.total_credores;
        totalValorOriginal += neg.valor_total_original;
        totalValorAcordado += neg.valor_acordado;
        totalAcordados += neg.credores_acordados;
      }

      // Partner creditors
      const parceiros = await ctx.db.negotiationCreditor.count({
        where: {
          negotiation: { jrc_id: input.jrc_id },
          is_parceiro: true,
        },
      });

      // Recent activities
      const recentActivities = await ctx.db.negotiationActivity.findMany({
        where: { negotiation: { jrc_id: input.jrc_id } },
        orderBy: { data_atividade: "desc" },
        take: 10,
        include: {
          negotiation: { select: { titulo: true } },
        },
      });

      return {
        total_negotiations: negotiations.length,
        total_credores: totalCredores,
        total_valor_original: totalValorOriginal,
        total_valor_acordado: totalValorAcordado,
        total_acordados: totalAcordados,
        taxa_acordo: totalCredores > 0 ? (totalAcordados / totalCredores) * 100 : 0,
        by_phase: byPhase,
        parceiros,
        recent_activities: recentActivities,
      };
    }),

  // Creditor management within negotiations
  creditors: router({
    add: protectedProcedure
      .input(z.object({
        negotiation_id: z.string(),
        creditor_ids: z.array(z.string()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get creditor values for initial population
        const creditors = await ctx.db.rJCreditor.findMany({
          where: { id: { in: input.creditor_ids } },
          select: { id: true, valor_atualizado: true },
        });

        const existing = await ctx.db.negotiationCreditor.findMany({
          where: {
            negotiation_id: input.negotiation_id,
            creditor_id: { in: input.creditor_ids },
          },
          select: { creditor_id: true },
        });
        const existingIds = new Set(existing.map((e) => e.creditor_id));

        const toCreate = creditors.filter((c) => !existingIds.has(c.id));

        if (toCreate.length > 0) {
          await ctx.db.negotiationCreditor.createMany({
            data: toCreate.map((c) => ({
              negotiation_id: input.negotiation_id,
              creditor_id: c.id,
              valor_original: c.valor_atualizado,
            })),
          });
        }

        // Recalculate totals
        const stats = await ctx.db.negotiationCreditor.aggregate({
          where: { negotiation_id: input.negotiation_id },
          _count: true,
          _sum: { valor_original: true },
        });
        const acordados = await ctx.db.negotiationCreditor.count({
          where: {
            negotiation_id: input.negotiation_id,
            status: { in: ["ACORDO_PARCIAL", "ACORDO_TOTAL"] as never[] },
          },
        });
        const sumAcordado = await ctx.db.negotiationCreditor.aggregate({
          where: {
            negotiation_id: input.negotiation_id,
            valor_acordado: { not: null },
          },
          _sum: { valor_acordado: true },
        });

        await ctx.db.rJNegotiation.update({
          where: { id: input.negotiation_id },
          data: {
            total_credores: stats._count,
            valor_total_original: stats._sum.valor_original || BigInt(0),
            credores_acordados: acordados,
            valor_acordado: sumAcordado._sum.valor_acordado || BigInt(0),
          },
        });

        return { added: toCreate.length };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        status: z.string().optional(),
        is_parceiro: z.boolean().optional(),
        valor_proposto: z.number().optional(),
        valor_contraproposta: z.number().optional().nullable(),
        valor_acordado: z.number().optional().nullable(),
        desagio_individual: z.number().optional().nullable(),
        carencia_individual: z.number().optional().nullable(),
        parcelas_individual: z.number().optional().nullable(),
        juros_individual: z.number().optional().nullable(),
        canal_preferido: z.string().optional().nullable(),
        contato_nome: z.string().optional().nullable(),
        contato_email: z.string().optional().nullable(),
        contato_telefone: z.string().optional().nullable(),
        proximo_contato: z.date().optional().nullable(),
        observacoes: z.string().optional().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, valor_proposto, valor_contraproposta, valor_acordado, ...rest } = input;

        const data: Record<string, unknown> = { ...rest, ultimo_contato: new Date() };
        if (valor_proposto !== undefined) data.valor_proposto = BigInt(Math.round(valor_proposto * 100));
        if (valor_contraproposta !== undefined) data.valor_contraproposta = valor_contraproposta != null ? BigInt(Math.round(valor_contraproposta * 100)) : null;
        if (valor_acordado !== undefined) data.valor_acordado = valor_acordado != null ? BigInt(Math.round(valor_acordado * 100)) : null;

        const updated = await ctx.db.negotiationCreditor.update({
          where: { id },
          data: data as never,
        });

        // Recalculate parent totals
        const stats = await ctx.db.negotiationCreditor.aggregate({
          where: { negotiation_id: updated.negotiation_id },
          _count: true,
          _sum: { valor_original: true },
        });
        const acordados = await ctx.db.negotiationCreditor.count({
          where: {
            negotiation_id: updated.negotiation_id,
            status: { in: ["ACORDO_PARCIAL", "ACORDO_TOTAL"] as never[] },
          },
        });
        const sumAcordado = await ctx.db.negotiationCreditor.aggregate({
          where: {
            negotiation_id: updated.negotiation_id,
            valor_acordado: { not: null },
          },
          _sum: { valor_acordado: true },
        });

        await ctx.db.rJNegotiation.update({
          where: { id: updated.negotiation_id },
          data: {
            total_credores: stats._count,
            valor_total_original: stats._sum.valor_original || BigInt(0),
            credores_acordados: acordados,
            valor_acordado: sumAcordado._sum.valor_acordado || BigInt(0),
          },
        });

        return updated;
      }),

    remove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const nc = await ctx.db.negotiationCreditor.findUnique({ where: { id: input.id } });
        if (!nc) throw new TRPCError({ code: "NOT_FOUND" });
        await ctx.db.negotiationCreditor.delete({ where: { id: input.id } });

        // Recalculate
        const count = await ctx.db.negotiationCreditor.count({ where: { negotiation_id: nc.negotiation_id } });
        await ctx.db.rJNegotiation.update({
          where: { id: nc.negotiation_id },
          data: { total_credores: count },
        });
      }),

    bulkSetParceiro: protectedProcedure
      .input(z.object({
        ids: z.array(z.string()),
        is_parceiro: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await ctx.db.negotiationCreditor.updateMany({
          where: { id: { in: input.ids } },
          data: {
            is_parceiro: input.is_parceiro,
            status: input.is_parceiro ? "PARCEIRO" as never : "NAO_CONTATADO" as never,
          },
        });
        return { updated: input.ids.length };
      }),
  }),

  // Activities
  activities: router({
    list: protectedProcedure
      .input(z.object({
        negotiation_id: z.string().optional(),
        jrc_id: z.string().optional(),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        return ctx.db.negotiationActivity.findMany({
          where: {
            ...(input.negotiation_id && { negotiation_id: input.negotiation_id }),
            ...(input.jrc_id && { negotiation: { jrc_id: input.jrc_id } }),
          },
          include: {
            negotiation: { select: { id: true, titulo: true } },
          },
          orderBy: { data_atividade: "desc" },
          take: input.limit,
        });
      }),

    create: protectedProcedure
      .input(z.object({
        negotiation_id: z.string(),
        tipo: z.string(),
        canal: z.string().optional(),
        descricao: z.string(),
        resultado: z.string().optional(),
        creditor_id: z.string().optional(),
        creditor_nome: z.string().optional(),
        data_atividade: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.negotiationActivity.create({
          data: {
            negotiation_id: input.negotiation_id,
            tipo: input.tipo as never,
            canal: input.canal as never,
            descricao: input.descricao,
            resultado: input.resultado,
            creditor_id: input.creditor_id,
            creditor_nome: input.creditor_nome,
            data_atividade: input.data_atividade || new Date(),
            created_by_id: ctx.session.user.id,
          },
        });
      }),
  }),

  // Templates
  templates: router({
    list: protectedProcedure
      .input(z.object({ tipo: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return ctx.db.negotiationTemplate.findMany({
          where: {
            ativo: true,
            ...(input?.tipo && { tipo: input.tipo as never }),
          },
          orderBy: { titulo: "asc" },
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.db.negotiationTemplate.findUniqueOrThrow({ where: { id: input.id } });
      }),

    create: protectedProcedure
      .input(z.object({
        tipo: z.string(),
        titulo: z.string(),
        assunto: z.string().optional(),
        conteudo: z.string(),
        variaveis: z.any().optional(),
        canal: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.negotiationTemplate.create({
          data: {
            tipo: input.tipo as never,
            titulo: input.titulo,
            assunto: input.assunto,
            conteudo: input.conteudo,
            variaveis: input.variaveis,
            canal: input.canal as never,
            created_by_id: ctx.session.user.id,
          },
        });
      }),
  }),

  // Partners summary
  partners: protectedProcedure
    .input(z.object({ jrc_id: z.string() }))
    .query(async ({ ctx, input }) => {
      const partners = await ctx.db.negotiationCreditor.findMany({
        where: {
          negotiation: { jrc_id: input.jrc_id },
          is_parceiro: true,
        },
        include: {
          creditor: {
            select: { id: true, nome: true, cpf_cnpj: true, classe: true, valor_atualizado: true, voto: true },
          },
          negotiation: { select: { id: true, titulo: true } },
        },
      });

      const totalValor = partners.reduce((sum, p) => sum + p.valor_original, BigInt(0));
      const totalProposto = partners.reduce((sum, p) => sum + p.valor_proposto, BigInt(0));

      return {
        total: partners.length,
        valor_original: totalValor,
        valor_proposto: totalProposto,
        creditors: partners,
      };
    }),
});

// ========== Main RJ Router ==========

export const rjRouter = router({
  cases: casesRouter,
  creditors: creditorsRouter,
  subclasses: subclassesRouter,
  versions: versionsRouter,
  challenges: challengesRouter,
  calculations: calculationsRouter,
  voting: votingRouter,
  projections: projectionsRouter,
  negotiations: negotiationsRouter,
});
