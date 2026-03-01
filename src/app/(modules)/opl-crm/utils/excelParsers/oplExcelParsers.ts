import { OplNetworkOeprator, OplOrderStandard, OplTimeSlot } from '@prisma/client'
import * as XLSX from 'xlsx'
import { normalizeName } from '@/utils/normalizeName'
import { appendImportedRouteMarker } from '@/app/(modules)/opl-crm/utils/order/notesFormatting'

export type ParsedOplOrderFromExcel = {
  operator?: string
  type: 'INSTALLATION'
  serviceId?: string
  network: OplNetworkOeprator
  orderNumber: string
  date: string
  timeSlot: OplTimeSlot
  city: string
  street: string
  postalCode?: string
  assignedToNames?: string[]
  assigneeRaw?: string
  notes: string
  standard?: OplOrderStandard
  equipmentToDeliver: string[]
  zone?: string
  termChangeFlag?: 'T' | 'N'
  leads?: number
  importStatus?: string
}

type ExcelRow = (string | number | Date | null | undefined)[]

export async function parseOplOrdersFromExcel(
  file: File
): Promise<ParsedOplOrderFromExcel[]> {
  const { headerRow, rows } = await readSheetAsRows(file)
  const headerMap = buildHeaderIndexMap(headerRow)

  const col = {
    orderNumber: findIndex(headerMap, [
      'nr zlecenia',
      'numer zlecenia',
      'zlecenie',
    ]),
    taskId: safeIndex(headerMap, ['id zadania']),
    serviceId: safeIndex(headerMap, [
      'nr łącza',
      'nr lacza',
      'numer łącza',
      'numer lacza',
      'id usługi',
      'id uslugi',
      'service id',
    ]),
    location: safeIndex(headerMap, ['lokalizacja', 'adres']),
    city: safeIndex(headerMap, ['miasto']),
    street: safeIndex(headerMap, ['ulica', 'adres']),
    postalCode: safeIndex(headerMap, ['kod pocztowy', 'postal code']),
    assignees: safeIndex(headerMap, [
      'ekipa',
      'monterzy',
      'przypisani pracownicy / grupy',
      'przypisani pracownicy',
      'technik',
      'technicy',
      'pracownik',
    ]),
    zone: safeIndex(headerMap, ['strefa']),
    termChange: safeIndex(headerMap, [
      'zmiana terminu',
      'data umówienia [zmieniono datę umówienia]',
      'data umowienia [zmieniono date umowienia]',
    ]),
    resultStatus: safeIndex(headerMap, [
      'wynik realizacji',
      'status realizacji',
      'wynik',
      'status',
    ]),
    leads: safeIndex(headerMap, ['leady', 'lead', 'liczba leadow', 'leady [szt]']),
    appointment: safeIndex(headerMap, [
      'data umówienia',
      'data umowienia',
      'termin wizyty',
      'data wizyty',
    ]),
    date: safeIndex(headerMap, ['data']),
    slot: safeIndex(headerMap, ['slot', 'slot czasowy', 'godzina']),
    visitStart: safeIndex(headerMap, [
      'początek terminu wizyty',
      'poczatek terminu wizyty',
      'początek wizyty',
      'data od',
      'start',
    ]),
    visitEnd: safeIndex(headerMap, [
      'koniec terminu wizyty',
      'koniec wizyty',
      'data do',
      'end',
    ]),
    operator: safeIndex(headerMap, [
      'system zewnętrzny (zadanie)',
      'system zewnetrzny (zadanie)',
      'operator',
    ]),
    network: safeIndex(headerMap, [
      'właściciel sieci',
      'wlasciciel sieci',
      'operator sieci',
      'sieć',
      'siec',
    ]),
    notes: safeIndex(headerMap, [
      'uwagi wejściowe',
      'uwagi wejsciowe',
      'uwagi',
      'komentarz',
    ]),
    standards: safeIndex(headerMap, [
      'informacje o standardach',
      'standard zlecenia',
      'standard',
    ]),
    route: safeIndex(headerMap, ['przebieg']),
    additionalActivities: safeIndex(headerMap, [
      'czynności dodatkowe',
      'czynnosci dodatkowe',
      'czynności',
      'czynnosci',
    ]),
    devicesToDeliver: safeIndex(headerMap, [
      'urządzenia [do dostarczenia]',
      'urzadzenia [do dostarczenia]',
      'urządzenia do dostarczenia',
      'urzadzenia do dostarczenia',
      'urządzenia',
      'urzadzenia',
    ]),
  }

  return rows.reduce<ParsedOplOrderFromExcel[]>((acc, row) => {
    if (isRowEmpty(row)) return acc

    const orderNumber = String(row[col.orderNumber] ?? '').trim()
    if (!orderNumber) return acc

    const serviceIdRaw =
      col.serviceId !== null ? String(row[col.serviceId] ?? '').trim() : ''
    const serviceId = serviceIdRaw || undefined

    const location = col.location !== null ? String(row[col.location] ?? '') : ''
    const parsedAddress = parseAddress(location)

    const city =
      col.city !== null
        ? String(row[col.city] ?? '').trim() || parsedAddress.city
        : parsedAddress.city
    const streetRaw =
      col.street !== null
        ? String(row[col.street] ?? '').trim() || parsedAddress.street
        : parsedAddress.street
    const street = stripDuplicatedCityInStreet(streetRaw, city)
    const postalCodeRaw =
      col.postalCode !== null
        ? String(row[col.postalCode] ?? '').trim() || parsedAddress.postalCode
        : parsedAddress.postalCode
    const postalCode = postalCodeRaw || undefined

    const { isoDate, startTime, endTime } = parseAppointmentWindow({
      appointmentCell: col.appointment !== null ? row[col.appointment] : undefined,
      dateCell: col.date !== null ? row[col.date] : undefined,
      slotCell: col.slot !== null ? row[col.slot] : undefined,
      visitStartCell: col.visitStart !== null ? row[col.visitStart] : undefined,
      visitEndCell: col.visitEnd !== null ? row[col.visitEnd] : undefined,
    })

    const operatorRaw =
      col.operator !== null ? String(row[col.operator] ?? '').trim() : ''
    const operator = mapOperator(operatorRaw)

    const networkRaw =
      col.network !== null ? String(row[col.network] ?? '').trim() : ''
    const network = mapNetwork(networkRaw, operatorRaw)

    const assigneesRaw =
      col.assignees !== null ? String(row[col.assignees] ?? '').trim() : ''
    const assignedToNames = parseTechnicianNames(assigneesRaw)
    const zoneRaw = col.zone !== null ? String(row[col.zone] ?? '').trim() : ''
    const zone = zoneRaw || undefined
    const termChangeRaw =
      col.termChange !== null ? String(row[col.termChange] ?? '').trim() : ''
    const termChangeFlag = parseTermChangeFlag(termChangeRaw)
    const resultStatusRaw =
      col.resultStatus !== null ? String(row[col.resultStatus] ?? '').trim() : ''
    const importStatus = resultStatusRaw || undefined
    const leadsRaw = col.leads !== null ? String(row[col.leads] ?? '').trim() : ''
    const leads = parseLeads(leadsRaw)

    const inputNotes = col.notes !== null ? String(row[col.notes] ?? '').trim() : ''
    const standardsRaw =
      col.standards !== null ? String(row[col.standards] ?? '').trim() : ''
    const additionalActivitiesRaw =
      col.additionalActivities !== null
        ? String(row[col.additionalActivities] ?? '').trim()
        : ''
    const routeRaw =
      col.route !== null ? String(row[col.route] ?? '').trim() : ''
    const standard = mapStandard(standardsRaw)
    const notes = buildImportNotes({
      inputNotes,
      routeRaw,
      additionalActivitiesRaw,
    })
    const devicesRaw =
      col.devicesToDeliver !== null ? String(row[col.devicesToDeliver] ?? '').trim() : ''
    const equipmentToDeliver = parseEquipmentToDeliver(devicesRaw)
    acc.push({
      operator,
      type: 'INSTALLATION' as const,
      serviceId,
      network,
      orderNumber,
      date: isoDate,
      timeSlot: toTimeSlot(startTime, endTime),
      city,
      street,
      postalCode,
      assignedToNames,
      assigneeRaw: assigneesRaw || undefined,
      notes,
      standard,
      equipmentToDeliver,
      zone,
      termChangeFlag,
      leads,
      importStatus,
    })

    return acc
  }, [])
}

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

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function buildHeaderIndexMap(headerRow: ExcelRow): Map<string, number> {
  const map = new Map<string, number>()
  headerRow.forEach((val, idx) => {
    const key = normalize(String(val ?? ''))
    if (key && !map.has(key)) map.set(key, idx)
  })
  return map
}

