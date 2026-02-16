# JRCLaw — Sistema de Gestão Jurídica Empresarial v3.0

## Visão Geral
Sistema web completo de gestão para escritório de advocacia empresarial especializado em
recuperação judicial, reestruturação de dívidas e passivos, direito agrário e processos
empresariais complexos. Inclui gestão interna (advogados/equipe) e externa (portal clientes),
assistente IA jurídico, módulo de negociação de credores, biblioteca jurídica, gestão de
projetos gerenciais, e integrações com Microsoft 365, WhatsApp e tribunais.
O escritório opera em Maringá/PR e Balsas/MA.

## Stack Tecnológico (OBRIGATÓRIO)
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes + tRPC para tipagem end-to-end
- **Banco de dados:** PostgreSQL via Supabase (ou Neon)
- **ORM:** Prisma
- **Autenticação:** NextAuth.js v5 (Auth.js) com credenciais + Microsoft Entra ID
- **Storage:** Supabase Storage (ou AWS S3 compatível)
- **IA:** Anthropic API (Claude Sonnet 4.5) via Vercel AI SDK
- **E-mail:** Microsoft Graph API (Outlook)
- **Calendário:** Microsoft Graph API (Outlook Calendar)
- **Arquivos:** Microsoft Graph API (OneDrive) + Supabase Storage
- **WhatsApp:** WhatsApp Cloud API (Meta) ou Z-API
- **Planilhas:** SheetJS (xlsx) para importação/exportação Excel
- **PDF:** @react-pdf/renderer para geração de PDFs
- **Rich Text:** TipTap editor
- **Charts:** Recharts para dashboards e gráficos
- **Deploy:** Vercel (frontend) + Supabase/Railway (banco + storage)

## Estrutura do Projeto
```
jrclaw-system/
├── CLAUDE.md
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Login / registro
│   │   ├── (dashboard)/             # === PAINEL INTERNO ===
│   │   │   ├── page.tsx             # Dashboard principal (KPIs, prazos, alertas)
│   │   │   ├── processos/           # Gestão de processos judiciais
│   │   │   ├── projetos/            # ★ Gestão de projetos gerenciais
│   │   │   ├── clientes/            # CRM completo com documentos
│   │   │   ├── pessoas/             # Cadastro de pessoas (partes, juízes, peritos)
│   │   │   ├── calendario/          # Calendário unificado (todos os tipos de evento)
│   │   │   ├── prazos/              # Controle de prazos fatais e ordinários
│   │   │   ├── documentos/          # GED - Gestão Eletrônica de Documentos
│   │   │   ├── confeccao/           # Módulo de confecção (peças, e-mails, pareceres)
│   │   │   ├── recuperacao/         # Módulo RJ e negociação de credores
│   │   │   ├── reestruturacao/      # Reestruturação extrajudicial de passivo
│   │   │   ├── monitoramento/       # Captação de movimentações e publicações
│   │   │   ├── financeiro/          # Controle financeiro
│   │   │   ├── biblioteca/          # Biblioteca jurídica e base de conhecimento
│   │   │   ├── whatsapp/            # Central de WhatsApp
│   │   │   ├── email/               # Cliente de e-mail integrado (Outlook)
│   │   │   ├── relatorios/          # Geração de relatórios ao cliente
│   │   │   └── configuracoes/       # Settings
│   │   ├── (portal)/                # === PORTAL DO CLIENTE ===
│   │   │   ├── meus-processos/
│   │   │   ├── meus-projetos/       # ★ Projetos visíveis ao cliente
│   │   │   ├── documentos/
│   │   │   ├── atividades/          # Relatório de atividades do escritório
│   │   │   └── mensagens/
│   │   └── api/
│   │       ├── trpc/
│   │       ├── webhooks/
│   │       ├── ai/
│   │       └── cron/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui
│   │   ├── layout/                  # Sidebar, Header
│   │   ├── calendario/
│   │   ├── processos/
│   │   ├── projetos/                # ★ Componentes de projetos
│   │   ├── clientes/
│   │   ├── confeccao/
│   │   ├── recuperacao/
│   │   ├── reestruturacao/
│   │   ├── monitoramento/
│   │   ├── biblioteca/
│   │   ├── whatsapp/
│   │   └── relatorios/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── auth.ts
│   │   ├── microsoft.ts
│   │   ├── whatsapp.ts
│   │   ├── ai.ts
│   │   ├── ai-prompts.ts
│   │   ├── storage.ts
│   │   ├── tribunal-api.ts
│   │   ├── legal-one.ts
│   │   ├── pdf-generator.ts
│   │   ├── excel.ts
│   │   ├── prazos.ts
│   │   ├── rj-calculator.ts
│   │   └── holidays.ts
│   ├── server/
│   │   └── routers/
│   └── types/
├── public/
│   └── templates/
└── scripts/
    └── seed.ts
```

