// src/server/routers/order/queries.ts
import { router } from '@/server/trpc'

import { sortedTimeSlotsByHour } from '@/lib/constants'
import {
  adminCoordOrWarehouse,
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import type { TechnicianAssignment } from '@/types'
import { getNextLineOrderNumber } from '@/utils/nextLineOrderNumber'
import {
  getCoordinatesFromAddress,
  normalizeAddressForGeocodeCache,
} from '@/utils/geocode'
import { isTechnician } from '@/utils/roleHelpers/roleCheck'
import {
  OrderStatus,
  OrderType,
  Prisma,
  TimeSlot,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import { z } from 'zod'
import { getUserOrThrow } from '../_helpers/getUserOrThrow'

type MissingGeoOrder = {
  id: string
  city: string
  street: string
  postalCode: string | null
}

type GeoBackfillPrisma = {
  order: {
    findMany: (args: unknown) => Promise<MissingGeoOrder[]>
    updateMany: (args: unknown) => Promise<{ count: number }>
  }
}

const GEO_BACKFILL_SWEEP_INTERVAL_MS = 2 * 60 * 1000
const GEO_BACKFILL_BATCH_SIZE = 120
const GEO_INLINE_VIEW_LIMIT = 24
const GEO_INLINE_CONCURRENCY = 4

const geoBackfillState: {
  running: boolean
  lastSweepAt: number
  pendingIds: Set<string>
} = {
  running: false,
  lastSweepAt: 0,
  pendingIds: new Set(),
}

const buildAddressVariants = (o: {
  city: string
  street: string
  postalCode?: string | null
}) => {
  const street = o.street.trim()
  const city = o.city.trim()
  const postalCode = o.postalCode?.trim()

  return [
    postalCode
      ? `${street}, ${postalCode} ${city}, Polska`
      : `${street}, ${city}, Polska`,
    `${street}, ${city}, Polska`,
    `${city}, Polska`,
  ]
}

const buildStreetLevelKey = (o: { city: string; street: string }) =>
  normalizeAddressForGeocodeCache(`${o.street}, ${o.city}, Polska`)

const geocodeByVariants = async (o: {
  city: string
  street: string
  postalCode?: string | null
}) => {
  for (const candidate of buildAddressVariants(o)) {
    const coords = await getCoordinatesFromAddress(candidate)
    if (coords) return coords
  }
  return null
}

type PlannerGeoRow = {
  id: string
  city: string
  street: string
  postalCode: string | null
  lat: number | null
  lng: number | null
}

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> => {
  if (items.length === 0) return []
  const out = new Array<R>(items.length)
  let index = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const i = index++
        if (i >= items.length) return
        out[i] = await mapper(items[i])
      }
    }
  )
  await Promise.all(workers)
  return out
}

const geocodeVisibleRowsNow = async (
  prisma: GeoBackfillPrisma,
  rows: PlannerGeoRow[],
  limit = GEO_INLINE_VIEW_LIMIT
): Promise<Map<string, { lat: number; lng: number }>> => {
  const missing = rows
    .filter((r) => r.lat === null || r.lng === null)
    .slice(0, limit)
  if (missing.length === 0) return new Map()

  const grouped = new Map<string, PlannerGeoRow[]>()
  for (const row of missing) {
    const key = buildStreetLevelKey(row)
    const group = grouped.get(key)
    if (group) group.push(row)
    else grouped.set(key, [row])
  }

  const resolved = new Map<string, { lat: number; lng: number }>()
  await mapWithConcurrency(
    Array.from(grouped.values()),
    GEO_INLINE_CONCURRENCY,
    async (group) => {
      const coords = await geocodeByVariants(group[0])
      if (!coords) return
      const ids = group.map((g) => g.id)
      await prisma.order.updateMany({
        where: { id: { in: ids } },
        data: { lat: coords.lat, lng: coords.lng },
      })
      ids.forEach((id) => resolved.set(id, coords))
    }
  )

  return resolved
}

