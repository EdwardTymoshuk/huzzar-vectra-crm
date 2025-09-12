/**
 * normalizeName:
 * - Remove "(...)" annotations (roles, groups)
 * - Collapse whitespace, trim
 * - Lowercase
 * - Strip diacritics for robust matching
 * - Split to tokens and sort alphabetically (order-insensitive)
 */
export const normalizeName = (raw: string): string => {
  if (!raw) return ''
  // Remove anything in parentheses
  let s = raw.replace(/\([^)]*\)/g, '')
  // Collapse spaces
  s = s.replace(/\s+/g, ' ').trim().toLowerCase()
  // Strip diacritics (Ł -> l, ą -> a, etc.)
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
  // Tokenize and drop 1-letter noise
  const tokens = s.split(' ').filter((t) => t.length > 1)
  // Sort so "piotr gierszewski" === "gierszewski piotr"
  return tokens.sort().join(' ')
}
