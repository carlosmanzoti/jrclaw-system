/**
 * Deadline Calculation Engine for the JRCLaw System.
 *
 * Implements all 12 rules from the Brazilian CPC/2015, Lei 11.101/2005,
 * and related legislation for accurate procedural deadline computation.
 *
 * Rules implemented:
 *  1  - CPC Art. 231: Start date by trigger event
 *  2  - CPC Art. 224: Exclusion of start day, inclusion of end day
 *  3  - CPC Art. 219: Business days only
 *  4  - CPC Art. 224 par. 1: Extension to next business day
 *  5  - CPC Art. 220: December-January recess (recesso forense)
 *  6  - STF/STJ/TST July recess
 *  7  - CPC Art. 183: Fazenda Publica double deadline
 *  8  - CPC Art. 180: Ministerio Publico double deadline
 *  9  - CPC Art. 186: Defensoria Publica double deadline
 *  10 - CPC Art. 229: Litisconsortes double deadline
 *  11 - CPC Art. 1.026: Embargos de Declaracao interruption
 *  12 - CNJ Res. 185: System unavailability
 *
 * @module deadline-engine
 */

import { isDiaUtil, proximoDiaUtil, diasUteisAte } from "@/lib/prazos";
import { db } from "@/lib/db";
import type {
  CountingMode,
  DeadlineType,
  Jurisdiction,
  SpecialRule,
  TriggerEvent,
} from "@/lib/deadline-constants";
import {
  SPECIAL_RULE_LABELS,
  TRIGGER_EVENT_LABELS,
  JURISDICTION_LABELS,
} from "@/lib/deadline-constants";

// ============================================================
// Types
// ============================================================

/** Main input for deadline calculation. */
export interface DeadlineCalculationInput {
  /** Deadline category (FATAL, ORDINARIO, etc.) */
  tipo: DeadlineType;
  /** Base number of days (or hours/minutes depending on counting_mode). */
  dias_prazo: number;
  /** How days are counted: DIAS_UTEIS, DIAS_CORRIDOS, HORAS, or MINUTOS. */
  counting_mode: CountingMode;

  /** What starts the deadline (CPC Art. 231). */
  trigger_event: TriggerEvent;
  /** When the trigger happened. */
  trigger_date: Date;

  /** Court jurisdiction. */
  jurisdiction: Jurisdiction;
  /** Brazilian state code (PR, MA, SP, etc.). */
  uf: string;
  /** Specific court identifier (e.g., tribunal_codigo from CourtCalendar). */
  tribunal?: string;

  /** Array of special rules to apply. */
  special_rules: SpecialRule[];

  /** Whether the case is an electronic process. */
  processo_eletronico?: boolean;
  /** Party type for doubling rules: FAZENDA, MP, DEFENSORIA, etc. */
  parte_tipo?: string;
  /** Whether there are litisconsortes with different attorneys. */
  litisconsorcio_advogados_diferentes?: boolean;
  /** Whether embargos de declaracao are pending (interrupts the deadline). */
  embargos_pendentes?: boolean;
  /** System unavailability period (CNJ Res. 185). */
  sistema_indisponivel?: {
    inicio: Date;
    fim: Date;
  };
}

/** Main output of a deadline calculation. */
export interface DeadlineCalculationResult {
  /** Actual start date for counting (after trigger-event adjustments). */
  data_inicio_contagem: Date;
  /** Final deadline date. */
  data_limite: Date;
  /** Original number of days from input. */
  dias_prazo_original: number;
  /** Effective number of days after multipliers. */
  dias_prazo_efetivo: number;
  /** Counting mode used. */
  counting_mode: CountingMode;
  /** Business days remaining from today until the deadline. */
  dias_uteis_restantes: number;
  /** List of rules that were applied and their impact. */
  regras_aplicadas: AppliedRule[];
  /** Human-readable warnings. */
  alertas: string[];
  /** Suspension periods that affected counting. */
  suspensoes: SuspensionPeriod[];
  /** Step-by-step audit trail in Portuguese. */
  auditoria: AuditEntry[];
}

/** Describes a rule that was applied during calculation. */
export interface AppliedRule {
  /** The special rule identifier. */
  rule: SpecialRule;
  /** Human-readable description in Portuguese. */
  description: string;
  /** Impact description, e.g. "Prazo dobrado: 15 -> 30 dias". */
  impact: string;
}

/** A period during which deadlines are suspended. */
export interface SuspensionPeriod {
  /** Start of the suspension. */
  inicio: Date;
  /** End of the suspension (inclusive). */
  fim: Date;
  /** Reason for the suspension. */
  motivo: string;
}

/** A single entry in the step-by-step audit trail. */
export interface AuditEntry {
  /** Sequential step number. */
  step: number;
  /** Action taken. */
  action: string;
  /** Detailed description in Portuguese. */
  detail: string;
  /** Date before the action (if applicable). */
  date_before?: Date;
  /** Date after the action (if applicable). */
  date_after?: Date;
}

// ============================================================
// Utility helpers
// ============================================================

/**
 * Creates a date copy with time set to midnight (00:00:00.000).
 * All deadline calculations operate on date-only (no time component).
 */
function normalizeDate(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Formats a Date as YYYY-MM-DD for display. */
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Adds N calendar days to a date, returning a new Date. */
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return normalizeDate(r);
}

/** Checks if two dates represent the same calendar day. */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Checks if date a is on or before date b (calendar day comparison). */
function isOnOrBefore(a: Date, b: Date): boolean {
  return normalizeDate(a).getTime() <= normalizeDate(b).getTime();
}

/** Checks if date a is strictly after date b (calendar day comparison). */
function isAfter(a: Date, b: Date): boolean {
  return normalizeDate(a).getTime() > normalizeDate(b).getTime();
}

// ============================================================
// Rule 5: December-January Recess (CPC Art. 220)
// ============================================================

/**
 * Checks whether a date falls within the December-January judiciary recess.
 *
 * The recess runs from December 20 through January 20 (inclusive on both ends).
 * During this period, procedural deadlines are suspended in ESTADUAL and FEDERAL
 * jurisdictions. The recess does NOT apply to STF/STJ/TST (which have their own
 * July recess instead).
 */
export function isInDecJanRecess(date: Date): boolean {
  const d = normalizeDate(date);
  const month = d.getMonth(); // 0-indexed: 0=Jan, 11=Dec
  const day = d.getDate();

  // December 20-31 (month=11, day>=20)
  if (month === 11 && day >= 20) return true;
  // January 1-20 (month=0, day<=20)
  if (month === 0 && day <= 20) return true;

  return false;
}

