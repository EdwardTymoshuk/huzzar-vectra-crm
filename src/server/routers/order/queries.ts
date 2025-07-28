import { router } from '@/server/trpc'

import { sortedTimeSlotsByHour } from '@/lib/constants'
import { adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import type { TechnicianAssignment } from '@/types'
import { cleanStreetName, getCoordinatesFromAddress } from '@/utils/geocode'
import { isTechnician } from '@/utils/roleCheck'
import { OrderStatus, OrderType, Prisma, TimeSlot } from '@prisma/client'
import { endOfDay, startOfDay } from 'date-fns'
import { z } from 'zod'

type OrderWithAssigned = Prisma.OrderGetPayload<{
  include: { assignedTo: { select: { id: true; name: true } } }
}>

export const queriesRouter = router({
  /** Paginated order list with filters and sort */
  getOrders: loggedInEveryone
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(30),
        sortField: z.enum(['createdAt', 'date', 'status']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        status: z.nativeEnum(OrderStatus).optional(),
        assignedToId: z.string().optional(),
        type: z.nativeEnum(OrderType).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Partial<
        Pick<OrderWithAssigned, 'status' | 'assignedToId' | 'type'>
      > = {}

      if (isTechnician(ctx)) filters.assignedToId = ctx.user!.id

      if (
        ['ADMIN', 'COORDINATOR'].includes(ctx.user!.role) &&
        input.assignedToId !== undefined
      ) {
        filters.assignedToId =
          input.assignedToId === 'unassigned' ? null : input.assignedToId
      }

      if (input.status) filters.status = input.status
      if (input.type) filters.type = input.type

      const orders = await ctx.prisma.order.findMany({
        where: filters,
        orderBy:
          input.sortField === 'date'
            ? [{ date: input.sortOrder }, { timeSlot: 'asc' }]
            : { [input.sortField]: input.sortOrder },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          transferTo: true,
          assignedTo: true,
        },
      })
      const totalOrders = await ctx.prisma.order.count({ where: filters })
      return { orders, totalOrders }
    }),

  /** Full order details */
  getOrderById: loggedInEveryone
    .input(z.object({ id: z.string() }))
    .query(({ input, ctx }) =>
      ctx.prisma.order.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          assignedTo: { select: { id: true, name: true } },
          history: {
            include: { changedBy: { select: { id: true, name: true } } },
            orderBy: { changeDate: 'desc' },
          },
          settlementEntries: { include: { rate: true } },
          usedMaterials: { include: { material: true } },
          assignedEquipment: {
            include: {
              warehouse: true,
            },
          },
          services: true,
        },
      })
    ),

  /** Orders grouped by technician and time-slot for planning board */
  getAssignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }): Promise<TechnicianAssignment[]> => {
      const target = input?.date
        ? new Date(`${input.date}T00:00:00`)
        : new Date()
      const range = { gte: startOfDay(target), lte: endOfDay(target) }

      const techs = await ctx.prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      const byTech: Record<string, TechnicianAssignment> = {}
      techs.forEach((t) => {
        byTech[t.id] = { technicianId: t.id, technicianName: t.name, slots: [] }
      })

      const assigned = await ctx.prisma.order.findMany({
        where: { assignedToId: { not: null }, date: range },
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          timeSlot: true,
          status: true,
          assignedTo: { select: { id: true } },
        },
        orderBy: { timeSlot: 'asc' },
      })

      const push = (
        key: string,
        data: {
          id: string
          orderNumber: string
          city: string
          street: string
          timeSlot: TimeSlot
          status: OrderStatus
        }
      ) => {
        if (!byTech[key]) {
          byTech[key] = {
            technicianId: null,
            technicianName: 'Nieprzypisany',
            slots: [],
          }
        }
        let slot = byTech[key].slots.find((s) => s.timeSlot === data.timeSlot)
        if (!slot) {
          slot = { timeSlot: data.timeSlot, orders: [] }
          byTech[key].slots.push(slot)
          byTech[key].slots.sort(
            (a, b) =>
              sortedTimeSlotsByHour.indexOf(a.timeSlot) -
              sortedTimeSlotsByHour.indexOf(b.timeSlot)
          )
        }
        slot.orders.push({
          id: data.id,
          orderNumber: data.orderNumber,
          address: `${data.city}, ${data.street}`,
          status: data.status,
          assignedToId: key === 'unassigned' ? undefined : key,
        })
      }

      assigned.forEach((o) => push(o.assignedTo!.id ?? 'unassigned', o))

      return Object.values(byTech)
    }),

  /** Unassigned orders for planner drag-&-drop */
  getUnassignedOrders: adminOrCoord.query(async ({ ctx }) => {
    const rows = await ctx.prisma.order.findMany({
      where: { assignedToId: null },
      select: {
        id: true,
        orderNumber: true,
        city: true,
        street: true,
        operator: true,
        timeSlot: true,
        status: true,
        postalCode: true,
      },
      orderBy: { timeSlot: 'asc' },
    })

    return Promise.all(
      rows.map(async (r) => {
        const coords = await getCoordinatesFromAddress(
          `${cleanStreetName(r.street)}, ${r.postalCode}, ${r.city}`
        )
        return { ...r, lat: coords?.lat ?? null, lng: coords?.lng ?? null }
      })
    )
  }),

  /** Accounting-level order breakdown */
  getOrderDetails: adminOrCoord
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const o = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          assignedTo: { select: { name: true } },
          settlementEntries: {
            include: { rate: { select: { amount: true } } },
          },
          usedMaterials: { include: { material: true } },
          assignedEquipment: {
            include: {
              warehouse: true,
            },
          },
        },
      })
      if (!o) return null

      return {
        orderId: o.id,
        technician: o.assignedTo?.name ?? 'Nieznany',
        status: o.status,
        closedAt: o.closedAt,
        failureReason: o.failureReason,
        notes: o.notes,
        codes: o.settlementEntries.map((e) => ({
          code: e.code,
          quantity: e.quantity,
          amount: (e.rate?.amount ?? 0) * e.quantity,
        })),
        materials: o.usedMaterials.map((m) => ({
          name: m.material.name,
          quantity: m.quantity,
          unit: m.unit,
        })),
        equipment: o.assignedEquipment.map((eq) => ({
          name: eq.warehouse.name,
          serialNumber: eq.warehouse.serialNumber,
        })),
      }
    }),
})
