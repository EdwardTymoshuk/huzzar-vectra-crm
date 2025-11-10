/**
 * matchSearch
 * --------------------------------------------------
 * Returns true if the search term matches any of the given string fields.
 * Case-insensitive, ignores empty term.
 */
export const matchSearch = (
  term: string,
  ...fields: (string | undefined | null)[]
): boolean => {
  if (!term.trim()) return true
  const q = term.toLowerCase()
  return fields.some((f) => f?.toLowerCase().includes(q))
}