function findIndex(map: Map<string, number>, labels: string[]): number {
  for (const needle of labels) {
    const n = normalize(needle)
    for (const [k, idx] of map.entries()) {
      if (k.includes(n)) return idx
    }
  }
  throw new Error(`Brak wymaganej kolumny: ${labels[0]}`)
}

function safeIndex(map: Map<string, number>, labels: string[]): number | null {
  try {
    return findIndex(map, labels)
  } catch {
    return null
  }
}

function isRowEmpty(row: ExcelRow): boolean {
  return row.every((cell) => String(cell ?? '').trim() === '')
}

function parseAddress(locationRaw: string): {
  city: string
  postalCode: string
  street: string
} {
  const location = String(locationRaw ?? '').trim()
  if (!location) return { city: '', postalCode: '', street: '' }

  const parts = location.split(',').map((s) => s.trim())
  const first = parts[0] ?? ''
  const street = parts.slice(1).join(', ').trim()

  const match = first.match(/^(.*)\s+(\d{2}-\d{3})$/)
  if (match) {
    return {
      city: (match[1] ?? '').trim(),
      postalCode: (match[2] ?? '').trim(),
      street,
    }
  }

  return { city: first, postalCode: '', street }
}

function stripDuplicatedCityInStreet(street: string, city: string): string {
  const s = String(street ?? '').trim()
  const c = String(city ?? '').trim()
  if (!s || !c) return s
  const sUpper = s.toUpperCase()
  const cUpper = c.toUpperCase()
  if (sUpper === cUpper) return ''
  if (sUpper.startsWith(`${cUpper},`)) return s.slice(c.length + 1).trim()
  return s
}