---

## MODELOS DE DADOS

### User (Usuário do sistema)
- id, name, email, password (hashed)
- role: ADMIN | SOCIO | ADVOGADO | ESTAGIARIO
- oab_number (opcional)
- microsoft_tokens: json (encrypted - access + refresh tokens)
- avatar_url
- active: boolean

### Person (Pessoa — cadastro universal)
Cadastro central que alimenta TODOS os módulos.
- id
- tipo: CLIENTE | PARTE_CONTRARIA | JUIZ | DESEMBARGADOR | PERITO | ADMINISTRADOR_JUDICIAL | CREDOR | TESTEMUNHA | OUTRO
- subtipo: PESSOA_FISICA | PESSOA_JURIDICA
- nome / razao_social
- cpf_cnpj (unique, nullable para tipos sem documento)
- rg, orgao_emissor
- nacionalidade, estado_civil, profissao
- data_nascimento
- **Endereço:** cep, logradouro, numero, complemento, bairro, cidade, estado, pais
- **Contatos:** telefone_fixo, celular, whatsapp, email, email_secundario
- **Dados bancários (encrypted):** banco, agencia, conta, pix
- segmento: AGRO | INDUSTRIA | COMERCIO | SERVICOS | FINANCEIRO | GOVERNO | OUTRO
- observacoes: text
- **Relacionamentos:**
  - processos: CaseParty[]
  - projetos: ProjectStakeholder[]
  - documentos_pessoais: PersonDocument[]
  - portal_access: boolean
  - portal_password: hashed
- created_at, updated_at, created_by_id

### PersonDocument (Documentos pessoais/corporativos)
- person_id
- tipo: CNH | RG | CPF | CNPJ_CARD | CONTRATO_SOCIAL | ALTERACAO_CONTRATO_SOCIAL | PROCURACAO | IMPOSTO_RENDA | BALANCO | DRE | ESCRITURA | CERTIDAO | COMPROVANTE_ENDERECO | DOCUMENTO_FINANCEIRO | DOCUMENTO_FISCAL | OUTRO
- titulo
- arquivo_url
- data_validade (opcional)
- observacoes
- uploaded_at, uploaded_by_id

### Case (Processo judicial)
- id
- numero_processo (formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO)
- tipo: RECUPERACAO_JUDICIAL | FALENCIA | EXECUCAO | COBRANCA | REESTRUTURACAO_EXTRAJUDICIAL | AGRARIO | TRABALHISTA | TRIBUTARIO | SOCIETARIO | CONTRATUAL | OUTRO
- status: ATIVO | SUSPENSO | ARQUIVADO | ENCERRADO
- fase_processual: text
- vara, comarca, tribunal, uf
- juiz_id (relação com Person)
- valor_causa: decimal
- valor_risco: decimal (provisão)
- cliente_id (Person)
- advogado_responsavel_id (User)
- equipe: CaseTeam[]
- partes: CaseParty[]
- prazos: Deadline[]
- documentos: Document[]
- movimentacoes: CaseMovement[]
- atividades: Activity[]
- credores: Creditor[]
- negociacoes: Negotiation[]
- projeto_id (Project, opcional — vincula processo a um projeto gerencial)
- tags: string[]
- created_at, updated_at

