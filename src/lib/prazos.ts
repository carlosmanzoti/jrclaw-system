import { getHolidays } from "@/lib/holidays";

/**
 * Checks whether a date is a business day (not weekend or holiday).
 * CPC art. 219: business days exclude Saturdays, Sundays, and holidays.
 */
export async function isDiaUtil(date: Date, uf?: string | null): Promise<boolean> {
  const day = date.getDay();
  // Saturday = 6, Sunday = 0
  if (day === 0 || day === 6) return false;

  const holidays = await getHolidays(date.getFullYear(), uf);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return !holidays.has(key);
}

/**
 * Calculates a deadline date from a start date adding N business days.
 * CPC art. 219: the start day is excluded, the end day is included.
 * If the end day falls on a non-business day, it rolls to the next business day.
 */
export async function calcularPrazo(
  dataInicio: Date,
  dias: number,
  uf?: string | null
): Promise<Date> {
  const result = new Date(dataInicio);
  result.setHours(0, 0, 0, 0);

  let counted = 0;
  while (counted < dias) {
    result.setDate(result.getDate() + 1);
    if (await isDiaUtil(result, uf)) {
      counted++;
    }
  }

  // If the final day is not a business day (shouldn't happen with the loop above,
  // but just in case), roll forward
  while (!(await isDiaUtil(result, uf))) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Counts the number of business days between today and a future date.
 * Returns negative if the date is in the past.
 */
export async function diasUteisAte(dataFim: Date, uf?: string | null): Promise<number> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim);
  fim.setHours(0, 0, 0, 0);

  if (fim.getTime() === hoje.getTime()) return 0;

  const isForward = fim.getTime() > hoje.getTime();
  const start = isForward ? new Date(hoje) : new Date(fim);
  const end = isForward ? new Date(fim) : new Date(hoje);

  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor.getTime() <= end.getTime()) {
    if (await isDiaUtil(cursor, uf)) {
      count++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return isForward ? count : -count;
}

/**
 * Returns the next business day on or after the given date.
 */
export async function proximoDiaUtil(date: Date, uf?: string | null): Promise<Date> {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  while (!(await isDiaUtil(result, uf))) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}
