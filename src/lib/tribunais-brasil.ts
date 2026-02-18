// Full list of Brazilian tribunals — 91+ courts
// Used by the Calculadora de Prazos and Depositario de Calendarios modules.

export interface TribunalInfo {
  codigo: string;
  nome: string;
  sigla: string;
  tipo: TribunalTipo;
  uf: string | null;
}

export type TribunalTipo =
  | "SUPERIOR"
  | "TJ"
  | "TRF"
  | "TRT"
  | "TRE"
  | "TJM";

export const TRIBUNAL_TIPO_LABELS: Record<TribunalTipo, string> = {
  SUPERIOR: "Tribunais Superiores",
  TJ: "Tribunais de Justiça",
  TRF: "Tribunais Regionais Federais",
  TRT: "Tribunais Regionais do Trabalho",
  TRE: "Tribunais Regionais Eleitorais",
  TJM: "Tribunais de Justiça Militar",
};

export const TRIBUNAL_TIPO_OPTIONS: { value: TribunalTipo; label: string }[] = [
  { value: "SUPERIOR", label: "Tribunais Superiores" },
  { value: "TJ", label: "Tribunais de Justiça" },
  { value: "TRF", label: "Tribunais Regionais Federais" },
  { value: "TRT", label: "Tribunais Regionais do Trabalho" },
  { value: "TRE", label: "Tribunais Regionais Eleitorais" },
  { value: "TJM", label: "Tribunais de Justiça Militar" },
];