---

## ★ MÓDULO DE GESTÃO DE PROJETOS (NOVO)

### Conceito
O módulo de Projetos cobre demandas gerenciais que não se traduzem em prazos processuais
mas exigem acompanhamento ativo, disciplina de entregas e proximidade com o cliente.
Exemplos: negociações comerciais, fechamento de operações, recuperação de crédito extrajudicial,
planejamento tributário, obtenção de alvarás e liberações judiciais de valores, due diligence,
reestruturação societária, e qualquer demanda estratégica que gere valor e retenção de clientes.

O módulo funciona como camada gerencial acima dos processos: um Projeto pode conter zero,
um ou vários Processos judiciais, além de tarefas autônomas sem vínculo processual.

### Project (Projeto gerencial)
- id
- titulo: string
- codigo: string (gerado automaticamente, ex: PRJ-2026-001)
- cliente_id: Person (obrigatório)
- categoria: NEGOCIACAO_COMERCIAL | FECHAMENTO_OPERACAO | RECUPERACAO_CREDITO | PLANEJAMENTO_TRIBUTARIO | ALVARA_LIBERACAO | DUE_DILIGENCE | REESTRUTURACAO_SOCIETARIA | CONSULTORIA_PERMANENTE | COMPLIANCE | SUCESSAO_PATRIMONIAL | OPERACAO_CREDITO_RURAL | OUTRO
- descricao: text (escopo e objetivo do projeto)
- valor_envolvido: decimal (valor financeiro da operação/demanda)
- valor_honorarios: decimal
- status: PLANEJAMENTO | EM_ANDAMENTO | AGUARDANDO_CLIENTE | AGUARDANDO_TERCEIRO | AGUARDANDO_ORGAO | PAUSADO | CONCLUIDO | CANCELADO
- prioridade: CRITICA | ALTA | MEDIA | BAIXA
- data_inicio: date
- data_prevista_conclusao: date
- data_conclusao_real: date (nullable)
- advogado_responsavel_id: User
- equipe: ProjectTeam[] (User[] com papel)
- stakeholders: ProjectStakeholder[] (Person[] com papel: CLIENTE | PARTE | CREDOR | ORGAO_PUBLICO | BANCO | NOTARIO | CONTADOR | OUTRO)
- processos_vinculados: Case[] (processos judiciais que integram o projeto)
- etapas: ProjectPhase[]
- tarefas: ProjectTask[]
- marcos: ProjectMilestone[]
- documentos: Document[]
- atividades: Activity[]
- anotacoes: ProjectNote[]
- visivel_portal: boolean (se o cliente vê no portal)
- tags: string[]
- created_at, updated_at, created_by_id

### ProjectPhase (Etapa do projeto)
- id
- project_id
- titulo: string
- descricao: text
- ordem: int (para sequenciamento)
- status: NAO_INICIADA | EM_ANDAMENTO | CONCLUIDA | BLOQUEADA
- data_inicio_prevista: date
- data_fim_prevista: date
- data_inicio_real: date
- data_fim_real: date
- percentual_conclusao: int (0-100, calculado automaticamente pelas tarefas)
- dependencia_fase_id: ProjectPhase (fase anterior que precisa estar concluída)
- tarefas: ProjectTask[]
- cor: string (para Kanban)

