import { generateTechnicianReportWithData } from '@/utils/generateTechnicianReportWithData'
import { prisma } from '@/utils/prisma'
import { sortCodes } from '@/utils/sortCodes'
import { writeTechnicianSummaryReport } from '@/utils/writeTechnicianSummaryReport'
import {
  WorkCodeSummaryRow,
  writeWorkCodeExecutionReport,
} from '@/utils/writeWorkCodeExecutionReport'
import { format } from 'date-fns'
import { z } from 'zod'
import { adminOrCoord } from '../roleHelpers'
import { router } from '../trpc'

/**
 * Helper to group rows by week number for side summary table
 * Each summary row: [weekName, received, done, failed, ratio]
 */
function getWeekSummaries(
  rows: Record<string, string | number>[]
): [string, number, number, number, string][] {
  const summaries: Record<
    number,
    { received: number; done: number; failed: number }
  > = {}
  rows.forEach((row) => {
    if (!row.tydzień || typeof row.tydzień !== 'number') return
    const week = row.tydzień as number
    const received = Number(row['Ilość instalacji otrzymanych'] ?? 0)
    const done = Number(row['Ilość instalacji wykonanych'] ?? 0)
    const failed = Number(row['Ilość instalacji niewykonanych'] ?? 0)
    if (!summaries[week]) summaries[week] = { received: 0, done: 0, failed: 0 }
    summaries[week].received += received
    summaries[week].done += done
    summaries[week].failed += failed
  })
  return Object.entries(summaries).map(([week, stats]) => {
    const ratio =
      stats.received > 0
        ? `${((stats.done / stats.received) * 100).toFixed(2)}%`
        : '0,00%'
    return [`Tydzień ${week}`, stats.received, stats.done, stats.failed, ratio]
  })
}

