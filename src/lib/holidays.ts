import { db } from "@/lib/db";

// Cache holidays per year+uf to avoid repeated DB queries
const cache = new Map<string, Set<string>>();

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fetches holidays applicable to a given state (UF).
 * Returns national holidays + state-specific holidays.
 */
export async function getHolidays(year: number, uf?: string | null): Promise<Set<string>> {
  const key = `${year}-${uf || "ALL"}`;
  if (cache.has(key)) return cache.get(key)!;

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);

  const holidays = await db.holiday.findMany({
    where: {
      data: { gte: startOfYear, lte: endOfYear },
      OR: [
        { tipo: "NACIONAL" },
        ...(uf ? [{ tipo: "ESTADUAL", uf }] : []),
      ],
    },
    select: { data: true },
  });

  const set = new Set<string>(holidays.map((h) => dateKey(new Date(h.data))));
  cache.set(key, set);

  // Expire cache after 5 min
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);

  return set;
}

/**
 * Checks if a date is a holiday for the given UF.
 */
export async function isHoliday(date: Date, uf?: string | null): Promise<boolean> {
  const holidays = await getHolidays(date.getFullYear(), uf);
  return holidays.has(dateKey(date));
}

/**
 * Clears the holiday cache (useful after seeding).
 */
export function clearHolidayCache(): void {
  cache.clear();
}
