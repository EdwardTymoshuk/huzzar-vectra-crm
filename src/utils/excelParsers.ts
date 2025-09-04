// utils/excelParsers.ts
import { OrderStatus, TimeSlot } from '@prisma/client'
import * as XLSX from 'xlsx'
import { normalizeName } from './normalizeName'

/**
 * ParsedOrderFromExcel:
 * - Normalized shape returned by the parser (client-side).
 * - Contains technician *name* (to be resolved to user ID later in the modal),
 *   mapped operator, mapped status, and a final TimeSlot.
 */
export type ParsedOrderFromExcel = {
  operator: string
  orderNumber: string
  type: 'INSTALATION' // keep current domain naming
  city: string
  street: string
  postalCode: string
  date: string // YYYY-MM-DD
  timeSlot: TimeSlot
  assignedToName?: string
  notes: string
  status: OrderStatus
}

/** Row as array of cell values (no any). */
type ExcelRow = (string | number | Date | null | undefined)[]

/**
 * Public API:
 * - Parses ONLY the new planner export.
 * - Detects columns by (case-insensitive) header labels.
 */
export async function parseOrdersFromExcel(
  file: File
): Promise<ParsedOrderFromExcel[]> {
  const { headerRow, rows } = await readSheetAsRows(file)
  const headerMap = buildHeaderIndexMap(headerRow)

  // Column indices (internal names → indices resolved from Polish headers)
  const col = {
    taskId: findIndexByLabel(headerMap, 'id zadania'),
    location: findIndexByLabel(headerMap, 'lokalizacja'),
    assignees: findIndexByLabel(headerMap, 'przypisani pracownicy / grupy'),
    visitStart: findIndexByLabel(headerMap, 'początek terminu wizyty'),
    visitEnd: findIndexByLabel(headerMap, 'koniec terminu wizyty'),
    extSystem: findIndexByLabel(headerMap, 'system zewnętrzny (zadanie)'),
    taskStatus: safeIndexByLabel(headerMap, 'status zadania'), // optional
    taskType: safeIndexByLabel(headerMap, 'typ zadania'), // optional
    externalClientId: safeIndexByLabel(headerMap, 'zew. id klienta'), // optional
  }

  return rows.map((row) => {
    // Order number
    const orderNumber = String(row[col.taskId] ?? '').trim() || 'BRAK_NUMERU'

    // Address → [city, postalCode, street]
    const location = String(row[col.location] ?? '').trim()
    const [city, postalCode, street] = parseAddress(location)

    // Visit window → YYYY-MM-DD + HH:MM
    const { isoDate, startTime, endTime } = parseVisitWindow(
      row[col.visitStart],
      row[col.visitEnd]
    )

    // Operator mapping (empty → VECTRA)
    const operatorRaw = String(row[col.extSystem] ?? '').trim()
    const operator = mapOperator(operatorRaw)

    // Time slot (supports 1h/2h/3h) — snap to closest if no exact match
    const timeSlot = toTimeSlot(startTime, endTime)

    // Technician name (resolved to ID later, outside the parser)
    const assigneesRaw = String(row[col.assignees] ?? '').trim()
    const assignedToName = parseTechnicianName(assigneesRaw)

    // Status mapping (fallback PENDING)
    const statusRaw =
      col.taskStatus !== null ? String(row[col.taskStatus] ?? '').trim() : ''
    const status = mapStatus(statusRaw)

    // External client ID → ONLY this goes to notes
    const extId =
      col.externalClientId !== null
        ? String(row[col.externalClientId] ?? '').trim()
        : ''
    const notes = extId ? `Zew. ID klienta: ${extId}` : ''

    // Type — keep constant for now
    const type = 'INSTALATION' as const

    return {
      operator,
      orderNumber,
      type,
      city,
      street,
      postalCode,
      date: isoDate,
      timeSlot,
      assignedToName,
      notes,
      status,
    }
  })
}

/* =============================== Helpers =============================== */

/** Read first sheet into [headerRow, rows[]] */
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
        dateNF: 'yyyy-mm-dd HH:mm:ss',
      })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
        header: 1,
      }) as ExcelRow[]
      if (!raw.length)
        return reject(new Error('Błędny format: plik nie zawiera wierszy.'))
      const [headerRow, ...rows] = raw
      resolve({ headerRow, rows })
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsBinaryString(file)
  })
}

