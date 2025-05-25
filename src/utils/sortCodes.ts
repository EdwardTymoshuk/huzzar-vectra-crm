// utils/sortCodes.ts
/**
 * sortCodes
 * ----------
 * Sorts a list of work-code names so that the columns in reports always appear
 * in the required order, regardless of how operators spell the codes.
 *
 * HOW IT WORKS
 * 1. `PRIORITY_PATTERNS` is an array. Each element represents one column
 *    position and contains *one or more* strings or RegExps that may appear
 *    inside the code. Add as many variants here as you need.
 * 2. For any given code we find the first group whose pattern matches.
 *    The index of that group is its *rank*.
 * 3. `Array.sort()` compares ranks:
 *       • both ranked   ➜ lower index first
 *       • one ranked    ➜ ranked one first
 *       • none ranked   ➜ fallback to Polish alphabetical order
 *
 * This keeps the canonical columns (“Gniazdo”, “Przyłącze”, …) in front while
 * still allowing new, unknown codes to appear after them without manual edits.
 */

const PRIORITY_PATTERNS: ReadonlyArray<ReadonlyArray<RegExp | string>> = [
  // 0 ▸ Gniazdo
  [
    /gniaz/i, // gniazdo, gniazdka, gniazd …
    /uruchomienie[ _-]?gniazd/i, // uruchomienie gniazda/gniazdek
  ],

  // 1 ▸ Przyłącze
  [
    /przy[\\s_-]*ł[aą]cze/i, // przyłącze, przylącze, przy lacze
    /wykonanie[ _-]?przy[\\s_-]*ł[aą]cza/i,
  ],

  // 2 ▸ Dekoder 2-way
  [
    /2[\\s_-]?way/i, // 2-way, 2 way
    /dekoder.*2[\\s_-]?way/i,
    /dtv[\\s_-]?2[\\s_-]?way/i,
  ],

  // 3 ▸ Dekoder 1-way
  [/1[\\s_-]?way/i, /dekoder.*1[\\s_-]?way/i, /dtv[\\s_-]?1[\\s_-]?way/i],

  // 4 ▸ Modem NET_TEL
  [
    /modem/i, // any string containing “modem”
    /net[\\s_-]?tel/i,
  ],

  // 5 ▸ Piony
  [
    /pion(ów|y)?/i, // pion, piony, pionów
  ],

  // 6 ▸ Listwy
  [
    /listw(y|a|e|ę|ie|ów)?/i, // listwa, listwy, listew …
  ],
] as const

/**
 * Returns a *new* array with codes sorted according to the rules above.
 */
export function sortCodes(codes: string[]): string[] {
  // Helper – find index of the first matching pattern group
  const rank = (code: string): number =>
    PRIORITY_PATTERNS.findIndex((group) =>
      group.some((pat) =>
        typeof pat === 'string'
          ? code.toLowerCase().includes(pat.toLowerCase())
          : pat.test(code)
      )
    )

  return [...codes].sort((a, b) => {
    const rA = rank(a)
    const rB = rank(b)

    if (rA !== -1 && rB !== -1) return rA - rB // both have priority
    if (rA !== -1) return -1 // only A has priority
    if (rB !== -1) return 1 // only B has priority
    return a.localeCompare(b, 'pl') // neither: alphabetical
  })
}
