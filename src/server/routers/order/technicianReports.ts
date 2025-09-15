import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'

/** Strict input schema for date range selector */
const rangeSchema = z.enum(['day', 'month', 'year'])

/** yyyy or yyyy-mm or yyyy-mm-dd */
const dateParamSchema = z.string().regex(/^\d{4}(-\d{2}){0,2}$/)

/** Utility: get start/end for selected range around base date */
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

/** Utility: prev date (one unit back) for the selected range */
const prevOf = (ref: Date, kind: 'day' | 'month' | 'year') => {
  const prev = new Date(ref)
  if (kind === 'day') prev.setDate(prev.getDate() - 1)
  else if (kind === 'month') prev.setMonth(prev.getMonth() - 1)
  else prev.setFullYear(prev.getFullYear() - 1)
  return prev
}

/** Strictly typed return structure for KPI stats */
type OrderStats = {
  total: number
  completed: number
  failed: number
  successRate: number
  prevTotal: number
  prevCompleted: number
  prevFailed: number
}

export const technicianReportsRouter = router({
  /** Orders stats for the logged-in technician (day/month/year) */
  getTechOrderStats: technicianOnly
    .input(
      z.object({
        date: dateParamSchema,
        range: rangeSchema,
      })
    )
    .query(async ({ ctx, input }): Promise<OrderStats> => {
      // NOTE: never trust client-side user id; always take it from session.
      const technicianId = ctx.user?.id

      const parts = input.date.split('-')
      const y = Number(parts[0])
      const m = Number(parts[1] ?? 1)
      const d = Number(parts[2] ?? 1)
      const baseDate = new Date(y, m - 1, d)

      const calc = async (start: Date, end: Date) => {
        // Only orders assigned to the logged-in technician
        const rows = await prisma.order.findMany({
          where: {
            assignedToId: technicianId,
            date: { gte: start, lte: end },
          },
          select: { status: true },
        })

        const sum = { completed: 0, failed: 0 }
        rows.forEach((o) => {
          if (o.status === 'COMPLETED') sum.completed++
          else if (o.status === 'NOT_COMPLETED') sum.failed++
        })

        const total = sum.completed + sum.failed
        const successBase = sum.completed + sum.failed
        const successRate =
          successBase > 0 ? Math.round((sum.completed / successBase) * 100) : 0

        return { total, ...sum, successRate }
      }

      const curr = rangeOf(baseDate, input.range)
      const prevDate = prevOf(baseDate, input.range)
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
      }
    }),

  /** Earnings KPI for day/month/year (sum of settlementEntries for this tech) */
  getTechEarningsKpis: technicianOnly
    .input(
      z.object({
        date: dateParamSchema,
        range: rangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      // NOTE: take technician id from session to enforce security
      const technicianId = ctx.user?.id

      const [y, mStr, dStr] = input.date.split('-')
      const yNum = Number(y)
      const mNum = Number(mStr ?? 1)
      const dNum = Number(dStr ?? 1)
      const baseDate = new Date(yNum, mNum - 1, dNum)

      const { start, end } = rangeOf(baseDate, input.range)
      const prevRange = rangeOf(prevOf(baseDate, input.range), input.range)

      // Helper: sum earnings for a time window
      const sumEarnings = async (s: Date, e: Date): Promise<number> => {
        const orders = await prisma.order.findMany({
          where: {
            assignedToId: technicianId,
            date: { gte: s, lte: e },
            status: 'COMPLETED',
          },
          select: {
            settlementEntries: { select: { quantity: true, rate: true } },
          },
        })

        let total = 0
        for (const o of orders) {
          for (const entry of o.settlementEntries) {
            const rate = entry.rate?.amount ?? 0
            total += rate * entry.quantity
          }
        }
        // Round to 2 decimal places to avoid floating noise in UI
        return Math.round(total * 100) / 100
      }

      const [current, previous] = await Promise.all([
        sumEarnings(start, end),
        sumEarnings(prevRange.start, prevRange.end),
      ])

      return {
        amount: current,
        prevAmount: previous,
        changePct:
          previous === 0
            ? current > 0
              ? 100
              : 0
            : Math.round(((current - previous) / previous) * 100),
      }
    }),

  /** Earnings grouped by month for a given year (for line/area chart) */

  getTechEarningsByMonth: technicianOnly
    .input(z.object({ year: z.number().int().min(2000).max(2100) }))
    .query(async ({ ctx, input }) => {
      const technicianId = ctx.user?.id
      const results: Array<{
        month: number
        amount: number
        successRate: number
      }> = []

      for (let month = 1; month <= 12; month++) {
        const start = new Date(input.year, month - 1, 1, 0, 0, 0, 0)
        const end = new Date(input.year, month, 0, 23, 59, 59, 999)

        // Fetch orders for the month for this technician
        const orders = await prisma.order.findMany({
          where: {
            assignedToId: technicianId,
            date: { gte: start, lte: end },
            status: { in: ['COMPLETED', 'NOT_COMPLETED'] }, // only these affect success rate
          },
          select: {
            status: true,
            // earnings come only from COMPLETED via settlementEntries
            settlementEntries: { select: { quantity: true, rate: true } },
          },
        })

        let amount = 0
        let completed = 0
        let failed = 0

        for (const o of orders) {
          if (o.status === 'COMPLETED') {
            completed++
            for (const entry of o.settlementEntries) {
              const rate = entry.rate?.amount ?? 0
              amount += rate * entry.quantity
            }
          } else if (o.status === 'NOT_COMPLETED') {
            failed++
          }
        }

        const base = completed + failed
        const successRate = base > 0 ? Math.round((completed / base) * 100) : 0

        results.push({
          month,
          amount: Math.round(amount * 100) / 100,
          successRate,
        })
      }

      return results
    }),
})