### ProjectTask (Tarefa do projeto)
- id
- project_id
- phase_id (opcional — pode estar vinculada a uma etapa ou ser avulsa)
- case_id (opcional — tarefa vinculada a um processo específico)
- titulo: string
- descricao: text
- tipo: DOCUMENTO | REUNIAO | DILIGENCIA | ANALISE | COMUNICACAO | COBRANCA | ACOMPANHAMENTO | PROTOCOLO | OBTENCAO_CERTIDAO | OBTENCAO_ALVARA | LIBERACAO_VALORES | NEGOCIACAO | ASSINATURA | REGISTRO | PAGAMENTO | OUTRO
- status: BACKLOG | A_FAZER | EM_ANDAMENTO | EM_REVISAO | AGUARDANDO | CONCLUIDA | CANCELADA
- prioridade: CRITICA | ALTA | MEDIA | BAIXA
- responsavel_id: User
- data_limite: datetime (prazo gerencial, não processual)
- data_alerta: datetime
- data_conclusao: datetime
- estimativa_horas: decimal
- horas_gastas: decimal
- **Campos específicos por tipo (JSON dinâmico):**
  - **OBTENCAO_ALVARA:** numero_alvara, vara, valor_alvara, banco_destino, conta_destino, status_liberacao (PETICIONADO | DEFERIDO | EXPEDIDO | ENVIADO_BANCO | LIBERADO | PROBLEMA)
  - **LIBERACAO_VALORES:** origem (DEPOSITO_JUDICIAL | PRECATORIO | ALVARA | RPV | GARANTIA), valor, banco, conta, data_previsao_liberacao, data_liberacao_efetiva, comprovante_id (Document)
  - **NEGOCIACAO:** contraparte (Person), valor_pretendido, valor_proposto, valor_acordado, prazo_pagamento, status_negociacao (EM_CURSO | PROPOSTA_ENVIADA | CONTRAPROPOSTA | ACORDO | IMPASSE)
  - **OBTENCAO_CERTIDAO:** tipo_certidao (CND_FEDERAL | CND_ESTADUAL | CND_MUNICIPAL | CERTIDAO_FEITOS | CERTIDAO_PROTESTO | MATRICULA_IMOVEL | JUNTA_COMERCIAL | OUTRO), orgao, numero, data_validade
  - **REGISTRO:** tipo_registro (CARTORIO_IMOVEIS | JUNTA_COMERCIAL | CARTORIO_TITULOS | CRDA | OUTRO), orgao, protocolo, data_registro
  - **COBRANCA:** devedor (Person), valor_original, valor_atualizado, data_vencimento, tentativas_contato: int, ultimo_contato: datetime
- checklist: ProjectTaskCheckItem[] (subtarefas com checkbox)
- dependencia_tarefa_id: ProjectTask (tarefa anterior que precisa estar concluída)
- documentos: Document[]
- comentarios: ProjectTaskComment[]
- calendario_event_id: CalendarEvent (opcional — vinculação com calendário)
- notificar_cliente: boolean (gera atividade visível no portal)
- created_at, updated_at

### ProjectTaskCheckItem (Subtarefa / checklist)
- id
- task_id
- descricao: string
- concluido: boolean
- concluido_por_id: User
- concluido_em: datetime
- ordem: int

### ProjectTaskComment (Comentário em tarefa)
- id
- task_id
- user_id
- conteudo: text
- created_at

### ProjectMilestone (Marco do projeto)
- id
- project_id
- titulo: string
- descricao: text
- data_prevista: date
- data_alcancada: date (nullable)
- status: PENDENTE | ALCANCADO | ATRASADO | CANCELADO
- impacto: CRITICO | ALTO | MEDIO | BAIXO
- notificar_cliente: boolean
- **Exemplos de marcos típicos:**
  - "Alvará expedido"
  - "Valor liberado na conta do cliente"
  - "Acordo formalizado"
  - "Certidões negativas obtidas"
  - "Escritura lavrada"
  - "Plano tributário aprovado pelo cliente"
  - "Operação de crédito contratada"
  - "Registro na Junta Comercial concluído"

### ProjectNote (Anotação rápida do projeto)
- id
- project_id
- user_id
- conteudo: text (rich text)
- fixada: boolean (pin no topo)
- created_at

