// server/routers/user/metrics.ts

import {
  getDateRange,
  getPreviousBaseDate,
} from '@/server/core/services/dateRanges'
import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { adminOrCoord, technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { OplOrderStatus, OplOrderType, Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/** Strict input schema for date range selector */
const rangeSchema = z.enum(['day', 'month', 'year'])

/** yyyy or yyyy-mm or yyyy-mm-dd */
const dateParamSchema = z.string().regex(/^\d{4}(-\d{2}){0,2}$/)

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

type DashboardRange = 'day' | 'month' | 'year'

const buildRangeFromDate = (base: Date, range: DashboardRange) => {
  const start = new Date(base)
  const end = new Date(base)

  if (range === 'day') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (range === 'month') {
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

const getOrderTotalAmount = (
  entries: Array<{ quantity: number; rate: { amount: number } | null }>
): number =>
  entries.reduce(
    (sum, entry) => sum + (entry.rate?.amount ?? 0) * entry.quantity,
    0
  )

const SOLO_TECHNICIAN_REGEX = /\[SOLO:([^\]]+)\]/i

const parseSoloTechnicianId = (note?: string | null): string | null => {
  if (!note) return null
  const match = note.match(SOLO_TECHNICIAN_REGEX)
  return match?.[1]?.trim() || null
}

const extractEffectiveTechnicianIds = ({
  assignmentIds,
  history,
}: {
  assignmentIds: string[]
  history: Array<{
    statusAfter: OplOrderStatus
    notes: string | null
    changeDate: Date
  }>
}): string[] => {
  if (!assignmentIds.length) return []

  const completionEvent = [...history]
    .filter(
      (entry) =>
        entry.statusAfter === OplOrderStatus.COMPLETED ||
        entry.statusAfter === OplOrderStatus.NOT_COMPLETED
    )
    .sort((a, b) => b.changeDate.getTime() - a.changeDate.getTime())[0]

  const soloTechnicianId = parseSoloTechnicianId(completionEvent?.notes)
  if (soloTechnicianId && assignmentIds.includes(soloTechnicianId)) {
    return [soloTechnicianId]
  }

  return assignmentIds
}

const getTechnicianShareAmount = (
  orderAmount: number,
  effectiveTechnicianIds: string[]
): number => {
  const divisor = Math.max(1, effectiveTechnicianIds.length)
  return orderAmount / divisor
}

const isMissingLeadTableError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return (
    message.includes('OplLeadEntry') &&
    (message.includes('does not exist') || message.includes('42P01'))
  )
}

const isMissingZoneTableError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return (
    message.includes('OplZoneDefinition') &&
    (message.includes('does not exist') || message.includes('42P01'))
  )
}

export const metricsRouter = router({
  createLeadEntry: adminOrCoord
    .input(
      z.object({
        zone: z.string().min(2),
        technicianId: z.string().optional(),
        address: z.string().min(3),
        leadNumber: z.string().min(2),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id: createdById } = getCoreUserOrThrow(ctx)
      let zoneDefinition: { zone: string; active: boolean } | null = null
      try {
        const rows = await ctx.prisma.$queryRaw<Array<{ zone: string; active: boolean }>>(
          Prisma.sql`
            SELECT "zone", "active"
            FROM "opl"."OplZoneDefinition"
            WHERE "zone" = ${input.zone.trim()}
            LIMIT 1
          `
        )
        zoneDefinition = rows[0] ?? null
      } catch (error) {
        if (isMissingZoneTableError(error)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Tabela stref nie istnieje w bazie. Wykonaj migrację/db push i spróbuj ponownie.',
          })
        }
        throw error
      }
      if (!zoneDefinition || !zoneDefinition.active) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Wybierz strefę z aktywnego słownika.',
        })
      }

      const technician = input.technicianId
        ? await ctx.prisma.oplUser.findUnique({
            where: { userId: input.technicianId },
            select: {
              user: {
                select: { name: true },
              },
            },
          })
        : null

      const id = crypto.randomUUID()
      try {
        await ctx.prisma.$executeRaw(
          Prisma.sql`
            INSERT INTO "opl"."OplLeadEntry"
              ("id", "zone", "address", "leadNumber", "operator", "technicianId", "technicianName", "createdById")
            VALUES
              (${id}, ${input.zone.trim()}, ${input.address.trim()}, ${input.leadNumber.trim()}, 'ORANGE', ${input.technicianId ?? null}, ${technician?.user.name?.trim() || null}, ${createdById})
          `
        )
      } catch (error) {
        if (isMissingLeadTableError(error)) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message:
              'Tabela leadów nie istnieje w bazie. Wykonaj migrację/db push i spróbuj ponownie.',
          })
        }
        throw error
      }

      return { id }
    }),

  importNpsQ6Rows: adminOrCoord
    .input(
      z.object({
        rows: z.array(
          z.object({
            orderNumber: z.string().min(3),
            technicianName: z.string().optional(),
            zone: z.string().optional(),
            q6Score: z.number().int().min(1).max(5),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id: importedById } = getCoreUserOrThrow(ctx)
      const uniqueRows = Array.from(
        new Map(
          input.rows.map((row) => [row.orderNumber.trim().toUpperCase(), row])
        ).values()
      )

      let updated = 0
      let unresolvedOrders = 0

      for (const row of uniqueRows) {
        const normalizedOrderNumber = row.orderNumber.trim()

        const linkedOrder = await ctx.prisma.oplOrder.findFirst({
          where: {
            orderNumber: { equals: normalizedOrderNumber, mode: 'insensitive' },
          },
          orderBy: { attemptNumber: 'desc' },
          select: {
            id: true,
            operator: true,
            zone: true,
          },
        })

        if (!linkedOrder) unresolvedOrders++

        await ctx.prisma.oplNpsEntry.upsert({
          where: { orderNumber: normalizedOrderNumber },
          create: {
            orderNumber: normalizedOrderNumber,
            orderId: linkedOrder?.id ?? null,
            operator: linkedOrder?.operator ?? null,
            zone: row.zone?.trim() || linkedOrder?.zone || null,
            technicianName: row.technicianName?.trim() || null,
            q6Score: row.q6Score,
            importedById,
          },
          update: {
            orderId: linkedOrder?.id ?? null,
            operator: linkedOrder?.operator ?? null,
            zone: row.zone?.trim() || linkedOrder?.zone || null,
            technicianName: row.technicianName?.trim() || null,
            q6Score: row.q6Score,
            importedById,
            importedAt: new Date(),
          },
        })

        updated++
      }

      return {
        updated,
        unresolvedOrders,
      }
    }),

  getOrangeGoalsDashboard: adminOrCoord
    .input(
      z.object({
        date: z.date(),
        range: rangeSchema,
      })
    )
    .query(async ({ input, ctx }) => {
      const { start, end } = buildRangeFromDate(input.date, input.range)
      const zoneDefinitions = await (async () => {
        try {
          return await ctx.prisma.$queryRaw<Array<{ zone: string }>>(
            Prisma.sql`
              SELECT "zone"
              FROM "opl"."OplZoneDefinition"
              WHERE "active" = true
              ORDER BY "sortOrder" ASC, "zone" ASC
            `
          )
        } catch (error) {
          if (isMissingZoneTableError(error)) return []
          throw error
        }
      })()
      const orderedZoneNames = zoneDefinitions.map((item: { zone: string }) => item.zone)

      const installationOrders = await ctx.prisma.oplOrder.findMany({
        where: {
          date: { gte: start, lte: end },
          type: OplOrderType.INSTALLATION,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          attemptNumber: true,
          termChangeFlag: true,
          standard: true,
          zone: true,
          leads: true,
          operator: true,
          city: true,
          street: true,
          date: true,
          completedAt: true,
          closedAt: true,
          assignments: {
            orderBy: { assignedAt: 'asc' },
            take: 1,
            select: {
              technician: {
                select: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      })

      const orangeOrders = installationOrders.filter(
        (order) => order.operator === 'ORANGE'
      )
      const allInstallationOrders = installationOrders

      const finishedOrders = orangeOrders.filter(
        (order) =>
          order.status === OplOrderStatus.COMPLETED ||
          order.status === OplOrderStatus.NOT_COMPLETED
      )
      const completedOrders = orangeOrders.filter(
        (order) => order.status === OplOrderStatus.COMPLETED
      )
      const finishedAllInstallationOrders = allInstallationOrders.filter(
        (order) =>
          order.status === OplOrderStatus.COMPLETED ||
          order.status === OplOrderStatus.NOT_COMPLETED
      )
      const completedAllInstallationOrders = allInstallationOrders.filter(
        (order) => order.status === OplOrderStatus.COMPLETED
      )

      const efficiencyBase = finishedOrders.length
      const efficiencyCompleted = finishedOrders.filter(
        (order) => order.status === OplOrderStatus.COMPLETED
      ).length
      const efficiencyPct =
        efficiencyBase > 0
          ? Math.round((efficiencyCompleted / efficiencyBase) * 100)
          : 0

      const odBase = completedOrders.length
      const odCompleted = completedOrders.filter(
        (order) =>
          order.attemptNumber === 1 && order.termChangeFlag.toUpperCase() === 'N'
      ).length
      const odPct = odBase > 0 ? Math.round((odCompleted / odBase) * 100) : 0

      const calculateZoneStats = (
        orders: typeof installationOrders
      ): Array<{
        zone: string
        received: number
        completed: number
        failed: number
        efficiency: number
      }> => {
        const map = new Map<string, { received: number; completed: number; failed: number }>()
        for (const order of orders) {
          if (
            order.status !== OplOrderStatus.COMPLETED &&
            order.status !== OplOrderStatus.NOT_COMPLETED
          ) {
            continue
          }
          const zone = order.zone?.trim() || 'Brak strefy'
          const current = map.get(zone) ?? { received: 0, completed: 0, failed: 0 }
          current.received += 1
          if (order.status === OplOrderStatus.COMPLETED) current.completed += 1
          if (order.status === OplOrderStatus.NOT_COMPLETED) current.failed += 1
          map.set(zone, current)
        }
        return Array.from(map.entries())
          .map(([zone, stat]) => ({
            zone,
            ...stat,
            efficiency:
              stat.received > 0
                ? Math.round((stat.completed / stat.received) * 100)
                : 0,
          }))
          .sort((a, b) => a.zone.localeCompare(b.zone, 'pl'))
      }

      const orderByDefinitions = <T extends { zone: string }>(
        rows: T[],
        createEmpty: (zone: string) => T
      ): T[] => {
        const map = new Map(rows.map((row) => [row.zone, row]))
        const ordered: T[] = []

        for (const zone of orderedZoneNames) {
          ordered.push(map.get(zone) ?? createEmpty(zone))
          map.delete(zone)
        }

        const rest = Array.from(map.values()).sort((a, b) =>
          a.zone.localeCompare(b.zone, 'pl')
        )
        return [...ordered, ...rest]
      }

      const zoneOrangeStats = orderByDefinitions(calculateZoneStats(installationOrders), (zone) => ({
        zone,
        received: 0,
        completed: 0,
        failed: 0,
        efficiency: 0,
      }))
      const zoneOplStats = orderByDefinitions(calculateZoneStats(orangeOrders), (zone) => ({
        zone,
        received: 0,
        completed: 0,
        failed: 0,
        efficiency: 0,
      }))

      const sumZoneStats = (
        rows: Array<{ received: number; completed: number; failed: number }>
      ) => {
        const received = rows.reduce((sum, row) => sum + row.received, 0)
        const completed = rows.reduce((sum, row) => sum + row.completed, 0)
        const failed = rows.reduce((sum, row) => sum + row.failed, 0)
        const efficiency = received > 0 ? Math.round((completed / received) * 100) : 0
        return { received, completed, failed, efficiency }
      }

      const zoneOrangeTotals = sumZoneStats(zoneOrangeStats)
      const zoneOplTotals = sumZoneStats(zoneOplStats)

      const odZoneMap = new Map<string, { firstEntry: number; allCompleted: number }>()
      for (const order of completedOrders) {
        const zone = order.zone?.trim() || 'Brak strefy'
        const current = odZoneMap.get(zone) ?? { firstEntry: 0, allCompleted: 0 }
        current.allCompleted += 1
        if (order.attemptNumber === 1 && order.termChangeFlag.toUpperCase() === 'N') {
          current.firstEntry += 1
        }
        odZoneMap.set(zone, current)
      }
      const odByZone = Array.from(odZoneMap.entries())
        .map(([zone, row]) => ({
          zone,
          firstEntry: row.firstEntry,
          allCompleted: row.allCompleted,
          efficiency:
            row.allCompleted > 0
              ? Math.round((row.firstEntry / row.allCompleted) * 100)
              : 0,
        }))
        .sort((a, b) => a.zone.localeCompare(b.zone, 'pl'))
      const odTotals = {
        firstEntry: odByZone.reduce((sum, row) => sum + row.firstEntry, 0),
        allCompleted: odByZone.reduce((sum, row) => sum + row.allCompleted, 0),
      }

      const odAllZoneMap = new Map<string, { firstEntry: number; allCompleted: number }>()
      for (const order of completedAllInstallationOrders) {
        const zone = order.zone?.trim() || 'Brak strefy'
        const current = odAllZoneMap.get(zone) ?? { firstEntry: 0, allCompleted: 0 }
        current.allCompleted += 1
        if (order.attemptNumber === 1 && order.termChangeFlag.toUpperCase() === 'N') {
          current.firstEntry += 1
        }
        odAllZoneMap.set(zone, current)
      }
      const odAllByZone = Array.from(odAllZoneMap.entries())
        .map(([zone, row]) => ({
          zone,
          firstEntry: row.firstEntry,
          allCompleted: row.allCompleted,
          efficiency:
            row.allCompleted > 0
              ? Math.round((row.firstEntry / row.allCompleted) * 100)
              : 0,
        }))
        .sort((a, b) => a.zone.localeCompare(b.zone, 'pl'))
      const odAllByZoneOrdered = orderByDefinitions(odAllByZone, (zone) => ({
        zone,
        firstEntry: 0,
        allCompleted: 0,
        efficiency: 0,
      }))

      const leadsByZoneMap = new Map<string, number>()
      for (const order of completedOrders) {
        const zone = order.zone?.trim() || 'Brak strefy'
        leadsByZoneMap.set(zone, (leadsByZoneMap.get(zone) ?? 0) + order.leads)
      }

      const leadsByZoneAllMap = new Map<string, number>()
      for (const order of completedAllInstallationOrders) {
        const zone = order.zone?.trim() || 'Brak strefy'
        leadsByZoneAllMap.set(zone, (leadsByZoneAllMap.get(zone) ?? 0) + order.leads)
      }

      const manualLeads = await (async () => {
        try {
          return await ctx.prisma.$queryRaw<
            Array<{
              zone: string | null
              operator: string | null
              technicianName: string | null
              leadNumber: string | null
              address: string | null
              createdAt: Date | null
            }>
          >(
            Prisma.sql`
              SELECT "zone", "operator", "technicianName", "leadNumber", "address", "createdAt"
              FROM "opl"."OplLeadEntry"
              WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
            `
          )
        } catch (error) {
          if (isMissingLeadTableError(error)) {
            return []
          }
          throw error
        }
      })()

      for (const lead of manualLeads) {
        const zone = lead.zone?.trim() || 'Brak strefy'
        leadsByZoneAllMap.set(zone, (leadsByZoneAllMap.get(zone) ?? 0) + 1)
        if ((lead.operator ?? '').trim().toUpperCase() === 'ORANGE') {
          leadsByZoneMap.set(zone, (leadsByZoneMap.get(zone) ?? 0) + 1)
        }
      }

      const leadsByZone = Array.from(leadsByZoneMap.entries())
        .map(([zone, leads]) => ({
          zone,
          leads,
          target: 4,
          targetReached: leads >= 4,
        }))
        .sort((a, b) => a.zone.localeCompare(b.zone, 'pl'))
      const leadsByZoneOrdered = orderByDefinitions(leadsByZone, (zone) => ({
        zone,
        leads: 0,
        target: 4,
        targetReached: false,
      }))
      const leadsByZoneAll = Array.from(leadsByZoneAllMap.entries())
        .map(([zone, leads]) => ({
          zone,
          leads,
          target: 4,
          targetReached: leads >= 4,
        }))
        .sort((a, b) => a.zone.localeCompare(b.zone, 'pl'))
      const leadsByZoneAllOrdered = orderByDefinitions(leadsByZoneAll, (zone) => ({
        zone,
        leads: 0,
        target: 4,
        targetReached: false,
      }))

      const standardBuckets = {
        W: { received: 0, completed: 0, failed: 0 },
        ZJD: { received: 0, completed: 0, failed: 0 },
        ZJN: { received: 0, completed: 0, failed: 0 },
      }

      for (const order of finishedOrders) {
        const token = (order.standard ?? '').toString().trim().toUpperCase()
        const key = token.startsWith('ZJD')
          ? 'ZJD'
          : token.startsWith('ZJN')
          ? 'ZJN'
          : token.startsWith('W')
          ? 'W'
          : null
        if (!key) continue
        standardBuckets[key].received += 1
        if (order.status === OplOrderStatus.COMPLETED) {
          standardBuckets[key].completed += 1
        } else if (order.status === OplOrderStatus.NOT_COMPLETED) {
          standardBuckets[key].failed += 1
        }
      }

      const npsRows = await ctx.prisma.oplNpsEntry.findMany({
        where: {
          OR: [
            {
              orderId: {
                in: orangeOrders.map((order) => order.id),
              },
            },
            {
              orderId: null,
              operator: 'ORANGE',
              importedAt: { gte: start, lte: end },
            },
          ],
        },
        select: {
          orderNumber: true,
          zone: true,
          q6Score: true,
          technicianName: true,
        },
      })
      const npsRowsAll = await ctx.prisma.oplNpsEntry.findMany({
        where: {
          OR: [
            {
              orderId: {
                in: allInstallationOrders.map((order) => order.id),
              },
            },
            {
              orderId: null,
              importedAt: { gte: start, lte: end },
            },
          ],
        },
        select: {
          orderId: true,
          orderNumber: true,
          zone: true,
          q6Score: true,
          technicianName: true,
        },
      })
      const orderIdByNumber = new Map(
        allInstallationOrders.map((order) => [order.orderNumber, order.id])
      )

      const npsTotal = npsRows.length
      const npsPromoters = npsRows.filter((row) => row.q6Score === 5).length
      const npsDetractors = npsRows.filter((row) => row.q6Score <= 3).length
      const npsNeutral = npsRows.filter((row) => row.q6Score === 4).length
      const npsScore =
        npsTotal > 0
          ? Math.round(((npsPromoters - npsDetractors) / npsTotal) * 100)
          : 0
      const npsPositivePct =
        npsTotal > 0 ? Math.round((npsPromoters / npsTotal) * 100) : 0

      const rankingByTechnician = new Map<
        string,
        {
          technicianName: string
          completed: number
          wCompleted: number
          zjdCompleted: number
          zjnCompleted: number
          odBase: number
          odFirstEntry: number
          npsTotal: number
          npsFive: number
        }
      >()

      for (const order of completedAllInstallationOrders) {
        const technicianName =
          order.assignments[0]?.technician.user.name?.trim() || 'Nieprzypisany'
        const current = rankingByTechnician.get(technicianName) ?? {
          technicianName,
          completed: 0,
          wCompleted: 0,
          zjdCompleted: 0,
          zjnCompleted: 0,
          odBase: 0,
          odFirstEntry: 0,
          npsTotal: 0,
          npsFive: 0,
        }
        current.completed += 1
        current.odBase += 1
        if (order.attemptNumber === 1 && order.termChangeFlag.toUpperCase() === 'N') {
          current.odFirstEntry += 1
        }
        const token = (order.standard ?? '').toString().trim().toUpperCase()
        if (token.startsWith('W')) current.wCompleted += 1
        if (token.startsWith('ZJD')) current.zjdCompleted += 1
        if (token.startsWith('ZJN')) current.zjnCompleted += 1
        rankingByTechnician.set(technicianName, current)
      }

      const technicianAgg = new Map<
        string,
        { technicianName: string; totalResponses: number; fiveCount: number }
      >()
      for (const row of npsRowsAll) {
        const name = row.technicianName?.trim() || 'Nieprzypisany'
        const current = technicianAgg.get(name) ?? {
          technicianName: name,
          totalResponses: 0,
          fiveCount: 0,
        }
        current.totalResponses += 1
        if (row.q6Score === 5) current.fiveCount += 1
        technicianAgg.set(name, current)

        const ranking = rankingByTechnician.get(name) ?? {
          technicianName: name,
          completed: 0,
          wCompleted: 0,
          zjdCompleted: 0,
          zjnCompleted: 0,
          odBase: 0,
          odFirstEntry: 0,
          npsTotal: 0,
          npsFive: 0,
        }
        ranking.npsTotal += 1
        if (row.q6Score === 5) ranking.npsFive += 1
        rankingByTechnician.set(name, ranking)
      }

      for (const lead of manualLeads) {
        const name = lead.technicianName?.trim()
        if (!name) continue
        const ranking = rankingByTechnician.get(name) ?? {
          technicianName: name,
          completed: 0,
          wCompleted: 0,
          zjdCompleted: 0,
          zjnCompleted: 0,
          odBase: 0,
          odFirstEntry: 0,
          npsTotal: 0,
          npsFive: 0,
        }
        rankingByTechnician.set(name, ranking)
      }

      const npsByTechnician = Array.from(technicianAgg.values())
        .map((row) => ({
          ...row,
          goodPct:
            row.totalResponses > 0
              ? Math.round((row.fiveCount / row.totalResponses) * 100)
              : 0,
        }))
        .sort((a, b) =>
          b.goodPct !== a.goodPct
            ? b.goodPct - a.goodPct
            : b.totalResponses - a.totalResponses
        )

      const totalLeads = leadsByZoneOrdered.reduce((sum, zone) => sum + zone.leads, 0)
      const totalLeadsAll = leadsByZoneAllOrdered.reduce((sum, zone) => sum + zone.leads, 0)
      const technicianRanking = Array.from(rankingByTechnician.values())
        .map((row) => ({
          technicianName: row.technicianName,
          completed: row.completed,
          wCompleted: row.wCompleted,
          zjdCompleted: row.zjdCompleted,
          zjnCompleted: row.zjnCompleted,
          odPct: row.odBase > 0 ? Math.round((row.odFirstEntry / row.odBase) * 100) : 0,
          npsPct: row.npsTotal > 0 ? Math.round((row.npsFive / row.npsTotal) * 100) : 0,
        }))
        .sort((a, b) =>
          b.completed !== a.completed
            ? b.completed - a.completed
            : b.odPct !== a.odPct
            ? b.odPct - a.odPct
            : b.npsPct - a.npsPct
        )

      const npsDetails = npsRowsAll
        .map((row) => ({
          orderId: row.orderId ?? orderIdByNumber.get(row.orderNumber) ?? null,
          orderNumber: row.orderNumber,
          technicianName: row.technicianName?.trim() || 'Nieprzypisany',
          zone: row.zone?.trim() || '-',
          q6Score: row.q6Score,
        }))
        .sort((a, b) => b.q6Score - a.q6Score)

      const odDetails = completedAllInstallationOrders
        .map((order) => ({
          orderId: order.id,
          dateClosed: order.closedAt ?? order.completedAt ?? order.date,
          orderNumber: order.orderNumber,
          technicianName:
            order.assignments[0]?.technician.user.name?.trim() || 'Nieprzypisany',
          address: `${order.city}, ${order.street}`,
        }))
        .sort((a, b) => b.dateClosed.getTime() - a.dateClosed.getTime())

      const leadsDetails = manualLeads
        .map((lead) => ({
          createdAt: lead.createdAt ?? null,
          leadNumber: lead.leadNumber?.trim() || '-',
          technicianName: lead.technicianName?.trim() || 'Nieprzypisany',
          zone: lead.zone?.trim() || '-',
          address: lead.address?.trim() || '-',
        }))
        .sort((a, b) => {
          const aTs = a.createdAt ? a.createdAt.getTime() : 0
          const bTs = b.createdAt ? b.createdAt.getTime() : 0
          return bTs - aTs
        })

      return {
        goals: {
          od: { value: odPct, target: 75, reached: odPct >= 75, base: odBase },
          efficiency: {
            value: efficiencyPct,
            target: 64,
            reached: efficiencyPct >= 64,
            base: efficiencyBase,
          },
          nps: {
            value: npsScore,
            target: 75,
            reached: npsScore >= 75,
            total: npsTotal,
            promoters: npsPromoters,
            neutral: npsNeutral,
            detractors: npsDetractors,
            positivePct: npsPositivePct,
          },
          leads: {
            perZoneTarget: 4,
            totalTarget: 8,
            zonesMeetingTarget: leadsByZoneOrdered.filter((zone) => zone.targetReached)
              .length,
            zoneCount: leadsByZoneOrdered.length,
            total: totalLeads,
            reachedTotal: totalLeads >= 8,
          },
        },
        leadsByZone: leadsByZoneOrdered,
        leadsByZoneAll: leadsByZoneAllOrdered,
        zoneOrangeStats,
        zoneOrangeTotals,
        zoneOplStats,
        zoneOplTotals,
        odByZone,
        odAllByZone: odAllByZoneOrdered,
        odTotals: {
          ...odTotals,
          efficiency:
            odTotals.allCompleted > 0
              ? Math.round((odTotals.firstEntry / odTotals.allCompleted) * 100)
              : 0,
        },
        totalsAllInstallations: {
          finished: finishedAllInstallationOrders.length,
          completed: completedAllInstallationOrders.length,
          leads: totalLeadsAll,
        },
        standards: [
          { key: 'W', ...standardBuckets.W },
          { key: 'ZJD', ...standardBuckets.ZJD },
          { key: 'ZJN', ...standardBuckets.ZJN },
        ].map((bucket) => ({
          ...bucket,
          efficiency:
            bucket.received > 0
              ? Math.round((bucket.completed / bucket.received) * 100)
              : 0,
        })),
        npsByTechnician,
        technicianRanking,
        npsDetails,
        odDetails,
        leadsDetails,
      }
    }),

  /**
   * getTechnicianEfficiency
   * --------------------------------------------------------------
   * Returns technician efficiency (COMPLETED + NOT_COMPLETED)
   * for a given date range and optionally filtered by OplOrderType.
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
        orderType: z.nativeEnum(OplOrderType).optional(),
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
      const statusesToCount: OplOrderStatus[] = [
        'ASSIGNED',
        'COMPLETED',
        'NOT_COMPLETED',
      ]

      const rows = await prisma.oplOrder.findMany({
        where: {
          assignments: {
            some: {},
          },
          status: { in: statusesToCount },
          date: { gte: start, lte: end },
          ...(input.orderType ? { type: input.orderType } : {}),
        },
        include: {
          assignments: {
            include: {
              technician: {
                select: {
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
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
        r.assignments.forEach((a) => {
          const id = a.technicianId
          const name = a.technician.user.name ?? 'Nieznany'

          if (!map.has(id)) {
            map.set(id, {
              technicianId: id,
              technicianName: name,
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
        orderType: z.nativeEnum(OplOrderType).optional(),
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
       * Optional filter: OplOrderType (INSTALLATION / SERVICE / OUTAGE).
       */
      const orders = await prisma.oplOrder.findMany({
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

  /** Completed installations/services by month (all-time trend + monthly success rate). */
  getCompletedMonthlyVolumeAllTime: adminOrCoord.query(async ({ ctx }) => {
    const rows = await ctx.prisma.oplOrder.findMany({
      where: {
        status: {
          in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
        },
        type: { in: [OplOrderType.INSTALLATION, OplOrderType.SERVICE] },
      },
      select: {
        date: true,
        type: true,
        status: true,
      },
      orderBy: { date: 'asc' },
    })

    const grouped = new Map<
      string,
      {
        installations: number
        services: number
        total: number
        installationsBase: number
        servicesBase: number
      }
    >()

    for (const row of rows) {
      const monthKey = `${row.date.getFullYear()}-${String(
        row.date.getMonth() + 1
      ).padStart(2, '0')}`

      const current = grouped.get(monthKey) ?? {
        installations: 0,
        services: 0,
        total: 0,
        installationsBase: 0,
        servicesBase: 0,
      }

      if (row.type === OplOrderType.INSTALLATION) {
        current.installationsBase += 1
        if (row.status === OplOrderStatus.COMPLETED) {
          current.installations += 1
          current.total += 1
        }
      }
      if (row.type === OplOrderType.SERVICE) {
        current.servicesBase += 1
        if (row.status === OplOrderStatus.COMPLETED) {
          current.services += 1
          current.total += 1
        }
      }

      grouped.set(monthKey, current)
    }

    return Array.from(grouped.entries()).map(([month, values]) => ({
      month,
      installations: values.installations,
      services: values.services,
      total: values.total,
      installationsSuccessRate:
        values.installationsBase > 0
          ? Math.round((values.installations / values.installationsBase) * 100)
          : 0,
      servicesSuccessRate:
        values.servicesBase > 0
          ? Math.round((values.services / values.servicesBase) * 100)
          : 0,
    }))
  }),

  /** Aggregated order stats for a given period */
  getOrderStats: adminOrCoord
    .input(
      z.object({
        date: z.string().regex(/^\d{4}(-\d{2}){0,2}$/),
        range: z.enum(['day', 'month', 'year']),
        orderType: z.nativeEnum(OplOrderType).optional(),
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
        const rows = await prisma.oplOrder.findMany({
          where: {
            date: { gte: start, lte: end },
            assignments: {
              some: {},
            },
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
      const { id: technicianId } = getCoreUserOrThrow(ctx)

      const [y, mStr, dStr] = input.date.split('-')
      const yNum = Number(y)
      const mNum = Number(mStr ?? 1)
      const dNum = Number(dStr ?? 1)
      const baseDate = new Date(yNum, mNum - 1, dNum)

      /** Count assigned + completed + failed */
      const calc = async (start: Date, end: Date) => {
        const rows = await prisma.oplOrder.findMany({
          where: {
            date: { gte: start, lte: end },
            status: { in: ['ASSIGNED', 'COMPLETED', 'NOT_COMPLETED'] },
            OR: [
              {
                assignments: {
                  some: {
                    technicianId,
                  },
                },
              },
              {
                history: {
                  some: {
                    changedById: technicianId,
                    statusAfter: {
                      in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
                    },
                  },
                },
              },
            ],
          },
          select: {
            status: true,
            assignments: {
              where: { technicianId },
              select: { id: true },
            },
            history: {
              where: {
                changedById: technicianId,
                statusAfter: {
                  in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
                },
              },
              select: { id: true },
              take: 1,
            },
          },
        })

        // Same structure as admin
        const sum = { assigned: 0, completed: 0, failed: 0 }

        rows.forEach((o) => {
          if (o.status === 'ASSIGNED' && o.assignments.length > 0) {
            sum.assigned++
          } else if (o.status === 'COMPLETED' && o.history.length > 0) {
            sum.completed++
          } else if (o.status === 'NOT_COMPLETED' && o.history.length > 0) {
            sum.failed++
          }
        })

        const total = sum.assigned + sum.completed + sum.failed

        return {
          total,
          completed: sum.completed,
          failed: sum.failed,
          successRate:
            total > 0 ? Math.round((sum.completed / total) * 100) : 0,
        }
      }

      const curr = getDateRange(baseDate, input.range)
      const prevBase = getPreviousBaseDate(baseDate, input.range)
      const prev = getDateRange(prevBase, input.range)

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
      const { id: technicianId } = getCoreUserOrThrow(ctx)

      const [y, mStr, dStr] = input.date.split('-')
      const baseDate = new Date(
        Number(y),
        Number(mStr ?? 1) - 1,
        Number(dStr ?? 1)
      )

      const curr = getDateRange(baseDate, input.range)
      const prev = getDateRange(
        getPreviousBaseDate(baseDate, input.range),
        input.range
      )

      const sumEarnings = async (start: Date, end: Date): Promise<number> => {
        const orders = await ctx.prisma.oplOrder.findMany({
          where: {
            date: { gte: start, lte: end },
            status: 'COMPLETED',
            assignments: {
              some: {
                technicianId,
              },
            },
          },
          select: {
            assignments: { select: { technicianId: true } },
            history: {
              where: {
                statusAfter: {
                  in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
                },
              },
              select: { statusAfter: true, notes: true, changeDate: true },
              orderBy: { changeDate: 'desc' },
            },
            settlementEntries: { select: { quantity: true, rate: true } },
          },
        })

        let total = 0
        for (const o of orders) {
          const effectiveTechnicianIds = extractEffectiveTechnicianIds({
            assignmentIds: o.assignments.map((a) => a.technicianId),
            history: o.history,
          })
          if (!effectiveTechnicianIds.includes(technicianId)) continue
          total += getTechnicianShareAmount(
            getOrderTotalAmount(o.settlementEntries),
            effectiveTechnicianIds
          )
        }

        return Math.round(total * 100) / 100
      }

      const [current, previous] = await Promise.all([
        sumEarnings(curr.start, curr.end),
        sumEarnings(prev.start, prev.end),
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
      const { id: technicianId } = getCoreUserOrThrow(ctx)
      const results: Array<{
        month: number
        amount: number
        successRate: number
      }> = []

      for (let month = 1; month <= 12; month++) {
        const start = new Date(input.year, month - 1, 1, 0, 0, 0, 0)
        const end = new Date(input.year, month, 0, 23, 59, 59, 999)

        // Fetch orders for the month for this technician
        const orders = await prisma.oplOrder.findMany({
          where: {
            date: { gte: start, lte: end },
            status: { in: ['COMPLETED', 'NOT_COMPLETED'] }, // only these affect success rate
            assignments: {
              some: {
                technicianId,
              },
            },
          },
          select: {
            status: true,
            assignments: { select: { technicianId: true } },
            history: {
              where: {
                statusAfter: {
                  in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
                },
              },
              select: { statusAfter: true, notes: true, changeDate: true },
              orderBy: { changeDate: 'desc' },
            },
            // earnings come only from COMPLETED via settlementEntries
            settlementEntries: { select: { quantity: true, rate: true } },
          },
        })

        let amount = 0
        let completed = 0
        let failed = 0

        for (const o of orders) {
          const effectiveTechnicianIds = extractEffectiveTechnicianIds({
            assignmentIds: o.assignments.map((a) => a.technicianId),
            history: o.history,
          })
          if (!effectiveTechnicianIds.includes(technicianId)) {
            continue
          }

          if (o.status === 'COMPLETED') {
            completed++
            amount += getTechnicianShareAmount(
              getOrderTotalAmount(o.settlementEntries),
              effectiveTechnicianIds
            )
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
      const { id: technicianId } = getCoreUserOrThrow(ctx)
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

      const orders = await prisma.oplOrder.findMany({
        where: {
          date: { gte: dateFrom, lte: dateTo },
          OR: [
            {
              assignments: {
                some: {
                  technicianId,
                },
              },
              status: OplOrderStatus.ASSIGNED,
            },
            {
              history: {
                some: {
                  changedById: technicianId,
                  statusAfter: {
                    in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
                  },
                },
              },
              status: {
                in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
              },
            },
          ],
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
