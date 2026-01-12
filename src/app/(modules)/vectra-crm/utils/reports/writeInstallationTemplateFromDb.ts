// utils/writeInstallationTemplateFromDb.ts
import {
  BORDER,
  COLS,
  DECODER_COLOR,
  DECODER_COLOR_COLS,
  DEFAULT_BLACK_BOLD,
  GROUPS,
  LIGHT_BLUE,
  LIGHT_BLUE_COLS,
  LIGHT_GRAY,
  MODEM_COLOR,
  MODEM_COLOR_COLS,
  THICK_BORDER,
  VERT_START,
  pickFill,
} from '@/app/(modules)/vectra-crm/lib/exelReportsConstants'
import { prisma } from '@/utils/prisma'
import { VectraDeviceCategory } from '@prisma/client'
import ExcelJS from 'exceljs'

/* ───────────────────────── layout constants ───────────────────────── */
const TOP_OFFSET = 2
const HEADER_ROW_1 = 1 + TOP_OFFSET // 3
const HEADER_ROW_2 = 2 + TOP_OFFSET // 4
const DATA_START_ROW = HEADER_ROW_2 + 1 // 5
const DEFAULT_DATA_ROWS = 400

/* ───────────────────────── column widths ──────────────────────────── */
const WIDTHS: Record<string, number> = {
  'Lp.': 5,
  'WYKONANE\nTAK | NIE': 10,
  UWAGI: 30,
  'Adres\nMIASTO, ULICA NUMER': 55,
  'TECHNOLOGIA\nHFC | GPON': 10,
  DTV: 9,
  NET: 9,
  TEL: 9,
  ATV: 9,
  'adres MAC dekodera': 26,
  'adres MAC modemu': 26,
  'numer SN dekodera | karty CI+': 26,
  'multiroom ATV/DTV; przebudowy': 9,
  'uruchomienie gniazda': 14,
  'uruchomienie instalacji przyłącza ab.': 14,
  'dekoder 2-way': 12,
  'dekoder 1-way | moduł CI+': 12,
  'US. 40/51 dBm': 12,
  'DS. −9/+11 dBm': 12,
  'modem NET / terminal TEL': 12,
  'Pion (Ilość kondygnacji)': 14,
  'Montaż listew / rur PCV (mb)': 14,
}

/* ───────────────────────── helpers ────────────────────────────────── */

/** Excel column letter from 1-based index. */
const toLetter = (n: number) => {
  let s = ''
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) {
    s = String.fromCharCode(((x - 1) % 26) + 65) + s
  }
  return s
}

const tabColorForMonth = (m: number) =>
  m >= 1 && m <= 3
    ? 'FF2CAFF3'
    : m >= 4 && m <= 6
    ? 'FF90D150'
    : m >= 7 && m <= 9
    ? 'FFF7C11D'
    : 'ff722ea2'

/** Dedupe while keeping order. */
const uniq = <T>(arr: T[]) => Array.from(new Set(arr))

/** Soft mapping of rate code → target column (kept as before). */
const RATE_RULES: Array<{ when: (code: string) => boolean; col: string }> = [
  {
    when: (c) => /\bDEKODER\s*2[- ]?WAY\b|\bIPTV\b|ANDROID\s*TV/i.test(c),
    col: 'dekoder 2-way',
  },
  // 1-way / moduł CI+
  {
    when: (c) => /\bDEKODER\s*1[- ]?WAY\b|\bMODU[LŁ]\s*CI(\+)?\b/i.test(c),
    col: 'dekoder 1-way | moduł CI+',
  },
  {
    when: (c) => /MODEM\s*NET|TERMINAL\s*TEL|PLC/i.test(c),
    col: 'modem NET / terminal TEL',
  },
  {
    when: (c) => /URUCHOMIENIE\s+GNIAZDA/i.test(c),
    col: 'uruchomienie gniazda',
  },
  {
    when: (c) => /URUCHOMIENIE\s+INSTALACJI\s+PRZY(?:Ł|L)[AĄ]CZA/i.test(c),
    col: 'uruchomienie instalacji przyłącza ab.',
  },
  { when: (c) => /\bPION(Y)?\b/i.test(c), col: 'Pion (Ilość kondygnacji)' },
  {
    when: (c) => /LISTWY?|KORYTKA|RUR[AY]/i.test(c),
    col: 'Montaż listew / rur PCV (mb)',
  },
]
const mapRateToCol = (code: string) => RATE_RULES.find((r) => r.when(code))?.col

/** Nth index of header in COLS (0-based); returns -1 if not found. */
const nthIndexOf = (header: string, n: number) => {
  let from = 0
  for (let i = 1; i <= n; i++) {
    const idx = COLS.indexOf(header, from)
    if (idx === -1) return -1
    if (i === n) return idx
    from = idx + 1
  }
  return -1
}

/** Columns excluded from SUM in row 2. */
const EXCLUDED_SUM_COLS = new Set<string>([
  'Lp.',
  'schemat / nr klienta',
  'Adres\nMIASTO, ULICA NUMER',
  'WYKONANE\nTAK | NIE',
  'UWAGI',
  'TECHNOLOGIA\nHFC | GPON',
  'adres MAC dekodera',
  'numer SN dekodera | karty CI+',
  'adres MAC modemu',
  'US. 40/51 dBm',
  'DS. −9/+11 dBm',
  'Pomiar prędkości 300/600',
])

