// utils/writeWorkCodeExecutionReport.ts
import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

/**
 * Row  = single calendar day
 * Col  = settlement work-code
 * Last row = totals
 * A1:??2   = merged, centred title with chosen date range
 */
export type WorkCodeSummaryRow = {
  date: string // already “dd.MM.yyyy”
  [code: string]: string | number
}

export const writeWorkCodeExecutionReport = async (
  rows: WorkCodeSummaryRow[],
  allCodes: string[],
  fileName: string,
  dateRange: { from: string; to: string }
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(fileName)

  /* ─────────────────────────
   *  Re-usable styles
   * ───────────────────────── */
  const blueFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2297DB' },
  }
  const borderThin = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  }

  /* ─────────────────────────
   *  1.  Merged title (rows 1-2)
   * ───────────────────────── */
  const titlePL = `ZESTAWIENIE WYKONANYCH PRAC ZA OKRES OD ${dateRange.from} DO ${dateRange.to}`
  const headerCols = ['Data', ...allCodes] // table headers (Polish)
  ws.mergeCells(1, 1, 2, headerCols.length) // A1 : lastCol2
  const titleCell = ws.getCell(1, 1)
  titleCell.value = titlePL.toUpperCase()
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFFFF' },
  }

  /* ─────────────────────────
   *  2.  Table header row
   * ───────────────────────── */
  const headerRow = ws.addRow(headerCols) // this becomes row 3
  headerRow.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = blueFill
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = borderThin
  })

  /* ─────────────────────────
   *  3.  Data rows + totals
   * ───────────────────────── */
  const totals: Record<string, number> = Object.fromEntries(
    allCodes.map((code) => [code, 0])
  )

  rows.forEach((r) => {
    const dataValues = [r.date, ...allCodes.map((code) => r[code] ?? '')]
    ws.addRow(dataValues).eachCell((c) => {
      c.alignment = { horizontal: 'center', vertical: 'middle' }
      c.border = borderThin
    })
    // accumulate totals
    allCodes.forEach((code) => {
      if (typeof r[code] === 'number') totals[code] += r[code] as number
    })
  })

  /* ─────────────────────────
   *  4.  Summary row (bold)
   * ───────────────────────── */
  const summaryRow = ws.addRow([
    'Podsumowanie',
    ...allCodes.map((c) => totals[c]),
  ])
  summaryRow.eachCell((c) => {
    c.font = { bold: true }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = borderThin
  })

  /* ─────────────────────────
   *  5.  Auto-width
   *      – skip rows 1-2 (merged title)
   *      – base on longest real value
   * ───────────────────────── */
  ws.columns.forEach((col) => {
    let max = 0
    col.eachCell?.({ includeEmpty: false }, (cell, rowNo) => {
      if (rowNo <= 2) return // ignore merged title rows
      max = Math.max(max, String(cell.value ?? '').length)
    })
    col.width = max + 1 // +1 small buffer
  })

  return Buffer.from(await wb.xlsx.writeBuffer())
}
