import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ─── Helpers ───────────────────────────────────────────────────────────────

function isPrivileged(role: string) {
  return role === "ADMIN" || role === "SOCIO";
}

function assertPrivileged(role: string) {
  if (!isPrivileged(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas sócios e administradores podem executar esta ação." });
  }
}

// Calculate average from a numeric array, ignoring nulls
function avg(values: (number | null | undefined)[]): number {
  const valid = values.filter((v): v is number => v !== null && v !== undefined);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ─── Sub-router schemas ─────────────────────────────────────────────────────

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(200).default(50),
});

// ============================================================
// 1. MEMBERS sub-router
// ============================================================

const membersRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        role: z.string().optional(),
        department: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.role) where.role = input.role;
      if (input.department) where.department = input.department;
      if (input.search) {
        where.user = {
          name: { contains: input.search, mode: "insensitive" },
        };
      }

      const [items, total] = await Promise.all([
        ctx.db.teamMember.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true, avatar_url: true, active: true },
            },
            manager: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.teamMember.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.teamMember.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, avatar_url: true, active: true, oab_number: true },
          },
          manager: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          subordinates: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          okrs: { orderBy: [{ year: "desc" }, { quarter: "desc" }], take: 4 },
          kpiEntries: { orderBy: { period: "desc" }, take: 6 },
          pdiPlans: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado." });
      }

      return member;
    }),

  create: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["SOCIO", "ADVOGADO_SENIOR", "ADVOGADO_PLENO", "ADVOGADO_JUNIOR", "ESTAGIARIO", "PARALEGAL", "ADMINISTRATIVO"]),
        department: z.string().optional(),
        oabNumber: z.string().optional(),
        admissionDate: z.coerce.date(),
        birthDate: z.coerce.date().optional(),
        careerTrack: z.enum(["JURIDICO", "ADMINISTRATIVO_TRACK", "PARALEGAL_TRACK"]).default("JURIDICO"),
        currentLevel: z.number().int().min(1).max(10).default(1),
        targetLevel: z.number().int().min(1).max(10).optional(),
        managerMemberId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      // Ensure user exists and doesn't already have a TeamMember record
      const existing = await ctx.db.teamMember.findUnique({ where: { userId: input.userId } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Este usuário já é membro da equipe." });
      }

      return ctx.db.teamMember.create({
        data: {
          userId: input.userId,
          role: input.role,
          department: input.department,
          oabNumber: input.oabNumber,
          admissionDate: input.admissionDate,
          birthDate: input.birthDate,
          careerTrack: input.careerTrack,
          currentLevel: input.currentLevel,
          targetLevel: input.targetLevel,
          managerMemberId: input.managerMemberId,
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum(["SOCIO", "ADVOGADO_SENIOR", "ADVOGADO_PLENO", "ADVOGADO_JUNIOR", "ESTAGIARIO", "PARALEGAL", "ADMINISTRATIVO"]).optional(),
        department: z.string().optional(),
        oabNumber: z.string().optional(),
        admissionDate: z.coerce.date().optional(),
        birthDate: z.coerce.date().optional(),
        careerTrack: z.enum(["JURIDICO", "ADMINISTRATIVO_TRACK", "PARALEGAL_TRACK"]).optional(),
        currentLevel: z.number().int().min(1).max(10).optional(),
        targetLevel: z.number().int().min(1).max(10).optional(),
        managerMemberId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const { id, ...data } = input;

      return ctx.db.teamMember.update({
        where: { id },
        data: {
          ...data,
          managerMemberId: data.managerMemberId ?? undefined,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });
    }),

  delete_: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      await ctx.db.teamMember.delete({ where: { id: input.id } });
      return { success: true };
    }),
});

// ============================================================
// 2. OKRs sub-router
// ============================================================

const okrsRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        teamMemberId: z.string().optional(),
        quarter: z.number().int().min(1).max(4).optional(),
        year: z.number().int().optional(),
        status: z.enum(["DRAFT", "ACTIVE", "REVIEW", "CLOSED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      const where: any = {};
      if (input.teamMemberId) where.teamMemberId = input.teamMemberId;
      if (input.quarter) where.quarter = input.quarter;
      if (input.year) where.year = input.year;
      if (input.status) where.status = input.status;

      // Non-privileged users can only see their own OKRs
      if (!isPrivileged(role) && !input.teamMemberId) {
        const me = await ctx.db.teamMember.findUnique({ where: { userId } });
        if (me) where.teamMemberId = me.id;
      }

      const [items, total] = await Promise.all([
        ctx.db.oKR.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
            parentOkr: { select: { id: true, objective: true } },
          },
          orderBy: [{ year: "desc" }, { quarter: "desc" }, { createdAt: "desc" }],
        }),
        ctx.db.oKR.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const okr = await ctx.db.oKR.findUnique({
        where: { id: input.id },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          parentOkr: { select: { id: true, objective: true } },
          childOkrs: { select: { id: true, objective: true, overallProgress: true, status: true } },
        },
      });

      if (!okr) throw new TRPCError({ code: "NOT_FOUND", message: "OKR não encontrado." });
      return okr;
    }),

  create: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        quarter: z.number().int().min(1).max(4),
        year: z.number().int(),
        objective: z.string().min(1),
        category: z.enum(["PRODUTIVIDADE", "QUALIDADE", "CAPTACAO", "DESENVOLVIMENTO", "FINANCEIRO", "OPERACIONAL"]),
        keyResults: z.array(
          z.object({
            title: z.string(),
            metric: z.string(),
            targetValue: z.number(),
            currentValue: z.number().default(0),
            unit: z.string().optional(),
            weight: z.number().min(0).max(100).default(100),
          })
        ),
        parentOkrId: z.string().optional(),
        status: z.enum(["DRAFT", "ACTIVE", "REVIEW", "CLOSED"]).default("DRAFT"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.oKR.create({
        data: {
          teamMemberId: input.teamMemberId,
          quarter: input.quarter,
          year: input.year,
          objective: input.objective,
          category: input.category,
          keyResults: input.keyResults as any,
          status: input.status,
          parentOkrId: input.parentOkrId,
          overallProgress: 0,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        objective: z.string().optional(),
        category: z.enum(["PRODUTIVIDADE", "QUALIDADE", "CAPTACAO", "DESENVOLVIMENTO", "FINANCEIRO", "OPERACIONAL"]).optional(),
        keyResults: z.any().optional(),
        status: z.enum(["DRAFT", "ACTIVE", "REVIEW", "CLOSED"]).optional(),
        selfAssessment: z.string().optional(),
        managerComment: z.string().optional(),
        parentOkrId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.oKR.update({
        where: { id },
        data: {
          ...data,
          parentOkrId: data.parentOkrId ?? undefined,
        },
      });
    }),

  delete_: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.oKR.delete({ where: { id: input.id } });
      return { success: true };
    }),

  checkin: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        keyResults: z.array(
          z.object({
            index: z.number().int().min(0),
            currentValue: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const okr = await ctx.db.oKR.findUnique({ where: { id: input.id } });
      if (!okr) throw new TRPCError({ code: "NOT_FOUND", message: "OKR não encontrado." });

      const krs = (okr.keyResults as any[]) ?? [];

      // Apply updates to the matching KR indices
      for (const update of input.keyResults) {
        if (krs[update.index] !== undefined) {
          krs[update.index].currentValue = update.currentValue;
        }
      }

      // Recalculate overall progress as weighted average
      let totalWeight = 0;
      let weightedProgress = 0;
      for (const kr of krs) {
        const target = Number(kr.targetValue) || 1;
        const current = Math.min(Number(kr.currentValue) || 0, target);
        const weight = Number(kr.weight) || 100;
        const progress = (current / target) * 100;
        weightedProgress += progress * weight;
        totalWeight += weight;
      }
      const overallProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;

      return ctx.db.oKR.update({
        where: { id: input.id },
        data: {
          keyResults: krs as any,
          overallProgress: Math.min(overallProgress, 100),
        },
      });
    }),

  close: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        managerComment: z.string().optional(),
        selfAssessment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const okr = await ctx.db.oKR.findUnique({ where: { id: input.id } });
      if (!okr) throw new TRPCError({ code: "NOT_FOUND", message: "OKR não encontrado." });

      const krs = (okr.keyResults as any[]) ?? [];
      let totalWeight = 0;
      let weightedProgress = 0;
      for (const kr of krs) {
        const target = Number(kr.targetValue) || 1;
        const current = Math.min(Number(kr.currentValue) || 0, target);
        const weight = Number(kr.weight) || 100;
        weightedProgress += (current / target) * 100 * weight;
        totalWeight += weight;
      }
      const finalScore = totalWeight > 0 ? weightedProgress / totalWeight : 0;

      return ctx.db.oKR.update({
        where: { id: input.id },
        data: {
          status: "CLOSED",
          finalScore,
          managerComment: input.managerComment,
          selfAssessment: input.selfAssessment,
          overallProgress: Math.min(finalScore, 100),
        },
      });
    }),
});