### ProjectTemplate (Modelos de projeto reutilizáveis)
- id
- titulo: string
- categoria: mesmo enum de Project.categoria
- descricao: text
- fases_padrao: json[] ({ titulo, descricao, ordem, tarefas_padrao[] })
- marcos_padrao: json[] ({ titulo, descricao, offset_dias })
- ativo: boolean
- **Templates pré-cadastrados no seed:**
  1. "Recuperação de Crédito" — fases: Análise do crédito → Notificação extrajudicial → Negociação → Acordo/Execução → Recebimento
  2. "Obtenção de Alvará Judicial" — fases: Petição → Deferimento → Expedição → Envio ao banco → Liberação → Confirmação
  3. "Planejamento Tributário" — fases: Diagnóstico fiscal → Modelagem → Parecer → Implementação → Acompanhamento
  4. "Due Diligence" — fases: Escopo → Levantamento documental → Análise jurídica → Relatório → Apresentação
  5. "Reestruturação Societária" — fases: Diagnóstico → Modelagem → Documentação → Deliberação → Registro
  6. "Operação de Crédito Rural" — fases: Documentação → Análise de garantias → Formalização → Registro → Liberação
  7. "Consultoria Permanente" — fases recorrentes mensais: Demandas do mês → Execução → Relatório

---

### INTERFACE DO MÓDULO DE PROJETOS

**1. Lista de projetos (página principal /projetos)**
- Três visualizações alternáveis:
  - **Lista:** tabela com colunas: código, título, cliente, categoria, status, prioridade, progresso (%), responsável, data prevista, valor envolvido
  - **Kanban:** colunas por status (Planejamento → Em Andamento → Aguardando → Concluído), cards arrastáveis
  - **Timeline:** Gantt simplificado mostrando projetos e suas fases no tempo (usar Recharts ou componente customizado)
- Filtros: por cliente, categoria, status, prioridade, responsável, período
- KPIs no topo: projetos ativos, aguardando ação, concluídos no mês, valor total envolvido

**2. Detalhe do projeto (/projetos/[id])**
Página com abas:

**Aba Resumo:**
- Card com dados principais (título, cliente, categoria, valor, status, datas)
- Barra de progresso geral (calculada automaticamente: tarefas concluídas / total)
- Marcos com timeline visual (tipo milestone chart)
- Alertas: tarefas atrasadas, marcos próximos, dependências bloqueadas
- Notas fixadas (pinned notes)
- Botão "Atualizar cliente" — gera Activity visível no portal e envia WhatsApp/e-mail

**Aba Etapas e Tarefas:**
- Visualização: Kanban (tarefas como cards dentro de colunas de fase/status) OU lista hierárquica (fases > tarefas > subtarefas)
- Criar tarefa: modal com todos os campos de ProjectTask, incluindo tipo com campos dinâmicos
- Cada tarefa mostra: título, responsável (avatar), prazo (com cor de urgência), checklist progress (3/5), tags
- Arrastar tarefa entre status
- Expandir tarefa: ver detalhes, comentários, documentos, checklist editável
- Filtros: por status, responsável, tipo, prioridade

**Aba Marcos:**
- Timeline visual (horizontal) com marcos posicionados por data
- Status visual: verde (alcançado), amarelo (próximo), vermelho (atrasado), cinza (futuro)
- Ao marcar como "Alcançado": opção de notificar o cliente

**Aba Financeiro:**
- Valor da operação, honorários previstos vs. recebidos
- Custos incorridos (certidões, registros, viagens)
- Horas gastas (soma das tarefas) × valor hora = custo interno
- Resultado do projeto (honorários - custos)
- Para projetos de liberação de valores: rastreamento do status do dinheiro (peticionado → deferido → expedido → na conta)

**Aba Documentos:**
- Documentos vinculados ao projeto (os mesmos Documents do sistema)
- Upload direto, categorização, versionamento

**Aba Comunicações:**
- Timeline de todas as comunicações com stakeholders: e-mails enviados/recebidos, mensagens WhatsApp, reuniões realizadas, telefonemas
- Botões: "Enviar e-mail", "Enviar WhatsApp", "Registrar telefonema"
- Filtro por stakeholder