/* ───────────────────────── sheet builder ──────────────────────────── */
function buildSheet(wb: ExcelJS.Workbook, month: number) {
  const ws = wb.addWorksheet(`(${month})`)

  ws.properties.tabColor = { argb: tabColorForMonth(month) }

  // Top metrics: B1/B2/D1:D2 and title C1:C2
  ws.getCell('B1').value = {
    formula: `COUNTIF(D${DATA_START_ROW}:D${
      DATA_START_ROW + DEFAULT_DATA_ROWS - 1
    };"TAK")`,
  }
  ws.getCell('B2').value = {
    formula: `COUNTIF(D${DATA_START_ROW}:D${
      DATA_START_ROW + DEFAULT_DATA_ROWS - 1
    };"*")`,
  }
  ;['B1', 'B2'].forEach(
    (a) =>
      (ws.getCell(a).alignment = { horizontal: 'center', vertical: 'middle' })
  )

  ws.mergeCells(1, 3, 2, 3)
  const cTitle = ws.getCell(1, 3)
  cTitle.value = 'SKUTECZNOŚĆ'
  cTitle.font = { bold: true, size: 16 }
  cTitle.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  }

  ws.mergeCells(1, 4, 2, 4)
  const dRatio = ws.getCell(1, 4)
  dRatio.value = { formula: 'B1/B2' }
  dRatio.alignment = { horizontal: 'center', vertical: 'middle' }
  dRatio.numFmt = '0.00%'

  // Row 3: GROUPS (merged)
  let col = 4
  GROUPS.forEach(({ title, span }) => {
    ws.mergeCells(HEADER_ROW_1, col, HEADER_ROW_1, col + span - 1)
    const cell = ws.getCell(HEADER_ROW_1, col)
    cell.value = title
    cell.fill = LIGHT_GRAY
    cell.font = { bold: true, size: 14 }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }
    // vertical outlines for the whole section header
    for (let j = col; j <= col + span - 1; j++) {
      const h = ws.getCell(HEADER_ROW_1, j)
      h.border = {
        ...h.border,
        left: { style: 'medium' },
        right: { style: 'medium' },
      }
    }
    col += span
  })

  // Row 4: column headers
  ws.getRow(HEADER_ROW_2).height = 28 * 3
  COLS.forEach((hdr, i) => {
    const colNo = i + 1
    const fill = pickFill(hdr)

    if (colNo >= VERT_START) {
      const cell = ws.getCell(HEADER_ROW_1, colNo)
      cell.value = hdr
      cell.fill = fill
      cell.font = i < VERT_START - 1 ? DEFAULT_BLACK_BOLD : { bold: true }
      cell.border = BORDER
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        textRotation: 90,
      }
      ws.mergeCells(HEADER_ROW_1, colNo, HEADER_ROW_2, colNo)
    } else {
      const cell = ws.getCell(HEADER_ROW_2, colNo)
      cell.value = hdr
      cell.fill = fill
      cell.font = DEFAULT_BLACK_BOLD
      cell.border = BORDER
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      }
    }
  })

  // Freeze 4 rows
  ws.views = [{ state: 'frozen', ySplit: 4 }]

  // widths
  ws.columns.forEach((c, i) => (c.width = WIDTHS[COLS[i]] ?? 14))

  // Row 2: set SUM formulas for numeric/code/material columns
  COLS.forEach((hdr, i) => {
    const colIdx = i + 1
    if (colIdx === 2 || colIdx === 3 || colIdx === 4) return // B used, C/D merged
    if (EXCLUDED_SUM_COLS.has(hdr)) return
    const L = toLetter(colIdx)
    const cell = ws.getCell(2, colIdx)
    cell.value = {
      formula: `SUM(${L}${DATA_START_ROW}:${L}${
        DATA_START_ROW + DEFAULT_DATA_ROWS - 1
      })`,
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = pickFill(hdr)
    cell.border = BORDER
    cell.font = { bold: true }
  })

  // 400 template rows
  for (let r = 0; r < DEFAULT_DATA_ROWS; r++) {
    const row = ws.addRow(Array(COLS.length).fill(''))

    const lp = row.getCell(1)
    lp.value = r + 1
    lp.fill = LIGHT_GRAY
    lp.font = { bold: true, color: { argb: 'ff000000' } }
    lp.border = BORDER
    lp.alignment = { horizontal: 'center', vertical: 'middle' }

    LIGHT_BLUE_COLS.forEach((h) => {
      const idx = COLS.indexOf(h)
      if (idx !== -1) {
        const c = row.getCell(idx + 1)
        c.fill = LIGHT_BLUE
        c.border = BORDER
      }
    })

    row.eachCell({ includeEmpty: true }, (cell, idx) => {
      if (idx === 1) return
      const hdr = COLS[idx - 1]
      if (LIGHT_BLUE_COLS.has(hdr)) return
      if (DECODER_COLOR_COLS.has(hdr)) cell.fill = DECODER_COLOR
      if (MODEM_COLOR_COLS.has(hdr)) cell.fill = MODEM_COLOR
      cell.border = BORDER
    })

    if ((r + 1) % 25 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = { ...cell.border, bottom: { style: 'medium' } }
      })
    }
  }

  // Thick underline under row 4
  ws.getRow(HEADER_ROW_2).eachCell({ includeEmpty: true }, (cell) => {
    cell.border = { ...cell.border, bottom: { style: 'medium' } }
  })

  // Thick line ABOVE groups (under row 2), from column 4 to the end
  for (let c = 4; c <= COLS.length; c++) {
    const cell = ws.getCell(2, c)
    cell.border = { ...cell.border, bottom: { style: 'medium' } }
  }

  return ws
}

/** Draw thick vertical borders for every section across the whole table. */
function drawSectionOutlines(ws: ExcelJS.Worksheet) {
  let start = 4
  GROUPS.forEach(({ span }) => {
    const leftIdx = COLS.indexOf(COLS[start - 1]) + 1
    const rightIdx = COLS.indexOf(COLS[start + span - 2]) + 1
    ;[leftIdx, rightIdx].forEach((idx, k) => {
      ws.getColumn(idx).eachCell({ includeEmpty: true }, (cell, rowNo) => {
        if (rowNo < HEADER_ROW_1) return
        const side = k === 0 ? 'left' : 'right'
        cell.border = { ...cell.border, [side]: { style: 'medium' } }
      })
    })
    start += span
  })

  // Extra vertical thick borders for PION and LISTWY
  const extra = (header: string) => {
    const idx = COLS.indexOf(header) + 1
    if (idx < 1) return
    ws.getColumn(idx).eachCell({ includeEmpty: true }, (cell, rowNo) => {
      if (rowNo < HEADER_ROW_1) return
      cell.border = {
        ...cell.border,
        left: { style: 'medium' },
        right: { style: 'medium' },
      }
    })
  }
  extra('Pion (Ilość kondygnacji)')
  extra('Montaż listew / rur PCV (mb)')
}

