import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

// ─── Helper: convert Prisma BigInt to Number for JSON ────
function bigIntToNumber(value: bigint | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// ─── Zod enums matching Prisma enums ─────────────────────

const propertyOwnershipEnum = z.enum([
  "PROPRIO",
  "ARRENDADO",
  "PARCERIA",
  "COMODATO",
  "POSSE",
  "CONDOMINIO",
]);

const harvestSeasonEnum = z.enum(["SAFRA", "SAFRINHA", "INVERNO", "PERENE"]);

const cropTypeEnum = z.enum([
  "SOJA",
  "MILHO",
  "MILHO_SAFRINHA",
  "ALGODAO",
  "CAFE",
  "CANA_DE_ACUCAR",
  "ARROZ",
  "FEIJAO",
  "TRIGO",
  "SORGO",
  "GIRASSOL",
  "EUCALIPTO",
  "PECUARIA_CORTE",
  "PECUARIA_LEITE",
  "SUINOCULTURA",
  "AVICULTURA",
  "PISCICULTURA",
  "FRUTICULTURA",
  "HORTICULTURA",
  "SILVICULTURA",
  "OUTRA",
]);

const urbanPropertyTypeEnum = z.enum([
  "CASA",
  "APARTAMENTO",
  "SALA_COMERCIAL",
  "GALPAO",
  "TERRENO",
  "LOJA",
  "PREDIO_COMERCIAL",
  "FAZENDA_URBANA",
  "OUTRO",
]);

const vehicleCategoryEnum = z.enum([
  "AUTOMOVEL",
  "CAMINHONETE",
  "CAMINHAO",
  "CAMINHAO_PESADO",
  "VAN_UTILITARIO",
  "MOTOCICLETA",
  "TRATOR",
  "COLHEITADEIRA",
  "PLANTADEIRA",
  "PULVERIZADOR",
  "CARRETA_AGRICOLA",
  "SILO",
  "SECADOR",
  "PIVO_IRRIGACAO",
  "GERADOR",
  "EQUIPAMENTO_INDUSTRIAL",
  "EQUIPAMENTO_ESCRITORIO",
  "OUTRO_VEICULO",
]);

const participationTypeEnum = z.enum([
  "SOCIO_QUOTISTA",
  "SOCIO_ADMINISTRADOR_PART",
  "ACIONISTA_CONTROLADOR",
  "ACIONISTA_MINORITARIO",
  "COOPERADO",
  "CONSORCIO",
]);

const financialPeriodEnum = z.enum(["ANUAL", "TRIMESTRAL", "MENSAL"]);

// ─── Client Patrimony Router ─────────────────────────────

export const clientPatrimonyRouter = router({
  // ═══════════════════════════════════════════════════════════
  // GET SUMMARY — consolidated patrimony overview
  // ═══════════════════════════════════════════════════════════
  getSummary: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { clientId } = input;

      // Fetch all active assets in parallel
      const [
        ruralProperties,
        urbanProperties,
        vehicles,
        participations,
        latestFinancialArr,
        latestOperationalArr,
      ] = await Promise.all([
        ctx.db.clientRuralProperty.findMany({
          where: { clientId, isActive: true },
        }),
        ctx.db.clientUrbanProperty.findMany({
          where: { clientId, isActive: true },
        }),
        ctx.db.clientVehicle.findMany({
          where: { clientId, isActive: true },
        }),
        ctx.db.clientCorporateParticipation.findMany({
          where: { clientId, isActive: true },
        }),
        ctx.db.clientFinancialData.findMany({
          where: { clientId },
          orderBy: { year: "desc" },
          take: 1,
        }),
        ctx.db.clientOperationalData.findMany({
          where: { clientId },
          orderBy: { year: "desc" },
          take: 1,
        }),
      ]);

      // Fetch current harvest productions (latest harvestYear)
      const latestHarvestRecord =
        await ctx.db.clientAgriculturalProduction.findFirst({
          where: { clientId },
          orderBy: { harvestYear: "desc" },
          select: { harvestYear: true },
        });

      const currentHarvestYear = latestHarvestRecord?.harvestYear ?? null;
      const harvestProductions = currentHarvestYear
        ? await ctx.db.clientAgriculturalProduction.findMany({
            where: { clientId, harvestYear: currentHarvestYear },
          })
        : [];

      // ── Calculate totals ──────────────────────────────
      const ruralValues = ruralProperties.map((r) =>
        bigIntToNumber(r.estimatedValue)
      );
      const urbanValues = urbanProperties.map((u) =>
        bigIntToNumber(u.estimatedValue)
      );
      const vehicleValues = vehicles.map((v) =>
        bigIntToNumber(v.estimatedValue)
      );
      const participationValues = participations.map((p) =>
        bigIntToNumber(p.estimatedValue)
      );

      const totalAssets =
        ruralValues.reduce((a, b) => a + b, 0) +
        urbanValues.reduce((a, b) => a + b, 0) +
        vehicleValues.reduce((a, b) => a + b, 0) +
        participationValues.reduce((a, b) => a + b, 0);

      const totalRuralArea = ruralProperties.reduce(
        (sum, r) => sum + (r.totalArea || 0),
        0
      );
      const totalOwnedArea = ruralProperties
        .filter((r) => r.ownership === "PROPRIO")
        .reduce((sum, r) => sum + (r.totalArea || 0), 0);

      // Lien amounts from all asset types that have hasLien
      const ruralLien = ruralProperties
        .filter((r) => r.hasLien)
        .reduce((sum, r) => sum + bigIntToNumber(r.lienAmount), 0);
      const urbanLien = urbanProperties
        .filter((u) => u.hasLien)
        .reduce((sum, u) => sum + bigIntToNumber(u.lienAmount), 0);
      const vehicleLien = vehicles
        .filter((v) => v.hasLien)
        .reduce((sum, v) => sum + bigIntToNumber(v.lienAmount), 0);
      const totalLienAmount = ruralLien + urbanLien + vehicleLien;

      // Free assets: totalAssets minus value of encumbered assets
      const encumberedRural = ruralProperties
        .filter((r) => r.hasLien || r.hasJudicialBlock)
        .reduce((sum, r) => sum + bigIntToNumber(r.estimatedValue), 0);
      const encumberedUrban = urbanProperties
        .filter((u) => u.hasLien || u.hasJudicialBlock)
        .reduce((sum, u) => sum + bigIntToNumber(u.estimatedValue), 0);
      const encumberedVehicles = vehicles
        .filter((v) => v.hasLien || v.hasJudicialBlock)
        .reduce((sum, v) => sum + bigIntToNumber(v.estimatedValue), 0);
      const freeAssets =
        totalAssets - encumberedRural - encumberedUrban - encumberedVehicles;

      // ── Current harvest ───────────────────────────────
      const totalPlantedArea = harvestProductions.reduce(
        (sum, p) => sum + (p.plantedArea || 0),
        0
      );
      const estimatedRevenue = harvestProductions.reduce(
        (sum, p) => sum + bigIntToNumber(p.totalRevenue),
        0
      );
      const estimatedCost = harvestProductions.reduce(
        (sum, p) => sum + bigIntToNumber(p.productionCost),
        0
      );
      const estimatedProfit = estimatedRevenue - estimatedCost;

      const mainCropsSet = new Set(harvestProductions.map((p) => p.crop));
      const mainCrops = Array.from(mainCropsSet);

      // ── Financial indicators ──────────────────────────
      const latestFinancial = latestFinancialArr[0] ?? null;
      let financialIndicators = null;

      if (latestFinancial) {
        const equity = bigIntToNumber(latestFinancial.equity);
        const totalDebt = bigIntToNumber(latestFinancial.totalDebt);
        const netDebt = bigIntToNumber(latestFinancial.netDebt);
        const ebitda = bigIntToNumber(latestFinancial.ebitda);
        const currentAssets = bigIntToNumber(latestFinancial.currentAssets);
        const currentLiabilities = bigIntToNumber(
          latestFinancial.currentLiabilities
        );
        const grossProfit = bigIntToNumber(latestFinancial.grossProfit);
        const netRevenue = bigIntToNumber(latestFinancial.netRevenue);
        const netIncome = bigIntToNumber(latestFinancial.netIncome);

        financialIndicators = {
          debtToEquity: equity !== 0 ? totalDebt / equity : null,
          debtToEbitda: ebitda !== 0 ? netDebt / ebitda : null,
          currentRatio:
            currentLiabilities !== 0 ? currentAssets / currentLiabilities : null,
          grossMargin:
            netRevenue !== 0 ? (grossProfit / netRevenue) * 100 : null,
          ebitdaMargin: netRevenue !== 0 ? (ebitda / netRevenue) * 100 : null,
          netMargin: netRevenue !== 0 ? (netIncome / netRevenue) * 100 : null,
          roe: equity !== 0 ? (netIncome / equity) * 100 : null,
        };
      }

      // ── Latest operational ────────────────────────────
      const latestOperational = latestOperationalArr[0] ?? null;

      // ── Build response (converting all BigInt fields) ─
      return {
        totalAssets,
        totalRuralArea,
        totalOwnedArea,
        totalLienAmount,
        freeAssets,
        counts: {
          ruralProperties: ruralProperties.length,
          urbanProperties: urbanProperties.length,
          vehicles: vehicles.length,
          participations: participations.length,
        },
        currentHarvest: {
          harvestYear: currentHarvestYear,
          totalPlantedArea,
          estimatedRevenue,
          estimatedCost,
          estimatedProfit,
          mainCrops,
        },
        latestFinancial: latestFinancial
          ? {
              id: latestFinancial.id,
              year: latestFinancial.year,
              period: latestFinancial.period,
              quarter: latestFinancial.quarter,
              grossRevenue: bigIntToNumber(latestFinancial.grossRevenue),
              netRevenue: bigIntToNumber(latestFinancial.netRevenue),
              cogs: bigIntToNumber(latestFinancial.cogs),
              grossProfit: bigIntToNumber(latestFinancial.grossProfit),
              operatingExpenses: bigIntToNumber(
                latestFinancial.operatingExpenses
              ),
              ebitda: bigIntToNumber(latestFinancial.ebitda),
              depreciation: bigIntToNumber(latestFinancial.depreciation),
              ebit: bigIntToNumber(latestFinancial.ebit),
              financialExpenses: bigIntToNumber(
                latestFinancial.financialExpenses
              ),
              financialIncome: bigIntToNumber(latestFinancial.financialIncome),
              netIncome: bigIntToNumber(latestFinancial.netIncome),
              totalAssets: bigIntToNumber(latestFinancial.totalAssets),
              currentAssets: bigIntToNumber(latestFinancial.currentAssets),
              nonCurrentAssets: bigIntToNumber(
                latestFinancial.nonCurrentAssets
              ),
              totalLiabilities: bigIntToNumber(
                latestFinancial.totalLiabilities
              ),
              currentLiabilities: bigIntToNumber(
                latestFinancial.currentLiabilities
              ),
              nonCurrentLiabilities: bigIntToNumber(
                latestFinancial.nonCurrentLiabilities
              ),
              equity: bigIntToNumber(latestFinancial.equity),
              cash: bigIntToNumber(latestFinancial.cash),
              totalDebt: bigIntToNumber(latestFinancial.totalDebt),
              shortTermDebt: bigIntToNumber(latestFinancial.shortTermDebt),
              longTermDebt: bigIntToNumber(latestFinancial.longTermDebt),
              netDebt: bigIntToNumber(latestFinancial.netDebt),
              operatingCashFlow: bigIntToNumber(
                latestFinancial.operatingCashFlow
              ),
              investingCashFlow: bigIntToNumber(
                latestFinancial.investingCashFlow
              ),
              financingCashFlow: bigIntToNumber(
                latestFinancial.financingCashFlow
              ),
              source: latestFinancial.source,
              documentUrl: latestFinancial.documentUrl,
              notes: latestFinancial.notes,
              indicators: financialIndicators,
            }
          : null,
        latestOperational: latestOperational
          ? {
              id: latestOperational.id,
              year: latestOperational.year,
              totalEmployees: latestOperational.totalEmployees,
              cltEmployees: latestOperational.cltEmployees,
              temporaryWorkers: latestOperational.temporaryWorkers,
              monthlyPayroll: bigIntToNumber(latestOperational.monthlyPayroll),
              annualPayroll: bigIntToNumber(latestOperational.annualPayroll),
              totalManagedArea: latestOperational.totalManagedArea,
              ownedArea: latestOperational.ownedArea,
              leasedArea: latestOperational.leasedArea,
              storageCapacity: latestOperational.storageCapacity,
              cattleHeadCount: latestOperational.cattleHeadCount,
              vehicleCount: latestOperational.vehicleCount,
              machineCount: latestOperational.machineCount,
              truckCount: latestOperational.truckCount,
              operationalUnits: latestOperational.operationalUnits,
              states: latestOperational.states,
              certifications: latestOperational.certifications,
              notes: latestOperational.notes,
            }
          : null,
      };
    }),

  // ═══════════════════════════════════════════════════════════
  // RURAL PROPERTIES sub-router
  // ═══════════════════════════════════════════════════════════
  ruralProperties: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ ctx, input }) => {
        const properties = await ctx.db.clientRuralProperty.findMany({
          where: { clientId: input.clientId, isActive: true },
          include: { productions: true },
          orderBy: { name: "asc" },
        });

        return properties.map((p) => ({
          ...p,
          annualRent: bigIntToNumber(p.annualRent),
          estimatedValue: bigIntToNumber(p.estimatedValue),
          valuePerHectare: bigIntToNumber(p.valuePerHectare),
          lienAmount: bigIntToNumber(p.lienAmount),
          productions: p.productions.map((prod) => ({
            ...prod,
            averagePrice: bigIntToNumber(prod.averagePrice),
            totalRevenue: bigIntToNumber(prod.totalRevenue),
            productionCost: bigIntToNumber(prod.productionCost),
            costPerHectare: bigIntToNumber(prod.costPerHectare),
            financingAmount: bigIntToNumber(prod.financingAmount),
          })),
        }));
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          name: z.string().min(1, "Nome é obrigatório"),
          registrationNumber: z.string().optional(),
          carCode: z.string().optional(),
          incraCode: z.string().optional(),
          nirf: z.string().optional(),
          address: z.string().optional(),
          city: z.string().min(1, "Cidade é obrigatória"),
          state: z.string().min(1, "Estado é obrigatório"),
          comarca: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          totalArea: z.number().min(0, "Área total é obrigatória"),
          productiveArea: z.number().optional(),
          pastureland: z.number().optional(),
          nativeVegetation: z.number().optional(),
          forestArea: z.number().optional(),
          improvementArea: z.number().optional(),
          irrigatedArea: z.number().optional(),
          ownership: propertyOwnershipEnum.optional(),
          ownerName: z.string().optional(),
          ownerDocument: z.string().optional(),
          contractEndDate: z.coerce.date().optional().nullable(),
          annualRent: z.number().optional(),
          estimatedValue: z.number().optional(),
          valuePerHectare: z.number().optional(),
          appraisalDate: z.coerce.date().optional().nullable(),
          appraisalSource: z.string().optional(),
          hasLien: z.boolean().optional(),
          lienHolder: z.string().optional(),
          lienAmount: z.number().optional(),
          hasJudicialBlock: z.boolean().optional(),
          blockDetails: z.string().optional(),
          hasEnvironmentalIssue: z.boolean().optional(),
          environmentalNotes: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const property = await ctx.db.clientRuralProperty.create({
          data: {
            clientId: input.clientId,
            name: input.name,
            registrationNumber: input.registrationNumber,
            carCode: input.carCode,
            incraCode: input.incraCode,
            nirf: input.nirf,
            address: input.address,
            city: input.city,
            state: input.state,
            comarca: input.comarca,
            latitude: input.latitude,
            longitude: input.longitude,
            totalArea: input.totalArea,
            productiveArea: input.productiveArea,
            pastureland: input.pastureland,
            nativeVegetation: input.nativeVegetation,
            forestArea: input.forestArea,
            improvementArea: input.improvementArea,
            irrigatedArea: input.irrigatedArea,
            ownership: input.ownership as never,
            ownerName: input.ownerName,
            ownerDocument: input.ownerDocument,
            contractEndDate: input.contractEndDate,
            annualRent:
              input.annualRent !== undefined
                ? BigInt(input.annualRent)
                : undefined,
            estimatedValue:
              input.estimatedValue !== undefined
                ? BigInt(input.estimatedValue)
                : undefined,
            valuePerHectare:
              input.valuePerHectare !== undefined
                ? BigInt(input.valuePerHectare)
                : undefined,
            appraisalDate: input.appraisalDate,
            appraisalSource: input.appraisalSource,
            hasLien: input.hasLien,
            lienHolder: input.lienHolder,
            lienAmount:
              input.lienAmount !== undefined
                ? BigInt(input.lienAmount)
                : undefined,
            hasJudicialBlock: input.hasJudicialBlock,
            blockDetails: input.blockDetails,
            hasEnvironmentalIssue: input.hasEnvironmentalIssue,
            environmentalNotes: input.environmentalNotes,
            notes: input.notes,
          },
          include: { productions: true },
        });

        return {
          ...property,
          annualRent: bigIntToNumber(property.annualRent),
          estimatedValue: bigIntToNumber(property.estimatedValue),
          valuePerHectare: bigIntToNumber(property.valuePerHectare),
          lienAmount: bigIntToNumber(property.lienAmount),
          productions: property.productions.map((prod) => ({
            ...prod,
            averagePrice: bigIntToNumber(prod.averagePrice),
            totalRevenue: bigIntToNumber(prod.totalRevenue),
            productionCost: bigIntToNumber(prod.productionCost),
            costPerHectare: bigIntToNumber(prod.costPerHectare),
            financingAmount: bigIntToNumber(prod.financingAmount),
          })),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).optional(),
          registrationNumber: z.string().optional().nullable(),
          carCode: z.string().optional().nullable(),
          incraCode: z.string().optional().nullable(),
          nirf: z.string().optional().nullable(),
          address: z.string().optional().nullable(),
          city: z.string().min(1).optional(),
          state: z.string().min(1).optional(),
          comarca: z.string().optional().nullable(),
          latitude: z.number().optional().nullable(),
          longitude: z.number().optional().nullable(),
          totalArea: z.number().min(0).optional(),
          productiveArea: z.number().optional().nullable(),
          pastureland: z.number().optional().nullable(),
          nativeVegetation: z.number().optional().nullable(),
          forestArea: z.number().optional().nullable(),
          improvementArea: z.number().optional().nullable(),
          irrigatedArea: z.number().optional().nullable(),
          ownership: propertyOwnershipEnum.optional(),
          ownerName: z.string().optional().nullable(),
          ownerDocument: z.string().optional().nullable(),
          contractEndDate: z.coerce.date().optional().nullable(),
          annualRent: z.number().optional().nullable(),
          estimatedValue: z.number().optional().nullable(),
          valuePerHectare: z.number().optional().nullable(),
          appraisalDate: z.coerce.date().optional().nullable(),
          appraisalSource: z.string().optional().nullable(),
          hasLien: z.boolean().optional(),
          lienHolder: z.string().optional().nullable(),
          lienAmount: z.number().optional().nullable(),
          hasJudicialBlock: z.boolean().optional(),
          blockDetails: z.string().optional().nullable(),
          hasEnvironmentalIssue: z.boolean().optional(),
          environmentalNotes: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, annualRent, estimatedValue, valuePerHectare, lienAmount, ...rest } = input;

        const existing = await ctx.db.clientRuralProperty.findFirst({
          where: { id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imóvel rural não encontrado.",
          });
        }

        const property = await ctx.db.clientRuralProperty.update({
          where: { id },
          data: {
            ...rest,
            ownership: rest.ownership as never,
            annualRent:
              annualRent !== undefined
                ? annualRent !== null
                  ? BigInt(annualRent)
                  : null
                : undefined,
            estimatedValue:
              estimatedValue !== undefined
                ? estimatedValue !== null
                  ? BigInt(estimatedValue)
                  : null
                : undefined,
            valuePerHectare:
              valuePerHectare !== undefined
                ? valuePerHectare !== null
                  ? BigInt(valuePerHectare)
                  : null
                : undefined,
            lienAmount:
              lienAmount !== undefined
                ? lienAmount !== null
                  ? BigInt(lienAmount)
                  : null
                : undefined,
          },
          include: { productions: true },
        });

        return {
          ...property,
          annualRent: bigIntToNumber(property.annualRent),
          estimatedValue: bigIntToNumber(property.estimatedValue),
          valuePerHectare: bigIntToNumber(property.valuePerHectare),
          lienAmount: bigIntToNumber(property.lienAmount),
          productions: property.productions.map((prod) => ({
            ...prod,
            averagePrice: bigIntToNumber(prod.averagePrice),
            totalRevenue: bigIntToNumber(prod.totalRevenue),
            productionCost: bigIntToNumber(prod.productionCost),
            costPerHectare: bigIntToNumber(prod.costPerHectare),
            financingAmount: bigIntToNumber(prod.financingAmount),
          })),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.clientRuralProperty.findFirst({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imóvel rural não encontrado.",
          });
        }

        await ctx.db.clientRuralProperty.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // PRODUCTIONS sub-router
  // ═══════════════════════════════════════════════════════════
  productions: router({
    list: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          harvestYear: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const productions = await ctx.db.clientAgriculturalProduction.findMany({
          where: {
            clientId: input.clientId,
            ...(input.harvestYear && { harvestYear: input.harvestYear }),
          },
          include: {
            ruralProperty: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ harvestYear: "desc" }, { crop: "asc" }],
        });

        return productions.map((p) => ({
          ...p,
          averagePrice: bigIntToNumber(p.averagePrice),
          totalRevenue: bigIntToNumber(p.totalRevenue),
          productionCost: bigIntToNumber(p.productionCost),
          costPerHectare: bigIntToNumber(p.costPerHectare),
          financingAmount: bigIntToNumber(p.financingAmount),
        }));
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          ruralPropertyId: z.string().optional().nullable(),
          harvestYear: z.string().min(1, "Ano-safra é obrigatório"),
          season: harvestSeasonEnum,
          crop: cropTypeEnum,
          customCrop: z.string().optional(),
          plantedArea: z.number().min(0),
          expectedYield: z.number().optional(),
          actualYield: z.number().optional(),
          yieldUnit: z.string().optional(),
          totalProduction: z.number().optional(),
          averagePrice: z.number().optional(),
          priceUnit: z.string().optional(),
          totalRevenue: z.number().optional(),
          percentageSold: z.number().optional(),
          percentageHedged: z.number().optional(),
          productionCost: z.number().optional(),
          costPerHectare: z.number().optional(),
          hasCPR: z.boolean().optional(),
          cprDetails: z.string().optional(),
          financingSource: z.string().optional(),
          financingAmount: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const production = await ctx.db.clientAgriculturalProduction.create({
          data: {
            clientId: input.clientId,
            ruralPropertyId: input.ruralPropertyId,
            harvestYear: input.harvestYear,
            season: input.season as never,
            crop: input.crop as never,
            customCrop: input.customCrop,
            plantedArea: input.plantedArea,
            expectedYield: input.expectedYield,
            actualYield: input.actualYield,
            yieldUnit: input.yieldUnit,
            totalProduction: input.totalProduction,
            averagePrice:
              input.averagePrice !== undefined
                ? BigInt(input.averagePrice)
                : undefined,
            priceUnit: input.priceUnit,
            totalRevenue:
              input.totalRevenue !== undefined
                ? BigInt(input.totalRevenue)
                : undefined,
            percentageSold: input.percentageSold,
            percentageHedged: input.percentageHedged,
            productionCost:
              input.productionCost !== undefined
                ? BigInt(input.productionCost)
                : undefined,
            costPerHectare:
              input.costPerHectare !== undefined
                ? BigInt(input.costPerHectare)
                : undefined,
            hasCPR: input.hasCPR,
            cprDetails: input.cprDetails,
            financingSource: input.financingSource,
            financingAmount:
              input.financingAmount !== undefined
                ? BigInt(input.financingAmount)
                : undefined,
            notes: input.notes,
          },
          include: {
            ruralProperty: {
              select: { id: true, name: true },
            },
          },
        });

        return {
          ...production,
          averagePrice: bigIntToNumber(production.averagePrice),
          totalRevenue: bigIntToNumber(production.totalRevenue),
          productionCost: bigIntToNumber(production.productionCost),
          costPerHectare: bigIntToNumber(production.costPerHectare),
          financingAmount: bigIntToNumber(production.financingAmount),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          ruralPropertyId: z.string().optional().nullable(),
          harvestYear: z.string().min(1).optional(),
          season: harvestSeasonEnum.optional(),
          crop: cropTypeEnum.optional(),
          customCrop: z.string().optional().nullable(),
          plantedArea: z.number().min(0).optional(),
          expectedYield: z.number().optional().nullable(),
          actualYield: z.number().optional().nullable(),
          yieldUnit: z.string().optional().nullable(),
          totalProduction: z.number().optional().nullable(),
          averagePrice: z.number().optional().nullable(),
          priceUnit: z.string().optional().nullable(),
          totalRevenue: z.number().optional().nullable(),
          percentageSold: z.number().optional().nullable(),
          percentageHedged: z.number().optional().nullable(),
          productionCost: z.number().optional().nullable(),
          costPerHectare: z.number().optional().nullable(),
          hasCPR: z.boolean().optional(),
          cprDetails: z.string().optional().nullable(),
          financingSource: z.string().optional().nullable(),
          financingAmount: z.number().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const {
          id,
          averagePrice,
          totalRevenue,
          productionCost,
          costPerHectare,
          financingAmount,
          ...rest
        } = input;

        const existing =
          await ctx.db.clientAgriculturalProduction.findFirst({
            where: { id },
          });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Produção não encontrada.",
          });
        }

        const production = await ctx.db.clientAgriculturalProduction.update({
          where: { id },
          data: {
            ...rest,
            season: rest.season as never,
            crop: rest.crop as never,
            averagePrice:
              averagePrice !== undefined
                ? averagePrice !== null
                  ? BigInt(averagePrice)
                  : null
                : undefined,
            totalRevenue:
              totalRevenue !== undefined
                ? totalRevenue !== null
                  ? BigInt(totalRevenue)
                  : null
                : undefined,
            productionCost:
              productionCost !== undefined
                ? productionCost !== null
                  ? BigInt(productionCost)
                  : null
                : undefined,
            costPerHectare:
              costPerHectare !== undefined
                ? costPerHectare !== null
                  ? BigInt(costPerHectare)
                  : null
                : undefined,
            financingAmount:
              financingAmount !== undefined
                ? financingAmount !== null
                  ? BigInt(financingAmount)
                  : null
                : undefined,
          },
          include: {
            ruralProperty: {
              select: { id: true, name: true },
            },
          },
        });

        return {
          ...production,
          averagePrice: bigIntToNumber(production.averagePrice),
          totalRevenue: bigIntToNumber(production.totalRevenue),
          productionCost: bigIntToNumber(production.productionCost),
          costPerHectare: bigIntToNumber(production.costPerHectare),
          financingAmount: bigIntToNumber(production.financingAmount),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing =
          await ctx.db.clientAgriculturalProduction.findFirst({
            where: { id: input.id },
          });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Produção não encontrada.",
          });
        }

        await ctx.db.clientAgriculturalProduction.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // URBAN PROPERTIES sub-router
  // ═══════════════════════════════════════════════════════════
  urbanProperties: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ ctx, input }) => {
        const properties = await ctx.db.clientUrbanProperty.findMany({
          where: { clientId: input.clientId, isActive: true },
          orderBy: { description: "asc" },
        });

        return properties.map((p) => ({
          ...p,
          estimatedValue: bigIntToNumber(p.estimatedValue),
          monthlyRent: bigIntToNumber(p.monthlyRent),
          lienAmount: bigIntToNumber(p.lienAmount),
        }));
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          propertyType: urbanPropertyTypeEnum,
          description: z.string().min(1, "Descrição é obrigatória"),
          registrationNumber: z.string().optional(),
          address: z.string().min(1, "Endereço é obrigatório"),
          neighborhood: z.string().optional(),
          city: z.string().min(1, "Cidade é obrigatória"),
          state: z.string().min(1, "Estado é obrigatório"),
          cep: z.string().optional(),
          builtArea: z.number().optional(),
          landArea: z.number().optional(),
          ownership: propertyOwnershipEnum.optional(),
          ownerName: z.string().optional(),
          estimatedValue: z.number().optional(),
          appraisalDate: z.coerce.date().optional().nullable(),
          appraisalSource: z.string().optional(),
          monthlyRent: z.number().optional(),
          hasLien: z.boolean().optional(),
          lienHolder: z.string().optional(),
          lienAmount: z.number().optional(),
          hasJudicialBlock: z.boolean().optional(),
          blockDetails: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const property = await ctx.db.clientUrbanProperty.create({
          data: {
            clientId: input.clientId,
            propertyType: input.propertyType as never,
            description: input.description,
            registrationNumber: input.registrationNumber,
            address: input.address,
            neighborhood: input.neighborhood,
            city: input.city,
            state: input.state,
            cep: input.cep,
            builtArea: input.builtArea,
            landArea: input.landArea,
            ownership: input.ownership as never,
            ownerName: input.ownerName,
            estimatedValue:
              input.estimatedValue !== undefined
                ? BigInt(input.estimatedValue)
                : undefined,
            appraisalDate: input.appraisalDate,
            appraisalSource: input.appraisalSource,
            monthlyRent:
              input.monthlyRent !== undefined
                ? BigInt(input.monthlyRent)
                : undefined,
            hasLien: input.hasLien,
            lienHolder: input.lienHolder,
            lienAmount:
              input.lienAmount !== undefined
                ? BigInt(input.lienAmount)
                : undefined,
            hasJudicialBlock: input.hasJudicialBlock,
            blockDetails: input.blockDetails,
            notes: input.notes,
          },
        });

        return {
          ...property,
          estimatedValue: bigIntToNumber(property.estimatedValue),
          monthlyRent: bigIntToNumber(property.monthlyRent),
          lienAmount: bigIntToNumber(property.lienAmount),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          propertyType: urbanPropertyTypeEnum.optional(),
          description: z.string().min(1).optional(),
          registrationNumber: z.string().optional().nullable(),
          address: z.string().min(1).optional(),
          neighborhood: z.string().optional().nullable(),
          city: z.string().min(1).optional(),
          state: z.string().min(1).optional(),
          cep: z.string().optional().nullable(),
          builtArea: z.number().optional().nullable(),
          landArea: z.number().optional().nullable(),
          ownership: propertyOwnershipEnum.optional(),
          ownerName: z.string().optional().nullable(),
          estimatedValue: z.number().optional().nullable(),
          appraisalDate: z.coerce.date().optional().nullable(),
          appraisalSource: z.string().optional().nullable(),
          monthlyRent: z.number().optional().nullable(),
          hasLien: z.boolean().optional(),
          lienHolder: z.string().optional().nullable(),
          lienAmount: z.number().optional().nullable(),
          hasJudicialBlock: z.boolean().optional(),
          blockDetails: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, estimatedValue, monthlyRent, lienAmount, ...rest } = input;

        const existing = await ctx.db.clientUrbanProperty.findFirst({
          where: { id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imóvel urbano não encontrado.",
          });
        }

        const property = await ctx.db.clientUrbanProperty.update({
          where: { id },
          data: {
            ...rest,
            propertyType: rest.propertyType as never,
            ownership: rest.ownership as never,
            estimatedValue:
              estimatedValue !== undefined
                ? estimatedValue !== null
                  ? BigInt(estimatedValue)
                  : null
                : undefined,
            monthlyRent:
              monthlyRent !== undefined
                ? monthlyRent !== null
                  ? BigInt(monthlyRent)
                  : null
                : undefined,
            lienAmount:
              lienAmount !== undefined
                ? lienAmount !== null
                  ? BigInt(lienAmount)
                  : null
                : undefined,
          },
        });

        return {
          ...property,
          estimatedValue: bigIntToNumber(property.estimatedValue),
          monthlyRent: bigIntToNumber(property.monthlyRent),
          lienAmount: bigIntToNumber(property.lienAmount),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.clientUrbanProperty.findFirst({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Imóvel urbano não encontrado.",
          });
        }

        await ctx.db.clientUrbanProperty.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // VEHICLES sub-router
  // ═══════════════════════════════════════════════════════════
  vehicles: router({
    list: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          category: vehicleCategoryEnum.optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const vehicles = await ctx.db.clientVehicle.findMany({
          where: {
            clientId: input.clientId,
            isActive: true,
            ...(input.category && { category: input.category }),
          },
          orderBy: [{ category: "asc" }, { description: "asc" }],
        });

        return vehicles.map((v) => ({
          ...v,
          estimatedValue: bigIntToNumber(v.estimatedValue),
          fipeValue: bigIntToNumber(v.fipeValue),
          lienAmount: bigIntToNumber(v.lienAmount),
        }));
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          category: vehicleCategoryEnum,
          description: z.string().min(1, "Descrição é obrigatória"),
          brand: z.string().optional(),
          model: z.string().optional(),
          year: z.number().int().optional(),
          plate: z.string().optional(),
          renavam: z.string().optional(),
          chassi: z.string().optional(),
          serialNumber: z.string().optional(),
          estimatedValue: z.number().optional(),
          fipeValue: z.number().optional(),
          appraisalDate: z.coerce.date().optional().nullable(),
          hasLien: z.boolean().optional(),
          lienHolder: z.string().optional(),
          lienAmount: z.number().optional(),
          hasJudicialBlock: z.boolean().optional(),
          condition: z.string().optional(),
          location: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const vehicle = await ctx.db.clientVehicle.create({
          data: {
            clientId: input.clientId,
            category: input.category as never,
            description: input.description,
            brand: input.brand,
            model: input.model,
            year: input.year,
            plate: input.plate,
            renavam: input.renavam,
            chassi: input.chassi,
            serialNumber: input.serialNumber,
            estimatedValue:
              input.estimatedValue !== undefined
                ? BigInt(input.estimatedValue)
                : undefined,
            fipeValue:
              input.fipeValue !== undefined
                ? BigInt(input.fipeValue)
                : undefined,
            appraisalDate: input.appraisalDate,
            hasLien: input.hasLien,
            lienHolder: input.lienHolder,
            lienAmount:
              input.lienAmount !== undefined
                ? BigInt(input.lienAmount)
                : undefined,
            hasJudicialBlock: input.hasJudicialBlock,
            condition: input.condition,
            location: input.location,
            notes: input.notes,
          },
        });

        return {
          ...vehicle,
          estimatedValue: bigIntToNumber(vehicle.estimatedValue),
          fipeValue: bigIntToNumber(vehicle.fipeValue),
          lienAmount: bigIntToNumber(vehicle.lienAmount),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          category: vehicleCategoryEnum.optional(),
          description: z.string().min(1).optional(),
          brand: z.string().optional().nullable(),
          model: z.string().optional().nullable(),
          year: z.number().int().optional().nullable(),
          plate: z.string().optional().nullable(),
          renavam: z.string().optional().nullable(),
          chassi: z.string().optional().nullable(),
          serialNumber: z.string().optional().nullable(),
          estimatedValue: z.number().optional().nullable(),
          fipeValue: z.number().optional().nullable(),
          appraisalDate: z.coerce.date().optional().nullable(),
          hasLien: z.boolean().optional(),
          lienHolder: z.string().optional().nullable(),
          lienAmount: z.number().optional().nullable(),
          hasJudicialBlock: z.boolean().optional(),
          condition: z.string().optional().nullable(),
          location: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, estimatedValue, fipeValue, lienAmount, ...rest } = input;

        const existing = await ctx.db.clientVehicle.findFirst({
          where: { id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Veículo não encontrado.",
          });
        }

        const vehicle = await ctx.db.clientVehicle.update({
          where: { id },
          data: {
            ...rest,
            category: rest.category as never,
            estimatedValue:
              estimatedValue !== undefined
                ? estimatedValue !== null
                  ? BigInt(estimatedValue)
                  : null
                : undefined,
            fipeValue:
              fipeValue !== undefined
                ? fipeValue !== null
                  ? BigInt(fipeValue)
                  : null
                : undefined,
            lienAmount:
              lienAmount !== undefined
                ? lienAmount !== null
                  ? BigInt(lienAmount)
                  : null
                : undefined,
          },
        });

        return {
          ...vehicle,
          estimatedValue: bigIntToNumber(vehicle.estimatedValue),
          fipeValue: bigIntToNumber(vehicle.fipeValue),
          lienAmount: bigIntToNumber(vehicle.lienAmount),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.clientVehicle.findFirst({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Veículo não encontrado.",
          });
        }

        await ctx.db.clientVehicle.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // PARTICIPATIONS sub-router
  // ═══════════════════════════════════════════════════════════
  participations: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ ctx, input }) => {
        const participations =
          await ctx.db.clientCorporateParticipation.findMany({
            where: { clientId: input.clientId, isActive: true },
            orderBy: { companyName: "asc" },
          });

        return participations.map((p) => ({
          ...p,
          capitalAmount: bigIntToNumber(p.capitalAmount),
          estimatedValue: bigIntToNumber(p.estimatedValue),
          annualDividends: bigIntToNumber(p.annualDividends),
        }));
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          companyName: z.string().min(1, "Nome da empresa é obrigatório"),
          cnpj: z.string().optional(),
          participationType: participationTypeEnum,
          sharePercentage: z.number().optional(),
          capitalAmount: z.number().optional(),
          role: z.string().optional(),
          companyStatus: z.string().optional(),
          cnaeDescription: z.string().optional(),
          estimatedValue: z.number().optional(),
          annualDividends: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const participation =
          await ctx.db.clientCorporateParticipation.create({
            data: {
              clientId: input.clientId,
              companyName: input.companyName,
              cnpj: input.cnpj,
              participationType: input.participationType as never,
              sharePercentage: input.sharePercentage,
              capitalAmount:
                input.capitalAmount !== undefined
                  ? BigInt(input.capitalAmount)
                  : undefined,
              role: input.role,
              companyStatus: input.companyStatus,
              cnaeDescription: input.cnaeDescription,
              estimatedValue:
                input.estimatedValue !== undefined
                  ? BigInt(input.estimatedValue)
                  : undefined,
              annualDividends:
                input.annualDividends !== undefined
                  ? BigInt(input.annualDividends)
                  : undefined,
              notes: input.notes,
            },
          });

        return {
          ...participation,
          capitalAmount: bigIntToNumber(participation.capitalAmount),
          estimatedValue: bigIntToNumber(participation.estimatedValue),
          annualDividends: bigIntToNumber(participation.annualDividends),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          companyName: z.string().min(1).optional(),
          cnpj: z.string().optional().nullable(),
          participationType: participationTypeEnum.optional(),
          sharePercentage: z.number().optional().nullable(),
          capitalAmount: z.number().optional().nullable(),
          role: z.string().optional().nullable(),
          companyStatus: z.string().optional().nullable(),
          cnaeDescription: z.string().optional().nullable(),
          estimatedValue: z.number().optional().nullable(),
          annualDividends: z.number().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, capitalAmount, estimatedValue, annualDividends, ...rest } =
          input;

        const existing =
          await ctx.db.clientCorporateParticipation.findFirst({
            where: { id },
          });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Participação societária não encontrada.",
          });
        }

        const participation =
          await ctx.db.clientCorporateParticipation.update({
            where: { id },
            data: {
              ...rest,
              participationType: rest.participationType as never,
              capitalAmount:
                capitalAmount !== undefined
                  ? capitalAmount !== null
                    ? BigInt(capitalAmount)
                    : null
                  : undefined,
              estimatedValue:
                estimatedValue !== undefined
                  ? estimatedValue !== null
                    ? BigInt(estimatedValue)
                    : null
                  : undefined,
              annualDividends:
                annualDividends !== undefined
                  ? annualDividends !== null
                    ? BigInt(annualDividends)
                    : null
                  : undefined,
            },
          });

        return {
          ...participation,
          capitalAmount: bigIntToNumber(participation.capitalAmount),
          estimatedValue: bigIntToNumber(participation.estimatedValue),
          annualDividends: bigIntToNumber(participation.annualDividends),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing =
          await ctx.db.clientCorporateParticipation.findFirst({
            where: { id: input.id },
          });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Participação societária não encontrada.",
          });
        }

        await ctx.db.clientCorporateParticipation.update({
          where: { id: input.id },
          data: { isActive: false },
        });

        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // FINANCIALS sub-router
  // ═══════════════════════════════════════════════════════════
  financials: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ ctx, input }) => {
        const records = await ctx.db.clientFinancialData.findMany({
          where: { clientId: input.clientId },
          orderBy: { year: "desc" },
        });

        return records.map((r) => ({
          ...r,
          grossRevenue: bigIntToNumber(r.grossRevenue),
          netRevenue: bigIntToNumber(r.netRevenue),
          cogs: bigIntToNumber(r.cogs),
          grossProfit: bigIntToNumber(r.grossProfit),
          operatingExpenses: bigIntToNumber(r.operatingExpenses),
          ebitda: bigIntToNumber(r.ebitda),
          depreciation: bigIntToNumber(r.depreciation),
          ebit: bigIntToNumber(r.ebit),
          financialExpenses: bigIntToNumber(r.financialExpenses),
          financialIncome: bigIntToNumber(r.financialIncome),
          netIncome: bigIntToNumber(r.netIncome),
          totalAssets: bigIntToNumber(r.totalAssets),
          currentAssets: bigIntToNumber(r.currentAssets),
          nonCurrentAssets: bigIntToNumber(r.nonCurrentAssets),
          totalLiabilities: bigIntToNumber(r.totalLiabilities),
          currentLiabilities: bigIntToNumber(r.currentLiabilities),
          nonCurrentLiabilities: bigIntToNumber(r.nonCurrentLiabilities),
          equity: bigIntToNumber(r.equity),
          cash: bigIntToNumber(r.cash),
          totalDebt: bigIntToNumber(r.totalDebt),
          shortTermDebt: bigIntToNumber(r.shortTermDebt),
          longTermDebt: bigIntToNumber(r.longTermDebt),
          netDebt: bigIntToNumber(r.netDebt),
          operatingCashFlow: bigIntToNumber(r.operatingCashFlow),
          investingCashFlow: bigIntToNumber(r.investingCashFlow),
          financingCashFlow: bigIntToNumber(r.financingCashFlow),
        }));
      }),

    getByYear: protectedProcedure
      .input(z.object({ clientId: z.string(), year: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const record = await ctx.db.clientFinancialData.findFirst({
          where: { clientId: input.clientId, year: input.year },
        });

        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados financeiros não encontrados para este ano.",
          });
        }

        return {
          ...record,
          grossRevenue: bigIntToNumber(record.grossRevenue),
          netRevenue: bigIntToNumber(record.netRevenue),
          cogs: bigIntToNumber(record.cogs),
          grossProfit: bigIntToNumber(record.grossProfit),
          operatingExpenses: bigIntToNumber(record.operatingExpenses),
          ebitda: bigIntToNumber(record.ebitda),
          depreciation: bigIntToNumber(record.depreciation),
          ebit: bigIntToNumber(record.ebit),
          financialExpenses: bigIntToNumber(record.financialExpenses),
          financialIncome: bigIntToNumber(record.financialIncome),
          netIncome: bigIntToNumber(record.netIncome),
          totalAssets: bigIntToNumber(record.totalAssets),
          currentAssets: bigIntToNumber(record.currentAssets),
          nonCurrentAssets: bigIntToNumber(record.nonCurrentAssets),
          totalLiabilities: bigIntToNumber(record.totalLiabilities),
          currentLiabilities: bigIntToNumber(record.currentLiabilities),
          nonCurrentLiabilities: bigIntToNumber(record.nonCurrentLiabilities),
          equity: bigIntToNumber(record.equity),
          cash: bigIntToNumber(record.cash),
          totalDebt: bigIntToNumber(record.totalDebt),
          shortTermDebt: bigIntToNumber(record.shortTermDebt),
          longTermDebt: bigIntToNumber(record.longTermDebt),
          netDebt: bigIntToNumber(record.netDebt),
          operatingCashFlow: bigIntToNumber(record.operatingCashFlow),
          investingCashFlow: bigIntToNumber(record.investingCashFlow),
          financingCashFlow: bigIntToNumber(record.financingCashFlow),
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          year: z.number().int(),
          period: financialPeriodEnum.optional(),
          quarter: z.number().int().min(1).max(4).optional(),
          grossRevenue: z.number().optional(),
          netRevenue: z.number().optional(),
          cogs: z.number().optional(),
          grossProfit: z.number().optional(),
          operatingExpenses: z.number().optional(),
          ebitda: z.number().optional(),
          depreciation: z.number().optional(),
          ebit: z.number().optional(),
          financialExpenses: z.number().optional(),
          financialIncome: z.number().optional(),
          netIncome: z.number().optional(),
          totalAssets: z.number().optional(),
          currentAssets: z.number().optional(),
          nonCurrentAssets: z.number().optional(),
          totalLiabilities: z.number().optional(),
          currentLiabilities: z.number().optional(),
          nonCurrentLiabilities: z.number().optional(),
          equity: z.number().optional(),
          cash: z.number().optional(),
          totalDebt: z.number().optional(),
          shortTermDebt: z.number().optional(),
          longTermDebt: z.number().optional(),
          netDebt: z.number().optional(),
          operatingCashFlow: z.number().optional(),
          investingCashFlow: z.number().optional(),
          financingCashFlow: z.number().optional(),
          source: z.string().optional(),
          documentUrl: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check for unique constraint
        const existing = await ctx.db.clientFinancialData.findFirst({
          where: {
            clientId: input.clientId,
            year: input.year,
            period: (input.period as never) ?? "ANUAL",
            quarter: input.quarter ?? null,
          },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Já existe um registro financeiro para este cliente/ano/período.",
          });
        }

        const record = await ctx.db.clientFinancialData.create({
          data: {
            clientId: input.clientId,
            year: input.year,
            period: (input.period as never) ?? undefined,
            quarter: input.quarter,
            grossRevenue:
              input.grossRevenue !== undefined
                ? BigInt(input.grossRevenue)
                : undefined,
            netRevenue:
              input.netRevenue !== undefined
                ? BigInt(input.netRevenue)
                : undefined,
            cogs:
              input.cogs !== undefined ? BigInt(input.cogs) : undefined,
            grossProfit:
              input.grossProfit !== undefined
                ? BigInt(input.grossProfit)
                : undefined,
            operatingExpenses:
              input.operatingExpenses !== undefined
                ? BigInt(input.operatingExpenses)
                : undefined,
            ebitda:
              input.ebitda !== undefined
                ? BigInt(input.ebitda)
                : undefined,
            depreciation:
              input.depreciation !== undefined
                ? BigInt(input.depreciation)
                : undefined,
            ebit:
              input.ebit !== undefined ? BigInt(input.ebit) : undefined,
            financialExpenses:
              input.financialExpenses !== undefined
                ? BigInt(input.financialExpenses)
                : undefined,
            financialIncome:
              input.financialIncome !== undefined
                ? BigInt(input.financialIncome)
                : undefined,
            netIncome:
              input.netIncome !== undefined
                ? BigInt(input.netIncome)
                : undefined,
            totalAssets:
              input.totalAssets !== undefined
                ? BigInt(input.totalAssets)
                : undefined,
            currentAssets:
              input.currentAssets !== undefined
                ? BigInt(input.currentAssets)
                : undefined,
            nonCurrentAssets:
              input.nonCurrentAssets !== undefined
                ? BigInt(input.nonCurrentAssets)
                : undefined,
            totalLiabilities:
              input.totalLiabilities !== undefined
                ? BigInt(input.totalLiabilities)
                : undefined,
            currentLiabilities:
              input.currentLiabilities !== undefined
                ? BigInt(input.currentLiabilities)
                : undefined,
            nonCurrentLiabilities:
              input.nonCurrentLiabilities !== undefined
                ? BigInt(input.nonCurrentLiabilities)
                : undefined,
            equity:
              input.equity !== undefined
                ? BigInt(input.equity)
                : undefined,
            cash:
              input.cash !== undefined ? BigInt(input.cash) : undefined,
            totalDebt:
              input.totalDebt !== undefined
                ? BigInt(input.totalDebt)
                : undefined,
            shortTermDebt:
              input.shortTermDebt !== undefined
                ? BigInt(input.shortTermDebt)
                : undefined,
            longTermDebt:
              input.longTermDebt !== undefined
                ? BigInt(input.longTermDebt)
                : undefined,
            netDebt:
              input.netDebt !== undefined
                ? BigInt(input.netDebt)
                : undefined,
            operatingCashFlow:
              input.operatingCashFlow !== undefined
                ? BigInt(input.operatingCashFlow)
                : undefined,
            investingCashFlow:
              input.investingCashFlow !== undefined
                ? BigInt(input.investingCashFlow)
                : undefined,
            financingCashFlow:
              input.financingCashFlow !== undefined
                ? BigInt(input.financingCashFlow)
                : undefined,
            source: input.source,
            documentUrl: input.documentUrl,
            notes: input.notes,
          },
        });

        return {
          ...record,
          grossRevenue: bigIntToNumber(record.grossRevenue),
          netRevenue: bigIntToNumber(record.netRevenue),
          cogs: bigIntToNumber(record.cogs),
          grossProfit: bigIntToNumber(record.grossProfit),
          operatingExpenses: bigIntToNumber(record.operatingExpenses),
          ebitda: bigIntToNumber(record.ebitda),
          depreciation: bigIntToNumber(record.depreciation),
          ebit: bigIntToNumber(record.ebit),
          financialExpenses: bigIntToNumber(record.financialExpenses),
          financialIncome: bigIntToNumber(record.financialIncome),
          netIncome: bigIntToNumber(record.netIncome),
          totalAssets: bigIntToNumber(record.totalAssets),
          currentAssets: bigIntToNumber(record.currentAssets),
          nonCurrentAssets: bigIntToNumber(record.nonCurrentAssets),
          totalLiabilities: bigIntToNumber(record.totalLiabilities),
          currentLiabilities: bigIntToNumber(record.currentLiabilities),
          nonCurrentLiabilities: bigIntToNumber(record.nonCurrentLiabilities),
          equity: bigIntToNumber(record.equity),
          cash: bigIntToNumber(record.cash),
          totalDebt: bigIntToNumber(record.totalDebt),
          shortTermDebt: bigIntToNumber(record.shortTermDebt),
          longTermDebt: bigIntToNumber(record.longTermDebt),
          netDebt: bigIntToNumber(record.netDebt),
          operatingCashFlow: bigIntToNumber(record.operatingCashFlow),
          investingCashFlow: bigIntToNumber(record.investingCashFlow),
          financingCashFlow: bigIntToNumber(record.financingCashFlow),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          year: z.number().int().optional(),
          period: financialPeriodEnum.optional(),
          quarter: z.number().int().min(1).max(4).optional().nullable(),
          grossRevenue: z.number().optional().nullable(),
          netRevenue: z.number().optional().nullable(),
          cogs: z.number().optional().nullable(),
          grossProfit: z.number().optional().nullable(),
          operatingExpenses: z.number().optional().nullable(),
          ebitda: z.number().optional().nullable(),
          depreciation: z.number().optional().nullable(),
          ebit: z.number().optional().nullable(),
          financialExpenses: z.number().optional().nullable(),
          financialIncome: z.number().optional().nullable(),
          netIncome: z.number().optional().nullable(),
          totalAssets: z.number().optional().nullable(),
          currentAssets: z.number().optional().nullable(),
          nonCurrentAssets: z.number().optional().nullable(),
          totalLiabilities: z.number().optional().nullable(),
          currentLiabilities: z.number().optional().nullable(),
          nonCurrentLiabilities: z.number().optional().nullable(),
          equity: z.number().optional().nullable(),
          cash: z.number().optional().nullable(),
          totalDebt: z.number().optional().nullable(),
          shortTermDebt: z.number().optional().nullable(),
          longTermDebt: z.number().optional().nullable(),
          netDebt: z.number().optional().nullable(),
          operatingCashFlow: z.number().optional().nullable(),
          investingCashFlow: z.number().optional().nullable(),
          financingCashFlow: z.number().optional().nullable(),
          source: z.string().optional().nullable(),
          documentUrl: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const {
          id,
          grossRevenue,
          netRevenue,
          cogs,
          grossProfit,
          operatingExpenses,
          ebitda,
          depreciation,
          ebit,
          financialExpenses,
          financialIncome,
          netIncome,
          totalAssets,
          currentAssets,
          nonCurrentAssets,
          totalLiabilities,
          currentLiabilities,
          nonCurrentLiabilities,
          equity,
          cash,
          totalDebt,
          shortTermDebt,
          longTermDebt,
          netDebt,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          ...rest
        } = input;

        const existing = await ctx.db.clientFinancialData.findFirst({
          where: { id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados financeiros não encontrados.",
          });
        }

        const toBigInt = (
          val: number | null | undefined
        ): bigint | null | undefined => {
          if (val === undefined) return undefined;
          if (val === null) return null;
          return BigInt(val);
        };

        const record = await ctx.db.clientFinancialData.update({
          where: { id },
          data: {
            ...rest,
            period: rest.period as never,
            grossRevenue: toBigInt(grossRevenue),
            netRevenue: toBigInt(netRevenue),
            cogs: toBigInt(cogs),
            grossProfit: toBigInt(grossProfit),
            operatingExpenses: toBigInt(operatingExpenses),
            ebitda: toBigInt(ebitda),
            depreciation: toBigInt(depreciation),
            ebit: toBigInt(ebit),
            financialExpenses: toBigInt(financialExpenses),
            financialIncome: toBigInt(financialIncome),
            netIncome: toBigInt(netIncome),
            totalAssets: toBigInt(totalAssets),
            currentAssets: toBigInt(currentAssets),
            nonCurrentAssets: toBigInt(nonCurrentAssets),
            totalLiabilities: toBigInt(totalLiabilities),
            currentLiabilities: toBigInt(currentLiabilities),
            nonCurrentLiabilities: toBigInt(nonCurrentLiabilities),
            equity: toBigInt(equity),
            cash: toBigInt(cash),
            totalDebt: toBigInt(totalDebt),
            shortTermDebt: toBigInt(shortTermDebt),
            longTermDebt: toBigInt(longTermDebt),
            netDebt: toBigInt(netDebt),
            operatingCashFlow: toBigInt(operatingCashFlow),
            investingCashFlow: toBigInt(investingCashFlow),
            financingCashFlow: toBigInt(financingCashFlow),
          },
        });

        return {
          ...record,
          grossRevenue: bigIntToNumber(record.grossRevenue),
          netRevenue: bigIntToNumber(record.netRevenue),
          cogs: bigIntToNumber(record.cogs),
          grossProfit: bigIntToNumber(record.grossProfit),
          operatingExpenses: bigIntToNumber(record.operatingExpenses),
          ebitda: bigIntToNumber(record.ebitda),
          depreciation: bigIntToNumber(record.depreciation),
          ebit: bigIntToNumber(record.ebit),
          financialExpenses: bigIntToNumber(record.financialExpenses),
          financialIncome: bigIntToNumber(record.financialIncome),
          netIncome: bigIntToNumber(record.netIncome),
          totalAssets: bigIntToNumber(record.totalAssets),
          currentAssets: bigIntToNumber(record.currentAssets),
          nonCurrentAssets: bigIntToNumber(record.nonCurrentAssets),
          totalLiabilities: bigIntToNumber(record.totalLiabilities),
          currentLiabilities: bigIntToNumber(record.currentLiabilities),
          nonCurrentLiabilities: bigIntToNumber(record.nonCurrentLiabilities),
          equity: bigIntToNumber(record.equity),
          cash: bigIntToNumber(record.cash),
          totalDebt: bigIntToNumber(record.totalDebt),
          shortTermDebt: bigIntToNumber(record.shortTermDebt),
          longTermDebt: bigIntToNumber(record.longTermDebt),
          netDebt: bigIntToNumber(record.netDebt),
          operatingCashFlow: bigIntToNumber(record.operatingCashFlow),
          investingCashFlow: bigIntToNumber(record.investingCashFlow),
          financingCashFlow: bigIntToNumber(record.financingCashFlow),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.clientFinancialData.findFirst({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados financeiros não encontrados.",
          });
        }

        await ctx.db.clientFinancialData.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),

    getIndicators: protectedProcedure
      .input(z.object({ clientId: z.string(), year: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const record = await ctx.db.clientFinancialData.findFirst({
          where: { clientId: input.clientId, year: input.year },
        });

        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados financeiros não encontrados para este ano.",
          });
        }

        const equity = bigIntToNumber(record.equity);
        const totalDebt = bigIntToNumber(record.totalDebt);
        const netDebt = bigIntToNumber(record.netDebt);
        const ebitda = bigIntToNumber(record.ebitda);
        const currentAssets = bigIntToNumber(record.currentAssets);
        const currentLiabilities = bigIntToNumber(record.currentLiabilities);
        const grossProfit = bigIntToNumber(record.grossProfit);
        const netRevenue = bigIntToNumber(record.netRevenue);
        const netIncome = bigIntToNumber(record.netIncome);

        return {
          year: record.year,
          debtToEquity: equity !== 0 ? totalDebt / equity : null,
          debtToEbitda: ebitda !== 0 ? netDebt / ebitda : null,
          currentRatio:
            currentLiabilities !== 0
              ? currentAssets / currentLiabilities
              : null,
          grossMargin:
            netRevenue !== 0 ? (grossProfit / netRevenue) * 100 : null,
          ebitdaMargin:
            netRevenue !== 0 ? (ebitda / netRevenue) * 100 : null,
          netMargin:
            netRevenue !== 0 ? (netIncome / netRevenue) * 100 : null,
          roe: equity !== 0 ? (netIncome / equity) * 100 : null,
        };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // OPERATIONAL sub-router
  // ═══════════════════════════════════════════════════════════
  operational: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ ctx, input }) => {
        const records = await ctx.db.clientOperationalData.findMany({
          where: { clientId: input.clientId },
          orderBy: { year: "desc" },
        });

        return records.map((r) => ({
          ...r,
          monthlyPayroll: bigIntToNumber(r.monthlyPayroll),
          annualPayroll: bigIntToNumber(r.annualPayroll),
        }));
      }),

    getByYear: protectedProcedure
      .input(z.object({ clientId: z.string(), year: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const record = await ctx.db.clientOperationalData.findFirst({
          where: { clientId: input.clientId, year: input.year },
        });

        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados operacionais não encontrados para este ano.",
          });
        }

        return {
          ...record,
          monthlyPayroll: bigIntToNumber(record.monthlyPayroll),
          annualPayroll: bigIntToNumber(record.annualPayroll),
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          clientId: z.string(),
          year: z.number().int(),
          totalEmployees: z.number().int().optional(),
          cltEmployees: z.number().int().optional(),
          temporaryWorkers: z.number().int().optional(),
          monthlyPayroll: z.number().optional(),
          annualPayroll: z.number().optional(),
          totalManagedArea: z.number().optional(),
          ownedArea: z.number().optional(),
          leasedArea: z.number().optional(),
          storageCapacity: z.number().optional(),
          cattleHeadCount: z.number().int().optional(),
          vehicleCount: z.number().int().optional(),
          machineCount: z.number().int().optional(),
          truckCount: z.number().int().optional(),
          operationalUnits: z.number().int().optional(),
          states: z.string().optional(),
          certifications: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check unique constraint
        const existing = await ctx.db.clientOperationalData.findFirst({
          where: { clientId: input.clientId, year: input.year },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Já existe um registro operacional para este cliente/ano.",
          });
        }

        const record = await ctx.db.clientOperationalData.create({
          data: {
            clientId: input.clientId,
            year: input.year,
            totalEmployees: input.totalEmployees,
            cltEmployees: input.cltEmployees,
            temporaryWorkers: input.temporaryWorkers,
            monthlyPayroll:
              input.monthlyPayroll !== undefined
                ? BigInt(input.monthlyPayroll)
                : undefined,
            annualPayroll:
              input.annualPayroll !== undefined
                ? BigInt(input.annualPayroll)
                : undefined,
            totalManagedArea: input.totalManagedArea,
            ownedArea: input.ownedArea,
            leasedArea: input.leasedArea,
            storageCapacity: input.storageCapacity,
            cattleHeadCount: input.cattleHeadCount,
            vehicleCount: input.vehicleCount,
            machineCount: input.machineCount,
            truckCount: input.truckCount,
            operationalUnits: input.operationalUnits,
            states: input.states,
            certifications: input.certifications,
            notes: input.notes,
          },
        });

        return {
          ...record,
          monthlyPayroll: bigIntToNumber(record.monthlyPayroll),
          annualPayroll: bigIntToNumber(record.annualPayroll),
        };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          year: z.number().int().optional(),
          totalEmployees: z.number().int().optional().nullable(),
          cltEmployees: z.number().int().optional().nullable(),
          temporaryWorkers: z.number().int().optional().nullable(),
          monthlyPayroll: z.number().optional().nullable(),
          annualPayroll: z.number().optional().nullable(),
          totalManagedArea: z.number().optional().nullable(),
          ownedArea: z.number().optional().nullable(),
          leasedArea: z.number().optional().nullable(),
          storageCapacity: z.number().optional().nullable(),
          cattleHeadCount: z.number().int().optional().nullable(),
          vehicleCount: z.number().int().optional().nullable(),
          machineCount: z.number().int().optional().nullable(),
          truckCount: z.number().int().optional().nullable(),
          operationalUnits: z.number().int().optional().nullable(),
          states: z.string().optional().nullable(),
          certifications: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, monthlyPayroll, annualPayroll, ...rest } = input;

        const existing = await ctx.db.clientOperationalData.findFirst({
          where: { id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados operacionais não encontrados.",
          });
        }

        const record = await ctx.db.clientOperationalData.update({
          where: { id },
          data: {
            ...rest,
            monthlyPayroll:
              monthlyPayroll !== undefined
                ? monthlyPayroll !== null
                  ? BigInt(monthlyPayroll)
                  : null
                : undefined,
            annualPayroll:
              annualPayroll !== undefined
                ? annualPayroll !== null
                  ? BigInt(annualPayroll)
                  : null
                : undefined,
          },
        });

        return {
          ...record,
          monthlyPayroll: bigIntToNumber(record.monthlyPayroll),
          annualPayroll: bigIntToNumber(record.annualPayroll),
        };
      }),

    delete_: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.clientOperationalData.findFirst({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dados operacionais não encontrados.",
          });
        }

        await ctx.db.clientOperationalData.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),
  }),
});
