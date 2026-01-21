import { adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { oplUserBasicSelect } from '../../helpers/selects'

export const reportsRouter = router({
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
      const allCodes = await prisma.oplRateDefinition.findMany()

      const orders = await prisma.oplOrder.findMany({
        where: {
          type: 'INSTALLATION',
          date: { gte: new Date(input.from), lte: new Date(input.to) },
          ...(input.operator && { operator: input.operator }),
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
          assignedToId: { not: null },
        },
        include: {
          assignedTo: { select: oplUserBasicSelect },
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
        const tech = o.assignedTo?.user
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
