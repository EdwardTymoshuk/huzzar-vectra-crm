import { BORDER, LIGHT_GRAY } from '@/lib/exelReportsConstants'
import ExcelJS from 'exceljs'
import { prisma } from '../../prisma'

/**
 * writeTechnicianStockReport
 * --------------------------------------------------------------------
 * Generates a two-sheet Excel report showing only the *actual* stock
 * of the selected technician. Devices and materials are placed into
 * separate worksheets. Items with quantity = 0 are omitted.
 */
export async function writeTechnicianStockReport(
  technicianId: string
): Promise<Buffer> {
  // Fetch technician
  const tech = await prisma.user.findUnique({
    where: { id: technicianId },
    select: { id: true, name: true },
  })
  if (!tech) throw new Error('Technik nie istnieje')

  // Fetch ALL items assigned to this technician
  const allStock = await prisma.warehouse.findMany({
    where: {
      assignedToId: technicianId,
      status: 'ASSIGNED',
    },
    include: {
      materialDefinition: true,
    },
    orderBy: [{ itemType: 'asc' }, { name: 'asc' }],
  })

  // Filter out materials with quantity = 0
  const devices = allStock.filter((i) => i.itemType === 'DEVICE')
  const materials = allStock.filter(
    (i) => i.itemType === 'MATERIAL' && (i.quantity ?? 0) > 0
  )

  const workbook = new ExcelJS.Workbook()

  //
  // ----------------------------------------------------------
  // Sheet 1 — DEVICES
  // ----------------------------------------------------------
  //
  const sheetDevices = workbook.addWorksheet(`${tech.name} — Urządzenia`)

  sheetDevices.getColumn(1).width = 6
  sheetDevices.getColumn(2).width = 30
  sheetDevices.getColumn(3).width = 18
  sheetDevices.getColumn(4).width = 25
  sheetDevices.getColumn(5).width = 18
  sheetDevices.getColumn(6).width = 12

  sheetDevices.mergeCells(1, 1, 1, 6)
  const devTitle = sheetDevices.getCell(1, 1)
  devTitle.value = `Stan technika: ${tech.name} — Urządzenia`
  devTitle.font = { bold: true, size: 14 }

  const devHeader = sheetDevices.addRow([
    'Lp.',
    'Nazwa',
    'Kategoria',
    'SN / MAC',
    'Index',
    'Ilość',
  ])

  devHeader.eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = BORDER
    cell.fill = LIGHT_GRAY
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  let lp1 = 1
  for (const item of devices) {
    const row = sheetDevices.addRow([
      lp1++,
      item.name,
      item.category ?? '',
      item.serialNumber ?? '',
      item.index ?? '',
      item.quantity ?? 1,
    ])

    row.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  }

  //
  // ----------------------------------------------------------
  // Sheet 2 — MATERIALS
  // ----------------------------------------------------------
  //
  const sheetMaterials = workbook.addWorksheet(`${tech.name} — Materiały`)

  sheetMaterials.getColumn(1).width = 6
  sheetMaterials.getColumn(2).width = 30
  sheetMaterials.getColumn(3).width = 18
  sheetMaterials.getColumn(4).width = 12
  sheetMaterials.getColumn(5).width = 12

  sheetMaterials.mergeCells(1, 1, 1, 5)
  const matTitle = sheetMaterials.getCell(1, 1)
  matTitle.value = `Stan technika: ${tech.name} — Materiały`
  matTitle.font = { bold: true, size: 14 }

  const matHeader = sheetMaterials.addRow([
    'Lp.',
    'Nazwa',
    'Index',
    'Ilość',
    'Jednostka',
  ])

  matHeader.eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = BORDER
    cell.fill = LIGHT_GRAY
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  let lp2 = 1
  for (const item of materials) {
    const row = sheetMaterials.addRow([
      lp2++,
      item.name,
      item.materialDefinition?.index ?? '',
      item.quantity ?? 0,
      item.materialDefinition?.unit ?? '',
    ])

    row.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