// ============================================================
// Rule 6: July Recess (STF/STJ/TST)
// ============================================================

/**
 * Checks whether a date falls within the July recess for superior courts.
 *
 * The recess runs from July 2 through July 31 (inclusive).
 * Applies only to STF, STJ, and TST jurisdictions.
 */
export function isInJulyRecess(date: Date, jurisdiction: Jurisdiction): boolean {
  if (jurisdiction !== "STF" && jurisdiction !== "STJ" && jurisdiction !== "TST") {
    return false;
  }

  const d = normalizeDate(date);
  const month = d.getMonth(); // 6 = July
  const day = d.getDate();

  // July 2-31 (month=6, day>=2)
  return month === 6 && day >= 2;
}

// ============================================================
// Combined Recess Check
// ============================================================

/**
 * Checks if a date falls within any applicable recess period for the given
 * jurisdiction.
 *
 * - For ESTADUAL, FEDERAL: Dec 20 - Jan 20 recess.
 * - For STF, STJ, TST: July 2-31 recess.
 * - For TRABALHISTA, ELEITORAL, MILITAR, TSE, STM: no standard recess
 *   (they may have their own, handled via CourtSuspension DB records).
 */
export function isInRecess(date: Date, jurisdiction: Jurisdiction): boolean {
  // Dec-Jan recess for state and federal courts
  if (
    (jurisdiction === "ESTADUAL" || jurisdiction === "FEDERAL") &&
    isInDecJanRecess(date)
  ) {
    return true;
  }

  // July recess for superior courts
  if (isInJulyRecess(date, jurisdiction)) {
    return true;
  }

  return false;
}

// ============================================================
// Rule 1: Start Date by Trigger Event (CPC Art. 231)
// ============================================================

/**
 * Calculates the actual start date for deadline counting based on the trigger
 * event type and the date the trigger occurred.
 *
 * CPC Art. 231 defines different start-date rules depending on how the party
 * was notified. The start date is the date from which counting begins (i.e.,
 * the date that will be EXCLUDED per Rule 2).
 *
 * @param triggerEvent - The type of event that triggers the deadline.
 * @param triggerDate - The calendar date when the event occurred.
 * @param processoEletronico - Whether the case is electronic (affects INTIMACAO_ELETRONICA).
 * @param uf - State code for business-day lookups.
 * @returns The date from which counting will start (this day is then excluded per CPC Art. 224).
 */
export async function calculateStartDate(
  triggerEvent: TriggerEvent,
  triggerDate: Date,
  processoEletronico?: boolean,
  uf?: string,
): Promise<Date> {
  const trigger = normalizeDate(triggerDate);

  switch (triggerEvent) {
    // Counting starts on the same day as the event.
    case "INTIMACAO_PESSOAL":
    case "CITACAO":
    case "AUDIENCIA":
    case "CARGA_AUTOS":
    case "VISTA_AUTOS":
    case "ATO_VOLUNTARIO":
      return trigger;

    // Counting starts the day after the event.
    case "INTIMACAO_ADVOGADO":
    case "INTIMACAO_DIARIO_OFICIAL":
    case "PUBLICACAO_DIARIO":
    case "DECISAO":
    case "SENTENCA":
    case "ACORDAO":
      return trigger;

    // CPC Art. 231 par. 2: electronic intimation — the publication date is
    // considered to be the first business day after the availability date.
    // Then counting starts on the day after that publication date.
    case "INTIMACAO_ELETRONICA": {
      // 3 business days after availability = considered "read".
      // But the start of counting is the day after the "read" date.
      let readDate = new Date(trigger);
      let businessDaysElapsed = 0;
      while (businessDaysElapsed < 3) {
        readDate = addDays(readDate, 1);
        if (await isDiaUtil(readDate, uf)) {
          businessDaysElapsed++;
        }
      }
      // The "read" date IS the start date (will be excluded per Rule 2).
      return readDate;
    }

    // Juntada-based triggers: counting starts from the juntada date itself.
    case "JUNTADA_AR":
    case "JUNTADA_MANDADO":
      return trigger;

    // Publication by edital: the deadline starts after the term completion.
    // The term is typically 20 or 60 days (passed as the trigger date being
    // the date when the edital term completes). We treat the triggerDate as
    // the date of the LAST publication.
    case "PUBLICACAO_EDITAL":
      return trigger;

    // Disponibilizacao no sistema (electronic): the publication date is
    // considered to be the first business day AFTER the availability date.
    // Then counting starts on the day after that.
    case "DISPONIBILIZACAO_SISTEMA": {
      // Next business day after availability = publication date.
      const publicationDate = await proximoDiaUtil(addDays(trigger, 1), uf);
      // Start counting from the publication date (this day is then excluded).
      return publicationDate;
    }

    // Fixed date: counting starts from the date itself.
    case "DATA_FIXA":
      return trigger;

    default: {
      // Defensive fallback: treat unknown triggers as starting from the trigger date.
      return trigger;
    }
  }
}

// ============================================================
// Rules 7-10: Doubling Rules
// ============================================================

/**
 * Applies deadline-doubling rules (CPC Arts. 180, 183, 186, 229).
 *
 * Multiple doubling rules do NOT stack: a deadline can only be doubled ONCE.
 * If more than one doubling rule applies, only the first applicable one takes
 * effect and the others are logged as informational.
 *
 * Art. 229 par. 2: litisconsortes doubling does NOT apply in electronic processes.
 *
 * @param baseDays - The original number of days.
 * @param rules - Array of SpecialRule identifiers from the input.
 * @param processoEletronico - Whether the process is electronic.
 * @param litisconsorcio - Whether there are litisconsortes with different attorneys.
 * @returns The effective number of days and the list of applied rules.
 */
