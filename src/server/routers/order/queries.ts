// src/server/routers/order/queries.ts
import { router } from '@/server/trpc'

import { sortedTimeSlotsByHour } from '@/lib/constants'
import {
  adminCoordOrWarehouse,
  adminOnly,
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import type { TechnicianAssignment } from '@/types'
import { cleanStreetName, getCoordinatesFromAddress } from '@/utils/geocode'
import { getNextLineOrderNumber } from '@/utils/nextLineOrderNumber'
import { isTechnician } from '@/utils/roleHelpers/roleCheck'
import { OrderStatus, OrderType, Prisma, TimeSlot } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import { z } from 'zod'
import { getUserOrThrow } from '../_helpers/getUserOrThrow'

/* -----------------------------------------------------------
 * Small, strongly-typed concurrency-limited map helper.
 * Prevents spawning too many geocoding requests at once.
 * ----------------------------------------------------------- */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const ret: R[] = new Array(items.length)
  let idx = 0

  async function worker(): Promise<void> {
    while (true) {
      const current = idx++
      if (current >= items.length) return
      ret[current] = await mapper(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker()
  )
  await Promise.all(workers)
  return ret
}

/* -----------------------------------------------------------
 * queriesRouter
 * ----------------------------------------------------------- */
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
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.OrderWhereInput = {}

      const user = getUserOrThrow(ctx)
      const userId = user.id

      // Technicians only see their own orders
      if (isTechnician(ctx)) {
        filters.assignedToId = userId
      }

      // Admin/Coordinator may filter by assignedToId (or 'unassigned')
      if (
        ['ADMIN', 'COORDINATOR'].includes(user.role) &&
        input.assignedToId !== undefined
      ) {
        filters.assignedToId =
          input.assignedToId === 'unassigned' ? null : input.assignedToId
      }

      if (input.status) filters.status = input.status
      if (input.type) filters.type = input.type

      // 🔍 Search logic
      if (input.searchTerm && input.searchTerm.trim() !== '') {
        const q = input.searchTerm.trim()
        filters.OR = [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { street: { contains: q, mode: 'insensitive' } },
        ]
      }

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

  /** ✅ Full order details (with complete attempt chain + full client history) */
  getOrderById: loggedInEveryone
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const prisma = ctx.prisma

      /* ------------------------------------------------------------
       * 1️⃣ Fetch main (current) order with all related details
       * ---------------------------------------------------------- */
      const order = await prisma.order.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: { select: { id: true, name: true } },
          history: {
            include: { changedBy: { select: { id: true, name: true } } },
            orderBy: { changeDate: 'desc' },
          },
          settlementEntries: { include: { rate: true } },
          usedMaterials: { include: { material: true } },
          assignedEquipment: { include: { warehouse: true } },
          services: {
            include: {
              extraDevices: {
                select: {
                  id: true,
                  source: true,
                  name: true,
                  serialNumber: true,
                  category: true,
                  warehouseId: true,
                  serviceId: true,
                },
              },
            },
          },
          previousOrder: {
            select: {
              id: true,
              attemptNumber: true,
              date: true,
              createdAt: true,
              completedAt: true,
              closedAt: true,
              status: true,
              failureReason: true,
              notes: true,
              previousOrderId: true,
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
      })

      if (!order)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      /* ------------------------------------------------------------
       * 2️⃣ Recursively fetch all previous orders (attempt chain)
       * ---------------------------------------------------------- */
      async function fetchAllPreviousOrders(orderId: string): Promise<
        {
          id: string
          attemptNumber: number
          date: Date
          completedAt: Date | null
          createdAt: Date | null
          closedAt: Date | null
          status: OrderStatus
          failureReason: string | null
          notes: string | null
          previousOrderId: string | null
          assignedTo: { id: string; name: string } | null
        }[]
      > {
        const results: {
          id: string
          attemptNumber: number
          date: Date
          completedAt: Date | null
          createdAt: Date | null
          closedAt: Date | null
          status: OrderStatus
          failureReason: string | null
          notes: string | null
          previousOrderId: string | null
          assignedTo: { id: string; name: string } | null
        }[] = []

        let currentId: string | null = orderId

        while (currentId) {
          const prev: {
            id: string
            attemptNumber: number
            date: Date
            createdAt: Date | null
            completedAt: Date | null
            closedAt: Date | null
            status: OrderStatus
            failureReason: string | null
            notes: string | null
            previousOrderId: string | null
            assignedTo: { id: string; name: string } | null
          } | null = await prisma.order.findUnique({
            where: { id: currentId },
            select: {
              id: true,
              attemptNumber: true,
              date: true,
              createdAt: true,
              completedAt: true,
              closedAt: true,
              status: true,
              failureReason: true,
              notes: true,
              previousOrderId: true,
              assignedTo: { select: { id: true, name: true } },
            },
          })

          if (!prev) break
          results.push(prev)
          currentId = prev.previousOrderId
        }

        return results.reverse()
      }

      const previousChain = order.previousOrderId
        ? await fetchAllPreviousOrders(order.previousOrderId)
        : []

      /* ------------------------------------------------------------
       * 3️⃣ Combine all attempts (previous + current)
       * ---------------------------------------------------------- */
      const allAttempts = [
        ...previousChain.map((o) => ({
          id: o.id,
          attemptNumber: o.attemptNumber,
          date: o.date,
          createdAt: o.createdAt,
          completedAt: o.completedAt,
          closedAt: o.closedAt,
          status: o.status,
          failureReason: o.failureReason,
          notes: o.notes,
          assignedTo: o.assignedTo ? { ...o.assignedTo } : null,
        })),
        {
          id: order.id,
          attemptNumber: order.attemptNumber,
          date: order.date,
          createdAt: order.createdAt,
          completedAt: order.completedAt,
          closedAt: order.closedAt,
          status: order.status,
          failureReason: order.failureReason,
          notes: order.notes,
          assignedTo: order.assignedTo ? { ...order.assignedTo } : null,
        },
      ]

      /* ------------------------------------------------------------
       * 4️⃣ Merge all orderHistory entries from all attempts
       * ---------------------------------------------------------- */
      const allOrderIds = [order.id, ...previousChain.map((o) => o.id)]

      const mergedHistory = await prisma.orderHistory.findMany({
        where: { orderId: { in: allOrderIds } },
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { changeDate: 'desc' },
      })

      /* ------------------------------------------------------------
       * 5️⃣ Fetch full client history (all orders by clientId)
       * ---------------------------------------------------------- */
      let clientHistory: {
        id: string
        orderNumber: string
        date: Date
        status: OrderStatus
        type: OrderType
        city: string
        street: string
        attemptNumber: number
      }[] = []

      if (order.clientId) {
        const ordersByClient = await prisma.order.findMany({
          where: { clientId: order.clientId },
          orderBy: { date: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            date: true,
            status: true,
            type: true,
            city: true,
            street: true,
            attemptNumber: true,
          },
        })

        // Exclude the current order from the summary (optional)
        clientHistory = ordersByClient.filter((o) => o.id !== order.id)
      }

      /* ------------------------------------------------------------
       * 6️⃣ Return combined response
       * ---------------------------------------------------------- */
      return {
        ...order,
        attempts: allAttempts,
        history: mergedHistory,
        clientHistory,
      }
    }),

  /** Orders grouped by technician and time-slot for planning board */
  getAssignedOrders: adminCoordOrWarehouse
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }): Promise<TechnicianAssignment[]> => {
      const target = input?.date
        ? new Date(`${input.date}T00:00:00`)
        : new Date()

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
        where: {
          assignedToId: { not: null },
          date: { gte: startOfDay(target), lte: endOfDay(target) },
        },
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          lat: true,
          lng: true,
          timeSlot: true,
          status: true,
          assignedTo: { select: { id: true } },
          operator: true,
          date: true,
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
          lat: number | null
          lng: number | null
          timeSlot: TimeSlot
          status: OrderStatus
          operator: string
          date: Date
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
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          status: data.status,
          assignedToId: key === 'unassigned' ? undefined : key,
          operator: data.operator,
          date: data.date,
        })
      }

      assigned.forEach((o) => push(o.assignedTo!.id ?? 'unassigned', o))
      return Object.values(byTech)
    }),

  getRealizedOrders: loggedInEveryone
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(30),
        sortField: z.enum(['date', 'status']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        assignedToId: z.string().optional(),
        type: z.nativeEnum(OrderType).optional(),
        status: z.nativeEnum(OrderStatus).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.OrderWhereInput = {
        status: { in: [OrderStatus.COMPLETED, OrderStatus.NOT_COMPLETED] },
      }

      if (input.assignedToId) filters.assignedToId = input.assignedToId
      if (input.type) filters.type = input.type
      if (input.status) filters.status = input.status

      if (input.searchTerm && input.searchTerm.trim() !== '') {
        const q = input.searchTerm.trim()
        filters.OR = [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { street: { contains: q, mode: 'insensitive' } },
        ]
      }

      const orders = await ctx.prisma.order.findMany({
        where: filters,
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      })

      const totalOrders = await ctx.prisma.order.count({ where: filters })
      return { orders, totalOrders }
    }),

  /** Returns realized (completed or not completed) orders assigned to the logged-in technician. */
  getTechnicianRealizedOrders: technicianOnly
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(30),
        sortField: z.enum(['date', 'status']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        type: z.nativeEnum(OrderType).optional(),
        status: z.nativeEnum(OrderStatus).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const technicianId = ctx.user?.id

      const filters: Prisma.OrderWhereInput = {
        assignedToId: technicianId,
        status: { in: [OrderStatus.COMPLETED, OrderStatus.NOT_COMPLETED] },
      }

      if (input.type) filters.type = input.type
      if (input.status) filters.status = input.status

      // 🔍 Search by number, city or street
      if (input.searchTerm && input.searchTerm.trim() !== '') {
        const q = input.searchTerm.trim()
        filters.OR = [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { street: { contains: q, mode: 'insensitive' } },
        ]
      }

      const orders = await ctx.prisma.order.findMany({
        where: filters,
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
      })

      const totalOrders = await ctx.prisma.order.count({ where: filters })
      return { orders, totalOrders }
    }),

  /** Unassigned orders for planner drag-&-drop (with polite geocoding + fallbacks) */
  getUnassignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const target = input?.date ? parseISO(input.date) : null
      const where: Prisma.OrderWhereInput = { assignedToId: null }
      if (target) {
        where.date = { gte: startOfDay(target), lte: endOfDay(target) }
      }

      const rows = await ctx.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          operator: true,
          timeSlot: true,
          status: true,
          postalCode: true,
          date: true,
        },
        orderBy: { timeSlot: 'asc' },
        take: 300,
      })

      // Nothing to do if no rows
      if (rows.length === 0) return []

      /* ---------------- helpers ---------------- */

      /** Accept only valid PL postal codes and ignore placeholders like "00-000". */
      const isUsablePostalCode = (pc?: string | null): boolean => {
        if (!pc) return false
        const trimmed = pc.trim()
        // Strict PL format NN-NNN
        if (!/^\d{2}-\d{3}$/.test(trimmed)) return false
        // Treat "00-000" as a placeholder (do not use for geocoding)
        if (trimmed === '00-000') return false
        return true
      }

      /** Build address variants for robust geocoding when postal code is missing/placeholder. */
      const buildAddressVariants = (r: (typeof rows)[number]): string[] => {
        const street = cleanStreetName(r.street)
        const city = (r.city ?? '').trim()
        const pc = isUsablePostalCode(r.postalCode)
          ? r.postalCode!.trim()
          : null

        const variants: string[] = []
        if (street && city && pc)
          variants.push(`${street}, ${pc}, ${city}, Polska`)
        if (street && city) variants.push(`${street}, ${city}, Polska`)
        if (city) variants.push(`${city}, Polska`)
        return variants
      }

      /** Try multiple address variants until one returns coordinates. */
      const geocodeWithFallback = async (variants: string[]) => {
        for (const v of variants) {
          const coords = await getCoordinatesFromAddress(v)
          if (coords) return coords
        }
        return null
      }

      /* --------------- main --------------- */

      const MAX_GEOCODES = 20
      const CONCURRENCY = 3 // tuned for Nominatim politeness + UX

      const head = rows.slice(0, MAX_GEOCODES)
      const tail = rows.slice(MAX_GEOCODES)

      const enrich = async (r: (typeof rows)[number]) => {
        const variants = buildAddressVariants(r)
        const coords = await geocodeWithFallback(variants)
        return { ...r, lat: coords?.lat ?? null, lng: coords?.lng ?? null }
      }

      try {
        // Run initial chunk with limited concurrency; never throw the whole route on single failure
        const headResults = await mapWithConcurrency(
          head,
          CONCURRENCY,
          async (row) => {
            try {
              return await enrich(row)
            } catch {
              // Be fail-safe: fallback without coords
              return { ...row, lat: null, lng: null }
            }
          }
        )

        const normalizedTail = tail.map((r) => ({ ...r, lat: null, lng: null }))
        return [...headResults, ...normalizedTail]
      } catch (e) {
        // HARD FALLBACK: if geocoding infra is down, still return orders without coordinates
        console.error(
          'Geocoding batch failed — returning rows without coordinates',
          e
        )
        return rows.map((r) => ({ ...r, lat: null, lng: null }))
      }
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

  /** Company success trend for dashboard chart (day/month/year granularity) */
  getCompanySuccessOverTime: adminOnly
    .input(
      z.object({
        date: z.date(),
        range: z.enum(['day', 'month', 'year']),
      })
    )
    .query(async ({ input, ctx }) => {
      const { date, range } = input
      const prisma = ctx.prisma

      if (!date) throw new TRPCError({ code: 'BAD_REQUEST' })

      // Decide time window based on the selected range
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
        dateFrom = new Date(year - 4, 0, 1)
        dateTo = new Date(year, 11, 31, 23, 59, 59)
      }

      const orders = await prisma.order.findMany({
        where: {
          date: { gte: dateFrom, lte: dateTo },
        },
        select: { date: true, status: true },
      })

      // Aggregate to success rate per bucket
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
  getNextOutageOrderNumber: loggedInEveryone.query(async () => {
    return await getNextLineOrderNumber()
  }),
  /** Returns all active (unrealized) orders assigned to the logged-in technician. */
  getTechnicianActiveOrders: technicianOnly.query(async ({ ctx }) => {
    const technicianId = ctx.user?.id

    const filters: Prisma.OrderWhereInput = {
      assignedToId: technicianId,
      status: { in: ['PENDING', 'ASSIGNED'] },
    }

    const orders = await ctx.prisma.order.findMany({
      where: filters,
      orderBy: [{ date: 'asc' }, { timeSlot: 'asc' }],
      select: {
        id: true,
        orderNumber: true,
        type: true,
        city: true,
        street: true,
        date: true,
        timeSlot: true,
        operator: true,
        status: true,
        assignedTo: { select: { id: true, name: true } },
        notes: true,
      },
    })

    return orders
  }),
})
