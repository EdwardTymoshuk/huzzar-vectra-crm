import type { DeviceCategory } from '@prisma/client'
import { remove as removeDiacritics } from 'diacritics'
import * as XLSX from 'xlsx'

/** Single parsed row from Excel (before matching). */
export type ParsedDeviceRow = {
  rowNo: number
  model: string
  sn?: string | null
  mac?: string | null
  /** Final identifier used for uniqueness (SN or MAC depending on availability). */
  identifier: string
  /** Client-side toggling for upload selection. */
  selected: boolean
  /** Client-side preview of matching to DeviceDefinition. */
  match?: {
    status: 'MATCHED' | 'SKIPPED'
    deviceName?: string
    reason?: string
  }
}

/** Minimal DeviceDefinition shape needed on client for matching. */
export type DeviceDefLite = {
  id: string
  name: string
  category: DeviceCategory
}

/**
 * Parses Excel file to normalized device rows.
 * --------------------------------------------------------------
 * Expected headers:
 *  L.P. | MODEL | INDEKS | SN | MAC/CONAX | LOKALIZACJA | LOKALIZACJA 2 | UWAGI
 *
 * Rules:
 * - We use MODEL, SN, MAC/CONAX. Others are ignored.
 * - Identifier:
 *   → If both SN and MAC exist → use SN for SAGEMCOM/OTT/CAM, otherwise MAC.
 *   → If only one exists → use the available one.
 *   → If none exist → mark as SKIPPED later.
 */
export async function parseDevicesFromExcel(
  file: File
): Promise<ParsedDeviceRow[]> {
  const { headerRow, rows } = await readSheetAsRows(file)
  const headerMap = buildHeaderIndexMap(headerRow)

  const col = {
    model: findIndexByLabel(headerMap, 'model'),
    sn: findIndexByLabel(headerMap, 'sn'),
    mac: findIndexByLabel(headerMap, 'mac/conax'),
  }

  const out: ParsedDeviceRow[] = []
  let rowNo = 1

  for (const row of rows) {
    rowNo += 1
    const modelRaw = String(row[col.model] ?? '').trim()
    const snRaw = String(row[col.sn] ?? '').trim()
    const macRaw = String(row[col.mac] ?? '').trim()

    // Skip empty lines
    if (!modelRaw && !snRaw && !macRaw) continue

    const model = normalizeModel(modelRaw)
    const sn = normalizeSN(snRaw)
    const mac = normalizeMAC(macRaw)

    // Determine which identifier to use
    const mustUseSN = shouldUseSN(model)
    const identifier = sn && mac ? (mustUseSN ? sn : mac) : sn || mac || '' // fallback if only one is available

    out.push({
      rowNo,
      model,
      sn: sn || null,
      mac: mac || null,
      identifier,
      selected: true,
    })
  }

  return out
}

/**
 * Matches parsed Excel rows to DeviceDefinition list.
 * --------------------------------------------------------------
 * - Compares model fragments case- and diacritics-insensitively.
 * - Marks rows as MATCHED (with deviceName) or SKIPPED (with reason).
 * - Ignores differences like dots, spaces, diacritics.
 */