/** Normalize header key: lowercase + trim + collapse spaces */
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Build map from normalized header → index */
function buildHeaderIndexMap(headerRow: ExcelRow): Map<string, number> {
  const map = new Map<string, number>()
  headerRow.forEach((val, idx) => {
    const key = normalize(String(val ?? ''))
    if (key && !map.has(key)) map.set(key, idx)
  })
  return map
}

/** Find index by header fragment; throws if missing */
function findIndexByLabel(map: Map<string, number>, needle: string): number {
  const n = normalize(needle)
  for (const [k, idx] of map.entries()) {
    if (k.includes(n)) return idx
  }
  throw new Error(`Brak wymaganej kolumny: "${needle}"`)
}

/** Try find index, else return null */
function safeIndexByLabel(
  map: Map<string, number>,
  needle: string
): number | null {
  try {
    return findIndexByLabel(map, needle)
  } catch {
    return null
  }
}

/** "Miasto 12-345, Ulica 1/2" → [city, postalCode, street] */
function parseAddress(location: string): [string, string, string] {
  const parts = location.split(',', 2).map((s) => s.trim())
  if (parts.length < 2) return [location, '', '']
  const cityPart = parts[0]
  const regex = /^(.*)\s+(\d{2}-\d{3})$/
  const match = cityPart.match(regex)
  let city = cityPart
  let postalCode = ''
  if (match) {
    city = match[1]
    postalCode = match[2]
  }
  const street = parts[1]
  return [city, postalCode, street]
}

/** Accept Date or string "YYYY-MM-DD HH:mm", "DD.MM.YYYY HH:mm", Date -> {date, HH:MM} */
function parseVisitWindow(
  startCell: unknown,
  endCell: unknown
): { isoDate: string; startTime: string; endTime: string } {
  const start = coerceToDate(startCell)
  const end = coerceToDate(endCell)
  if (start && end) {
    return {
      isoDate: start.toISOString().split('T')[0],
      startTime: toHHMM(start),
      endTime: toHHMM(end),
    }
  }
  const startStr = String(startCell ?? '').trim()
  const endStr = String(endCell ?? '').trim()
  const { date: d1, time: t1 } = smartSplitDateTime(startStr)
  const { time: t2 } = smartSplitDateTime(endStr)
  return {
    isoDate: d1 || '2000-01-01',
    startTime: t1 || '00:00',
    endTime: t2 || '00:00',
  }
}

function coerceToDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val
  const s = String(val ?? '').trim()
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function toHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function smartSplitDateTime(s: string): {
  date: string | null
  time: string | null
} {
  if (!s) return { date: null, time: null }
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::\d{2})?$/)
  if (iso) return { date: iso[1], time: iso[2] }
  const dot = s.match(/^(\d{2})\.(\d{2})\.(\d{4})[ T](\d{2}):(\d{2})$/)
  if (dot) {
    const [, dd, mm, yyyy, HH, MM] = dot
    return { date: `${yyyy}-${mm}-${dd}`, time: `${HH}:${MM}` }
  }
  const onlyDateDot = convertDateDotFormat(s)
  if (onlyDateDot) return { date: onlyDateDot, time: null }
  const onlyTime = s.match(/^(\d{2}:\d{2})$/)?.[1] ?? null
  return { date: null, time: onlyTime }
}