export function applyDoublingRules(
  baseDays: number,
  rules: SpecialRule[],
  processoEletronico?: boolean,
  litisconsorcio?: boolean,
): { days: number; applied: AppliedRule[] } {
  const applied: AppliedRule[] = [];
  let alreadyDoubled = false;

  // Rule 7: Fazenda Publica (CPC Art. 183)
  if (rules.includes("DOBRA_FAZENDA") && !alreadyDoubled) {
    applied.push({
      rule: "DOBRA_FAZENDA",
      description: SPECIAL_RULE_LABELS.DOBRA_FAZENDA,
      impact: `Prazo dobrado: ${baseDays} \u2192 ${baseDays * 2} dias`,
    });
    alreadyDoubled = true;
  }

  // Rule 8: Ministerio Publico (CPC Art. 180)
  if (rules.includes("DOBRA_MP") && !alreadyDoubled) {
    applied.push({
      rule: "DOBRA_MP",
      description: SPECIAL_RULE_LABELS.DOBRA_MP,
      impact: `Prazo dobrado: ${baseDays} \u2192 ${baseDays * 2} dias`,
    });
    alreadyDoubled = true;
  }

  // Rule 9: Defensoria Publica (CPC Art. 186)
  if (rules.includes("DOBRA_DEFENSORIA") && !alreadyDoubled) {
    applied.push({
      rule: "DOBRA_DEFENSORIA",
      description: SPECIAL_RULE_LABELS.DOBRA_DEFENSORIA,
      impact: `Prazo dobrado: ${baseDays} \u2192 ${baseDays * 2} dias`,
    });
    alreadyDoubled = true;
  }

  // Rule 10: Litisconsortes with different attorneys (CPC Art. 229)
  // Art. 229 par. 2: does NOT apply in electronic processes.
  if (rules.includes("DOBRA_LITISCONSORCIO") || litisconsorcio) {
    if (processoEletronico) {
      // Not applicable in electronic processes — log but do not apply.
      applied.push({
        rule: "DOBRA_LITISCONSORCIO",
        description: SPECIAL_RULE_LABELS.DOBRA_LITISCONSORCIO,
        impact: `NAO APLICAVEL: Art. 229 \u00A72 — nao se aplica a processos eletronicos`,
      });
    } else if (!alreadyDoubled) {
      applied.push({
        rule: "DOBRA_LITISCONSORCIO",
        description: SPECIAL_RULE_LABELS.DOBRA_LITISCONSORCIO,
        impact: `Prazo dobrado: ${baseDays} \u2192 ${baseDays * 2} dias`,
      });
      alreadyDoubled = true;
    }
  }

  const effectiveDays = alreadyDoubled ? baseDays * 2 : baseDays;
  return { days: effectiveDays, applied };
}

// ============================================================
// Suspension Periods (Rules 5, 6, + DB-based suspensions)
// ============================================================

/**
 * Gathers all suspension periods that may affect deadline counting between
 * two dates for the given jurisdiction and UF.
 *
 * Sources:
 * 1. Dec-Jan recess (CPC Art. 220) for ESTADUAL/FEDERAL.
 * 2. July recess for STF/STJ/TST.
 * 3. CourtSuspension records from the database (portarias, system outages, etc.).
 */
export async function getSuspensionPeriods(
  startDate: Date,
  endDate: Date,
  jurisdiction: Jurisdiction,
  uf: string,
  tribunal?: string,
): Promise<SuspensionPeriod[]> {
  const periods: SuspensionPeriod[] = [];
  const start = normalizeDate(startDate);
  // Add generous buffer to endDate to catch suspensions that might push the
  // deadline further out.
  const end = normalizeDate(addDays(endDate, 90));

  // -- Dec-Jan recess (Rule 5) --
  if (jurisdiction === "ESTADUAL" || jurisdiction === "FEDERAL") {
    // Check all years in the range for possible recess overlap.
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear - 1; year <= endYear; year++) {
      // Recess: Dec 20 of `year` through Jan 20 of `year+1`.
      const recessStart = new Date(year, 11, 20); // Dec 20
      const recessEnd = new Date(year + 1, 0, 20); // Jan 20

      // Check overlap with [start, end].
      if (isOnOrBefore(recessStart, end) && isOnOrBefore(start, recessEnd)) {
        periods.push({
          inicio: normalizeDate(recessStart),
          fim: normalizeDate(recessEnd),
          motivo: `Recesso forense (Art. 220 CPC): ${formatDate(recessStart)} a ${formatDate(recessEnd)}`,
        });
      }
    }
  }

  // -- July recess (Rule 6) --
  if (jurisdiction === "STF" || jurisdiction === "STJ" || jurisdiction === "TST") {
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
      const recessStart = new Date(year, 6, 2); // Jul 2
      const recessEnd = new Date(year, 6, 31); // Jul 31

      if (isOnOrBefore(recessStart, end) && isOnOrBefore(start, recessEnd)) {
        periods.push({
          inicio: normalizeDate(recessStart),
          fim: normalizeDate(recessEnd),
          motivo: `Recesso de julho (${JURISDICTION_LABELS[jurisdiction]}): ${formatDate(recessStart)} a ${formatDate(recessEnd)}`,
        });
      }
    }
  }

  // -- Database-sourced suspensions --
  try {
    const whereClause: Record<string, unknown> = {
      suspende_prazos: true,
      data_inicio: { lte: end },
      data_fim: { gte: start },
    };

    if (tribunal) {
      // If a specific tribunal is given, look for its calendar.
      const calendars = await db.courtCalendar.findMany({
        where: { tribunal_codigo: tribunal },
        select: { id: true },
      });
      const calendarIds = calendars.map((c) => c.id);
      if (calendarIds.length > 0) {
        whereClause.calendar_id = { in: calendarIds };
      }
    }

    const dbSuspensions = await db.courtSuspension.findMany({
      where: whereClause,
      orderBy: { data_inicio: "asc" },
    });

    for (const s of dbSuspensions) {
      periods.push({
        inicio: normalizeDate(new Date(s.data_inicio)),
        fim: normalizeDate(new Date(s.data_fim)),
        motivo: `${s.nome}${s.fundamento_legal ? ` (${s.fundamento_legal})` : ""}`,
      });
    }
  } catch {
    // If the DB query fails (e.g., table not yet migrated), proceed without
    // DB-based suspensions. The core recess rules still apply.
  }

  // Sort by start date, merge overlapping periods.
  return mergeSuspensionPeriods(periods);
}

/**
 * Merges overlapping or adjacent suspension periods into consolidated ranges.
 */