export const TRIBUNAIS_BRASIL: TribunalInfo[] = [
  // ── Tribunais Superiores ──────────────────────────────────────────
  { codigo: "STF", nome: "Supremo Tribunal Federal", sigla: "STF", tipo: "SUPERIOR", uf: null },
  { codigo: "STJ", nome: "Superior Tribunal de Justiça", sigla: "STJ", tipo: "SUPERIOR", uf: null },
  { codigo: "TST", nome: "Tribunal Superior do Trabalho", sigla: "TST", tipo: "SUPERIOR", uf: null },
  { codigo: "TSE", nome: "Tribunal Superior Eleitoral", sigla: "TSE", tipo: "SUPERIOR", uf: null },
  { codigo: "STM", nome: "Superior Tribunal Militar", sigla: "STM", tipo: "SUPERIOR", uf: null },

  // ── Tribunais de Justiça (27) ─────────────────────────────────────
  { codigo: "TJAC", nome: "Tribunal de Justiça do Acre", sigla: "TJAC", tipo: "TJ", uf: "AC" },
  { codigo: "TJAL", nome: "Tribunal de Justiça de Alagoas", sigla: "TJAL", tipo: "TJ", uf: "AL" },
  { codigo: "TJAP", nome: "Tribunal de Justiça do Amapá", sigla: "TJAP", tipo: "TJ", uf: "AP" },
  { codigo: "TJAM", nome: "Tribunal de Justiça do Amazonas", sigla: "TJAM", tipo: "TJ", uf: "AM" },
  { codigo: "TJBA", nome: "Tribunal de Justiça da Bahia", sigla: "TJBA", tipo: "TJ", uf: "BA" },
  { codigo: "TJCE", nome: "Tribunal de Justiça do Ceará", sigla: "TJCE", tipo: "TJ", uf: "CE" },
  { codigo: "TJDFT", nome: "Tribunal de Justiça do Distrito Federal e Territórios", sigla: "TJDFT", tipo: "TJ", uf: "DF" },
  { codigo: "TJES", nome: "Tribunal de Justiça do Espírito Santo", sigla: "TJES", tipo: "TJ", uf: "ES" },
  { codigo: "TJGO", nome: "Tribunal de Justiça de Goiás", sigla: "TJGO", tipo: "TJ", uf: "GO" },
  { codigo: "TJMA", nome: "Tribunal de Justiça do Maranhão", sigla: "TJMA", tipo: "TJ", uf: "MA" },
  { codigo: "TJMT", nome: "Tribunal de Justiça de Mato Grosso", sigla: "TJMT", tipo: "TJ", uf: "MT" },
  { codigo: "TJMS", nome: "Tribunal de Justiça de Mato Grosso do Sul", sigla: "TJMS", tipo: "TJ", uf: "MS" },
  { codigo: "TJMG", nome: "Tribunal de Justiça de Minas Gerais", sigla: "TJMG", tipo: "TJ", uf: "MG" },
  { codigo: "TJPA", nome: "Tribunal de Justiça do Pará", sigla: "TJPA", tipo: "TJ", uf: "PA" },
  { codigo: "TJPB", nome: "Tribunal de Justiça da Paraíba", sigla: "TJPB", tipo: "TJ", uf: "PB" },
  { codigo: "TJPR", nome: "Tribunal de Justiça do Paraná", sigla: "TJPR", tipo: "TJ", uf: "PR" },
  { codigo: "TJPE", nome: "Tribunal de Justiça de Pernambuco", sigla: "TJPE", tipo: "TJ", uf: "PE" },
  { codigo: "TJPI", nome: "Tribunal de Justiça do Piauí", sigla: "TJPI", tipo: "TJ", uf: "PI" },
  { codigo: "TJRJ", nome: "Tribunal de Justiça do Rio de Janeiro", sigla: "TJRJ", tipo: "TJ", uf: "RJ" },
  { codigo: "TJRN", nome: "Tribunal de Justiça do Rio Grande do Norte", sigla: "TJRN", tipo: "TJ", uf: "RN" },
  { codigo: "TJRS", nome: "Tribunal de Justiça do Rio Grande do Sul", sigla: "TJRS", tipo: "TJ", uf: "RS" },
  { codigo: "TJRO", nome: "Tribunal de Justiça de Rondônia", sigla: "TJRO", tipo: "TJ", uf: "RO" },
  { codigo: "TJRR", nome: "Tribunal de Justiça de Roraima", sigla: "TJRR", tipo: "TJ", uf: "RR" },
  { codigo: "TJSC", nome: "Tribunal de Justiça de Santa Catarina", sigla: "TJSC", tipo: "TJ", uf: "SC" },
  { codigo: "TJSP", nome: "Tribunal de Justiça de São Paulo", sigla: "TJSP", tipo: "TJ", uf: "SP" },
  { codigo: "TJSE", nome: "Tribunal de Justiça de Sergipe", sigla: "TJSE", tipo: "TJ", uf: "SE" },
  { codigo: "TJTO", nome: "Tribunal de Justiça do Tocantins", sigla: "TJTO", tipo: "TJ", uf: "TO" },

  // ── Tribunais Regionais Federais (6) ──────────────────────────────
  { codigo: "TRF1", nome: "Tribunal Regional Federal da 1ª Região", sigla: "TRF1", tipo: "TRF", uf: null },
  { codigo: "TRF2", nome: "Tribunal Regional Federal da 2ª Região", sigla: "TRF2", tipo: "TRF", uf: null },
  { codigo: "TRF3", nome: "Tribunal Regional Federal da 3ª Região", sigla: "TRF3", tipo: "TRF", uf: null },
  { codigo: "TRF4", nome: "Tribunal Regional Federal da 4ª Região", sigla: "TRF4", tipo: "TRF", uf: null },
  { codigo: "TRF5", nome: "Tribunal Regional Federal da 5ª Região", sigla: "TRF5", tipo: "TRF", uf: null },
  { codigo: "TRF6", nome: "Tribunal Regional Federal da 6ª Região", sigla: "TRF6", tipo: "TRF", uf: null },

  // ── Tribunais Regionais do Trabalho (24) ──────────────────────────
  { codigo: "TRT1", nome: "TRT da 1ª Região (Rio de Janeiro)", sigla: "TRT1", tipo: "TRT", uf: "RJ" },
  { codigo: "TRT2", nome: "TRT da 2ª Região (São Paulo)", sigla: "TRT2", tipo: "TRT", uf: "SP" },
  { codigo: "TRT3", nome: "TRT da 3ª Região (Minas Gerais)", sigla: "TRT3", tipo: "TRT", uf: "MG" },
  { codigo: "TRT4", nome: "TRT da 4ª Região (Rio Grande do Sul)", sigla: "TRT4", tipo: "TRT", uf: "RS" },
  { codigo: "TRT5", nome: "TRT da 5ª Região (Bahia)", sigla: "TRT5", tipo: "TRT", uf: "BA" },
  { codigo: "TRT6", nome: "TRT da 6ª Região (Pernambuco)", sigla: "TRT6", tipo: "TRT", uf: "PE" },
  { codigo: "TRT7", nome: "TRT da 7ª Região (Ceará)", sigla: "TRT7", tipo: "TRT", uf: "CE" },
  { codigo: "TRT8", nome: "TRT da 8ª Região (Pará/Amapá)", sigla: "TRT8", tipo: "TRT", uf: "PA" },
  { codigo: "TRT9", nome: "TRT da 9ª Região (Paraná)", sigla: "TRT9", tipo: "TRT", uf: "PR" },
  { codigo: "TRT10", nome: "TRT da 10ª Região (Distrito Federal/Tocantins)", sigla: "TRT10", tipo: "TRT", uf: "DF" },
  { codigo: "TRT11", nome: "TRT da 11ª Região (Amazonas/Roraima)", sigla: "TRT11", tipo: "TRT", uf: "AM" },
  { codigo: "TRT12", nome: "TRT da 12ª Região (Santa Catarina)", sigla: "TRT12", tipo: "TRT", uf: "SC" },
  { codigo: "TRT13", nome: "TRT da 13ª Região (Paraíba)", sigla: "TRT13", tipo: "TRT", uf: "PB" },
  { codigo: "TRT14", nome: "TRT da 14ª Região (Rondônia/Acre)", sigla: "TRT14", tipo: "TRT", uf: "RO" },
  { codigo: "TRT15", nome: "TRT da 15ª Região (Campinas)", sigla: "TRT15", tipo: "TRT", uf: "SP" },
  { codigo: "TRT16", nome: "TRT da 16ª Região (Maranhão)", sigla: "TRT16", tipo: "TRT", uf: "MA" },
  { codigo: "TRT17", nome: "TRT da 17ª Região (Espírito Santo)", sigla: "TRT17", tipo: "TRT", uf: "ES" },
  { codigo: "TRT18", nome: "TRT da 18ª Região (Goiás)", sigla: "TRT18", tipo: "TRT", uf: "GO" },
  { codigo: "TRT19", nome: "TRT da 19ª Região (Alagoas)", sigla: "TRT19", tipo: "TRT", uf: "AL" },
  { codigo: "TRT20", nome: "TRT da 20ª Região (Sergipe)", sigla: "TRT20", tipo: "TRT", uf: "SE" },
  { codigo: "TRT21", nome: "TRT da 21ª Região (Rio Grande do Norte)", sigla: "TRT21", tipo: "TRT", uf: "RN" },
  { codigo: "TRT22", nome: "TRT da 22ª Região (Piauí)", sigla: "TRT22", tipo: "TRT", uf: "PI" },
  { codigo: "TRT23", nome: "TRT da 23ª Região (Mato Grosso)", sigla: "TRT23", tipo: "TRT", uf: "MT" },
  { codigo: "TRT24", nome: "TRT da 24ª Região (Mato Grosso do Sul)", sigla: "TRT24", tipo: "TRT", uf: "MS" },

  // ── Tribunais Regionais Eleitorais (27) ───────────────────────────
  { codigo: "TREAC", nome: "Tribunal Regional Eleitoral do Acre", sigla: "TRE-AC", tipo: "TRE", uf: "AC" },
  { codigo: "TREAL", nome: "Tribunal Regional Eleitoral de Alagoas", sigla: "TRE-AL", tipo: "TRE", uf: "AL" },
  { codigo: "TREAP", nome: "Tribunal Regional Eleitoral do Amapá", sigla: "TRE-AP", tipo: "TRE", uf: "AP" },
  { codigo: "TREAM", nome: "Tribunal Regional Eleitoral do Amazonas", sigla: "TRE-AM", tipo: "TRE", uf: "AM" },
  { codigo: "TREBA", nome: "Tribunal Regional Eleitoral da Bahia", sigla: "TRE-BA", tipo: "TRE", uf: "BA" },
  { codigo: "TRECE", nome: "Tribunal Regional Eleitoral do Ceará", sigla: "TRE-CE", tipo: "TRE", uf: "CE" },
  { codigo: "TREDF", nome: "Tribunal Regional Eleitoral do Distrito Federal", sigla: "TRE-DF", tipo: "TRE", uf: "DF" },
  { codigo: "TREES", nome: "Tribunal Regional Eleitoral do Espírito Santo", sigla: "TRE-ES", tipo: "TRE", uf: "ES" },
  { codigo: "TREGO", nome: "Tribunal Regional Eleitoral de Goiás", sigla: "TRE-GO", tipo: "TRE", uf: "GO" },
  { codigo: "TREMA", nome: "Tribunal Regional Eleitoral do Maranhão", sigla: "TRE-MA", tipo: "TRE", uf: "MA" },
  { codigo: "TREMT", nome: "Tribunal Regional Eleitoral de Mato Grosso", sigla: "TRE-MT", tipo: "TRE", uf: "MT" },
  { codigo: "TREMS", nome: "Tribunal Regional Eleitoral de Mato Grosso do Sul", sigla: "TRE-MS", tipo: "TRE", uf: "MS" },
  { codigo: "TREMG", nome: "Tribunal Regional Eleitoral de Minas Gerais", sigla: "TRE-MG", tipo: "TRE", uf: "MG" },
  { codigo: "TREPA", nome: "Tribunal Regional Eleitoral do Pará", sigla: "TRE-PA", tipo: "TRE", uf: "PA" },
  { codigo: "TREPB", nome: "Tribunal Regional Eleitoral da Paraíba", sigla: "TRE-PB", tipo: "TRE", uf: "PB" },
  { codigo: "TREPR", nome: "Tribunal Regional Eleitoral do Paraná", sigla: "TRE-PR", tipo: "TRE", uf: "PR" },
  { codigo: "TREPE", nome: "Tribunal Regional Eleitoral de Pernambuco", sigla: "TRE-PE", tipo: "TRE", uf: "PE" },
  { codigo: "TREPI", nome: "Tribunal Regional Eleitoral do Piauí", sigla: "TRE-PI", tipo: "TRE", uf: "PI" },
  { codigo: "TRERJ", nome: "Tribunal Regional Eleitoral do Rio de Janeiro", sigla: "TRE-RJ", tipo: "TRE", uf: "RJ" },
  { codigo: "TRERN", nome: "Tribunal Regional Eleitoral do Rio Grande do Norte", sigla: "TRE-RN", tipo: "TRE", uf: "RN" },
  { codigo: "TRERS", nome: "Tribunal Regional Eleitoral do Rio Grande do Sul", sigla: "TRE-RS", tipo: "TRE", uf: "RS" },
  { codigo: "TRERO", nome: "Tribunal Regional Eleitoral de Rondônia", sigla: "TRE-RO", tipo: "TRE", uf: "RO" },
  { codigo: "TRERR", nome: "Tribunal Regional Eleitoral de Roraima", sigla: "TRE-RR", tipo: "TRE", uf: "RR" },
  { codigo: "TRESC", nome: "Tribunal Regional Eleitoral de Santa Catarina", sigla: "TRE-SC", tipo: "TRE", uf: "SC" },
  { codigo: "TRESP", nome: "Tribunal Regional Eleitoral de São Paulo", sigla: "TRE-SP", tipo: "TRE", uf: "SP" },
  { codigo: "TRESE", nome: "Tribunal Regional Eleitoral de Sergipe", sigla: "TRE-SE", tipo: "TRE", uf: "SE" },
  { codigo: "TRETO", nome: "Tribunal Regional Eleitoral do Tocantins", sigla: "TRE-TO", tipo: "TRE", uf: "TO" },

  // ── Tribunais de Justiça Militar (3) ──────────────────────────────
  { codigo: "TJMSP", nome: "Tribunal de Justiça Militar de São Paulo", sigla: "TJMSP", tipo: "TJM", uf: "SP" },
  { codigo: "TJMMG", nome: "Tribunal de Justiça Militar de Minas Gerais", sigla: "TJMMG", tipo: "TJM", uf: "MG" },
  { codigo: "TJMRS", nome: "Tribunal de Justiça Militar do Rio Grande do Sul", sigla: "TJMRS", tipo: "TJM", uf: "RS" },
];

// ── Helper functions ──────────────────────────────────────────────────

export function getTribunalByCodigo(codigo: string): TribunalInfo | undefined {
  return TRIBUNAIS_BRASIL.find((t) => t.codigo === codigo);
}

export function getTribunaisByTipo(tipo: TribunalTipo): TribunalInfo[] {
  return TRIBUNAIS_BRASIL.filter((t) => t.tipo === tipo);
}

export function getTribunaisByUf(uf: string): TribunalInfo[] {
  return TRIBUNAIS_BRASIL.filter((t) => t.uf === uf);
}

export function getTribunalSelectOptions(): { value: string; label: string }[] {
  return TRIBUNAIS_BRASIL.map((t) => ({
    value: t.codigo,
    label: `${t.sigla} — ${t.nome}`,
  }));
}
