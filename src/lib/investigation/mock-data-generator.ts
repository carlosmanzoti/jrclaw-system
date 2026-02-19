/**
 * Mock Data Generator — Produces realistic Brazilian investigation data.
 *
 * Generates data that mirrors real API responses for CPF/CNPJ queries:
 * - CPF: individuals in Maringa/PR and Balsas/MA with regional phone codes
 * - CNPJ: agricultural companies with CNAE 01.XX, sede Maringa, filial Balsas
 * - Processes: TRF4, Curitiba/Maringa courts, includes RJ and execucoes fiscais
 * - Vehicles: pickup trucks (S10, Hilux, Amarok), 1 truck, Mercosul plates
 * - Properties: rural in Balsas/MA (100-2000 ha), urban in Maringa
 * - Protests: duplicatas, cheques, R$5K-500K
 * - CVM: FIDCs, FII quotas
 * - Satellite: soja 60%, pasto 25%, APP 15%, deforestation alerts
 */

import type { ApiProvider, AssetCategory, DebtType, LawsuitRelevance } from "@prisma/client";
import type {
  ProviderQuery,
  ProviderResult,
  NormalizedAsset,
  NormalizedDebt,
  NormalizedLawsuit,
  NormalizedCorporateLink,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function generateCPF(): string {
  const digits = Array.from({ length: 9 }, () => randomBetween(0, 9));
  const d1 = (digits.reduce((sum, d, i) => sum + d * (10 - i), 0) * 10) % 11 % 10;
  digits.push(d1);
  const d2 = (digits.reduce((sum, d, i) => sum + d * (11 - i), 0) * 10) % 11 % 10;
  digits.push(d2);
  return digits.join("");
}

function generateCNPJ(): string {
  const base = Array.from({ length: 8 }, () => randomBetween(0, 9));
  base.push(0, 0, 0, 1);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = base.reduce((s, d, i) => s + d * w1[i], 0) % 11;
  base.push(d1 < 2 ? 0 : 11 - d1);
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d2 = base.reduce((s, d, i) => s + d * w2[i], 0) % 11;
  base.push(d2 < 2 ? 0 : 11 - d2);
  return base.join("");
}

function generateMercosulPlate(): string {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return [
    L[randomBetween(0, 25)], L[randomBetween(0, 25)], L[randomBetween(0, 25)],
    randomBetween(0, 9), L[randomBetween(0, 25)], randomBetween(0, 9), randomBetween(0, 9),
  ].join("");
}

function generateRenavam(): string {
  return Array.from({ length: 11 }, () => randomBetween(0, 9)).join("");
}

function generateProcessNumber(year: number, justice: string, branch: string): string {
  const seq = String(randomBetween(1000000, 9999999));
  const dd = String(randomBetween(10, 99));
  return `${seq}-${dd}.${year}.${justice}.${branch}`;
}

function pastDate(minYearsAgo: number, maxYearsAgo: number): Date {
  const now = Date.now();
  const yearsAgo = randomDecimal(minYearsAgo, maxYearsAgo, 1);
  return new Date(now - yearsAgo * 365.25 * 24 * 3600 * 1000);
}

function recentDate(maxDaysAgo: number): Date {
  const daysAgo = randomBetween(1, maxDaysAgo);
  return new Date(Date.now() - daysAgo * 24 * 3600 * 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Name/Address pools
// ═══════════════════════════════════════════════════════════════════════════════

const MALE_NAMES = [
  "Carlos Eduardo Silva", "Marcos Antonio Pereira", "Jose Roberto Santos",
  "Antonio Carlos Oliveira", "Paulo Henrique Souza", "Luiz Fernando Costa",
  "Ricardo Alexandre Ferreira", "Joao Paulo Rodrigues", "Andre Luis Almeida",
  "Fernando Augusto Lima",
];

const FEMALE_NAMES = [
  "Maria Fernanda Silva", "Ana Carolina Pereira", "Juliana Santos Costa",
  "Camila Oliveira Souza", "Patricia Helena Lima", "Renata Cristina Ferreira",
  "Claudia Maria Rodrigues", "Luciana Aparecida Almeida",
];

const COMPANY_NAMES = [
  "Agropecuaria Cerrado Verde Ltda", "Fazenda Boa Esperanca S/A",
  "Granja Maringa Producoes Rurais Ltda", "Agroflora Sul Participacoes S/A",
  "Balsas Commodities Exportadora Ltda", "Sojamais Comercio e Exportacao S/A",
  "Tocantins Agro Industrial Ltda", "Cerealista Parana Trading S/A",
  "Grupo Rural Integrado Participacoes Ltda", "MG Agri Holdings S/A",
];

const MARINGA_ADDRESSES = [
  { logradouro: "Av. Brasil", numero: "4590", bairro: "Zona 01", cep: "87013-160" },
  { logradouro: "Rua Neo Alves Martins", numero: "1234", bairro: "Zona 01", cep: "87013-060" },
  { logradouro: "Av. Colombo", numero: "5790", bairro: "Zona 07", cep: "87020-900" },
  { logradouro: "Rua Santos Dumont", numero: "890", bairro: "Zona 02", cep: "87013-050" },
  { logradouro: "Av. Herval", numero: "1456", bairro: "Centro", cep: "87013-110" },
];

const BALSAS_ADDRESSES = [
  { logradouro: "Av. Balsas", numero: "1500", bairro: "Centro", cep: "65800-000" },
  { logradouro: "Rua Coelho Neto", numero: "350", bairro: "Tresidela", cep: "65800-050" },
  { logradouro: "Av. Presidente Medici", numero: "780", bairro: "Bacaba", cep: "65800-100" },
  { logradouro: "Rua Santa Luzia", numero: "220", bairro: "Centro", cep: "65800-030" },
];

const CNAES_AGRO = [
  { codigo: "01.11-3/01", descricao: "Cultivo de arroz" },
  { codigo: "01.15-6/00", descricao: "Cultivo de soja" },
  { codigo: "01.51-2/01", descricao: "Criacao de bovinos para corte" },
  { codigo: "01.41-5/01", descricao: "Producao de sementes certificadas" },
  { codigo: "01.61-0/01", descricao: "Producao de algodao herbaceo" },
];

const CARTORIOS_PR = [
  "1o Oficio de Registro de Imoveis de Maringa",
  "2o Oficio de Registro de Imoveis de Maringa",
  "1o Tabelionato de Notas de Maringa",
  "Registro de Imoveis de Londrina",
];

const CARTORIOS_MA = [
  "Oficio de Registro de Imoveis de Balsas",
  "Registro de Imoveis de Balsas - 2a Circunscricao",
  "Tabelionato de Notas de Balsas",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MockDataGenerator — main class
// ═══════════════════════════════════════════════════════════════════════════════

export class MockDataGenerator {
  /**
   * Central dispatch: generates realistic mock data for any query type.
   */
  static generate(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    switch (query.type) {
      case "CONSULTA_CPF":
        return MockDataGenerator.generateCpfData(provider, query);
      case "CONSULTA_CNPJ":
        return MockDataGenerator.generateCnpjData(provider, query);
      case "CONSULTA_PROCESSO":
        return MockDataGenerator.generateProcessData(provider, query);
      case "CONSULTA_VEICULO":
        return MockDataGenerator.generateVehicleData(provider, query);
      case "CONSULTA_IMOVEL":
        return MockDataGenerator.generatePropertyData(provider, query);
      case "CONSULTA_PROTESTO":
        return MockDataGenerator.generateProtestData(provider, query);
      case "CONSULTA_DIVIDA_ATIVA":
        return MockDataGenerator.generateDebtData(provider, query);
      case "CONSULTA_CVM":
        return MockDataGenerator.generateCvmData(provider, query);
      case "CONSULTA_SATELITE":
        return MockDataGenerator.generateSatelliteData(provider, query);
      case "CONSULTA_SOCIETARIA":
        return MockDataGenerator.generateCorporateData(provider, query);
      case "CONSULTA_PEP_SANCOES":
        return MockDataGenerator.generateComplianceData(provider, query);
      case "CONSULTA_SCORING":
        return MockDataGenerator.generateScoringData(provider, query);
      case "CONSULTA_RURAL":
        return MockDataGenerator.generateRuralData(provider, query);
      case "CONSULTA_MARCAS":
        return MockDataGenerator.generateBrandData(provider, query);
      case "MONITORAMENTO":
        return MockDataGenerator.generateMonitorData(provider, query);
      default:
        return {
          success: true,
          provider,
          queryType: query.type,
          data: { message: "No mock data available for this query type" },
          rawResponse: null,
          responseTimeMs: randomBetween(50, 200),
          cost: 0,
          isMock: true,
        };
    }
  }

  // ─── CPF Data ──────────────────────────────────────────────────────────────

  static generateCpfData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const name = pickRandom([...MALE_NAMES, ...FEMALE_NAMES]);
    const address = pickRandom([...MARINGA_ADDRESSES, ...BALSAS_ADDRESSES]);
    const isMaringa = MARINGA_ADDRESSES.includes(address);

    const data = {
      nome: name,
      cpf: query.targetDocument,
      dataNascimento: `${randomBetween(1960, 1990)}-${String(randomBetween(1, 12)).padStart(2, "0")}-${String(randomBetween(1, 28)).padStart(2, "0")}`,
      situacaoCadastral: "REGULAR",
      rg: `${randomBetween(10, 99)}.${randomBetween(100, 999)}.${randomBetween(100, 999)}-${randomBetween(0, 9)}`,
      orgaoEmissor: "SSP/PR",
      endereco: {
        ...address,
        cidade: isMaringa ? "Maringa" : "Balsas",
        uf: isMaringa ? "PR" : "MA",
      },
      telefones: [
        `(${isMaringa ? "44" : "99"}) 9${randomBetween(8000, 9999)}-${randomBetween(1000, 9999)}`,
        `(${isMaringa ? "44" : "99"}) 3${randomBetween(200, 399)}-${randomBetween(1000, 9999)}`,
      ],
      email: name.toLowerCase().replace(/\s/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "") + "@email.com",
      profissao: pickRandom(["Empresario", "Produtor Rural", "Administrador", "Engenheiro Agronomo"]),
      rendaEstimada: randomDecimal(15000, 120000),
      participacoesSocietarias: randomBetween(1, 4),
    };

    return {
      success: true,
      provider,
      queryType: query.type,
      data,
      rawResponse: data,
      responseTimeMs: randomBetween(200, 800),
      cost: 0,
      isMock: true,
    };
  }

  // ─── CNPJ Data ─────────────────────────────────────────────────────────────

  static generateCnpjData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const companyName = pickRandom(COMPANY_NAMES);
    const cnae = pickRandom(CNAES_AGRO);
    const capitalSocial = randomDecimal(5_000_000, 50_000_000);
    const sedeAddress = pickRandom(MARINGA_ADDRESSES);
    const filialAddress = pickRandom(BALSAS_ADDRESSES);

    const socios = [
      {
        nome: pickRandom(MALE_NAMES),
        cpf: generateCPF(),
        qualificacao: "Socio-Administrador",
        percentual: randomDecimal(40, 60),
        dataEntrada: pastDate(5, 15).toISOString().slice(0, 10),
      },
      {
        nome: pickRandom(MALE_NAMES),
        cpf: generateCPF(),
        qualificacao: "Socio",
        percentual: randomDecimal(20, 35),
        dataEntrada: pastDate(3, 10).toISOString().slice(0, 10),
      },
      {
        nome: pickRandom(FEMALE_NAMES),
        cpf: generateCPF(),
        qualificacao: "Socio",
        percentual: 0,
        dataEntrada: pastDate(1, 8).toISOString().slice(0, 10),
      },
    ];
    socios[2].percentual = Number((100 - socios[0].percentual - socios[1].percentual).toFixed(2));

    const normalizedLinks: NormalizedCorporateLink[] = socios.map((s) => ({
      companyName,
      companyCnpj: query.targetDocument,
      companyStatus: "ATIVA",
      cnae: cnae.codigo,
      openDate: pastDate(5, 20),
      role: s.qualificacao,
      sharePercentage: s.percentual,
      capitalValue: (capitalSocial * s.percentual) / 100,
      entryDate: new Date(s.dataEntrada),
      isOffshore: false,
      isRecentCreation: false,
      hasIrregularity: false,
      sourceProvider: provider,
    }));

    const data = {
      razaoSocial: companyName,
      nomeFantasia: companyName.replace(/(Ltda|S\/A)/, "").trim(),
      cnpj: query.targetDocument,
      situacaoCadastral: "ATIVA",
      dataAbertura: pastDate(5, 20).toISOString().slice(0, 10),
      naturezaJuridica: "206-2 - Sociedade Empresaria Limitada",
      capitalSocial,
      porte: "DEMAIS",
      cnaePrincipal: cnae,
      cnaeSecundarios: pickMultiple(CNAES_AGRO.filter((c) => c.codigo !== cnae.codigo), 2),
      sede: { ...sedeAddress, cidade: "Maringa", uf: "PR" },
      filiais: [{ ...filialAddress, cidade: "Balsas", uf: "MA", situacao: "ATIVA" }],
      socios,
      telefones: [
        `(44) 3${randomBetween(200, 399)}-${randomBetween(1000, 9999)}`,
        `(99) 3${randomBetween(500, 599)}-${randomBetween(1000, 9999)}`,
      ],
      email: companyName.toLowerCase().replace(/\s/g, "").slice(0, 12) + "@empresa.com.br",
    };

    return {
      success: true,
      provider,
      queryType: query.type,
      data,
      normalizedCorporateLinks: normalizedLinks,
      rawResponse: data,
      responseTimeMs: randomBetween(300, 1200),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Processes ─────────────────────────────────────────────────────────────

  static generateProcessData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const processCount = randomBetween(3, 8);
    const processes: NormalizedLawsuit[] = [];

    const courts = [
      { court: "TJPR", vara: "1a Vara Civel de Maringa", trCode: "8.16" },
      { court: "TJPR", vara: "2a Vara Civel de Maringa", trCode: "8.16" },
      { court: "TJPR", vara: "Vara de Execucoes Fiscais de Maringa", trCode: "8.16" },
      { court: "TJPR", vara: "1a Vara Civel de Curitiba", trCode: "8.16" },
      { court: "TJPR", vara: "Vara Empresarial de Curitiba", trCode: "8.16" },
      { court: "TRF4", vara: "1a Vara Federal de Maringa", trCode: "5.04" },
      { court: "TRF4", vara: "2a Vara Federal de Curitiba", trCode: "5.04" },
    ];

    // Mandatory: 1 RJ, 2 execucoes fiscais
    const mandatoryTypes: Array<{
      class_: string;
      subject: string;
      role: string;
      relevance: LawsuitRelevance;
      hasFreeze: boolean;
      courtIdx?: number;
    }> = [
      {
        class_: "Recuperacao Judicial",
        subject: "Recuperacao Judicial - Lei 11.101/2005",
        role: "Requerente",
        relevance: "CRITICA",
        hasFreeze: false,
        courtIdx: 4, // Vara Empresarial
      },
      {
        class_: "Execucao Fiscal",
        subject: "ICMS - Execucao Fiscal Estadual",
        role: "Executado",
        relevance: "ALTA",
        hasFreeze: true,
        courtIdx: 2, // Vara de Execucoes Fiscais
      },
      {
        class_: "Execucao Fiscal",
        subject: "Contribuicoes Sociais - Execucao Fiscal Federal",
        role: "Executado",
        relevance: "ALTA",
        hasFreeze: true,
        courtIdx: 5, // Vara Federal
      },
    ];

    const additionalTypes = [
      { class_: "Acao de Cobranca", subject: "Cobranca - Duplicata Mercantil", role: "Reu", relevance: "MEDIA" as LawsuitRelevance, hasFreeze: false },
      { class_: "Execucao de Titulo Extrajudicial", subject: "Execucao - Cedula de Credito Bancario", role: "Executado", relevance: "ALTA" as LawsuitRelevance, hasFreeze: true },
      { class_: "Acao Monitoria", subject: "Acao Monitoria - Contrato de Servico", role: "Reu", relevance: "BAIXA" as LawsuitRelevance, hasFreeze: false },
      { class_: "Cumprimento de Sentenca", subject: "Obrigacao de Pagar Quantia Certa", role: "Executado", relevance: "MEDIA" as LawsuitRelevance, hasFreeze: false },
      { class_: "Mandado de Seguranca", subject: "Tributario - Mandado de Seguranca", role: "Impetrante", relevance: "MEDIA" as LawsuitRelevance, hasFreeze: false },
    ];

    const extras = pickMultiple(additionalTypes, Math.max(0, processCount - mandatoryTypes.length));
    const allTypes: typeof mandatoryTypes = [...mandatoryTypes, ...extras];

    for (let i = 0; i < Math.min(processCount, allTypes.length); i++) {
      const pType = allTypes[i];
      const court = pType.courtIdx !== undefined ? courts[pType.courtIdx] : pickRandom(courts);
      const year = randomBetween(2018, 2025);
      const [justice, branch] = court.trCode.split(".");

      processes.push({
        caseNumber: generateProcessNumber(year, justice, branch + "." + String(randomBetween(1, 20)).padStart(4, "0")),
        court: court.court,
        vara: court.vara,
        subject: pType.subject,
        class_: pType.class_,
        role: pType.role,
        otherParties: [
          { nome: pickRandom([...MALE_NAMES, ...COMPANY_NAMES]), tipo: pType.role === "Reu" || pType.role === "Executado" ? "Autor" : "Reu" },
        ],
        estimatedValue: randomDecimal(50_000, 5_000_000),
        status: pickRandom(["Em andamento", "Suspenso", "Em fase de execucao"]),
        lastMovement: pickRandom([
          "Juntada de peticao",
          "Despacho de mero expediente",
          "Decisao interlocutoria",
          "Intimacao da parte autora",
          "Certidao de publicacao",
        ]),
        lastMovementDate: recentDate(90),
        distributionDate: pastDate(0.5, 6),
        relevance: pType.relevance,
        hasAssetFreeze: pType.hasFreeze,
        sourceProvider: provider,
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalProcessos: processes.length, processos: processes },
      normalizedLawsuits: processes,
      rawResponse: { processos: processes },
      responseTimeMs: randomBetween(500, 2000),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Vehicles ──────────────────────────────────────────────────────────────

  static generateVehicleData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const vehicles: NormalizedAsset[] = [];

    const pickups = [
      { marca: "Chevrolet", modelo: "S10 High Country 2.8 Diesel 4x4", valor: randomDecimal(250_000, 380_000) },
      { marca: "Toyota", modelo: "Hilux SRX 2.8 Diesel 4x4", valor: randomDecimal(280_000, 420_000) },
      { marca: "Volkswagen", modelo: "Amarok V6 Extreme", valor: randomDecimal(300_000, 450_000) },
      { marca: "Ford", modelo: "Ranger Limited 3.2 Diesel 4x4", valor: randomDecimal(230_000, 350_000) },
    ];

    const truck = {
      marca: "Volvo",
      modelo: "FH 540 6x4",
      valor: randomDecimal(600_000, 1_200_000),
      ano: randomBetween(2019, 2024),
    };

    // 2-3 pickup trucks
    const selectedPickups = pickMultiple(pickups, randomBetween(2, 3));
    for (const p of selectedPickups) {
      const ano = randomBetween(2020, 2025);
      const hasRestriction = Math.random() < 0.3;
      vehicles.push({
        category: "VEICULO_AUTOMOVEL" as AssetCategory,
        subcategory: "Caminhonete",
        description: `${p.marca} ${p.modelo} ${ano}/${ano}`,
        registrationId: generateRenavam(),
        location: pickRandom(["Maringa/PR", "Balsas/MA"]),
        state: pickRandom(["PR", "MA"]),
        city: pickRandom(["Maringa", "Balsas"]),
        estimatedValue: p.valor,
        valuationMethod: "FIPE",
        valuationDate: new Date(),
        hasRestriction,
        restrictionType: hasRestriction ? pickRandom(["Alienacao Fiduciaria", "Arrendamento Mercantil"]) : undefined,
        restrictionDetail: hasRestriction ? "Restricao financeira ativa" : undefined,
        isSeizable: !hasRestriction,
        ownershipPercentage: 100,
        sourceProvider: provider,
        rawSourceData: {
          placa: generateMercosulPlate(),
          renavam: generateRenavam(),
          anoFabricacao: ano,
          anoModelo: ano,
          cor: pickRandom(["Branca", "Prata", "Preta", "Cinza"]),
          combustivel: "Diesel",
        },
      });
    }

    // 1 truck
    vehicles.push({
      category: "VEICULO_CAMINHAO" as AssetCategory,
      subcategory: "Caminhao Pesado",
      description: `${truck.marca} ${truck.modelo} ${truck.ano}/${truck.ano}`,
      registrationId: generateRenavam(),
      location: "Maringa/PR",
      state: "PR",
      city: "Maringa",
      estimatedValue: truck.valor,
      valuationMethod: "FIPE",
      valuationDate: new Date(),
      hasRestriction: false,
      isSeizable: true,
      ownershipPercentage: 100,
      sourceProvider: provider,
      rawSourceData: {
        placa: generateMercosulPlate(),
        renavam: generateRenavam(),
        anoFabricacao: truck.ano,
        anoModelo: truck.ano,
        cor: "Branca",
        combustivel: "Diesel",
        tipoVeiculo: "CAMINHAO",
      },
    });

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalVeiculos: vehicles.length, veiculos: vehicles },
      normalizedAssets: vehicles,
      rawResponse: { veiculos: vehicles },
      responseTimeMs: randomBetween(300, 1000),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Properties ────────────────────────────────────────────────────────────

  static generatePropertyData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const assets: NormalizedAsset[] = [];

    // 2-4 rural properties in Balsas/MA
    const ruralCount = randomBetween(2, 4);
    const fazendaNames = ["Fazenda Boa Vista", "Fazenda Santa Maria", "Sitio Sao Jose", "Fazenda Cerrado Dourado", "Fazenda Lago Azul"];

    for (let i = 0; i < ruralCount; i++) {
      const area = randomDecimal(100, 2000, 1);
      const valorPorHa = randomDecimal(15_000, 45_000);
      const hasRestriction = Math.random() < 0.25;

      assets.push({
        category: "IMOVEL_RURAL" as AssetCategory,
        subcategory: "Propriedade Rural",
        description: `${fazendaNames[i] || "Fazenda " + (i + 1)} - ${area} ha - Municipio de Balsas/MA`,
        registrationId: `MAT-${randomBetween(10000, 99999)}`,
        location: "Zona Rural, Balsas/MA",
        state: "MA",
        city: "Balsas",
        estimatedValue: area * valorPorHa,
        valuationMethod: "Valor de mercado regional",
        valuationDate: recentDate(180),
        hasRestriction,
        restrictionType: hasRestriction ? pickRandom(["Hipoteca", "Alienacao Fiduciaria", "Reserva Legal"]) : undefined,
        restrictionDetail: hasRestriction ? `Gravame registrado em ${pickRandom(CARTORIOS_MA)}` : undefined,
        isSeizable: !hasRestriction,
        ownershipPercentage: randomDecimal(50, 100),
        sourceProvider: provider,
        latitude: randomDecimal(-7.7, -7.3, 4),
        longitude: randomDecimal(-46.3, -45.8, 4),
        areaHectares: area,
        carCode: `MA-${randomBetween(1000000, 9999999)}`,
        rawSourceData: {
          cartorio: pickRandom(CARTORIOS_MA),
          matricula: String(randomBetween(10000, 99999)),
          comarca: "Balsas",
          averbacoes: randomBetween(2, 8),
        },
      });
    }

    // 1 apartment in Maringa
    const apArea = randomBetween(80, 200);
    const apValue = randomDecimal(400_000, 1_500_000);
    const edName = pickRandom(["Ed. Solar das Flores", "Ed. Residencial Maringa", "Ed. Torre Nobre", "Cond. Alto Padrao"]);
    const apBairro = pickRandom(MARINGA_ADDRESSES).bairro;

    assets.push({
      category: "IMOVEL_URBANO" as AssetCategory,
      subcategory: "Apartamento",
      description: `Apartamento ${apArea}m2 - ${edName} - ${apBairro}, Maringa/PR`,
      registrationId: `MAT-${randomBetween(50000, 99999)}`,
      location: "Maringa/PR",
      state: "PR",
      city: "Maringa",
      estimatedValue: apValue,
      valuationMethod: "Avaliacao comparativa de mercado",
      valuationDate: recentDate(120),
      hasRestriction: false,
      isSeizable: true,
      impenhorabilityReason: Math.random() < 0.5 ? "Possivel bem de familia (Art. 1o, Lei 8.009/90)" : undefined,
      ownershipPercentage: 100,
      sourceProvider: provider,
      rawSourceData: {
        cartorio: pickRandom(CARTORIOS_PR),
        matricula: String(randomBetween(50000, 99999)),
        comarca: "Maringa",
      },
    });

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalImoveis: assets.length, imoveis: assets },
      normalizedAssets: assets,
      rawResponse: { imoveis: assets },
      responseTimeMs: randomBetween(400, 1500),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Protests ──────────────────────────────────────────────────────────────

  static generateProtestData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const protestCount = randomBetween(3, 6);
    const debts: NormalizedDebt[] = [];

    const tiposProtesto = [
      { tipo: "Duplicata Mercantil", origin: "DUPLICATA" },
      { tipo: "Duplicata de Servico", origin: "DUPLICATA" },
      { tipo: "Cheque", origin: "CHEQUE" },
      { tipo: "Nota Promissoria", origin: "NOTA_PROMISSORIA" },
      { tipo: "Letra de Cambio", origin: "LETRA_CAMBIO" },
    ];

    const credores = [
      { nome: "Banco do Brasil S/A", doc: "00.000.000/0001-91" },
      { nome: "Banco Bradesco S/A", doc: "60.746.948/0001-12" },
      { nome: "Sicredi Parana", doc: "81.099.491/0001-82" },
      { nome: "Cooperativa Cocamar", doc: "79.119.023/0001-68" },
      { nome: "John Deere Financial", doc: "03.014.553/0001-97" },
      { nome: "Bunge Alimentos S/A", doc: "84.046.101/0001-93" },
      { nome: "Cargill Agricola S/A", doc: "60.498.706/0001-40" },
      { nome: "Syngenta Protecao de Cultivos Ltda", doc: "60.744.463/0001-90" },
    ];

    for (let i = 0; i < protestCount; i++) {
      const tipo = pickRandom(tiposProtesto);
      const credor = pickRandom(credores);
      const valor = randomDecimal(5_000, 500_000);

      debts.push({
        debtType: "PROTESTO" as DebtType,
        creditor: credor.nome,
        creditorDocument: credor.doc,
        originalValue: valor,
        currentValue: valor * randomDecimal(1, 1.3),
        inscriptionDate: pastDate(0.2, 3),
        description: `Protesto - ${tipo.tipo}`,
        status: pickRandom(["Protestado", "Protestado - Intimado", "Aguardando Pagamento"]),
        origin: tipo.origin,
        sourceProvider: provider,
        rawSourceData: {
          cartorio: pickRandom([
            `${randomBetween(1, 4)}o Tabelionato de Protestos de Maringa/PR`,
            "Tabelionato de Protestos de Balsas/MA",
          ]),
          cidade: pickRandom(["Maringa", "Balsas"]),
          uf: pickRandom(["PR", "MA"]),
        },
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalProtestos: debts.length, protestos: debts },
      normalizedDebts: debts,
      rawResponse: { protestos: debts },
      responseTimeMs: randomBetween(300, 900),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Divida Ativa ──────────────────────────────────────────────────────────

  static generateDebtData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const debts: NormalizedDebt[] = [];

    const federalDebts: Array<{ desc: string; type: DebtType }> = [
      { desc: "IRPJ - Imposto de Renda Pessoa Juridica", type: "DIVIDA_ATIVA_UNIAO" },
      { desc: "CSLL - Contribuicao Social sobre o Lucro Liquido", type: "DIVIDA_ATIVA_UNIAO" },
      { desc: "PIS/COFINS - Contribuicoes Sociais", type: "DIVIDA_ATIVA_UNIAO" },
      { desc: "Funrural - Contribuicao Previdenciaria Rural", type: "DIVIDA_ATIVA_UNIAO" },
    ];

    const selectedFederal = pickMultiple(federalDebts, randomBetween(1, 3));
    for (const fd of selectedFederal) {
      const valor = randomDecimal(100_000, 3_000_000);
      debts.push({
        debtType: fd.type,
        creditor: "Procuradoria-Geral da Fazenda Nacional",
        creditorDocument: "00.394.460/0001-41",
        originalValue: valor,
        currentValue: valor * randomDecimal(1.2, 2.5),
        inscriptionDate: pastDate(1, 5),
        description: fd.desc,
        caseNumber: `${randomBetween(10000, 99999)}.${randomBetween(10, 99)}.${randomBetween(1000, 9999)}.${randomBetween(10, 99)}`,
        status: pickRandom(["Inscrito", "Em cobranca", "Parcelado", "Ajuizado"]),
        origin: "PGFN",
        sourceProvider: provider,
      });
    }

    // State debt (60% chance)
    if (Math.random() < 0.6) {
      const valor = randomDecimal(50_000, 800_000);
      debts.push({
        debtType: "DIVIDA_ATIVA_ESTADO",
        creditor: "Secretaria da Fazenda do Parana",
        originalValue: valor,
        currentValue: valor * randomDecimal(1.1, 1.8),
        inscriptionDate: pastDate(0.5, 3),
        description: "ICMS - Imposto sobre Circulacao de Mercadorias",
        status: "Inscrito em Divida Ativa",
        origin: "SEFA/PR",
        sourceProvider: provider,
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalDividas: debts.length, dividas: debts },
      normalizedDebts: debts,
      rawResponse: { dividas: debts },
      responseTimeMs: randomBetween(400, 1200),
      cost: 0,
      isMock: true,
    };
  }

  // ─── CVM Data ──────────────────────────────────────────────────────────────

  static generateCvmData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const assets: NormalizedAsset[] = [];

    // 1-2 FIDCs
    const fidcCount = randomBetween(1, 2);
    const fidcNames = [
      "FIDC Agro Recebiveis Sul",
      "FIDC Credito Produtivo Nacional",
      "FIDC Multi Setorial Parana",
    ];

    for (let i = 0; i < fidcCount; i++) {
      const valor = randomDecimal(200_000, 3_000_000);
      assets.push({
        category: "FUNDOS_INVESTIMENTO" as AssetCategory,
        subcategory: "FIDC",
        description: `${fidcNames[i]} - Cotas Subordinadas`,
        registrationId: `CVM-${randomBetween(100000, 999999)}`,
        estimatedValue: valor,
        valuationMethod: "Valor patrimonial da cota",
        valuationDate: recentDate(30),
        hasRestriction: false,
        isSeizable: true,
        ownershipPercentage: randomDecimal(1, 15),
        sourceProvider: provider,
        rawSourceData: {
          cnpjFundo: generateCNPJ(),
          classeCotas: "Subordinada",
          dataReferencia: recentDate(30).toISOString().slice(0, 10),
          administrador: pickRandom(["BTG Pactual", "Oliveira Trust", "Vortx"]),
        },
      });
    }

    // FII quotas (70% chance)
    if (Math.random() < 0.7) {
      const valor = randomDecimal(100_000, 800_000);
      const fiiName = pickRandom(["Logistica Sul", "Agro Terras", "Galpoes Industriais PR"]);
      assets.push({
        category: "FUNDOS_INVESTIMENTO" as AssetCategory,
        subcategory: "FII",
        description: `FII ${fiiName} - Cotas`,
        registrationId: `CVM-${randomBetween(100000, 999999)}`,
        estimatedValue: valor,
        valuationMethod: "Cotacao B3",
        valuationDate: recentDate(7),
        hasRestriction: false,
        isSeizable: true,
        ownershipPercentage: randomDecimal(0.5, 5),
        sourceProvider: provider,
        rawSourceData: {
          cnpjFundo: generateCNPJ(),
          ticker: pickRandom(["LGCP11", "AGRO11", "GALP11"]),
          quantidade: randomBetween(100, 5000),
        },
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalRegistros: assets.length, registros: assets },
      normalizedAssets: assets,
      rawResponse: { registros: assets },
      responseTimeMs: randomBetween(300, 1000),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Satellite Data ────────────────────────────────────────────────────────

  static generateSatelliteData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const totalArea = randomDecimal(500, 3000, 1);
    const sojaPercent = 60;
    const pastoPercent = 25;
    const appPercent = 15;

    const cobertura = {
      areaTotal: totalArea,
      sojaHa: Number((totalArea * sojaPercent / 100).toFixed(1)),
      sojaPercent,
      pastoHa: Number((totalArea * pastoPercent / 100).toFixed(1)),
      pastoPercent,
      appHa: Number((totalArea * appPercent / 100).toFixed(1)),
      appPercent,
      ndviMedio: randomDecimal(0.5, 0.85, 2),
      dataImagem: recentDate(15).toISOString().slice(0, 10),
    };

    const alertasDesmatamento: Record<string, unknown>[] = [];
    const alertCount = randomBetween(0, 3);
    for (let i = 0; i < alertCount; i++) {
      alertasDesmatamento.push({
        dataDeteccao: recentDate(180).toISOString().slice(0, 10),
        areaHa: randomDecimal(0.5, 15, 1),
        tipo: pickRandom(["Desmatamento", "Degradacao", "Corte raso"]),
        bioma: "Cerrado",
        municipio: "Balsas",
        uf: "MA",
        fonte: pickRandom(["DETER/INPE", "PRODES/INPE", "MapBiomas Alerta"]),
        coordenadas: {
          lat: randomDecimal(-7.7, -7.3, 4),
          lng: randomDecimal(-46.3, -45.8, 4),
        },
        severidade: pickRandom(["BAIXA", "MEDIA", "ALTA"]),
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: {
        coberturaSolo: cobertura,
        alertasDesmatamento,
        totalAlertas: alertasDesmatamento.length,
        statusAmbiental: alertasDesmatamento.length === 0 ? "REGULAR" : "ATENCAO",
      },
      rawResponse: { cobertura, alertas: alertasDesmatamento },
      responseTimeMs: randomBetween(800, 3000),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Corporate Data ────────────────────────────────────────────────────────

  static generateCorporateData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const links: NormalizedCorporateLink[] = [];
    const companyCount = randomBetween(2, 5);

    for (let i = 0; i < companyCount; i++) {
      const cnpj = generateCNPJ();
      const isRecent = Math.random() < 0.2;
      const hasIrreg = Math.random() < 0.15;

      links.push({
        companyName: pickRandom(COMPANY_NAMES),
        companyCnpj: cnpj,
        companyStatus: pickRandom(["ATIVA", "ATIVA", "ATIVA", "BAIXADA", "INAPTA"]),
        cnae: pickRandom(CNAES_AGRO).codigo,
        openDate: isRecent ? recentDate(365) : pastDate(2, 15),
        role: pickRandom(["Socio-Administrador", "Socio", "Procurador", "Diretor"]),
        sharePercentage: randomDecimal(5, 100),
        capitalValue: randomDecimal(100_000, 20_000_000),
        entryDate: isRecent ? recentDate(365) : pastDate(1, 10),
        isOffshore: false,
        isRecentCreation: isRecent,
        hasIrregularity: hasIrreg,
        irregularityDesc: hasIrreg ? pickRandom(["Empresa inapta na Receita Federal", "Situacao cadastral irregular", "Pendencia fiscal"]) : undefined,
        sourceProvider: provider,
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalEmpresas: links.length, empresas: links },
      normalizedCorporateLinks: links,
      rawResponse: { empresas: links },
      responseTimeMs: randomBetween(400, 1500),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Compliance (PEP/Sanctions) ────────────────────────────────────────────

  static generateComplianceData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const hasPep = Math.random() < 0.15;
    const hasSanction = Math.random() < 0.05;

    const hits: Record<string, unknown>[] = [];

    if (hasPep) {
      hits.push({
        nome: query.targetDocument,
        score: randomDecimal(0.6, 0.9),
        fonte: "Tribunal Superior Eleitoral",
        lista: "PEP Brasil",
        tipo: "PEP",
        detalhes: "Pessoa Exposta Politicamente - Mandato municipal encerrado",
      });
    }

    if (hasSanction) {
      hits.push({
        nome: query.targetDocument,
        score: randomDecimal(0.7, 0.95),
        fonte: "OFAC - SDN List",
        lista: "Sanctions",
        tipo: "SANCTION",
        detalhes: "Potential match - requires manual review",
      });
    }

    const data = { pepStatus: hasPep, sanctionStatus: hasSanction, hits };

    return {
      success: true,
      provider,
      queryType: query.type,
      data,
      rawResponse: data,
      responseTimeMs: randomBetween(500, 2000),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Scoring ───────────────────────────────────────────────────────────────

  static generateScoringData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const score = randomBetween(200, 900);
    const data = {
      score,
      faixa: score >= 700 ? "BAIXO_RISCO" : score >= 400 ? "MEDIO_RISCO" : "ALTO_RISCO",
      probabilidadeInadimplencia: randomDecimal(0.02, 0.45),
      dataConsulta: new Date().toISOString(),
      negativacoes: randomBetween(0, 5),
      pendenciasFinanceiras: randomBetween(0, 3),
      protestos: randomBetween(0, 4),
      chequesSemFundo: randomBetween(0, 2),
    };

    return {
      success: true,
      provider,
      queryType: query.type,
      data,
      rawResponse: data,
      responseTimeMs: randomBetween(200, 800),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Rural (INCRA/SIGEF/CAR) ──────────────────────────────────────────────

  static generateRuralData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const assets: NormalizedAsset[] = [];
    const propertyCount = randomBetween(1, 3);

    for (let i = 0; i < propertyCount; i++) {
      const area = randomDecimal(200, 2500, 1);
      assets.push({
        category: "IMOVEL_RURAL" as AssetCategory,
        subcategory: "Imovel Rural - CAR",
        description: `Imovel rural em Balsas/MA - CAR registrado - ${area} ha`,
        registrationId: `CAR-MA-${randomBetween(1000000, 9999999)}`,
        location: "Balsas/MA",
        state: "MA",
        city: "Balsas",
        estimatedValue: area * randomDecimal(18_000, 35_000),
        valuationMethod: "Valor regional INCRA",
        hasRestriction: Math.random() < 0.2,
        isSeizable: true,
        sourceProvider: provider,
        latitude: randomDecimal(-7.7, -7.3, 4),
        longitude: randomDecimal(-46.3, -45.8, 4),
        areaHectares: area,
        carCode: `MA-${randomBetween(1000000, 9999999)}`,
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalImoveis: assets.length, imoveisRurais: assets },
      normalizedAssets: assets,
      rawResponse: { imoveis: assets },
      responseTimeMs: randomBetween(300, 1200),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Brands (INPI) ────────────────────────────────────────────────────────

  static generateBrandData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    const hasBrand = Math.random() < 0.4;
    const assets: NormalizedAsset[] = [];

    if (hasBrand) {
      assets.push({
        category: "MARCAS_PATENTES" as AssetCategory,
        subcategory: "Marca Registrada",
        description: `Marca "${pickRandom(COMPANY_NAMES).split(" ")[0]}" - Classe NCL ${randomBetween(1, 45)}`,
        registrationId: `BR${randomBetween(100000000, 999999999)}`,
        estimatedValue: randomDecimal(50_000, 500_000),
        valuationMethod: "Estimativa baseada em faturamento",
        hasRestriction: false,
        isSeizable: true,
        sourceProvider: provider,
      });
    }

    return {
      success: true,
      provider,
      queryType: query.type,
      data: { totalMarcas: assets.length, marcas: assets },
      normalizedAssets: assets,
      rawResponse: { marcas: assets },
      responseTimeMs: randomBetween(200, 600),
      cost: 0,
      isMock: true,
    };
  }

  // ─── Monitor (no-op mock) ─────────────────────────────────────────────────

  static generateMonitorData(provider: ApiProvider, query: ProviderQuery): ProviderResult {
    return {
      success: true,
      provider,
      queryType: query.type,
      data: {
        monitoramentoAtivo: true,
        proximaVerificacao: new Date(Date.now() + 86400000).toISOString(),
      },
      rawResponse: null,
      responseTimeMs: randomBetween(100, 300),
      cost: 0,
      isMock: true,
    };
  }
}
