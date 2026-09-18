// Pure — no expo-sqlite import, unit tested directly.

// The `decategorized_months` setting: a JSON array of 'YYYY-MM' for which
// the built-in patterns are switched off (the user's own rules still apply).
export function parseMonths(raw: string | null): string[] {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((m): m is string => typeof m === 'string') : [];
  } catch {
    return [];
  }
}

export const addMonth = (months: string[], month: string): string[] =>
  months.includes(month) ? months : [...months, month];

export const removeMonth = (months: string[], month: string): string[] => months.filter((m) => m !== month);
