import { prisma } from '@/utils/prisma'
import { sortCodes } from '@/utils/sortCodes'
import { format } from 'date-fns'
import { z } from 'zod'
import { roleProtectedProcedure } from '../middleware'
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
  generateMonthlyReport: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
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
  getTechnicianMonthlyDetails: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
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

  generateTechnicianMonthlyReport: roleProtectedProcedure([
    'ADMIN',
    'COORDINATOR',
  ])
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
})