function convertDateDotFormat(dateStr: string): string | null {
  const parts = dateStr.split('.')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/** Map external operator name → internal operator field */
function mapOperator(raw: string): string {
  const s = raw.trim().toUpperCase()
  // Business mapping per request:
  // p4 → PLAY, MMP → MULTIMEDIA, CSRT → VECTRA, POLKOMTEL → PLUS, TMOBILE → T-MOBILE,
  // VECTRA BIZNES → BIZNES, empty → VECTRA
  if (!s) return 'VECTRA'
  if (s.includes('P4')) return 'PLAY'
  if (s.includes('MMP')) return 'MULTIMEDIA'
  if (s.includes('CSRT')) return 'VECTRA'
  if (s.includes('POLKOMTEL')) return 'PLUS'
  if (s.includes('TMOBILE') || s.includes('T-MOBILE')) return 'T-MOBILE'
  if (s.includes('VECTRA BIZNES') || s.includes('BIZNES')) return 'BIZNES'
  if (s.includes('VECTRA')) return 'VECTRA'
  // Fallback (unknown) — safest default:
  return 'VECTRA'
}

/** Map file's status text → OrderStatus enum (fallback PENDING) */
function mapStatus(raw: string): OrderStatus {
  const s = raw.trim().toLowerCase()
  // Extend freely depending on your exports vocabulary.
  if (!s) return 'PENDING'
  if (['nowe', 'nowy', 'open', 'pending', 'oczekujące'].includes(s))
    return 'PENDING'
  if (['przypisane', 'przypisano'].includes(s)) return 'ASSIGNED'
  if (
    [
      'w toku',
      'in progress',
      'progress',
      'rozpoczęte',
      'w drodze',
      'w realizacji',
    ].includes(s)
  )
    return 'IN_PROGRESS' as OrderStatus
  if (
    [
      'zakończone',
      'zrealizowane',
      'zrealizowano',
      'completed',
      'done',
      'skuteczne',
    ].includes(s)
  )
    return 'COMPLETED'
  if (['canseled', 'anulowano', 'anulowane', 'rejected'].includes(s))
    return 'CANCELED'
  if (
    [
      'niezrealizowane',
      'niezrealizowano',
      'nieskuteczne',
      'nieskutecznie',
      'failed',
    ].includes(s)
  )
    return 'NOT_COMPLETED' as OrderStatus
  // Unknown → default
  return 'PENDING'
}

/**
 * Extract and normalize first technician name from Excel string.
 * Handles various formats
 */
export function parseTechnicianName(techStr: string): string | undefined {
  if (!techStr) return undefined

  // Take only the first entry before comma
  let first = techStr.split(',')[0] ?? ''

  return normalizeName(first)
}

/** Convert "HH:MM-HH:MM" into TimeSlot; snap to closest defined if not exact. */
function toTimeSlot(start: string, end: string): TimeSlot {
  const key = `${start}-${end}`
  const exact = SLOT_BY_RANGE[key]
  if (exact) return exact

  // Snap to the closest start-time among all declared ranges
  const all = Object.keys(SLOT_BY_RANGE)
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const sMin = toMin(start)
  let bestKey = all[0]
  let bestDiff = Math.abs(toMin(all[0].split('-')[0]) - sMin)
  for (const k of all.slice(1)) {
    const diff = Math.abs(toMin(k.split('-')[0]) - sMin)
    if (diff < bestDiff) {
      bestKey = k
      bestDiff = diff
    }
  }
  return SLOT_BY_RANGE[bestKey]
}

/** All legal ranges from your timeSlotOptions (must match Prisma enum). */
const SLOT_BY_RANGE: Record<string, TimeSlot> = {
  // 1 hour
  '08:00-09:00': 'EIGHT_NINE',
  '09:00-10:00': 'NINE_TEN',
  '10:00-11:00': 'TEN_ELEVEN',
  '11:00-12:00': 'ELEVEN_TWELVE',
  '12:00-13:00': 'TWELVE_THIRTEEN',
  '13:00-14:00': 'THIRTEEN_FOURTEEN',
  '14:00-15:00': 'FOURTEEN_FIFTEEN',
  '15:00-16:00': 'FIFTEEN_SIXTEEN',
  '16:00-17:00': 'SIXTEEN_SEVENTEEN',
  '17:00-18:00': 'SEVENTEEN_EIGHTEEN',
  '18:00-19:00': 'EIGHTEEN_NINETEEN',
  '19:00-20:00': 'NINETEEN_TWENTY',
  '20:00-21:00': 'TWENTY_TWENTYONE',

  // 2 hours
  '08:00-10:00': 'EIGHT_TEN',
  '10:00-12:00': 'TEN_TWELVE',
  '12:00-14:00': 'TWELVE_FOURTEEN',
  '14:00-16:00': 'FOURTEEN_SIXTEEN',
  '16:00-18:00': 'SIXTEEN_EIGHTEEN',
  '18:00-20:00': 'EIGHTEEN_TWENTY',

  // 3 hours
  '09:00-12:00': 'NINE_TWELVE',
  '12:00-15:00': 'TWELVE_FIFTEEN',
  '15:00-18:00': 'FIFTEEN_EIGHTEEN',
  '18:00-21:00': 'EIGHTEEN_TWENTYONE',
}
