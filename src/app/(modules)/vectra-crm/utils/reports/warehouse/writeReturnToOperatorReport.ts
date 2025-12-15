import {
  BORDER,
  LIGHT_GRAY,
} from '@/app/(modules)/vectra-crm/lib/exelReportsConstants'
import { devicesTypeMap, materialUnitMap } from '@/lib/constants'
import { prisma } from '@/utils/prisma'
import ExcelJS from 'exceljs'

/**
 * writeReturnToOperatorReport
 * ------------------------------------------------------------
 * One-sheet Excel report summarizing a return-to-operator action.
 * Includes metadata + lists of devices and materials.
 */
export async function writeReturnToOperatorReport(historyIds: string[]) {
  const history = await prisma.vectraWarehouseHistory.findMany({
    where: { id: { in: historyIds } },
    include: {
      performedBy: true,
      warehouseItem: {
        include: { materialDefinition: true, location: true },
      },
      fromLocation: true,
    },
    orderBy: { actionDate: 'asc' },
  })

  if (history.length === 0) throw new Error('Brak pozycji w historii.')

  const meta = history[0]
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Zwrot do operatora')

  // Column width
  sheet.columns = [
    { width: 16 },
    { width: 30 },
    { width: 20 },
    { width: 22 },
    { width: 12 },
    { width: 12 },
  ]

  let rowCursor = 1

  //
  // ---------------- META SECTION ----------------
  //
  const metaRows = [
    ['Osoba wykonująca', meta.performedBy.name],
    ['Data i godzina', meta.actionDate.toLocaleString('pl-PL')],
    ['Lokalizacja', meta.fromLocation?.name ?? '-'],
    ['Notatki', meta.notes ?? '-'],
  ]

  for (const [label, value] of metaRows) {
    const row = sheet.getRow(rowCursor++)
    row.getCell(1).value = label
    row.getCell(2).value = value

    row.getCell(1).font = { bold: true }
    row.getCell(1).border = BORDER
    row.getCell(2).border = BORDER

    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' }
  }

  rowCursor++

  //
  // ---------------- DEVICES SECTION ----------------
  //
  const deviceRows = history.filter(
    (h) => h.warehouseItem.itemType === 'DEVICE'
  )

  if (deviceRows.length > 0) {
    const hRow = sheet.getRow(rowCursor++)
    hRow.getCell(1).value = 'Urządzenia'
    hRow.getCell(1).font = { bold: true, size: 14 }
  }

  if (deviceRows.length > 0) {
    // Header
    const header = sheet.getRow(rowCursor++)
    header.values = ['Lp.', 'Nazwa', 'Kategoria', 'SN / MAC', 'Ilość']

    header.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = LIGHT_GRAY
      cell.border = BORDER
      cell.alignment = { horizontal: 'center' }
    })
  }

  let lpDev = 1
  for (const d of deviceRows) {
    const row = sheet.getRow(rowCursor++)
    row.values = [
      lpDev++,
      d.warehouseItem.name,
      d.warehouseItem.category ? devicesTypeMap[d.warehouseItem.category] : '',
      d.warehouseItem.serialNumber ?? '',
      1,
      '',
    ]

    row.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })
  }

  if (deviceRows.length > 0) rowCursor++
  //
  // ---------------- MATERIALS SECTION ----------------
  //
  const materialRows = history.filter(
    (h) => h.warehouseItem.itemType === 'MATERIAL'
  )

  if (materialRows.length > 0) {
    const hRow = sheet.getRow(rowCursor++)
    hRow.getCell(1).value = 'Materiały'
    hRow.getCell(1).font = { bold: true, size: 14 }
  }

  if (materialRows.length > 0) {
    const header = sheet.getRow(rowCursor++)
    header.values = ['Lp.', 'Nazwa', 'Index', 'Ilość', 'Jednostka']

    header.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = LIGHT_GRAY
      cell.border = BORDER
      cell.alignment = { horizontal: 'center' }
    })
  }

  let lpMat = 1
  for (const m of materialRows) {
    const row = sheet.getRow(rowCursor++)
    row.values = [
      lpMat++,
      m.warehouseItem.name,
      m.warehouseItem.materialDefinition?.index ?? '',
      m.quantity ?? 0,
      m.warehouseItem.materialDefinition
        ? materialUnitMap[m.warehouseItem.materialDefinition.unit]
        : '',
      '',
    ]

    row.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { horizontal: 'center' }
    })
  }

  //
  // FINISH
  //
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
