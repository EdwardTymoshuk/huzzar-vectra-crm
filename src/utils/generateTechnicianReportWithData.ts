import { headers, sectionHeaders } from '@/lib/constants'
import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

export const generateTechnicianReportWithData = async (
  fileName: string,
  rows: Record<string, string | number>[]
) => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(fileName)

  // Indices for blue columns
  const blueCols = [
    headers.indexOf('uruchomienie gniazda') + 1,
    headers.indexOf('uruchomienie instalacji przyłącza ab.') + 1,
  ]

  // Indices where to set thick left border (section starts)
  const sectionStarts = [4, 7, 12, 14, 27]

  // 1. Add section row
  ws.addRow(sectionHeaders)
  // 2. Add headers row
  ws.addRow(headers)

  // 3. Merge section headers
  let start = 1,
    last = sectionHeaders[0]
  for (let i = 1; i <= sectionHeaders.length; i++) {
    if (sectionHeaders[i] !== last || i === sectionHeaders.length) {
      if (last && last !== '') {
        ws.mergeCells(1, start, 1, i)
        ws.getCell(1, start).alignment = {
          horizontal: 'center',
          vertical: 'middle',
        }
        ws.getCell(1, start).font = { bold: true }
        ws.getCell(1, start).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEEEEE' },
        }
      }
      last = sectionHeaders[i]
      start = i + 1
    }
  }

  // 4. Style main headers (row 2)
  ws.getRow(2).eachCell((cell, colNumber) => {
    // Blue fill for two selected columns
    if (blueCols.includes(colNumber)) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD4E6F7' },
      }
    } else {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD6EAF8' },
      }
    }

    // Bold and center
    cell.font = { bold: true }
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    }

    // Borders: default thin, thick left for section start
    const isThickLeft = sectionStarts.includes(colNumber)
    cell.border = {
      top: { style: 'thin' },
      left: { style: isThickLeft ? 'thick' : 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // 5. Add order rows
  for (const row of rows) {
    ws.addRow(headers.map((key) => row[key] ?? ''))
  }

  // 6. Autosize columns
  ws.columns.forEach((col) => {
    col.width = Math.max(14, String(col.header || '').length + 4)
  })

  return Buffer.from(await wb.xlsx.writeBuffer())
}
