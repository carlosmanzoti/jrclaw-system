import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("📅 Seeding court calendars and deadline catalog...");

  // Clean existing data
  await prisma.courtHoliday.deleteMany();
  await prisma.courtSuspension.deleteMany();
  await prisma.courtCalendar.deleteMany();
  await prisma.deadlineCatalog.deleteMany();

  console.log("🗑️  Cleaned existing deadline module data");

  // ============================================================
  // 1. COURT CALENDARS 2026
  // ============================================================
  const calendars = [
    { tribunal_codigo: "STF", tribunal_nome: "Supremo Tribunal Federal", tribunal_tipo: "STF", uf: null },
    { tribunal_codigo: "STJ", tribunal_nome: "Superior Tribunal de Justiça", tribunal_tipo: "STJ", uf: null },
    { tribunal_codigo: "TST", tribunal_nome: "Tribunal Superior do Trabalho", tribunal_tipo: "TST", uf: null },
    { tribunal_codigo: "TSE", tribunal_nome: "Tribunal Superior Eleitoral", tribunal_tipo: "TSE", uf: null },
    { tribunal_codigo: "STM", tribunal_nome: "Superior Tribunal Militar", tribunal_tipo: "STM", uf: null },
    { tribunal_codigo: "TJPR", tribunal_nome: "Tribunal de Justiça do Paraná", tribunal_tipo: "TJ", uf: "PR" },
    { tribunal_codigo: "TJMA", tribunal_nome: "Tribunal de Justiça do Maranhão", tribunal_tipo: "TJ", uf: "MA" },
    { tribunal_codigo: "TJSP", tribunal_nome: "Tribunal de Justiça de São Paulo", tribunal_tipo: "TJ", uf: "SP" },
    { tribunal_codigo: "TRF4", tribunal_nome: "Tribunal Regional Federal da 4ª Região", tribunal_tipo: "TRF", uf: "PR" },
    { tribunal_codigo: "TRF1", tribunal_nome: "Tribunal Regional Federal da 1ª Região", tribunal_tipo: "TRF", uf: "MA" },
    { tribunal_codigo: "TRT9", tribunal_nome: "Tribunal Regional do Trabalho da 9ª Região", tribunal_tipo: "TRT", uf: "PR" },
    { tribunal_codigo: "TRT16", tribunal_nome: "Tribunal Regional do Trabalho da 16ª Região", tribunal_tipo: "TRT", uf: "MA" },
  ];

  const calendarMap: Record<string, string> = {};
  for (const c of calendars) {
    const created = await prisma.courtCalendar.create({
      data: {
        tribunal_codigo: c.tribunal_codigo,
        tribunal_nome: c.tribunal_nome,
        tribunal_tipo: c.tribunal_tipo,
        uf: c.uf,
        ano: 2026,
        atualizado_em: new Date(),
        atualizado_por: "seed",
      },
    });
    calendarMap[c.tribunal_codigo] = created.id;
  }

  console.log(`⚖️  Created ${calendars.length} court calendars`);

  // ============================================================
  // 2. COURT SUSPENSIONS (RECESSES)
  // ============================================================
  const suspensions: Array<{
    calendar_id: string;
    tipo: string;
    data_inicio: Date;
    data_fim: Date;
    suspende_prazos: boolean;
    suspende_audiencias: boolean;
    suspende_sessoes: boolean;
    plantao_disponivel: boolean;
    nome: string;
    fundamento_legal?: string;
  }> = [];

  // Dec-Jan recess for ALL courts (CPC Art. 220)
  for (const code of Object.keys(calendarMap)) {
    // 2025-12-20 to 2026-01-20
    suspensions.push({
      calendar_id: calendarMap[code],
      tipo: "RECESSO_DEZ_JAN",
      data_inicio: new Date(2025, 11, 20),
      data_fim: new Date(2026, 0, 20),
      suspende_prazos: true,
      suspende_audiencias: true,
      suspende_sessoes: true,
      plantao_disponivel: true,
      nome: "Recesso Forense Dez/2025-Jan/2026",
      fundamento_legal: "Art. 220 CPC",
    });
    // 2026-12-20 to 2027-01-20
    suspensions.push({
      calendar_id: calendarMap[code],
      tipo: "RECESSO_DEZ_JAN",
      data_inicio: new Date(2026, 11, 20),
      data_fim: new Date(2027, 0, 20),
      suspende_prazos: true,
      suspende_audiencias: true,
      suspende_sessoes: true,
      plantao_disponivel: true,
      nome: "Recesso Forense Dez/2026-Jan/2027",
      fundamento_legal: "Art. 220 CPC",
    });
  }

  // July recess for STF, STJ, TST
  for (const code of ["STF", "STJ", "TST"]) {
    suspensions.push({
      calendar_id: calendarMap[code],
      tipo: "FERIAS_JULHO",
      data_inicio: new Date(2026, 6, 2),
      data_fim: new Date(2026, 6, 31),
      suspende_prazos: true,
      suspende_audiencias: true,
      suspende_sessoes: true,
      plantao_disponivel: true,
      nome: "Férias Coletivas Julho/2026",
      fundamento_legal: "RISTF/RISTJ/RITST",
    });
  }

  for (const s of suspensions) {
    await prisma.courtSuspension.create({ data: s as never });
  }

  console.log(`🔒 Created ${suspensions.length} court suspensions`);

  // ============================================================
  // 3. COURT HOLIDAYS (Forense-specific)
  // ============================================================
  const holidays: Array<{
    calendar_id: string;
    data: Date;
    nome: string;
    tipo: string;
    uf?: string;
    suspende_expediente: boolean;
    prazos_prorrogados: boolean;
    fundamento_legal?: string;
  }> = [];

  // Dia da Justiça (Dec 8) - all courts
  for (const code of Object.keys(calendarMap)) {
    holidays.push({
      calendar_id: calendarMap[code],
      data: new Date(2026, 11, 8),
      nome: "Dia da Justiça",
      tipo: "FORENSE",
      suspende_expediente: true,
      prazos_prorrogados: true,
      fundamento_legal: "Lei 5.010/66",
    });
  }

  // Dia do Advogado (Aug 11) - ponto facultativo
  for (const code of Object.keys(calendarMap)) {
    holidays.push({
      calendar_id: calendarMap[code],
      data: new Date(2026, 7, 11),
      nome: "Dia do Advogado",
      tipo: "PONTO_FACULTATIVO",
      suspende_expediente: false,
      prazos_prorrogados: false,
    });
  }

  // Dia do Funcionário Público (Oct 28) - ponto facultativo
  for (const code of Object.keys(calendarMap)) {
    holidays.push({
      calendar_id: calendarMap[code],
      data: new Date(2026, 9, 28),
      nome: "Dia do Funcionário Público",
      tipo: "PONTO_FACULTATIVO",
      suspende_expediente: false,
      prazos_prorrogados: false,
    });
  }

  // TJ-PR specific: Emancipação do Paraná (Dec 19)
  holidays.push({
    calendar_id: calendarMap["TJPR"],
    data: new Date(2026, 11, 19),
    nome: "Emancipação Política do Paraná",
    tipo: "ESTADUAL",
    uf: "PR",
    suspende_expediente: true,
    prazos_prorrogados: true,
  });

  // TJ-MA specific: Adesão do Maranhão (Jul 28)
  holidays.push({
    calendar_id: calendarMap["TJMA"],
    data: new Date(2026, 6, 28),
    nome: "Adesão do Maranhão à Independência",
    tipo: "ESTADUAL",
    uf: "MA",
    suspende_expediente: true,
    prazos_prorrogados: true,
  });

  // TJ-SP: Revolução Constitucionalista (Jul 9)
  holidays.push({
    calendar_id: calendarMap["TJSP"],
    data: new Date(2026, 6, 9),
    nome: "Revolução Constitucionalista",
    tipo: "ESTADUAL",
    uf: "SP",
    suspende_expediente: true,
    prazos_prorrogados: true,
  });

  // TJ-SP: Aniversário de São Paulo (Jan 25)
  holidays.push({
    calendar_id: calendarMap["TJSP"],
    data: new Date(2026, 0, 25),
    nome: "Aniversário de São Paulo",
    tipo: "ESTADUAL",
    uf: "SP",
    suspende_expediente: true,
    prazos_prorrogados: true,
  });

  for (const h of holidays) {
    await prisma.courtHoliday.create({ data: h as never });
  }

  console.log(`📅 Created ${holidays.length} court-specific holidays`);

  // ============================================================
  // 4. DEADLINE CATALOG (63 entries)
  // ============================================================
  const catalog = [
    // ── CPC GERAL (Prazos das Partes) ──
    { codigo: "CPC-001", nome: "Contestação", descricao: "Prazo para apresentação de contestação pelo réu.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 335", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Revelia — presunção de veracidade dos fatos alegados pelo autor", termo_inicial: "Da juntada do mandado de citação ou AR cumprido" },
    { codigo: "CPC-002", nome: "Réplica", descricao: "Prazo para réplica do autor às preliminares e fatos novos na contestação.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Art. 351", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — perda do direito de se manifestar", termo_inicial: "Da intimação da juntada da contestação" },
    { codigo: "CPC-003", nome: "Reconvenção", descricao: "Prazo para apresentação de reconvenção pelo réu.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 343", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão consumativa", termo_inicial: "Da juntada do mandado de citação (apresentada na contestação)" },
    { codigo: "CPC-004", nome: "Embargos à Execução", descricao: "Prazo para o executado opor embargos à execução.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 915", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — execução prossegue sem defesa", termo_inicial: "Da juntada do mandado de citação, penhora ou depósito" },
    { codigo: "CPC-005", nome: "Impugnação ao Cumprimento de Sentença", descricao: "Prazo para impugnar o cumprimento de sentença.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 525", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — cumprimento prossegue", termo_inicial: "Da intimação para pagamento (após transcurso do prazo de 15 dias do Art. 523)" },
    { codigo: "CPC-006", nome: "Manifestação sobre Documentos", descricao: "Prazo para manifestação sobre documentos juntados pela parte contrária.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Art. 437", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — presunção de aceitação dos documentos", termo_inicial: "Da intimação da juntada dos documentos" },
    { codigo: "CPC-007", nome: "Manifestação sobre Laudo Pericial", descricao: "Prazo para as partes se manifestarem sobre o laudo pericial.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Art. 477 §1º", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão", termo_inicial: "Da intimação da juntada do laudo" },
    { codigo: "CPC-008", nome: "Quesitos Complementares", descricao: "Prazo para apresentação de quesitos complementares ao perito.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Art. 469", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão", termo_inicial: "Da intimação da decisão que deferiu a perícia" },
    { codigo: "CPC-009", nome: "Indicação de Assistente Técnico", descricao: "Prazo para indicação de assistente técnico e apresentação de quesitos.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Art. 465 §1º", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — perda do direito de indicar assistente", termo_inicial: "Da intimação da decisão de nomeação do perito" },

    // ── CPC RECURSOS ──
    { codigo: "CPC-010", nome: "Apelação", descricao: "Prazo para interposição de recurso de apelação.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.003", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Trânsito em julgado da sentença", termo_inicial: "Da intimação da sentença" },
    { codigo: "CPC-011", nome: "Contrarrazões de Apelação", descricao: "Prazo para apresentação de contrarrazões de apelação.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.010 §1º", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — apelação julgada sem contrarrazões", termo_inicial: "Da intimação da interposição da apelação" },
    { codigo: "CPC-012", nome: "Agravo de Instrumento", descricao: "Prazo para interposição de agravo de instrumento.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.015", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — decisão se torna irrecorrível por esta via", termo_inicial: "Da intimação da decisão interlocutória" },
    { codigo: "CPC-013", nome: "Contrarrazões de Agravo", descricao: "Prazo para contrarrazões de agravo de instrumento.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.019 §2º", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Agravo julgado sem contrarrazões", termo_inicial: "Da intimação para contraminutar" },
    { codigo: "CPC-014", nome: "Agravo Interno", descricao: "Prazo para interposição de agravo interno.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.021", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — decisão monocrática se torna definitiva", termo_inicial: "Da intimação da decisão monocrática do relator" },
    { codigo: "CPC-015", nome: "Embargos de Declaração", descricao: "Prazo para oposição de embargos de declaração.", dias: 5, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.023", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão — vícios permanecem", termo_inicial: "Da intimação da decisão, sentença ou acórdão" },
    { codigo: "CPC-016", nome: "Recurso Especial", descricao: "Prazo para interposição de recurso especial ao STJ.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.029", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Trânsito em julgado do acórdão", termo_inicial: "Da intimação do acórdão" },
    { codigo: "CPC-017", nome: "Contrarrazões de REsp", descricao: "Prazo para contrarrazões de recurso especial.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.030", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "REsp julgado sem contrarrazões", termo_inicial: "Da intimação da interposição do REsp" },
    { codigo: "CPC-018", nome: "Recurso Extraordinário", descricao: "Prazo para interposição de recurso extraordinário ao STF.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.029", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Trânsito em julgado do acórdão", termo_inicial: "Da intimação do acórdão" },
    { codigo: "CPC-019", nome: "Recurso Ordinário", descricao: "Prazo para interposição de recurso ordinário.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.027", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Trânsito em julgado", termo_inicial: "Da intimação do acórdão" },
    { codigo: "CPC-020", nome: "Embargos de Divergência", descricao: "Prazo para embargos de divergência em REsp ou RE.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.043", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Trânsito em julgado", termo_inicial: "Da intimação do acórdão divergente" },
    { codigo: "CPC-021", nome: "Agravo em REsp/RE", descricao: "Prazo para agravo contra inadmissão de REsp ou RE.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 1.042", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Trânsito em julgado", termo_inicial: "Da intimação da decisão de inadmissão" },

    // ── CPC EXECUÇÃO ──
    { codigo: "CPC-022", nome: "Pagamento Voluntário (Cumprimento)", descricao: "Prazo para pagamento voluntário no cumprimento de sentença.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 523", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Multa de 10% + honorários de 10%", termo_inicial: "Da intimação para cumprimento espontâneo" },
    { codigo: "CPC-023", nome: "Nomeação de Bens à Penhora", descricao: "Prazo para indicação de bens passíveis de penhora.", dias: 5, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Art. 829 §1º", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Penhora online (BACENJUD/RENAJUD)", termo_inicial: "Da citação na execução" },
    { codigo: "CPC-024", nome: "Embargos de Terceiro", descricao: "Prazo para oposição de embargos de terceiro.", dias: 5, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 675", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Preclusão", termo_inicial: "Da turbação ou esbulho, até 5 dias após adjudicação, alienação ou arrematação" },

    // ── CPC PRAZOS DO JUIZ ──
    { codigo: "CPC-025", nome: "Despacho de Mero Expediente", descricao: "Prazo para juiz proferir despachos de mero expediente.", dias: 5, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "IMPROPRIO", categoria: "JUIZ", artigo: "Art. 226 I", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Sanção administrativa (prazo impróprio)", termo_inicial: "Da data em que os autos foram conclusos" },
    { codigo: "CPC-026", nome: "Decisão Interlocutória", descricao: "Prazo para juiz proferir decisões interlocutórias.", dias: 10, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "IMPROPRIO", categoria: "JUIZ", artigo: "Art. 226 II", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Sanção administrativa (prazo impróprio)", termo_inicial: "Da data em que os autos foram conclusos" },
    { codigo: "CPC-027", nome: "Sentença", descricao: "Prazo para juiz proferir sentença.", dias: 30, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "IMPROPRIO", categoria: "JUIZ", artigo: "Art. 226 III", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Sanção administrativa (prazo impróprio)", termo_inicial: "Da data em que os autos foram conclusos após audiência ou memoriais" },

    // ── CPC PRAZOS DO MP ──
    { codigo: "CPC-028", nome: "Manifestação do MP como Fiscal da Lei", descricao: "Prazo para o MP se manifestar como custos legis.", dias: 30, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "MP", artigo: "Art. 178 c/c 180", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Prazo impróprio — MP já tem prazo em dobro por força do Art. 180", termo_inicial: "Da intimação pessoal do membro do MP" },

    // ── CPC PRAZOS PERICIAIS ──
    { codigo: "CPC-029", nome: "Entrega do Laudo Pericial", descricao: "Prazo para o perito entregar o laudo.", dias: 20, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PERITO", artigo: "Art. 477", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Substituição do perito + multa", termo_inicial: "Da data fixada pelo juiz (mínimo 20 dias antes da audiência)" },
    { codigo: "CPC-030", nome: "Esclarecimentos do Perito", descricao: "Prazo para o perito prestar esclarecimentos sobre o laudo.", dias: 15, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PERITO", artigo: "Art. 477 §2º", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Substituição do perito", termo_inicial: "Da intimação do perito" },

    // ── LEI 11.101 — RECUPERAÇÃO JUDICIAL (dias CORRIDOS) ──
    { codigo: "RJ-001", nome: "Apresentação do Plano de RJ", descricao: "Prazo para o devedor apresentar o plano de recuperação judicial.", dias: 60, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 53", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Convolação em falência", termo_inicial: "Da publicação do despacho de processamento da recuperação judicial" },
    { codigo: "RJ-002", nome: "Habilitação de Créditos", descricao: "Prazo para credores habilitarem seus créditos.", dias: 15, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 7 §1º", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Habilitação retardatária (sem direito a voto na AGC)", termo_inicial: "Da publicação do edital do Art. 7 §2º" },
    { codigo: "RJ-003", nome: "Impugnação de Créditos", descricao: "Prazo para impugnar créditos constantes na relação de credores.", dias: 10, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 8", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Preclusão — crédito mantido como habilitado", termo_inicial: "Da publicação da relação de credores pelo AJ" },
    { codigo: "RJ-004", nome: "Objeção ao Plano de RJ", descricao: "Prazo para qualquer credor apresentar objeção ao plano de recuperação.", dias: 30, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 55", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Plano aprovado sem AGC (homologação direta)", termo_inicial: "Da publicação da relação de credores ou da decisão sobre impugnações" },
    { codigo: "RJ-005", nome: "Convocação da AGC", descricao: "Prazo mínimo para convocação da Assembleia Geral de Credores.", dias: 5, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 36 §2º", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Nulidade da assembleia", termo_inicial: "Antes da data designada para a assembleia" },
    { codigo: "RJ-006", nome: "Relatório Mensal do AJ", descricao: "Prazo para o administrador judicial entregar relatório mensal.", dias: 30, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "IMPROPRIO", categoria: "AUXILIAR", artigo: "Art. 22 II-c", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Substituição do AJ", termo_inicial: "Do final de cada mês" },
    { codigo: "RJ-007", nome: "Contestação de Impugnação de Crédito", descricao: "Prazo para o credor contestar impugnação ao seu crédito.", dias: 5, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 11", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Revelia", termo_inicial: "Da intimação da impugnação" },
    { codigo: "RJ-008", nome: "Stay Period", descricao: "Período de suspensão das ações e execuções contra o devedor.", dias: 180, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 6 §4º", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Retomada das ações individuais", termo_inicial: "Da publicação do deferimento do processamento da RJ" },
    { codigo: "RJ-009", nome: "Supervisão Judicial da RJ", descricao: "Período de supervisão judicial após aprovação do plano.", dias: 730, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 61", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Encerramento da RJ ou convolação em falência", termo_inicial: "Da concessão da recuperação judicial" },

    // ── LEI 11.101 — FALÊNCIA ──
    { codigo: "FAL-001", nome: "Contestação de Pedido de Falência", descricao: "Prazo para o devedor contestar pedido de falência.", dias: 10, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 98", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Revelia — falência pode ser decretada", termo_inicial: "Da citação" },
    { codigo: "FAL-002", nome: "Declaração de Crédito na Falência", descricao: "Prazo para credores declararem créditos na falência.", dias: 15, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RJ_ESTATUTARIO", artigo: "Art. 7 §1º", lei: "Lei 11.101/2005", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Habilitação retardatária", termo_inicial: "Da publicação do edital" },

    // ── CLT — TRABALHISTA ──
    { codigo: "CLT-001", nome: "Recurso Ordinário Trabalhista", descricao: "Prazo para interposição de recurso ordinário na Justiça do Trabalho.", dias: 8, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 895", lei: "CLT", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Trânsito em julgado da sentença trabalhista", termo_inicial: "Da publicação da sentença" },
    { codigo: "CLT-002", nome: "Recurso de Revista", descricao: "Prazo para interposição de recurso de revista ao TST.", dias: 8, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 896", lei: "CLT", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Trânsito em julgado do acórdão regional", termo_inicial: "Da publicação do acórdão" },
    { codigo: "CLT-003", nome: "Embargos Trabalhistas (TST)", descricao: "Prazo para embargos no TST.", dias: 8, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 894", lei: "CLT", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Trânsito em julgado", termo_inicial: "Da publicação do acórdão da turma do TST" },
    { codigo: "CLT-004", nome: "Agravo de Petição Trabalhista", descricao: "Prazo para agravo de petição na execução trabalhista.", dias: 8, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 897", lei: "CLT", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Preclusão", termo_inicial: "Da intimação da decisão em execução" },

    // ── TRIBUTÁRIO ──
    { codigo: "CTN-001", nome: "Impugnação de Auto de Infração", descricao: "Prazo para impugnar auto de infração tributária.", dias: 30, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 15", lei: "Decreto 70.235/72", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Lançamento definitivo — inscrição em dívida ativa", termo_inicial: "Da ciência do auto de infração" },
    { codigo: "CTN-002", nome: "Recurso Voluntário ao CARF", descricao: "Prazo para recurso voluntário ao CARF.", dias: 30, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Art. 33", lei: "Decreto 70.235/72", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Decisão de 1ª instância se torna definitiva", termo_inicial: "Da ciência da decisão de 1ª instância" },
    { codigo: "CTN-003", nome: "Embargos à Execução Fiscal", descricao: "Prazo para embargos à execução fiscal.", dias: 30, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 16", lei: "Lei 6.830/80", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Execução prossegue sem defesa", termo_inicial: "Da intimação da penhora" },

    // ── PRAZOS ESPECIAIS ──
    { codigo: "ESP-001", nome: "Mandado de Segurança", descricao: "Prazo decadencial para impetração de mandado de segurança.", dias: 120, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 23", lei: "Lei 12.016/2009", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Decadência do direito", termo_inicial: "Da ciência do ato coator" },
    { codigo: "ESP-002", nome: "Ação Rescisória", descricao: "Prazo decadencial para ajuizamento de ação rescisória.", dias: 730, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "PEREMPTORIO", categoria: "PARTE", artigo: "Art. 975", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Decadência — coisa julgada se torna inatacável", termo_inicial: "Do trânsito em julgado da decisão" },
    { codigo: "ESP-003", nome: "Pedido de Reconsideração", descricao: "Prazo usual para pedido de reconsideração.", dias: 5, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Prática forense", lei: "CPC/2015", admite_dobra: true, admite_litisconsorcio: true, efeito_nao_cumprimento: "Preclusão temporal (não previsto em lei, prazo costumeiro)", termo_inicial: "Da intimação da decisão" },
    { codigo: "ESP-004", nome: "Notificação Extrajudicial — Resposta", descricao: "Prazo usualmente concedido para resposta a notificação extrajudicial.", dias: 15, contagem_tipo: "DIAS_CORRIDOS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Prática extrajudicial", lei: "Costume", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Mora — início de contagem para medidas judiciais", termo_inicial: "Do recebimento da notificação" },
    { codigo: "ESP-005", nome: "Correição Parcial", descricao: "Prazo para ajuizamento de correição parcial.", dias: 5, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "PEREMPTORIO", categoria: "RECURSAL", artigo: "Regimento interno", lei: "RITJ", admite_dobra: true, admite_litisconsorcio: false, efeito_nao_cumprimento: "Preclusão", termo_inicial: "Da ciência do ato impugnado" },
    { codigo: "ESP-006", nome: "Exceção de Pré-executividade", descricao: "Meio de defesa do executado sem necessidade de penhora — sem prazo fixo.", dias: 0, contagem_tipo: "DIAS_UTEIS", tipo_prazo: "DILATATORIO", categoria: "PARTE", artigo: "Construção jurisprudencial", lei: "CPC/2015", admite_dobra: false, admite_litisconsorcio: false, efeito_nao_cumprimento: "Não há prazo peremptório — pode ser apresentada a qualquer tempo", termo_inicial: "A qualquer tempo durante a execução", observacoes: "Admitida pela jurisprudência para matérias de ordem pública cognoscíveis de ofício" },
  ];

  for (const entry of catalog) {
    await prisma.deadlineCatalog.create({
      data: {
        codigo: entry.codigo,
        nome: entry.nome,
        descricao: entry.descricao,
        dias: entry.dias,
        contagem_tipo: entry.contagem_tipo,
        tipo_prazo: entry.tipo_prazo,
        categoria: entry.categoria,
        artigo: entry.artigo,
        lei: entry.lei,
        admite_dobra: entry.admite_dobra,
        admite_litisconsorcio: entry.admite_litisconsorcio,
        efeito_nao_cumprimento: entry.efeito_nao_cumprimento,
        termo_inicial: entry.termo_inicial,
        observacoes: (entry as Record<string, unknown>).observacoes as string | undefined,
        ativo: true,
      } as never,
    });
  }

  console.log(`📚 Created ${catalog.length} deadline catalog entries`);

  console.log(`\n✅ Deadline seed completed:`);
  console.log(`   - ${calendars.length} court calendars`);
  console.log(`   - ${holidays.length} court holidays`);
  console.log(`   - ${suspensions.length} court suspensions`);
  console.log(`   - ${catalog.length} deadline catalog entries`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
