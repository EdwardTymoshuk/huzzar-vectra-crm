import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { requireOplModule } from '@/server/middleware/oplMiddleware'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { OplOrderStatus, OplOrderType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

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

  const completionEvent = history
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

const normalizeCode = (code?: string | null): string =>
  code?.trim().toUpperCase() || ''

const getOrderTotalAmount = (
  entries: Array<{
    quantity: number
    rate: { amount: number } | null
  }>
): number =>
  entries.reduce((sum, entry) => sum + (entry.rate?.amount ?? 0) * entry.quantity, 0)

export const reportsRouter = router({
  /** Monthly billing summary (codes × qty / amount per technician). */
  getBillingMonthlySummary: adminOrCoord
    .use(requireOplModule)
    .input(
      z.object({
        from: z.string(),
        to: z.string(),
        orderType: z.nativeEnum(OplOrderType).optional(),
      })
    )
    .query(async ({ input }) => {
      const rates = await prisma.oplRateDefinition.findMany({
        select: { code: true },
        orderBy: { code: 'asc' },
      })

      const allCodesSet = new Set(
        rates.map((rate) => normalizeCode(rate.code)).filter(Boolean)
      )

      const orders = await prisma.oplOrder.findMany({
        where: {
          type: input.orderType ?? OplOrderType.INSTALLATION,
          date: { gte: new Date(input.from), lte: new Date(input.to) },
          status: { in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED] },
          assignments: { some: {} },
        },
        include: {
          assignments: {
            select: {
              technicianId: true,
              technician: { select: { user: { select: { id: true, name: true } } } },
            },
          },
          history: {
            where: {
              statusAfter: {
                in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
              },
            },
            select: {
              statusAfter: true,
              notes: true,
              changeDate: true,
            },
            orderBy: { changeDate: 'desc' },
          },
          settlementEntries: {
            select: {
              code: true,
              quantity: true,
              rate: { select: { amount: true } },
            },
          },
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

      for (const order of orders) {
        const assignments = order.assignments
          .map((assignment) => ({
            id: assignment.technicianId,
            name: assignment.technician.user.name,
          }))
          .filter((assignment) => Boolean(assignment.id))

        const effectiveTechnicianIds = extractEffectiveTechnicianIds({
          assignmentIds: assignments.map((assignment) => assignment.id),
          history: order.history,
        })

        if (!effectiveTechnicianIds.length) continue

        const assignmentMap = new Map(assignments.map((a) => [a.id, a]))

        for (const technicianId of effectiveTechnicianIds) {
          const technician = assignmentMap.get(technicianId)
          if (!technician) continue

          if (!map[technicianId]) {
            map[technicianId] = {
              technicianId,
              technicianName: technician.name || 'Nieznany',
              codes: {},
              totalAmount: 0,
            }
          }

          const row = map[technicianId]

          for (const entry of order.settlementEntries) {
            const code = normalizeCode(entry.code)
            if (!code) continue

            allCodesSet.add(code)
            row.codes[code] = (row.codes[code] ?? 0) + entry.quantity
            row.totalAmount += (entry.rate?.amount ?? 0) * entry.quantity
          }
        }
      }

      const availableCodes = Array.from(allCodesSet).sort((a, b) =>
        a.localeCompare(b)
      )

      for (const row of Object.values(map)) {
        for (const code of availableCodes) {
          row.codes[code] = row.codes[code] ?? 0
        }
      }

      return {
        availableCodes,
        rows: Object.values(map).sort((a, b) =>
          a.technicianName.localeCompare(b.technicianName)
        ),
      }
    }),

  /** Monthly details for a single technician. */
  getTechnicianMonthlyDetails: loggedInEveryone
    .use(requireOplModule)
    .input(
      z.object({
        technicianId: z.string(),
        from: z.string(),
        to: z.string(),
        orderType: z.nativeEnum(OplOrderType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const actor = getCoreUserOrThrow(ctx)
      if (actor.role === 'WAREHOUSEMAN') {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      if (actor.role === 'TECHNICIAN' && actor.id !== input.technicianId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const rates = await ctx.prisma.oplRateDefinition.findMany({
        select: { code: true },
        orderBy: { code: 'asc' },
      })

      const availableCodes = Array.from(
        new Set(rates.map((rate) => normalizeCode(rate.code)).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))

      const orders = await ctx.prisma.oplOrder.findMany({
        where: {
          type: input.orderType ?? OplOrderType.INSTALLATION,
          date: { gte: new Date(input.from), lte: new Date(input.to) },
          status: { in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED] },
          assignments: {
            some: { technicianId: input.technicianId },
          },
        },
        include: {
          assignments: {
            orderBy: { assignedAt: 'asc' },
            select: { technicianId: true },
          },
          history: {
            where: {
              statusAfter: {
                in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
              },
            },
            select: {
              statusAfter: true,
              notes: true,
              changeDate: true,
            },
            orderBy: { changeDate: 'desc' },
          },
          settlementEntries: {
            select: {
              code: true,
              quantity: true,
              rate: { select: { amount: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      })

      const summary: Record<string, number> = Object.fromEntries(
        availableCodes.map((code) => [code, 0])
      )
      const days: Record<
        string,
        {
          date: string
          orders: Array<{
            id: string
            orderNumber: string
            city: string
            street: string
            status: OplOrderStatus
            settlementEntries: Array<{
              code: string
              quantity: number
              rate: { amount: number } | null
            }>
          }>
          amount: number
        }
      > = {}

      let totalAmount = 0

      for (const order of orders) {
        const effectiveTechnicianIds = extractEffectiveTechnicianIds({
          assignmentIds: order.assignments.map((assignment) => assignment.technicianId),
          history: order.history,
        })

        if (!effectiveTechnicianIds.includes(input.technicianId)) {
          continue
        }

        const dayKey = order.date.toISOString().split('T')[0]

        if (!days[dayKey]) {
          days[dayKey] = {
            date: dayKey,
            orders: [],
            amount: 0,
          }
        }

        days[dayKey].orders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          city: order.city,
          street: order.street,
          status: order.status,
          settlementEntries: order.settlementEntries,
        })

        const orderAmount = getOrderTotalAmount(order.settlementEntries)
        days[dayKey].amount += orderAmount
        totalAmount += orderAmount

        for (const entry of order.settlementEntries) {
          const code = normalizeCode(entry.code)
          if (!code) continue
          summary[code] = (summary[code] ?? 0) + entry.quantity
          if (!availableCodes.includes(code)) {
            availableCodes.push(code)
          }
        }
      }

      const technician = await ctx.prisma.user.findUnique({
        where: { id: input.technicianId },
        select: { name: true },
      })

      availableCodes.sort((a, b) => a.localeCompare(b))
      for (const code of availableCodes) {
        summary[code] = summary[code] ?? 0
      }

      return {
        technicianName: technician?.name ?? 'Nieznany',
        availableCodes,
        summary,
        totalAmount,
        days: Object.values(days).sort((a, b) => b.date.localeCompare(a.date)),
      }
    }),
})