// ============================================================
// 3. KPIs sub-router
// ============================================================

const kpisRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        teamMemberId: z.string().optional(),
        periodFrom: z.coerce.date().optional(),
        periodTo: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      const where: any = {};
      if (input.teamMemberId) where.teamMemberId = input.teamMemberId;
      if (input.periodFrom || input.periodTo) {
        where.period = {};
        if (input.periodFrom) where.period.gte = input.periodFrom;
        if (input.periodTo) where.period.lte = input.periodTo;
      }

      if (!isPrivileged(role) && !input.teamMemberId) {
        const me = await ctx.db.teamMember.findUnique({ where: { userId } });
        if (me) where.teamMemberId = me.id;
      }

      const [items, total] = await Promise.all([
        ctx.db.kPIEntry.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { period: "desc" },
        }),
        ctx.db.kPIEntry.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const kpi = await ctx.db.kPIEntry.findUnique({
        where: { id: input.id },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
      if (!kpi) throw new TRPCError({ code: "NOT_FOUND", message: "KPI não encontrado." });
      return kpi;
    }),

  create: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        period: z.coerce.date(),
        billableHours: z.number().optional(),
        totalHours: z.number().optional(),
        utilizationRate: z.number().optional(),
        casesActive: z.number().int().optional(),
        deadlinesMet: z.number().int().optional(),
        deadlinesTotal: z.number().int().optional(),
        deadlineComplianceRate: z.number().optional(),
        piecesProduced: z.number().int().optional(),
        piecesQualityScore: z.number().optional(),
        caseSuccessRate: z.number().optional(),
        revenueGenerated: z.number().optional(),
        clientsAcquired: z.number().int().optional(),
        trainingHours: z.number().optional(),
        mentoringSessions: z.number().int().optional(),
        overallScore: z.number().optional(),
        aiInsights: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kPIEntry.upsert({
        where: { teamMemberId_period: { teamMemberId: input.teamMemberId, period: input.period } },
        create: { ...input },
        update: { ...input },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        billableHours: z.number().optional(),
        totalHours: z.number().optional(),
        utilizationRate: z.number().optional(),
        casesActive: z.number().int().optional(),
        deadlinesMet: z.number().int().optional(),
        deadlinesTotal: z.number().int().optional(),
        deadlineComplianceRate: z.number().optional(),
        piecesProduced: z.number().int().optional(),
        piecesQualityScore: z.number().optional(),
        caseSuccessRate: z.number().optional(),
        revenueGenerated: z.number().optional(),
        clientsAcquired: z.number().int().optional(),
        trainingHours: z.number().optional(),
        mentoringSessions: z.number().int().optional(),
        overallScore: z.number().optional(),
        aiInsights: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.kPIEntry.update({ where: { id }, data });
    }),

  dashboard: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(12).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const since = new Date();
      since.setMonth(since.getMonth() - input.months);

      const entries = await ctx.db.kPIEntry.findMany({
        where: { period: { gte: since } },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
        orderBy: [{ teamMemberId: "asc" }, { period: "desc" }],
      });

      // Group by member
      const byMember: Record<string, typeof entries> = {};
      for (const e of entries) {
        if (!byMember[e.teamMemberId]) byMember[e.teamMemberId] = [];
        byMember[e.teamMemberId].push(e);
      }

      const memberAverages = Object.entries(byMember).map(([memberId, memberEntries]) => {
        const latestEntry = memberEntries[0];
        return {
          memberId,
          memberName: latestEntry.teamMember.user.name,
          avatarUrl: latestEntry.teamMember.user.avatar_url,
          avgBillableHours: avg(memberEntries.map((e) => e.billableHours)),
          avgUtilizationRate: avg(memberEntries.map((e) => e.utilizationRate)),
          avgDeadlineCompliance: avg(memberEntries.map((e) => e.deadlineComplianceRate)),
          avgOverallScore: avg(memberEntries.map((e) => e.overallScore)),
          totalRevenueGenerated: memberEntries.reduce((s, e) => s + (e.revenueGenerated ?? 0), 0),
        };
      });

      // Sort rankings by overall score desc
      const rankings = [...memberAverages].sort((a, b) => b.avgOverallScore - a.avgOverallScore);

      // Monthly trend (team avg by month)
      const monthlyTrend: Record<string, { billableHours: number[]; utilizationRate: number[]; deadlineCompliance: number[] }> = {};
      for (const e of entries) {
        const monthKey = e.period.toISOString().slice(0, 7);
        if (!monthlyTrend[monthKey]) monthlyTrend[monthKey] = { billableHours: [], utilizationRate: [], deadlineCompliance: [] };
        if (e.billableHours != null) monthlyTrend[monthKey].billableHours.push(e.billableHours);
        if (e.utilizationRate != null) monthlyTrend[monthKey].utilizationRate.push(e.utilizationRate);
        if (e.deadlineComplianceRate != null) monthlyTrend[monthKey].deadlineCompliance.push(e.deadlineComplianceRate);
      }

      const trends = Object.entries(monthlyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          avgBillableHours: avg(data.billableHours),
          avgUtilizationRate: avg(data.utilizationRate),
          avgDeadlineCompliance: avg(data.deadlineCompliance),
        }));

      return { memberAverages, rankings, trends };
    }),
});

// ============================================================
// 4. FEEDBACK sub-router
// ============================================================

const feedbackRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        targetId: z.string().optional(),
        authorId: z.string().optional(),
        type: z.enum(["POSITIVO", "CONSTRUTIVO", "FEEDFORWARD", "RECONHECIMENTO"]).optional(),
        visibility: z.enum(["PRIVATE", "TEAM", "MANAGERS_ONLY"]).optional(),
        acknowledged: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      const me = await ctx.db.teamMember.findUnique({ where: { userId } });

      const where: any = {};
      if (input.targetId) where.targetId = input.targetId;
      if (input.authorId) where.authorId = input.authorId;
      if (input.type) where.type = input.type;
      if (input.visibility) where.visibility = input.visibility;
      if (input.acknowledged !== undefined) where.acknowledged = input.acknowledged;

      // RBAC: users can only see their own + public/team feedback; privileged see all
      if (!isPrivileged(role) && me) {
        where.OR = [
          { targetId: me.id },
          { authorId: me.id },
          { visibility: "TEAM" },
        ];
      }

      const [items, total] = await Promise.all([
        ctx.db.feedback.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            author: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
            target: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.feedback.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const feedback = await ctx.db.feedback.findUnique({
        where: { id: input.id },
        include: {
          author: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          target: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
      if (!feedback) throw new TRPCError({ code: "NOT_FOUND", message: "Feedback não encontrado." });
      return feedback;
    }),

  create: protectedProcedure
    .input(
      z.object({
        targetId: z.string(),
        type: z.enum(["POSITIVO", "CONSTRUTIVO", "FEEDFORWARD", "RECONHECIMENTO"]),
        direction: z.enum(["MANAGER_TO_REPORT", "REPORT_TO_MANAGER", "PEER_TO_PEER", "SELF", "CLIENT_ORIGINATED"]),
        visibility: z.enum(["PRIVATE", "TEAM", "MANAGERS_ONLY"]).default("PRIVATE"),
        situation: z.string().min(1),
        behavior: z.string().min(1),
        impact: z.string().min(1),
        feedforward: z.string().optional(),
        competency: z.enum([
          "TECNICA_JURIDICA", "COMUNICACAO_CLIENTE", "NEGOCIACAO", "GESTAO_PRAZOS",
          "REDACAO_JURIDICA", "ORATORIA_AUDIENCIA", "PESQUISA_JURISPRUDENCIAL",
          "BUSINESS_DEVELOPMENT", "TRABALHO_EQUIPE", "LIDERANCA",
          "COMPETENCIA_TECNOLOGICA", "ETICA_PROFISSIONAL",
        ]).optional(),
        caseId: z.string().optional(),
        aiSuggested: z.boolean().default(false),
        aiTone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const me = await ctx.db.teamMember.findUnique({ where: { userId: ctx.session.user.id } });
      if (!me) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não é membro da equipe." });

      return ctx.db.feedback.create({
        data: {
          authorId: me.id,
          targetId: input.targetId,
          type: input.type,
          direction: input.direction,
          visibility: input.visibility,
          situation: input.situation,
          behavior: input.behavior,
          impact: input.impact,
          feedforward: input.feedforward,
          competency: input.competency,
          caseId: input.caseId,
          aiSuggested: input.aiSuggested,
          aiTone: input.aiTone,
        },
        include: {
          author: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          target: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
    }),

  react: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reaction: z.enum(["AGRADECIDO", "CONCORDO", "PARCIALMENTE_CONCORDO", "DISCORDO", "PRECISO_CONVERSAR"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.update({
        where: { id: input.id },
        data: {
          reaction: input.reaction,
          acknowledged: true,
        },
      });
    }),

  reply: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        replyText: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.update({
        where: { id: input.id },
        data: {
          replyText: input.replyText,
          acknowledged: true,
        },
      });
    }),

  stats: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string().optional(),
        weeks: z.number().int().min(1).max(52).default(8),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      let memberId = input.teamMemberId;
      if (!memberId) {
        const me = await ctx.db.teamMember.findUnique({ where: { userId } });
        if (me) memberId = me.id;
      }

      const since = new Date();
      since.setDate(since.getDate() - (input.weeks * 7));

      const [given, received] = await Promise.all([
        ctx.db.feedback.findMany({
          where: { authorId: memberId, createdAt: { gte: since } },
          select: { type: true, competency: true, createdAt: true },
        }),
        ctx.db.feedback.findMany({
          where: { targetId: memberId, createdAt: { gte: since } },
          select: { type: true, competency: true, createdAt: true },
        }),
      ]);

      const positiveCount = received.filter((f) => f.type === "POSITIVO" || f.type === "RECONHECIMENTO").length;
      const constructiveCount = received.filter((f) => f.type === "CONSTRUTIVO").length;
      const positiveRatio = received.length > 0 ? positiveCount / received.length : 0;

      // Count competency mentions
      const competencyCounts: Record<string, number> = {};
      for (const f of received) {
        if (f.competency) {
          competencyCounts[f.competency] = (competencyCounts[f.competency] ?? 0) + 1;
        }
      }

      const topCompetencies = Object.entries(competencyCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([competency, count]) => ({ competency, count }));

      // Weekly breakdown
      const weeklyBreakdown: Record<string, { given: number; received: number }> = {};
      const allFeedback = [
        ...given.map((f) => ({ ...f, direction: "given" as const })),
        ...received.map((f) => ({ ...f, direction: "received" as const })),
      ];

      for (const f of allFeedback) {
        const weekStart = new Date(f.createdAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().slice(0, 10);
        if (!weeklyBreakdown[weekKey]) weeklyBreakdown[weekKey] = { given: 0, received: 0 };
        weeklyBreakdown[weekKey][f.direction]++;
      }

      const weeklyStats = Object.entries(weeklyBreakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, counts]) => ({ week, ...counts }));

      return {
        totalGiven: given.length,
        totalReceived: received.length,
        positiveRatio,
        positiveCount,
        constructiveCount,
        topCompetencies,
        weeklyStats,
      };
    }),
});

// ============================================================
// 5. REVIEW 360 sub-router
// ============================================================

const review360Router = router({
  listCycles: protectedProcedure
    .input(
      paginationInput.extend({
        status: z.enum(["SETUP", "COLLECTING", "PROCESSING", "REVIEW_360", "RELEASED", "CLOSED_360"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.db.review360Cycle.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            _count: { select: { participants: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.review360Cycle.count({ where }),
      ]);

      return { items, total };
    }),

  getCycle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const cycle = await ctx.db.review360Cycle.findUnique({
        where: { id: input.id },
        include: {
          participants: {
            include: {
              teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
            },
          },
        },
      });

      if (!cycle) throw new TRPCError({ code: "NOT_FOUND", message: "Ciclo não encontrado." });
      return cycle;
    }),

  createCycle: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        period: z.string(),
        competencies: z.any(),
        includeClients: z.boolean().default(true),
        includePeers: z.boolean().default(true),
        includeSelfReview: z.boolean().default(true),
        anonymousComments: z.boolean().default(true),
        minReviewersPerCategory: z.number().int().min(1).default(2),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        resultsDate: z.coerce.date().optional(),
        participantIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const { participantIds, ...cycleData } = input;

      return ctx.db.review360Cycle.create({
        data: {
          ...cycleData,
          competencies: cycleData.competencies as any,
          participants: {
            create: participantIds.map((teamMemberId) => ({
              teamMemberId,
              status: "PENDING_360" as const,
            })),
          },
        },
        include: {
          participants: {
            include: { teamMember: { include: { user: { select: { id: true, name: true } } } } },
          },
        },
      });
    }),

  updateCycle: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        period: z.string().optional(),
        status: z.enum(["SETUP", "COLLECTING", "PROCESSING", "REVIEW_360", "RELEASED", "CLOSED_360"]).optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        resultsDate: z.coerce.date().optional(),
        competencies: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const { id, ...data } = input;
      return ctx.db.review360Cycle.update({
        where: { id },
        data: {
          ...data,
          competencies: data.competencies as any,
        },
      });
    }),

  evaluate: protectedProcedure
    .input(
      z.object({
        participantId: z.string(),
        reviewType: z.enum(["self", "manager", "peer", "client"]),
        scores: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.db.review360Participant.findUnique({
        where: { id: input.participantId },
      });
      if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participante não encontrado." });

      const updateField =
        input.reviewType === "self"
          ? { selfReview: input.scores as any }
          : input.reviewType === "manager"
          ? { managerReview: input.scores as any }
          : input.reviewType === "peer"
          ? { peerReviews: input.scores as any }
          : { clientReviews: input.scores as any };

      return ctx.db.review360Participant.update({
        where: { id: input.participantId },
        data: {
          ...updateField,
          status: "IN_PROGRESS_360",
        },
      });
    }),

  getResults: protectedProcedure
    .input(z.object({ participantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const participant = await ctx.db.review360Participant.findUnique({
        where: { id: input.participantId },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          cycle: { select: { id: true, name: true, period: true, status: true, competencies: true } },
        },
      });

      if (!participant) throw new TRPCError({ code: "NOT_FOUND", message: "Participante não encontrado." });

      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;
      const me = await ctx.db.teamMember.findUnique({ where: { userId } });

      // Only privileged or the participant themselves can see results
      if (!isPrivileged(role) && me?.id !== participant.teamMemberId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para ver os resultados." });
      }

      return participant;
    }),

  nineBox: protectedProcedure
    .input(z.object({ cycleId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const participants = await ctx.db.review360Participant.findMany({
        where: {
          cycleId: input.cycleId,
          performanceScore: { not: null },
          potentialScore: { not: null },
        },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });

      return participants.map((p) => ({
        participantId: p.id,
        teamMemberId: p.teamMemberId,
        name: p.teamMember.user.name,
        avatarUrl: p.teamMember.user.avatar_url,
        performanceScore: p.performanceScore,
        potentialScore: p.potentialScore,
        nineBoxPosition: p.nineBoxPosition,
        developmentAreas: p.developmentAreas,
        strengthsSummary: p.strengthsSummary,
      }));
    }),
});

// ============================================================
// 6. ONE-ON-ONE sub-router
// ============================================================

const oneOnOneRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        managerId: z.string().optional(),
        subordinateId: z.string().optional(),
        status: z.enum(["SCHEDULED", "IN_PROGRESS_1ON1", "COMPLETED_1ON1", "CANCELLED_1ON1", "RESCHEDULED"]).optional(),
        dateFrom: z.coerce.date().optional(),
        dateTo: z.coerce.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      const where: any = {};
      if (input.managerId) where.managerId = input.managerId;
      if (input.subordinateId) where.subordinateId = input.subordinateId;
      if (input.status) where.status = input.status;
      if (input.dateFrom || input.dateTo) {
        where.scheduledAt = {};
        if (input.dateFrom) where.scheduledAt.gte = input.dateFrom;
        if (input.dateTo) where.scheduledAt.lte = input.dateTo;
      }

      // Non-privileged: only see their own 1:1s
      if (!isPrivileged(role)) {
        const me = await ctx.db.teamMember.findUnique({ where: { userId } });
        if (me) {
          where.OR = [{ managerId: me.id }, { subordinateId: me.id }];
        }
      }

      const [items, total] = await Promise.all([
        ctx.db.oneOnOne.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            manager: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
            subordinate: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { scheduledAt: "desc" },
        }),
        ctx.db.oneOnOne.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.db.oneOnOne.findUnique({
        where: { id: input.id },
        include: {
          manager: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          subordinate: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "1:1 não encontrado." });
      return record;
    }),

  create: protectedProcedure
    .input(
      z.object({
        managerId: z.string(),
        subordinateId: z.string(),
        scheduledAt: z.coerce.date(),
        duration: z.number().int().min(15).max(180).default(45),
        location: z.string().optional(),
        recurring: z.boolean().default(true),
        frequency: z.enum(["WEEKLY_1ON1", "BIWEEKLY_1ON1", "MONTHLY_1ON1"]).default("WEEKLY_1ON1"),
        agenda: z.any().optional(),
        calendarEventId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.oneOnOne.create({
        data: {
          managerId: input.managerId,
          subordinateId: input.subordinateId,
          scheduledAt: input.scheduledAt,
          duration: input.duration,
          location: input.location,
          recurring: input.recurring,
          frequency: input.frequency,
          agenda: input.agenda as any,
          calendarEventId: input.calendarEventId,
        },
        include: {
          manager: { include: { user: { select: { id: true, name: true } } } },
          subordinate: { include: { user: { select: { id: true, name: true } } } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.coerce.date().optional(),
        duration: z.number().int().optional(),
        location: z.string().optional(),
        agenda: z.any().optional(),
        notes: z.string().optional(),
        actionItems: z.any().optional(),
        moodScore: z.number().int().min(1).max(5).optional(),
        energyLevel: z.number().int().min(1).max(5).optional(),
        workloadPerception: z.number().int().min(1).max(5).optional(),
        aiSummary: z.string().optional(),
        aiSuggestions: z.any().optional(),
        status: z.enum(["SCHEDULED", "IN_PROGRESS_1ON1", "COMPLETED_1ON1", "CANCELLED_1ON1", "RESCHEDULED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.oneOnOne.update({
        where: { id },
        data: {
          ...data,
          agenda: data.agenda as any,
          actionItems: data.actionItems as any,
          aiSuggestions: data.aiSuggestions as any,
        },
      });
    }),

  complete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
        actionItems: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.oneOnOne.update({
        where: { id: input.id },
        data: {
          status: "COMPLETED_1ON1",
          completedAt: new Date(),
          notes: input.notes,
          actionItems: input.actionItems as any,
        },
      });
    }),

  updateActions: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        actionItems: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            done: z.boolean(),
            dueDate: z.string().optional(),
            assigneeId: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.oneOnOne.update({
        where: { id: input.id },
        data: {
          actionItems: input.actionItems as any,
        },
      });
    }),
});

// ============================================================
// 7. PDI sub-router
// ============================================================

const pdiRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        teamMemberId: z.string().optional(),
        status: z.enum(["DRAFT_PDI", "ACTIVE_PDI", "MID_REVIEW", "FINAL_REVIEW", "COMPLETED_PDI", "ARCHIVED_PDI"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      const where: any = {};
      if (input.teamMemberId) where.teamMemberId = input.teamMemberId;
      if (input.status) where.status = input.status;

      if (!isPrivileged(role) && !input.teamMemberId) {
        const me = await ctx.db.teamMember.findUnique({ where: { userId } });
        if (me) where.teamMemberId = me.id;
      }

      const [items, total] = await Promise.all([
        ctx.db.pDIPlan.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.pDIPlan.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const plan = await ctx.db.pDIPlan.findUnique({
        where: { id: input.id },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "PDI não encontrado." });
      return plan;
    }),

  create: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string(),
        title: z.string().min(1),
        period: z.string(),
        goals: z.any(),
        currentRole: z.enum(["SOCIO", "ADVOGADO_SENIOR", "ADVOGADO_PLENO", "ADVOGADO_JUNIOR", "ESTAGIARIO", "PARALEGAL", "ADMINISTRATIVO"]),
        targetRole: z.enum(["SOCIO", "ADVOGADO_SENIOR", "ADVOGADO_PLENO", "ADVOGADO_JUNIOR", "ESTAGIARIO", "PARALEGAL", "ADMINISTRATIVO"]).optional(),
        timelineMonths: z.number().int().min(1).max(60).optional(),
        aiRecommendations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.pDIPlan.create({
        data: {
          teamMemberId: input.teamMemberId,
          title: input.title,
          period: input.period,
          goals: input.goals as any,
          currentRole: input.currentRole,
          targetRole: input.targetRole,
          timelineMonths: input.timelineMonths,
          aiRecommendations: input.aiRecommendations,
          status: "DRAFT_PDI",
          overallProgress: 0,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        period: z.string().optional(),
        goals: z.any().optional(),
        status: z.enum(["DRAFT_PDI", "ACTIVE_PDI", "MID_REVIEW", "FINAL_REVIEW", "COMPLETED_PDI", "ARCHIVED_PDI"]).optional(),
        targetRole: z.enum(["SOCIO", "ADVOGADO_SENIOR", "ADVOGADO_PLENO", "ADVOGADO_JUNIOR", "ESTAGIARIO", "PARALEGAL", "ADMINISTRATIVO"]).nullable().optional(),
        timelineMonths: z.number().int().optional(),
        aiRecommendations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.pDIPlan.update({
        where: { id },
        data: {
          ...data,
          goals: data.goals as any,
        },
      });
    }),

  updateGoalAction: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        goalIndex: z.number().int().min(0),
        actionIndex: z.number().int().min(0),
        done: z.boolean(),
        completedAt: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.db.pDIPlan.findUnique({ where: { id: input.id } });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "PDI não encontrado." });

      const goals = (plan.goals as any[]) ?? [];
      const goal = goals[input.goalIndex];
      if (!goal) throw new TRPCError({ code: "BAD_REQUEST", message: "Goal index inválido." });

      const actions = (goal.actions as any[]) ?? [];
      if (!actions[input.actionIndex]) throw new TRPCError({ code: "BAD_REQUEST", message: "Action index inválido." });

      actions[input.actionIndex].done = input.done;
      if (input.completedAt) actions[input.actionIndex].completedAt = input.completedAt;
      goals[input.goalIndex].actions = actions;

      // Recalculate overall progress
      let totalActions = 0;
      let doneActions = 0;
      for (const g of goals) {
        const acts = (g.actions as any[]) ?? [];
        totalActions += acts.length;
        doneActions += acts.filter((a: any) => a.done).length;
      }
      const overallProgress = totalActions > 0 ? (doneActions / totalActions) * 100 : 0;

      return ctx.db.pDIPlan.update({
        where: { id: input.id },
        data: {
          goals: goals as any,
          overallProgress,
        },
      });
    }),

  review: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reviewType: z.enum(["mid", "final"]),
        reviewData: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const updateData =
        input.reviewType === "mid"
          ? { midReview: input.reviewData as any, status: "MID_REVIEW" as const }
          : { finalReview: input.reviewData as any, status: "FINAL_REVIEW" as const };

      return ctx.db.pDIPlan.update({
        where: { id: input.id },
        data: updateData,
      });
    }),
});

// ============================================================
// 8. SURVEYS sub-router
// ============================================================

const surveysRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        type: z.enum(["PULSE", "ENPS", "CLIMA", "CUSTOM_SURVEY", "ONBOARDING_SURVEY", "EXIT_SURVEY"]).optional(),
        status: z.enum(["DRAFT_SURVEY", "ACTIVE_SURVEY", "CLOSED_SURVEY", "ANALYZED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.db.pulseSurvey.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            _count: { select: { responses: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.pulseSurvey.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const survey = await ctx.db.pulseSurvey.findUnique({
        where: { id: input.id },
        include: {
          _count: { select: { responses: true } },
        },
      });
      if (!survey) throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa não encontrada." });
      return survey;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        type: z.enum(["PULSE", "ENPS", "CLIMA", "CUSTOM_SURVEY", "ONBOARDING_SURVEY", "EXIT_SURVEY"]),
        questions: z.any(),
        anonymous: z.boolean().default(true),
        frequency: z.enum(["WEEKLY_SURVEY", "BIWEEKLY_SURVEY", "MONTHLY_SURVEY", "QUARTERLY", "SEMESTRAL"]).optional(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      return ctx.db.pulseSurvey.create({
        data: {
          title: input.title,
          type: input.type,
          questions: input.questions as any,
          anonymous: input.anonymous,
          frequency: input.frequency,
          startDate: input.startDate,
          endDate: input.endDate,
          status: "DRAFT_SURVEY",
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        status: z.enum(["DRAFT_SURVEY", "ACTIVE_SURVEY", "CLOSED_SURVEY", "ANALYZED"]).optional(),
        questions: z.any().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        aiAnalysis: z.string().optional(),
        avgScore: z.number().optional(),
        enpsScore: z.number().int().optional(),
        responseRate: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);
      const { id, ...data } = input;
      return ctx.db.pulseSurvey.update({
        where: { id },
        data: {
          ...data,
          questions: data.questions as any,
        },
      });
    }),

  respond: protectedProcedure
    .input(
      z.object({
        surveyId: z.string(),
        answers: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const survey = await ctx.db.pulseSurvey.findUnique({ where: { id: input.surveyId } });
      if (!survey) throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa não encontrada." });
      if (survey.status !== "ACTIVE_SURVEY") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Esta pesquisa não está ativa." });
      }

      const me = await ctx.db.teamMember.findUnique({ where: { userId } });

      // For anonymous surveys, don't store respondentId
      const respondentId = survey.anonymous ? null : me?.id ?? null;

      // Check for duplicate if not anonymous
      if (!survey.anonymous && respondentId) {
        const existing = await ctx.db.pulseSurveyResponse.findUnique({
          where: { surveyId_respondentId: { surveyId: input.surveyId, respondentId } },
        });
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Você já respondeu esta pesquisa." });
      }

      const response = await ctx.db.pulseSurveyResponse.create({
        data: {
          surveyId: input.surveyId,
          respondentId,
          answers: input.answers as any,
        },
      });

      // Update response count
      await ctx.db.pulseSurvey.update({
        where: { id: input.surveyId },
        data: { responseCount: { increment: 1 } },
      });

      return response;
    }),

  results: protectedProcedure
    .input(z.object({ surveyId: z.string() }))
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const survey = await ctx.db.pulseSurvey.findUnique({ where: { id: input.surveyId } });
      if (!survey) throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa não encontrada." });

      const responses = await ctx.db.pulseSurveyResponse.findMany({
        where: { surveyId: input.surveyId },
        // Never include individual respondent info if anonymous
        select: {
          id: true,
          answers: true,
          submittedAt: true,
          respondentId: !survey.anonymous,
        } as any,
      });

      // Aggregate answers by question
      const questionAggregates: Record<string, { values: number[]; texts: string[] }> = {};
      for (const r of responses) {
        const answers = (r.answers as Record<string, any>) ?? {};
        for (const [qKey, answer] of Object.entries(answers)) {
          if (!questionAggregates[qKey]) questionAggregates[qKey] = { values: [], texts: [] };
          if (typeof answer === "number") questionAggregates[qKey].values.push(answer);
          if (typeof answer === "string") questionAggregates[qKey].texts.push(answer);
        }
      }

      const aggregated = Object.entries(questionAggregates).map(([question, data]) => ({
        question,
        avgScore: avg(data.values),
        count: data.values.length + data.texts.length,
        // Only return text responses in non-anonymous surveys
        textResponses: survey.anonymous ? [] : data.texts,
      }));

      return {
        survey,
        totalResponses: responses.length,
        responseRate: survey.responseRate,
        avgScore: survey.avgScore,
        enpsScore: survey.enpsScore,
        aiAnalysis: survey.aiAnalysis,
        aggregated,
      };
    }),
});

// ============================================================
// 9. CLIENT FEEDBACK sub-router
// ============================================================

const clientFeedbackRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        status: z.enum(["PENDING_CF", "RESPONDED", "FOLLOWED_UP", "EXPIRED_CF"]).optional(),
        teamMemberId: z.string().optional(),
        type: z.enum(["NPS", "CSAT", "CES", "FULL_FEEDBACK"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const userId = ctx.session.user.id;

      const where: any = {};
      if (input.status) where.status = input.status;
      if (input.teamMemberId) where.teamMemberId = input.teamMemberId;
      if (input.type) where.type = input.type;

      if (!isPrivileged(role)) {
        const me = await ctx.db.teamMember.findUnique({ where: { userId } });
        if (me) where.teamMemberId = me.id;
      }

      const [items, total] = await Promise.all([
        ctx.db.clientFeedback.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.clientFeedback.count({ where }),
      ]);

      return { items, total };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.clientFeedback.findUnique({
        where: { id: input.id },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Feedback não encontrado." });
      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientName: z.string().min(1),
        clientEmail: z.string().email().optional(),
        clientCompany: z.string().optional(),
        teamMemberId: z.string().optional(),
        caseId: z.string().optional(),
        type: z.enum(["NPS", "CSAT", "CES", "FULL_FEEDBACK"]),
        triggerMoment: z.string().optional(),
        expiresInDays: z.number().int().min(1).max(90).default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      return ctx.db.clientFeedback.create({
        data: {
          clientName: input.clientName,
          clientEmail: input.clientEmail,
          clientCompany: input.clientCompany,
          teamMemberId: input.teamMemberId,
          caseId: input.caseId,
          type: input.type,
          triggerMoment: input.triggerMoment,
          expiresAt,
          // accessToken and id are auto-generated by Prisma defaults
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        followUpDone: z.boolean().optional(),
        followUpNotes: z.string().optional(),
        status: z.enum(["PENDING_CF", "RESPONDED", "FOLLOWED_UP", "EXPIRED_CF"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.clientFeedback.update({ where: { id }, data });
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.clientFeedback.findUnique({
        where: { accessToken: input.token },
        select: {
          id: true,
          clientName: true,
          clientCompany: true,
          type: true,
          triggerMoment: true,
          status: true,
          expiresAt: true,
          teamMember: { include: { user: { select: { name: true } } } },
        },
      });

      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido ou expirado." });

      if (item.expiresAt < new Date()) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Este link de feedback expirou." });
      }

      return item;
    }),

  submitByToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
        npsScore: z.number().int().min(0).max(10).optional(),
        csatCommunication: z.number().int().min(1).max(5).optional(),
        csatResult: z.number().int().min(1).max(5).optional(),
        csatSpeed: z.number().int().min(1).max(5).optional(),
        csatCompetence: z.number().int().min(1).max(5).optional(),
        csatTransparency: z.number().int().min(1).max(5).optional(),
        cesScore: z.number().int().min(1).max(7).optional(),
        positiveComment: z.string().optional(),
        improvementComment: z.string().optional(),
        wouldRecommend: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { token, npsScore, ...scoreData } = input;

      const item = await ctx.db.clientFeedback.findUnique({ where: { accessToken: token } });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Link inválido." });
      if (item.expiresAt < new Date()) throw new TRPCError({ code: "FORBIDDEN", message: "Link expirado." });
      if (item.status === "RESPONDED") throw new TRPCError({ code: "CONFLICT", message: "Feedback já enviado." });

      // Determine NPS category
      let npsCategory: "PROMOTER" | "PASSIVE" | "DETRACTOR" | undefined;
      if (npsScore !== undefined) {
        if (npsScore >= 9) npsCategory = "PROMOTER";
        else if (npsScore >= 7) npsCategory = "PASSIVE";
        else npsCategory = "DETRACTOR";
      }

      // Calculate CSAT overall if applicable
      const csatValues = [
        scoreData.csatCommunication,
        scoreData.csatResult,
        scoreData.csatSpeed,
        scoreData.csatCompetence,
        scoreData.csatTransparency,
      ].filter((v): v is number => v !== undefined);

      const csatOverall = csatValues.length > 0 ? avg(csatValues) : undefined;

      return ctx.db.clientFeedback.update({
        where: { id: item.id },
        data: {
          npsScore,
          npsCategory,
          csatCommunication: scoreData.csatCommunication,
          csatResult: scoreData.csatResult,
          csatSpeed: scoreData.csatSpeed,
          csatCompetence: scoreData.csatCompetence,
          csatTransparency: scoreData.csatTransparency,
          csatOverall,
          cesScore: scoreData.cesScore,
          positiveComment: scoreData.positiveComment,
          improvementComment: scoreData.improvementComment,
          wouldRecommend: scoreData.wouldRecommend,
          status: "RESPONDED",
          respondedAt: new Date(),
        },
      });
    }),

  dashboard: protectedProcedure
    .input(
      z.object({
        teamMemberId: z.string().optional(),
        months: z.number().int().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const since = new Date();
      since.setMonth(since.getMonth() - input.months);

      const where: any = {
        status: "RESPONDED",
        respondedAt: { gte: since },
      };
      if (input.teamMemberId) where.teamMemberId = input.teamMemberId;

      const feedbacks = await ctx.db.clientFeedback.findMany({
        where,
        select: {
          id: true,
          type: true,
          npsScore: true,
          npsCategory: true,
          csatCommunication: true,
          csatResult: true,
          csatSpeed: true,
          csatCompetence: true,
          csatTransparency: true,
          csatOverall: true,
          cesScore: true,
          wouldRecommend: true,
          respondedAt: true,
          teamMemberId: true,
        },
      });

      // NPS calculation: (promoters - detractors) / total * 100
      const npsEntries = feedbacks.filter((f) => f.npsScore !== null);
      const promoters = npsEntries.filter((f) => f.npsCategory === "PROMOTER").length;
      const passives = npsEntries.filter((f) => f.npsCategory === "PASSIVE").length;
      const detractors = npsEntries.filter((f) => f.npsCategory === "DETRACTOR").length;
      const npsScore =
        npsEntries.length > 0 ? Math.round(((promoters - detractors) / npsEntries.length) * 100) : null;

      // CSAT averages
      const csatAvg = {
        communication: avg(feedbacks.map((f) => f.csatCommunication)),
        result: avg(feedbacks.map((f) => f.csatResult)),
        speed: avg(feedbacks.map((f) => f.csatSpeed)),
        competence: avg(feedbacks.map((f) => f.csatCompetence)),
        transparency: avg(feedbacks.map((f) => f.csatTransparency)),
        overall: avg(feedbacks.map((f) => f.csatOverall)),
      };

      // CES average
      const cesAvg = avg(feedbacks.map((f) => f.cesScore));

      // Monthly trend
      const monthlyData: Record<string, { npsScores: number[]; csatScores: number[]; count: number }> = {};
      for (const f of feedbacks) {
        if (!f.respondedAt) continue;
        const monthKey = f.respondedAt.toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { npsScores: [], csatScores: [], count: 0 };
        if (f.npsScore !== null) monthlyData[monthKey].npsScores.push(f.npsScore);
        if (f.csatOverall !== null) monthlyData[monthKey].csatScores.push(Number(f.csatOverall));
        monthlyData[monthKey].count++;
      }

      const trends = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          count: data.count,
          avgNps: avg(data.npsScores),
          avgCsat: avg(data.csatScores),
        }));

      const wouldRecommendRate =
        feedbacks.filter((f) => f.wouldRecommend !== null).length > 0
          ? feedbacks.filter((f) => f.wouldRecommend === true).length /
            feedbacks.filter((f) => f.wouldRecommend !== null).length
          : null;

      return {
        totalResponses: feedbacks.length,
        npsScore,
        npsBreakdown: { promoters, passives, detractors, total: npsEntries.length },
        csatAvg,
        cesAvg,
        wouldRecommendRate,
        trends,
      };
    }),
});

