import { writeTechnicianSummaryReport } from '@/app/(modules)/vectra-crm/utils/reports/writeTechnicianSummaryReport'
import { writeToBuffer } from '@/app/(modules)/vectra-crm/utils/reports/writeToBuffer'
import {
  WorkCodeSummaryRow,
  writeWorkCodeExecutionReport,
} from '@/app/(modules)/vectra-crm/utils/reports/writeWorkCodeExecutionReport'
import { sortCodes } from '@/app/(modules)/vectra-crm/utils/sortCodes'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { endOfDay, format, startOfDay } from 'date-fns'
import { z } from 'zod'
import { vectraUserBasicSelect } from './../../helpers/selects'

/**
 * Helper to group rows by week number for side summary table
 * Each summary row: [weekName, received, done, failed, ratio]
 */
const getWeekSummaries = (
  rows: Record<string, string | number>[]
): [string, number, number, number, string][] => {
  const summaries: Record<
    number,
    { received: number; done: number; failed: number }
  > = {}

  rows.forEach((row) => {
    if (!row.tydzień || typeof row.tydzień !== 'number') return

    const week = row.tydzień as number

    // Read correct column keys used in the DAILY table
    const received = Number(row['Otrzymane'] ?? 0)
    const done = Number(row['Wykonane'] ?? 0)
    const failed = Number(row['Niewykonane'] ?? 0)

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
   * - Generates monthly Excel report with daily and weekly summaries.
   * - Fix: now includes ALL received orders (ASSIGNED + COMPLETED + NOT_COMPLETED)
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

      // Month range
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)
      const daysInMonth = end.getDate()

      /**
       * Daily stats map:
       * - received: total orders for the day
       * - completed: COMPLETED
       * - notCompleted: NOT_COMPLETED
       */
      const statsByDate: Record<
        string,
        {
          received: number
          completed: number
          notCompleted: number
        }
      > = {}

      /**
       * Fetch ALL installation orders for this month:
       * - ASSIGNED
       * - COMPLETED
       * - NOT_COMPLETED
       *
       * This ensures correct "received" counts.
       */
      const orders = await prisma.vectraOrder.findMany({
        where: {
          type: 'INSTALATION',
          date: { gte: start, lte: end },
          status: { in: ['ASSIGNED', 'COMPLETED', 'NOT_COMPLETED'] },
        },
        select: { date: true, status: true },
        orderBy: { date: 'asc' },
      })

      // Aggregate daily statistics
      for (const order of orders) {
        const dateKey = format(order.date, 'yyyy-MM-dd')

        if (!statsByDate[dateKey]) {
          statsByDate[dateKey] = {
            received: 0,
            completed: 0,
            notCompleted: 0,
          }
        }

        // Every order counts as received
        statsByDate[dateKey].received++

        // Completed / Not completed classification
        if (order.status === 'COMPLETED') statsByDate[dateKey].completed++
        if (order.status === 'NOT_COMPLETED')
          statsByDate[dateKey].notCompleted++
      }

      /**
       * MAIN DAILY TABLE (rows)
       * ----------------------------------------------------------------
       * For each day 1..daysInMonth we create a row regardless of whether
       * the day contains orders or not.
       */
      const rows: Record<string, string | number>[] = []

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d)
        const iso = format(date, 'yyyy-MM-dd')

        // Week number calculation (Polish style)
        const firstDayWeekday = new Date(year, month - 1, 1).getDay() || 7
        const week = Math.ceil((d + firstDayWeekday - 1) / 7)

        const stats = statsByDate[iso] || {
          received: 0,
          completed: 0,
          notCompleted: 0,
        }

        const completion =
          stats.received > 0
            ? `${((stats.completed / stats.received) * 100).toFixed(2)}%`
            : '0,00%'

        rows.push({
          tydzień: week,
          data: iso,
          Otrzymane: stats.received,
          Wykonane: stats.completed,
          Niewykonane: stats.notCompleted,
          Kompletacja: completion,
        })
      }

      /**
       * MONTHLY SUMMARY
       * ----------------------------------------------------------------
       * Global totals for the whole month.
       */
      const totalReceived = orders.length
      const totalCompleted = orders.filter(
        (o) => o.status === 'COMPLETED'
      ).length
      const totalNotCompleted = orders.filter(
        (o) => o.status === 'NOT_COMPLETED'
      ).length

      const monthlyCompletion =
        totalReceived > 0
          ? `${((totalCompleted / totalReceived) * 100).toFixed(2)}%`
          : '0,00%'

      rows.push(
        {}, // spacing row
        {
          tydzień: 'Podsumowanie miesięczne',
          data: '',
          Otrzymane: totalReceived,
          Wykonane: totalCompleted,
          Niewykonane: totalNotCompleted,
          Kompletacja: monthlyCompletion,
        }
      )

      /**
       * WEEKLY SUMMARY TABLE (right-hand side)
       * ----------------------------------------------------------------
       * getWeekSummaries must be fed with the same row structure.
       */
      const weekSummaries = getWeekSummaries(rows)

      /**
       * Export the report to XLSX using styled buffer generator.
       */
      const { writeToBufferStyled } = await import(
        '@/app/(modules)/vectra-crm/utils/reports/writeToBufferStyled'
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
  getTechnicianMonthlyDetails: loggedInEveryone
    .input(
      z.object({
        technicianId: z.string(),
        from: z.string(),
        to: z.string(),
      })
    )
    .query(async ({ input }) => {
      // Get all orders for technician in the date range
      const orders = await prisma.vectraOrder.findMany({
        where: {
          assignedToId: input.technicianId,
          type: { in: ['INSTALATION'] },
          date: { gte: new Date(input.from), lte: new Date(input.to) },
        },
        include: { settlementEntries: { include: { rate: true } } },
        orderBy: { date: 'desc' },
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
          b.date.localeCompare(a.date)
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
      const allRates = await prisma.vectraRateDefinition.findMany()
      const allCodes = sortCodes(allRates.map((r) => r.code))

      // Fetch all orders for the technician in the selected month
      const orders = await prisma.vectraOrder.findMany({
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
        '@/app/(modules)/vectra-crm/utils/reports/writeTechnicianReportExcel'
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

  generateTechniciansMonthlySummary: adminOrCoord
    .input(
      z.object({ month: z.number().min(1).max(12), year: z.number().min(2020) })
    )
    .mutation(async ({ input }) => {
      const { year, month } = input
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0, 23, 59, 59, 999)

      const orders = await prisma.vectraOrder.findMany({
        where: {
          type: 'INSTALATION',
          date: { gte: start, lte: end },
          assignedToId: { not: null },
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
        },
        include: {
          settlementEntries: { include: { rate: true } },
          assignedTo: { select: vectraUserBasicSelect },
        },
      })

      // Get all rate codes to preserve column order
      const allRates = await prisma.vectraRateDefinition.findMany()
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
        const techName = order.assignedTo?.user.name || 'Nieznany'
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
      const rateDefinitions = await prisma.vectraRateDefinition.findMany()
      const allCodes = sortCodes(rateDefinitions.map((r) => r.code))

      // Fetch all COMPLETED installation orders in the month
      const orders = await prisma.vectraOrder.findMany({
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
  generateYearlyInstallationReport: adminOrCoord
    .input(z.object({ year: z.number().min(2020) }))
    .mutation(async ({ input }) => {
      const { writeInstallationTemplateFromDb } = await import(
        '@/app/(modules)/vectra-crm/utils/reports/writeInstallationTemplateFromDb'
      )
      const buf = await writeInstallationTemplateFromDb(input.year)
      return buf.toString('base64')
    }),
  generateMonthlyInstallationReport: adminOrCoord
    .input(
      z.object({
        year: z.number().min(2020),
        month: z.number().min(1).max(12),
      })
    )
    .mutation(async ({ input }) => {
      const { writeInstallationTemplateForMonth } = await import(
        '@/app/(modules)/vectra-crm/utils/reports/writeInstallationTemplateFromDb'
      )

      const buf = await writeInstallationTemplateForMonth(
        input.year,
        input.month
      )

      return buf.toString('base64')
    }),
  generateMonthlyInstallationReportForTechnician: adminOrCoord
    .input(
      z.object({
        year: z.number().min(2020),
        month: z.number().min(1).max(12),
        technicianId: z.string().uuid(),
      })
    )
    .mutation(async ({ input }) => {
      const { writeInstallationTemplateForTechnicianMonth } = await import(
        '@/app/(modules)/vectra-crm/utils/reports/writeInstallationTemplateFromDb'
      )

      const buf = await writeInstallationTemplateForTechnicianMonth(
        input.year,
        input.month,
        input.technicianId
      )

      return buf.toString('base64')
    }),

  /** XLSX daily report (returns base64) */
  generateDailyReport: adminOrCoord
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const start = startOfDay(new Date(input.date))
      const end = endOfDay(start)

      // Fetch + sort by technician name
      const orders = await prisma.vectraOrder.findMany({
        where: { date: { gte: start, lte: end } },
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { assignedTo: { user: { name: 'asc' } } }, // sort by technician
          { date: 'asc' }, // then by time
        ],
      })

      if (!orders.length) return null

      const rows = orders.map((o, i) => {
        let wykonano = 'NP'

        if (o.status === 'COMPLETED') wykonano = 'TAK'
        else if (o.status === 'NOT_COMPLETED') wykonano = 'NIE'

        return {
          Lp: i + 1,
          'Nr zlecenia': o.orderNumber,
          Adres: `${o.city} ${o.postalCode}, ${o.street}`,
          Wykonano: wykonano,
          Technik: o.assignedTo?.user.name ?? 'Nieprzypisany',
          Operator: o.operator,
          'Powód niewykonania':
            o.status === 'NOT_COMPLETED' ? o.failureReason ?? '' : '',
          Uwagi: o.notes ?? '',
        }
      })

      const buf = await writeToBuffer(
        rows,
        `Raport ${format(start, 'yyyy-MM-dd')}`
      )
      return buf.toString('base64')
    }),
})
