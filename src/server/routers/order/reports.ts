import { adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { writeToBuffer } from '@/utils/reports/writeToBuffer'
import { sortCodes } from '@/utils/sortCodes'
import { endOfDay, format, startOfDay } from 'date-fns'
import { z } from 'zod'

export const reportsRouter = router({
  /** Aggregated order stats for a given period */
  getOrderStats: adminOrCoord
    .input(
      z.object({
        date: z.string().regex(/^\d{4}(-\d{2}){0,2}$/),
        range: z.enum(['day', 'month', 'year']),
      })
    )
    .query(async ({ input }) => {
      const parts = input.date.split('-')
      const y = Number(parts[0])
      const m = Number(parts[1] ?? 1)
      const d = Number(parts[2] ?? 1)
      const baseDate = new Date(y, m - 1, d)

      const rangeOf = (ref: Date, kind: 'day' | 'month' | 'year') => {
        const start = new Date(ref)
        const end = new Date(ref)

        if (kind === 'day') {
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
        } else if (kind === 'month') {
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          end.setMonth(end.getMonth() + 1, 0)
          end.setHours(23, 59, 59, 999)
        } else {
          start.setMonth(0, 1)
          start.setHours(0, 0, 0, 0)
          end.setMonth(11, 31)
          end.setHours(23, 59, 59, 999)
        }
        return { start, end }
      }

      const calc = async (start: Date, end: Date) => {
        const rows = await prisma.order.findMany({
          where: {
            date: { gte: start, lte: end },
            assignedToId: { not: null },
          },
          select: { status: true },
        })

        const sum = { completed: 0, failed: 0, inProgress: 0, canceled: 0 }
        rows.forEach((o) => {
          if (o.status === 'COMPLETED') sum.completed++
          else if (o.status === 'NOT_COMPLETED') sum.failed++
          else if (o.status === 'IN_PROGRESS') sum.inProgress++
          else if (o.status === 'CANCELED') sum.canceled++
        })

        const total = Object.values(sum).reduce((a, b) => a + b, 0)
        const successRate =
          total > 0
            ? Math.round((sum.completed / (sum.completed + sum.failed)) * 100)
            : 0
        return { total, ...sum, successRate }
      }

      const curr = rangeOf(baseDate, input.range)
      const prevDate = new Date(baseDate)
      if (input.range === 'day') prevDate.setDate(prevDate.getDate() - 1)
      else if (input.range === 'month')
        prevDate.setMonth(prevDate.getMonth() - 1)
      else prevDate.setFullYear(prevDate.getFullYear() - 1)
      const prev = rangeOf(prevDate, input.range)

      const [current, previous] = await Promise.all([
        calc(curr.start, curr.end),
        calc(prev.start, prev.end),
      ])

      return {
        ...current,
        prevTotal: previous.total,
        prevCompleted: previous.completed,
        prevFailed: previous.failed,
        prevInProgress: previous.inProgress,
        prevCanceled: previous.canceled,
      }
    }),

  /** XLSX daily report (returns base64) */
  generateDailyReport: adminOrCoord
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const start = startOfDay(new Date(input.date))
      const end = endOfDay(start)

      const orders = await prisma.order.findMany({
        where: { date: { gte: start, lte: end } },
        include: { assignedTo: true },
        orderBy: { date: 'asc' },
      })
      if (!orders.length) return null

      const rows = orders.map((o, i) => ({
        Lp: i + 1,
        'Nr zlecenia': o.orderNumber,
        Adres: `${o.city} ${o.postalCode}, ${o.street}`,
        Wykonano: o.status === 'COMPLETED' ? 'TAK' : 'NIE',
        'Powód niewykonania': o.status === 'NOT_COMPLETED' ? o.notes ?? '' : '',
        Uwagi: o.notes ?? '',
        Technik: o.assignedTo?.name ?? 'Nieprzypisany',
        Operator: o.operator,
      }))

      const buf = await writeToBuffer(
        rows,
        `Raport ${format(start, 'yyyy-MM-dd')}`
      )
      return buf.toString('base64')
    }),

  /** Monthly billing summary (codes × qty per technician) */
  getBillingMonthlySummary: adminOrCoord
    .input(
      z.object({
        from: z.string(), // yyyy-MM-dd
        to: z.string(), // yyyy-MM-dd
        operator: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const rates = await prisma.rateDefinition.findMany()
      const allCodes = sortCodes(rates.map((r) => r.code))

      const orders = await prisma.order.findMany({
        where: {
          type: 'INSTALATION',
          date: { gte: new Date(input.from), lte: new Date(input.to) },
          ...(input.operator && { operator: input.operator }),
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
          assignedToId: { not: null },
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          settlementEntries: { include: { rate: true } },
        },
      })

      const map: Record<
        string,
        {
          technicianId: string
          technicianName: string
          codes: Record<string, number>
          totalAmount: number
        }
      > = {}

      orders.forEach((o) => {
        const tech = o.assignedTo
        if (!tech) return
        if (!map[tech.id]) {
          map[tech.id] = {
            technicianId: tech.id,
            technicianName: tech.name,
            codes: Object.fromEntries(allCodes.map((c) => [c, 0])),
            totalAmount: 0,
          }
        }
        o.settlementEntries.forEach((e) => {
          if (e.code in map[tech.id].codes) {
            map[tech.id].codes[e.code] += e.quantity
            map[tech.id].totalAmount += (e.rate?.amount ?? 0) * e.quantity
          }
        })
      })

      return Object.values(map).sort((a, b) =>
        a.technicianName.localeCompare(b.technicianName)
      )
    }),
})
