import { Prisma, PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { normalizeClasse, normalizeMonetaryValue, normalizeCpfCnpj, normalizeStatus, normalizeGuaranteeType, normalizeNatureza, inferClasseFromNatureza, normalizeColumnName } from "@/lib/normalizers";

type DB = PrismaClient | Prisma.TransactionClient;

// ========== CRUD ==========

export async function getCreditorSummary(db: DB, jrcId: string) {
  const creditors = await db.rJCreditor.findMany({
    where: { jrc_id: jrcId, status: { not: "EXCLUIDO" } },
    select: {
      classe: true,
      valor_original: true,
      valor_atualizado: true,
      status: true,
      subclass_id: true,
      desagio_percentual: true,
    },
  });

  const summary = {
    total_credores: creditors.length,
    total_credito: BigInt(0),
    por_classe: {} as Record<string, { count: number; valor: bigint }>,
    por_status: {} as Record<string, number>,
    media_desagio: 0,
  };

  let desagioSum = 0;
  let desagioCount = 0;

  for (const c of creditors) {
    const val = c.valor_atualizado || c.valor_original;
    summary.total_credito += val;

    if (!summary.por_classe[c.classe]) {
      summary.por_classe[c.classe] = { count: 0, valor: BigInt(0) };
    }
    summary.por_classe[c.classe].count++;
    summary.por_classe[c.classe].valor += val;

    summary.por_status[c.status] = (summary.por_status[c.status] || 0) + 1;

    if (c.desagio_percentual != null) {
      desagioSum += c.desagio_percentual;
      desagioCount++;
    }
  }

  summary.media_desagio = desagioCount > 0 ? desagioSum / desagioCount : 0;

  return summary;
}

export async function recalculateTotals(db: DB, jrcId: string) {
  const summary = await getCreditorSummary(db, jrcId);

  await db.judicialRecoveryCase.update({
    where: { id: jrcId },
    data: {
      total_credores: summary.total_credores,
      total_credito: summary.total_credito,
      total_classe_i: summary.por_classe["CLASSE_I_TRABALHISTA"]?.valor ?? BigInt(0),
      total_classe_ii: summary.por_classe["CLASSE_II_GARANTIA_REAL"]?.valor ?? BigInt(0),
      total_classe_iii: summary.por_classe["CLASSE_III_QUIROGRAFARIO"]?.valor ?? BigInt(0),
      total_classe_iv: summary.por_classe["CLASSE_IV_ME_EPP"]?.valor ?? BigInt(0),
    },
  });
}

// Salary cap validation for Class I (150 SM)
const SALARIO_MINIMO_CENTAVOS = BigInt(151800);
const LIMITE_150_SM = SALARIO_MINIMO_CENTAVOS * BigInt(150);

export function validateCreditorClass(data: {
  classe: string;
  valor_atualizado: bigint;
  valor_garantia: bigint;
  valor_avaliacao_garantia: bigint;
}): {
  valor_trabalhista_150sm: bigint;
  valor_trabalhista_excedente: bigint;
  valor_quirografario: bigint;
  warnings: string[];
} {
  const warnings: string[] = [];
  let valor_trabalhista_150sm = BigInt(0);
  let valor_trabalhista_excedente = BigInt(0);
  let valor_quirografario = BigInt(0);

  if (data.classe === "CLASSE_I_TRABALHISTA") {
    if (data.valor_atualizado > LIMITE_150_SM) {
      valor_trabalhista_150sm = LIMITE_150_SM;
      valor_trabalhista_excedente = data.valor_atualizado - LIMITE_150_SM;
      warnings.push(
        `Crédito trabalhista excede 150 SM. R$ ${Number(valor_trabalhista_excedente) / 100} será reclassificado como quirografário.`
      );
    } else {
      valor_trabalhista_150sm = data.valor_atualizado;
    }
  }

  if (data.classe === "CLASSE_II_GARANTIA_REAL") {
    if (data.valor_atualizado > data.valor_avaliacao_garantia && data.valor_avaliacao_garantia > BigInt(0)) {
      valor_quirografario = data.valor_atualizado - data.valor_avaliacao_garantia;
      warnings.push(
        `Crédito com garantia real excede valor da garantia. R$ ${Number(valor_quirografario) / 100} será classificado como quirografário.`
      );
    }
  }

  return { valor_trabalhista_150sm, valor_trabalhista_excedente, valor_quirografario, warnings };
}

// ========== CSV/Excel Parsing ==========

export interface ImportRow {
  nome: string;
  cpf_cnpj?: string;
  classe: string;
  natureza: string;
  valor_original: number;
  valor_atualizado?: number;
  tipo_garantia?: string;
  valor_garantia?: number;
  observacoes?: string;
}

export interface ImportValidation {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export function validateImportRows(rows: ImportRow[]): {
  valid: ImportRow[];
  errors: ImportValidation[];
} {
  const valid: ImportRow[] = [];
  const errors: ImportValidation[] = [];

  const validClasses = [
    "CLASSE_I_TRABALHISTA",
    "CLASSE_II_GARANTIA_REAL",
    "CLASSE_III_QUIROGRAFARIO",
    "CLASSE_IV_ME_EPP",
  ];

  const validNatures = [
    "TRABALHISTA", "ACIDENTARIO", "HIPOTECA", "PENHOR",
    "ALIENACAO_FIDUCIARIA_IMOVEL", "ALIENACAO_FIDUCIARIA_MOVEL",
    "CESSAO_FIDUCIARIA_RECEBIVEIS", "ANTICRESE", "QUIROGRAFARIO",
    "PRIVILEGIO_ESPECIAL", "PRIVILEGIO_GERAL", "SUBORDINADO", "ME_EPP",
  ];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // header is row 1

    // ONLY reject rows with truly empty names
    if (!row.nome?.trim()) {
      errors.push({ row: rowNum, field: "nome", message: "Nome é obrigatório", severity: "error" });
      return; // skip this row entirely
    }

    // Classe: warn but fix if invalid — normalizers already ran, so just ensure a valid value
    if (!row.classe || !validClasses.includes(row.classe)) {
      const inferred = inferClasseFromNatureza(row.natureza || "QUIROGRAFARIO");
      errors.push({
        row: rowNum,
        field: "classe",
        message: `Classe "${row.classe || "(vazio)"}" não reconhecida — inferida como ${inferred}`,
        severity: "warning",
      });
      row.classe = inferred;
    }

    // Natureza: warn but default if invalid
    if (!row.natureza || !validNatures.includes(row.natureza)) {
      errors.push({
        row: rowNum,
        field: "natureza",
        message: `Natureza "${row.natureza || "(vazio)"}" não reconhecida — atribuída como QUIROGRAFARIO`,
        severity: "warning",
      });
      row.natureza = "QUIROGRAFARIO";
    }

    // Valor original: warn if 0 but do NOT reject
    if (!row.valor_original || row.valor_original <= 0) {
      errors.push({
        row: rowNum,
        field: "valor_original",
        message: "Valor pendente de apuração",
        severity: "warning",
      });
    }

    // CPF/CNPJ format warning
    if (row.cpf_cnpj) {
      const digits = row.cpf_cnpj.replace(/\D/g, "");
      if (digits.length > 0 && digits.length !== 11 && digits.length !== 14) {
        errors.push({ row: rowNum, field: "cpf_cnpj", message: "CPF/CNPJ com formato inválido", severity: "warning" });
      }
    }

    valid.push(row);
  });

  return { valid, errors };
}