export function applyMatchingToRows(
  rows: ParsedDeviceRow[],
  defs: DeviceDefLite[],
  fileName?: string
): ParsedDeviceRow[] {
  // Detect operator based on file name (highest priority)
  const fileNameUpper = fileName?.toUpperCase() ?? ''
  const isMMPFile = fileNameUpper.includes('MMP')
  const isVectraFile = fileNameUpper.includes('VECTRA')

  // Preprocess device definitions
  const prepared = defs.map((d) => ({
    ...d,
    key: norm(d.name),
    tokens: norm(d.name)
      .split(/[\s|/-]+/)
      .filter((t) => t.length >= 3),
    isMMPDef: d.name.toUpperCase().includes('(MMP)'),
  }))

  return rows.map((r) => {
    if (!r.identifier) {
      return {
        ...r,
        selected: false,
        match: { status: 'SKIPPED', reason: 'Brak identyfikatora (SN/MAC)' },
      }
    }

    const modelKey = norm(r.model)
    const modelTokens = modelKey.split(/[\s|/-]+/).filter((t) => t.length >= 3)
    const isMMPModel = r.model.toUpperCase().includes('MMP')

    let filteredDefs: typeof prepared

    // 🔹 1. File name has MMP → enforce only (MMP) definitions
    if (isMMPFile) {
      filteredDefs = prepared.filter((d) => d.isMMPDef)
    }
    // 🔹 2. File name has VECTRA → enforce only non-(MMP) definitions
    else if (isVectraFile) {
      filteredDefs = prepared.filter((d) => !d.isMMPDef)
    }
    // 🔹 3. Otherwise, fallback to model text
    else {
      filteredDefs = isMMPModel
        ? prepared.filter((d) => d.isMMPDef)
        : prepared.filter((d) => !d.isMMPDef)
    }

    let bestMatch: DeviceDefLite | null = null
    let bestScore = 0

    for (const def of filteredDefs) {
      const exactMatches = def.tokens.filter((t) =>
        modelTokens.includes(t)
      ).length
      if (exactMatches === 0) continue

      const tokenCoverage = exactMatches / modelTokens.length
      const nameContainsModel = def.key.includes(modelKey) ? 0.5 : 0
      const score = exactMatches + tokenCoverage + nameContainsModel

      if (score > bestScore) {
        bestMatch = def
        bestScore = score
      }
    }

    // 🚫 If file explicitly MMP, never match to non-MMP version
    if (!bestMatch) {
      const context = isMMPFile
        ? 'MMP'
        : isVectraFile
        ? 'Vectra'
        : isMMPModel
        ? 'MMP'
        : 'brak dopasowania'
      return {
        ...r,
        selected: false,
        match: {
          status: 'SKIPPED',
          reason: `Brak definicji dla: "${r.model}" (${context})`,
        },
      }
    }

    return {
      ...r,
      match: {
        status: 'MATCHED',
        deviceName: bestMatch.name,
      },
    }
  })
}

/* =============================== Helpers =============================== */

type ExcelRow = (string | number | Date | null | undefined)[]

/** Reads Excel file and returns header + all rows. */
async function readSheetAsRows(
  file: File
): Promise<{ headerRow: ExcelRow; rows: ExcelRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const data = event.target?.result
      if (!data) return reject(new Error('Plik jest pusty lub nieczytelny.'))

      const workbook = XLSX.read(data, {
        type: 'binary',
        cellDates: true,
      })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
        header: 1,
      }) as ExcelRow[]

      if (!raw.length)
        return reject(new Error('Błędny format: brak wierszy w arkuszu.'))

      const [headerRow, ...rows] = raw
      resolve({ headerRow, rows })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsBinaryString(file)
  })
}

/** Normalizes string for case-insensitive comparison. */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Removes diacritics, dots, trims, and normalizes casing. */
function norm(s: string): string {
  return normalize(removeDiacritics(s).replace(/[.]/g, ''))
}

/** Builds header name → index map. */
function buildHeaderIndexMap(headerRow: ExcelRow): Map<string, number> {
  const map = new Map<string, number>()
  headerRow.forEach((val, idx) => {
    const key = normalize(String(val ?? ''))
    if (key && !map.has(key)) map.set(key, idx)
  })
  return map
}

/** Finds a column index by label fragment (case-insensitive). */
function findIndexByLabel(map: Map<string, number>, needle: string): number {
  const n = normalize(needle)
  for (const [k, idx] of map.entries()) {
    if (k.includes(n)) return idx
  }
  throw new Error(`Brak wymaganej kolumny: "${needle}"`)
}

/** Normalizes model name: uppercase, removes dots, multiple spaces, diacritics. */
function normalizeModel(model: string): string {
  return removeDiacritics(model)
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

/** Normalizes serial number (uppercase). */
function normalizeSN(sn: string): string | null {
  const s = sn.trim()
  return s ? s.toUpperCase() : null
}

/** Normalizes MAC address: keeps only hexadecimal characters (A–F, 0–9). */
function normalizeMAC(mac: string): string | null {
  if (!mac) return null
  const cleaned = mac.replace(/[^0-9A-Fa-f]/g, '').toUpperCase()
  return cleaned || null
}

/** Determines if SN should be used instead of MAC. */
function shouldUseSN(modelNormalized: string): boolean {
  const m = modelNormalized
  return m.includes('SAGEMCOM') || m.includes('OTT') || m.includes('CAM')
}
