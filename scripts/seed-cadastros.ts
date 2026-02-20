import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding cadastros (Courts, Judges, Staff, Judicial Administrators, Related Persons)...");

  // ─── Courts ─────────────────────────────────────────────
  const court1 = await prisma.court.upsert({
    where: { id: "court-1-civel-maringa" },
    update: {},
    create: {
      id: "court-1-civel-maringa",
      name: "1ª Vara Cível da Comarca de Maringá",
      shortName: "1ª Cível Maringá",
      courtType: "VARA_CIVEL",
      instance: "PRIMEIRA",
      comarca: "Maringá",
      city: "Maringá",
      state: "PR",
      tribunal: "TJPR",
      tribunalCode: "8.16",
      email: "vara1civel@tjpr.jus.br",
    },
  });
  console.log(`  ✓ Court: ${court1.name}`);

  const court2 = await prisma.court.upsert({
    where: { id: "court-falencias-curitiba" },
    update: {},
    create: {
      id: "court-falencias-curitiba",
      name: "Vara de Falências e Recuperações Judiciais de Curitiba",
      shortName: "Falências Curitiba",
      courtType: "VARA_FALENCIAS_RJ",
      instance: "PRIMEIRA",
      comarca: "Curitiba",
      city: "Curitiba",
      state: "PR",
      tribunal: "TJPR",
      email: "falencias@tjpr.jus.br",
    },
  });
  console.log(`  ✓ Court: ${court2.name}`);

  const court3 = await prisma.court.upsert({
    where: { id: "court-1-civel-balsas" },
    update: {},
    create: {
      id: "court-1-civel-balsas",
      name: "1ª Vara Cível da Comarca de Balsas",
      shortName: "1ª Cível Balsas",
      courtType: "VARA_CIVEL",
      instance: "PRIMEIRA",
      comarca: "Balsas",
      city: "Balsas",
      state: "MA",
      tribunal: "TJMA",
      tribunalCode: "8.10",
      email: "vara1civel@tjma.jus.br",
    },
  });
  console.log(`  ✓ Court: ${court3.name}`);

  const court4 = await prisma.court.upsert({
    where: { id: "court-2-camara-tjpr" },
    update: {},
    create: {
      id: "court-2-camara-tjpr",
      name: "2ª Câmara Cível do TJPR",
      shortName: "2ª Câmara TJPR",
      courtType: "CAMARA_CIVEL",
      instance: "SEGUNDA",
      comarca: "Curitiba",
      city: "Curitiba",
      state: "PR",
      tribunal: "TJPR",
    },
  });
  console.log(`  ✓ Court: ${court4.name}`);

  const court5 = await prisma.court.upsert({
    where: { id: "court-4-turma-trf4" },
    update: {},
    create: {
      id: "court-4-turma-trf4",
      name: "4ª Turma do TRF4",
      shortName: "4ª Turma TRF4",
      courtType: "TURMA_TRF",
      instance: "SEGUNDA",
      comarca: "Porto Alegre",
      city: "Porto Alegre",
      state: "RS",
      tribunal: "TRF4",
      tribunalCode: "5.04",
    },
  });
  console.log(`  ✓ Court: ${court5.name}`);

  // ─── Judges ─────────────────────────────────────────────
  const judge1 = await prisma.judge.upsert({
    where: { id: "judge-ricardo-almeida" },
    update: {},
    create: {
      id: "judge-ricardo-almeida",
      name: "Dr. Ricardo Almeida Neto",
      title: "JUIZ",
      courtId: court1.id,
      email: "vara1civel@tjpr.jus.br",
      specialty: "Direito Empresarial e Recuperação Judicial",
      tendencyNotes: "Favorável a manutenção de empresas em RJ. Decisões rápidas em tutelas de urgência. Costuma intimar partes para audiência de conciliação antes de decidir liminares.",
      avgDecisionDays: 12,
      assistantName: "Maria Aparecida Silva",
      assistantEmail: "assessor.vara1civel@tjpr.jus.br",
      assistantPhone: "(44) 3226-1001",
    },
  });
  console.log(`  ✓ Judge: ${judge1.name}`);

  const judge2 = await prisma.judge.upsert({
    where: { id: "judge-fernanda-oliveira" },
    update: {},
    create: {
      id: "judge-fernanda-oliveira",
      name: "Dra. Fernanda Oliveira Santos",
      title: "JUIZ",
      courtId: court2.id,
      email: "falencias@tjpr.jus.br",
      specialty: "Falências e Recuperações Judiciais",
      tendencyNotes: "Rigorosa com prazos. Exige plano detalhado com projeções financeiras. Nomeia AJ de grande porte com experiência comprovada. Costuma indeferir pedidos de extensão de stay period.",
      avgDecisionDays: 8,
      assistantName: "Carlos Eduardo Mendes",
      assistantEmail: "assessor.falencias@tjpr.jus.br",
    },
  });
  console.log(`  ✓ Judge: ${judge2.name}`);

  const judge3 = await prisma.judge.upsert({
    where: { id: "judge-paulo-machado" },
    update: {},
    create: {
      id: "judge-paulo-machado",
      name: "Des. Paulo César Machado",
      title: "DESEMBARGADOR_TJ",
      courtId: court4.id,
      chamberName: "2ª Câmara Cível",
      email: "gabpaulomachado@tjpr.jus.br",
      specialty: "Direito Empresarial",
      tendencyNotes: "Relator frequente em agravos de instrumento de RJ. Tende a manter decisões de primeira instância salvo erro manifesto. Voto geralmente acompanha jurisprudência do STJ.",
      avgDecisionDays: 30,
    },
  });
  console.log(`  ✓ Judge: ${judge3.name}`);

  const judge4 = await prisma.judge.upsert({
    where: { id: "judge-marcos-silva" },
    update: {},
    create: {
      id: "judge-marcos-silva",
      name: "Dr. Marcos Antônio Silva",
      title: "JUIZ",
      courtId: court3.id,
      email: "vara1civel@tjma.jus.br",
      specialty: "Cível e Agrário",
      tendencyNotes: "Conhecedor de questões agrárias e crédito rural. Pragmático, busca soluções consensuais. Receptivo a pedidos de tutela provisória em questões de safra.",
      avgDecisionDays: 15,
    },
  });
  console.log(`  ✓ Judge: ${judge4.name}`);

  const judge5 = await prisma.judge.upsert({
    where: { id: "judge-ana-beatriz" },
    update: {},
    create: {
      id: "judge-ana-beatriz",
      name: "Dra. Ana Beatriz Ferreira Lima",
      title: "JUIZ_FEDERAL",
      courtId: court5.id,
      email: "4turma@trf4.jus.br",
      specialty: "Direito Tributário e Execução Fiscal",
      tendencyNotes: "Tendência garantista em execuções fiscais. Admite exceção de pré-executividade com frequência. Exige exaurimento da via administrativa.",
      avgDecisionDays: 20,
    },
  });
  console.log(`  ✓ Judge: ${judge5.name}`);

  // ─── Court Staff ────────────────────────────────────────
  await prisma.courtStaff.upsert({
    where: { id: "staff-escriva-maringa" },
    update: {},
    create: {
      id: "staff-escriva-maringa",
      name: "Rosangela Maria Santos",
      role: "ESCRIVAO",
      courtId: court1.id,
      email: "escrivania.vara1civel@tjpr.jus.br",
      phone: "(44) 3226-1002",
    },
  });

  await prisma.courtStaff.upsert({
    where: { id: "staff-analista-maringa" },
    update: {},
    create: {
      id: "staff-analista-maringa",
      name: "João Paulo Ferreira",
      role: "ANALISTA_JUDICIARIO",
      courtId: court1.id,
      email: "joaopaulo@tjpr.jus.br",
      phone: "(44) 3226-1003",
    },
  });

  await prisma.courtStaff.upsert({
    where: { id: "staff-oficial-maringa" },
    update: {},
    create: {
      id: "staff-oficial-maringa",
      name: "Pedro Henrique Lima",
      role: "OFICIAL_JUSTICA",
      courtId: court1.id,
      cellphone: "(44) 99901-2345",
    },
  });

  await prisma.courtStaff.upsert({
    where: { id: "staff-escriva-falencias" },
    update: {},
    create: {
      id: "staff-escriva-falencias",
      name: "Luciana Aparecida Costa",
      role: "ESCRIVAO",
      courtId: court2.id,
      email: "escrivania.falencias@tjpr.jus.br",
      phone: "(41) 3200-5501",
    },
  });

  await prisma.courtStaff.upsert({
    where: { id: "staff-contador-falencias" },
    update: {},
    create: {
      id: "staff-contador-falencias",
      name: "Roberto Carlos Nogueira",
      role: "CONTADOR_JUDICIAL",
      courtId: court2.id,
      email: "contadoria.falencias@tjpr.jus.br",
    },
  });

  console.log("  ✓ Court Staff: 5 members seeded");

  // ─── Judicial Administrators ────────────────────────────
  const aj1 = await prisma.judicialAdministrator.upsert({
    where: { id: "aj-parana" },
    update: {},
    create: {
      id: "aj-parana",
      companyName: "Administração Judicial Paraná Ltda",
      tradeName: "AJ Paraná",
      cnpj: "12.345.678/0001-90",
      email: "contato@ajparana.com.br",
      phone: "(41) 3322-4455",
      website: "https://www.ajparana.com.br",
      address: "Rua XV de Novembro, 1200, sala 801",
      city: "Curitiba",
      state: "PR",
      mainContactName: "Dr. Roberto Ferreira",
      mainContactEmail: "roberto@ajparana.com.br",
      mainContactPhone: "(41) 99900-1234",
      rating: 4,
      specialties: "RJ de médio e grande porte, Agronegócio, Falências complexas",
    },
  });
  console.log(`  ✓ Judicial Administrator: ${aj1.companyName}`);

  // Team members for AJ Paraná
  await prisma.judicialAdminTeamMember.upsert({
    where: { id: "ajt-roberto" },
    update: {},
    create: {
      id: "ajt-roberto",
      administratorId: aj1.id,
      name: "Dr. Roberto Ferreira",
      role: "ADMINISTRADOR_PRINCIPAL",
      oabNumber: "OAB/PR 45678",
      email: "roberto@ajparana.com.br",
      phone: "(41) 99900-1234",
    },
  });

  await prisma.judicialAdminTeamMember.upsert({
    where: { id: "ajt-maria-clara" },
    update: {},
    create: {
      id: "ajt-maria-clara",
      administratorId: aj1.id,
      name: "Maria Clara Souza",
      role: "CONTADOR_AJ",
      crcNumber: "CRC/PR 12345",
      email: "mariaclara@ajparana.com.br",
      phone: "(41) 99900-2345",
    },
  });

  await prisma.judicialAdminTeamMember.upsert({
    where: { id: "ajt-joao-pedro" },
    update: {},
    create: {
      id: "ajt-joao-pedro",
      administratorId: aj1.id,
      name: "João Pedro Lima",
      role: "ANALISTA_AJ",
      email: "joaopedro@ajparana.com.br",
    },
  });

  await prisma.judicialAdminTeamMember.upsert({
    where: { id: "ajt-ana-paula" },
    update: {},
    create: {
      id: "ajt-ana-paula",
      administratorId: aj1.id,
      name: "Dra. Ana Paula Costa",
      role: "ADVOGADO_AJ",
      oabNumber: "OAB/PR 67890",
      email: "anapaula@ajparana.com.br",
      phone: "(41) 99900-3456",
    },
  });

  console.log("  ✓ AJ Paraná team: 4 members");

  const aj2 = await prisma.judicialAdministrator.upsert({
    where: { id: "aj-deloitte" },
    update: {},
    create: {
      id: "aj-deloitte",
      companyName: "Deloitte Touche Tohmatsu",
      tradeName: "Deloitte",
      cnpj: "03.566.460/0001-29",
      email: "restructuring@deloitte.com.br",
      phone: "(11) 5186-1000",
      website: "https://www.deloitte.com.br",
      address: "Av. Dr. Chucri Zaidan, 1240",
      city: "São Paulo",
      state: "SP",
      mainContactName: "Diretor de Reestruturação",
      mainContactEmail: "restructuring@deloitte.com.br",
      rating: 5,
      specialties: "RJ de grande porte, Falências complexas, Reestruturação empresarial",
    },
  });
  console.log(`  ✓ Judicial Administrator: ${aj2.companyName}`);

  const aj3 = await prisma.judicialAdministrator.upsert({
    where: { id: "aj-marsal" },
    update: {},
    create: {
      id: "aj-marsal",
      companyName: "Alvarez & Marsal",
      tradeName: "A&M",
      cnpj: "09.876.543/0001-21",
      email: "brazil@alvarezandmarsal.com",
      phone: "(11) 3500-8500",
      website: "https://www.alvarezandmarsal.com",
      address: "Av. Brigadeiro Faria Lima, 3400",
      city: "São Paulo",
      state: "SP",
      mainContactName: "Managing Director",
      rating: 5,
      specialties: "RJ de grande porte, Turnaround, Gestão interina, Litígios complexos",
    },
  });
  console.log(`  ✓ Judicial Administrator: ${aj3.companyName}`);

  // ─── Client Related Persons (Mapa de Influência) ────────
  // Find a client to attach related persons to
  const sampleClient = await prisma.person.findFirst({
    where: { tipo: "CLIENTE" },
    orderBy: { created_at: "asc" },
  });

  if (sampleClient) {
    console.log(`  → Attaching related persons to client: ${sampleClient.nome}`);

    await prisma.clientRelatedPerson.upsert({
      where: { id: "crp-socio-admin" },
      update: {},
      create: {
        id: "crp-socio-admin",
        clientId: sampleClient.id,
        name: "José Carlos Cerrado",
        relationship: "SOCIO_ADMINISTRADOR",
        influenceLevel: "CRITICO",
        decisionPower: true,
        isKeyPerson: true,
        phone: "(99) 98888-1001",
        email: "jose@grupocerrado.com.br",
        position: "Diretor Presidente",
        influenceNotes: "Decisor final. Autoriza todos os acordos. Contato direto com o sócio do escritório.",
        preferredChannel: "WhatsApp",
        contactFrequency: "Semanal",
      },
    });

    await prisma.clientRelatedPerson.upsert({
      where: { id: "crp-conjuge" },
      update: {},
      create: {
        id: "crp-conjuge",
        clientId: sampleClient.id,
        name: "Maria Helena Cerrado",
        relationship: "CONJUGE",
        influenceLevel: "ALTO_INF",
        decisionPower: false,
        isKeyPerson: true,
        phone: "(99) 98888-1002",
        email: "maria.helena@email.com",
        influenceNotes: "Cônjuge do sócio principal. Participa de decisões patrimoniais. Meação. Precisa assinar em operações imobiliárias.",
        preferredChannel: "Telefone",
        contactFrequency: "Mensal",
      },
    });

    await prisma.clientRelatedPerson.upsert({
      where: { id: "crp-filho" },
      update: {},
      create: {
        id: "crp-filho",
        clientId: sampleClient.id,
        name: "Pedro Henrique Cerrado",
        relationship: "FILHO",
        influenceLevel: "MEDIO_INF",
        decisionPower: false,
        isKeyPerson: false,
        cellphone: "(99) 98888-1003",
        email: "pedro@grupocerrado.com.br",
        position: "Gerente Operacional",
        company: "Grupo Cerrado Agroindustrial",
        influenceNotes: "Filho do sócio. Gerencia operação agrícola em Balsas/MA. Contato operacional para assuntos de campo.",
        preferredChannel: "WhatsApp",
        contactFrequency: "Quinzenal",
      },
    });

    await prisma.clientRelatedPerson.upsert({
      where: { id: "crp-contador" },
      update: {},
      create: {
        id: "crp-contador",
        clientId: sampleClient.id,
        name: "Antônio Marcos Oliveira",
        relationship: "CONTADOR_OP",
        influenceLevel: "ALTO_INF",
        decisionPower: false,
        isKeyPerson: true,
        phone: "(99) 98888-2002",
        email: "antonio@oliveiracontabilidade.com.br",
        company: "Oliveira Contabilidade",
        position: "Contador Responsável",
        influenceNotes: "Contador há 15 anos. Conhece toda a estrutura fiscal e financeira. Fonte primária de documentos contábeis.",
        preferredChannel: "E-mail",
        contactFrequency: "Semanal",
      },
    });

    await prisma.clientRelatedPerson.upsert({
      where: { id: "crp-politico" },
      update: {},
      create: {
        id: "crp-politico",
        clientId: sampleClient.id,
        name: "Dep. Ricardo Nascimento",
        relationship: "POLITICO",
        influenceLevel: "MEDIO_INF",
        decisionPower: false,
        isKeyPerson: false,
        cellphone: "(99) 98888-3001",
        influenceNotes: "Deputado estadual (MA). Apoiou a empresa em questões regulatórias junto à Secretaria de Agricultura. Contato eventual.",
        contactFrequency: "Eventual",
      },
    });

    await prisma.clientRelatedPerson.upsert({
      where: { id: "crp-agente-financeiro" },
      update: {},
      create: {
        id: "crp-agente-financeiro",
        clientId: sampleClient.id,
        name: "Geraldo Souza",
        relationship: "AGENTE_FINANCEIRO",
        influenceLevel: "ALTO_INF",
        decisionPower: false,
        isKeyPerson: true,
        phone: "(99) 3541-2200",
        email: "geraldo.souza@bb.com.br",
        company: "Banco do Brasil — Agência Balsas",
        position: "Gerente Corporativo",
        influenceNotes: "Gerente da conta principal. Intermedia renegociações de crédito rural. Boa relação pessoal com o sócio.",
        preferredChannel: "Telefone",
        contactFrequency: "Quinzenal",
      },
    });

    console.log("  ✓ Client Related Persons: 6 seeded");
  } else {
    console.log("  ⚠ No client found — skipping related persons seed");
  }

  console.log("\n✅ Cadastros seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
