import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the "Grupo Cerrado" client or create a placeholder
  let client = await prisma.person.findFirst({
    where: { nome: { contains: "Cerrado", mode: "insensitive" } },
  });

  if (!client) {
    client = await prisma.person.create({
      data: {
        tipo: "CLIENTE",
        subtipo: "PESSOA_JURIDICA",
        nome: "Grupo Cerrado Agroindustrial S.A.",
        cpf_cnpj: "12.345.678/0001-90",
        segmento: "AGRO",
        cidade: "Balsas",
        estado: "MA",
      },
    });
    console.log("Created client:", client.nome);
  } else {
    console.log("Found client:", client.nome);
  }

  const clientId = client.id;

  // ── 3 Fazendas ──
  const fazenda1 = await prisma.clientRuralProperty.create({
    data: {
      clientId,
      name: "Fazenda Cerrado I",
      city: "Balsas",
      state: "MA",
      totalArea: 1200,
      productiveArea: 900,
      pastureland: 100,
      nativeVegetation: 200,
      ownership: "PROPRIO",
      estimatedValue: BigInt(3600000000),
      valuePerHectare: BigInt(3000000),
      hasLien: true,
      lienHolder: "Banco do Brasil",
      lienAmount: BigInt(1800000000),
    },
  });
  console.log("Created:", fazenda1.name);

  const fazenda2 = await prisma.clientRuralProperty.create({
    data: {
      clientId,
      name: "Fazenda Cerrado II",
      city: "Balsas",
      state: "MA",
      totalArea: 850,
      productiveArea: 700,
      nativeVegetation: 150,
      ownership: "PROPRIO",
      estimatedValue: BigInt(2550000000),
    },
  });
  console.log("Created:", fazenda2.name);

  const fazenda3 = await prisma.clientRuralProperty.create({
    data: {
      clientId,
      name: "Fazenda Santa Rita",
      city: "Tasso Fragoso",
      state: "MA",
      totalArea: 600,
      productiveArea: 450,
      ownership: "ARRENDADO",
      annualRent: BigInt(54000000),
    },
  });
  console.log("Created:", fazenda3.name);

  // ── Produção Safra 2025/2026 ──
  await prisma.clientAgriculturalProduction.create({
    data: {
      clientId,
      ruralPropertyId: fazenda1.id,
      harvestYear: "2025/2026",
      season: "SAFRA",
      crop: "SOJA",
      plantedArea: 1600,
      expectedYield: 55,
      yieldUnit: "sc/ha",
      totalProduction: 88000,
      averagePrice: BigInt(12500),
      priceUnit: "R$/saca",
      totalRevenue: BigInt(110000000000),
      productionCost: BigInt(66000000000),
      costPerHectare: BigInt(412500),
      hasCPR: true,
      cprDetails: "CPR Física — 20.000 sacas para Cargill",
      financingSource: "BB Plano Safra",
      financingAmount: BigInt(4000000000),
    },
  });
  console.log("Created: Produção Soja 2025/2026");

  await prisma.clientAgriculturalProduction.create({
    data: {
      clientId,
      ruralPropertyId: fazenda1.id,
      harvestYear: "2025/2026",
      season: "SAFRINHA",
      crop: "MILHO_SAFRINHA",
      plantedArea: 1200,
      expectedYield: 100,
      yieldUnit: "sc/ha",
      totalProduction: 120000,
      averagePrice: BigInt(5500),
      priceUnit: "R$/saca",
      totalRevenue: BigInt(6600000000),
    },
  });
  console.log("Created: Produção Milho Safrinha 2025/2026");

  // ── 1 Imóvel Urbano ──
  await prisma.clientUrbanProperty.create({
    data: {
      clientId,
      propertyType: "SALA_COMERCIAL",
      description: "Conjunto de salas — Ed. Corporate Plaza",
      address: "Av. Brasil, 1500, sala 1201",
      city: "Balsas",
      state: "MA",
      builtArea: 120,
      estimatedValue: BigInt(80000000),
    },
  });
  console.log("Created: Imóvel Urbano");

  // ── 8 Veículos e Máquinas ──
  const vehicles = [
    { category: "COLHEITADEIRA" as const, description: "John Deere S790 2023", year: 2023, brand: "John Deere", model: "S790", estimatedValue: BigInt(280000000) },
    { category: "COLHEITADEIRA" as const, description: "John Deere S770 2021", year: 2021, brand: "John Deere", model: "S770", estimatedValue: BigInt(220000000) },
    { category: "TRATOR" as const, description: "Case IH Magnum 340 2022", year: 2022, brand: "Case IH", model: "Magnum 340", estimatedValue: BigInt(95000000) },
    { category: "TRATOR" as const, description: "New Holland T7.245 2020", year: 2020, brand: "New Holland", model: "T7.245", estimatedValue: BigInt(65000000) },
    { category: "PLANTADEIRA" as const, description: "Stara Absoluta 35 linhas 2023", year: 2023, brand: "Stara", model: "Absoluta 35", estimatedValue: BigInt(85000000) },
    { category: "CAMINHONETE" as const, description: "Toyota Hilux SRV 2024", year: 2024, brand: "Toyota", model: "Hilux SRV", estimatedValue: BigInt(28000000), plate: "ABC1D23" },
    { category: "CAMINHAO" as const, description: "Volvo FH 540 2021 + Rodotrem", year: 2021, brand: "Volvo", model: "FH 540", estimatedValue: BigInt(92000000) },
    { category: "SILO" as const, description: "Silo Kepler Weber 6.000 ton", brand: "Kepler Weber", estimatedValue: BigInt(45000000) },
  ];

  for (const v of vehicles) {
    await prisma.clientVehicle.create({
      data: { clientId, ...v },
    });
    console.log("Created:", v.description);
  }

  // ── 2 Participações ──
  await prisma.clientCorporateParticipation.create({
    data: {
      clientId,
      companyName: "Transportadora Cerrado Ltda",
      cnpj: "23.456.789/0001-01",
      participationType: "SOCIO_ADMINISTRADOR_PART",
      sharePercentage: 100,
      role: "Sócio Administrador",
      companyStatus: "Ativa",
    },
  });
  console.log("Created: Participação Transportadora");

  await prisma.clientCorporateParticipation.create({
    data: {
      clientId,
      companyName: "Cooperativa Agrícola do Norte do Paraná",
      cnpj: "34.567.890/0001-12",
      participationType: "COOPERADO",
      companyStatus: "Ativa",
    },
  });
  console.log("Created: Participação Cooperativa");

  // ── Financeiro 2024 e 2023 ──
  await prisma.clientFinancialData.create({
    data: {
      clientId,
      year: 2024,
      period: "ANUAL",
      grossRevenue: BigInt(14500000000),
      netRevenue: BigInt(13000000000),
      cogs: BigInt(8500000000),
      grossProfit: BigInt(4500000000),
      ebitda: BigInt(3200000000),
      netIncome: BigInt(1800000000),
      totalAssets: BigInt(25000000000),
      currentAssets: BigInt(8000000000),
      nonCurrentAssets: BigInt(17000000000),
      totalLiabilities: BigInt(13000000000),
      currentLiabilities: BigInt(5000000000),
      nonCurrentLiabilities: BigInt(8000000000),
      equity: BigInt(12000000000),
      cash: BigInt(1200000000),
      totalDebt: BigInt(9500000000),
      shortTermDebt: BigInt(3500000000),
      longTermDebt: BigInt(6000000000),
      netDebt: BigInt(8300000000),
      source: "Balanço auditado",
    },
  });
  console.log("Created: Financeiro 2024");

  await prisma.clientFinancialData.create({
    data: {
      clientId,
      year: 2023,
      period: "ANUAL",
      grossRevenue: BigInt(12800000000),
      netRevenue: BigInt(11500000000),
      ebitda: BigInt(2800000000),
      netIncome: BigInt(1200000000),
      totalAssets: BigInt(22000000000),
      equity: BigInt(10200000000),
      totalDebt: BigInt(8700000000),
      source: "Balanço auditado",
    },
  });
  console.log("Created: Financeiro 2023");

  // ── Operacional 2024 ──
  await prisma.clientOperationalData.create({
    data: {
      clientId,
      year: 2024,
      totalEmployees: 85,
      cltEmployees: 42,
      temporaryWorkers: 43,
      monthlyPayroll: BigInt(42000000),
      totalManagedArea: 2650,
      ownedArea: 2050,
      leasedArea: 600,
      storageCapacity: 12000,
      vehicleCount: 4,
      machineCount: 12,
      truckCount: 3,
      operationalUnits: 4,
      states: "MA",
    },
  });
  console.log("Created: Operacional 2024");

  console.log("\n✅ Seed patrimônio completo!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
