import {
  BORDER,
  LIGHT_GRAY,
} from '@/app/(modules)/vectra-crm/lib/exelReportsConstants'
import { materialUnitMap } from '@/lib/constants'
import { prisma } from '@/utils/prisma'
import ExcelJS from 'exceljs'
import { devicesTypeMap } from '../../../lib/constants'

/**
 * writeWarehouseStockReport
 * --------------------------------------------------------------------
 * Generates a two-sheet Excel report showing current warehouse stock.
 * Includes only AVAILABLE items stored in warehouse locations.
 * Devices and materials are placed into separate worksheets.
 * Items with quantity = 0 are omitted.
 */
export async function writeWarehouseStockReport(): Promise<Buffer> {
  // Fetch all stock on warehouse (not assigned to technicians)
  const allStock = await prisma.vectraWarehouse.findMany({
    where: {
      status: 'AVAILABLE',
      assignedToId: null,
      locationId: { not: null },
    },
    include: {
      materialDefinition: true,
      location: true,
    },
    orderBy: [{ itemType: 'asc' }, { name: 'asc' }],
  })

  // Split + filter out items with quantity = 0
  const devices = allStock.filter(
    (i) => i.itemType === 'DEVICE' && (i.quantity ?? 0) > 0
  )
  const materials = allStock.filter(
    (i) => i.itemType === 'MATERIAL' && (i.quantity ?? 0) > 0
  )

  const workbook = new ExcelJS.Workbook()

  //
  // ----------------------------------------------------------
  // Sheet 1 — DEVICES
  // ----------------------------------------------------------
  //
  const sheetDevices = workbook.addWorksheet('Magazyn — Urządzenia')

  sheetDevices.getColumn(1).width = 6
  sheetDevices.getColumn(2).width = 30
  sheetDevices.getColumn(3).width = 20
  sheetDevices.getColumn(4).width = 20
  sheetDevices.getColumn(5).width = 20
  sheetDevices.getColumn(6).width = 12
  sheetDevices.getColumn(7).width = 18

  sheetDevices.mergeCells(1, 1, 1, 7)
  const devTitle = sheetDevices.getCell(1, 1)
  devTitle.value = `Stan magazynu — Urządzenia`
  devTitle.font = { bold: true, size: 14 }

  const devHeader = sheetDevices.addRow([
    'Lp.',
    'Nazwa',
    'Kategoria',
    'SN / MAC',
    'Ilość',
    'Lokalizacja',
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
      item.category ? devicesTypeMap[item.category] : '',
      item.serialNumber ?? '',
      item.quantity ?? 1,
      item.location?.name ?? '',
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
  const sheetMaterials = workbook.addWorksheet('Magazyn — Materiały')

  sheetMaterials.getColumn(1).width = 6
  sheetMaterials.getColumn(2).width = 30
  sheetMaterials.getColumn(3).width = 20
  sheetMaterials.getColumn(4).width = 12
  sheetMaterials.getColumn(5).width = 12
  sheetMaterials.getColumn(6).width = 18

  sheetMaterials.mergeCells(1, 1, 1, 6)
  const matTitle = sheetMaterials.getCell(1, 1)
  matTitle.value = `Stan magazynu — Materiały`
  matTitle.font = { bold: true, size: 14 }

  const matHeader = sheetMaterials.addRow([
    'Lp.',
    'Nazwa',
    'Index',
    'Ilość',
    'Jednostka',
    'Lokalizacja',
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
      item.materialDefinition?.unit
        ? materialUnitMap[item.materialDefinition?.unit]
        : '',
      item.location?.name ?? '',
    ])

    row.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
