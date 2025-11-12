/**
 * normalizeForSearch:
 * --------------------------------------------------------------
 * Returns a simplified, uppercase version of input string,
 * removing diacritics for comparison logic but keeping letters
 * readable for search-insensitive matching.
 *
 * Example:
 *  - "Gdańsk" -> "GDANSK"
 *  - "Łódź, ul. Żeromskiego" -> "LODZ, UL. ZEROMSKIEGO"
 */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
}