**Aba Processos vinculados:**
- Lista de Cases vinculados ao projeto
- Status e próximo prazo de cada um
- Botão "Vincular processo existente" e "Criar novo processo"

**Aba Notas:**
- Caderno de anotações do projeto (rich text)
- Anotações fixáveis (pin)
- Útil para: estratégia do projeto, premissas, decisões tomadas, orientações do cliente

**3. Dashboard de projetos (widget no dashboard principal)**
- Projetos que precisam de atenção (tarefas atrasadas, marcos próximos)
- Liberações de valores pendentes (alvarás, precatórios, RPVs)
- Negociações em aberto
- Próximas ações por projeto

**4. Integrações com outros módulos:**
- **Calendário:** tarefas com data viram eventos no calendário (tipo ATIVIDADE_GERAL ou tipo específico)
- **Atividades:** conclusão de tarefas e marcos gera Activity (base para relatórios ao cliente)
- **Portal do cliente:** projetos com visivel_portal=true aparecem no portal com: progresso, marcos, documentos compartilhados
- **Relatórios:** o relatório ao cliente inclui seção de projetos com atividades do período
- **IA (Confecção):** ao gerar documentos vinculados a um projeto, injetar contexto do projeto no prompt
- **WhatsApp/E-mail:** notificações de marcos alcançados, tarefas concluídas, liberações de valores
- **Processos:** vinculação bidirecional (o processo mostra a qual projeto pertence, o projeto mostra seus processos)

---

### FLUXOS ESPECÍFICOS POR CATEGORIA DE PROJETO

**Recuperação de crédito:**
Tarefas típicas: análise de documentos do crédito, notificação extrajudicial (com prazo de resposta), negociação (com campos de valor pretendido/proposto/acordado), formalização de acordo, acompanhamento de pagamento, execução judicial (se necessário — cria Case). Marcos: notificação enviada, resposta recebida, acordo formalizado, primeiro pagamento recebido, crédito quitado.

**Obtenção de alvará e liberação de valores:**
Tarefas típicas: petição de alvará (gerar via Confecção IA), acompanhamento do despacho, expedição do alvará, envio ao banco (com dados bancários do Person), acompanhamento da liberação, confirmação de crédito em conta. Campos específicos: número do alvará, valor, banco destino, conta destino, status de cada etapa. Marco principal: "Valor creditado na conta do cliente".

**Planejamento tributário:**
Tarefas: levantamento de dados fiscais (IR, balanços — puxar de PersonDocument), diagnóstico da situação atual, modelagem de cenários (com IA para análise comparativa), elaboração de parecer, apresentação ao cliente, implementação das medidas, acompanhamento de resultados. Marcos: diagnóstico concluído, parecer aprovado, implementação iniciada, primeiro resultado apurado.

**Consultoria permanente (retenção):**
Projeto contínuo (sem data fim definida) com ciclos mensais. A cada mês: receber demandas, classificar por urgência, executar, gerar relatório mensal. Dashboard mostra: demandas do mês, tempo de resposta médio, satisfação do cliente. O objetivo é demonstrar valor contínuo e justificar honorários mensais. Relatório mensal automático via módulo de Relatórios.

**Operação de crédito rural:**
Tarefas: levantamento de documentação (Person + PersonDocument), análise de garantias (imóveis, safra, penhor), formalização junto à instituição financeira, registro em cartório, liberação do crédito. Campos específicos: tipo de crédito (custeio, investimento, comercialização), safra/ano, cultura, área, valor da operação, taxa de juros, prazo, garantias oferecidas.

---

## DEMAIS MODELOS DE DADOS (mantidos da v2)

