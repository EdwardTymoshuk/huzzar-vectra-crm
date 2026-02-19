import { polishMonthsNominative } from '@/lib/constants'
import { BORDER, LIGHT_GRAY } from '@/lib/exelReportsConstants'
import { prisma } from '@/utils/prisma'
import ExcelJS from 'exceljs'

type RegionKey =
  | 'STAROGARD_GDANSKI'
  | 'GDYNIA_POGORZE'
  | 'PRUSZCZ_OKOLICE'
  | 'KARTUZY_POLWYSEP'
  | 'POZOSTALE'

type RegionConfig = {
  key: RegionKey
  sheetName: string
  label: string
  aliases: string[]
}

const REGION_CONFIG: RegionConfig[] = [
  {
    key: 'STAROGARD_GDANSKI',
    sheetName: 'Starogard Gdanski',
    label: 'Starogard Gdański',
    aliases: ['STAROGARD GDANSKI', 'STAROGARD'],
  },
  {
    key: 'GDYNIA_POGORZE',
    sheetName: 'Gdynia+Pogorze',
    label: 'Gdynia, Pogórze',
    aliases: ['GDYNIA', 'POGORZE'],
  },
  {
    key: 'PRUSZCZ_OKOLICE',
    sheetName: 'Pruszcz+okolice',
    label: 'Pruszcz Gdański, Rotmanka, Juszkowo, Rokitnica',
    aliases: [
      'PRUSZCZ GDANSKI',
      'PRUSZCZ',
      'ROTMANKA',
      'JUSZKOWO',
      'ROKITNICA',
    ],
  },
  {
    key: 'KARTUZY_POLWYSEP',
    sheetName: 'Kartuzy+Polwysep',
    label:
      'Kartuzy, Kiełpino, Somonino, Dzierżążno, Żukowo, Skarszewy, Czarna Woda, Kolbudy, Kolbudy Dolne, Sierakowice, Łubiana, Hel, Jastarnia, Jurata, Puck, Władysławowo, Łeba, Rozewie, Jastrzębia Góra, Tupadły, Chłapowo, Ostrowo, Swarzewo, Karwia',
    aliases: [
      'KARTUZY',
      'KIELPINO',
      'SOMONINO',
      'DZIERZAZNO',
      'ZUKOWO',
      'SKARSZEWY',
      'CZARNA WODA',
      'KOLBUDY',
      'KOLBUDY DOLNE',
      'SIERAKOWICE',
      'LUBIANA',
      'HEL',
      'JASTARNIA',
      'JURATA',
      'PUCK',
      'WLADYSLAWOWO',
      'LEBA',
      'ROZEWIE',
      'JASTRZEBIA GORA',
      'TUPADLY',
      'CHLAPOWO',
      'OSTROWO',
      'SWARZEWO',
      'KARWIA',
    ],
  },
]

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

function resolveRegion(city: string | null | undefined): RegionKey {
  const normalizedCity = normalizeText(city ?? '')
  if (!normalizedCity) return 'POZOSTALE'

  const matched = REGION_CONFIG.find((region) =>
    region.aliases.some((alias) => normalizedCity.includes(alias))
  )

  return matched?.key ?? 'POZOSTALE'
}

function createRegionSheet({
  workbook,
  sheetName,
  regionLabel,
  year,
  month,
  rows,
}: {
  workbook: ExcelJS.Workbook
  sheetName: string
  regionLabel: string
  year: number
  month: number
  rows: { name: string; index: string; unitLabel: string; quantity: number }[]
}) {
  const sheet = workbook.addWorksheet(sheetName)

  sheet.columns = [
    { header: 'Lp.', width: 6 },
    { header: 'Materiał', width: 40 },
    { header: 'Index', width: 20 },
    { header: 'Jednostka', width: 10 },
    { header: 'Ilość', width: 14 },
  ]

  sheet.mergeCells(1, 1, 1, 5)
  const title = sheet.getCell(1, 1)
  title.value = `ZESTAWIENIE ZUŻYTYCH MATERIAŁÓW | ${regionLabel.toUpperCase()} | ${
    polishMonthsNominative[month].toUpperCase()
  } ${year}`
  title.font = { size: 14, bold: true }
  title.alignment = { horizontal: 'center', vertical: 'middle' }

  const header = sheet.addRow(sheet.columns.map((c) => c.header))
  header.eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = BORDER
    cell.fill = LIGHT_GRAY
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  rows.forEach((row, index) => {
    const dataRow = sheet.addRow([
      index + 1,
      row.name,
      row.index,
      row.unitLabel,
      row.quantity,
    ])

    dataRow.eachCell((cell) => {
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
  })
}

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

  const rows = await prisma.orderMaterial.findMany({
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
    select: {
      materialId: true,
      unit: true,
      quantity: true,
      order: {
        select: {
          city: true,
        },
      },
      material: {
        select: {
          name: true,
          index: true,
        },
      },
    },
  })

  const grouped = new Map<
    RegionKey,
    Map<string, { name: string; index: string; unitLabel: string; quantity: number }>
  >()

  for (const region of REGION_CONFIG) {
    grouped.set(region.key, new Map())
  }
  grouped.set('POZOSTALE', new Map())

  const workbook = new ExcelJS.Workbook()

  for (const row of rows) {
    if (!row.material || row.quantity <= 0) continue

    const regionKey = resolveRegion(row.order?.city)
    const byRegion = grouped.get(regionKey)
    if (!byRegion) continue

    const unitLabel = row.unit === 'METER' ? 'mb' : 'szt'
    const aggregateKey = `${row.materialId}:${row.unit}`
    const existing = byRegion.get(aggregateKey)

    if (existing) {
      existing.quantity += row.quantity
      continue
    }

    byRegion.set(aggregateKey, {
      name: row.material.name,
      index: row.material.index ?? '',
      unitLabel,
      quantity: row.quantity,
    })
  }

  for (const region of REGION_CONFIG) {
    const rowsForRegion = Array.from(grouped.get(region.key)?.values() ?? []).sort(
      (a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
    )

    createRegionSheet({
      workbook,
      sheetName: region.sheetName,
      regionLabel: region.label,
      year,
      month,
      rows: rowsForRegion,
    })
  }

  const otherRows = Array.from(grouped.get('POZOSTALE')?.values() ?? []).sort(
    (a, b) => a.name.localeCompare(b.name, 'pl', { sensitivity: 'base' })
  )
  createRegionSheet({
    workbook,
    sheetName: 'Pozostale',
    regionLabel: 'Pozostałe miejscowości',
    year,
    month,
    rows: otherRows,
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
