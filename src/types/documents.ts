export type DocumentType =
  | 'PETICAO_INICIAL' | 'CONTESTACAO' | 'RECURSO' | 'EMBARGOS' | 'AGRAVO' | 'PARECER' | 'PROCURACAO' | 'SUBSTABELECIMENTO'
  | 'CONTRATO' | 'ADITIVO' | 'DISTRATO'
  | 'ALVARA' | 'RPV' | 'PRECATORIO' | 'NOTA_FISCAL' | 'COMPROVANTE'
  | 'RELATORIO_CLIENTE' | 'COMUNICADO_CREDORES' | 'MATERIAL_INFORMATIVO' | 'APRESENTACAO' | 'ATA_REUNIAO'
  | 'LAUDO' | 'CERTIDAO' | 'ESCRITURA'
  | 'RESUMO_IA' | 'ANALISE_IA'
  | 'OUTRO';

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PETICAO_INICIAL: 'Petição Inicial', CONTESTACAO: 'Contestação', RECURSO: 'Recurso',
  EMBARGOS: 'Embargos', AGRAVO: 'Agravo', PARECER: 'Parecer',
  PROCURACAO: 'Procuração', SUBSTABELECIMENTO: 'Substabelecimento',
  CONTRATO: 'Contrato', ADITIVO: 'Aditivo', DISTRATO: 'Distrato',
  ALVARA: 'Alvará', RPV: 'RPV', PRECATORIO: 'Precatório',
  NOTA_FISCAL: 'Nota Fiscal', COMPROVANTE: 'Comprovante',
  RELATORIO_CLIENTE: 'Relatório ao Cliente', COMUNICADO_CREDORES: 'Comunicado aos Credores',
  MATERIAL_INFORMATIVO: 'Material Informativo', APRESENTACAO: 'Apresentação', ATA_REUNIAO: 'Ata de Reunião',
  LAUDO: 'Laudo', CERTIDAO: 'Certidão', ESCRITURA: 'Escritura',
  RESUMO_IA: 'Resumo (IA)', ANALISE_IA: 'Análise (IA)', OUTRO: 'Outro',
};

export const DOCUMENT_TYPE_GROUPS: Record<string, string[]> = {
  'Jurídicos': ['PETICAO_INICIAL','CONTESTACAO','RECURSO','EMBARGOS','AGRAVO','PARECER','PROCURACAO','SUBSTABELECIMENTO'],
  'Contratuais': ['CONTRATO','ADITIVO','DISTRATO'],
  'Financeiros': ['ALVARA','RPV','PRECATORIO','NOTA_FISCAL','COMPROVANTE'],
  'Comunicação': ['RELATORIO_CLIENTE','COMUNICADO_CREDORES','MATERIAL_INFORMATIVO','APRESENTACAO','ATA_REUNIAO'],
  'Técnicos': ['LAUDO','CERTIDAO','ESCRITURA'],
  'IA': ['RESUMO_IA','ANALISE_IA'],
  'Outros': ['OUTRO'],
};
