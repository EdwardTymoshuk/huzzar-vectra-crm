/**
 * parseLocalDate
 * ---------------------------------------------------------
 * Parses a YYYY-MM-DD string into a Date object **in local timezone**
 * without timezone shift (e.g. UTC conversion).
 *
 * We intentionally set 12:00 to avoid DST edge cases.
 * PostgreSQL stores only the DATE part, so the hour is irrelevant.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)

  // Local timezone, not UTC → prevents shifting one day earlier
  return new Date(year, month - 1, day, 12, 0, 0)
}
