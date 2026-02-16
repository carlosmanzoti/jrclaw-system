import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data (in reverse dependency order)
  await prisma.projectTaskCheckItem.deleteMany();
  await prisma.projectTaskComment.deleteMany();
  await prisma.projectTask.deleteMany();
  await prisma.projectPhase.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.projectNote.deleteMany();
  await prisma.projectStakeholder.deleteMany();
  await prisma.projectTeam.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.document.deleteMany();
  await prisma.negotiation.deleteMany();
  await prisma.creditor.deleteMany();
  await prisma.deadline.deleteMany();
  await prisma.caseMovement.deleteMany();
  await prisma.caseParty.deleteMany();
  await prisma.caseTeam.deleteMany();
  await prisma.case.deleteMany();
  await prisma.project.deleteMany();
  await prisma.personDocument.deleteMany();
  await prisma.person.deleteMany();
  await prisma.template.deleteMany();
  await prisma.projectTemplate.deleteMany();
  await prisma.libraryEntry.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️  Cleaned existing data");

  // ============================================================
  // 1. USERS (3 lawyers)
  // ============================================================
  const passwordHash = await hash("JrcLaw2026!", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Dr. José Ricardo Cunha",
      email: "admin@jrclaw.com.br",
      password: passwordHash,
      role: "ADMIN",
      oab_number: "OAB/PR 12.345",
      active: true,
    },
  });

  const advogado1 = await prisma.user.create({
    data: {
      name: "Dra. Mariana Oliveira",
      email: "advogado1@jrclaw.com.br",
      password: passwordHash,
      role: "ADVOGADO",
      oab_number: "OAB/PR 23.456",
      active: true,
    },
  });

  const advogado2 = await prisma.user.create({
    data: {
      name: "Dr. Felipe Santos",
      email: "advogado2@jrclaw.com.br",
      password: passwordHash,
      role: "ADVOGADO",
      oab_number: "OAB/MA 34.567",
      active: true,
    },
  });

  console.log("👤 Created 3 users");

  // ============================================================
  // 2. PERSONS (8 people/clients - agribusiness focus)
  // ============================================================
  const pessoa1 = await prisma.person.create({
    data: {
      tipo: "CLIENTE",
      subtipo: "PESSOA_JURIDICA",
      nome: "Fazenda Bela Vista Agropecuária Ltda",
      razao_social: "Fazenda Bela Vista Agropecuária Ltda",
      cpf_cnpj: "12.345.678/0001-90",
      cep: "87020-000",
      logradouro: "Av. Brasil",
      numero: "1500",
      bairro: "Centro",
      cidade: "Maringá",
      estado: "PR",
      celular: "(44) 99999-1001",
      whatsapp: "(44) 99999-1001",
      email: "contato@belavista.agro.br",
      segmento: "AGRO",
      observacoes: "Cliente desde 2020. Produção de soja e milho. 5.000 hectares.",
      portal_access: true,
      portal_password: passwordHash,
      created_by_id: admin.id,
    },
  });

  const pessoa2 = await prisma.person.create({
    data: {
      tipo: "CLIENTE",
      subtipo: "PESSOA_JURIDICA",
      nome: "Grupo Cerrado Agroindustrial S.A.",
      razao_social: "Grupo Cerrado Agroindustrial S.A.",
      cpf_cnpj: "23.456.789/0001-01",
      cep: "65800-000",
      logradouro: "Rua da Paz",
      numero: "200",
      bairro: "Centro",
      cidade: "Balsas",
      estado: "MA",
      celular: "(99) 98888-2002",
      whatsapp: "(99) 98888-2002",
      email: "juridico@cerradoagro.com.br",
      segmento: "AGRO",
      observacoes: "Maior cliente em Balsas. Soja, algodão e pecuária. Em recuperação judicial.",
      portal_access: true,
      portal_password: passwordHash,
      created_by_id: admin.id,
    },
  });

  const pessoa3 = await prisma.person.create({
    data: {
      tipo: "CLIENTE",
      subtipo: "PESSOA_FISICA",
      nome: "Carlos Eduardo Mendes",
      cpf_cnpj: "111.222.333-44",
      nacionalidade: "Brasileira",
      estado_civil: "Casado",
      profissao: "Produtor Rural",
      cep: "87030-100",
      logradouro: "Rua Joubert de Carvalho",
      numero: "750",
      bairro: "Centro",
      cidade: "Maringá",
      estado: "PR",
      celular: "(44) 99777-3003",
      whatsapp: "(44) 99777-3003",
      email: "carlos.mendes@gmail.com",
      segmento: "AGRO",
      observacoes: "Produtor rural com 1.200 hectares em Astorga/PR. Crédito rural.",
      created_by_id: admin.id,
    },
  });

  const pessoa4 = await prisma.person.create({
    data: {
      tipo: "CLIENTE",
      subtipo: "PESSOA_JURIDICA",
      nome: "Cooperativa Agrícola do Norte do Paraná",
      razao_social: "Cooperativa Agrícola do Norte do Paraná - COANP",
      cpf_cnpj: "34.567.890/0001-12",
      cep: "87050-200",
      logradouro: "Rod. PR-317",
      numero: "km 5",
      bairro: "Parque Industrial",
      cidade: "Maringá",
      estado: "PR",
      celular: "(44) 99666-4004",
      whatsapp: "(44) 99666-4004",
      email: "juridico@coanp.com.br",
      segmento: "AGRO",
      observacoes: "Cooperativa com 1.500 cooperados. Consultoria permanente.",
      portal_access: true,
      portal_password: passwordHash,
      created_by_id: admin.id,
    },
  });

  const pessoa5 = await prisma.person.create({
    data: {
      tipo: "CLIENTE",
      subtipo: "PESSOA_JURIDICA",
      nome: "Pecuária Santa Maria Ltda",
      razao_social: "Pecuária Santa Maria Ltda",
      cpf_cnpj: "45.678.901/0001-23",
      cep: "65800-100",
      logradouro: "Rua São José",
      numero: "80",
      bairro: "Tresidela",
      cidade: "Balsas",
      estado: "MA",
      celular: "(99) 98777-5005",
      whatsapp: "(99) 98777-5005",
      email: "santamaria@pecuaria.com.br",
      segmento: "AGRO",
      observacoes: "Pecuária de corte e leite. 8.000 cabeças. Reestruturação de dívidas bancárias.",
      created_by_id: advogado2.id,
    },
  });

  const pessoa6 = await prisma.person.create({
    data: {
      tipo: "CLIENTE",
      subtipo: "PESSOA_JURIDICA",
      nome: "Armazéns Grão Dourado S.A.",
      razao_social: "Armazéns Grão Dourado S.A.",
      cpf_cnpj: "56.789.012/0001-34",
      cep: "87025-000",
      logradouro: "Av. Colombo",
      numero: "3200",
      bairro: "Zona 7",
      cidade: "Maringá",
      estado: "PR",
      celular: "(44) 99555-6006",
      whatsapp: "(44) 99555-6006",
      email: "diretoria@graodourado.com.br",
      segmento: "AGRO",
      observacoes: "Rede de armazéns e silos. Em processo de recuperação judicial.",
      portal_access: true,
      portal_password: passwordHash,
      created_by_id: admin.id,
    },
  });

  // Creditors / counter-parties (used as creditors in RJ cases)
  const credor1 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Banco do Brasil S.A.",
      razao_social: "Banco do Brasil S.A.",
      cpf_cnpj: "00.000.000/0001-91",
      cidade: "Brasília",
      estado: "DF",
      email: "juridico@bb.com.br",
      segmento: "FINANCEIRO",
      created_by_id: admin.id,
    },
  });

  const credor2 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Banco Safra S.A.",
      razao_social: "Banco Safra S.A.",
      cpf_cnpj: "58.160.789/0001-28",
      cidade: "São Paulo",
      estado: "SP",
      email: "juridico@safra.com.br",
      segmento: "FINANCEIRO",
      created_by_id: admin.id,
    },
  });

  // Additional creditors for RJ
  const credor3 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Caixa Econômica Federal",
      cpf_cnpj: "00.360.305/0001-04",
      cidade: "Brasília",
      estado: "DF",
      segmento: "FINANCEIRO",
      created_by_id: admin.id,
    },
  });

  const credor4 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Sicredi Cooperativa de Crédito",
      cpf_cnpj: "01.181.521/0001-55",
      cidade: "Maringá",
      estado: "PR",
      segmento: "FINANCEIRO",
      created_by_id: admin.id,
    },
  });

  const credor5 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Bunge Alimentos S.A.",
      cpf_cnpj: "84.046.101/0001-93",
      cidade: "São Paulo",
      estado: "SP",
      segmento: "AGRO",
      created_by_id: admin.id,
    },
  });

  const credor6 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Syngenta Proteção de Cultivos Ltda",
      cpf_cnpj: "60.744.463/0001-00",
      cidade: "São Paulo",
      estado: "SP",
      segmento: "AGRO",
      created_by_id: admin.id,
    },
  });

  const credor7 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_JURIDICA",
      nome: "Yara Brasil Fertilizantes S.A.",
      cpf_cnpj: "92.660.604/0001-82",
      cidade: "Porto Alegre",
      estado: "RS",
      segmento: "AGRO",
      created_by_id: admin.id,
    },
  });

  const credor8 = await prisma.person.create({
    data: {
      tipo: "CREDOR",
      subtipo: "PESSOA_FISICA",
      nome: "João Marcos Pereira",
      cpf_cnpj: "999.888.777-66",
      cidade: "Maringá",
      estado: "PR",
      profissao: "Trabalhador Rural",
      segmento: "AGRO",
      created_by_id: admin.id,
    },
  });

  // A judge
  const juiz1 = await prisma.person.create({
    data: {
      tipo: "JUIZ",
      subtipo: "PESSOA_FISICA",
      nome: "Dr. Ricardo Augusto de Lima",
      cidade: "Maringá",
      estado: "PR",
      created_by_id: admin.id,
    },
  });

  const juiz2 = await prisma.person.create({
    data: {
      tipo: "JUIZ",
      subtipo: "PESSOA_FISICA",
      nome: "Dra. Fernanda Costa Ribeiro",
      cidade: "Balsas",
      estado: "MA",
      created_by_id: admin.id,
    },
  });

  console.log("👥 Created 8 clients + 8 creditors + 2 judges");

  // ============================================================
  // 3. CASES (5 cases, including 2 RJ)
  // ============================================================
  const caso1_rj = await prisma.case.create({
    data: {
      numero_processo: "5001234-56.2025.8.16.0001",
      tipo: "RECUPERACAO_JUDICIAL",
      status: "ATIVO",
      fase_processual: "Apresentação do Plano de Recuperação",
      vara: "1ª Vara Empresarial",
      comarca: "Maringá",
      tribunal: "TJPR",
      uf: "PR",
      juiz_id: juiz1.id,
      valor_causa: 45000000.00,
      valor_risco: 45000000.00,
      cliente_id: pessoa6.id,
      advogado_responsavel_id: admin.id,
      tags: ["recuperação judicial", "agro", "armazéns"],
    },
  });

  const caso2_rj = await prisma.case.create({
    data: {
      numero_processo: "0802345-67.2025.8.10.0015",
      tipo: "RECUPERACAO_JUDICIAL",
      status: "ATIVO",
      fase_processual: "Deliberação sobre o Plano",
      vara: "Vara Empresarial",
      comarca: "Balsas",
      tribunal: "TJMA",
      uf: "MA",
      juiz_id: juiz2.id,
      valor_causa: 78000000.00,
      valor_risco: 78000000.00,
      cliente_id: pessoa2.id,
      advogado_responsavel_id: advogado2.id,
      tags: ["recuperação judicial", "agro", "cerrado"],
    },
  });

  const caso3_exec = await prisma.case.create({
    data: {
      numero_processo: "5003456-78.2026.8.16.0001",
      tipo: "EXECUCAO",
      status: "ATIVO",
      fase_processual: "Citação do executado",
      vara: "3ª Vara Cível",
      comarca: "Maringá",
      tribunal: "TJPR",
      uf: "PR",
      juiz_id: juiz1.id,
      valor_causa: 1500000.00,
      valor_risco: 1200000.00,
      cliente_id: pessoa1.id,
      advogado_responsavel_id: advogado1.id,
      tags: ["execução", "crédito rural"],
    },
  });

  const caso4_agrario = await prisma.case.create({
    data: {
      numero_processo: "5004567-89.2025.8.16.0001",
      tipo: "AGRARIO",
      status: "ATIVO",
      fase_processual: "Instrução",
      vara: "2ª Vara Cível",
      comarca: "Maringá",
      tribunal: "TJPR",
      uf: "PR",
      juiz_id: juiz1.id,
      valor_causa: 3200000.00,
      cliente_id: pessoa3.id,
      advogado_responsavel_id: admin.id,
      tags: ["agrário", "usucapião", "terra"],
    },
  });

  const caso5_trib = await prisma.case.create({
    data: {
      numero_processo: "0805678-90.2026.8.10.0015",
      tipo: "TRIBUTARIO",
      status: "ATIVO",
      fase_processual: "Recurso especial",
      vara: "Vara da Fazenda Pública",
      comarca: "Balsas",
      tribunal: "TJMA",
      uf: "MA",
      juiz_id: juiz2.id,
      valor_causa: 850000.00,
      valor_risco: 600000.00,
      cliente_id: pessoa5.id,
      advogado_responsavel_id: advogado2.id,
      tags: ["tributário", "ICMS", "pecuária"],
    },
  });

  console.log("⚖️  Created 5 cases (2 RJ)");

  // ============================================================
  // 4. CASE TEAMS & PARTIES
  // ============================================================
  // Team for caso1_rj
  await prisma.caseTeam.createMany({
    data: [
      { case_id: caso1_rj.id, user_id: admin.id, role: "RESPONSAVEL" },
      { case_id: caso1_rj.id, user_id: advogado1.id, role: "MEMBRO" },
      { case_id: caso2_rj.id, user_id: advogado2.id, role: "RESPONSAVEL" },
      { case_id: caso2_rj.id, user_id: admin.id, role: "CONSULTOR" },
      { case_id: caso3_exec.id, user_id: advogado1.id, role: "RESPONSAVEL" },
      { case_id: caso4_agrario.id, user_id: admin.id, role: "RESPONSAVEL" },
      { case_id: caso5_trib.id, user_id: advogado2.id, role: "RESPONSAVEL" },
    ],
  });

  // Parties
  await prisma.caseParty.createMany({
    data: [
      { case_id: caso1_rj.id, person_id: pessoa6.id, role: "AUTOR" },
      { case_id: caso2_rj.id, person_id: pessoa2.id, role: "AUTOR" },
      { case_id: caso3_exec.id, person_id: pessoa1.id, role: "AUTOR" },
      { case_id: caso4_agrario.id, person_id: pessoa3.id, role: "AUTOR" },
      { case_id: caso5_trib.id, person_id: pessoa5.id, role: "AUTOR" },
    ],
  });

  // ============================================================
  // 5. CREDITORS (5 per RJ case = 10 total)
  // ============================================================
  // Creditors for caso1_rj (Armazéns Grão Dourado)
  await prisma.creditor.createMany({
    data: [
      { case_id: caso1_rj.id, person_id: credor1.id, classe: "II_GARANTIA_REAL", valor_original: 12000000.00, valor_atualizado: 13500000.00, status_credito: "HABILITADO" },
      { case_id: caso1_rj.id, person_id: credor2.id, classe: "II_GARANTIA_REAL", valor_original: 8000000.00, valor_atualizado: 9200000.00, status_credito: "HABILITADO" },
      { case_id: caso1_rj.id, person_id: credor5.id, classe: "III_QUIROGRAFARIO", valor_original: 5500000.00, valor_atualizado: 6100000.00, status_credito: "HABILITADO" },
      { case_id: caso1_rj.id, person_id: credor6.id, classe: "III_QUIROGRAFARIO", valor_original: 3200000.00, valor_atualizado: 3600000.00, status_credito: "PENDENTE" },
      { case_id: caso1_rj.id, person_id: credor8.id, classe: "I_TRABALHISTA", valor_original: 85000.00, valor_atualizado: 95000.00, status_credito: "HABILITADO" },
    ],
  });

  // Creditors for caso2_rj (Grupo Cerrado)
  await prisma.creditor.createMany({
    data: [
      { case_id: caso2_rj.id, person_id: credor1.id, classe: "II_GARANTIA_REAL", valor_original: 25000000.00, valor_atualizado: 28000000.00, status_credito: "HABILITADO" },
      { case_id: caso2_rj.id, person_id: credor3.id, classe: "II_GARANTIA_REAL", valor_original: 15000000.00, valor_atualizado: 17000000.00, status_credito: "HABILITADO" },
      { case_id: caso2_rj.id, person_id: credor4.id, classe: "III_QUIROGRAFARIO", valor_original: 8000000.00, valor_atualizado: 9500000.00, status_credito: "HABILITADO" },
      { case_id: caso2_rj.id, person_id: credor7.id, classe: "III_QUIROGRAFARIO", valor_original: 4500000.00, valor_atualizado: 5200000.00, status_credito: "IMPUGNADO" },
      { case_id: caso2_rj.id, person_id: credor5.id, classe: "IV_ME_EPP", valor_original: 350000.00, valor_atualizado: 400000.00, status_credito: "HABILITADO" },
    ],
  });

  console.log("💳 Created 10 creditors (5 per RJ)");

  // ============================================================
  // 6. DEADLINES (15 total)
  // ============================================================
  const now = new Date();
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  await prisma.deadline.createMany({
    data: [
      // Caso 1 - RJ
      { case_id: caso1_rj.id, tipo: "FATAL", descricao: "Prazo para apresentação do Plano de Recuperação Judicial", data_limite: addDays(now, 15), data_alerta: [addDays(now, 10), addDays(now, 12), addDays(now, 14)], responsavel_id: admin.id },
      { case_id: caso1_rj.id, tipo: "ORDINARIO", descricao: "Juntada de documentos contábeis atualizados", data_limite: addDays(now, 10), data_alerta: [addDays(now, 7)], responsavel_id: advogado1.id },
      { case_id: caso1_rj.id, tipo: "ASSEMBLEIA", descricao: "Assembleia Geral de Credores - 1ª convocação", data_limite: addDays(now, 45), data_alerta: [addDays(now, 30), addDays(now, 40), addDays(now, 44)], responsavel_id: admin.id },
      // Caso 2 - RJ
      { case_id: caso2_rj.id, tipo: "FATAL", descricao: "Prazo para impugnação ao crédito de Yara Fertilizantes", data_limite: addDays(now, 7), data_alerta: [addDays(now, 3), addDays(now, 5), addDays(now, 6)], responsavel_id: advogado2.id },
      { case_id: caso2_rj.id, tipo: "FATAL", descricao: "Prazo para manifestação sobre laudo pericial", data_limite: addDays(now, 20), data_alerta: [addDays(now, 15), addDays(now, 18)], responsavel_id: advogado2.id },
      { case_id: caso2_rj.id, tipo: "AUDIENCIA", descricao: "Audiência de conciliação com credores classe III", data_limite: addDays(now, 30), data_alerta: [addDays(now, 25), addDays(now, 29)], responsavel_id: advogado2.id },
      // Caso 3 - Execução
      { case_id: caso3_exec.id, tipo: "FATAL", descricao: "Prazo para embargos à execução", data_limite: addDays(now, 12), data_alerta: [addDays(now, 7), addDays(now, 10), addDays(now, 11)], responsavel_id: advogado1.id },
      { case_id: caso3_exec.id, tipo: "ORDINARIO", descricao: "Providenciar cálculo atualizado do débito", data_limite: addDays(now, 8), data_alerta: [addDays(now, 5)], responsavel_id: advogado1.id },
      { case_id: caso3_exec.id, tipo: "DILIGENCIA", descricao: "Diligência para localização de bens do executado", data_limite: addDays(now, 18), data_alerta: [addDays(now, 14)], responsavel_id: advogado1.id },
      // Caso 4 - Agrário
      { case_id: caso4_agrario.id, tipo: "FATAL", descricao: "Prazo para contestação", data_limite: addDays(now, 5), data_alerta: [addDays(now, 2), addDays(now, 4)], responsavel_id: admin.id },
      { case_id: caso4_agrario.id, tipo: "AUDIENCIA", descricao: "Audiência de instrução e julgamento", data_limite: addDays(now, 60), data_alerta: [addDays(now, 50), addDays(now, 58)], responsavel_id: admin.id },
      { case_id: caso4_agrario.id, tipo: "ORDINARIO", descricao: "Indicação de assistente técnico para perícia", data_limite: addDays(now, 25), data_alerta: [addDays(now, 20)], responsavel_id: admin.id },
      // Caso 5 - Tributário
      { case_id: caso5_trib.id, tipo: "FATAL", descricao: "Prazo para contrarrazões ao recurso especial", data_limite: addDays(now, 14), data_alerta: [addDays(now, 9), addDays(now, 12), addDays(now, 13)], responsavel_id: advogado2.id },
      { case_id: caso5_trib.id, tipo: "ORDINARIO", descricao: "Pedido de efeito suspensivo", data_limite: addDays(now, 3), data_alerta: [addDays(now, 1), addDays(now, 2)], responsavel_id: advogado2.id },
      { case_id: caso5_trib.id, tipo: "DILIGENCIA", descricao: "Obtenção de certidões negativas junto à SEFAZ/MA", data_limite: addDays(now, 22), data_alerta: [addDays(now, 18)], responsavel_id: advogado2.id },
    ],
  });

  console.log("📅 Created 15 deadlines");

  // ============================================================
  // 7. PROJECTS (3 management projects)
  // ============================================================
  // Project 1: Alvará/Liberação de Valores
  const projeto1 = await prisma.project.create({
    data: {
      titulo: "Liberação de Alvará Judicial - Fazenda Bela Vista",
      codigo: "PRJ-2026-001",
      cliente_id: pessoa1.id,
      categoria: "ALVARA_LIBERACAO",
      descricao: "Obtenção e liberação de alvará judicial referente a depósito judicial no valor de R$ 2.500.000,00 no processo de execução. Inclui petição, expedição, envio ao banco e confirmação de crédito.",
      valor_envolvido: 2500000.00,
      valor_honorarios: 50000.00,
      status: "EM_ANDAMENTO",
      prioridade: "ALTA",
      data_inicio: addDays(now, -30),
      data_prevista_conclusao: addDays(now, 30),
      advogado_responsavel_id: advogado1.id,
      visivel_portal: true,
      tags: ["alvará", "liberação", "depósito judicial"],
      created_by_id: admin.id,
    },
  });

  // Project 2: Recuperação de Crédito
  const projeto2 = await prisma.project.create({
    data: {
      titulo: "Recuperação de Crédito - Pecuária Santa Maria vs. Distribuidora Sul",
      codigo: "PRJ-2026-002",
      cliente_id: pessoa5.id,
      categoria: "RECUPERACAO_CREDITO",
      descricao: "Recuperação de crédito no valor de R$ 780.000,00 referente a venda de 500 cabeças de gado. Devedor: Distribuidora Sul Carnes Ltda. Tentativa extrajudicial antes de execução.",
      valor_envolvido: 780000.00,
      valor_honorarios: 78000.00,
      status: "EM_ANDAMENTO",
      prioridade: "ALTA",
      data_inicio: addDays(now, -15),
      data_prevista_conclusao: addDays(now, 60),
      advogado_responsavel_id: advogado2.id,
      visivel_portal: true,
      tags: ["cobrança", "pecuária", "crédito"],
      created_by_id: advogado2.id,
    },
  });

  // Project 3: Consultoria Permanente
  const projeto3 = await prisma.project.create({
    data: {
      titulo: "Consultoria Jurídica Permanente - COANP",
      codigo: "PRJ-2026-003",
      cliente_id: pessoa4.id,
      categoria: "CONSULTORIA_PERMANENTE",
      descricao: "Assessoria jurídica mensal à Cooperativa Agrícola do Norte do Paraná. Atendimento de demandas diversas: contratos, trabalhista, tributário, societário e regulatório.",
      valor_envolvido: 0,
      valor_honorarios: 25000.00,
      status: "EM_ANDAMENTO",
      prioridade: "MEDIA",
      data_inicio: addDays(now, -90),
      advogado_responsavel_id: admin.id,
      visivel_portal: true,
      tags: ["consultoria", "cooperativa", "mensal"],
      created_by_id: admin.id,
    },
  });

  console.log("📋 Created 3 projects");

  // ============================================================
  // 7b. PROJECT PHASES, TASKS, MILESTONES
  // ============================================================
  // Projeto 1 - Alvará phases
  const p1_fase1 = await prisma.projectPhase.create({
    data: { project_id: projeto1.id, titulo: "Petição de Alvará", ordem: 1, status: "CONCLUIDA", data_inicio_prevista: addDays(now, -30), data_fim_prevista: addDays(now, -25), data_inicio_real: addDays(now, -30), data_fim_real: addDays(now, -26), percentual_conclusao: 100, cor: "#22c55e" },
  });
  const p1_fase2 = await prisma.projectPhase.create({
    data: { project_id: projeto1.id, titulo: "Deferimento e Expedição", ordem: 2, status: "EM_ANDAMENTO", data_inicio_prevista: addDays(now, -25), data_fim_prevista: addDays(now, 5), data_inicio_real: addDays(now, -24), percentual_conclusao: 50, cor: "#3b82f6", dependencia_fase_id: p1_fase1.id },
  });
  const p1_fase3 = await prisma.projectPhase.create({
    data: { project_id: projeto1.id, titulo: "Envio ao Banco e Liberação", ordem: 3, status: "NAO_INICIADA", data_inicio_prevista: addDays(now, 5), data_fim_prevista: addDays(now, 30), cor: "#a855f7", dependencia_fase_id: p1_fase2.id },
  });

  // Tasks for projeto 1
  await prisma.projectTask.createMany({
    data: [
      { project_id: projeto1.id, phase_id: p1_fase1.id, titulo: "Elaborar petição de alvará", tipo: "OBTENCAO_ALVARA", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: advogado1.id, data_limite: addDays(now, -27), data_conclusao: addDays(now, -28), estimativa_horas: 4, horas_gastas: 3.5 },
      { project_id: projeto1.id, phase_id: p1_fase1.id, titulo: "Protocolar petição no sistema do tribunal", tipo: "PROTOCOLO", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: advogado1.id, data_limite: addDays(now, -25), data_conclusao: addDays(now, -26), estimativa_horas: 1, horas_gastas: 0.5 },
      { project_id: projeto1.id, phase_id: p1_fase2.id, titulo: "Acompanhar despacho do juiz", tipo: "ACOMPANHAMENTO", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: advogado1.id, data_limite: addDays(now, -10), data_conclusao: addDays(now, -12), estimativa_horas: 2, horas_gastas: 1 },
      { project_id: projeto1.id, phase_id: p1_fase2.id, titulo: "Aguardar expedição do alvará pela secretaria", tipo: "ACOMPANHAMENTO", status: "EM_ANDAMENTO", prioridade: "ALTA", responsavel_id: advogado1.id, data_limite: addDays(now, 5), estimativa_horas: 2, campos_especificos: { numero_alvara: null, vara: "3ª Vara Cível", valor_alvara: 2500000, status_liberacao: "DEFERIDO" } },
      { project_id: projeto1.id, phase_id: p1_fase3.id, titulo: "Enviar alvará ao Banco do Brasil", tipo: "LIBERACAO_VALORES", status: "BACKLOG", prioridade: "ALTA", responsavel_id: advogado1.id, data_limite: addDays(now, 15), estimativa_horas: 2, campos_especificos: { origem: "ALVARA", valor: 2500000, banco: "Banco do Brasil", conta: "12345-6" } },
      { project_id: projeto1.id, phase_id: p1_fase3.id, titulo: "Confirmar crédito na conta do cliente", tipo: "ACOMPANHAMENTO", status: "BACKLOG", prioridade: "CRITICA", responsavel_id: advogado1.id, data_limite: addDays(now, 30), notificar_cliente: true },
    ],
  });

  // Milestones for projeto 1
  await prisma.projectMilestone.createMany({
    data: [
      { project_id: projeto1.id, titulo: "Petição protocolada", data_prevista: addDays(now, -25), data_alcancada: addDays(now, -26), status: "ALCANCADO", impacto: "MEDIO" },
      { project_id: projeto1.id, titulo: "Alvará deferido", data_prevista: addDays(now, -5), data_alcancada: addDays(now, -12), status: "ALCANCADO", impacto: "ALTO" },
      { project_id: projeto1.id, titulo: "Alvará expedido", data_prevista: addDays(now, 5), status: "PENDENTE", impacto: "CRITICO", notificar_cliente: true },
      { project_id: projeto1.id, titulo: "Valor creditado na conta do cliente", data_prevista: addDays(now, 25), status: "PENDENTE", impacto: "CRITICO", notificar_cliente: true },
    ],
  });

  // Projeto 2 - Recuperação de Crédito phases
  const p2_fase1 = await prisma.projectPhase.create({
    data: { project_id: projeto2.id, titulo: "Análise do Crédito", ordem: 1, status: "CONCLUIDA", data_inicio_prevista: addDays(now, -15), data_fim_prevista: addDays(now, -10), data_inicio_real: addDays(now, -15), data_fim_real: addDays(now, -11), percentual_conclusao: 100, cor: "#22c55e" },
  });
  const p2_fase2 = await prisma.projectPhase.create({
    data: { project_id: projeto2.id, titulo: "Notificação Extrajudicial", ordem: 2, status: "CONCLUIDA", data_inicio_prevista: addDays(now, -10), data_fim_prevista: addDays(now, -3), data_inicio_real: addDays(now, -10), data_fim_real: addDays(now, -4), percentual_conclusao: 100, cor: "#22c55e", dependencia_fase_id: p2_fase1.id },
  });
  const p2_fase3 = await prisma.projectPhase.create({
    data: { project_id: projeto2.id, titulo: "Negociação", ordem: 3, status: "EM_ANDAMENTO", data_inicio_prevista: addDays(now, -3), data_fim_prevista: addDays(now, 30), data_inicio_real: addDays(now, -2), percentual_conclusao: 30, cor: "#f59e0b", dependencia_fase_id: p2_fase2.id },
  });
  const p2_fase4 = await prisma.projectPhase.create({
    data: { project_id: projeto2.id, titulo: "Acordo ou Execução", ordem: 4, status: "NAO_INICIADA", data_inicio_prevista: addDays(now, 30), data_fim_prevista: addDays(now, 60), cor: "#a855f7", dependencia_fase_id: p2_fase3.id },
  });

  await prisma.projectTask.createMany({
    data: [
      { project_id: projeto2.id, phase_id: p2_fase1.id, titulo: "Analisar documentos do crédito (notas fiscais, contratos)", tipo: "ANALISE", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: advogado2.id, data_limite: addDays(now, -12), data_conclusao: addDays(now, -13), estimativa_horas: 6, horas_gastas: 5 },
      { project_id: projeto2.id, phase_id: p2_fase2.id, titulo: "Elaborar e enviar notificação extrajudicial", tipo: "COMUNICACAO", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: advogado2.id, data_limite: addDays(now, -7), data_conclusao: addDays(now, -8), estimativa_horas: 3, horas_gastas: 2.5 },
      { project_id: projeto2.id, phase_id: p2_fase3.id, titulo: "Primeira reunião de negociação", tipo: "NEGOCIACAO", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: advogado2.id, data_limite: addDays(now, -1), data_conclusao: addDays(now, -1), estimativa_horas: 3, horas_gastas: 2, campos_especificos: { valor_pretendido: 780000, valor_proposto: 550000, status_negociacao: "CONTRAPROPOSTA" } },
      { project_id: projeto2.id, phase_id: p2_fase3.id, titulo: "Enviar contraproposta formal", tipo: "NEGOCIACAO", status: "EM_ANDAMENTO", prioridade: "ALTA", responsavel_id: advogado2.id, data_limite: addDays(now, 5), estimativa_horas: 2, campos_especificos: { valor_pretendido: 780000, valor_proposto: 680000, status_negociacao: "EM_CURSO" } },
      { project_id: projeto2.id, phase_id: p2_fase3.id, titulo: "Aguardar resposta do devedor", tipo: "ACOMPANHAMENTO", status: "A_FAZER", prioridade: "MEDIA", responsavel_id: advogado2.id, data_limite: addDays(now, 15) },
    ],
  });

  await prisma.projectMilestone.createMany({
    data: [
      { project_id: projeto2.id, titulo: "Notificação enviada", data_prevista: addDays(now, -7), data_alcancada: addDays(now, -8), status: "ALCANCADO", impacto: "MEDIO" },
      { project_id: projeto2.id, titulo: "Resposta recebida do devedor", data_prevista: addDays(now, 3), status: "PENDENTE", impacto: "ALTO" },
      { project_id: projeto2.id, titulo: "Acordo formalizado", data_prevista: addDays(now, 30), status: "PENDENTE", impacto: "CRITICO", notificar_cliente: true },
      { project_id: projeto2.id, titulo: "Primeiro pagamento recebido", data_prevista: addDays(now, 45), status: "PENDENTE", impacto: "CRITICO", notificar_cliente: true },
    ],
  });

  // Projeto 3 - Consultoria Permanente phases (monthly cycle)
  const p3_fase1 = await prisma.projectPhase.create({
    data: { project_id: projeto3.id, titulo: "Demandas de Fevereiro/2026", ordem: 1, status: "EM_ANDAMENTO", data_inicio_prevista: addDays(now, -16), data_fim_prevista: addDays(now, 12), percentual_conclusao: 40, cor: "#3b82f6" },
  });

  await prisma.projectTask.createMany({
    data: [
      { project_id: projeto3.id, phase_id: p3_fase1.id, titulo: "Revisão de contrato de fornecimento de insumos", tipo: "ANALISE", status: "CONCLUIDA", prioridade: "ALTA", responsavel_id: admin.id, data_limite: addDays(now, -5), data_conclusao: addDays(now, -6), estimativa_horas: 4, horas_gastas: 3 },
      { project_id: projeto3.id, phase_id: p3_fase1.id, titulo: "Consulta sobre enquadramento tributário de nova atividade", tipo: "ANALISE", status: "EM_ANDAMENTO", prioridade: "MEDIA", responsavel_id: admin.id, data_limite: addDays(now, 5), estimativa_horas: 6 },
      { project_id: projeto3.id, phase_id: p3_fase1.id, titulo: "Parecer sobre admissão de novo cooperado", tipo: "DOCUMENTO", status: "A_FAZER", prioridade: "BAIXA", responsavel_id: advogado1.id, data_limite: addDays(now, 10), estimativa_horas: 3 },
      { project_id: projeto3.id, phase_id: p3_fase1.id, titulo: "Relatório mensal de atividades", tipo: "DOCUMENTO", status: "BACKLOG", prioridade: "MEDIA", responsavel_id: admin.id, data_limite: addDays(now, 12), estimativa_horas: 2, notificar_cliente: true },
    ],
  });

  await prisma.projectMilestone.createMany({
    data: [
      { project_id: projeto3.id, titulo: "Relatório mensal jan/2026 entregue", data_prevista: addDays(now, -20), data_alcancada: addDays(now, -18), status: "ALCANCADO", impacto: "MEDIO", notificar_cliente: true },
      { project_id: projeto3.id, titulo: "Relatório mensal fev/2026 entregue", data_prevista: addDays(now, 14), status: "PENDENTE", impacto: "MEDIO", notificar_cliente: true },
    ],
  });

  // Project teams and stakeholders
  await prisma.projectTeam.createMany({
    data: [
      { project_id: projeto1.id, user_id: advogado1.id, role: "RESPONSAVEL" },
      { project_id: projeto1.id, user_id: admin.id, role: "CONSULTOR" },
      { project_id: projeto2.id, user_id: advogado2.id, role: "RESPONSAVEL" },
      { project_id: projeto3.id, user_id: admin.id, role: "RESPONSAVEL" },
      { project_id: projeto3.id, user_id: advogado1.id, role: "MEMBRO" },
    ],
  });

  await prisma.projectStakeholder.createMany({
    data: [
      { project_id: projeto1.id, person_id: pessoa1.id, role: "CLIENTE" },
      { project_id: projeto2.id, person_id: pessoa5.id, role: "CLIENTE" },
      { project_id: projeto3.id, person_id: pessoa4.id, role: "CLIENTE" },
    ],
  });

  console.log("📊 Created project phases, tasks, milestones, teams");

  // ============================================================
  // 8. TEMPLATES (10 document templates)
  // ============================================================
  await prisma.template.createMany({
    data: [
      {
        nome: "Petição Inicial - Recuperação Judicial",
        tipo_documento: "PETICAO_INICIAL",
        area: "RECUPERACAO_JUDICIAL",
        conteudo: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {{vara}} DA COMARCA DE {{comarca}} - {{uf}}\n\n{{razao_social}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{cnpj}}, com sede em {{endereco}}, por seus advogados que esta subscrevem (procuração anexa), vem, respeitosamente, à presença de Vossa Excelência, com fundamento nos artigos 47 a 72 da Lei nº 11.101/2005, requerer o PROCESSAMENTO DE SUA RECUPERAÇÃO JUDICIAL...",
        variaveis: ["vara", "comarca", "uf", "razao_social", "cnpj", "endereco"],
        prompt_ia: "Gere uma petição inicial de recuperação judicial completa, com base nos dados do cliente e na Lei 11.101/2005. Inclua: qualificação completa, exposição da crise, causas concretas, demonstração de viabilidade, documentos que instruem a inicial conforme art. 51.",
        created_by_id: admin.id,
      },
      {
        nome: "Plano de Recuperação Judicial",
        tipo_documento: "PLANO_RJ",
        area: "RECUPERACAO_JUDICIAL",
        conteudo: "PLANO DE RECUPERAÇÃO JUDICIAL\n\n{{razao_social}}\nProcesso nº {{numero_processo}}\n\n1. INTRODUÇÃO E HISTÓRICO DA EMPRESA\n2. CAUSAS DA CRISE\n3. DEMONSTRAÇÕES CONTÁBEIS\n4. MEIOS DE RECUPERAÇÃO (art. 50)\n5. TRATAMENTO DOS CRÉDITOS\n6. PRAZOS E CONDIÇÕES DE PAGAMENTO\n7. GARANTIAS\n8. VIABILIDADE ECONÔMICA",
        variaveis: ["razao_social", "numero_processo"],
        prompt_ia: "Elabore um plano de recuperação judicial detalhado conforme art. 53 da Lei 11.101/2005. Considere as classes de credores, os valores dos créditos e proponha condições de pagamento realistas.",
        created_by_id: admin.id,
      },
      {
        nome: "Petição de Alvará Judicial",
        tipo_documento: "ALVARA",
        area: "EXECUCAO",
        conteudo: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {{vara}}\n\nProcesso nº {{numero_processo}}\n\n{{nome_parte}}, já qualificado(a) nos autos, por seus advogados, vem requerer a expedição de ALVARÁ JUDICIAL para levantamento da quantia de R$ {{valor}}, depositada judicialmente...",
        variaveis: ["vara", "numero_processo", "nome_parte", "valor"],
        prompt_ia: "Gere petição de alvará judicial para levantamento de valores depositados em juízo. Fundamente no CPC e indique os dados bancários para depósito.",
        created_by_id: admin.id,
      },
      {
        nome: "Contestação - Ação de Cobrança",
        tipo_documento: "CONTESTACAO",
        area: "CONTRATUAL",
        conteudo: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO\n\nProcesso nº {{numero_processo}}\n\n{{nome_reu}}, já qualificado(a) nos autos da AÇÃO DE COBRANÇA movida por {{nome_autor}}, vem, por seus advogados, apresentar CONTESTAÇÃO...",
        variaveis: ["numero_processo", "nome_reu", "nome_autor"],
        prompt_ia: "Elabore contestação robusta para ação de cobrança. Analise possíveis preliminares (inépcia, prescrição, ilegitimidade) e defesa de mérito.",
        created_by_id: admin.id,
      },
      {
        nome: "Embargos de Declaração",
        tipo_documento: "EMBARGOS_DECLARACAO",
        area: "GERAL",
        conteudo: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO\n\nProcesso nº {{numero_processo}}\n\n{{nome_parte}}, por seus advogados, vem opor EMBARGOS DE DECLARAÇÃO em face da decisão de fls., com fundamento no art. 1.022 do CPC...",
        variaveis: ["numero_processo", "nome_parte"],
        prompt_ia: "Gere embargos de declaração identificando obscuridade, contradição ou omissão na decisão. Fundamente no art. 1.022 do CPC.",
        created_by_id: admin.id,
      },
      {
        nome: "Notificação Extrajudicial de Cobrança",
        tipo_documento: "NOTIFICACAO",
        area: "CONTRATUAL",
        conteudo: "NOTIFICAÇÃO EXTRAJUDICIAL\n\nIlmo. Sr. {{nome_devedor}}\n{{endereco_devedor}}\n\nRef.: Cobrança de débito no valor de R$ {{valor}}\n\nPela presente, NOTIFICAMOS V.Sa. para que, no prazo de {{prazo_dias}} dias...",
        variaveis: ["nome_devedor", "endereco_devedor", "valor", "prazo_dias"],
        prompt_ia: "Elabore notificação extrajudicial de cobrança formal, com linguagem firme porém respeitosa. Inclua prazo para pagamento, dados para depósito e consequências do inadimplemento.",
        created_by_id: admin.id,
      },
      {
        nome: "Parecer Jurídico - Tributário",
        tipo_documento: "PARECER",
        area: "TRIBUTARIO",
        conteudo: "PARECER JURÍDICO\n\nConsulente: {{nome_cliente}}\nAssunto: {{assunto}}\nRef.: {{referencia}}\n\n1. DA CONSULTA\n2. DOS FATOS\n3. DO ENQUADRAMENTO JURÍDICO\n4. DA ANÁLISE\n5. DA CONCLUSÃO E RECOMENDAÇÃO",
        variaveis: ["nome_cliente", "assunto", "referencia"],
        prompt_ia: "Elabore parecer jurídico tributário analisando a questão consultada. Cite legislação, jurisprudência e doutrina pertinentes. Conclua com recomendação prática.",
        created_by_id: admin.id,
      },
      {
        nome: "Relatório Mensal ao Cliente",
        tipo_documento: "RELATORIO_CLIENTE",
        area: "GERAL",
        conteudo: "RELATÓRIO DE ATIVIDADES\n\nCliente: {{nome_cliente}}\nPeríodo: {{periodo}}\n\n1. PROCESSOS JUDICIAIS\n{{atividades_processos}}\n\n2. PROJETOS GERENCIAIS\n{{atividades_projetos}}\n\n3. VALORES E LIBERAÇÕES\n{{valores}}\n\n4. PRÓXIMOS PASSOS\n{{proximos_passos}}",
        variaveis: ["nome_cliente", "periodo", "atividades_processos", "atividades_projetos", "valores", "proximos_passos"],
        prompt_ia: "Gere relatório mensal de atividades para o cliente, organizando por processos judiciais, projetos gerenciais e valores. Linguagem clara e objetiva.",
        created_by_id: admin.id,
      },
      {
        nome: "Habilitação de Crédito - RJ",
        tipo_documento: "HABILITACAO_CREDITO",
        area: "RECUPERACAO_JUDICIAL",
        conteudo: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO\n\nProcesso nº {{numero_processo}}\n\n{{nome_credor}}, por seus advogados, vem requerer a HABILITAÇÃO DE SEU CRÉDITO nos autos da recuperação judicial de {{nome_recuperanda}}...",
        variaveis: ["numero_processo", "nome_credor", "nome_recuperanda"],
        prompt_ia: "Gere petição de habilitação de crédito em recuperação judicial conforme art. 7º e seguintes da Lei 11.101/2005.",
        created_by_id: admin.id,
      },
      {
        nome: "Contrato de Honorários Advocatícios",
        tipo_documento: "CONTRATO",
        area: "GERAL",
        conteudo: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nCONTRATANTE: {{nome_cliente}}, inscrito no CPF/CNPJ sob nº {{cpf_cnpj}}\nCONTRATADO: JRCLaw Advocacia Empresarial\n\nCLÁUSULA 1ª - DO OBJETO\nCLÁUSULA 2ª - DOS HONORÁRIOS\nCLÁUSULA 3ª - DAS OBRIGAÇÕES\nCLÁUSULA 4ª - DA VIGÊNCIA\nCLÁUSULA 5ª - DA RESCISÃO",
        variaveis: ["nome_cliente", "cpf_cnpj"],
        prompt_ia: "Elabore contrato de honorários advocatícios conforme Código de Ética da OAB e tabela de honorários da seccional.",
        created_by_id: admin.id,
      },
    ],
  });

  console.log("📄 Created 10 document templates");

  // ============================================================
  // 9. PROJECT TEMPLATES (7)
  // ============================================================
  await prisma.projectTemplate.createMany({
    data: [
      // Template 1: Recuperação de Crédito
      {
        titulo: "Recuperação de Crédito",
        categoria: "RECUPERACAO_CREDITO",
        descricao: "Modelo completo para projetos de recuperação de crédito, desde a análise documental até o recebimento integral. Abrange notificação extrajudicial, negociação, formalização de acordo e acompanhamento de pagamentos.",
        fases_padrao: [
          {
            titulo: "Análise do Crédito",
            descricao: "Levantamento e análise de documentos comprobatórios do crédito, verificação de prescrição e cálculo atualizado",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Levantar documentos comprobatórios", tipo: "ANALISE" },
              { titulo: "Verificar prescrição e decadência", tipo: "ANALISE" },
              { titulo: "Calcular valor atualizado do crédito", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Notificação Extrajudicial",
            descricao: "Elaboração e envio de notificação extrajudicial ao devedor com prazo para resposta",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Redigir notificação extrajudicial", tipo: "COMUNICACAO" },
              { titulo: "Enviar via cartório com AR", tipo: "COMUNICACAO" },
              { titulo: "Aguardar prazo de resposta", tipo: "ACOMPANHAMENTO" },
            ],
          },
          {
            titulo: "Negociação",
            descricao: "Contato com devedor, apresentação de proposta e análise de contrapropostas",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Realizar contato inicial com devedor", tipo: "NEGOCIACAO" },
              { titulo: "Apresentar proposta de acordo", tipo: "NEGOCIACAO" },
              { titulo: "Analisar contraproposta", tipo: "NEGOCIACAO" },
            ],
          },
          {
            titulo: "Formalização",
            descricao: "Redação do termo de acordo, coleta de assinaturas e registro em cartório",
            ordem: 4,
            tarefas_padrao: [
              { titulo: "Redigir termo de acordo", tipo: "DOCUMENTO" },
              { titulo: "Colher assinaturas", tipo: "ASSINATURA" },
              { titulo: "Registrar acordo em cartório", tipo: "REGISTRO" },
            ],
          },
          {
            titulo: "Recebimento",
            descricao: "Acompanhamento de pagamentos, emissão de quitações e encerramento do projeto",
            ordem: 5,
            tarefas_padrao: [
              { titulo: "Acompanhar pagamentos", tipo: "COBRANCA" },
              { titulo: "Emitir recibos/quitações", tipo: "DOCUMENTO" },
              { titulo: "Encerrar projeto", tipo: "OUTRO" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Notificação enviada", offset_dias: 5 },
          { titulo: "Resposta recebida", offset_dias: 20 },
          { titulo: "Acordo formalizado", offset_dias: 45 },
          { titulo: "Primeiro pagamento recebido", offset_dias: 60 },
          { titulo: "Crédito quitado", offset_dias: 180 },
        ],
      },
      // Template 2: Obtenção de Alvará Judicial
      {
        titulo: "Obtenção de Alvará Judicial",
        categoria: "ALVARA_LIBERACAO",
        descricao: "Modelo completo para projetos de obtenção de alvará judicial e liberação de valores depositados em juízo. Inclui petição, acompanhamento de deferimento, expedição, envio ao banco e confirmação de crédito.",
        fases_padrao: [
          {
            titulo: "Petição",
            descricao: "Elaboração da petição de alvará, reunião de documentos e protocolo no tribunal",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Elaborar petição de alvará", tipo: "OBTENCAO_ALVARA" },
              { titulo: "Reunir documentos necessários", tipo: "DOCUMENTO" },
              { titulo: "Protocolar petição no tribunal", tipo: "PROTOCOLO" },
            ],
          },
          {
            titulo: "Deferimento",
            descricao: "Acompanhamento do despacho judicial e verificação de publicação",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Acompanhar despacho do juiz", tipo: "ACOMPANHAMENTO" },
              { titulo: "Verificar publicação no DJE", tipo: "ACOMPANHAMENTO" },
            ],
          },
          {
            titulo: "Expedição",
            descricao: "Requerimento e acompanhamento da expedição do alvará pela secretaria",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Requerer expedição do alvará", tipo: "OBTENCAO_ALVARA" },
              { titulo: "Acompanhar expedição pela secretaria", tipo: "ACOMPANHAMENTO" },
            ],
          },
          {
            titulo: "Envio ao Banco",
            descricao: "Obtenção do alvará físico ou digital e envio à instituição financeira",
            ordem: 4,
            tarefas_padrao: [
              { titulo: "Obter alvará físico ou digital", tipo: "OBTENCAO_ALVARA" },
              { titulo: "Enviar ao banco com ofício", tipo: "LIBERACAO_VALORES" },
            ],
          },
          {
            titulo: "Liberação",
            descricao: "Acompanhamento do processamento bancário e confirmação de crédito",
            ordem: 5,
            tarefas_padrao: [
              { titulo: "Acompanhar processamento bancário", tipo: "ACOMPANHAMENTO" },
              { titulo: "Confirmar crédito na conta", tipo: "LIBERACAO_VALORES" },
            ],
          },
          {
            titulo: "Confirmação",
            descricao: "Comunicação ao cliente, juntada de comprovante e encerramento",
            ordem: 6,
            tarefas_padrao: [
              { titulo: "Comunicar cliente sobre liberação", tipo: "COMUNICACAO" },
              { titulo: "Anexar comprovante aos autos", tipo: "DOCUMENTO" },
              { titulo: "Encerrar projeto", tipo: "OUTRO" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Petição protocolada", offset_dias: 3 },
          { titulo: "Alvará deferido", offset_dias: 15 },
          { titulo: "Alvará expedido", offset_dias: 25 },
          { titulo: "Valor liberado na conta", offset_dias: 40 },
        ],
      },
      // Template 3: Planejamento Tributário
      {
        titulo: "Planejamento Tributário",
        categoria: "PLANEJAMENTO_TRIBUTARIO",
        descricao: "Modelo completo para projetos de planejamento tributário, incluindo diagnóstico fiscal, modelagem de cenários, elaboração de parecer técnico, implementação e acompanhamento de resultados.",
        fases_padrao: [
          {
            titulo: "Diagnóstico Fiscal",
            descricao: "Levantamento de dados fiscais e contábeis, análise do regime atual e identificação de oportunidades",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Levantar dados fiscais e contábeis", tipo: "ANALISE" },
              { titulo: "Analisar regime tributário atual", tipo: "ANALISE" },
              { titulo: "Identificar oportunidades de economia", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Modelagem de Cenários",
            descricao: "Simulação de cenários tributários, comparação de regimes e cálculo de impacto financeiro",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Simular cenários tributários", tipo: "ANALISE" },
              { titulo: "Comparar regimes (Simples/Lucro Presumido/Real)", tipo: "ANALISE" },
              { titulo: "Calcular impacto financeiro", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Parecer Técnico",
            descricao: "Elaboração e revisão do parecer jurídico-tributário",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Elaborar parecer jurídico-tributário", tipo: "DOCUMENTO" },
              { titulo: "Revisar com sócio responsável", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Implementação",
            descricao: "Apresentação ao cliente, formalização da opção e orientação ao departamento contábil",
            ordem: 4,
            tarefas_padrao: [
              { titulo: "Apresentar ao cliente", tipo: "REUNIAO" },
              { titulo: "Formalizar opção pelo regime", tipo: "DOCUMENTO" },
              { titulo: "Orientar departamento contábil", tipo: "COMUNICACAO" },
            ],
          },
          {
            titulo: "Acompanhamento",
            descricao: "Monitoramento dos resultados e ajustes no planejamento",
            ordem: 5,
            tarefas_padrao: [
              { titulo: "Monitorar resultados do primeiro trimestre", tipo: "ACOMPANHAMENTO" },
              { titulo: "Ajustar planejamento se necessário", tipo: "ANALISE" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Diagnóstico concluído", offset_dias: 15 },
          { titulo: "Parecer aprovado pelo cliente", offset_dias: 35 },
          { titulo: "Implementação iniciada", offset_dias: 45 },
          { titulo: "Primeiro resultado apurado", offset_dias: 120 },
        ],
      },
      // Template 4: Due Diligence
      {
        titulo: "Due Diligence",
        categoria: "DUE_DILIGENCE",
        descricao: "Modelo completo para projetos de due diligence jurídica, cobrindo definição de escopo, levantamento documental, análise jurídica multidisciplinar, elaboração de relatório e apresentação de findings.",
        fases_padrao: [
          {
            titulo: "Definição de Escopo",
            descricao: "Reunião de kickoff, definição das áreas de análise e elaboração do checklist documental",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Reunião de kickoff com cliente", tipo: "REUNIAO" },
              { titulo: "Definir áreas de análise", tipo: "ANALISE" },
              { titulo: "Elaborar checklist documental", tipo: "DOCUMENTO" },
            ],
          },
          {
            titulo: "Levantamento Documental",
            descricao: "Solicitação de documentos à target, organização do data room e verificação de completude",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Solicitar documentos à target", tipo: "COMUNICACAO" },
              { titulo: "Organizar data room", tipo: "DOCUMENTO" },
              { titulo: "Verificar completude dos documentos", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Análise Jurídica",
            descricao: "Análise multidisciplinar: societária, trabalhista, tributária e contingências judiciais",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Análise societária e contratos", tipo: "ANALISE" },
              { titulo: "Análise trabalhista e previdenciária", tipo: "ANALISE" },
              { titulo: "Análise tributária e fiscal", tipo: "ANALISE" },
              { titulo: "Análise de contingências judiciais", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Relatório",
            descricao: "Elaboração do relatório de due diligence, revisão com equipe e classificação de riscos",
            ordem: 4,
            tarefas_padrao: [
              { titulo: "Elaborar relatório de due diligence", tipo: "DOCUMENTO" },
              { titulo: "Revisar com equipe", tipo: "ANALISE" },
              { titulo: "Classificar riscos encontrados", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Apresentação",
            descricao: "Apresentação dos findings ao cliente, entrega do relatório final e recomendações",
            ordem: 5,
            tarefas_padrao: [
              { titulo: "Apresentar findings ao cliente", tipo: "REUNIAO" },
              { titulo: "Entregar relatório final", tipo: "DOCUMENTO" },
              { titulo: "Recomendar próximos passos", tipo: "COMUNICACAO" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Kickoff realizado", offset_dias: 3 },
          { titulo: "Documentos recebidos", offset_dias: 15 },
          { titulo: "Análise concluída", offset_dias: 40 },
          { titulo: "Relatório entregue", offset_dias: 50 },
        ],
      },
      // Template 5: Reestruturação Societária
      {
        titulo: "Reestruturação Societária",
        categoria: "REESTRUTURACAO_SOCIETARIA",
        descricao: "Modelo completo para projetos de reestruturação societária, incluindo diagnóstico da estrutura atual, modelagem da nova estrutura, documentação, deliberação e registro nos órgãos competentes.",
        fases_padrao: [
          {
            titulo: "Diagnóstico",
            descricao: "Análise da estrutura societária atual, mapeamento de participações e identificação de ineficiências",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Analisar estrutura societária atual", tipo: "ANALISE" },
              { titulo: "Mapear participações e holdings", tipo: "ANALISE" },
              { titulo: "Identificar ineficiências", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Modelagem",
            descricao: "Projeção da nova estrutura, simulação tributária e avaliação de aspectos sucessórios",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Projetar nova estrutura", tipo: "ANALISE" },
              { titulo: "Simular impacto tributário", tipo: "ANALISE" },
              { titulo: "Avaliar aspectos sucessórios", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Documentação",
            descricao: "Elaboração de alterações contratuais, atas de deliberação e contratos intercompany",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Elaborar alterações contratuais", tipo: "DOCUMENTO" },
              { titulo: "Preparar atas de deliberação", tipo: "DOCUMENTO" },
              { titulo: "Elaborar contratos intercompany", tipo: "DOCUMENTO" },
            ],
          },
          {
            titulo: "Deliberação e Assinatura",
            descricao: "Realização de assembleia/reunião de sócios, coleta de assinaturas e reconhecimento de firmas",
            ordem: 4,
            tarefas_padrao: [
              { titulo: "Realizar assembleia/reunião de sócios", tipo: "REUNIAO" },
              { titulo: "Colher assinaturas dos sócios", tipo: "ASSINATURA" },
              { titulo: "Reconhecer firmas", tipo: "DILIGENCIA" },
            ],
          },
          {
            titulo: "Registro",
            descricao: "Registro na Junta Comercial, atualização de cadastros e comunicação a terceiros",
            ordem: 5,
            tarefas_padrao: [
              { titulo: "Registrar na Junta Comercial", tipo: "REGISTRO" },
              { titulo: "Atualizar cadastros (Receita, SEFAZ)", tipo: "REGISTRO" },
              { titulo: "Comunicar bancos e terceiros", tipo: "COMUNICACAO" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Diagnóstico apresentado", offset_dias: 15 },
          { titulo: "Nova estrutura aprovada", offset_dias: 30 },
          { titulo: "Documentação assinada", offset_dias: 50 },
          { titulo: "Registro concluído", offset_dias: 70 },
        ],
      },
      // Template 6: Operação de Crédito Rural
      {
        titulo: "Operação de Crédito Rural",
        categoria: "OPERACAO_CREDITO_RURAL",
        descricao: "Modelo completo para projetos de formalização de operações de crédito rural, incluindo levantamento de documentação do produtor, análise de garantias, formalização contratual, registro e acompanhamento da liberação.",
        fases_padrao: [
          {
            titulo: "Documentação",
            descricao: "Levantamento de documentação do produtor, obtenção de certidões e verificação cadastral",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Levantar documentação do produtor", tipo: "DOCUMENTO" },
              { titulo: "Obter certidões negativas", tipo: "OBTENCAO_CERTIDAO" },
              { titulo: "Verificar situação cadastral", tipo: "ANALISE" },
            ],
          },
          {
            titulo: "Análise de Garantias",
            descricao: "Avaliação de imóveis rurais, verificação de ônus e obtenção de laudo de avaliação",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Avaliar imóveis rurais (matrícula)", tipo: "ANALISE" },
              { titulo: "Verificar ônus e gravames", tipo: "ANALISE" },
              { titulo: "Laudo de avaliação dos bens", tipo: "DOCUMENTO" },
            ],
          },
          {
            titulo: "Formalização",
            descricao: "Elaboração da cédula de crédito rural, contrato de penhor/hipoteca e coleta de assinaturas",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Elaborar cédula de crédito rural", tipo: "DOCUMENTO" },
              { titulo: "Preparar contrato de penhor/hipoteca", tipo: "DOCUMENTO" },
              { titulo: "Colher assinaturas", tipo: "ASSINATURA" },
            ],
          },
          {
            titulo: "Registro",
            descricao: "Registro de garantia no Cartório de Imóveis e penhor agrícola no CRDA",
            ordem: 4,
            tarefas_padrao: [
              { titulo: "Registrar garantia no Cartório de Imóveis", tipo: "REGISTRO" },
              { titulo: "Registrar penhor agrícola no CRDA", tipo: "REGISTRO" },
            ],
          },
          {
            titulo: "Liberação",
            descricao: "Acompanhamento da liberação do crédito, confirmação de depósito e entrega de documentação",
            ordem: 5,
            tarefas_padrao: [
              { titulo: "Acompanhar liberação do crédito", tipo: "ACOMPANHAMENTO" },
              { titulo: "Confirmar depósito na conta", tipo: "LIBERACAO_VALORES" },
              { titulo: "Entregar documentação ao cliente", tipo: "COMUNICACAO" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Documentação completa", offset_dias: 10 },
          { titulo: "Garantias aprovadas", offset_dias: 20 },
          { titulo: "Contrato assinado", offset_dias: 35 },
          { titulo: "Registro concluído", offset_dias: 50 },
          { titulo: "Crédito liberado", offset_dias: 60 },
        ],
      },
      // Template 7: Consultoria Permanente
      {
        titulo: "Consultoria Permanente",
        categoria: "CONSULTORIA_PERMANENTE",
        descricao: "Modelo para projetos de consultoria jurídica mensal/permanente com ciclos recorrentes. Inclui recebimento e classificação de demandas, execução e relatório mensal de atividades.",
        fases_padrao: [
          {
            titulo: "Demandas do Mês",
            descricao: "Reunião de alinhamento, classificação de demandas por urgência e distribuição de tarefas",
            ordem: 1,
            tarefas_padrao: [
              { titulo: "Reunião de alinhamento mensal", tipo: "REUNIAO" },
              { titulo: "Classificar demandas por urgência", tipo: "ANALISE" },
              { titulo: "Distribuir tarefas à equipe", tipo: "OUTRO" },
            ],
          },
          {
            titulo: "Execução",
            descricao: "Execução das demandas prioritárias, atendimento a consultas e acompanhamento de processos",
            ordem: 2,
            tarefas_padrao: [
              { titulo: "Executar demandas prioritárias", tipo: "OUTRO" },
              { titulo: "Prestar atendimento a consultas", tipo: "ANALISE" },
              { titulo: "Acompanhar processos em andamento", tipo: "ACOMPANHAMENTO" },
            ],
          },
          {
            titulo: "Relatório",
            descricao: "Elaboração e envio do relatório mensal de atividades e planejamento do mês seguinte",
            ordem: 3,
            tarefas_padrao: [
              { titulo: "Elaborar relatório mensal de atividades", tipo: "DOCUMENTO" },
              { titulo: "Enviar relatório ao cliente", tipo: "COMUNICACAO" },
              { titulo: "Planejar mês seguinte", tipo: "ANALISE" },
            ],
          },
        ],
        marcos_padrao: [
          { titulo: "Relatório mensal entregue", offset_dias: 30 },
        ],
      },
    ],
  });

  console.log("📐 Created 7 project templates");

  // ============================================================
  // 10. LIBRARY ENTRIES (5)
  // ============================================================
  await prisma.libraryEntry.createMany({
    data: [
      {
        tipo: "LEGISLACAO",
        titulo: "Lei 11.101/2005 - Lei de Recuperação Judicial e Falência",
        resumo: "Lei que regula a recuperação judicial, a extrajudicial e a falência do empresário e da sociedade empresária. Alterada pela Lei 14.112/2020.",
        conteudo: "Referência completa à Lei 11.101/2005 com as alterações da Lei 14.112/2020. Principais artigos de uso frequente: Art. 6º (suspensão das ações), Art. 47 (objetivo da RJ), Art. 49 (créditos sujeitos), Art. 50 (meios de recuperação), Art. 51 (documentos da petição inicial), Art. 53 (plano de recuperação), Art. 56 (assembleia), Art. 58 (cram down).",
        fonte: "Presidência da República",
        area: "RECUPERACAO_JUDICIAL",
        tags: ["recuperação judicial", "falência", "lei 11101"],
        relevancia: 10,
        favorito: true,
      },
      {
        tipo: "JURISPRUDENCIA",
        titulo: "STJ - Tema 1051: Crédito rural não se submete à RJ",
        resumo: "O crédito rural com cédula de produto rural (CPR) com garantia real não se submete aos efeitos da recuperação judicial quando a garantia for constituída sobre bem essencial à atividade.",
        conteudo: "RECURSO ESPECIAL. RECUPERAÇÃO JUDICIAL. CRÉDITO RURAL. CPR. GARANTIA REAL. CESSÃO FIDUCIÁRIA. BEM ESSENCIAL. A questão da essencialidade do bem dado em garantia fiduciária para manutenção da atividade empresarial deve ser analisada caso a caso pelo juízo da recuperação judicial, nos termos do § 3º do art. 49 da Lei 11.101/2005.",
        fonte: "STJ - REsp 1.758.746/GO",
        area: "RECUPERACAO_JUDICIAL",
        tags: ["crédito rural", "CPR", "garantia real", "RJ"],
        relevancia: 9,
        favorito: true,
      },
      {
        tipo: "DOUTRINA",
        titulo: "Manual de Recuperação Judicial - Aspectos Práticos",
        resumo: "Análise prática dos procedimentos de recuperação judicial, incluindo fluxograma processual, prazos e estratégias de negociação com credores.",
        conteudo: "Referência doutrinária abrangente sobre os aspectos práticos da recuperação judicial, incluindo: 1) Preparação da petição inicial e documentos; 2) Stay period e seus efeitos; 3) Habilitação e divergência de créditos; 4) Elaboração do plano; 5) Assembleia geral de credores; 6) Cram down; 7) Cumprimento do plano; 8) Encerramento.",
        fonte: "Biblioteca JRCLaw",
        area: "RECUPERACAO_JUDICIAL",
        tags: ["doutrina", "recuperação judicial", "manual prático"],
        relevancia: 8,
      },
      {
        tipo: "LEGISLACAO",
        titulo: "Lei 8.929/1994 - Cédula de Produto Rural (CPR)",
        resumo: "Institui a Cédula de Produto Rural. Instrumento fundamental no agronegócio para financiamento da produção agrícola.",
        conteudo: "Lei que institui a CPR como título líquido e certo, negociável no mercado financeiro. Tipos: CPR física (entrega do produto) e CPR financeira (liquidação financeira). Art. 1º ao 22. Essencial para operações de crédito rural e garantias no agronegócio.",
        fonte: "Presidência da República",
        area: "AGRARIO",
        tags: ["CPR", "crédito rural", "agronegócio", "título"],
        relevancia: 8,
        favorito: true,
      },
      {
        tipo: "SUMULA",
        titulo: "Súmula 364/STJ - Penhora e bem de família do fiador",
        resumo: "O conceito de impenhorabilidade de bem de família abrange também o imóvel pertencente a pessoas solteiras, separadas e viúvas.",
        conteudo: "Súmula 364 do STJ: O conceito de impenhorabilidade de bem de família abrange também o imóvel pertencente a pessoas solteiras, separadas e viúvas. Relevante para execuções envolvendo produtores rurais pessoa física.",
        fonte: "STJ",
        area: "EXECUCAO",
        tags: ["súmula", "bem de família", "impenhorabilidade", "execução"],
        relevancia: 7,
      },
    ],
  });

  console.log("📚 Created 5 library entries");

  // ============================================================
  // 11. SOME CASE MOVEMENTS AND ACTIVITIES
  // ============================================================
  await prisma.caseMovement.createMany({
    data: [
      { case_id: caso1_rj.id, data: addDays(now, -45), tipo: "DECISAO", descricao: "Deferido o processamento da recuperação judicial. Nomeado administrador judicial.", notificar_cliente: true },
      { case_id: caso1_rj.id, data: addDays(now, -30), tipo: "DESPACHO", descricao: "Determinada a publicação do edital previsto no art. 52, §1º da Lei 11.101/2005." },
      { case_id: caso1_rj.id, data: addDays(now, -5), tipo: "ATO_ORDINATORIO", descricao: "Publicada a relação de credores pelo administrador judicial (art. 7º, §2º)." },
      { case_id: caso2_rj.id, data: addDays(now, -60), tipo: "DECISAO", descricao: "Deferido o processamento da recuperação judicial do Grupo Cerrado Agroindustrial.", notificar_cliente: true },
      { case_id: caso2_rj.id, data: addDays(now, -10), tipo: "DESPACHO", descricao: "Designada assembleia geral de credores para deliberação sobre o plano." },
      { case_id: caso3_exec.id, data: addDays(now, -8), tipo: "CITACAO", descricao: "Citação do executado para pagamento em 3 dias ou nomear bens à penhora." },
      { case_id: caso4_agrario.id, data: addDays(now, -20), tipo: "DESPACHO", descricao: "Determinada a realização de perícia técnica no imóvel rural." },
    ],
  });

  await prisma.activity.createMany({
    data: [
      { case_id: caso1_rj.id, user_id: admin.id, tipo: "REUNIAO", descricao: "Reunião com diretoria da Armazéns Grão Dourado para discussão da estratégia do plano de recuperação.", data: addDays(now, -20), duracao_minutos: 120, resultado: "Definida estratégia de deságio progressivo e carência de 12 meses.", visivel_portal: true, faturavel: true, valor_hora: 500 },
      { case_id: caso1_rj.id, user_id: advogado1.id, tipo: "ANALISE", descricao: "Análise dos demonstrativos contábeis e projeção de fluxo de caixa para o plano.", data: addDays(now, -15), duracao_minutos: 480, faturavel: true, valor_hora: 350 },
      { case_id: caso2_rj.id, user_id: advogado2.id, tipo: "NEGOCIACAO", descricao: "Negociação com Banco do Brasil para condições de pagamento do crédito com garantia real.", data: addDays(now, -8), duracao_minutos: 90, resultado: "BB propôs deságio de 30% com pagamento em 48 parcelas.", visivel_portal: true, faturavel: true, valor_hora: 350 },
      { project_id: projeto1.id, user_id: advogado1.id, tipo: "PETICAO", descricao: "Elaboração e protocolo da petição de alvará judicial para levantamento dos valores.", data: addDays(now, -28), duracao_minutos: 240, visivel_portal: true, faturavel: true, valor_hora: 350 },
      { project_id: projeto2.id, user_id: advogado2.id, tipo: "TELEFONEMA", descricao: "Contato telefônico com advogado da Distribuidora Sul para agendar reunião de negociação.", data: addDays(now, -3), duracao_minutos: 15, faturavel: false },
    ],
  });

  console.log("📝 Created movements and activities");

  // ============================================================
  // 12. HOLIDAYS (Nacional + SP, PR, TO, MA — 2024 a 2027)
  // ============================================================
  // Easter dates (Computus algorithm)
  const easterDates: Record<number, Date> = {
    2024: new Date(2024, 2, 31), // March 31
    2025: new Date(2025, 3, 20), // April 20
    2026: new Date(2026, 3, 5),  // April 5
    2027: new Date(2027, 2, 28), // March 28
  };

  function daysFrom(base: Date, offset: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    return d;
  }

  const holidays: { data: Date; nome: string; tipo: string; uf: string | null }[] = [];

  for (const year of [2024, 2025, 2026, 2027]) {
    const easter = easterDates[year];

    // ── NACIONAIS ──
    const nacionais: [Date, string][] = [
      [new Date(year, 0, 1),   "Confraternizacao Universal"],
      [daysFrom(easter, -48),  "Carnaval (segunda-feira)"],
      [daysFrom(easter, -47),  "Carnaval (terca-feira)"],
      [daysFrom(easter, -2),   "Sexta-feira Santa"],
      [new Date(year, 3, 21),  "Tiradentes"],
      [new Date(year, 4, 1),   "Dia do Trabalho"],
      [daysFrom(easter, 60),   "Corpus Christi"],
      [new Date(year, 8, 7),   "Independencia do Brasil"],
      [new Date(year, 9, 12),  "Nossa Senhora Aparecida"],
      [new Date(year, 10, 2),  "Finados"],
      [new Date(year, 10, 15), "Proclamacao da Republica"],
      [new Date(year, 10, 20), "Dia da Consciencia Negra"],
      [new Date(year, 11, 25), "Natal"],
    ];

    for (const [data, nome] of nacionais) {
      holidays.push({ data, nome, tipo: "NACIONAL", uf: null });
    }

    // ── SP (estaduais) ──
    holidays.push({ data: new Date(year, 0, 25), nome: "Aniversario de Sao Paulo", tipo: "ESTADUAL", uf: "SP" });
    holidays.push({ data: new Date(year, 6, 9),  nome: "Revolucao Constitucionalista", tipo: "ESTADUAL", uf: "SP" });

    // ── PR (estaduais) ──
    holidays.push({ data: new Date(year, 11, 19), nome: "Emancipacao do Parana", tipo: "ESTADUAL", uf: "PR" });

    // ── TO (estaduais) ──
    holidays.push({ data: new Date(year, 9, 5),  nome: "Criacao do Estado do Tocantins", tipo: "ESTADUAL", uf: "TO" });
    holidays.push({ data: new Date(year, 8, 8),  nome: "Nossa Senhora da Natividade", tipo: "ESTADUAL", uf: "TO" });

    // ── MA (estaduais) ──
    holidays.push({ data: new Date(year, 6, 28), nome: "Adesao do Maranhao a Independencia", tipo: "ESTADUAL", uf: "MA" });
  }

  await prisma.holiday.createMany({
    data: holidays.map((h) => ({
      data: h.data,
      nome: h.nome,
      tipo: h.tipo,
      uf: h.uf,
    })),
    skipDuplicates: true,
  });

  console.log(`📅 Created ${holidays.length} holidays (2024-2027, 4 years × nacionais + SP/PR/TO/MA)`);

  console.log("\n✅ Seed completed successfully!");
  console.log("   - 3 users (admin, advogado1, advogado2)");
  console.log("   - 8 clients + 8 creditors + 2 judges = 18 persons");
  console.log("   - 5 cases (2 RJ, 1 execução, 1 agrário, 1 tributário)");
  console.log("   - 3 projects (alvará, recuperação crédito, consultoria)");
  console.log("   - 15 deadlines");
  console.log("   - 10 creditors (5 per RJ)");
  console.log("   - 10 document templates");
  console.log("   - 7 project templates");
  console.log("   - 5 library entries");
  console.log(`   - ${holidays.length} holidays (nacionais + SP/PR/TO/MA)`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
