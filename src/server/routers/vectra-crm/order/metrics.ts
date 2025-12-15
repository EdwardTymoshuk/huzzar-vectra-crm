// server/routers/user/metrics.ts

import { adminOrCoord, technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
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

export const metricsRouter = router({
  /**
   * getTechnicianEfficiency
   * --------------------------------------------------------------
   * Returns technician efficiency (COMPLETED + NOT_COMPLETED)
   * for a given date range and optionally filtered by VectraOrderType.
   *
   * Used in dashboard sections:
   *  - INSTALLATION
   *  - SERVICE
   *  - OUTAGE (LINES)
   */
  getTechnicianEfficiency: adminOrCoord
    .input(
      z.object({
        date: z.string(),
        range: z.enum(['day', 'month', 'year']),
        orderType: z.nativeEnum(VectraOrderType).optional(),
      })
    )
    .query(async ({ input }) => {
      const base = new Date(input.date)
      const start = new Date(base)
      const end = new Date(base)

      // Build time window
      if (input.range === 'day') {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
      } else if (input.range === 'month') {
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

      // NOW: include ASSIGNED
      const statusesToCount: VectraOrderStatus[] = [
        'ASSIGNED',
        'COMPLETED',
        'NOT_COMPLETED',
      ]

      const rows = await prisma.vectraOrder.findMany({
        where: {
          assignedToId: { not: null },
          status: { in: statusesToCount },
          date: { gte: start, lte: end },
          ...(input.orderType ? { type: input.orderType } : {}),
        },
        select: {
          assignedToId: true,
          status: true,
          assignedTo: { select: { name: true } },
        },
      })

      // Map for aggregating stats
      const map = new Map<
        string,
        {
          technicianId: string
          technicianName: string
          assigned: number
          completed: number
          notCompleted: number
          received: number
          successRate: number
        }
      >()

      rows.forEach((r) => {
        const id = r.assignedToId!
        if (!map.has(id)) {
          map.set(id, {
            technicianId: id,
            technicianName: r.assignedTo?.name ?? 'Nieznany',
            assigned: 0,
            completed: 0,
            notCompleted: 0,
            received: 0,
            successRate: 0,
          })
        }

        const e = map.get(id)!

        if (r.status === 'ASSIGNED') e.assigned++
        else if (r.status === 'COMPLETED') e.completed++
        else if (r.status === 'NOT_COMPLETED') e.notCompleted++
      })

      // Compute received + successRate
      map.forEach((tech) => {
        tech.received = tech.assigned + tech.completed + tech.notCompleted
        tech.successRate =
          tech.received > 0
            ? Math.round((tech.completed / tech.received) * 100)
            : 0
      })

      // Sort by received (DESC)
      return [...map.values()].sort((a, b) => b.received - a.received)
    }),

  /** Company success trend for dashboard chart (day/month/year granularity) */
  getCompanySuccessOverTime: adminOrCoord
    .input(
      z.object({
        date: z.date(),
        range: z.enum(['day', 'month', 'year']),
        orderType: z.nativeEnum(VectraOrderType).optional(), // ← NEW FILTER
      })
    )
    .query(async ({ input, ctx }) => {
      const { date, range, orderType } = input
      const prisma = ctx.prisma

      if (!date) throw new TRPCError({ code: 'BAD_REQUEST' })

      // Determine time window based on the selected range
      let dateFrom: Date
      let dateTo: Date

      const year = date.getFullYear()
      const month = date.getMonth() // 0–11

      if (range === 'day') {
        dateFrom = new Date(year, month, 1)
        dateTo = new Date(year, month + 1, 0, 23, 59, 59)
      } else if (range === 'month') {
        dateFrom = new Date(year, 0, 1)
        dateTo = new Date(year, 11, 31, 23, 59, 59)
      } else {
        // Show last 5 years in "year" view
        dateFrom = new Date(year - 4, 0, 1)
        dateTo = new Date(year, 11, 31, 23, 59, 59)
      }

      /**
       * Fetch all orders for required time window.
       * Optional filter: VectraOrderType (INSTALLATION / SERVICE / OUTAGE).
       */
      const orders = await prisma.vectraOrder.findMany({
        where: {
          date: { gte: dateFrom, lte: dateTo },
          ...(orderType ? { type: orderType } : {}), // ← APPLY FILTER
        },
        select: { date: true, status: true },
      })

      // Buckets for day / month / year aggregation
      const grouped = new Map<
        string | number,
        { total: number; completed: number }
      >()

      for (const o of orders) {
        const d = o.date
        let key: string | number

        if (range === 'day') key = d.getDate()
        else if (range === 'month') key = d.getMonth() + 1
        else key = d.getFullYear()

        const current = grouped.get(key) ?? { total: 0, completed: 0 }
        current.total += 1
        if (o.status === 'COMPLETED') current.completed += 1
        grouped.set(key, current)
      }

      // Convert Map to sorted array for the frontend chart
      return Array.from(grouped.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([key, { total, completed }]) => ({
          ...(range === 'day'
            ? { day: Number(key) }
            : range === 'month'
            ? { month: Number(key) }
            : { year: Number(key) }),
          successRate: total === 0 ? 0 : Math.round((completed / total) * 100),
        }))
    }),

  /** Aggregated order stats for a given period */
  getOrderStats: adminOrCoord
    .input(
      z.object({
        date: z.string().regex(/^\d{4}(-\d{2}){0,2}$/),
        range: z.enum(['day', 'month', 'year']),
        orderType: z.nativeEnum(VectraOrderType).optional(),
      })
    )
    .query(async ({ input }) => {
      const parts = input.date.split('-')
      const y = Number(parts[0])
      const m = Number(parts[1] ?? 1)
      const d = Number(parts[2] ?? 1)
      const baseDate = new Date(y, m - 1, d)

      /**
       * Builds a date range for the selected period (day/month/year).
       * Ensures precise start/end timestamps for correct SQL filtering.
       */
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

      /**
       * Calculates stats (completed, failed, in-progress / assigned)
       * for a given time window. Filters only orders assigned to technicians.
       */
      const calc = async (start: Date, end: Date) => {
        const rows = await prisma.vectraOrder.findMany({
          where: {
            date: { gte: start, lte: end },
            assignedToId: { not: null },
            ...(input.orderType ? { type: input.orderType } : {}),
          },
          select: { status: true },
        })

        // Accumulator for status counters
        const sum = { assigned: 0, completed: 0, failed: 0 }

        rows.forEach((o) => {
          if (o.status === 'COMPLETED') sum.completed++
          else if (o.status === 'NOT_COMPLETED') sum.failed++
          else if (o.status === 'ASSIGNED') sum.assigned++
        })

        const received = sum.assigned + sum.completed + sum.failed

        const successRate =
          received > 0 ? Math.round((sum.completed / received) * 100) : 0

        return {
          total: received,
          completed: sum.completed,
          failed: sum.failed,
          inProgress: sum.assigned, // ← NEW FIELD
          successRate,
        }
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

        // ← NEW FIELDS
        prevInProgress: previous.inProgress,
      }
    }),

  /** Orders stats for the logged-in technician (day/month/year) */
  getTechOrderStats: technicianOnly
    .input(
      z.object({
        date: dateParamSchema,
        range: rangeSchema,
      })
    )
    .query(async ({ ctx, input }): Promise<OrderStats> => {
      const technicianId = ctx.user?.id

      const [y, mStr, dStr] = input.date.split('-')
      const yNum = Number(y)
      const mNum = Number(mStr ?? 1)
      const dNum = Number(dStr ?? 1)
      const baseDate = new Date(yNum, mNum - 1, dNum)

      /** Count assigned + completed + failed */
      const calc = async (start: Date, end: Date) => {
        const rows = await prisma.vectraOrder.findMany({
          where: {
            assignedToId: technicianId,
            date: { gte: start, lte: end },
            status: { in: ['ASSIGNED', 'COMPLETED', 'NOT_COMPLETED'] },
          },
          select: { status: true },
        })

        // Same structure as admin
        const sum = { assigned: 0, completed: 0, failed: 0 }

        rows.forEach((o) => {
          if (o.status === 'ASSIGNED') sum.assigned++
          else if (o.status === 'COMPLETED') sum.completed++
          else if (o.status === 'NOT_COMPLETED') sum.failed++
        })

        const received = sum.assigned + sum.completed + sum.failed

        const successRate =
          received > 0 ? Math.round((sum.completed / received) * 100) : 0

        return {
          total: received, // alias for "received"
          completed: sum.completed,
          failed: sum.failed,
          successRate,
        }
      }

      // Current period
      const curr = rangeOf(baseDate, input.range)

      // Previous period
      const prevBase = prevOf(baseDate, input.range)
      const prev = rangeOf(prevBase, input.range)

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
        const orders = await prisma.vectraOrder.findMany({
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
        const orders = await prisma.vectraOrder.findMany({
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
  getTechSuccessOverTime: technicianOnly
    .input(
      z.object({
        date: z.date(),
        range: rangeSchema,
      })
    )
    .query(async ({ ctx, input }) => {
      const technicianId = ctx.user?.id
      const { date, range } = input

      if (!date) throw new TRPCError({ code: 'BAD_REQUEST' })

      let dateFrom: Date
      let dateTo: Date

      const year = date.getFullYear()
      const month = date.getMonth()

      // identical logic to admin
      if (range === 'day') {
        dateFrom = new Date(year, month, 1)
        dateTo = new Date(year, month + 1, 0, 23, 59, 59)
      } else if (range === 'month') {
        dateFrom = new Date(year, 0, 1)
        dateTo = new Date(year, 11, 31, 23, 59, 59)
      } else {
        dateFrom = new Date(year - 4, 0, 1)
        dateTo = new Date(year, 11, 31, 23, 59, 59)
      }

      const orders = await prisma.vectraOrder.findMany({
        where: {
          assignedToId: technicianId,
          date: { gte: dateFrom, lte: dateTo },
        },
        select: { date: true, status: true },
      })

      const grouped = new Map<
        string | number,
        { total: number; completed: number }
      >()

      for (const o of orders) {
        const d = o.date
        let key: number | string

        if (range === 'day') key = d.getDate()
        else if (range === 'month') key = d.getMonth() + 1
        else key = d.getFullYear()

        const current = grouped.get(key) ?? { total: 0, completed: 0 }
        current.total += 1
        if (o.status === 'COMPLETED') current.completed += 1
        grouped.set(key, current)
      }

      return Array.from(grouped.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([key, val]) => ({
          ...(range === 'day'
            ? { day: Number(key) }
            : range === 'month'
            ? { month: Number(key) }
            : { year: Number(key) }),
          successRate:
            val.total === 0 ? 0 : Math.round((val.completed / val.total) * 100),
        }))
    }),
})