export const settlementRouter = router({
  /**
   * generateMonthlyReport
   * - Returns an Excel file with a full summary for the selected month.
   * - Main table: daily stats (per day), with correct columns (including 'Ilość instalacji otrzymanych')
   * - Side table: weekly summary (tygodniowa) placed on the right
   */
  generateMonthlyReport: adminOrCoord
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
      })
    )
    .mutation(async ({ input }) => {
      const { year, month } = input
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)
      const daysInMonth = end.getDate()

      // Aggregate stats by date
      const statsByDate: Record<
        string,
        { completed: number; notCompleted: number }
      > = {}

      // Fetch all relevant orders for this month
      const orders = await prisma.order.findMany({
        where: {
          type: 'INSTALATION',
          date: { gte: start, lte: end },
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
        },
        select: { date: true, status: true },
      })

      for (const order of orders) {
        const dateKey = format(order.date, 'yyyy-MM-dd') // ⬅︎ tu zmiana
        if (!statsByDate[dateKey])
          statsByDate[dateKey] = { completed: 0, notCompleted: 0 }

        if (order.status === 'COMPLETED') statsByDate[dateKey].completed++
        else statsByDate[dateKey].notCompleted++
      }

      // Generate main table (rows) for all days in the month
      const rows: Record<string, string | number>[] = []
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d)
        const iso = format(date, 'yyyy-MM-dd')
        // Calculate week number in Polish style
        const firstDayWeekday = new Date(year, month - 1, 1).getDay() || 7
        const week = Math.ceil((d + firstDayWeekday - 1) / 7)

        const stats = statsByDate[iso] || { completed: 0, notCompleted: 0 }
        const total = stats.completed + stats.notCompleted
        const ratio =
          total > 0
            ? `${((stats.completed / total) * 100).toFixed(2)}%`
            : '0,00%'

        rows.push({
          tydzień: week,
          data: iso,
          'Ilość instalacji otrzymanych': total,
          'Ilość instalacji wykonanych': stats.completed,
          'Ilość instalacji niewykonanych': stats.notCompleted,
          Kompletacja: ratio,
        })
      }

      // Add monthly summary row
      const totalDone = orders.filter((o) => o.status === 'COMPLETED').length
      const totalFailed = orders.filter(
        (o) => o.status === 'NOT_COMPLETED'
      ).length
      const totalAll = totalDone + totalFailed
      const completion =
        totalAll > 0 ? `${((totalDone / totalAll) * 100).toFixed(2)}%` : '0,00%'

      rows.push(
        {},
        {
          tydzień: 'Podsumowanie miesięczne',
          data: '',
          'Ilość instalacji otrzymanych': totalAll,
          'Ilość instalacji wykonanych': totalDone,
          'Ilość instalacji niewykonanych': totalFailed,
          Kompletacja: completion,
        }
      )

      // Build side table summary by week
      const weekSummaries = getWeekSummaries(rows)

      // Import and use the Excel export util
      const { writeToBufferStyled } = await import(
        '@/utils/writeToBufferStyled'
      )
      const filename = `Raport_rozliczen_${year}_${String(month).padStart(
        2,
        '0'
      )}`
      const buffer = await writeToBufferStyled(rows, filename, weekSummaries)

      return buffer.toString('base64')
    }),
  /**
   * Get monthly details per technician
   */
  getTechnicianMonthlyDetails: adminOrCoord
    .input(
      z.object({
        technicianId: z.string(),
        from: z.string(),
        to: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get all orders for technician in the date range
      const orders = await prisma.order.findMany({
        where: {
          assignedToId: input.technicianId,
          type: 'INSTALATION',
          date: { gte: new Date(input.from), lte: new Date(input.to) },
        },
        include: { settlementEntries: { include: { rate: true } } },
        orderBy: { date: 'asc' },
      })

      const codes: Record<string, number> = {}
      let totalAmount = 0
      const dayMap: Record<
        string,
        {
          date: string
          orders: typeof orders
          codes: Record<string, number>
          amount: number
        }
      > = {}

      for (const order of orders) {
        const day = order.date.toISOString().split('T')[0]
        if (!dayMap[day]) {
          dayMap[day] = { date: day, orders: [], codes: {}, amount: 0 }
        }
        dayMap[day].orders.push(order)
        for (const entry of order.settlementEntries) {
          codes[entry.code] = (codes[entry.code] || 0) + entry.quantity
          dayMap[day].codes[entry.code] =
            (dayMap[day].codes[entry.code] || 0) + entry.quantity
          const val = (entry.rate?.amount ?? 0) * entry.quantity
          totalAmount += val
          dayMap[day].amount += val
        }
      }

      // Get technician name
      const tech = await prisma.user.findUnique({
        where: { id: input.technicianId },
        select: { name: true },
      })

      return {
        technicianName: tech?.name ?? 'Nieznany',
        summary: codes,
        totalAmount,
        days: Object.values(dayMap).sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      }
    }),

  generateTechnicianMonthlyReport: adminOrCoord
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
        technicianId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { year, month, technicianId } = input
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)

      // Fetch technician name
      const tech = await prisma.user.findUnique({
        where: { id: technicianId },
        select: { name: true },
      })

      // Fetch all work codes from system (even if 0 for this technician!)
      const allRates = await prisma.rateDefinition.findMany()
      const allCodes = sortCodes(allRates.map((r) => r.code))

      // Fetch all orders for the technician in the selected month
      const orders = await prisma.order.findMany({
        where: {
          assignedToId: technicianId,
          type: 'INSTALATION',
          date: { gte: start, lte: end },
        },
        include: { settlementEntries: { include: { rate: true } } },
        orderBy: { date: 'asc' },
      })

      // Count summary numbers
      let totalCompleted = 0
      let totalNotCompleted = 0
      const totalAssigned = orders.length

      // Suma wszystkich kwot z rozliczeń
      const totalAmount = orders.reduce(
        (sum, order) =>
          sum +
          order.settlementEntries.reduce(
            (subSum, e) => subSum + (e.rate?.amount ?? 0) * e.quantity,
            0
          ),
        0
      )

      // workingDays: only unique days with at least one completed order
      const workingDays = new Set(
        orders
          .filter((o) => o.status === 'COMPLETED')
          .map((o) => o.date.toISOString().split('T')[0])
      ).size

      orders.forEach((order) => {
        if (order.status === 'COMPLETED') totalCompleted++
        else if (order.status === 'NOT_COMPLETED') totalNotCompleted++
      })

      const totalRatio =
        totalAssigned > 0 ? (100 * totalCompleted) / totalAssigned : 0

      // Detailed order rows
      const orderDetails = orders.map((order) => ({
        Data: order.date.toISOString().split('T')[0],
        'Nr zlecenia': order.orderNumber,
        Adres: [order.city, order.street].filter(Boolean).join(', '),
        ...Object.fromEntries(
          allCodes.map((code) => [
            code,
            order.settlementEntries.find((e) => e.code === code)?.quantity ||
              '',
          ])
        ),
        Kwota: order.settlementEntries
          .reduce((sum, e) => sum + (e.rate?.amount ?? 0) * e.quantity, 0)
          .toFixed(2),
      }))

      const { writeTechnicianReportExcel } = await import(
        '@/utils/writeTechnicianReportExcel'
      )
      const filename = `Raport_rozliczen_technika_${
        tech?.name || 'Nieznany'
      }_${year}_${String(month).padStart(2, '0')}`

      const buffer = await writeTechnicianReportExcel({
        filename,
        technicianName: tech?.name || 'Nieznany',
        year,
        month,
        workingDays,
        totalAssigned,
        totalCompleted,
        totalNotCompleted,
        totalRatio,
        totalAmount,
        workCodes: allCodes,
        orderDetails,
      })

      return buffer.toString('base64')
    }),

  generateTechniciansDetailedMonthlyReport: adminOrCoord
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
      })
    )
    .mutation(async ({ input }) => {
      const { year, month } = input
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)

      // Pobierz WSZYSTKIE zlecenia instalacyjne (dowolnego technika)
      const orders = await prisma.order.findMany({
        where: {
          type: 'INSTALATION',
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
          date: { gte: start, lte: end },
        },
        include: {
          assignedTo: { select: { name: true } },
          usedMaterials: { include: { material: true } },
          assignedEquipment: { include: { warehouse: true } },
          settlementEntries: true,
        },
        orderBy: { date: 'asc' },
      })

      // Mapowanie każdego order -> pełny headers
      const rows = orders.map((order, i) => {
        // Mapuj materiały do headers
        const materialMap: Record<string, number | string> = {}
        for (const m of order.usedMaterials) {
          materialMap[m.material.name] = m.quantity
        }

        // Dekoder 2-way
        const dekoder2way = order.assignedEquipment.find(
          (e) => e.warehouse.category === 'DECODER_2_WAY'
        )
        const dekoder2waySN = dekoder2way?.warehouse.serialNumber ?? ''
        // Modem
        const modem = order.assignedEquipment.find(
          (e) => e.warehouse.category === 'MODEM'
        )
        const modemSN = modem?.warehouse.serialNumber ?? ''

        // Sygnały – przykład, możesz pobierać z order.notes lub settlementEntries jeśli trzymasz gdzie indziej
        const usDbm = '' // <- tu np. order.usDbm ?? ""
        const dsDbm = '' // <- tu np. order.dsDbm ?? ""

        // Mapping dla WSZYSTKICH headerów (resztę zostawiamy pustą jeśli nie masz)
        return {
          'Lp.': i + 1,
          'schemat /nr klienta': order.orderNumber,
          'MIASTO, ULICA NUMER': `${order.city}, ${order.street}`,
          'WYKONANE TAK | NIE':
            order.status === 'COMPLETED'
              ? 'TAK'
              : order.status === 'NOT_COMPLETED'
              ? 'NIE'
              : '',
          UWAGI: order.notes ?? '',
          'TECHNOLOGIA HFC | GPON': '',
          DTV: '',
          'multiroom ATV/DTV; przebudowy': '',
          NET: '',
          TEL: '',
          ATV: '',
          'uruchomienie gniazda': '',
          'uruchomienie instalacji przyłącza ab.': '',
          'dekoder 2-way': dekoder2waySN,
          'adres MAC dekodera': dekoder2waySN,
          'US. 40/51 dBm': usDbm,
          'DS. -9/+11 dBm': dsDbm,
          'dekoder 1-way | moduł CI+': '',
          'numer SN dekodera | karty CI+': '',
          'modem NET / terminal TEL': modemSN,
          'adres MAC modemu': modemSN,
          'US. 40/51 dBm (modem)': '',
          'DS. -9/+11 dBm (modem)': '',
          'Pomiar prędkości 300/600 (od 26-04-2018)': '',
          'Pion / Ilość kondygnacji': '',
          'Montaż listew/rur pcv (mb)': '',
          // ---- Materiały:
          'KABEL RG-6 (mb)': materialMap['KABEL RG-6 (mb)'] ?? 0,
          'KABEL RG-11 (mb)': materialMap['KABEL RG-11 (mb)'] ?? 0,
          'KABEL UTP (mb)': materialMap['KABEL UTP (mb)'] ?? 0,
          'ZŁĄCZE F-60 "KOMP. RG6" (szt)':
            materialMap['ZŁĄCZE F-60 "KOMP. RG6" (szt)'] ?? 0,
          'ZŁĄCZE F-59 "KOMP. RG5.9" (szt)':
            materialMap['ZŁĄCZE F-59 "KOMP. RG5.9" (szt)'] ?? 0,
          'ZŁĄCZE F-11 "KOMP. RG11" (szt)':
            materialMap['ZŁĄCZE F-11 "KOMP. RG11" (szt)'] ?? 0,
          'ADAPTER FF-FF "BECZKA"    (szt)':
            materialMap['ADAPTER FF-FF "BECZKA"    (szt)'] ?? 0,
          'OPORNIK 75 Ohm "TERMINATOR" (szt)':
            materialMap['OPORNIK 75 Ohm "TERMINATOR" (szt)'] ?? 0,
          'ZŁĄCZE WKW "MĘSKA"     (szt)':
            materialMap['ZŁĄCZE WKW "MĘSKA"     (szt)'] ?? 0,
          'ZŁĄCZE WKG "ŻEŃSKA"      (szt)':
            materialMap['ZŁĄCZE WKG "ŻEŃSKA"      (szt)'] ?? 0,
          'ZŁĄCZE WKS "SZPILKA"   (szt)':
            materialMap['ZŁĄCZE WKS "SZPILKA"   (szt)'] ?? 0,
          'GN. 2 X DATA "PODTYNK." (szt)':
            materialMap['GN. 2 X DATA "PODTYNK." (szt)'] ?? 0,
          'GN. 3 X DATA "PODTYNK." (szt)':
            materialMap['GN. 3 X DATA "PODTYNK." (szt)'] ?? 0,
          'DSS2    "SPLITER"         (szt)':
            materialMap['DSS2    "SPLITER"         (szt)'] ?? 0,
          'DSS3    "SPLITER"         (szt)':
            materialMap['DSS3    "SPLITER"         (szt)'] ?? 0,
          'DSS3U    "SPLITER"         (szt)':
            materialMap['DSS3U    "SPLITER"         (szt)'] ?? 0,
          'DSS4    "SPLITER"         (szt)':
            materialMap['DSS4    "SPLITER"         (szt)'] ?? 0,
          'FILTR SOLO NET   230/399':
            materialMap['FILTR SOLO NET   230/399'] ?? 0,
          'TŁUMIK TKZ-03 (szt)': materialMap['TŁUMIK TKZ-03 (szt)'] ?? 0,
          'TŁUMIK TKZ-06 (szt)': materialMap['TŁUMIK TKZ-06 (szt)'] ?? 0,
          'TŁUMIK TKZ-09 (szt)': materialMap['TŁUMIK TKZ-09 (szt)'] ?? 0,
          'TŁUMIK TKZ-12 (szt)': materialMap['TŁUMIK TKZ-12 (szt)'] ?? 0,
          'TŁUMIK AFM-1A (szt)': materialMap['TŁUMIK AFM-1A (szt)'] ?? 0,
          'TŁUMIK AFM-2A (szt)': materialMap['TŁUMIK AFM-2A (szt)'] ?? 0,
          'TŁUMIK AFM-3A (szt)': materialMap['TŁUMIK AFM-3A (szt)'] ?? 0,
          'TŁUMIK AFM-4A (szt)': materialMap['TŁUMIK AFM-4A (szt)'] ?? 0,
          'TŁUMIK AFM-6A (szt)': materialMap['TŁUMIK AFM-6A (szt)'] ?? 0,
          'TŁUMIK AFM-8A (szt)': materialMap['TŁUMIK AFM-8A (szt)'] ?? 0,
          'TŁUMIK AFM-10A (szt)': materialMap['TŁUMIK AFM-10A (szt)'] ?? 0,
          'TŁUMIK AFM-12A (szt)': materialMap['TŁUMIK AFM-12A (szt)'] ?? 0,
          'UCHWYT KABLA FLOP (szt)':
            materialMap['UCHWYT KABLA FLOP (szt)'] ?? 0,
          'OPASKA KABLOWA (szt)': materialMap['OPASKA KABLOWA (szt)'] ?? 0,
          'KORYTKO KABLOWE PCV 15X10 - 2mb (szt)':
            materialMap['KORYTKO KABLOWE PCV 15X10 - 2mb (szt)'] ?? 0,
          'RURA PCV RL18 - 2mb (szt)':
            materialMap['RURA PCV RL18 - 2mb (szt)'] ?? 0,
          'KOLANKO ZCL18 (szt)': materialMap['KOLANKO ZCL18 (szt)'] ?? 0,
          'UCHWYT UZ18 (szt)': materialMap['UCHWYT UZ18 (szt)'] ?? 0,
          'OZNACZNIK KABLOWY': materialMap['OZNACZNIK KABLOWY'] ?? 0,
          'PATCHCORD 1M': materialMap['PATCHCORD 1M'] ?? 0,
          'PATCHCORD 3M': materialMap['PATCHCORD 3M'] ?? 0,
        }
      })

      const filename = `Raport_zlecenia_wszyscy_technicy_${year}_${String(
        month
      ).padStart(2, '0')}`
      const buffer = await generateTechnicianReportWithData(filename, rows)
      return buffer.toString('base64')
    }),

  generateTechniciansMonthlySummary: adminOrCoord
    .input(
      z.object({ month: z.number().min(1).max(12), year: z.number().min(2020) })
    )
    .mutation(async ({ input }) => {
      const { year, month } = input
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)

      const orders = await prisma.order.findMany({
        where: {
          type: 'INSTALATION',
          date: { gte: start, lte: end },
          assignedToId: { not: null },
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
        },
        include: {
          settlementEntries: { include: { rate: true } },
          assignedTo: { select: { name: true } },
        },
      })

      // Get all rate codes to preserve column order
      const allRates = await prisma.rateDefinition.findMany()
      const allCodes = sortCodes(allRates.map((r) => r.code))

      type Row = Record<string, string | number>
      const rows: Row[] = []

      const grouped: Record<
        string,
        {
          received: number
          done: number
          failed: number
          codes: Record<string, number>
          amount: number
        }
      > = {}

      for (const order of orders) {
        const techName = order.assignedTo?.name || 'Nieznany'
        if (!grouped[techName]) {
          grouped[techName] = {
            received: 0,
            done: 0,
            failed: 0,
            codes: {},
            amount: 0,
          }
        }

        grouped[techName].received++
        if (order.status === 'COMPLETED') grouped[techName].done++
        if (order.status === 'NOT_COMPLETED') grouped[techName].failed++

        for (const entry of order.settlementEntries) {
          grouped[techName].codes[entry.code] =
            (grouped[techName].codes[entry.code] || 0) + entry.quantity
          grouped[techName].amount += (entry.rate?.amount || 0) * entry.quantity
        }
      }

      for (const [name, data] of Object.entries(grouped)) {
        const ratio =
          data.received > 0
            ? `${((data.done / data.received) * 100).toFixed(2)}%`
            : '0.00%'

        const row: Row = {
          Technik: name,
          Otrzymane: data.received,
          Wykonane: data.done,
          Niewykonane: data.failed,
          Kompletacja: ratio,
        }

        for (const code of allCodes) {
          row[code] = data.codes[code] ?? 0
        }

        row['Kwota'] = `${data.amount.toFixed(2)} zł`
        rows.push(row)
      }

      // Sort columns using helper if needed
      const sortedCodes = sortCodes(allCodes)
      const finalColumns = [
        'Technik',
        'Otrzymane',
        'Wykonane',
        'Niewykonane',
        'Kompletacja',
        ...sortedCodes,
        'Kwota',
      ]

      const buffer = await writeTechnicianSummaryReport(
        rows,
        `Rozliczenie_${year}_${month}`,
        finalColumns
      )
      return buffer.toString('base64')
    }),

  generateWorkCodeSummaryReport: adminOrCoord
    .input(z.object({ month: z.number(), year: z.number() }))
    .mutation(async ({ input }) => {
      const { month, year } = input
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59)

      // Get all defined work codes to preserve full column order
      const rateDefinitions = await prisma.rateDefinition.findMany()
      const allCodes = sortCodes(rateDefinitions.map((r) => r.code))

      // Fetch all COMPLETED installation orders in the month
      const orders = await prisma.order.findMany({
        where: {
          type: 'INSTALATION',
          status: 'COMPLETED',
          date: { gte: start, lte: end },
        },
        include: { settlementEntries: true },
        orderBy: { date: 'asc' },
      })

      // Group settlement codes by day
      const byDate: Record<string, Record<string, number>> = {}

      for (const order of orders) {
        const dateKey = order.date.toISOString().split('T')[0]
        if (!byDate[dateKey]) byDate[dateKey] = {}

        for (const entry of order.settlementEntries) {
          byDate[dateKey][entry.code] =
            (byDate[dateKey][entry.code] ?? 0) + entry.quantity
        }
      }

      // Build rows for export – one row per day
      const rows = Object.entries(byDate).map(([date, codes]) => {
        const row: WorkCodeSummaryRow = {
          date: new Date(date).toLocaleDateString('pl-PL'),
        }

        for (const code of allCodes) {
          row[code] = codes[code] ?? 0
        }

        return row
      })

      // Generate the Excel report
      const buffer = await writeWorkCodeExecutionReport(
        rows,
        allCodes,
        `Zestawienie_kodow_${year}_${String(month).padStart(2, '0')}`,
        {
          from: format(start, 'dd.MM.yyyy'),
          to: format(end, 'dd.MM.yyyy'),
        }
      )

      return buffer.toString('base64')
    }),
})
