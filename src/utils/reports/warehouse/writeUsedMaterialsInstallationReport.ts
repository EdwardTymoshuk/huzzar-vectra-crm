import { BORDER, LIGHT_GRAY } from '@/lib/exelReportsConstants'
import { prisma } from '@/utils/prisma'
import ExcelJS from 'exceljs'

/**
 * writeUsedMaterialsInstallationReport
 * --------------------------------------------------------------------
 * Generates an Excel report listing all materials used
 * in COMPLETED INSTALLATION orders within the given date range.
 */
export async function writeUsedMaterialsInstallationReport(
  from: Date,
  to: Date
): Promise<Buffer> {
  const usedMaterials = await prisma.orderMaterial.findMany({
    where: {
      order: {
        type: 'INSTALATION', // IMPORTANT: matches enum in schema
        status: 'COMPLETED',
        completedAt: {
          gte: from,
          lte: to,
        },
      },
    },
    include: {
      material: true,
      order: {
        include: {
          assignedTo: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: {
      material: {
        name: 'asc',
      },
    },
  })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Zużyte materiały')

  // Columns
  sheet.columns = [
    { header: 'Lp.', width: 6 },
    { header: 'Materiał', width: 30 },
    { header: 'Index', width: 18 },
    { header: 'Jednostka', width: 14 },
    { header: 'Ilość', width: 12 },
    { header: 'Technik', width: 25 },
    { header: 'Zlecenie', width: 18 },
    { header: 'Data realizacji', width: 18 },
  ]

  // Title
  sheet.mergeCells(1, 1, 1, 8)
  const titleCell = sheet.getCell(1, 1)
  titleCell.value = `ZESTAWIENIE ZUŻYTYCH MATERIAŁÓW | ${from
    .toLocaleString('pl-PL', { month: 'long', year: 'numeric' })
    .toUpperCase()}`
  titleCell.font = { bold: true, size: 14 }

  // Header
  const headerRow = sheet.addRow(sheet.columns.map((c) => c.header))
  headerRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = BORDER
    cell.fill = LIGHT_GRAY
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  let lp = 1

  for (const item of usedMaterials) {
    const row = sheet.addRow([
      lp++,
      item.material.name,
      item.material.index ?? '',
      item.unit,
      item.quantity,
      item.order.assignedTo?.name ?? '',
      item.order.orderNumber,
      item.order.completedAt
        ? item.order.completedAt.toLocaleDateString('pl-PL')
        : '',
    ])

    row.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