function parseVisitWindow(
  startCell: unknown,
  endCell: unknown
): { isoDate: string; startTime: string; endTime: string } {
  const start = coerceToDate(startCell)
  const end = coerceToDate(endCell)
  if (start && end) {
    return {
      isoDate: toLocalIsoDate(start),
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
    startTime: t1 || '08:00',
    endTime: t2 || '10:00',
  }
}

function parseAppointmentWindow({
  appointmentCell,
  dateCell,
  slotCell,
  visitStartCell,
  visitEndCell,
}: {
  appointmentCell?: unknown
  dateCell?: unknown
  slotCell?: unknown
  visitStartCell?: unknown
  visitEndCell?: unknown
}): { isoDate: string; startTime: string; endTime: string } {
  const appointmentRaw = String(appointmentCell ?? '').trim()
  if (appointmentRaw) {
    const date = extractDateFromText(appointmentRaw)
    const times = extractTimesFromText(appointmentRaw)
    const hoursOnly = extractHourRangeWithoutMinutes(appointmentRaw)

    if (date && times.length >= 2) {
      return {
        isoDate: date,
        startTime: times[0],
        endTime: times[1],
      }
    }

    if (date && hoursOnly) {
      return {
        isoDate: date,
        startTime: `${String(hoursOnly.start).padStart(2, '0')}:00`,
        endTime: `${String(hoursOnly.end).padStart(2, '0')}:00`,
      }
    }
  }

  const dateRaw = String(dateCell ?? '').trim()
  const slotRaw = String(slotCell ?? '').trim()
  if (dateRaw || slotRaw) {
    const date = extractDateFromText(dateRaw) ?? '2000-01-01'
    const times = extractTimesFromText(slotRaw)
    const hoursOnly = extractHourRangeWithoutMinutes(slotRaw)
    if (times.length >= 2) {
      return {
        isoDate: date,
        startTime: times[0],
        endTime: times[1],
      }
    }
    if (hoursOnly) {
      return {
        isoDate: date,
        startTime: `${String(hoursOnly.start).padStart(2, '0')}:00`,
        endTime: `${String(hoursOnly.end).padStart(2, '0')}:00`,
      }
    }
  }

  return parseVisitWindow(visitStartCell, visitEndCell)
}

function coerceToDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val
  if (typeof val === 'number' && Number.isFinite(val)) {
    const parsed = XLSX.SSF.parse_date_code(val)
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return new Date(
        parsed.y,
        parsed.m - 1,
        parsed.d,
        parsed.H ?? 0,
        parsed.M ?? 0,
        parsed.S ?? 0
      )
    }
  }
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