export function parseExcelFile(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  // Normalize column headers and row values
  const data = rawData.map((rawRow) => {
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawRow)) {
      const normalizedKey = normalizeColumnName(key);
      row[normalizedKey] = value;
    }
    return row;
  });

  return data.map((row) => {
    const rawNatureza = row["natureza"];
    const natureza = normalizeNatureza(rawNatureza as string);

    const rawClasse = row["classe"];
    let classe = normalizeClasse(rawClasse as string);
    if (!classe) {
      classe = inferClasseFromNatureza(natureza);
    }

    return {
      nome: row["nome"] ? String(row["nome"]).trim() : "",
      cpf_cnpj: normalizeCpfCnpj(row["cpf_cnpj"] as string),
      classe,
      natureza,
      valor_original: normalizeMonetaryValue(row["valor_original"]),
      valor_atualizado: row["valor_atualizado"] != null
        ? normalizeMonetaryValue(row["valor_atualizado"])
        : undefined,
      tipo_garantia: normalizeGuaranteeType(row["tipo_garantia"] as string),
      valor_garantia: row["valor_garantia"] != null
        ? normalizeMonetaryValue(row["valor_garantia"])
        : undefined,
      observacoes: row["observacoes"] ? String(row["observacoes"]).trim() : "",
      status: row["status"] ? normalizeStatus(row["status"] as string) : undefined,
    } as ImportRow;
  });
}