### CalendarEvent (Evento de calendário — UNIFICADO)
- id
- case_id (opcional)
- project_id (opcional) ★ ADICIONADO — vincula evento a projeto
- task_id (opcional) ★ ADICIONADO — vincula evento a tarefa de projeto
- tipo_evento: REUNIAO | AUDIENCIA | SUSTENTACAO_ORAL | DESPACHO_ORAL | PESQUISA_JURIDICA | ANALISE_CASO | PRAZO_ANTECIPADO | PRAZO_FATAL | RETORNO_EMAIL | ATIVIDADE_GERAL
- titulo, descricao, data_inicio, data_fim, dia_inteiro
- local, link_virtual
- campos_especificos: json (conforme tipo)
- status: AGENDADO | EM_ANDAMENTO | CONCLUIDO | CANCELADO
- responsavel_id, participantes_internos, participantes_externos
- lembrete_minutos, recorrencia, sincronizado_outlook, outlook_event_id
- cor, created_at, updated_at, created_by_id

### Activity (Registro de atividade — para relatórios ao cliente)
- id
- case_id (opcional)
- project_id (opcional) ★ ADICIONADO
- task_id (opcional) ★ ADICIONADO
- calendar_event_id (opcional)
- user_id
- tipo: REUNIAO | AUDIENCIA | SUSTENTACAO | DESPACHO | PESQUISA | ANALISE | PETICAO | EMAIL | TELEFONEMA | NEGOCIACAO | DILIGENCIA | TAREFA_PROJETO | MARCO_ALCANCADO | OUTRO
- descricao, data, duracao_minutos, resultado
- documentos_gerados: Document[]
- visivel_portal: boolean
- faturavel: boolean
- valor_hora: decimal
- created_at

### Deadline (Prazo processual)
- id, case_id
- tipo: FATAL | ORDINARIO | DILIGENCIA | AUDIENCIA | ASSEMBLEIA
- descricao, data_limite, data_alerta[], status, responsavel_id
- recorrente, origem, movimento_id, lembrete_enviado, documento_cumprimento_id

### CaseMovement (Movimentação processual)
- id, case_id, data
- tipo: DESPACHO | DECISAO | SENTENCA | ACORDAO | PUBLICACAO | INTIMACAO | CITACAO | ATO_ORDINATORIO | OUTRO
- descricao, conteudo_integral, fonte, fonte_url
- prazo_gerado, notificar_cliente, lida, created_at

### Document (Documento)
- id, case_id (opcional), person_id (opcional), negotiation_id (opcional)
- project_id (opcional) ★ ADICIONADO
- task_id (opcional) ★ ADICIONADO
- tipo: PETICAO_INICIAL | CONTESTACAO | REPLICA | EMBARGOS_DECLARACAO | AGRAVO_INSTRUMENTO | APELACAO | RECURSO_ESPECIAL | RECURSO_EXTRAORDINARIO | CONTRARRAZOES | MEMORIAIS | PLANO_RJ | LISTA_CREDORES | HABILITACAO_CREDITO | IMPUGNACAO_CREDITO | RELATORIO_AJ | PARECER | MEMORANDO | CONTRATO | PROCURACAO | NOTIFICACAO | PROPOSTA | CONTRAPROPOSTA | RELATORIO_CLIENTE | PLANILHA | EMAIL_SALVO | ALVARA | CERTIDAO | ACORDO | OUTRO
- titulo, arquivo_url, versao, gerado_por_ia, template_id, criado_por_id
- compartilhado_portal, tags[], created_at, updated_at

### Template (Modelo de documento)
- id, nome, tipo_documento, area
- conteudo, variaveis, prompt_ia, estrutura_topicos
- ativo, created_by_id

### Creditor (Credor — RJ)
- id, case_id, person_id (Person)
- classe: I_TRABALHISTA | II_GARANTIA_REAL | III_QUIROGRAFARIO | IV_ME_EPP
- valor_original, valor_atualizado, valor_sujeito_plano
- garantias, status_credito, voto
- created_at, updated_at

### Negotiation (Negociação — RJ e Reestruturação)
- id, case_id (opcional), project_id (opcional) ★ ADICIONADO
- creditor_id (opcional), person_id (Person — contraparte)
- status, timeline_eventos: json[], propostas, contrapropostas
- valor_pretendido, valor_proposto, valor_acordado
- analise_financeira: json
- created_at, updated_at