const runGeoBackfill = async (prisma: GeoBackfillPrisma) => {
  if (geoBackfillState.running) return

  geoBackfillState.running = true
  try {
    let candidates: MissingGeoOrder[] = []

    if (geoBackfillState.pendingIds.size > 0) {
      const pendingIds = Array.from(geoBackfillState.pendingIds).slice(
        0,
        GEO_BACKFILL_BATCH_SIZE
      )
      pendingIds.forEach((id) => geoBackfillState.pendingIds.delete(id))

      candidates = await prisma.order.findMany({
        where: {
          id: { in: pendingIds },
          OR: [{ lat: null }, { lng: null }],
        },
        select: {
          id: true,
          city: true,
          street: true,
          postalCode: true,
        },
      })
    }

    if (
      candidates.length === 0 &&
      Date.now() - geoBackfillState.lastSweepAt >= GEO_BACKFILL_SWEEP_INTERVAL_MS
    ) {
      geoBackfillState.lastSweepAt = Date.now()
      candidates = await prisma.order.findMany({
        where: { OR: [{ lat: null }, { lng: null }] },
        select: {
          id: true,
          city: true,
          street: true,
          postalCode: true,
        },
        orderBy: { createdAt: 'desc' },
        take: GEO_BACKFILL_BATCH_SIZE,
      })
    }

    if (candidates.length === 0) return

    const groups = new Map<string, MissingGeoOrder[]>()
    for (const row of candidates) {
      if (!row.city?.trim() || !row.street?.trim()) continue
      const key = buildStreetLevelKey(row)
      const list = groups.get(key)
      if (list) list.push(row)
      else groups.set(key, [row])
    }

    for (const groupRows of Array.from(groups.values())) {
      const coords = await geocodeByVariants(groupRows[0])
      if (!coords) continue

      await prisma.order.updateMany({
        where: { id: { in: groupRows.map((r) => r.id) } },
        data: { lat: coords.lat, lng: coords.lng },
      })
    }
  } catch (error) {
    console.error('Geo backfill failed:', error)
  } finally {
    geoBackfillState.running = false
    if (geoBackfillState.pendingIds.size > 0) {
      setTimeout(() => {
        void runGeoBackfill(prisma)
      }, 50)
    }
  }
}

const triggerGeoBackfill = (
  prisma: GeoBackfillPrisma,
  missingFromView: MissingGeoOrder[]
) => {
  missingFromView.forEach((row) => geoBackfillState.pendingIds.add(row.id))
  void runGeoBackfill(prisma)
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
          assignedEquipment: {
            include: {
              warehouse: {
                include: {
                  history: true,
                },
              },
            },
          },
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
          type: OrderType.INSTALATION,
          date: { gte: startOfDay(target), lte: endOfDay(target) },
        },
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          postalCode: true,
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

      const visibleResolved = await geocodeVisibleRowsNow(ctx.prisma, assigned)
      assigned.forEach((o) => {
        const coords = visibleResolved.get(o.id)
        if (coords) {
          o.lat = coords.lat
          o.lng = coords.lng
        }
      })

      const missingFromView = assigned
        .filter((o) => o.lat === null || o.lng === null)
        .map((o) => ({
          id: o.id,
          city: o.city,
          street: o.street,
          postalCode: o.postalCode,
        }))
      triggerGeoBackfill(ctx.prisma, missingFromView)

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

  /** Unassigned orders for planner drag-&-drop */
  getUnassignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const target = input?.date ? parseISO(input.date) : null
      const where: Prisma.OrderWhereInput = {
        assignedToId: null,
        type: OrderType.INSTALATION,
      }
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
          postalCode: true,
          lat: true,
          lng: true,
          operator: true,
          timeSlot: true,
          status: true,
          date: true,
        },
        orderBy: { timeSlot: 'asc' },
        take: 300,
      })

      const visibleResolved = await geocodeVisibleRowsNow(ctx.prisma, rows)
      rows.forEach((r) => {
        const coords = visibleResolved.get(r.id)
        if (coords) {
          r.lat = coords.lat
          r.lng = coords.lng
        }
      })

      const missingFromView = rows
        .filter((r) => r.lat === null || r.lng === null)
        .map((r) => ({
          id: r.id,
          city: r.city,
          street: r.street,
          postalCode: r.postalCode,
        }))
      triggerGeoBackfill(ctx.prisma, missingFromView)

      return rows.map(({ postalCode: _postalCode, ...r }) => ({
        ...r,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
      }))
    }),

  /** Fetches ALL in progress orders from all technitians and from all the time */
  getAllInProgress: adminOrCoord
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        orderType: z.nativeEnum(OrderType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, orderType } = input

      return ctx.prisma.order.findMany({
        where: {
          status: 'ASSIGNED',

          /** Optional date range filter */
          ...(dateFrom && dateTo
            ? {
                date: {
                  gte: dateFrom,
                  lte: dateTo,
                },
              }
            : {}),

          /** Optional order type filter */
          ...(orderType ? { type: orderType } : {}),
        },

        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          date: true,
          operator: true,
          clientId: true,
          status: true,
          timeSlot: true,

          /** Assigned technician (basic info only) */
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },

        orderBy: {
          date: 'asc',
        },
      })
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