/* ───────────────────────── main export ────────────────────────────── */
export async function writeInstallationTemplateFromDb(
  year: number
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.created = new Date(year, 0, 1)

  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31, 23, 59, 59, 999)

  const orders = await prisma.vectraOrder.findMany({
    where: {
      type: 'INSTALATION',
      date: { gte: start, lte: end },
      status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
    },
    include: {
      settlementEntries: { include: { rate: true } },
      usedMaterials: { include: { material: true } },
      services: true,
      assignedEquipment: { include: { warehouse: true } }, // needed for MAC/SN
    },
    orderBy: { date: 'asc' },
  })

  // group by month
  const byMonth: Record<number, typeof orders> = {}
  for (const o of orders) {
    const m = o.date.getMonth() + 1
    ;(byMonth[m] ||= []).push(o)
  }

  // pre-calc duplicated column indices
  const US_DEC_IDX = nthIndexOf('US. 40/51 dBm', 1) + 1
  const DS_DEC_IDX = nthIndexOf('DS. −9/+11 dBm', 1) + 1
  const US_NET_IDX = nthIndexOf('US. 40/51 dBm', 2) + 1
  const DS_NET_IDX = nthIndexOf('DS. −9/+11 dBm', 2) + 1

  for (let m = 1; m <= 12; m++) {
    const ws = buildSheet(wb, m)
    const rows = byMonth[m] ?? []

    // grow if > 400
    const extra = Math.max(0, rows.length - DEFAULT_DATA_ROWS)
    for (let i = 0; i < extra; i++) {
      const r = ws.addRow(Array(COLS.length).fill(''))
      const lpCell = r.getCell(1)
      lpCell.value = DEFAULT_DATA_ROWS + i + 1
      lpCell.fill = LIGHT_GRAY
      lpCell.font = { bold: true, color: { argb: 'ff000000' } }
      lpCell.border = BORDER
      lpCell.alignment = { horizontal: 'center', vertical: 'middle' }

      r.eachCell({ includeEmpty: true }, (cell, idx) => {
        if (idx === 1) return
        const hdr = COLS[idx - 1]
        if (LIGHT_BLUE_COLS.has(hdr)) cell.fill = LIGHT_BLUE
        if (DECODER_COLOR_COLS.has(hdr)) cell.fill = DECODER_COLOR
        if (MODEM_COLOR_COLS.has(hdr)) cell.fill = MODEM_COLOR
        cell.border = BORDER
      })
    }

    /** Row type for a single order in this month. */
    type OrderRow = (typeof rows)[number]

    /** Extracts US measurement as string or null when missing. */
    const extractUs = (v: number | null): string | null =>
      v !== null ? String(v) : null

    /** Extracts DS measurement as string or null when missing. */
    const extractDs = (v: number | null): string | null =>
      v !== null ? String(v) : null

    /** True when device category should be treated as modem-like (modem / SIM / extender). */
    const isModemLikeCategory = (cat: VectraDeviceCategory | null): boolean => {
      if (!cat) return false
      if (
        cat === VectraDeviceCategory.MODEM_HFC ||
        cat === VectraDeviceCategory.MODEM_GPON
      ) {
        return true
      }
      // SIM / EXTENDER are stored as OTHER.
      return cat === VectraDeviceCategory.OTHER
    }

    /** Returns label suffix for SIM/EXTENDER based on warehouse name. */
    const labelForOtherDevice = (
      name: string | null | undefined
    ): string | null => {
      if (!name) return null
      const lower = name.toLowerCase()
      if (lower.includes('sim')) return '[KARTA SIM]'
      if (lower.includes('ext')) return '[EXTENDER]'
      return null
    }

    /** Represents one logical decoder line. */
    type DecoderLine = {
      serials: string[]
      us: string[]
      ds: string[]
      isClientDevice: boolean
      isTwoWay: boolean
    }

    /** Represents one logical modem/SIM/EXTENDER line. */
    type ModemLine = {
      serials: string[]
      us: string[]
      ds: string[]
      speeds: string[]
      isOther: boolean // SIM/EXTENDER when true
      isClientDevice: boolean
    }

    type ExpandedLine = {
      order: OrderRow
      isFirstForOrder: boolean
      dec2?: DecoderLine
      dec1?: DecoderLine
      modem?: ModemLine
      dtvCount: number
      netCount: number
      telCount: number
      atvCount: number
    }

    const expandedRows: ExpandedLine[] = []

    for (const o of rows) {
      // issued equipment (warehouse) – relation is already scoped to this order
      const issued = o.assignedEquipment.filter(
        (e) => e.warehouse.status !== 'COLLECTED_FROM_CLIENT'
      )

      const dec1Equip = issued.filter(
        (e) => e.warehouse.category === VectraDeviceCategory.DECODER_1_WAY
      )
      const dec2Equip = issued.filter(
        (e) => e.warehouse.category === VectraDeviceCategory.DECODER_2_WAY
      )
      const modemLikeEquip = issued.filter((e) =>
        isModemLikeCategory(e.warehouse.category)
      )

      const dtvServices = o.services.filter((s) => s.type === 'DTV')
      const netServices = o.services.filter((s) => s.type === 'NET')
      const telServices = o.services.filter((s) => s.type === 'TEL')
      const atvServices = o.services.filter((s) => s.type === 'ATV')

      const dtvCount = dtvServices.length
      const netCount = netServices.length
      const telCount = telServices.length
      const atvCount = atvServices.length

      const deviceSerial = (serialNumber: string | null): string =>
        serialNumber?.trim() ?? ''

      const dec2Lines: DecoderLine[] = []
      const dec1Lines: DecoderLine[] = []
      const modemLines: ModemLine[] = []

      /* ===================== WAREHOUSE DECODERS ===================== */

      // 2-way from warehouse
      for (const d of dec2Equip) {
        const related = dtvServices.filter((s) => s.deviceId === d.warehouse.id)

        const baseSerial = deviceSerial(d.warehouse.serialNumber)
        const extraSerials = related
          .map((s) => deviceSerial(s.serialNumber))
          .filter((x) => x.length > 0)

        const serials = uniq(
          baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
        )

        const usValues = related
          .map((s) => extractUs(s.usDbmUp))
          .filter((x): x is string => x !== null)
        const dsValues = related
          .map((s) => extractDs(s.usDbmDown))
          .filter((x): x is string => x !== null)

        dec2Lines.push({
          serials,
          us: usValues,
          ds: dsValues,
          isClientDevice: false,
          isTwoWay: true,
        })
      }

      // 1-way from warehouse
      for (const d of dec1Equip) {
        const related = dtvServices.filter((s) => s.deviceId === d.warehouse.id)

        const baseSerial = deviceSerial(d.warehouse.serialNumber)
        const extraSerials = related
          .flatMap((s) => [s.serialNumber, s.serialNumber2])
          .map((v) => deviceSerial(v))
          .filter((x) => x.length > 0)

        const serials = uniq(
          baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
        )

        const usValues = related
          .map((s) => extractUs(s.usDbmUp))
          .filter((x): x is string => x !== null)
        const dsValues = related
          .map((s) => extractDs(s.usDbmDown))
          .filter((x): x is string => x !== null)

        dec1Lines.push({
          serials,
          us: usValues,
          ds: dsValues,
          isClientDevice: false,
          isTwoWay: false,
        })
      }

      /* ===================== WAREHOUSE MODEMS / SIM / EXT ===================== */

      for (const mDev of modemLikeEquip) {
        const relatedNet = netServices.filter(
          (s) => s.deviceId === mDev.warehouse.id
        )
        const relatedTel = telServices.filter(
          (s) => s.deviceId === mDev.warehouse.id
        )
        const related = [...relatedNet, ...relatedTel]

        const rawSerial = deviceSerial(mDev.warehouse.serialNumber)
        const label =
          mDev.warehouse.category === VectraDeviceCategory.OTHER
            ? labelForOtherDevice(mDev.warehouse.name)
            : null

        let baseSerial = rawSerial
        if (label) {
          baseSerial = rawSerial.length > 0 ? `${rawSerial} ${label}` : label
        }
        const extraSerials =
          mDev.warehouse.category === VectraDeviceCategory.OTHER
            ? []
            : related
                .map((s) => deviceSerial(s.serialNumber))
                .filter((x) => x.length > 0)

        const serials = uniq(
          baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
        )

        const usValues = related
          .map((s) => extractUs(s.usDbmUp))
          .filter((x): x is string => x !== null)
        const dsValues = related
          .map((s) => extractDs(s.usDbmDown))
          .filter((x): x is string => x !== null)
        const speeds = related
          .map((s) => s.speedTest ?? '')
          .filter((x) => x.length > 0)

        modemLines.push({
          serials,
          us: usValues,
          ds: dsValues,
          speeds,
          isOther: mDev.warehouse.category === VectraDeviceCategory.OTHER,
          isClientDevice: false,
        })
      }

      /* ===================== CLIENT DEVICES (no deviceId) ===================== */

      // DTV – client-owned decoders
      const dtvClient = dtvServices.filter((s) => !s.deviceId && s.serialNumber)
      for (const s of dtvClient) {
        const baseSerial = deviceSerial(s.serialNumber)
        const extraSerials = [s.serialNumber2]
          .map((v) => deviceSerial(v))
          .filter((x) => x.length > 0)

        const combinedSerials = uniq(
          baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
        )
        const serialsWithTag = combinedSerials.map(
          (sn) => `${sn} [SPRZĘT KLIENTA]`
        )

        const usValues = extractUs(s.usDbmUp)
        const dsValues = extractDs(s.usDbmDown)

        const usArr = usValues ? [usValues] : []
        const dsArr = dsValues ? [dsValues] : []

        if (s.deviceType === VectraDeviceCategory.DECODER_2_WAY) {
          dec2Lines.push({
            serials: serialsWithTag,
            us: usArr,
            ds: dsArr,
            isClientDevice: true,
            isTwoWay: true,
          })
        } else if (s.deviceType === VectraDeviceCategory.DECODER_1_WAY) {
          dec1Lines.push({
            serials: serialsWithTag,
            us: usArr,
            ds: dsArr,
            isClientDevice: true,
            isTwoWay: false,
          })
        }
      }

      // NET/TEL – client-owned modems
      const netTelClient = [...netServices, ...telServices].filter(
        (s) => !s.deviceId && s.serialNumber
      )
      for (const s of netTelClient) {
        const baseSerial = deviceSerial(s.serialNumber)
        const serial = baseSerial.length
          ? `${baseSerial} [SPRZĘT KLIENTA]`
          : '[SPRZĘT KLIENTA]'

        const usValues = extractUs(s.usDbmUp)
        const dsValues = extractDs(s.usDbmDown)
        const usArr = usValues ? [usValues] : []
        const dsArr = dsValues ? [dsValues] : []
        const speeds = s.speedTest ? [s.speedTest] : []

        modemLines.push({
          serials: [serial],
          us: usArr,
          ds: dsArr,
          speeds,
          isOther: false,
          isClientDevice: true,
        })
      }

      /* ===================== FALLBACK MEASUREMENTS (no devices) ===================== */

      if (
        dec2Lines.length === 0 &&
        dec1Lines.length === 0 &&
        dtvServices.length
      ) {
        const usValues = dtvServices
          .map((s) => extractUs(s.usDbmUp))
          .filter((x): x is string => x !== null)
        const dsValues = dtvServices
          .map((s) => extractDs(s.usDbmDown))
          .filter((x): x is string => x !== null)

        if (usValues.length || dsValues.length) {
          dec2Lines.push({
            serials: [],
            us: usValues,
            ds: dsValues,
            isClientDevice: false,
            isTwoWay: true,
          })
        }
      }

      if (
        modemLines.length === 0 &&
        (netServices.length || telServices.length)
      ) {
        const all = [...netServices, ...telServices]
        const usValues = all
          .map((s) => extractUs(s.usDbmUp))
          .filter((x): x is string => x !== null)
        const dsValues = all
          .map((s) => extractDs(s.usDbmDown))
          .filter((x): x is string => x !== null)
        const speeds = all
          .map((s) => s.speedTest ?? '')
          .filter((x) => x.length > 0)

        if (usValues.length || dsValues.length || speeds.length) {
          modemLines.push({
            serials: [],
            us: usValues,
            ds: dsValues,
            speeds,
            isOther: false,
            isClientDevice: false,
          })
        }
      }

      /* ===================== ORDER → MULTI-LINE EXPANSION ===================== */

      // SIM / EXTENDER last: first non-OTHER, then OTHER.
      const modemNonOther = modemLines.filter((l) => !l.isOther)
      const modemOther = modemLines.filter((l) => l.isOther)
      const finalModems = [...modemNonOther, ...modemOther]

      const lineCount = Math.max(
        dec2Lines.length,
        dec1Lines.length,
        finalModems.length,
        1
      )

      for (let i = 0; i < lineCount; i++) {
        const dec2Line = i < dec2Lines.length ? dec2Lines[i] : undefined
        const dec1Line = i < dec1Lines.length ? dec1Lines[i] : undefined
        const modemLine = i < finalModems.length ? finalModems[i] : undefined

        expandedRows.push({
          order: o,
          isFirstForOrder: i === 0,
          dec2: dec2Line,
          dec1: dec1Line,
          modem: modemLine,
          dtvCount,
          netCount,
          telCount,
          atvCount,
        })
      }
    }

    /* ===================== WRITE expandedRows TO SHEET ===================== */

    const IDX = (h: string) => COLS.indexOf(h) + 1

    expandedRows.forEach((entry, idx) => {
      const row = DATA_START_ROW + idx
      const o = entry.order

      // Order number and address repeated on every line for the order.
      ws.getCell(row, IDX('schemat / nr klienta')).value = o.orderNumber ?? ''
      ws.getCell(row, IDX('Adres\nMIASTO, ULICA NUMER')).value = [
        o.city,
        o.street,
      ]
        .filter(Boolean)
        .join(', ')

      // Status and notes only on the first line for the order.
      if (entry.isFirstForOrder) {
        ws.getCell(row, IDX('WYKONANE\nTAK | NIE')).value =
          o.status === 'COMPLETED' ? 'TAK' : 'NIE'
        ws.getCell(row, IDX('UWAGI')).value = o.notes ?? ''

        // Service counters + multiroom logic (only first line)
        if (entry.dtvCount > 0) {
          ws.getCell(row, IDX('DTV')).value = 1
          if (entry.dtvCount > 1) {
            ws.getCell(row, IDX('multiroom ATV/DTV; przebudowy')).value =
              entry.dtvCount - 1
          }
        }
        if (entry.netCount > 0) {
          ws.getCell(row, IDX('NET')).value = 1
        }
        if (entry.telCount > 0) {
          ws.getCell(row, IDX('TEL')).value = 1
        }
        if (entry.atvCount > 0) {
          ws.getCell(row, IDX('ATV')).value = 1
        }

        // Settlement codes summed only on the first line.
        for (const se of o.settlementEntries) {
          const colHdr = mapRateToCol(se.code)
          if (!colHdr) continue
          const colIndex = IDX(colHdr)
          if (colIndex > 0) {
            const current = Number(ws.getCell(row, colIndex).value || 0)
            ws.getCell(row, colIndex).value = current + (se.quantity ?? 0)
          }
        }

        // Materials summed only on the first line.
        for (const um of o.usedMaterials) {
          const colIndex = IDX(um.material?.name ?? '')
          if (colIndex > 0) {
            const current = Number(ws.getCell(row, colIndex).value || 0)
            ws.getCell(row, colIndex).value = current + (um.quantity ?? 0)
          }
        }
      }

      // DECODER 2-way → MAC column
      if (entry.dec2 && entry.dec2.serials.length) {
        ws.getCell(row, IDX('adres MAC dekodera')).value =
          entry.dec2.serials.join('\n')
        ws.getCell(row, IDX('adres MAC dekodera')).alignment = {
          wrapText: true,
        }
      }

      // DECODER 1-way → SN column
      if (entry.dec1 && entry.dec1.serials.length) {
        ws.getCell(row, IDX('numer SN dekodera | karty CI+')).value =
          entry.dec1.serials.join('\n')
        ws.getCell(row, IDX('numer SN dekodera | karty CI+')).alignment = {
          wrapText: true,
        }
      }

      // DTV measurements (first US/DS pair)
      if (entry.dec2 && entry.dec2.us.length) {
        const value =
          entry.dec2.us.length > 1 ? entry.dec2.us.join('\n') : entry.dec2.us[0]
        ws.getCell(row, US_DEC_IDX).value = value
        ws.getCell(row, US_DEC_IDX).alignment = { wrapText: true }
      }
      if (entry.dec2 && entry.dec2.ds.length) {
        const value =
          entry.dec2.ds.length > 1 ? entry.dec2.ds.join('\n') : entry.dec2.ds[0]
        ws.getCell(row, DS_DEC_IDX).value = value
        ws.getCell(row, DS_DEC_IDX).alignment = { wrapText: true }
      }

      // MODEM / SIM / EXTENDER
      if (entry.modem && entry.modem.serials.length) {
        ws.getCell(row, IDX('adres MAC modemu')).value =
          entry.modem.serials.join('\n')
        ws.getCell(row, IDX('adres MAC modemu')).alignment = { wrapText: true }
      }

      if (entry.modem && entry.modem.us.length) {
        const value =
          entry.modem.us.length > 1
            ? entry.modem.us.join('\n')
            : entry.modem.us[0]
        ws.getCell(row, US_NET_IDX).value = value
        ws.getCell(row, US_NET_IDX).alignment = { wrapText: true }
      }
      if (entry.modem && entry.modem.ds.length) {
        const value =
          entry.modem.ds.length > 1
            ? entry.modem.ds.join('\n')
            : entry.modem.ds[0]
        ws.getCell(row, DS_NET_IDX).value = value
        ws.getCell(row, DS_NET_IDX).alignment = { wrapText: true }
      }

      if (entry.modem && entry.modem.speeds.length) {
        ws.getCell(row, IDX('Pomiar prędkości 300/600')).value =
          entry.modem.speeds.join('\n')
        ws.getCell(row, IDX('Pomiar prędkości 300/600')).alignment = {
          wrapText: true,
        }
      }
    })

    // outlines + fix top formulas to last row
    drawSectionOutlines(ws)
    const lastRow =
      DATA_START_ROW + Math.max(expandedRows.length, DEFAULT_DATA_ROWS) - 1
    const range400 = `D${DATA_START_ROW}:D${
      DATA_START_ROW + DEFAULT_DATA_ROWS - 1
    }`
    ws.getCell('B1').value = { formula: `COUNTIF(${range400},"TAK")` }
    ws.getCell('B2').value = {
      formula: `COUNTIF(${range400},"TAK") + COUNTIF(${range400},"NIE")`,
    }

    // Row 2 sums (colored headers) – recalc to last data row
    COLS.forEach((hdr, i) => {
      const colIndex = i + 1
      if (colIndex <= 4) return
      if (EXCLUDED_SUM_COLS.has(hdr)) return
      const cell = ws.getCell(2, colIndex)
      const L = toLetter(colIndex)
      cell.value = { formula: `SUM(${L}${DATA_START_ROW}:${L}${lastRow})` }
    })
  }

  /* ───────────────────────── ZESTAWIENIE (summary) ───────────────────────── */
  const SUMMARY_COLUMNS: Array<{ label: string; sourceHeader: string }> = [
    { label: 'uruchomienie gniazda', sourceHeader: 'uruchomienie gniazda' },
    {
      label: 'uruchomienie instalacji przyłącza ab.',
      sourceHeader: 'uruchomienie instalacji przyłącza ab.',
    },
    { label: 'dekoder 2-way', sourceHeader: 'dekoder 2-way' },
    {
      label: 'dekoder 1-way / moduł CI+',
      sourceHeader: 'dekoder 1-way | moduł CI+',
    },
    {
      label: 'modem NET / terminal TEL',
      sourceHeader: 'modem NET / terminal TEL',
    },
    { label: 'PIONY', sourceHeader: 'Pion (Ilość kondygnacji)' },
    { label: 'KORYTKA', sourceHeader: 'Montaż listew / rur PCV (mb)' },
  ]

  const sumWs = wb.addWorksheet('ZESTAWIENIE')

  sumWs.properties.tabColor = { argb: 'fff70100' }

  // Layout & widths
  sumWs.getColumn(1).width = 4
  for (let i = 0; i < SUMMARY_COLUMNS.length + 1; i++) {
    sumWs.getColumn(i + 2).width = 18
  }

  // Title "INSTALACJE"
  const lastColIndex = 1 + 1 + SUMMARY_COLUMNS.length
  sumWs.mergeCells(2, 2, 2, lastColIndex)
  const title = sumWs.getCell(2, 2)
  title.value = 'INSTALACJE'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center', vertical: 'middle' }
  title.fill = LIGHT_BLUE
  title.border = THICK_BORDER

  // Header row (row 3)
  sumWs.getCell(3, 2).value = 'MC'
  sumWs.getCell(3, 2).font = { bold: true }
  sumWs.getCell(3, 2).border = BORDER
  for (let j = 0; j < SUMMARY_COLUMNS.length; j++) {
    const hdr = SUMMARY_COLUMNS[j]
    const cell = sumWs.getCell(3, 3 + j)
    cell.value = hdr.label
    cell.font = { bold: true }
    title.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = pickFill(hdr.sourceHeader)
    cell.border = BORDER
  }

  // Month rows (4..15) reference row 2 sums from monthly sheets
  for (let m = 1; m <= 12; m++) {
    const rowIndex = 3 + m
    const mcCell = sumWs.getCell(rowIndex, 2)
    mcCell.value = m
    mcCell.alignment = { horizontal: 'center', vertical: 'middle' }
    mcCell.border = BORDER
    mcCell.fill = LIGHT_GRAY

    for (let j = 0; j < SUMMARY_COLUMNS.length; j++) {
      const srcHeader = SUMMARY_COLUMNS[j].sourceHeader
      const srcColIdx = COLS.indexOf(srcHeader) + 1
      const srcColLetter = toLetter(srcColIdx)
      const cell = sumWs.getCell(rowIndex, 3 + j)
      cell.value = { formula: `'(${m})'!${srcColLetter}2` }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = BORDER
    }
  }

  // SUM row (row 16)
  const sumRowIndex = 16
  const sumLabel = sumWs.getCell(sumRowIndex, 2)
  sumLabel.value = 'SUMA'
  sumLabel.font = { bold: true }
  sumLabel.alignment = { horizontal: 'center', vertical: 'middle' }
  sumLabel.fill = LIGHT_GRAY
  sumLabel.border = THICK_BORDER

  for (let j = 0; j < SUMMARY_COLUMNS.length; j++) {
    const colIndex = 3 + j
    const colLetter = toLetter(colIndex)
    const cell = sumWs.getCell(sumRowIndex, colIndex)
    cell.value = { formula: `SUM(${colLetter}4:${colLetter}15)` }
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.fill = pickFill(SUMMARY_COLUMNS[j].sourceHeader)
    cell.border = THICK_BORDER
  }

  return Buffer.from(await wb.xlsx.writeBuffer())
}
/**
 * Generates installation template for a specific month.
 * Loads the full-year workbook, removes unused sheets,
 * and returns a single-sheet workbook as Node.js Buffer.
 */
