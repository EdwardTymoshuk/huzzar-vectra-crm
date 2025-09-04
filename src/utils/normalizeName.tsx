/**
 * Normalize a full name by:
 * - Removing role annotations like "(Technik)"
 * - Trimming spaces
 * - Lowercasing
 * - Reordering to "first last" regardless of input
 * - Sorting alphabetically to tolerate order
 */
export function normalizeName(raw: string): string {
  if (!raw) return ''

  // Remove anything in parentheses
  let cleaned = raw.replace(/\([^)]*\)/g, '')

  // Remove multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  // Lowercase and split
  const parts = cleaned.toLowerCase().split(' ')

  // Remove short garbage
  const valid = parts.filter((p) => p.length > 1)

  // Sort alphabetically so both "piotr gierszewski" and "gierszewski piotr" are equal
  return valid.sort().join(' ')
}