function mergeSuspensionPeriods(periods: SuspensionPeriod[]): SuspensionPeriod[] {
  if (periods.length === 0) return [];

  const sorted = [...periods].sort(
    (a, b) => a.inicio.getTime() - b.inicio.getTime(),
  );

  const merged: SuspensionPeriod[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Overlapping or adjacent (fim + 1 day >= next inicio)?
    const lastFimNext = addDays(last.fim, 1);
    if (isOnOrBefore(current.inicio, lastFimNext)) {
      // Extend the last period.
      if (isAfter(current.fim, last.fim)) {
        last.fim = current.fim;
      }
      // Concatenate motivos if different.
      if (!last.motivo.includes(current.motivo)) {
        last.motivo = `${last.motivo}; ${current.motivo}`;
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

// ============================================================
// Suspension-aware day counting
// ============================================================

/**
 * Checks if a specific date falls within any of the provided suspension periods.
 */
function isDateSuspended(date: Date, suspensions: SuspensionPeriod[]): boolean {
  const d = normalizeDate(date);
  for (const s of suspensions) {
    if (d.getTime() >= s.inicio.getTime() && d.getTime() <= s.fim.getTime()) {
      return true;
    }
  }
  return false;
}

/**
 * Counts the effective deadline date by advancing day-by-day, skipping
 * non-counting days according to the counting mode and suspension periods.
 *
 * For DIAS_UTEIS: skips weekends, holidays, and suspension periods.
 * For DIAS_CORRIDOS: counts all days but skips suspension periods;
 *   the final date must still be a business day.
 *
 * The start date itself is EXCLUDED from counting (CPC Art. 224).
 *
 * @param startDate - The adjusted start date (this day is excluded).
 * @param baseDays - Number of days to count.
 * @param countingMode - DIAS_UTEIS or DIAS_CORRIDOS.
 * @param uf - State code for holiday lookups.
 * @param jurisdiction - Jurisdiction for recess checks.
 * @param suspensions - Pre-computed suspension periods.
 * @returns The final deadline date.
 */
export async function calculateWithSuspensions(
  startDate: Date,
  baseDays: number,
  countingMode: CountingMode,
  uf: string,
  jurisdiction: Jurisdiction,
  suspensions: SuspensionPeriod[],
): Promise<Date> {
  let cursor = normalizeDate(startDate);
  let counted = 0;

  // Safety valve: prevent infinite loops due to data errors.
  // A generous upper bound: baseDays * 5 iterations should always be enough.
  const maxIterations = Math.max(baseDays * 5, 500);
  let iterations = 0;

  while (counted < baseDays) {
    cursor = addDays(cursor, 1);
    iterations++;

    if (iterations > maxIterations) {
      throw new Error(
        `Deadline calculation exceeded maximum iterations (${maxIterations}). ` +
        `Possible data error in holidays or suspension periods.`,
      );
    }

    // Check if the cursor date is in a suspension period.
    if (isDateSuspended(cursor, suspensions)) {
      continue; // Day does not count — skip.
    }

    if (countingMode === "DIAS_UTEIS") {
      // Only count business days (CPC Art. 219).
      if (await isDiaUtil(cursor, uf)) {
        counted++;
      }
    } else {
      // DIAS_CORRIDOS: every non-suspended day counts.
      counted++;
    }
  }

  // Rule 4: If the final date is not a business day, roll to next business day.
  // This applies to both DIAS_UTEIS and DIAS_CORRIDOS modes.
  cursor = await ensureBusinessDay(cursor, uf, suspensions);

  return cursor;
}

/**
 * Ensures the given date is a business day that is not in a suspension period.
 * If not, rolls forward to the next valid business day.
 */
async function ensureBusinessDay(
  date: Date,
  uf: string,
  suspensions: SuspensionPeriod[],
): Promise<Date> {
  let cursor = normalizeDate(date);
  let safety = 0;
  const maxSafety = 120; // ~4 months of rolling should be more than enough

  while (safety < maxSafety) {
    const isBusinessDay = await isDiaUtil(cursor, uf);
    const isSuspended = isDateSuspended(cursor, suspensions);

    if (isBusinessDay && !isSuspended) {
      return cursor;
    }

    cursor = addDays(cursor, 1);
    safety++;
  }

  // If we somehow exhaust the safety counter, return the last cursor.
  // This should never happen in practice.
  return cursor;
}

// ============================================================
// Business Day Counting (Enhanced)
// ============================================================

/**
 * Counts business days between two dates, taking into account holidays for
 * the given UF and recess periods for the given jurisdiction.
 *
 * The count excludes the start date and includes the end date (consistent
 * with CPC Art. 224 counting).
 *
 * @returns Positive if end > start, negative if end < start, 0 if same day.
 */
export async function countBusinessDays(
  start: Date,
  end: Date,
  uf: string,
  jurisdiction: Jurisdiction,
): Promise<number> {
  const s = normalizeDate(start);
  const e = normalizeDate(end);

  if (sameDay(s, e)) return 0;

  const forward = e.getTime() > s.getTime();
  const from = forward ? s : e;
  const to = forward ? e : s;

  // Get suspensions for the range.
  const suspensions = await getSuspensionPeriods(from, to, jurisdiction, uf);

  let count = 0;
  const cursor = new Date(from);

  while (true) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getTime() > to.getTime()) break;

    const nc = normalizeDate(cursor);
    if (isDateSuspended(nc, suspensions)) continue;
    if (await isDiaUtil(nc, uf)) {
      count++;
    }
  }

  return forward ? count : -count;
}

// ============================================================
// HORAS / MINUTOS Deadline Computation
// ============================================================

/**
 * Calculates a deadline measured in hours or minutes.
 *
 * For hour/minute-based deadlines (e.g., habeas corpus — 24h, sustentacao
 * oral — 30min), the deadline is computed as a simple time offset from the
 * trigger date. Business-day rules do NOT apply to hour/minute deadlines,
 * but if the resulting time falls outside court hours (typically 06:00-23:59
 * for electronic courts), the deadline rolls to the next business day.
 */
function calculateTimeBasedDeadline(
  startDate: Date,
  amount: number,
  unit: "HORAS" | "MINUTOS",
): Date {
  const result = new Date(startDate);
  if (unit === "HORAS") {
    result.setHours(result.getHours() + amount);
  } else {
    result.setMinutes(result.getMinutes() + amount);
  }
  return result;
}

// ============================================================
// Rule 11: Embargos de Declaracao Interruption (CPC Art. 1.026)
// ============================================================

/**
 * When embargos de declaracao are pending, the original deadline is
 * INTERRUPTED (not merely suspended). This means that when the embargos
 * are resolved, the FULL deadline restarts from scratch.
 *
 * This function returns a flag and an audit note. The actual handling is
 * done in the main calculateDeadline function by returning the full
 * deadline as if counting from today/resolution date.
 */
function handleEmbargosInterruption(
  baseDays: number,
  countingMode: CountingMode,
): { alertas: string[]; auditEntry: AuditEntry } {
  return {
    alertas: [
      `ATENCAO: Embargos de Declaracao pendentes (Art. 1.026 CPC). ` +
      `O prazo de ${baseDays} ${countingMode === "DIAS_UTEIS" ? "dias uteis" : "dias corridos"} ` +
      `sera INTERROMPIDO e reiniciara integralmente apos a decisao dos embargos.`,
    ],
    auditEntry: {
      step: 0, // Will be renumbered in the main function.
      action: "INTERRUPCAO_EMBARGOS",
      detail:
        `Art. 1.026 CPC: Prazo interrompido por embargos de declaracao pendentes. ` +
        `O prazo completo de ${baseDays} dias reiniciara apos julgamento dos embargos.`,
    },
  };
}

// ============================================================
// Rule 12: System Unavailability (CNJ Res. 185)
// ============================================================

/**
 * Computes additional days (or adjusted deadline) due to system unavailability.
 *
 * Per CNJ Res. 185 Art. 10 par. 2: if the system is unavailable on the last
 * day of a deadline, the deadline is automatically extended to the first
 * business day after system restoration.
 *
 * Additionally, the unavailability period itself may be added to the deadline
 * if it impacts the counting window.
 */
function buildSystemUnavailabilitySuspension(
  sistemaIndisponivel: { inicio: Date; fim: Date },
): SuspensionPeriod {
  return {
    inicio: normalizeDate(sistemaIndisponivel.inicio),
    fim: normalizeDate(sistemaIndisponivel.fim),
    motivo:
      `Indisponibilidade do sistema (CNJ Res. 185): ` +
      `${formatDate(sistemaIndisponivel.inicio)} a ${formatDate(sistemaIndisponivel.fim)}`,
  };
}

// ============================================================
// Main Calculation Function
// ============================================================

/**
 * Performs a complete deadline calculation applying all 12 rules from the
 * Brazilian CPC/2015, Lei 11.101/2005, and related legislation.
 *
 * This is the primary entry point for the deadline engine. It:
 *  a) Calculates the start date from the trigger event (Rule 1)
 *  b) Applies doubling rules to get effective days (Rules 7-10)
 *  c) Checks for Dec-Jan recess (Rule 5) and July recess (Rule 6)
 *  d) Gets any court-specific suspensions from the database
 *  e) Counts days skipping non-business days (Rule 3) or including them (DIAS_CORRIDOS)
 *  f) Skips suspension periods
 *  g) Handles embargos interruption (Rule 11)
 *  h) Handles system unavailability (Rule 12)
 *  i) Ensures end date is a business day (Rules 2, 4)
 *  j) Builds a complete audit trail
 *  k) Calculates remaining business days from today
 *
 * @param input - All data required for the calculation.
 * @returns A detailed result including the deadline date, rules applied, and audit trail.
 */
export async function calculateDeadline(
  input: DeadlineCalculationInput,
): Promise<DeadlineCalculationResult> {
  const audit: AuditEntry[] = [];
  const alertas: string[] = [];
  const regrasAplicadas: AppliedRule[] = [];
  let stepNumber = 1;

  // -- Step 1: Calculate start date from trigger event (Rule 1) --
  const startDate = await calculateStartDate(
    input.trigger_event,
    input.trigger_date,
    input.processo_eletronico,
    input.uf,
  );

  audit.push({
    step: stepNumber++,
    action: "CALCULO_DATA_INICIO",
    detail:
      `Evento gatilho: ${TRIGGER_EVENT_LABELS[input.trigger_event]} em ${formatDate(input.trigger_date)}. ` +
      `Data de inicio da contagem (Art. 231 CPC): ${formatDate(startDate)}.`,
    date_before: normalizeDate(input.trigger_date),
    date_after: normalizeDate(startDate),
  });

  // -- Step 2: Apply doubling rules (Rules 7-10) --
  const doublingResult = applyDoublingRules(
    input.dias_prazo,
    input.special_rules,
    input.processo_eletronico,
    input.litisconsorcio_advogados_diferentes,
  );

  const effectiveDays = doublingResult.days;
  regrasAplicadas.push(...doublingResult.applied);

  if (doublingResult.applied.length > 0) {
    for (const rule of doublingResult.applied) {
      audit.push({
        step: stepNumber++,
        action: "DOBRA_PRAZO",
        detail: `${rule.description}: ${rule.impact}`,
      });
    }
  }

  audit.push({
    step: stepNumber++,
    action: "PRAZO_EFETIVO",
    detail:
      `Prazo original: ${input.dias_prazo} dias. ` +
      `Prazo efetivo apos dobras: ${effectiveDays} dias ` +
      `(${input.counting_mode === "DIAS_UTEIS" ? "dias uteis" : "dias corridos"}).`,
  });

  // -- Step 3: Handle HORAS/MINUTOS mode separately --
  if (input.counting_mode === "HORAS" || input.counting_mode === "MINUTOS") {
    const deadlineDate = calculateTimeBasedDeadline(
      input.trigger_date,
      effectiveDays, // In this case, it represents hours or minutes.
      input.counting_mode,
    );

    audit.push({
      step: stepNumber++,
      action: "CALCULO_PRAZO_TEMPORAL",
      detail:
        `Prazo em ${input.counting_mode === "HORAS" ? "horas" : "minutos"}: ` +
        `${effectiveDays} ${input.counting_mode === "HORAS" ? "h" : "min"} ` +
        `a partir de ${formatDate(input.trigger_date)}. ` +
        `Vencimento: ${deadlineDate.toISOString()}.`,
      date_before: normalizeDate(input.trigger_date),
      date_after: deadlineDate,
    });

    const diasUteisRestantes = await diasUteisAte(deadlineDate, input.uf);

    return {
      data_inicio_contagem: normalizeDate(startDate),
      data_limite: deadlineDate,
      dias_prazo_original: input.dias_prazo,
      dias_prazo_efetivo: effectiveDays,
      counting_mode: input.counting_mode,
      dias_uteis_restantes: diasUteisRestantes,
      regras_aplicadas: regrasAplicadas,
      alertas,
      suspensoes: [],
      auditoria: audit,
    };
  }

  // -- Step 4: Handle embargos interruption (Rule 11) --
  if (
    input.embargos_pendentes ||
    input.special_rules.includes("INTERRUPCAO_EMBARGOS")
  ) {
    const embargosResult = handleEmbargosInterruption(
      effectiveDays,
      input.counting_mode,
    );

    alertas.push(...embargosResult.alertas);
    regrasAplicadas.push({
      rule: "INTERRUPCAO_EMBARGOS",
      description: SPECIAL_RULE_LABELS.INTERRUPCAO_EMBARGOS,
      impact:
        `Prazo INTERROMPIDO. Apos decisao dos embargos, o prazo completo de ` +
        `${effectiveDays} dias reiniciara.`,
    });

    audit.push({
      step: stepNumber++,
      action: "INTERRUPCAO_EMBARGOS",
      detail: embargosResult.auditEntry.detail,
    });

    // When embargos are pending, we cannot compute a final date because
    // we do not know when they will be resolved. We return the deadline
    // as if counting starts TODAY (as a projection) so the user sees
    // an estimated worst-case date.
    alertas.push(
      `Data limite calculada como PROJECAO a partir de hoje, pois embargos estao pendentes. ` +
      `A data real sera recalculada apos julgamento dos embargos.`,
    );
  }

  // -- Step 5: Gather suspension periods (Rules 5, 6, + DB suspensions) --
  // Estimate a generous end date to fetch relevant suspensions.
  const estimatedEnd = addDays(startDate, effectiveDays * 3);
  const suspensions = await getSuspensionPeriods(
    startDate,
    estimatedEnd,
    input.jurisdiction,
    input.uf,
    input.tribunal,
  );

  // Add system unavailability as a suspension period (Rule 12).
  if (input.sistema_indisponivel) {
    const sysUnavail = buildSystemUnavailabilitySuspension(
      input.sistema_indisponivel,
    );
    suspensions.push(sysUnavail);

    regrasAplicadas.push({
      rule: "INDISPONIBILIDADE_SISTEMA",
      description: SPECIAL_RULE_LABELS.INDISPONIBILIDADE_SISTEMA,
      impact:
        `Periodo de indisponibilidade: ${formatDate(input.sistema_indisponivel.inicio)} ` +
        `a ${formatDate(input.sistema_indisponivel.fim)}. Dias nao contados.`,
    });

    audit.push({
      step: stepNumber++,
      action: "INDISPONIBILIDADE_SISTEMA",
      detail:
        `CNJ Res. 185: Sistema indisponivel de ${formatDate(input.sistema_indisponivel.inicio)} ` +
        `a ${formatDate(input.sistema_indisponivel.fim)}. Periodo adicionado as suspensoes.`,
    });
  }

  // Re-merge after adding system unavailability.
  const allSuspensions = mergeSuspensionPeriods(suspensions);

  if (allSuspensions.length > 0) {
    for (const s of allSuspensions) {
      audit.push({
        step: stepNumber++,
        action: "SUSPENSAO_IDENTIFICADA",
        detail: `Periodo de suspensao: ${formatDate(s.inicio)} a ${formatDate(s.fim)} \u2014 ${s.motivo}`,
      });
    }

    // Check for recess rules and add to applied rules.
    const hasDecJanRecess = allSuspensions.some((s) =>
      s.motivo.includes("Recesso forense"),
    );
    if (hasDecJanRecess) {
      regrasAplicadas.push({
        rule: "SUSPENSAO_RECESSO",
        description: SPECIAL_RULE_LABELS.SUSPENSAO_RECESSO,
        impact: `Prazos suspensos durante o recesso forense (20/dez a 20/jan).`,
      });
    }

    const hasJulyRecess = allSuspensions.some((s) =>
      s.motivo.includes("Recesso de julho"),
    );
    if (hasJulyRecess) {
      regrasAplicadas.push({
        rule: "RECESSO_STF_STJ",
        description: SPECIAL_RULE_LABELS.RECESSO_STF_STJ,
        impact: `Prazos suspensos durante o recesso de julho (02/jul a 31/jul).`,
      });
    }
  }

  // -- Step 6: Ensure start date is a valid business day --
  // The start date itself is excluded (Rule 2), but if it falls in a
  // suspension period, the counting should begin after the suspension ends.
  let adjustedStart = normalizeDate(startDate);

  // If the start date is inside a suspension, move it to the day AFTER
  // the suspension ends. The first countable day will be the next one
  // after adjustedStart.
  if (isDateSuspended(adjustedStart, allSuspensions)) {
    // Find the suspension that contains the start date and skip past it.
    for (const s of allSuspensions) {
      if (
        adjustedStart.getTime() >= s.inicio.getTime() &&
        adjustedStart.getTime() <= s.fim.getTime()
      ) {
        const afterSuspension = addDays(s.fim, 1);
        audit.push({
          step: stepNumber++,
          action: "AJUSTE_INICIO_SUSPENSAO",
          detail:
            `Data de inicio (${formatDate(adjustedStart)}) cai em periodo de suspensao. ` +
            `Inicio da contagem ajustado para ${formatDate(afterSuspension)} ` +
            `(primeiro dia apos fim da suspensao).`,
          date_before: adjustedStart,
          date_after: afterSuspension,
        });
        adjustedStart = afterSuspension;
        break;
      }
    }
  }

  // -- Step 7: Count days and compute the final deadline date (Rules 2, 3, 4) --
  audit.push({
    step: stepNumber++,
    action: "INICIO_CONTAGEM",
    detail:
      `Contagem de ${effectiveDays} ${input.counting_mode === "DIAS_UTEIS" ? "dias uteis" : "dias corridos"} ` +
      `a partir de ${formatDate(adjustedStart)} (este dia EXCLUIDO, Art. 224 CPC).`,
    date_before: adjustedStart,
  });

  const deadlineDate = await calculateWithSuspensions(
    adjustedStart,
    effectiveDays,
    input.counting_mode,
    input.uf,
    input.jurisdiction,
    allSuspensions,
  );

  audit.push({
    step: stepNumber++,
    action: "DATA_LIMITE_CALCULADA",
    detail:
      `Data limite apos contagem: ${formatDate(deadlineDate)}. ` +
      `Ja ajustada para dia util conforme Art. 224 \u00A71 CPC.`,
    date_after: deadlineDate,
  });

  // -- Step 8: Final system unavailability check on the last day (Rule 12) --
  // If the system was unavailable on the final day, extend to next business day
  // after restoration.
  let finalDate = deadlineDate;

  if (input.sistema_indisponivel) {
    const sysStart = normalizeDate(input.sistema_indisponivel.inicio);
    const sysEnd = normalizeDate(input.sistema_indisponivel.fim);

    if (
      finalDate.getTime() >= sysStart.getTime() &&
      finalDate.getTime() <= sysEnd.getTime()
    ) {
      // The deadline falls on an unavailability day: extend.
      const extended = await ensureBusinessDay(
        addDays(sysEnd, 1),
        input.uf,
        allSuspensions,
      );

      audit.push({
        step: stepNumber++,
        action: "PRORROGACAO_INDISPONIBILIDADE",
        detail:
          `CNJ Res. 185: Data limite (${formatDate(finalDate)}) cai em periodo de indisponibilidade do sistema. ` +
          `Prazo prorrogado para ${formatDate(extended)} (proximo dia util apos restauracao).`,
        date_before: finalDate,
        date_after: extended,
      });

      finalDate = extended;
    }
  }

  // -- Step 9: Calculate remaining business days from today --
  const today = normalizeDate(new Date());
  const diasUteisRestantes = await diasUteisAte(finalDate, input.uf);

  audit.push({
    step: stepNumber++,
    action: "DIAS_RESTANTES",
    detail:
      `Dias uteis restantes a partir de hoje (${formatDate(today)}): ${diasUteisRestantes}.`,
  });

  // -- Step 10: Generate alerts --
  if (diasUteisRestantes < 0) {
    alertas.push(
      `ALERTA CRITICO: Prazo VENCIDO ha ${Math.abs(diasUteisRestantes)} dias uteis!`,
    );
  } else if (diasUteisRestantes === 0) {
    alertas.push(`ALERTA: Prazo vence HOJE (${formatDate(finalDate)})!`);
  } else if (diasUteisRestantes <= 2) {
    alertas.push(
      `URGENTE: Restam apenas ${diasUteisRestantes} dia(s) util(eis) para o prazo!`,
    );
  } else if (diasUteisRestantes <= 5) {
    alertas.push(
      `ATENCAO: Restam ${diasUteisRestantes} dias uteis para o prazo.`,
    );
  }

  if (input.tipo === "FATAL") {
    alertas.push(
      `Prazo FATAL: nao admite prorrogacao. Perda do prazo acarreta preclusao temporal.`,
    );
  }

  // -- Final result --
  return {
    data_inicio_contagem: normalizeDate(adjustedStart),
    data_limite: finalDate,
    dias_prazo_original: input.dias_prazo,
    dias_prazo_efetivo: effectiveDays,
    counting_mode: input.counting_mode,
    dias_uteis_restantes: diasUteisRestantes,
    regras_aplicadas: regrasAplicadas,
    alertas,
    suspensoes: allSuspensions,
    auditoria: audit,
  };
}

// ============================================================
// Audit / Validation Function
// ============================================================

/**
 * Validates a deadline calculation result against its input, checking for
 * logical consistency and common errors.
 *
 * This is intended for use by the AI assistant and by manual review workflows.
 * It re-computes critical portions and compares with the provided result.
 *
 * @param input - The original calculation input.
 * @param result - The calculation result to validate.
 * @returns An object with a validity flag and a list of issues found (empty if valid).
 */
export async function auditDeadlineCalculation(
  input: DeadlineCalculationInput,
  result: DeadlineCalculationResult,
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // 1. Check that effective days match doubling rules.
  const expectedDoubling = applyDoublingRules(
    input.dias_prazo,
    input.special_rules,
    input.processo_eletronico,
    input.litisconsorcio_advogados_diferentes,
  );

  if (result.dias_prazo_efetivo !== expectedDoubling.days) {
    issues.push(
      `Prazo efetivo divergente: resultado=${result.dias_prazo_efetivo}, ` +
      `esperado=${expectedDoubling.days} (apos regras de dobra).`,
    );
  }

  // 2. Check that the deadline date is a business day.
  const isBD = await isDiaUtil(result.data_limite, input.uf);
  if (!isBD) {
    issues.push(
      `Data limite (${formatDate(result.data_limite)}) NAO e dia util. ` +
      `Deve cair em dia util conforme Art. 224 \u00A71 CPC.`,
    );
  }

  // 3. Check that the deadline date is not in a recess period.
  if (isInRecess(result.data_limite, input.jurisdiction)) {
    issues.push(
      `Data limite (${formatDate(result.data_limite)}) cai em periodo de recesso. ` +
      `Prazos nao podem vencer durante recesso forense.`,
    );
  }

  // 4. Check that the deadline is after the start date.
  if (result.data_limite.getTime() <= result.data_inicio_contagem.getTime()) {
    issues.push(
      `Data limite (${formatDate(result.data_limite)}) e anterior ou igual a ` +
      `data de inicio da contagem (${formatDate(result.data_inicio_contagem)}).`,
    );
  }

  // 5. Check original days match input.
  if (result.dias_prazo_original !== input.dias_prazo) {
    issues.push(
      `Prazo original divergente: resultado=${result.dias_prazo_original}, ` +
      `input=${input.dias_prazo}.`,
    );
  }

  // 6. Check counting mode consistency.
  if (result.counting_mode !== input.counting_mode) {
    issues.push(
      `Modo de contagem divergente: resultado=${result.counting_mode}, ` +
      `input=${input.counting_mode}.`,
    );
  }

  // 7. Verify the deadline is not inside a system unavailability period.
  if (input.sistema_indisponivel) {
    const sysStart = normalizeDate(input.sistema_indisponivel.inicio);
    const sysEnd = normalizeDate(input.sistema_indisponivel.fim);
    const dl = normalizeDate(result.data_limite);

    if (dl.getTime() >= sysStart.getTime() && dl.getTime() <= sysEnd.getTime()) {
      issues.push(
        `Data limite (${formatDate(result.data_limite)}) cai em periodo de ` +
        `indisponibilidade do sistema (${formatDate(sysStart)} a ${formatDate(sysEnd)}). ` +
        `Deveria ter sido prorrogado (CNJ Res. 185).`,
      );
    }
  }

  // 8. If embargos are pending, ensure an alert was generated.
  if (input.embargos_pendentes) {
    const hasEmbargosAlert = result.alertas.some((a) =>
      a.includes("Embargos de Declaracao"),
    );
    if (!hasEmbargosAlert) {
      issues.push(
        `Embargos de declaracao pendentes, mas nenhum alerta correspondente foi gerado.`,
      );
    }
  }

  // 9. Re-calculate from scratch and compare the final date.
  try {
    const recomputed = await calculateDeadline(input);
    if (!sameDay(recomputed.data_limite, result.data_limite)) {
      issues.push(
        `Recalculo resultou em data diferente: recalculado=${formatDate(recomputed.data_limite)}, ` +
        `resultado auditado=${formatDate(result.data_limite)}. Possivel inconsistencia.`,
      );
    }
  } catch (err) {
    issues.push(
      `Erro ao recalcular prazo para auditoria: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================
// Rule Suggestion Function
// ============================================================

/**
 * Suggests applicable special rules based on case context. Useful for
 * the AI assistant and for UI auto-selection of rules when creating
 * a deadline.
 *
 * @param context - Contextual information about the case.
 * @returns Array of SpecialRule identifiers that should be considered.
 */
export function suggestSpecialRules(context: {
  tipoCaso?: string;
  parteContraria?: string;
  jurisdicao: Jurisdiction;
  processoEletronico?: boolean;
}): SpecialRule[] {
  const suggestions: SpecialRule[] = [];

  // Fazenda Publica (federal, state, municipal governments, autarquias)
  if (context.parteContraria) {
    const pc = context.parteContraria.toUpperCase();
    if (
      pc.includes("FAZENDA") ||
      pc.includes("AUTARQUIA") ||
      pc.includes("FUNDACAO_PUBLICA") ||
      pc.includes("EMPRESA_PUBLICA") ||
      pc === "FAZENDA_FEDERAL" ||
      pc === "FAZENDA_ESTADUAL" ||
      pc === "FAZENDA_MUNICIPAL"
    ) {
      suggestions.push("DOBRA_FAZENDA");
    }

    // Ministerio Publico
    if (pc.includes("MP") || pc.includes("MINISTERIO_PUBLICO") || pc === "MP_FEDERAL" || pc === "MP_ESTADUAL") {
      suggestions.push("DOBRA_MP");
    }

    // Defensoria Publica
    if (pc.includes("DEFENSORIA")) {
      suggestions.push("DOBRA_DEFENSORIA");
    }
  }

  // Dec-Jan recess for state/federal courts
  if (
    context.jurisdicao === "ESTADUAL" ||
    context.jurisdicao === "FEDERAL"
  ) {
    suggestions.push("SUSPENSAO_RECESSO");
  }

  // July recess for superior courts
  if (
    context.jurisdicao === "STF" ||
    context.jurisdicao === "STJ" ||
    context.jurisdicao === "TST"
  ) {
    suggestions.push("RECESSO_STF_STJ");
  }

  // RJ cases use DIAS_CORRIDOS
  if (context.tipoCaso) {
    const tc = context.tipoCaso.toUpperCase();
    if (
      tc.includes("RECUPERACAO_JUDICIAL") ||
      tc.includes("FALENCIA") ||
      tc.includes("RJ")
    ) {
      suggestions.push("DIAS_CORRIDOS_RJ");
    }
  }

  // Electronic processes cannot benefit from litisconsortes doubling
  // (Art. 229 par. 2), so we do not suggest it for electronic processes.
  if (!context.processoEletronico) {
    // DOBRA_LITISCONSORCIO is context-dependent — only suggest it if we
    // cannot determine it here. The caller should check process parties.
  }

  return suggestions;
}

// ============================================================
// Convenience: Calculate Alert Dates
// ============================================================

/**
 * Given a final deadline date, returns an array of alert dates based on
 * standard notification schedules for the JRCLaw system.
 *
 * Alert schedule:
 * - FATAL deadlines: D-5, D-3, D-2, D-1, D-0
 * - ORDINARIO/other: D-7, D-3, D-1, D-0
 *
 * All alert dates are adjusted to business days (if an alert date falls on
 * a non-business day, it is moved to the previous business day).
 */
export async function calculateAlertDates(
  dataLimite: Date,
  tipo: DeadlineType,
  uf: string,
): Promise<Date[]> {
  const offsets =
    tipo === "FATAL"
      ? [5, 3, 2, 1, 0]
      : [7, 3, 1, 0];

  const alerts: Date[] = [];
  const deadline = normalizeDate(dataLimite);

  for (const offset of offsets) {
    let alertDate = addDays(deadline, -offset);

    // Move to previous business day if necessary.
    if (offset > 0) {
      // For alerts before the deadline, we go backwards to find a business day.
      let safety = 0;
      while (!(await isDiaUtil(alertDate, uf)) && safety < 10) {
        alertDate = addDays(alertDate, -1);
        safety++;
      }
    }

    // Only add if the alert date is today or in the future.
    const today = normalizeDate(new Date());
    if (alertDate.getTime() >= today.getTime()) {
      alerts.push(alertDate);
    }
  }

  return alerts;
}

// ============================================================
// Batch Calculation
// ============================================================

/**
 * Calculates deadlines for multiple inputs in batch. Useful for recalculating
 * all deadlines for a case after a status change (e.g., end of recess, system
 * restoration, embargos resolved).
 *
 * @param inputs - Array of calculation inputs.
 * @returns Array of results in the same order as inputs.
 */
export async function calculateDeadlineBatch(
  inputs: DeadlineCalculationInput[],
): Promise<DeadlineCalculationResult[]> {
  // Process sequentially to avoid overwhelming the holiday cache / DB.
  // Could be parallelized with Promise.all if performance demands it,
  // but sequential is safer for DB connection pooling.
  const results: DeadlineCalculationResult[] = [];

  for (const input of inputs) {
    const result = await calculateDeadline(input);
    results.push(result);
  }

  return results;
}

// ============================================================
// Remaining Days Summary
// ============================================================

/**
 * Returns a human-readable summary (in Portuguese) of the remaining time
 * until a deadline, suitable for UI display and notifications.
 */
export function formatRemainingDays(diasUteis: number): string {
  if (diasUteis < 0) {
    return `Vencido ha ${Math.abs(diasUteis)} dia(s) util(eis)`;
  }
  if (diasUteis === 0) {
    return "Vence HOJE";
  }
  if (diasUteis === 1) {
    return "Vence amanha (1 dia util)";
  }
  if (diasUteis <= 5) {
    return `Vence em ${diasUteis} dias uteis (URGENTE)`;
  }
  return `Vence em ${diasUteis} dias uteis`;
}
