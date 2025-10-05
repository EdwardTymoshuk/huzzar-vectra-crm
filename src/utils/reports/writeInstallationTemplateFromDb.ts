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
} from '@/lib/exelReportsConstants'
import { prisma } from '@/utils/prisma'
import { DeviceCategory } from '@prisma/client'
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
  'adres MAC dekodera': 18,
  'adres MAC modemu': 18,
  'numer SN dekodera | karty CI+': 18,
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

  const orders = await prisma.order.findMany({
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

  const IDX = (h: string) => COLS.indexOf(h) + 1

  for (let m = 1; m <= 12; m++) {
    const ws = buildSheet(wb, m)
    const rows = byMonth[m] ?? []

    // grow if > 400
    const extra = Math.max(0, rows.length - DEFAULT_DATA_ROWS)
    for (let i = 0; i < extra; i++) {
      const r = ws.addRow(Array(COLS.length).fill(''))
      const lp = r.getCell(1)
      lp.value = DEFAULT_DATA_ROWS + i + 1
      lp.fill = LIGHT_GRAY
      lp.font = { bold: true, color: { argb: 'ff000000' } }
      lp.border = BORDER
      lp.alignment = { horizontal: 'center', vertical: 'middle' }
      r.eachCell({ includeEmpty: true }, (cell, idx) => {
        if (idx === 1) return
        const hdr = COLS[idx - 1]
        if (LIGHT_BLUE_COLS.has(hdr)) cell.fill = LIGHT_BLUE
        if (DECODER_COLOR_COLS.has(hdr)) cell.fill = DECODER_COLOR
        if (MODEM_COLOR_COLS.has(hdr)) cell.fill = MODEM_COLOR
        cell.border = BORDER
      })
    }

    // fill data
    rows.forEach((o, i) => {
      const row = DATA_START_ROW + i

      // base
      ws.getCell(row, IDX('schemat / nr klienta')).value = o.orderNumber ?? ''
      ws.getCell(row, IDX('Adres\nMIASTO, ULICA NUMER')).value = [
        o.city,
        o.street,
      ]
        .filter(Boolean)
        .join(', ')
      ws.getCell(row, IDX('WYKONANE\nTAK | NIE')).value =
        o.status === 'COMPLETED' ? 'TAK' : 'NIE'
      ws.getCell(row, IDX('UWAGI')).value = o.notes ?? ''

      // services counters
      const count = (t: 'DTV' | 'NET' | 'TEL' | 'ATV') =>
        o.services.filter((s) => s.type === t).length
      if (o.services?.length) {
        ws.getCell(row, IDX('DTV')).value = count('DTV') || 0
        ws.getCell(row, IDX('NET')).value = count('NET') || 0
        ws.getCell(row, IDX('TEL')).value = count('TEL') || 0
        ws.getCell(row, IDX('ATV')).value = count('ATV') || 0
      }

      // ── issued equipment only (exclude collected-from-client) ───────────
      const issuedEquip = o.assignedEquipment.filter(
        (e) => e.warehouse.status !== 'COLLECTED_FROM_CLIENT'
      )

      const dec1 = issuedEquip.filter(
        (e) => e.warehouse.category === DeviceCategory.DECODER_1_WAY
      )
      const dec2 = issuedEquip.filter(
        (e) => e.warehouse.category === DeviceCategory.DECODER_2_WAY
      )
      const modems = issuedEquip.filter(
        (e) =>
          e.warehouse.category === DeviceCategory.MODEM_GPON ||
          e.warehouse.category === DeviceCategory.MODEM_HFC
      )

      const dec1Ids = new Set(dec1.map((d) => d.warehouse.id))
      const dec2Ids = new Set(dec2.map((d) => d.warehouse.id))
      const issuedDecoderIds = new Set<string>([
        ...Array.from(dec1Ids),
        ...Array.from(dec2Ids),
      ])
      const issuedModemIds = new Set(modems.map((m) => m.warehouse.id))

      const dtvServices = o.services.filter(
        (s) =>
          s.type === 'DTV' && (!s.deviceId || issuedDecoderIds.has(s.deviceId))
      )
      const netServices = o.services.filter(
        (s) =>
          s.type === 'NET' && (!s.deviceId || issuedModemIds.has(s.deviceId))
      )
      const telServices = o.services.filter(
        (s) =>
          s.type === 'TEL' && (!s.deviceId || issuedModemIds.has(s.deviceId))
      )

      // ── DECODERS SPLIT ─────────────────────────────────────────────
      // 2-way → "adres MAC dekodera" (wpisujemy SN-y urządzeń 2-way + ewentualne serialNumber z usług powiązanych z 2-way)
      const dec2MACs = uniq([
        ...(dec2
          .map((d) => d.warehouse.serialNumber?.trim())
          .filter(Boolean) as string[]),
        ...(dtvServices
          .filter((s) => s.deviceId && dec2Ids.has(s.deviceId))
          .map((s) => s.serialNumber?.trim())
          .filter(Boolean) as string[]),
      ])

      // 1-way → "numer SN dekodera | karty CI+" (SN + karta CI+)
      const dec1SNs = uniq([
        ...(dec1
          .map((d) => d.warehouse.serialNumber?.trim())
          .filter(Boolean) as string[]),
        ...(dtvServices
          .filter((s) => s.deviceId && dec1Ids.has(s.deviceId))
          .flatMap((s) => [s.serialNumber?.trim(), s.serialNumber2?.trim()])
          .filter(Boolean) as string[]),
      ])

      if (dec2MACs.length) {
        const c = ws.getCell(row, IDX('adres MAC dekodera'))
        c.value = dec2MACs.join('\n')
        c.alignment = { wrapText: true }
      }
      if (dec1SNs.length) {
        const c = ws.getCell(row, IDX('numer SN dekodera | karty CI+'))
        c.value = dec1SNs.join('\n')
        c.alignment = { wrapText: true }
      }

      // ── MODEM MACs ────────────────────────────────────────────────
      const modemMacs = uniq([
        ...(modems
          .map((m) => m.warehouse.serialNumber?.trim())
          .filter(Boolean) as string[]),
        ...(netServices
          .map((s) => s.serialNumber?.trim())
          .filter(Boolean) as string[]),
        ...(telServices
          .map((s) => s.serialNumber?.trim())
          .filter(Boolean) as string[]),
      ])
      if (modemMacs.length) {
        const c = ws.getCell(row, IDX('adres MAC modemu'))
        c.value = modemMacs.join('\n')
        c.alignment = { wrapText: true }
      }

      // ── measurements (US/DS/speed) ─────────────────────────────────
      const nums = (xs: Array<number | null | undefined>) =>
        xs.filter((v): v is number => v !== null && v !== undefined).map(String)

      // DTV → first pair US/DS
      const usDtv = nums(dtvServices.map((s) => s.usDbmUp))
      const dsDtv = nums(dtvServices.map((s) => s.usDbmDown))
      if (US_DEC_IDX > 0 && usDtv.length) {
        const c = ws.getCell(row, US_DEC_IDX)
        c.value = usDtv.length > 1 ? usDtv.join('\n') : usDtv[0]
        c.alignment = { wrapText: true }
      }
      if (DS_DEC_IDX > 0 && dsDtv.length) {
        const c = ws.getCell(row, DS_DEC_IDX)
        c.value = dsDtv.length > 1 ? dsDtv.join('\n') : dsDtv[0]
        c.alignment = { wrapText: true }
      }

      // NET/TEL → second pair US/DS (combined)
      const usNetTel = nums([
        ...netServices.map((s) => s.usDbmUp),
        ...telServices.map((s) => s.usDbmUp),
      ])
      const dsNetTel = nums([
        ...netServices.map((s) => s.usDbmDown),
        ...telServices.map((s) => s.usDbmDown),
      ])
      if (US_NET_IDX > 0 && usNetTel.length) {
        const c = ws.getCell(row, US_NET_IDX)
        c.value = usNetTel.length > 1 ? usNetTel.join('\n') : usNetTel[0]
        c.alignment = { wrapText: true }
      }
      if (DS_NET_IDX > 0 && dsNetTel.length) {
        const c = ws.getCell(row, DS_NET_IDX)
        c.value = dsNetTel.length > 1 ? dsNetTel.join('\n') : dsNetTel[0]
        c.alignment = { wrapText: true }
      }

      // Speedtests (strings, NET/TEL)
      const speeds = uniq([
        ...(netServices.map((s) => s.speedTest).filter(Boolean) as string[]),
        ...(telServices.map((s) => s.speedTest).filter(Boolean) as string[]),
      ])
      if (speeds.length) {
        const c = ws.getCell(row, IDX('Pomiar prędkości 300/600'))
        c.value = speeds.join('\n')
        c.alignment = { wrapText: true }
      }

      // ── settlement codes → add quantities to mapped columns ────────
      for (const se of o.settlementEntries) {
        const colHdr = mapRateToCol(se.code)
        if (!colHdr) continue
        const col = IDX(colHdr)
        if (col > 0) {
          const cur = Number(ws.getCell(row, col).value || 0)
          ws.getCell(row, col).value = cur + (se.quantity ?? 0)
        }
      }

      // materials → sum to their exact-name columns
      for (const um of o.usedMaterials) {
        const col = IDX(um.material?.name ?? '')
        if (col > 0) {
          const cur = Number(ws.getCell(row, col).value || 0)
          ws.getCell(row, col).value = cur + (um.quantity ?? 0)
        }
      }
    })

    // outlines + fix top formulas to last row
    drawSectionOutlines(ws)
    const last = DATA_START_ROW + Math.max(rows.length, DEFAULT_DATA_ROWS) - 1
    const range400 = `D${DATA_START_ROW}:D${
      DATA_START_ROW + DEFAULT_DATA_ROWS - 1
    }`
    ws.getCell('B1').value = { formula: `COUNTIF(${range400};"TAK")` }
    ws.getCell('B2').value = {
      formula: `COUNTIF(${range400};"TAK")+COUNTIF(${range400};"NIE")`,
    }

    // Row 2 sums (colored headers) – recalc to last data row
    COLS.forEach((hdr, i) => {
      const col = i + 1
      if (col <= 4) return
      if (EXCLUDED_SUM_COLS.has(hdr)) return
      const cell = ws.getCell(2, col)
      const L = toLetter(col)
      cell.value = { formula: `SUM(${L}${DATA_START_ROW}:${L}${last})` }
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
