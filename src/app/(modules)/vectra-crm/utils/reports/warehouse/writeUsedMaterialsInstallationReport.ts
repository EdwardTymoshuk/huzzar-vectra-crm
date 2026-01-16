import { polishMonthsNominative } from '@/lib/constants'
import { prisma } from '@/utils/prisma'
import ExcelJS from 'exceljs'
import { BORDER, LIGHT_GRAY } from '../../../lib/exelReportsConstants'

/**
 * writeUsedMaterialsInstallationReport
 * --------------------------------------------------------------------
 * Generates a monthly aggregated Excel report of all materials used
 * in INSTALLATION orders.
 */
export async function writeUsedMaterialsInstallationReport(
  year: number,
  month: number // 0–11
): Promise<Buffer> {
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0, 23, 59, 59)

  const rows = await prisma.vectraOrderMaterial.groupBy({
    by: ['materialId', 'unit'],
    where: {
      order: {
        type: 'INSTALATION',
        status: 'COMPLETED',
        completedAt: {
          gte: from,
          lte: to,
        },
      },
    },
    _sum: {
      quantity: true,
    },
  })

  const materials = await prisma.vectraMaterialDefinition.findMany({
    where: {
      id: { in: rows.map((r) => r.materialId) },
    },
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Zużyte materiały')

  // Columns
  sheet.columns = [
    { header: 'Lp.', width: 6 },
    { header: 'Materiał', width: 40 },
    { header: 'Index', width: 20 },
    { header: 'Jednostka', width: 10 },
    { header: 'Ilość', width: 14 },
  ]

  // ---- TITLE ----
  sheet.mergeCells(1, 1, 1, 5)
  const title = sheet.getCell(1, 1)
  title.value = `ZESTAWIENIE ZUŻYTYCH MATERIAŁÓW | ${polishMonthsNominative[
    month
  ].toUpperCase()} ${year}`
  title.font = { size: 16, bold: true }
  title.alignment = { horizontal: 'center', vertical: 'middle' }

  // ---- HEADER ----
  const header = sheet.addRow(sheet.columns.map((c) => c.header))
  header.eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = BORDER
    cell.fill = LIGHT_GRAY
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  let lp = 1

  for (const row of rows) {
    const def = materials.find((m) => m.id === row.materialId)
    if (!def || !row._sum.quantity) continue

    const unitLabel = row.unit === 'METER' ? 'mb' : 'szt'

    const dataRow = sheet.addRow([
      lp++,
      def.name,
      def.index ?? '',
      unitLabel,
      row._sum.quantity,
    ])

    dataRow.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