function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function mapOperator(raw: string): string | undefined {
  const s = raw.trim()
  return s || undefined
}

function mapNetwork(networkRaw: string, operatorRaw: string): OplNetworkOeprator {
  const source = `${networkRaw} ${operatorRaw}`.toUpperCase()
  if (
    source.includes('POLSKI ŚWIATŁOWÓD OTWARTY') ||
    source.includes('POLSKI SWIATLOWOD OTWARTY')
  ) {
    return 'PSO'
  }
  if (
    source.includes('SI') ||
    source.includes('ŚWIATŁOWÓD INWESTYCJE') ||
    source.includes('SWIATLOWOD INWESTYCJE')
  ) {
    return 'SI'
  }
  return 'ORANGE'
}

function parseTechnicianNames(techStr: string): string[] | undefined {
  if (!techStr) return undefined

  const list = techStr
    .replace(/\r/g, '\n')
    .split(/[;,/|\n]+/)
    .map((v) => normalizeName(v.trim()))
    .filter(Boolean)

  const unique = Array.from(new Set(list))
  return unique.length > 0 ? unique : undefined
}

const STANDARD_PRIORITY: OplOrderStandard[] = [
  'ZJD30',
  'ZJD5',
  'ZJD3',
  'ZJD1',
  'ZJD',
  'ZJN30',
  'ZJN5',
  'ZJN3',
  'ZJN1',
  'ZJN',
  'ZJK',
  'W6',
  'W5',
  'W4',
  'W3',
  'W2',
  'W1',
]

function mapStandard(raw: string): OplOrderStandard | undefined {
  const source = raw.toUpperCase().replace(/\s+/g, '')
  if (!source) return undefined
  for (const code of STANDARD_PRIORITY) {
    if (source.includes(code)) return code
  }
  return undefined
}

function buildImportNotes({
  inputNotes,
  routeRaw,
  additionalActivitiesRaw,
}: {
  inputNotes: string
  routeRaw: string
  additionalActivitiesRaw: string
}): string {
  const out: string[] = []
  if (inputNotes.trim()) {
    out.push(`Uwagi wejściowe:\n${inputNotes.trim()}`)
  }

  if (additionalActivitiesRaw.trim()) {
    out.push(`Czynności dodatkowe:\n${additionalActivitiesRaw.trim()}`)
  }

  return appendImportedRouteMarker(out.join('\n\n').trim(), routeRaw)
}