export function parseCSVContent(content: string): ImportRow[] {
  // Using papaparse would be ideal but keeping it simple for server-side
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Normalize column headers
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/['"]/g, ""));
  const headers = rawHeaders.map((h) => normalizeColumnName(h));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/['"]/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });

    const rawNatureza = row["natureza"];
    const natureza = normalizeNatureza(rawNatureza);

    const rawClasse = row["classe"];
    let classe = normalizeClasse(rawClasse);
    if (!classe) {
      classe = inferClasseFromNatureza(natureza);
    }

    return {
      nome: row["nome"] ? row["nome"].trim() : "",
      cpf_cnpj: normalizeCpfCnpj(row["cpf_cnpj"]),
      classe,
      natureza,
      valor_original: normalizeMonetaryValue(row["valor_original"]),
      valor_atualizado: row["valor_atualizado"]
        ? normalizeMonetaryValue(row["valor_atualizado"])
        : undefined,
      tipo_garantia: normalizeGuaranteeType(row["tipo_garantia"]),
      valor_garantia: row["valor_garantia"]
        ? normalizeMonetaryValue(row["valor_garantia"])
        : undefined,
      observacoes: row["observacoes"] ? row["observacoes"].trim() : "",
      status: row["status"] ? normalizeStatus(row["status"]) : undefined,
    } as ImportRow;
  });
}

export async function bulkCreateCreditors(
  db: DB,
  jrcId: string,
  rows: ImportRow[],
  source: "IMPORT_CSV" | "IMPORT_EXCEL"
) {
  const data = rows.map((row, index) => ({
    jrc_id: jrcId,
    nome: row.nome.trim(),
    cpf_cnpj: row.cpf_cnpj?.trim() || null,
    pessoa_fisica: row.cpf_cnpj ? row.cpf_cnpj.replace(/\D/g, "").length === 11 : false,
    classe: row.classe as never,
    natureza: row.natureza as never,
    fonte: source as never,
    valor_original: BigInt(Math.round((row.valor_original || 0) * 100)),
    valor_atualizado: BigInt(Math.round((row.valor_atualizado || row.valor_original || 0) * 100)),
    tipo_garantia: (row.tipo_garantia || "NONE") as never,
    valor_garantia: BigInt(Math.round((row.valor_garantia || 0) * 100)),
    ordem: index,
  }));

  const result = await db.rJCreditor.createMany({ data });
  await recalculateTotals(db, jrcId);
  return result;
}

// ========== Excel Export ==========

export async function exportToExcel(db: DB, jrcId: string): Promise<Buffer> {
  const jrc = await db.judicialRecoveryCase.findUniqueOrThrow({
    where: { id: jrcId },
    include: {
      case_: { select: { numero_processo: true, cliente: { select: { nome: true } } } },
    },
  });

  const creditors = await db.rJCreditor.findMany({
    where: { jrc_id: jrcId },
    include: { subclass: { select: { nome: true } } },
    orderBy: [{ classe: "asc" }, { valor_atualizado: "desc" }],
  });

  const wb = XLSX.utils.book_new();

  // Sheet 1: All creditors
  const wsData = creditors.map((c, i) => ({
    "#": i + 1,
    "Nome": c.nome,
    "CPF/CNPJ": c.cpf_cnpj || "",
    "Classe": c.classe,
    "Natureza": c.natureza,
    "Status": c.status,
    "Valor Original": Number(c.valor_original) / 100,
    "Valor Atualizado": Number(c.valor_atualizado) / 100,
    "Garantia": Number(c.valor_garantia) / 100,
    "Deságio (%)": c.desagio_percentual ?? "",
    "Parcelas": c.parcelas ?? "",
    "Carência (meses)": c.carencia_meses ?? "",
    "Subclasse": c.subclass?.nome || "",
    "Observações": c.observacoes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Credores");

  // Sheet 2: Summary by class
  const classes = ["CLASSE_I_TRABALHISTA", "CLASSE_II_GARANTIA_REAL", "CLASSE_III_QUIROGRAFARIO", "CLASSE_IV_ME_EPP"];
  const summaryData = classes.map((cls) => {
    const classCreditors = creditors.filter((c) => c.classe === cls);
    const total = classCreditors.reduce((sum, c) => sum + Number(c.valor_atualizado), 0) / 100;
    return {
      "Classe": cls,
      "Qtd. Credores": classCreditors.length,
      "Valor Total": total,
      "% do Total": creditors.length > 0 ? ((classCreditors.length / creditors.length) * 100).toFixed(1) + "%" : "0%",
    };
  });
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