### LibraryEntry (Biblioteca jurídica)
- id, tipo, titulo, resumo, conteudo, fonte, url_fonte
- area, tags[], arquivo_url, relevancia, favorito
- utilizado_em_casos: Case[], utilizado_em_projetos: Project[] ★ ADICIONADO
- created_at, created_by_id

---

## MÓDULO DE MONITORAMENTO DE TRIBUNAIS

### Arquitetura
```typescript
interface TribunalProvider {
  name: string;
  fetchMovements(caseNumber: string): Promise<CaseMovement[]>;
  fetchPublications(oabNumber: string, date: Date): Promise<Publication[]>;
  searchCase(query: string): Promise<CaseSearchResult[]>;
}
```
Implementações: LegalOneProvider (primeira), CNJProvider (futuro), TribunalDirectProvider (futuro).

---

## MÓDULO DE CALENDÁRIO (10 TIPOS DE EVENTO)

Tipos: REUNIAO, AUDIENCIA, SUSTENTACAO_ORAL, DESPACHO_ORAL, PESQUISA_JURIDICA,
ANALISE_CASO, PRAZO_ANTECIPADO, PRAZO_FATAL, RETORNO_EMAIL, ATIVIDADE_GERAL.

Campos específicos conforme tipo — detalhados na v2.
CalendarEvent agora pode vincular-se a Project e ProjectTask além de Case.

---

## MÓDULO DE CONFECÇÃO COM IA

System prompt, templates de prompt por tipo de peça, integração com Biblioteca,
fluxo de geração com streaming, revisão e versionamento — conforme v2.

---

## MÓDULO DE RECUPERAÇÃO JUDICIAL

Quadro de credores, negociações, dashboard de aprovação do PRJ (arts. 45, 56, 58
da Lei 11.101/2005), simulador de cram down, IA de negociação — conforme v2.

---

## MÓDULO DE REESTRUTURAÇÃO EXTRAJUDICIAL

Similar ao RJ sem vinculação processual — conforme v2.
Agora também vinculável a um Project gerencial.

---

## RELATÓRIOS AO CLIENTE (ATUALIZADO)

O relatório mensal agora inclui três seções:
1. **Processos judiciais** — atividades, movimentações, prazos cumpridos, status
2. **Projetos gerenciais** — tarefas concluídas, marcos alcançados, próximos passos ★ NOVO
3. **Valores e liberações** — alvarás, RPVs, precatórios, status de cada um ★ NOVO

---

## REGRAS DE NEGÓCIO GERAIS

### Prazos processuais
- Fatais: alerta 5, 3, 2, 1 dia + no dia
- Contagem: dias úteis conforme CPC, excluindo feriados nacionais e estaduais (PR e MA)

### Prazos gerenciais (projetos)
- Funcionam em dias corridos (não são prazos processuais)
- Alertas configuráveis por tarefa
- Tarefas atrasadas geram notificação ao responsável e ao sócio

### Documentos
- Versionamento obrigatório
- IA gera rascunhos com banner "RASCUNHO - REVISÃO PENDENTE"

### Segurança (CRÍTICO)
- RBAC: ADMIN > SOCIO > ADVOGADO > ESTAGIARIO > CLIENTE (portal)
- Criptografia AES-256 para dados sensíveis
- Auditoria completa, rate limiting, HTTPS, sanitização
- LGPD compliance

## Convenções de Código
- Código e comentários em inglês, UI em português do Brasil
- Server components por padrão
- Validação com Zod, error handling com try/catch + error boundaries
- Lógica de negócio nos tRPC routers
- Testes com Vitest

## Comandos úteis
- `npm run dev` — servidor de desenvolvimento
- `npx prisma db push` — sync schema
- `npx prisma studio` — interface visual do banco
- `npx prisma db seed` — popular dados iniciais