function parseEquipmentToDeliver(raw: string): string[] {
  if (!raw) return []
  const chunks = raw
    .replace(/\r/g, '\n')
    .split(/[;\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => v.replace(/\s+/g, ' '))

  const output: string[] = []
  for (const item of chunks) {
    const upper = item.toUpperCase()
    if (/FUNBOX\s*3(?:\.0)?/i.test(item)) {
      output.push('FUNBOX 3')
      continue
    }
    if (/FUNBOX\s*10(?:\.0)?/i.test(item)) {
      output.push('FUNBOX 10')
      continue
    }
    if (
      upper === 'MODEM' ||
      upper === 'DEKODER' ||
      upper === 'ONT' ||
      upper === 'MODEM Z ONT' ||
      upper.startsWith('URZĄDZENIA') ||
      upper.startsWith('URZADZENIA')
    ) {
      continue
    }
    output.push(item)
  }

  return Array.from(new Set(output))
}

function parseTermChangeFlag(raw: string): 'T' | 'N' | undefined {
  const s = String(raw ?? '').trim().toUpperCase()
  if (s === 'T') return 'T'
  if (s === 'N') return 'N'
  return undefined
}

function parseLeads(raw: string): number | undefined {
  if (!raw) return undefined
  const normalized = raw.replace(',', '.').trim()
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return Math.round(parsed)
}

function extractDateFromText(text: string): string | null {
  const fromDot = text.match(/\b(\d{2})\.(\d{2})\.(\d{4})\b/)
  if (fromDot) return `${fromDot[3]}-${fromDot[2]}-${fromDot[1]}`

  const fromIso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (fromIso) return `${fromIso[1]}-${fromIso[2]}-${fromIso[3]}`

  const asDate = coerceToDate(text)
  if (asDate) return toLocalIsoDate(asDate)
  return null
}

function extractTimesFromText(text: string): string[] {
  const matches = text.match(/\b\d{1,2}:\d{2}\b/g)
  if (!matches) return []
  return matches.map((time) => {
    const [h, m] = time.split(':')
    return `${String(Number(h)).padStart(2, '0')}:${m}`
  })
}

function extractHourRangeWithoutMinutes(
  text: string
): { start: number; end: number } | null {
  const match = text.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\b/)
  if (!match) return null
  const start = Number(match[1])
  const end = Number(match[2])
  if (Number.isNaN(start) || Number.isNaN(end)) return null
  return { start, end }
}

function toTimeSlot(start: string, end: string): OplTimeSlot {
  const key = `${start}-${end}`
  const exact = OPL_SLOT_BY_RANGE[key]
  if (exact) return exact

  const all = Object.keys(OPL_SLOT_BY_RANGE)
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

  return OPL_SLOT_BY_RANGE[bestKey]
}

const OPL_SLOT_BY_RANGE: Record<string, OplTimeSlot> = {
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
  '08:00-10:00': 'EIGHT_TEN',
  '10:00-12:00': 'TEN_TWELVE',
  '12:00-14:00': 'TWELVE_FOURTEEN',
  '14:00-16:00': 'FOURTEEN_SIXTEEN',
  '16:00-18:00': 'SIXTEEN_EIGHTEEN',
  '18:00-20:00': 'EIGHTEEN_TWENTY',
  '08:00-11:00': 'EIGHT_ELEVEN',
  '11:00-14:00': 'ELEVEN_FOURTEEN',
  '14:00-17:00': 'FOURTEEN_SEVENTEEN',
  '17:00-20:00': 'SEVENTEEN_TWENTY',
  '08:00-12:00': 'EIGHT_TWELVE',
  '12:00-16:00': 'TWELVE_SIXTEEN',
  '16:00-20:00': 'SIXTEEN_TWENTY',
  '08:00-14:00': 'EIGHT_FOURTEEN',
  '14:00-20:00': 'FOURTEEN_TWENTY',
}
