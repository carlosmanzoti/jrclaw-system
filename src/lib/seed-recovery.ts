import { PrismaClient } from "@prisma/client"

/**
 * Seeds 6 credit recovery cases with all related data for development/demo.
 * Can be called from the main seed script or run standalone.
 */
export async function seedRecoveryData(prisma: PrismaClient) {
  console.log("Seeding recovery data...")

  // ---------------------------------------------------------------------------
  // Clean existing recovery data (in correct order to respect FK constraints)
  // ---------------------------------------------------------------------------
  await prisma.monitoringAlert.deleteMany()
  await prisma.debtorMonitoring.deleteMany()
  await prisma.recoveryEvent.deleteMany()
  await prisma.jointDebtor.deleteMany()
  await prisma.desconsideracaoIncident.deleteMany()
  await prisma.agreementInstallment.deleteMany()
  await prisma.recoveryAgreement.deleteMany()
  await prisma.penhora.deleteMany()
  await prisma.collectionAction.deleteMany()
  await prisma.assetFound.deleteMany()
  await prisma.assetSearch.deleteMany()
  await prisma.patrimonialInvestigation.deleteMany()
  await prisma.creditRecoveryCase.deleteMany()

  console.log("  Existing recovery data cleaned.")

  // ---------------------------------------------------------------------------
  // Get or create a default user for responsavel_id
  // ---------------------------------------------------------------------------
  let defaultUser = await prisma.user.findFirst({
    where: { role: "SOCIO" },
  })
  if (!defaultUser) {
    defaultUser = await prisma.user.findFirst()
  }
  const userId = defaultUser?.id ?? undefined

  // =========================================================================
  // CASE 1 — PENHORA phase (cumprimento de sentenca)
  // Agropecuaria Boa Esperanca Ltda — R$ 2.8M original
  // =========================================================================
  const case1 = await prisma.creditRecoveryCase.create({
    data: {
      codigo: "REC-2026-001",
      titulo: "Recuperacao — Agropecuaria Boa Esperanca Ltda",
      tipo: "CUMPRIMENTO_SENTENCA",
      fase: "PENHORA",
      status: "ATIVO",
      prioridade: "ALTA",
      valor_original: 2800000,
      valor_atualizado: 3150000,
      valor_honorarios: 315000,
      valor_custas: 35000,
      valor_total_execucao: 3500000,
      valor_recuperado: 450000,
      valor_bloqueado: 450000,
      valor_penhorado: 1200000,
      percentual_recuperado: 12.86,
      titulo_tipo: "SENTENCA",
      titulo_numero: "0001234-56.2024.8.16.0014",
      titulo_data_vencimento: new Date("2023-06-15"),
      titulo_data_prescricao: new Date("2028-06-15"),
      devedor_nome: "Agropecuaria Boa Esperanca Ltda",
      devedor_cpf_cnpj: "12.345.678/0001-90",
      devedor_tipo: "PJ",
      devedor_endereco: "Rodovia PR-323, Km 45, Zona Rural, Maringa/PR",
      devedor_telefone: "(44) 3222-0000",
      devedor_email: "contato@boaesperanca.com.br",
      devedor_atividade: "Producao de soja e milho",
      score_recuperacao: 72,
      score_fatores: {
        titulo_executivo: { score: 90, peso: 20, justificativa: "Sentenca transitada em julgado, titulo liquido e certo" },
        patrimonio_devedor: { score: 75, peso: 25, justificativa: "Imoveis rurais e veiculos localizados, patrimonio visivel expressivo" },
        perfil_devedor: { score: 60, peso: 15, justificativa: "PJ ativa no agro, faturamento regular mas com dividas em outras execucoes" },
        risco_processual: { score: 65, peso: 15, justificativa: "Embargos a execucao rejeitados, mas possivel recurso de agravo sobre penhora" },
        historico_pagamento: { score: 50, peso: 10, justificativa: "Pagamento parcial via SISBAJUD, sem voluntariedade" },
        tempo_credito: { score: 80, peso: 15, justificativa: "Credito constituido ha 2 anos, prescricao em 2028, tempo adequado" },
      },
      risco_prescricao: "BAIXO",
      risco_insolvencia: "MEDIO",
      estrategia_ia: "Focar na expropriacao do imovel rural penhorado (R$ 1.2M) via leilao. Simultaneamente, manter teimosinha ativa no SISBAJUD para capturar movimentacoes financeiras. Considerar acordo com desconto de 20-25% se devedor demonstrar capacidade de pagamento a vista ou em ate 6 parcelas.",
      data_constituicao: new Date("2023-06-15"),
      data_vencimento: new Date("2023-06-15"),
      data_distribuicao: new Date("2024-03-10"),
      data_citacao: new Date("2024-04-22"),
      data_penhora: new Date("2025-08-15"),
      data_proxima_acao: new Date("2026-03-15"),
      proxima_acao: "Requerer avaliacao do imovel rural para leilao",
      responsavel_id: userId,
      observacoes: "Devedor operou normalmente durante toda a execucao. Transferiu 1 veiculo para o filho apos a citacao — possivel fraude a execucao. Imovel rural penhorado e a principal garantia.",
    },
  })

  // Investigation for Case 1
  const inv1 = await prisma.patrimonialInvestigation.create({
    data: {
      recovery_case_id: case1.id,
      codigo: "INV-2026-001",
      tipo: "COMPLETA",
      status: "CONCLUIDA",
      fase: "RELATORIO",
      total_bens_encontrados: 8,
      valor_total_estimado: 3200000,
      valor_penhoravel_estimado: 2400000,
      patrimonio_visivel: 2800000,
      patrimonio_oculto_est: 400000,
      red_flags: [
        "Transferencia de veiculo Hilux 2023 para filho (Carlos Eduardo) 15 dias apos citacao",
        "Participacao societaria em empresa com mesmo endereco — possivel grupo economico",
      ],
      indicio_fraude: true,
      indicio_ocultacao: false,
      indicio_grupo_eco: true,
      data_solicitacao: new Date("2024-05-01"),
      data_inicio: new Date("2024-05-05"),
      data_conclusao: new Date("2024-07-20"),
      responsavel_id: userId,
      observacoes: "Investigacao completa concluida. 15 buscas realizadas em 8 sistemas. Patrimonio expressivo localizado.",
    },
  })

  // Asset Searches for Case 1 (15 total, all completed)
  const searchSystems = [
    { sistema: "SISBAJUD", tipo_consulta: "BLOQUEIO", status: "RESPONDIDA", valor_encontrado: 450000, valor_bloqueado: 450000, qtd_resultados: 3 },
    { sistema: "SISBAJUD", tipo_consulta: "TEIMOSINHA", status: "RESPONDIDA", valor_encontrado: 0, valor_bloqueado: 0, qtd_resultados: 0, teimosinha_ativa: true, teimosinha_dias: 30, teimosinha_inicio: new Date("2026-01-15"), teimosinha_fim: new Date("2026-02-14") },
    { sistema: "RENAJUD", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 580000, qtd_resultados: 3 },
    { sistema: "RENAJUD", tipo_consulta: "RESTRICAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 3 },
    { sistema: "INFOJUD", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 1 },
    { sistema: "CNIB", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 2 },
    { sistema: "CRI", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 1800000, qtd_resultados: 2 },
    { sistema: "JUNTA_COMERCIAL", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 2 },
    { sistema: "DETRAN", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 580000, qtd_resultados: 3 },
    { sistema: "SERASA", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 1 },
    { sistema: "BOA_VISTA", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 1 },
    { sistema: "NEOWAY", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 3 },
    { sistema: "CNIS_INSS", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 0 },
    { sistema: "CCS_BACEN", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 5 },
    { sistema: "OSINT_GOOGLE", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 8 },
  ]

  for (const s of searchSystems) {
    await prisma.assetSearch.create({
      data: {
        investigation_id: inv1.id,
        sistema: s.sistema,
        tipo_consulta: s.tipo_consulta,
        cpf_cnpj_consultado: "12.345.678/0001-90",
        nome_consultado: "Agropecuaria Boa Esperanca Ltda",
        data_consulta: new Date("2024-05-10"),
        data_resposta: new Date("2024-05-15"),
        status: s.status,
        resultado_resumo: `Consulta ${s.sistema}: ${s.qtd_resultados} resultado(s)`,
        valor_encontrado: s.valor_encontrado,
        valor_bloqueado: s.valor_bloqueado ?? 0,
        qtd_resultados: s.qtd_resultados,
        numero_processo: "0001234-56.2024.8.16.0014",
        teimosinha_ativa: s.teimosinha_ativa ?? false,
        teimosinha_dias: s.teimosinha_dias,
        teimosinha_inicio: s.teimosinha_inicio,
        teimosinha_fim: s.teimosinha_fim,
      },
    })
  }

  // 8 Assets for Case 1
  const assets1 = [
    {
      tipo: "IMOVEL_RURAL", descricao: "Fazenda Boa Esperanca — 120 alqueires, soja e milho, Matricula 45.678 CRI Maringa",
      identificador: "Mat. 45.678", localizacao: "Rodovia PR-323, Km 45, Maringa/PR",
      valor_estimado: 1200000, valor_avaliacao: 1200000, status: "PENHORADO", penhoravel: true,
      titular_nome: "Agropecuaria Boa Esperanca Ltda", titular_cpf_cnpj: "12.345.678/0001-90", titular_relacao: "DEVEDOR",
      fonte: "CRI", data_localizacao: new Date("2024-06-10"),
    },
    {
      tipo: "IMOVEL_URBANO", descricao: "Sala comercial 301, Ed. Business Center, Centro, Maringa/PR — Matricula 78.901",
      identificador: "Mat. 78.901", localizacao: "Av. Brasil, 1500, sl 301, Centro, Maringa/PR",
      valor_estimado: 600000, status: "CONFIRMADO", penhoravel: true,
      titular_nome: "Agropecuaria Boa Esperanca Ltda", titular_cpf_cnpj: "12.345.678/0001-90", titular_relacao: "DEVEDOR",
      fonte: "CRI", data_localizacao: new Date("2024-06-10"),
    },
    {
      tipo: "VEICULO", descricao: "Toyota Hilux SRX 2023/2024, Prata, Placa ABC-1234",
      identificador: "ABC-1234", localizacao: "Maringa/PR",
      valor_estimado: 280000, status: "ALIENADO", penhoravel: false,
      motivo_impenhoravel: "Transferido para Carlos Eduardo (filho do socio) em 07/05/2024 — 15 dias apos citacao. Possivel fraude a execucao.",
      titular_nome: "Carlos Eduardo Fernandes", titular_cpf_cnpj: "123.456.789-00", titular_relacao: "LARANJA",
      fonte: "RENAJUD", data_localizacao: new Date("2024-05-20"),
    },
    {
      tipo: "VEICULO", descricao: "Ford Ranger XLS 2021/2022, Branca, Placa DEF-5678",
      identificador: "DEF-5678", localizacao: "Maringa/PR",
      valor_estimado: 180000, status: "CONFIRMADO", penhoravel: true,
      titular_nome: "Agropecuaria Boa Esperanca Ltda", titular_cpf_cnpj: "12.345.678/0001-90", titular_relacao: "DEVEDOR",
      fonte: "RENAJUD", data_localizacao: new Date("2024-05-20"),
    },
    {
      tipo: "VEICULO", descricao: "Massey Ferguson 8737 (Trator), 2020, Placa XYZ-9999",
      identificador: "XYZ-9999", localizacao: "Fazenda Boa Esperanca, Maringa/PR",
      valor_estimado: 120000, status: "CONFIRMADO", penhoravel: true,
      titular_nome: "Agropecuaria Boa Esperanca Ltda", titular_cpf_cnpj: "12.345.678/0001-90", titular_relacao: "DEVEDOR",
      fonte: "RENAJUD", data_localizacao: new Date("2024-05-20"),
    },
    {
      tipo: "CONTA_BANCARIA", descricao: "Conta corrente Banco do Brasil, Ag 0001, Cc 12345-6",
      identificador: "BB Ag 0001 Cc 12345-6", localizacao: "Maringa/PR",
      valor_estimado: 250000, status: "BLOQUEADO", penhoravel: true,
      titular_nome: "Agropecuaria Boa Esperanca Ltda", titular_cpf_cnpj: "12.345.678/0001-90", titular_relacao: "DEVEDOR",
      fonte: "SISBAJUD", data_localizacao: new Date("2024-05-15"),
    },
    {
      tipo: "CONTA_BANCARIA", descricao: "Conta corrente Sicoob, Ag 3001, Cc 98765-0",
      identificador: "Sicoob Ag 3001 Cc 98765-0", localizacao: "Maringa/PR",
      valor_estimado: 200000, status: "BLOQUEADO", penhoravel: true,
      titular_nome: "Agropecuaria Boa Esperanca Ltda", titular_cpf_cnpj: "12.345.678/0001-90", titular_relacao: "DEVEDOR",
      fonte: "SISBAJUD", data_localizacao: new Date("2024-05-15"),
    },
    {
      tipo: "PARTICIPACAO_SOCIETARIA", descricao: "50% do capital social de Granja Fernandes Ltda (CNPJ 98.765.432/0001-10)",
      identificador: "CNPJ 98.765.432/0001-10", localizacao: "Maringa/PR",
      valor_estimado: 350000, status: "CONFIRMADO", penhoravel: true,
      titular_nome: "Jose Roberto Fernandes", titular_cpf_cnpj: "987.654.321-00", titular_relacao: "SOCIO",
      fonte: "JUNTA_COMERCIAL", data_localizacao: new Date("2024-06-01"),
    },
  ]

  const createdAssets1: string[] = []
  for (const a of assets1) {
    const asset = await prisma.assetFound.create({
      data: {
        recovery_case_id: case1.id,
        investigation_id: inv1.id,
        tipo: a.tipo,
        descricao: a.descricao,
        identificador: a.identificador,
        localizacao: a.localizacao,
        valor_estimado: a.valor_estimado,
        valor_avaliacao: a.valor_avaliacao,
        status: a.status,
        penhoravel: a.penhoravel,
        motivo_impenhoravel: a.motivo_impenhoravel,
        titular_nome: a.titular_nome,
        titular_cpf_cnpj: a.titular_cpf_cnpj,
        titular_relacao: a.titular_relacao,
        fonte: a.fonte,
        data_localizacao: a.data_localizacao,
      },
    })
    createdAssets1.push(asset.id)
  }

  // 3 Collection Actions for Case 1
  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case1.id,
      tipo: "NOTIFICACAO_EXTRAJUDICIAL",
      categoria: "EXTRAJUDICIAL",
      descricao: "Notificacao extrajudicial via cartorio de titulos e documentos de Maringa, intimando para pagamento em 15 dias sob pena de protesto e ajuizamento de execucao.",
      data_acao: new Date("2024-02-15"),
      data_prazo: new Date("2024-03-01"),
      data_resultado: new Date("2024-03-05"),
      status: "CUMPRIDA",
      resultado: "Devedor notificado pessoalmente. Nao houve pagamento no prazo. Processo de execucao distribuido.",
      valor_envolvido: 2800000,
      responsavel_id: userId,
    },
  })

  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case1.id,
      tipo: "PROTESTO",
      categoria: "EXTRAJUDICIAL",
      descricao: "Protesto do titulo executivo no 1o Tabelionato de Protesto de Maringa/PR.",
      data_acao: new Date("2024-03-10"),
      data_resultado: new Date("2024-03-25"),
      status: "CUMPRIDA",
      resultado: "Titulo protestado. Devedor nao pagou. Certidao de protesto emitida.",
      valor_envolvido: 2800000,
      protesto_cartorio: "1o Tabelionato de Protesto de Maringa/PR",
      protesto_protocolo: "2024/003456",
      protesto_data_intimacao: new Date("2024-03-15"),
      protesto_data_lavratura: new Date("2024-03-25"),
      protesto_pago: false,
      responsavel_id: userId,
    },
  })

  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case1.id,
      tipo: "PENHORA_ONLINE",
      categoria: "JUDICIAL_EXECUCAO",
      descricao: "Requerimento de penhora online via SISBAJUD com teimosinha por 30 dias.",
      data_acao: new Date("2025-01-10"),
      data_resultado: new Date("2025-01-12"),
      status: "DEFERIDA",
      resultado: "Bloqueio de R$ 450.000,00 em contas do devedor (BB + Sicoob). Teimosinha ativada por 30 dias.",
      valor_envolvido: 3500000,
      valor_obtido: 450000,
      responsavel_id: userId,
    },
  })

  // 2 Penhoras for Case 1
  await prisma.penhora.create({
    data: {
      recovery_case_id: case1.id,
      asset_id: createdAssets1[5], // Conta BB
      tipo: "ONLINE_SISBAJUD",
      status: "EFETIVADA",
      valor_solicitado: 3500000,
      valor_efetivado: 450000,
      data_solicitacao: new Date("2025-01-10"),
      data_efetivacao: new Date("2025-01-12"),
      data_intimacao_devedor: new Date("2025-01-20"),
      auto_penhora_numero: "APH-2025-001",
      observacoes: "Bloqueio via SISBAJUD de R$ 250K (BB) + R$ 200K (Sicoob). Devedor intimado e nao impugnou.",
    },
  })

  await prisma.penhora.create({
    data: {
      recovery_case_id: case1.id,
      asset_id: createdAssets1[0], // Fazenda
      tipo: "IMOVEL",
      status: "EFETIVADA",
      valor_solicitado: 1200000,
      valor_efetivado: 1200000,
      avaliacao_valor: 1200000,
      avaliacao_data: new Date("2025-09-01"),
      avaliacao_por: "Perito judicial Eng. Antonio Silva",
      data_solicitacao: new Date("2025-07-01"),
      data_efetivacao: new Date("2025-08-15"),
      data_intimacao_devedor: new Date("2025-08-25"),
      auto_penhora_numero: "APH-2025-002",
      numero_processo: "0001234-56.2024.8.16.0014",
      observacoes: "Imovel rural (Fazenda Boa Esperanca) penhorado e avaliado. Aguardando designacao de leilao.",
    },
  })

  // 2 Monitoring + 2 Alerts for Case 1
  const mon1 = await prisma.debtorMonitoring.create({
    data: {
      recovery_case_id: case1.id,
      tipo: "PATRIMONIO",
      fonte: "NEOWAY",
      ativo: true,
      frequencia: "SEMANAL",
      ultima_verificacao: new Date("2026-02-10"),
      ultimo_resultado: { alteracoes: 0, ultimo_check: "2026-02-10" },
      alertas_pendentes: 1,
    },
  })

  const mon2 = await prisma.debtorMonitoring.create({
    data: {
      recovery_case_id: case1.id,
      tipo: "PROCESSO_JUDICIAL",
      fonte: "DATAJUD",
      ativo: true,
      frequencia: "DIARIO",
      ultima_verificacao: new Date("2026-02-15"),
      ultimo_resultado: { novos_processos: 0, ultimo_check: "2026-02-15" },
      alertas_pendentes: 1,
    },
  })

  await prisma.monitoringAlert.create({
    data: {
      monitoring_id: mon1.id,
      tipo: "BEM_ALIENADO",
      severidade: "CRITICA",
      titulo: "Transferencia de veiculo suspeita",
      descricao: "Veiculo Toyota Hilux SRX 2023 (ABC-1234) transferido para Carlos Eduardo Fernandes (CPF 123.456.789-00) — filho do socio — em 07/05/2024, apenas 15 dias apos a citacao. Forte indicio de fraude a execucao (art. 792, IV, CPC).",
      dados: { veiculo: "Hilux SRX 2023", placa: "ABC-1234", novo_proprietario: "Carlos Eduardo Fernandes", data_transferencia: "2024-05-07", parentesco: "Filho do socio" },
      lido: true,
      acao_tomada: "Peticionado nos autos requerendo a ineficacia da alienacao e inclusao do veiculo na penhora (art. 792, §1o, CPC).",
      data_acao: new Date("2024-06-15"),
    },
  })

  await prisma.monitoringAlert.create({
    data: {
      monitoring_id: mon2.id,
      tipo: "NOVO_PROCESSO",
      severidade: "ALTA",
      titulo: "Devedor ajuizou recuperacao judicial",
      descricao: "ATENCAO: Agropecuaria Boa Esperanca Ltda distribuiu pedido de recuperacao judicial na 1a Vara Civel de Maringa (processo 0009876-54.2026.8.16.0014) em 12/02/2026. Verificar impacto nos atos expropratorios.",
      dados: { processo_rj: "0009876-54.2026.8.16.0014", vara: "1a Vara Civel de Maringa", data_distribuicao: "2026-02-12" },
      lido: false,
    },
  })

  // 5 Recovery Events for Case 1
  const events1 = [
    { data: new Date("2024-02-15"), tipo: "NOTA", descricao: "Caso iniciado. Notificacao extrajudicial enviada via cartorio." },
    { data: new Date("2024-04-22"), tipo: "DECISAO", descricao: "Devedor citado no cumprimento de sentenca. Prazo de 15 dias para pagamento voluntario (art. 523, CPC)." },
    { data: new Date("2025-01-12"), tipo: "DECISAO", descricao: "SISBAJUD: Bloqueio de R$ 450.000,00 efetivado em contas do devedor (Banco do Brasil + Sicoob)." },
    { data: new Date("2025-08-15"), tipo: "DECISAO", descricao: "Penhora do imovel rural Fazenda Boa Esperanca efetivada e registrada na matricula. Avaliacao em R$ 1.200.000,00.", valor_mencionado: 1200000 },
    { data: new Date("2026-02-12"), tipo: "ALERTA_IA", descricao: "ALERTA: Devedor distribuiu pedido de recuperacao judicial. Necessario verificar suspensao dos atos expropratorios (art. 6o, Lei 11.101/2005) e habilitar credito na RJ.", sentimento: "NEGATIVO" },
  ]

  for (const e of events1) {
    await prisma.recoveryEvent.create({
      data: {
        recovery_case_id: case1.id,
        data: e.data,
        tipo: e.tipo,
        descricao: e.descricao,
        valor_mencionado: e.valor_mencionado,
        sentimento: e.sentimento,
        responsavel_id: userId,
      },
    })
  }

  console.log("  Case 1 (REC-2026-001) created with all relations.")

  // =========================================================================
  // CASE 2 — INVESTIGACAO phase
  // Joao Carlos Martins (PF) — R$ 850K CCB
  // =========================================================================
  const case2 = await prisma.creditRecoveryCase.create({
    data: {
      codigo: "REC-2026-002",
      titulo: "Recuperacao — Joao Carlos Martins (CCB Banco Bradesco)",
      tipo: "EXECUCAO_TITULO_EXTRAJUDICIAL",
      fase: "INVESTIGACAO",
      status: "ATIVO",
      prioridade: "MEDIA",
      valor_original: 850000,
      valor_atualizado: 920000,
      valor_total_execucao: 1050000,
      valor_recuperado: 0,
      valor_bloqueado: 0,
      valor_penhorado: 0,
      percentual_recuperado: 0,
      titulo_tipo: "CCB",
      titulo_numero: "CCB-2023-789456",
      titulo_data_vencimento: new Date("2024-01-15"),
      titulo_data_prescricao: new Date("2027-01-15"),
      devedor_nome: "Joao Carlos Martins",
      devedor_cpf_cnpj: "987.654.321-00",
      devedor_tipo: "PF",
      devedor_endereco: "Rua Marechal Deodoro, 500, Apto 301, Centro, Maringa/PR",
      devedor_telefone: "(44) 99999-1234",
      devedor_email: "jcmartins@email.com",
      devedor_atividade: "Empresario — setor de comercio varejista",
      score_recuperacao: 45,
      score_fatores: {
        titulo_executivo: { score: 85, peso: 20, justificativa: "CCB e titulo executivo extrajudicial solido (art. 28, Lei 10.931/2004)" },
        patrimonio_devedor: { score: 30, peso: 25, justificativa: "Investigacao em andamento, poucos bens localizados ate o momento" },
        perfil_devedor: { score: 40, peso: 15, justificativa: "PF com historico de inadimplencia, score Serasa baixo" },
        risco_processual: { score: 50, peso: 15, justificativa: "Possivel alegacao de abusividade de juros, mas CCB prevalece" },
        historico_pagamento: { score: 25, peso: 10, justificativa: "Nenhum pagamento voluntario, sem contato desde a inadimplencia" },
        tempo_credito: { score: 55, peso: 15, justificativa: "Credito recente, prescricao em 2027, tempo bom" },
      },
      risco_prescricao: "BAIXO",
      risco_insolvencia: "ALTO",
      data_constituicao: new Date("2023-03-10"),
      data_vencimento: new Date("2024-01-15"),
      data_distribuicao: new Date("2025-11-20"),
      data_citacao: new Date("2026-01-10"),
      data_proxima_acao: new Date("2026-03-01"),
      proxima_acao: "Concluir investigacao patrimonial e requerer penhora dos bens localizados",
      responsavel_id: userId,
    },
  })

  // Investigation for Case 2 (in progress)
  const inv2 = await prisma.patrimonialInvestigation.create({
    data: {
      recovery_case_id: case2.id,
      codigo: "INV-2026-002",
      tipo: "COMPLETA",
      status: "EM_ANDAMENTO",
      fase: "BUSCA_JUDICIAL",
      total_bens_encontrados: 3,
      valor_total_estimado: 380000,
      valor_penhoravel_estimado: 250000,
      data_solicitacao: new Date("2026-01-15"),
      data_inicio: new Date("2026-01-20"),
      responsavel_id: userId,
      observacoes: "5 de 12 buscas concluidas. Patrimonio reduzido ate o momento.",
    },
  })

  // 5 completed + 7 pending searches
  const completedSearches2 = [
    { sistema: "SISBAJUD", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 12500, qtd_resultados: 2 },
    { sistema: "RENAJUD", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 85000, qtd_resultados: 1 },
    { sistema: "SERASA", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 1 },
    { sistema: "INFOJUD", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 0, qtd_resultados: 1 },
    { sistema: "CRI", tipo_consulta: "INFORMACAO", status: "RESPONDIDA", valor_encontrado: 280000, qtd_resultados: 1 },
  ]

  const pendingSearches2 = [
    { sistema: "CNIB", tipo_consulta: "INFORMACAO", status: "SOLICITADA" },
    { sistema: "JUNTA_COMERCIAL", tipo_consulta: "INFORMACAO", status: "SOLICITADA" },
    { sistema: "DETRAN", tipo_consulta: "INFORMACAO", status: "PENDENTE" },
    { sistema: "NEOWAY", tipo_consulta: "INFORMACAO", status: "PENDENTE" },
    { sistema: "CNIS_INSS", tipo_consulta: "INFORMACAO", status: "PENDENTE" },
    { sistema: "CCS_BACEN", tipo_consulta: "INFORMACAO", status: "PENDENTE" },
    { sistema: "OSINT_GOOGLE", tipo_consulta: "INFORMACAO", status: "PENDENTE" },
  ]

  for (const s of completedSearches2) {
    await prisma.assetSearch.create({
      data: {
        investigation_id: inv2.id,
        sistema: s.sistema,
        tipo_consulta: s.tipo_consulta,
        cpf_cnpj_consultado: "987.654.321-00",
        nome_consultado: "Joao Carlos Martins",
        data_consulta: new Date("2026-01-25"),
        data_resposta: new Date("2026-02-01"),
        status: s.status,
        valor_encontrado: s.valor_encontrado,
        qtd_resultados: s.qtd_resultados,
      },
    })
  }

  for (const s of pendingSearches2) {
    await prisma.assetSearch.create({
      data: {
        investigation_id: inv2.id,
        sistema: s.sistema,
        tipo_consulta: s.tipo_consulta,
        cpf_cnpj_consultado: "987.654.321-00",
        nome_consultado: "Joao Carlos Martins",
        data_consulta: new Date("2026-02-10"),
        status: s.status,
      },
    })
  }

  // 3 Assets found for Case 2
  await prisma.assetFound.create({
    data: {
      recovery_case_id: case2.id, investigation_id: inv2.id,
      tipo: "IMOVEL_URBANO", descricao: "Apartamento 301, Ed. Maringa Tower, Centro — Matricula 34.567 CRI Maringa",
      identificador: "Mat. 34.567", localizacao: "Rua Marechal Deodoro, 500, Apto 301, Maringa/PR",
      valor_estimado: 280000, status: "CONFIRMADO", penhoravel: false,
      motivo_impenhoravel: "Possivel bem de familia (unico imovel residencial). Verificar se se enquadra na Lei 8.009/90.",
      titular_nome: "Joao Carlos Martins", titular_cpf_cnpj: "987.654.321-00", titular_relacao: "DEVEDOR",
      fonte: "CRI", data_localizacao: new Date("2026-02-01"),
    },
  })

  await prisma.assetFound.create({
    data: {
      recovery_case_id: case2.id, investigation_id: inv2.id,
      tipo: "VEICULO", descricao: "Fiat Toro Freedom 2020/2021, Prata, Placa GHI-9012",
      identificador: "GHI-9012", localizacao: "Maringa/PR",
      valor_estimado: 85000, status: "CONFIRMADO", penhoravel: true,
      titular_nome: "Joao Carlos Martins", titular_cpf_cnpj: "987.654.321-00", titular_relacao: "DEVEDOR",
      fonte: "RENAJUD", data_localizacao: new Date("2026-01-28"),
    },
  })

  await prisma.assetFound.create({
    data: {
      recovery_case_id: case2.id, investigation_id: inv2.id,
      tipo: "CONTA_BANCARIA", descricao: "Conta corrente Bradesco, Ag 1234, Cc 56789-0 — saldo R$ 12.500",
      identificador: "Bradesco Ag 1234 Cc 56789-0", localizacao: "Maringa/PR",
      valor_estimado: 12500, status: "LOCALIZADO", penhoravel: true,
      titular_nome: "Joao Carlos Martins", titular_cpf_cnpj: "987.654.321-00", titular_relacao: "DEVEDOR",
      fonte: "SISBAJUD", data_localizacao: new Date("2026-01-25"),
    },
  })

  console.log("  Case 2 (REC-2026-002) created.")

  // =========================================================================
  // CASE 3 — PRE_JUDICIAL phase
  // Transportes Rapido Ltda — R$ 320K duplicatas
  // =========================================================================
  const case3 = await prisma.creditRecoveryCase.create({
    data: {
      codigo: "REC-2026-003",
      titulo: "Recuperacao — Transportes Rapido Ltda (Duplicatas)",
      tipo: "EXECUCAO_TITULO_EXTRAJUDICIAL",
      fase: "PRE_JUDICIAL",
      status: "ATIVO",
      prioridade: "MEDIA",
      valor_original: 320000,
      valor_atualizado: 345000,
      valor_total_execucao: 380000,
      valor_recuperado: 0,
      percentual_recuperado: 0,
      titulo_tipo: "DUPLICATA",
      titulo_numero: "DUP-2024-001 a DUP-2024-008",
      titulo_data_vencimento: new Date("2024-08-30"),
      titulo_data_prescricao: new Date("2027-08-30"),
      devedor_nome: "Transportes Rapido Ltda",
      devedor_cpf_cnpj: "45.678.901/0001-23",
      devedor_tipo: "PJ",
      devedor_endereco: "Av. Industrial, 2000, Dist. Industrial, Maringa/PR",
      devedor_telefone: "(44) 3025-0000",
      devedor_atividade: "Transporte rodoviario de cargas",
      score_recuperacao: 55,
      risco_prescricao: "BAIXO",
      risco_insolvencia: "MEDIO",
      data_constituicao: new Date("2024-03-01"),
      data_vencimento: new Date("2024-08-30"),
      data_proxima_acao: new Date("2026-03-10"),
      proxima_acao: "Aguardar prazo de pagamento apos protesto. Se nao pagar, distribuir execucao.",
      responsavel_id: userId,
      observacoes: "8 duplicatas mercantis protestadas em 3 cartorios (Maringa, Londrina e Curitiba). Negativacao Serasa e SPC concluida. Aguardando retorno do devedor.",
    },
  })

  // Collection actions for Case 3 — Protests and negativations
  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case3.id,
      tipo: "PROTESTO", categoria: "EXTRAJUDICIAL",
      descricao: "Protesto de 3 duplicatas no 2o Tabelionato de Protesto de Maringa/PR.",
      data_acao: new Date("2025-12-01"), status: "CUMPRIDA",
      resultado: "Duplicatas protestadas. Devedor intimado e nao pagou.",
      valor_envolvido: 120000,
      protesto_cartorio: "2o Tabelionato de Protesto de Maringa/PR",
      protesto_protocolo: "2025/012345",
      protesto_data_intimacao: new Date("2025-12-10"),
      protesto_data_lavratura: new Date("2025-12-20"),
      protesto_pago: false,
      responsavel_id: userId,
    },
  })

  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case3.id,
      tipo: "PROTESTO", categoria: "EXTRAJUDICIAL",
      descricao: "Protesto de 3 duplicatas no 1o Tabelionato de Protesto de Londrina/PR.",
      data_acao: new Date("2025-12-01"), status: "CUMPRIDA",
      resultado: "Duplicatas protestadas em Londrina.",
      valor_envolvido: 120000,
      protesto_cartorio: "1o Tabelionato de Protesto de Londrina/PR",
      protesto_protocolo: "2025/067890",
      protesto_data_lavratura: new Date("2025-12-22"),
      protesto_pago: false,
      responsavel_id: userId,
    },
  })

  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case3.id,
      tipo: "NEGATIVACAO", categoria: "EXTRAJUDICIAL",
      descricao: "Inclusao do devedor na Serasa e SPC Brasil.",
      data_acao: new Date("2025-12-15"), status: "CUMPRIDA",
      resultado: "Devedor negativado com sucesso.",
      valor_envolvido: 345000,
      negativacao_bureau: "SERASA / SPC",
      negativacao_protocolo: "NEG-2025-003",
      negativacao_data_inclusao: new Date("2025-12-15"),
      responsavel_id: userId,
    },
  })

  console.log("  Case 3 (REC-2026-003) created.")

  // =========================================================================
  // CASE 4 — ACORDO phase
  // Construtora ABC Ltda — R$ 1.5M, acordo em 24 parcelas
  // =========================================================================
  const case4 = await prisma.creditRecoveryCase.create({
    data: {
      codigo: "REC-2026-004",
      titulo: "Recuperacao — Construtora ABC Ltda (Acordo Parcelado)",
      tipo: "CUMPRIMENTO_SENTENCA",
      fase: "ACORDO",
      status: "ACORDO_PARCIAL",
      prioridade: "MEDIA",
      valor_original: 1500000,
      valor_atualizado: 1650000,
      valor_total_execucao: 1800000,
      valor_recuperado: 687500,
      percentual_recuperado: 38.19,
      titulo_tipo: "SENTENCA",
      titulo_numero: "0005678-90.2023.8.16.0014",
      devedor_nome: "Construtora ABC Ltda",
      devedor_cpf_cnpj: "56.789.012/0001-34",
      devedor_tipo: "PJ",
      devedor_atividade: "Construcao civil",
      score_recuperacao: 85,
      risco_prescricao: "BAIXO",
      data_acordo: new Date("2024-08-01"),
      data_proxima_acao: new Date("2026-03-01"),
      proxima_acao: "Verificar pagamento da 16a parcela (vencimento 01/03/2026)",
      responsavel_id: userId,
      observacoes: "Acordo formalizado em R$ 1.100.000 (desconto de 26,7%) em 24 parcelas de R$ 45.833,33. 15 parcelas pagas pontualmente.",
    },
  })

  // Agreement for Case 4
  const agreement4 = await prisma.recoveryAgreement.create({
    data: {
      recovery_case_id: case4.id,
      tipo: "PARCELAMENTO",
      status: "EM_CUMPRIMENTO",
      valor_divida_original: 1650000,
      valor_acordo: 1100000,
      desconto_percentual: 26.7,
      entrada: 0,
      parcelas: 24,
      valor_parcela: 45833.33,
      taxa_juros_mensal: 0,
      dia_vencimento: 1,
      parcelas_pagas: 15,
      valor_pago_total: 687500,
      parcelas_atraso: 0,
      data_ultima_parcela: new Date("2026-02-01"),
      proxima_parcela: new Date("2026-03-01"),
      data_proposta: new Date("2024-07-15"),
      data_formalizacao: new Date("2024-08-01"),
      data_inicio_pagamento: new Date("2024-09-01"),
      clausulas_especiais: "Em caso de atraso superior a 15 dias em qualquer parcela, o saldo devedor sera atualizado ao valor original com juros e multa, e a execucao prosseguira pelo saldo remanescente.",
      responsavel_id: userId,
    },
  })

  // 24 installments for Case 4 (15 paid, 9 pending)
  for (let i = 1; i <= 24; i++) {
    const vencimento = new Date("2024-09-01")
    vencimento.setMonth(vencimento.getMonth() + (i - 1))

    const isPaid = i <= 15
    const pagamento = isPaid ? new Date(vencimento) : undefined

    await prisma.agreementInstallment.create({
      data: {
        agreement_id: agreement4.id,
        numero: i,
        valor: 45833.33,
        data_vencimento: vencimento,
        data_pagamento: pagamento,
        valor_pago: isPaid ? 45833.33 : undefined,
        status: isPaid ? "PAGA" : (vencimento < new Date() ? "ATRASADA" : "PENDENTE"),
      },
    })
  }

  console.log("  Case 4 (REC-2026-004) created with agreement and installments.")

  // =========================================================================
  // CASE 5 — EXPROPRIACAO phase
  // Maria Souza (PF) — R$ 420K, leilao agendado
  // =========================================================================
  const case5 = await prisma.creditRecoveryCase.create({
    data: {
      codigo: "REC-2026-005",
      titulo: "Recuperacao — Maria Aparecida de Souza (Imovel em Leilao)",
      tipo: "EXECUCAO_TITULO_EXTRAJUDICIAL",
      fase: "EXPROPRIACAO",
      status: "ATIVO",
      prioridade: "ALTA",
      valor_original: 420000,
      valor_atualizado: 465000,
      valor_total_execucao: 520000,
      valor_recuperado: 0,
      valor_penhorado: 600000,
      percentual_recuperado: 0,
      titulo_tipo: "NOTA_PROMISSORIA",
      titulo_numero: "NP-2022-001",
      titulo_data_vencimento: new Date("2023-03-01"),
      titulo_data_prescricao: new Date("2026-03-01"),
      devedor_nome: "Maria Aparecida de Souza",
      devedor_cpf_cnpj: "456.789.012-34",
      devedor_tipo: "PF",
      devedor_atividade: "Aposentada",
      score_recuperacao: 78,
      risco_prescricao: "CRITICO",
      risco_insolvencia: "BAIXO",
      estrategia_ia: "Imovel penhorado avaliado em R$ 600K cobre o debito de R$ 520K. Leilao e a melhor opcao. Atentar para prescricao iminente (mar/2026). Possivel acordo pre-leilao com desconto de 15-20% para evitar custos do leilao.",
      data_constituicao: new Date("2022-06-01"),
      data_vencimento: new Date("2023-03-01"),
      data_distribuicao: new Date("2023-09-15"),
      data_citacao: new Date("2023-11-20"),
      data_penhora: new Date("2025-03-10"),
      data_proxima_acao: new Date("2026-03-20"),
      proxima_acao: "Leilao 1a praca agendado para 20/03/2026",
      responsavel_id: userId,
      observacoes: "ATENCAO: Prescricao iminente em marco/2026. Leilao ja designado. Devedora tentou acordo com desconto de 60% — rejeitado. Possivel acordo com 20% de desconto se proposto antes do leilao.",
    },
  })

  // Penhora + Asset for Case 5
  const asset5 = await prisma.assetFound.create({
    data: {
      recovery_case_id: case5.id,
      tipo: "IMOVEL_URBANO",
      descricao: "Casa residencial, 250m2 construidos, terreno 500m2, Jd. Alvorada, Maringa/PR — Mat. 56.789",
      identificador: "Mat. 56.789",
      localizacao: "Rua das Flores, 100, Jd. Alvorada, Maringa/PR",
      valor_estimado: 600000,
      valor_avaliacao: 600000,
      status: "PENHORADO",
      penhoravel: true,
      titular_nome: "Maria Aparecida de Souza",
      titular_cpf_cnpj: "456.789.012-34",
      titular_relacao: "DEVEDOR",
      fonte: "CRI",
      data_localizacao: new Date("2024-06-15"),
      data_penhora: new Date("2025-03-10"),
      data_avaliacao: new Date("2025-06-01"),
      observacoes: "Nao e bem de familia — devedora possui outro imovel residencial.",
    },
  })

  await prisma.penhora.create({
    data: {
      recovery_case_id: case5.id,
      asset_id: asset5.id,
      tipo: "IMOVEL",
      status: "EFETIVADA",
      valor_solicitado: 600000,
      valor_efetivado: 600000,
      avaliacao_valor: 600000,
      avaliacao_data: new Date("2025-06-01"),
      avaliacao_por: "Perito judicial Eng. Roberto Almeida",
      data_solicitacao: new Date("2025-01-15"),
      data_efetivacao: new Date("2025-03-10"),
      data_intimacao_devedor: new Date("2025-03-20"),
      numero_processo: "0002345-67.2023.8.16.0014",
      observacoes: "Imovel penhorado e avaliado. Leilao 1a praca designado para 20/03/2026.",
    },
  })

  // Leilao action for Case 5
  await prisma.collectionAction.create({
    data: {
      recovery_case_id: case5.id,
      tipo: "LEILAO",
      categoria: "JUDICIAL_EXECUCAO",
      descricao: "Leilao judicial do imovel penhorado — 1a praca em 20/03/2026 e 2a praca em 03/04/2026.",
      data_acao: new Date("2026-01-15"),
      data_prazo: new Date("2026-03-20"),
      status: "EM_EXECUCAO",
      valor_envolvido: 600000,
      leilao_leiloeiro: "Leiloeiro Oficial Antonio Carlos, matricula JUCEP 1234",
      leilao_data_1praca: new Date("2026-03-20"),
      leilao_data_2praca: new Date("2026-04-03"),
      leilao_valor_minimo: 480000,
      responsavel_id: userId,
      observacoes: "Leilao eletronico via plataforma www.leiloesjudiciais.com.br. Valor minimo 1a praca: avaliacao (R$ 600K). Valor minimo 2a praca: 80% (R$ 480K).",
    },
  })

  console.log("  Case 5 (REC-2026-005) created.")

  // =========================================================================
  // CASE 6 — ENCERRADO (frustrado) com IDPJ
  // PJ encerrada — R$ 3.2M, socios incluidos
  // =========================================================================
  const case6 = await prisma.creditRecoveryCase.create({
    data: {
      codigo: "REC-2026-006",
      titulo: "Recuperacao — Comercial Estrela do Norte Ltda (IDPJ — Socios)",
      tipo: "EXECUCAO_TITULO_EXTRAJUDICIAL",
      fase: "ENCERRADO",
      status: "FRUSTRADO",
      prioridade: "BAIXA",
      valor_original: 3200000,
      valor_atualizado: 3800000,
      valor_total_execucao: 4200000,
      valor_recuperado: 85000,
      valor_bloqueado: 0,
      valor_penhorado: 0,
      percentual_recuperado: 2.02,
      titulo_tipo: "DUPLICATA",
      titulo_numero: "DUP-2021-001 a DUP-2021-025",
      titulo_data_vencimento: new Date("2022-03-30"),
      titulo_data_prescricao: new Date("2025-03-30"),
      devedor_nome: "Comercial Estrela do Norte Ltda",
      devedor_cpf_cnpj: "78.901.234/0001-56",
      devedor_tipo: "PJ",
      devedor_atividade: "Comercio atacadista (CNPJ baixado na Receita Federal)",
      score_recuperacao: 25,
      score_fatores: {
        titulo_executivo: { score: 70, peso: 20, justificativa: "Duplicatas aceitas, titulo valido mas prescricao ja consumada para a PJ" },
        patrimonio_devedor: { score: 5, peso: 25, justificativa: "PJ encerrada, sem patrimonio. Socios com patrimonio limitado e possivel ocultacao." },
        perfil_devedor: { score: 10, peso: 15, justificativa: "PJ fantasma/encerrada. Socios com indicios de confusao patrimonial." },
        risco_processual: { score: 30, peso: 15, justificativa: "IDPJ deferido, mas execucao contra socios e mais complexa e morosa." },
        historico_pagamento: { score: 15, peso: 10, justificativa: "Apenas R$ 85K recuperados via bloqueio de conta do socio." },
        tempo_credito: { score: 20, peso: 15, justificativa: "Credito antigo, prescricao da PJ ja consumada. Depende do IDPJ." },
      },
      risco_prescricao: "CONSUMADO",
      risco_insolvencia: "ALTISSIMO",
      estrategia_ia: "Caso extremamente dificil. PJ encerrada e sem patrimonio. IDPJ deferido mas socios tambem com patrimonio limitado. Recomenda-se classificar como perda provavel e provisionar integralmente. Manter monitoramento basico dos socios para eventual localizacao de bens.",
      data_constituicao: new Date("2021-01-15"),
      data_vencimento: new Date("2022-03-30"),
      data_distribuicao: new Date("2022-06-01"),
      data_citacao: new Date("2022-08-15"),
      data_encerramento: new Date("2025-12-01"),
      responsavel_id: userId,
      observacoes: "Caso frustrado. PJ encerrada/fantasma. IDPJ deferido, socios Marcos Vieira e Antonio Gomes incluidos no polo passivo. Patrimonio dos socios limitado — apenas R$ 85K recuperados via SISBAJUD do socio Marcos. Monitoramento ativo dos socios.",
    },
  })

  // IDPJ incident for Case 6
  await prisma.desconsideracaoIncident.create({
    data: {
      recovery_case_id: case6.id,
      tipo: "DIRETA",
      teoria: "MAIOR_CC50",
      status: "DEFERIDO",
      fundamento_legal: "Art. 50 do Codigo Civil c/c art. 133-137 do CPC. Confusao patrimonial entre a PJ e seus socios, alem de desvio de finalidade (empresa operou como fachada).",
      hipotese: "CONFUSAO_PATRIMONIAL",
      evidencias: [
        "Pagamentos pessoais dos socios feitos pela conta da PJ",
        "Imovel residencial do socio registrado em nome da PJ",
        "PJ encerrada irregularmente sem baixa formal",
        "Mesmo endereco da PJ e residencia do socio Marcos Vieira",
      ],
      confusao_patrimonial: {
        pagamentos_pessoais: true,
        imovel_registrado_pj: true,
        carro_pj_uso_pessoal: true,
        mesmo_endereco: true,
      },
      alvos: [
        { nome: "Marcos Vieira da Silva", cpf: "111.222.333-44", qualidade: "Socio administrador", patrimonio_est: 150000 },
        { nome: "Antonio Gomes Neto", cpf: "555.666.777-88", qualidade: "Socio", patrimonio_est: 50000 },
      ],
      valor_alcancado: 85000,
      decisao_resumo: "IDPJ deferido pela 3a Vara Civel de Maringa. Socios incluidos no polo passivo. Determinada pesquisa patrimonial dos socios.",
      data_decisao: new Date("2024-06-15"),
      data_peticao: new Date("2024-03-01"),
      data_citacao_alvos: new Date("2024-07-20"),
      data_resposta: new Date("2024-08-20"),
      prazo_resposta: new Date("2024-08-20"),
      numero_incidente: "IDP-0003456-78.2024.8.16.0014",
    },
  })

  // Joint debtors for Case 6
  await prisma.jointDebtor.create({
    data: {
      recovery_case_id: case6.id,
      nome: "Marcos Vieira da Silva",
      cpf_cnpj: "111.222.333-44",
      tipo_responsabilidade: "ADMINISTRADOR",
      fundamentacao: "Socio administrador incluido via IDPJ (art. 50, CC). Confusao patrimonial comprovada.",
      patrimonio_estimado: 150000,
      status: "EXECUTANDO",
    },
  })

  await prisma.jointDebtor.create({
    data: {
      recovery_case_id: case6.id,
      nome: "Antonio Gomes Neto",
      cpf_cnpj: "555.666.777-88",
      tipo_responsabilidade: "SOCIO",
      fundamentacao: "Socio incluido via IDPJ. Patrimonio limitado.",
      patrimonio_estimado: 50000,
      status: "INSOLVENTE",
    },
  })

  // Events for Case 6
  const events6 = [
    { data: new Date("2022-06-01"), tipo: "NOTA", descricao: "Execucao distribuida contra Comercial Estrela do Norte Ltda. 25 duplicatas totalizando R$ 3,2M." },
    { data: new Date("2023-01-15"), tipo: "DECISAO", descricao: "Tentativa de citacao frustrada. Empresa nao encontrada no endereco cadastrado. AR devolvido." },
    { data: new Date("2024-03-01"), tipo: "PETICAO", descricao: "Requerido Incidente de Desconsideracao da Personalidade Juridica (IDPJ) com base no art. 50 do CC." },
    { data: new Date("2024-06-15"), tipo: "DECISAO", descricao: "IDPJ DEFERIDO. Juiz reconheceu confusao patrimonial. Socios Marcos Vieira e Antonio Gomes incluidos no polo passivo." },
    { data: new Date("2024-09-01"), tipo: "DECISAO", descricao: "SISBAJUD: Bloqueio de R$ 85.000 em conta do socio Marcos Vieira. Demais buscas frustradas." },
    { data: new Date("2025-12-01"), tipo: "MUDANCA_FASE", descricao: "Caso classificado como frustrado. PJ encerrada, socios sem patrimonio expressivo. Provisionamento integral recomendado." },
  ]

  for (const e of events6) {
    await prisma.recoveryEvent.create({
      data: {
        recovery_case_id: case6.id,
        data: e.data,
        tipo: e.tipo,
        descricao: e.descricao,
        responsavel_id: userId,
      },
    })
  }

  // Monitoring for Case 6 socios
  const mon6 = await prisma.debtorMonitoring.create({
    data: {
      recovery_case_id: case6.id,
      tipo: "PATRIMONIO",
      fonte: "NEOWAY",
      ativo: true,
      frequencia: "MENSAL",
      ultima_verificacao: new Date("2026-02-01"),
      ultimo_resultado: { alteracoes: 0, socios_monitorados: ["Marcos Vieira da Silva", "Antonio Gomes Neto"] },
      alertas_pendentes: 0,
      configuracao: { monitorar_socios: true, cpfs: ["111.222.333-44", "555.666.777-88"] },
    },
  })

  await prisma.monitoringAlert.create({
    data: {
      monitoring_id: mon6.id,
      tipo: "ESTILO_VIDA",
      severidade: "MEDIA",
      titulo: "Socio Marcos Vieira adquiriu veiculo novo",
      descricao: "Monitoramento OSINT identificou que o socio Marcos Vieira publicou foto de veiculo BMW X3 2025 em rede social. Verificar se esta em nome proprio ou de terceiro.",
      dados: { fonte: "Instagram", data_postagem: "2026-01-20", veiculo: "BMW X3 2025" },
      lido: true,
      acao_tomada: "Consulta RENAJUD agendada para verificar titularidade do veiculo.",
      data_acao: new Date("2026-02-05"),
    },
  })

  console.log("  Case 6 (REC-2026-006) created with IDPJ and joint debtors.")

  console.log("Recovery seed data completed successfully! 6 cases created.")
}

// ---------------------------------------------------------------------------
// Standalone execution
// ---------------------------------------------------------------------------
if (require.main === module) {
  const prisma = new PrismaClient()
  seedRecoveryData(prisma)
    .then(() => {
      console.log("Done!")
      return prisma.$disconnect()
    })
    .catch((e) => {
      console.error("Seed failed:", e)
      return prisma.$disconnect().then(() => process.exit(1))
    })
}
