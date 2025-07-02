// server/routers/user/metrics.ts
import { adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { OrderStatus } from '@prisma/client'
import { z } from 'zod'

export const metricsRouter = router({
  /** Efficiency per technician on given period */
  getTechnicianEfficiency: adminOrCoord
    .input(
      z.object({
        date: z.string(),
        range: z.enum(['day', 'month', 'year']),
      })
    )
    .query(async ({ input }) => {
      /* Twój oryginalny kod – bez zmian */
      const base = new Date(input.date)
      const start = new Date(base)
      const end = new Date(base)

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

      const relevant: OrderStatus[] = [
        'COMPLETED',
        'NOT_COMPLETED',
        'IN_PROGRESS',
        'CANCELED',
      ]

      const rows = await prisma.order.findMany({
        where: {
          assignedToId: { not: null },
          status: { in: relevant },
          date: { gte: start, lte: end },
        },
        select: {
          assignedToId: true,
          status: true,
          assignedTo: { select: { name: true } },
        },
      })

      const map = new Map<
        string,
        {
          technicianId: string
          technicianName: string
          completed: number
          notCompleted: number
          inProgress: number
          canceled: number
        }
      >()

      rows.forEach((r) => {
        const id = r.assignedToId!
        if (!map.has(id)) {
          map.set(id, {
            technicianId: id,
            technicianName: r.assignedTo?.name ?? 'Nieznany',
            completed: 0,
            notCompleted: 0,
            inProgress: 0,
            canceled: 0,
          })
        }
        const e = map.get(id)!
        if (r.status === 'COMPLETED') e.completed++
        else if (r.status === 'NOT_COMPLETED') e.notCompleted++
        else if (r.status === 'IN_PROGRESS') e.inProgress++
        else e.canceled++
      })

      return [...map.values()].sort(
        (a, b) => b.completed + b.notCompleted - (a.completed + a.notCompleted)
      )
    }),
})