export async function writeInstallationTemplateForMonth(
  year: number,
  month: number
): Promise<Buffer> {
  // Clamp month to 1..12
  const safeMonth = Math.min(12, Math.max(1, month))

  // 1) Full workbook buffer (ArrayBuffer recommended)
  const fullBuffer = await writeInstallationTemplateFromDb(year)

  // 2) Load workbook using ExcelJS
  const wb = new ExcelJS.Workbook()

  // ExcelJS accepts ArrayBuffer or Uint8Array
  await wb.xlsx.load(fullBuffer as unknown as ArrayBuffer)

  // 3) Keep only the target month sheet
  const targetSheetName = `(${safeMonth})`
  const sheets = [...wb.worksheets]

  for (const sheet of sheets) {
    if (sheet.name !== targetSheetName) {
      wb.removeWorksheet(sheet.id)
    }
  }

  // 4) Convert workbook to ArrayBuffer and wrap as Node.js Buffer
  const out = await wb.xlsx.writeBuffer()

  return Buffer.from(out)
}

/**
 * Generates a monthly installation report for a single technician.
 * - One worksheet: only selected month.
 * - Layout and styles identical to standard monthly template.
 * - Only orders assigned to given technician.
 */
export async function writeInstallationTemplateForTechnicianMonth(
  year: number,
  month: number,
  technicianId: string
): Promise<Buffer> {
  const safeMonth = Math.min(12, Math.max(1, month))

  // Create fresh workbook just for this technician + month
  const wb = new ExcelJS.Workbook()
  wb.created = new Date(year, safeMonth - 1, 1)

  // Build header + 400 template rows exactly like in main report
  const ws = buildSheet(wb, safeMonth)

  // Add technician name in top row (not touching B1–D1 metrics)
  const technician = await prisma.user.findUnique({
    where: { id: technicianId },
    select: { name: true },
  })

  if (technician?.name) {
    // Merge some cells in row 1 for technician label
    const startCol = 6
    const endCol = 16
    ws.mergeCells(1, startCol, 1, endCol)
    const nameCell = ws.getCell(1, startCol)
    nameCell.value = `Technik: ${technician.name}`
    nameCell.font = { bold: true }
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' }
  }

  // Date range for selected month
  const start = new Date(year, safeMonth - 1, 1)
  const end = new Date(year, safeMonth, 1)

  // Fetch ONLY technician's installation orders for this month
  const rows = await prisma.vectraOrder.findMany({
    where: {
      assignedToId: technicianId,
      type: 'INSTALATION',
      date: { gte: start, lt: end },
      status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
    },
    include: {
      settlementEntries: { include: { rate: true } },
      usedMaterials: { include: { material: true } },
      services: true,
      assignedEquipment: { include: { warehouse: true } },
    },
    orderBy: { date: 'asc' },
  })

  // ───── pre-calc duplicated column indices (identical to main report) ─────
  const US_DEC_IDX = nthIndexOf('US. 40/51 dBm', 1) + 1
  const DS_DEC_IDX = nthIndexOf('DS. −9/+11 dBm', 1) + 1
  const US_NET_IDX = nthIndexOf('US. 40/51 dBm', 2) + 1
  const DS_NET_IDX = nthIndexOf('DS. −9/+11 dBm', 2) + 1

  /** Row type for a single order in this month. */
  type OrderRow = (typeof rows)[number]

  /** Extracts US measurement as string or null when missing. */
  const extractUs = (v: number | null): string | null =>
    v !== null ? String(v) : null

  /** Extracts DS measurement as string or null when missing. */
  const extractDs = (v: number | null): string | null =>
    v !== null ? String(v) : null

  /** True when device category should be treated as modem-like (modem / SIM / extender). */
  const isModemLikeCategory = (cat: VectraDeviceCategory | null): boolean => {
    if (!cat) return false
    if (
      cat === VectraDeviceCategory.MODEM_HFC ||
      cat === VectraDeviceCategory.MODEM_GPON
    ) {
      return true
    }
    // SIM / EXTENDER are stored as OTHER.
    return cat === VectraDeviceCategory.OTHER
  }

  /** Returns label suffix for SIM/EXTENDER based on warehouse name. */
  const labelForOtherDevice = (
    name: string | null | undefined
  ): string | null => {
    if (!name) return null
    const lower = name.toLowerCase()
    if (lower.includes('sim')) return '[KARTA SIM]'
    if (lower.includes('ext')) return '[EXTENDER]'
    return null
  }

  /** Represents one logical decoder line. */
  type DecoderLine = {
    serials: string[]
    us: string[]
    ds: string[]
    isClientDevice: boolean
    isTwoWay: boolean
  }

  /** Represents one logical modem/SIM/EXTENDER line. */
  type ModemLine = {
    serials: string[]
    us: string[]
    ds: string[]
    speeds: string[]
    isOther: boolean // SIM/EXTENDER when true
    isClientDevice: boolean
  }

  type ExpandedLine = {
    order: OrderRow
    isFirstForOrder: boolean
    dec2?: DecoderLine
    dec1?: DecoderLine
    modem?: ModemLine
    dtvCount: number
    netCount: number
    telCount: number
    atvCount: number
  }

  const expandedRows: ExpandedLine[] = []

  // ───── SAME expansion logic as in writeInstallationTemplateFromDb ─────
  for (const o of rows) {
    // issued equipment (warehouse) – relation is already scoped to this order
    const issued = o.assignedEquipment.filter(
      (e) => e.warehouse.status !== 'COLLECTED_FROM_CLIENT'
    )

    const dec1Equip = issued.filter(
      (e) => e.warehouse.category === VectraDeviceCategory.DECODER_1_WAY
    )
    const dec2Equip = issued.filter(
      (e) => e.warehouse.category === VectraDeviceCategory.DECODER_2_WAY
    )
    const modemLikeEquip = issued.filter((e) =>
      isModemLikeCategory(e.warehouse.category)
    )

    const dtvServices = o.services.filter((s) => s.type === 'DTV')
    const netServices = o.services.filter((s) => s.type === 'NET')
    const telServices = o.services.filter((s) => s.type === 'TEL')
    const atvServices = o.services.filter((s) => s.type === 'ATV')

    const dtvCount = dtvServices.length
    const netCount = netServices.length
    const telCount = telServices.length
    const atvCount = atvServices.length

    const deviceSerial = (serialNumber: string | null): string =>
      serialNumber?.trim() ?? ''

    const dec2Lines: DecoderLine[] = []
    const dec1Lines: DecoderLine[] = []
    const modemLines: ModemLine[] = []

    /* ===================== WAREHOUSE DECODERS ===================== */

    // 2-way from warehouse
    for (const d of dec2Equip) {
      const related = dtvServices.filter((s) => s.deviceId === d.warehouse.id)

      const baseSerial = deviceSerial(d.warehouse.serialNumber)
      const extraSerials = related
        .map((s) => deviceSerial(s.serialNumber))
        .filter((x) => x.length > 0)

      const serials = uniq(
        baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
      )

      const usValues = related
        .map((s) => extractUs(s.usDbmUp))
        .filter((x): x is string => x !== null)
      const dsValues = related
        .map((s) => extractDs(s.usDbmDown))
        .filter((x): x is string => x !== null)

      dec2Lines.push({
        serials,
        us: usValues,
        ds: dsValues,
        isClientDevice: false,
        isTwoWay: true,
      })
    }

    // 1-way from warehouse
    for (const d of dec1Equip) {
      const related = dtvServices.filter((s) => s.deviceId === d.warehouse.id)

      const baseSerial = deviceSerial(d.warehouse.serialNumber)
      const extraSerials = related
        .flatMap((s) => [s.serialNumber, s.serialNumber2])
        .map((v) => deviceSerial(v))
        .filter((x) => x.length > 0)

      const serials = uniq(
        baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
      )

      const usValues = related
        .map((s) => extractUs(s.usDbmUp))
        .filter((x): x is string => x !== null)
      const dsValues = related
        .map((s) => extractDs(s.usDbmDown))
        .filter((x): x is string => x !== null)

      dec1Lines.push({
        serials,
        us: usValues,
        ds: dsValues,
        isClientDevice: false,
        isTwoWay: false,
      })
    }

    /* ===================== WAREHOUSE MODEMS / SIM / EXT ===================== */

    for (const mDev of modemLikeEquip) {
      const relatedNet = netServices.filter(
        (s) => s.deviceId === mDev.warehouse.id
      )
      const relatedTel = telServices.filter(
        (s) => s.deviceId === mDev.warehouse.id
      )
      const related = [...relatedNet, ...relatedTel]

      const rawSerial = deviceSerial(mDev.warehouse.serialNumber)
      const label =
        mDev.warehouse.category === VectraDeviceCategory.OTHER
          ? labelForOtherDevice(mDev.warehouse.name)
          : null

      let baseSerial = rawSerial
      if (label) {
        baseSerial = rawSerial.length > 0 ? `${rawSerial} ${label}` : label
      }
      const extraSerials =
        mDev.warehouse.category === VectraDeviceCategory.OTHER
          ? []
          : related
              .map((s) => deviceSerial(s.serialNumber))
              .filter((x) => x.length > 0)

      const serials = uniq(
        baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
      )

      const usValues = related
        .map((s) => extractUs(s.usDbmUp))
        .filter((x): x is string => x !== null)
      const dsValues = related
        .map((s) => extractDs(s.usDbmDown))
        .filter((x): x is string => x !== null)
      const speeds = related
        .map((s) => s.speedTest ?? '')
        .filter((x) => x.length > 0)

      modemLines.push({
        serials,
        us: usValues,
        ds: dsValues,
        speeds,
        isOther: mDev.warehouse.category === VectraDeviceCategory.OTHER,
        isClientDevice: false,
      })
    }

    /* ===================== CLIENT DEVICES (no deviceId) ===================== */

    // DTV – client-owned decoders
    const dtvClient = dtvServices.filter((s) => !s.deviceId && s.serialNumber)
    for (const s of dtvClient) {
      const baseSerial = deviceSerial(s.serialNumber)
      const extraSerials = [s.serialNumber2]
        .map((v) => deviceSerial(v))
        .filter((x) => x.length > 0)

      const combinedSerials = uniq(
        baseSerial.length > 0 ? [baseSerial, ...extraSerials] : extraSerials
      )
      const serialsWithTag = combinedSerials.map(
        (sn) => `${sn} [SPRZĘT KLIENTA]`
      )

      const usValues = extractUs(s.usDbmUp)
      const dsValues = extractDs(s.usDbmDown)

      const usArr = usValues ? [usValues] : []
      const dsArr = dsValues ? [dsValues] : []

      if (s.deviceType === VectraDeviceCategory.DECODER_2_WAY) {
        dec2Lines.push({
          serials: serialsWithTag,
          us: usArr,
          ds: dsArr,
          isClientDevice: true,
          isTwoWay: true,
        })
      } else if (s.deviceType === VectraDeviceCategory.DECODER_1_WAY) {
        dec1Lines.push({
          serials: serialsWithTag,
          us: usArr,
          ds: dsArr,
          isClientDevice: true,
          isTwoWay: false,
        })
      }
    }

    // NET/TEL – client-owned modems
    const netTelClient = [...netServices, ...telServices].filter(
      (s) => !s.deviceId && s.serialNumber
    )
    for (const s of netTelClient) {
      const baseSerial = deviceSerial(s.serialNumber)
      const serial = baseSerial.length
        ? `${baseSerial} [SPRZĘT KLIENTA]`
        : '[SPRZĘT KLIENTA]'

      const usValues = extractUs(s.usDbmUp)
      const dsValues = extractDs(s.usDbmDown)
      const usArr = usValues ? [usValues] : []
      const dsArr = dsValues ? [dsValues] : []
      const speeds = s.speedTest ? [s.speedTest] : []

      modemLines.push({
        serials: [serial],
        us: usArr,
        ds: dsArr,
        speeds,
        isOther: false,
        isClientDevice: true,
      })
    }

    /* ===================== FALLBACK MEASUREMENTS (no devices) ===================== */

    if (
      dec2Lines.length === 0 &&
      dec1Lines.length === 0 &&
      dtvServices.length
    ) {
      const usValues = dtvServices
        .map((s) => extractUs(s.usDbmUp))
        .filter((x): x is string => x !== null)
      const dsValues = dtvServices
        .map((s) => extractDs(s.usDbmDown))
        .filter((x): x is string => x !== null)

      if (usValues.length || dsValues.length) {
        dec2Lines.push({
          serials: [],
          us: usValues,
          ds: dsValues,
          isClientDevice: false,
          isTwoWay: true,
        })
      }
    }

    if (modemLines.length === 0 && (netServices.length || telServices.length)) {
      const all = [...netServices, ...telServices]
      const usValues = all
        .map((s) => extractUs(s.usDbmUp))
        .filter((x): x is string => x !== null)
      const dsValues = all
        .map((s) => extractDs(s.usDbmDown))
        .filter((x): x is string => x !== null)
      const speeds = all
        .map((s) => s.speedTest ?? '')
        .filter((x) => x.length > 0)

      if (usValues.length || dsValues.length || speeds.length) {
        modemLines.push({
          serials: [],
          us: usValues,
          ds: dsValues,
          speeds,
          isOther: false,
          isClientDevice: false,
        })
      }
    }

    /* ===================== ORDER → MULTI-LINE EXPANSION ===================== */

    // SIM / EXTENDER last: first non-OTHER, then OTHER.
    const modemNonOther = modemLines.filter((l) => !l.isOther)
    const modemOther = modemLines.filter((l) => l.isOther)
    const finalModems = [...modemNonOther, ...modemOther]

    const lineCount = Math.max(
      dec2Lines.length,
      dec1Lines.length,
      finalModems.length,
      1
    )

    for (let i = 0; i < lineCount; i++) {
      const dec2Line = i < dec2Lines.length ? dec2Lines[i] : undefined
      const dec1Line = i < dec1Lines.length ? dec1Lines[i] : undefined
      const modemLine = i < finalModems.length ? finalModems[i] : undefined

      expandedRows.push({
        order: o,
        isFirstForOrder: i === 0,
        dec2: dec2Line,
        dec1: dec1Line,
        modem: modemLine,
        dtvCount,
        netCount,
        telCount,
        atvCount,
      })
    }
  }

  /* ===================== WRITE expandedRows TO SHEET ===================== */

  const IDX = (h: string) => COLS.indexOf(h) + 1

  expandedRows.forEach((entry, idx) => {
    const rowNumber = DATA_START_ROW + idx
    const o = entry.order

    // Order number and address repeated on every line for the order.
    ws.getCell(rowNumber, IDX('schemat / nr klienta')).value =
      o.orderNumber ?? ''
    ws.getCell(rowNumber, IDX('Adres\nMIASTO, ULICA NUMER')).value = [
      o.city,
      o.street,
    ]
      .filter(Boolean)
      .join(', ')

    // Status and notes only on the first line for the order.
    if (entry.isFirstForOrder) {
      ws.getCell(rowNumber, IDX('WYKONANE\nTAK | NIE')).value =
        o.status === 'COMPLETED' ? 'TAK' : 'NIE'
      ws.getCell(rowNumber, IDX('UWAGI')).value = o.notes ?? ''

      // Service counters + multiroom logic (only first line)
      if (entry.dtvCount > 0) {
        ws.getCell(rowNumber, IDX('DTV')).value = 1
        if (entry.dtvCount > 1) {
          ws.getCell(rowNumber, IDX('multiroom ATV/DTV; przebudowy')).value =
            entry.dtvCount - 1
        }
      }
      if (entry.netCount > 0) {
        ws.getCell(rowNumber, IDX('NET')).value = 1
      }
      if (entry.telCount > 0) {
        ws.getCell(rowNumber, IDX('TEL')).value = 1
      }
      if (entry.atvCount > 0) {
        ws.getCell(rowNumber, IDX('ATV')).value = 1
      }

      // Settlement codes summed only on the first line.
      for (const se of o.settlementEntries) {
        const colHdr = mapRateToCol(se.code)
        if (!colHdr) continue
        const colIndex = IDX(colHdr)
        if (colIndex > 0) {
          const current = Number(ws.getCell(rowNumber, colIndex).value || 0)
          ws.getCell(rowNumber, colIndex).value = current + (se.quantity ?? 0)
        }
      }

      // Materials summed only on the first line.
      for (const um of o.usedMaterials) {
        const colIndex = IDX(um.material?.name ?? '')
        if (colIndex > 0) {
          const current = Number(ws.getCell(rowNumber, colIndex).value || 0)
          ws.getCell(rowNumber, colIndex).value = current + (um.quantity ?? 0)
        }
      }
    }

    // DECODER 2-way → MAC column
    if (entry.dec2 && entry.dec2.serials.length) {
      ws.getCell(rowNumber, IDX('adres MAC dekodera')).value =
        entry.dec2.serials.join('\n')
      ws.getCell(rowNumber, IDX('adres MAC dekodera')).alignment = {
        wrapText: true,
      }
    }

    // DECODER 1-way → SN column
    if (entry.dec1 && entry.dec1.serials.length) {
      ws.getCell(rowNumber, IDX('numer SN dekodera | karty CI+')).value =
        entry.dec1.serials.join('\n')
      ws.getCell(rowNumber, IDX('numer SN dekodera | karty CI+')).alignment = {
        wrapText: true,
      }
    }

    // DTV measurements (first US/DS pair)
    if (entry.dec2 && entry.dec2.us.length) {
      const value =
        entry.dec2.us.length > 1 ? entry.dec2.us.join('\n') : entry.dec2.us[0]
      ws.getCell(rowNumber, US_DEC_IDX).value = value
      ws.getCell(rowNumber, US_DEC_IDX).alignment = { wrapText: true }
    }
    if (entry.dec2 && entry.dec2.ds.length) {
      const value =
        entry.dec2.ds.length > 1 ? entry.dec2.ds.join('\n') : entry.dec2.ds[0]
      ws.getCell(rowNumber, DS_DEC_IDX).value = value
      ws.getCell(rowNumber, DS_DEC_IDX).alignment = { wrapText: true }
    }

    // MODEM / SIM / EXTENDER
    if (entry.modem && entry.modem.serials.length) {
      ws.getCell(rowNumber, IDX('adres MAC modemu')).value =
        entry.modem.serials.join('\n')
      ws.getCell(rowNumber, IDX('adres MAC modemu')).alignment = {
        wrapText: true,
      }
    }

    if (entry.modem && entry.modem.us.length) {
      const value =
        entry.modem.us.length > 1
          ? entry.modem.us.join('\n')
          : entry.modem.us[0]
      ws.getCell(rowNumber, US_NET_IDX).value = value
      ws.getCell(rowNumber, US_NET_IDX).alignment = { wrapText: true }
    }
    if (entry.modem && entry.modem.ds.length) {
      const value =
        entry.modem.ds.length > 1
          ? entry.modem.ds.join('\n')
          : entry.modem.ds[0]
      ws.getCell(rowNumber, DS_NET_IDX).value = value
      ws.getCell(rowNumber, DS_NET_IDX).alignment = { wrapText: true }
    }

    if (entry.modem && entry.modem.speeds.length) {
      ws.getCell(rowNumber, IDX('Pomiar prędkości 300/600')).value =
        entry.modem.speeds.join('\n')
      ws.getCell(rowNumber, IDX('Pomiar prędkości 300/600')).alignment = {
        wrapText: true,
      }
    }
  })

  // Draw vertical outlines and fix top formulas to last data row
  drawSectionOutlines(ws)

  const lastRow =
    DATA_START_ROW + Math.max(expandedRows.length, DEFAULT_DATA_ROWS) - 1
  const range400 = `D${DATA_START_ROW}:D${
    DATA_START_ROW + DEFAULT_DATA_ROWS - 1
  }`

  ws.getCell('B1').value = { formula: `COUNTIF(${range400},"TAK")` }
  ws.getCell('B2').value = {
    formula: `COUNTIF(${range400},"TAK") + COUNTIF(${range400},"NIE")`,
  }

  // Row 2 sums – recalc to last data row
  COLS.forEach((hdr, i) => {
    const colIndex = i + 1
    if (colIndex <= 4) return
    if (EXCLUDED_SUM_COLS.has(hdr)) return
    const cell = ws.getCell(2, colIndex)
    const L = toLetter(colIndex)
    cell.value = { formula: `SUM(${L}${DATA_START_ROW}:${L}${lastRow})` }
  })

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