// ============================================================
// 10. COMPLAINTS sub-router
// ============================================================

const complaintsRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        status: z.enum(["RECEIVED", "UNDER_ANALYSIS", "INVESTIGATING", "ACTION_TAKEN", "RESOLVED_COMPLAINT", "DISMISSED", "ARCHIVED_COMPLAINT"]).optional(),
        category: z.enum(["ASSEDIO_MORAL", "ASSEDIO_SEXUAL", "DISCRIMINACAO", "DESVIO_ETICO", "CONFLITO_INTERESSES", "IRREGULARIDADE_FINANCEIRA", "CONDICOES_TRABALHO", "RELACAO_INTERPESSOAL", "SUGESTAO_MELHORIA", "ELOGIO", "OUTRO_COMPLAINT"]).optional(),
        severity: z.enum(["LOW_SEV", "MEDIUM_SEV", "HIGH_SEV", "CRITICAL_SEV"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const where: any = {};
      if (input.status) where.status = input.status;
      if (input.category) where.category = input.category;
      if (input.severity) where.severity = input.severity;

      const [items, total] = await Promise.all([
        ctx.db.complaint.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            assignee: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.complaint.count({ where }),
      ]);

      // Never reveal submitter if anonymous
      return {
        items: items.map((item) => ({
          ...item,
          submitterId: item.isAnonymous ? null : item.submitterId,
          submitter: item.isAnonymous ? null : (item as any).submitter,
        })),
        total,
      };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const item = await ctx.db.complaint.findUnique({
        where: { id: input.id },
        include: {
          assignee: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Denúncia não encontrada." });

      return {
        ...item,
        submitterId: item.isAnonymous ? null : item.submitterId,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        category: z.enum(["ASSEDIO_MORAL", "ASSEDIO_SEXUAL", "DISCRIMINACAO", "DESVIO_ETICO", "CONFLITO_INTERESSES", "IRREGULARIDADE_FINANCEIRA", "CONDICOES_TRABALHO", "RELACAO_INTERPESSOAL", "SUGESTAO_MELHORIA", "ELOGIO", "OUTRO_COMPLAINT"]),
        severity: z.enum(["LOW_SEV", "MEDIUM_SEV", "HIGH_SEV", "CRITICAL_SEV"]).default("MEDIUM_SEV"),
        title: z.string().min(1),
        description: z.string().min(10),
        evidence: z.any().optional(),
        involvedPersonDescription: z.string().optional(),
        isAnonymous: z.boolean().default(true),
        channel: z.enum(["INTERNAL_SYSTEM", "EMAIL_CHANNEL", "WHATSAPP_CHANNEL", "IN_PERSON", "EXTERNAL_LINK"]).default("INTERNAL_SYSTEM"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const me = await ctx.db.teamMember.findUnique({ where: { userId } });

      // Generate tracking code: DEN-{year}-{sequential number}
      const year = new Date().getFullYear();
      const existingCount = await ctx.db.complaint.count({
        where: { trackingCode: { startsWith: `DEN-${year}-` } },
      });
      const seq = String(existingCount + 1).padStart(4, "0");
      const trackingCode = `DEN-${year}-${seq}`;

      return ctx.db.complaint.create({
        data: {
          submitterId: input.isAnonymous ? null : me?.id,
          isAnonymous: input.isAnonymous,
          category: input.category,
          severity: input.severity,
          title: input.title,
          description: input.description,
          evidence: input.evidence as any,
          involvedPersonDescription: input.involvedPersonDescription,
          channel: input.channel,
          trackingCode,
          status: "RECEIVED",
          timeline: [
            {
              event: "RECEIVED",
              date: new Date().toISOString(),
              note: "Denúncia recebida pelo sistema.",
            },
          ] as any,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["RECEIVED", "UNDER_ANALYSIS", "INVESTIGATING", "ACTION_TAKEN", "RESOLVED_COMPLAINT", "DISMISSED", "ARCHIVED_COMPLAINT"]).optional(),
        assigneeId: z.string().nullable().optional(),
        resolution: z.string().optional(),
        timelineEvent: z
          .object({
            event: z.string(),
            note: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const current = await ctx.db.complaint.findUnique({ where: { id: input.id } });
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Denúncia não encontrada." });

      const timeline = ((current.timeline as any[]) ?? []).concat(
        input.timelineEvent
          ? [{ ...input.timelineEvent, date: new Date().toISOString() }]
          : []
      );

      return ctx.db.complaint.update({
        where: { id: input.id },
        data: {
          status: input.status,
          assigneeId: input.assigneeId ?? undefined,
          resolution: input.resolution,
          resolvedAt:
            input.status === "RESOLVED_COMPLAINT" || input.status === "DISMISSED"
              ? new Date()
              : undefined,
          timeline: timeline as any,
        },
      });
    }),

  track: publicProcedure
    .input(z.object({ trackingCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const complaint = await ctx.db.complaint.findUnique({
        where: { trackingCode: input.trackingCode },
        select: {
          trackingCode: true,
          category: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          // Only public-safe limited info
        },
      });

      if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Código de rastreamento não encontrado." });

      return complaint;
    }),

  report: protectedProcedure
    .input(
      z.object({
        year: z.number().int().optional(),
        quarter: z.number().int().min(1).max(4).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const where: any = {};
      if (input.year) {
        const start = new Date(input.year, 0, 1);
        const end = new Date(input.year + 1, 0, 1);
        where.createdAt = { gte: start, lt: end };

        if (input.quarter) {
          const qStart = new Date(input.year, (input.quarter - 1) * 3, 1);
          const qEnd = new Date(input.year, input.quarter * 3, 1);
          where.createdAt = { gte: qStart, lt: qEnd };
        }
      }

      const complaints = await ctx.db.complaint.findMany({
        where,
        select: {
          id: true,
          category: true,
          severity: true,
          status: true,
          isAnonymous: true,
          channel: true,
          createdAt: true,
          resolvedAt: true,
        },
      });

      const byCategory: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      for (const c of complaints) {
        byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
        bySeverity[c.severity] = (bySeverity[c.severity] ?? 0) + 1;
        byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      }

      const resolved = complaints.filter((c) => c.resolvedAt !== null);
      const avgResolutionDays =
        resolved.length > 0
          ? resolved.reduce((sum, c) => {
              const days = (c.resolvedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / resolved.length
          : null;

      return {
        totalComplaints: complaints.length,
        anonymousCount: complaints.filter((c) => c.isAnonymous).length,
        resolvedCount: resolved.length,
        openCount: complaints.filter((c) => c.status === "RECEIVED" || c.status === "UNDER_ANALYSIS" || c.status === "INVESTIGATING").length,
        avgResolutionDays,
        byCategory,
        bySeverity,
        byStatus,
      };
    }),
});

// ============================================================
// 11. RECOGNITION sub-router
// ============================================================

const recognitionRouter = router({
  list: protectedProcedure
    .input(
      paginationInput.extend({
        category: z.enum(["HIGH_FIVE", "STAR_OF_WEEK", "MILESTONE_REC", "CLIENT_PRAISE", "INNOVATION", "MENTORSHIP"]).optional(),
        toId: z.string().optional(),
        fromId: z.string().optional(),
        onlyPublic: z.boolean().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.category) where.category = input.category;
      if (input.toId) where.toId = input.toId;
      if (input.fromId) where.fromId = input.fromId;
      if (input.onlyPublic) where.isPublic = true;

      const [items, total] = await Promise.all([
        ctx.db.recognition.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            from: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
            to: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          },
          orderBy: { createdAt: "desc" },
        }),
        ctx.db.recognition.count({ where }),
      ]);

      return { items, total };
    }),

  create: protectedProcedure
    .input(
      z.object({
        toId: z.string(),
        message: z.string().min(10),
        category: z.enum(["HIGH_FIVE", "STAR_OF_WEEK", "MILESTONE_REC", "CLIENT_PRAISE", "INNOVATION", "MENTORSHIP"]),
        competency: z.enum([
          "TECNICA_JURIDICA", "COMUNICACAO_CLIENTE", "NEGOCIACAO", "GESTAO_PRAZOS",
          "REDACAO_JURIDICA", "ORATORIA_AUDIENCIA", "PESQUISA_JURISPRUDENCIAL",
          "BUSINESS_DEVELOPMENT", "TRABALHO_EQUIPE", "LIDERANCA",
          "COMPETENCIA_TECNOLOGICA", "ETICA_PROFISSIONAL",
        ]).optional(),
        isPublic: z.boolean().default(true),
        caseId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const me = await ctx.db.teamMember.findUnique({ where: { userId } });
      if (!me) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não é membro da equipe." });

      if (me.id === input.toId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode reconhecer a si mesmo." });
      }

      return ctx.db.recognition.create({
        data: {
          fromId: me.id,
          toId: input.toId,
          message: input.message,
          category: input.category,
          competency: input.competency,
          isPublic: input.isPublic,
          caseId: input.caseId,
          reactions: {} as any,
        },
        include: {
          from: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          to: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });
    }),

  react: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        emoji: z.string().min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const recognition = await ctx.db.recognition.findUnique({ where: { id: input.id } });
      if (!recognition) throw new TRPCError({ code: "NOT_FOUND", message: "Reconhecimento não encontrado." });

      const reactions = ((recognition.reactions as Record<string, number>) ?? {});
      reactions[input.emoji] = (reactions[input.emoji] ?? 0) + 1;

      return ctx.db.recognition.update({
        where: { id: input.id },
        data: { reactions: reactions as any },
      });
    }),
});

// ============================================================
// 12. WELLBEING sub-router
// ============================================================

const wellbeingRouter = router({
  checkin: protectedProcedure
    .input(
      z.object({
        mood: z.number().int().min(1).max(5),
        energy: z.number().int().min(1).max(5),
        workload: z.number().int().min(1).max(5),
        satisfaction: z.number().int().min(1).max(5),
        sleepQuality: z.number().int().min(1).max(5).optional(),
        feelingBurnout: z.boolean().default(false),
        needsSupport: z.boolean().default(false),
        notes: z.string().optional(),
        weekHoursLogged: z.number().optional(),
        deadlinesPending: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const me = await ctx.db.teamMember.findUnique({ where: { userId } });
      if (!me) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não é membro da equipe." });

      // Simple burnout risk heuristic
      let aiAlertLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
      let aiAlert: string | undefined;

      if (input.feelingBurnout || (input.mood <= 2 && input.workload >= 4)) {
        aiAlertLevel = "HIGH";
        aiAlert = "Alto risco de burnout detectado. Recomenda-se conversa com o gestor.";
      } else if (input.mood <= 2 || input.workload >= 5) {
        aiAlertLevel = "MODERATE";
        aiAlert = "Sinais de estresse elevado. Atenção recomendada.";
      }

      const checkin = await ctx.db.wellbeingCheckin.create({
        data: {
          teamMemberId: me.id,
          mood: input.mood,
          energy: input.energy,
          workload: input.workload,
          satisfaction: input.satisfaction,
          sleepQuality: input.sleepQuality,
          feelingBurnout: input.feelingBurnout,
          needsSupport: input.needsSupport,
          notes: input.notes,
          weekHoursLogged: input.weekHoursLogged,
          deadlinesPending: input.deadlinesPending,
          aiAlert,
          aiAlertLevel,
        },
      });

      // Update the TeamMember's lastWellbeingScore and burnoutRiskLevel
      const avgScore = Math.round((input.mood + input.energy + (6 - input.workload) + input.satisfaction) / 4);
      await ctx.db.teamMember.update({
        where: { id: me.id },
        data: {
          lastWellbeingScore: avgScore,
          burnoutRiskLevel: aiAlertLevel,
        },
      });

      return checkin;
    }),

  dashboard: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      assertPrivileged((ctx.session.user as any).role);

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const checkins = await ctx.db.wellbeingCheckin.findMany({
        where: { checkedAt: { gte: since } },
        include: {
          teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
        orderBy: { checkedAt: "asc" },
      });

      // Group by member
      const byMember: Record<string, typeof checkins> = {};
      for (const c of checkins) {
        if (!byMember[c.teamMemberId]) byMember[c.teamMemberId] = [];
        byMember[c.teamMemberId].push(c);
      }

      // Per-member summary for heatmap
      const memberSummaries = Object.entries(byMember).map(([memberId, memberCheckins]) => {
        const latest = memberCheckins[memberCheckins.length - 1];
        return {
          memberId,
          memberName: latest.teamMember.user.name,
          avatarUrl: latest.teamMember.user.avatar_url,
          checkinCount: memberCheckins.length,
          avgMood: avg(memberCheckins.map((c) => c.mood)),
          avgEnergy: avg(memberCheckins.map((c) => c.energy)),
          avgWorkload: avg(memberCheckins.map((c) => c.workload)),
          avgSatisfaction: avg(memberCheckins.map((c) => c.satisfaction)),
          burnoutRisk: latest.teamMember.burnoutRiskLevel,
          needsSupport: memberCheckins.some((c) => c.needsSupport),
        };
      });

      // Team burnout risk index (0-100)
      const allMembers = await ctx.db.teamMember.findMany({ select: { burnoutRiskLevel: true } });
      const riskWeights = { LOW: 0, MODERATE: 33, HIGH: 67, CRITICAL: 100 };
      const burnoutIndex =
        allMembers.length > 0
          ? Math.round(avg(allMembers.map((m) => riskWeights[m.burnoutRiskLevel as keyof typeof riskWeights] ?? 0)))
          : 0;

      // Daily team averages
      const dailyData: Record<string, { moods: number[]; energies: number[]; workloads: number[] }> = {};
      for (const c of checkins) {
        const dayKey = c.checkedAt.toISOString().slice(0, 10);
        if (!dailyData[dayKey]) dailyData[dayKey] = { moods: [], energies: [], workloads: [] };
        dailyData[dayKey].moods.push(c.mood);
        dailyData[dayKey].energies.push(c.energy);
        dailyData[dayKey].workloads.push(c.workload);
      }

      const dailyTrend = Object.entries(dailyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, data]) => ({
          day,
          avgMood: avg(data.moods),
          avgEnergy: avg(data.energies),
          avgWorkload: avg(data.workloads),
        }));

      return {
        memberSummaries,
        burnoutIndex,
        dailyTrend,
        totalCheckins: checkins.length,
        membersNeedingSupport: memberSummaries.filter((m) => m.needsSupport).length,
      };
    }),

  alerts: protectedProcedure.query(async ({ ctx }) => {
    assertPrivileged((ctx.session.user as any).role);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Members with mood <= 2 for 3+ consecutive days
    const recentCheckins = await ctx.db.wellbeingCheckin.findMany({
      where: { checkedAt: { gte: threeDaysAgo } },
      include: {
        teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
      },
      orderBy: { checkedAt: "desc" },
    });

    const byMemberRecent: Record<string, typeof recentCheckins> = {};
    for (const c of recentCheckins) {
      if (!byMemberRecent[c.teamMemberId]) byMemberRecent[c.teamMemberId] = [];
      byMemberRecent[c.teamMemberId].push(c);
    }

    const lowMoodAlerts = Object.entries(byMemberRecent)
      .filter(([, memberCheckins]) => {
        if (memberCheckins.length < 3) return false;
        return memberCheckins.slice(0, 3).every((c) => c.mood <= 2);
      })
      .map(([memberId, memberCheckins]) => ({
        type: "LOW_MOOD" as const,
        memberId,
        memberName: memberCheckins[0].teamMember.user.name,
        avatarUrl: memberCheckins[0].teamMember.user.avatar_url,
        avgMood: avg(memberCheckins.slice(0, 3).map((c) => c.mood)),
        consecutiveDays: Math.min(memberCheckins.length, 3),
      }));

    // Members with workload = 5 for 2+ weeks
    const olderCheckins = await ctx.db.wellbeingCheckin.findMany({
      where: { checkedAt: { gte: twoWeeksAgo }, workload: { gte: 5 } },
      include: {
        teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
      },
    });

    const highWorkloadByMember: Record<string, typeof olderCheckins> = {};
    for (const c of olderCheckins) {
      if (!highWorkloadByMember[c.teamMemberId]) highWorkloadByMember[c.teamMemberId] = [];
      highWorkloadByMember[c.teamMemberId].push(c);
    }

    const highWorkloadAlerts = Object.entries(highWorkloadByMember)
      .filter(([, memberCheckins]) => memberCheckins.length >= 10) // ~10 business days = 2 weeks
      .map(([memberId, memberCheckins]) => ({
        type: "HIGH_WORKLOAD" as const,
        memberId,
        memberName: memberCheckins[0].teamMember.user.name,
        avatarUrl: memberCheckins[0].teamMember.user.avatar_url,
        avgWorkload: avg(memberCheckins.map((c) => c.workload)),
        checkinCount: memberCheckins.length,
      }));

    // Members flagging needsSupport
    const supportNeeded = await ctx.db.wellbeingCheckin.findMany({
      where: { needsSupport: true, checkedAt: { gte: threeDaysAgo } },
      include: {
        teamMember: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
      },
      orderBy: { checkedAt: "desc" },
      distinct: ["teamMemberId"],
    });

    const supportAlerts = supportNeeded.map((c) => ({
      type: "NEEDS_SUPPORT" as const,
      memberId: c.teamMemberId,
      memberName: c.teamMember.user.name,
      avatarUrl: c.teamMember.user.avatar_url,
      lastCheckin: c.checkedAt,
      notes: c.notes,
    }));

    return {
      lowMoodAlerts,
      highWorkloadAlerts,
      supportAlerts,
      totalAlerts: lowMoodAlerts.length + highWorkloadAlerts.length + supportAlerts.length,
    };
  }),

  myHistory: protectedProcedure
    .input(
      paginationInput.extend({
        days: z.number().int().min(7).max(365).default(90),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const me = await ctx.db.teamMember.findUnique({ where: { userId } });
      if (!me) throw new TRPCError({ code: "NOT_FOUND", message: "Membro não encontrado." });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const [items, total] = await Promise.all([
        ctx.db.wellbeingCheckin.findMany({
          where: { teamMemberId: me.id, checkedAt: { gte: since } },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          orderBy: { checkedAt: "desc" },
        }),
        ctx.db.wellbeingCheckin.count({
          where: { teamMemberId: me.id, checkedAt: { gte: since } },
        }),
      ]);

      return { items, total };
    }),
});

// ============================================================
// 13. PANEL DATA sub-router
// ============================================================

const panelDataRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const role = (ctx.session.user as any).role;
    const userId = ctx.session.user.id;

    const me = await ctx.db.teamMember.findUnique({ where: { userId } });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      activeOKRs,
      recentFeedbackCount,
      recentOneOnOneCount,
      recentRecognitions,
      allMembers,
      latestSurvey,
      latestClientFeedbacks,
      wellbeingAlerts,
    ] = await Promise.all([
      // OKR average progress (active OKRs)
      ctx.db.oKR.aggregate({
        where: { status: "ACTIVE" },
        _avg: { overallProgress: true },
        _count: { id: true },
      }),

      // Feedback count (last 30 days)
      ctx.db.feedback.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),

      // 1:1 meetings count (last 30 days)
      ctx.db.oneOnOne.count({
        where: {
          status: { in: ["COMPLETED_1ON1"] },
          completedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Recent recognitions (last 7 days)
      ctx.db.recognition.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, isPublic: true },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          from: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          to: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      }),

      // All team members for burnout index
      ctx.db.teamMember.findMany({
        select: { burnoutRiskLevel: true },
      }),

      // Latest eNPS survey
      ctx.db.pulseSurvey.findFirst({
        where: { type: "ENPS", status: { not: "DRAFT_SURVEY" } },
        orderBy: { createdAt: "desc" },
        select: { enpsScore: true, avgScore: true, responseRate: true },
      }),

      // Latest client feedbacks for NPS
      ctx.db.clientFeedback.findMany({
        where: { status: "RESPONDED", respondedAt: { gte: thirtyDaysAgo } },
        select: { npsScore: true, npsCategory: true },
      }),

      // Active wellbeing alerts count
      ctx.db.wellbeingCheckin.count({
        where: {
          checkedAt: { gte: sevenDaysAgo },
          OR: [{ needsSupport: true }, { feelingBurnout: true }, { mood: { lte: 2 } }],
        },
      }),
    ]);

    // Calculate eNPS from latest survey
    const eNPS = latestSurvey?.enpsScore ?? null;

    // Calculate client NPS
    const npsResponses = latestClientFeedbacks.filter((f) => f.npsScore !== null);
    const promoters = npsResponses.filter((f) => f.npsCategory === "PROMOTER").length;
    const detractors = npsResponses.filter((f) => f.npsCategory === "DETRACTOR").length;
    const clientNPS =
      npsResponses.length > 0 ? Math.round(((promoters - detractors) / npsResponses.length) * 100) : null;

    // Burnout index
    const riskWeights = { LOW: 0, MODERATE: 33, HIGH: 67, CRITICAL: 100 };
    const burnoutIndex =
      allMembers.length > 0
        ? Math.round(
            avg(allMembers.map((m) => riskWeights[m.burnoutRiskLevel as keyof typeof riskWeights] ?? 0))
          )
        : 0;

    // My personal data (if applicable)
    let myData = null;
    if (me) {
      const myActiveOKR = await ctx.db.oKR.findFirst({
        where: { teamMemberId: me.id, status: "ACTIVE" },
        orderBy: [{ year: "desc" }, { quarter: "desc" }],
      });

      const myUpcomingOneOnOne = await ctx.db.oneOnOne.findFirst({
        where: {
          OR: [{ managerId: me.id }, { subordinateId: me.id }],
          status: "SCHEDULED",
          scheduledAt: { gte: now },
        },
        orderBy: { scheduledAt: "asc" },
        include: {
          manager: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          subordinate: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
        },
      });

      const myPendingFeedback = await ctx.db.feedback.count({
        where: { targetId: me.id, acknowledged: false },
      });

      myData = {
        activeOKR: myActiveOKR,
        upcomingOneOnOne: myUpcomingOneOnOne,
        pendingFeedbackCount: myPendingFeedback,
        lastWellbeingScore: me.lastWellbeingScore,
        burnoutRiskLevel: me.burnoutRiskLevel,
      };
    }

    return {
      // Team-wide metrics
      eNPS,
      clientNPS,
      burnoutIndex,
      activeOKRCount: activeOKRs._count.id,
      avgOKRProgress: activeOKRs._avg.overallProgress ?? 0,
      recentFeedbackCount,
      recentOneOnOneCount,
      wellbeingAlertCount: wellbeingAlerts,
      // Recent recognitions feed
      recentRecognitions,
      // Personal data for logged-in user
      myData,
    };
  }),
});

// ============================================================
// ROOT teamRouter
// ============================================================

export const teamRouter = router({
  members: membersRouter,
  okrs: okrsRouter,
  kpis: kpisRouter,
  feedback: feedbackRouter,
  review360: review360Router,
  oneOnOne: oneOnOneRouter,
  pdi: pdiRouter,
  surveys: surveysRouter,
  clientFeedback: clientFeedbackRouter,
  complaints: complaintsRouter,
  recognition: recognitionRouter,
  wellbeing: wellbeingRouter,
  panelData: panelDataRouter,
});
