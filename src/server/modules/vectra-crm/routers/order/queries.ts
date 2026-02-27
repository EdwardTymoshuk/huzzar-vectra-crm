import { hasAnyRole, isTechnician } from './../../../../../utils/auth/role'
// src/server/routers/order/queries.ts
import { router } from '@/server/trpc'

import { sortedTimeSlotsByHour } from '@/app/(modules)/vectra-crm/lib/constants'
import {
  adminCoordOrWarehouse,
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import {
  VectraOrderAttemptVM,
  VectraPreviousOrderPrismaResult,
  VectraTechnicianAssignment,
} from '@/types/vectra-crm'
import {
  cleanStreetName,
  getCoordinatesFromAddress,
  normalizeAddressForGeocodeCache,
} from '@/utils/geocode'
import { getNextLineOrderNumber } from '@/utils/orders/nextLineOrderNumber'
import {
  Prisma,
  PrismaClient,
  VectraOrderStatus,
  VectraOrderType,
  VectraTimeSlot,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import { z } from 'zod'
import { mapVectraUserToVM } from '../../helpers/mappers/mapVectraUserToVM'
import {
  vectraUserBasicSelect,
  vectraUserSlimSelect,
  vectraUserWithCoreBasicSelect,
} from '../../helpers/selects'

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

type MissingGeoOrder = {
  id: string
  city: string
  street: string
  postalCode: string | null
}

type GeoBackfillPrisma = {
  vectraOrder: Pick<PrismaClient['vectraOrder'], 'findMany' | 'updateMany'>
}

const GEO_BACKFILL_SWEEP_INTERVAL_MS = 2 * 60 * 1000
const GEO_BACKFILL_BATCH_SIZE = 120
const GEO_INLINE_VIEW_LIMIT = 24
const GEO_INLINE_CONCURRENCY = 4
const GEO_INLINE_TOTAL_BUDGET_MS = 2000
const GEO_INLINE_SINGLE_TIMEOUT_MS = 900

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
  const street = cleanStreetName(o.street).trim()
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

const geocodeByVariantsFast = async (o: {
  city: string
  street: string
  postalCode?: string | null
}) => {
  for (const candidate of buildAddressVariants(o)) {
    const coords = await getCoordinatesFromAddress(candidate, {
      timeoutMs: GEO_INLINE_SINGLE_TIMEOUT_MS,
      maxRetries: 0,
    })
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
  const startedAt = Date.now()
  await mapWithConcurrency(
    Array.from(grouped.values()),
    GEO_INLINE_CONCURRENCY,
    async (group) => {
      if (Date.now() - startedAt > GEO_INLINE_TOTAL_BUDGET_MS) return
      const coords = await geocodeByVariantsFast(group[0])
      if (!coords) return
      const ids = group.map((g) => g.id)
      await prisma.vectraOrder.updateMany({
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

      candidates = await prisma.vectraOrder.findMany({
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
      candidates = await prisma.vectraOrder.findMany({
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

      await prisma.vectraOrder.updateMany({
        where: { id: { in: groupRows.map((r) => r.id) } },
        data: { lat: coords.lat, lng: coords.lng },
      })
    }
  } catch (error) {
    console.error('Vectra geo backfill failed:', error)
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
        status: z.nativeEnum(VectraOrderStatus).optional(),
        assignedToId: z.string().optional(),
        type: z.nativeEnum(VectraOrderType).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.VectraOrderWhereInput = {}

      if (!ctx.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
        })
      }

      const { role, id: userId } = ctx.user

      if (isTechnician(role)) {
        filters.assignedToId = userId
      }

      if (
        hasAnyRole(role, ['ADMIN', 'COORDINATOR']) &&
        input.assignedToId !== undefined
      ) {
        filters.assignedToId =
          input.assignedToId === 'unassigned' ? null : input.assignedToId
      }

      if (input.status) filters.status = input.status
      if (input.type) filters.type = input.type

      if (input.searchTerm?.trim()) {
        const q = input.searchTerm.trim()
        filters.OR = [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { street: { contains: q, mode: 'insensitive' } },
        ]
      }

      const orders = await ctx.prisma.vectraOrder.findMany({
        where: filters,
        orderBy:
          input.sortField === 'date'
            ? [{ date: input.sortOrder }, { timeSlot: 'asc' }]
            : { [input.sortField]: input.sortOrder },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          transferTo: { include: { user: true } },
          assignedTo: { include: { user: true } },
        },
      })

      const totalOrders = await ctx.prisma.vectraOrder.count({ where: filters })
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
      const order = await prisma.vectraOrder.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: {
            select: vectraUserWithCoreBasicSelect,
          },
          history: {
            include: {
              changedBy: { select: vectraUserWithCoreBasicSelect },
            },
            orderBy: { changeDate: 'desc' },
          },
          settlementEntries: { include: { rate: true } },
          usedMaterials: { include: { material: true } },
          assignedEquipment: {
            include: {
              warehouse: {
                include: { history: true },
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
              assignedTo: { select: vectraUserWithCoreBasicSelect },
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
      async function fetchAllPreviousOrders(
        orderId: string
      ): Promise<VectraOrderAttemptVM[]> {
        const results: VectraOrderAttemptVM[] = []

        let currentId: string | null = orderId

        while (currentId) {
          const prev: VectraPreviousOrderPrismaResult | null =
            await prisma.vectraOrder.findUnique({
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
                assignedTo: { select: vectraUserWithCoreBasicSelect },
              },
            })

          if (!prev) break
          results.push({
            id: prev.id,
            attemptNumber: prev.attemptNumber,
            date: prev.date,
            createdAt: prev.createdAt,
            completedAt: prev.completedAt,
            closedAt: prev.closedAt,
            status: prev.status,
            failureReason: prev.failureReason,
            notes: prev.notes,
            previousOrderId: prev.previousOrderId,
            assignedTo: mapVectraUserToVM(prev.assignedTo),
          })

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
          assignedTo: mapVectraUserToVM(order.assignedTo),
        },
      ]

      /* ------------------------------------------------------------
       * 4️⃣ Merge all orderHistory entries from all attempts
       * ---------------------------------------------------------- */
      const allOrderIds = [order.id, ...previousChain.map((o) => o.id)]

      const mergedHistory = await prisma.vectraOrderHistory.findMany({
        where: { orderId: { in: allOrderIds } },
        include: { changedBy: { select: vectraUserBasicSelect } },
        orderBy: { changeDate: 'desc' },
      })

      /* ------------------------------------------------------------
       * 5️⃣ Fetch full client history (all orders by clientId)
       * ---------------------------------------------------------- */
      let clientHistory: {
        id: string
        orderNumber: string
        date: Date
        status: VectraOrderStatus
        type: VectraOrderType
        city: string
        street: string
        attemptNumber: number
      }[] = []

      if (order.clientId) {
        const ordersByClient = await prisma.vectraOrder.findMany({
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
    .query(async ({ input, ctx }): Promise<VectraTechnicianAssignment[]> => {
      const target = input?.date
        ? new Date(`${input.date}T00:00:00`)
        : new Date()

      const techs = await ctx.prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          status: 'ACTIVE',
          modules: {
            some: {
              module: { code: 'VECTRA' },
            },
          },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      const byTech: Record<string, VectraTechnicianAssignment> = {}
      techs.forEach((t) => {
        byTech[t.id] = { technicianId: t.id, technicianName: t.name, slots: [] }
      })

      const assigned = await ctx.prisma.vectraOrder.findMany({
        where: {
          assignedToId: { not: null },
          type: VectraOrderType.INSTALLATION,
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
          assignedTo: { select: vectraUserBasicSelect },
          operator: true,
          date: true,
        },
        orderBy: { timeSlot: 'asc' },
      })

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

      const push = (
        key: string,
        data: {
          id: string
          orderNumber: string
          city: string
          street: string
          lat: number | null
          lng: number | null
          timeSlot: VectraTimeSlot
          status: VectraOrderStatus
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

      assigned.forEach((o) => push(o.assignedTo?.user.id ?? 'unassigned', o))
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
        type: z.nativeEnum(VectraOrderType).optional(),
        status: z.nativeEnum(VectraOrderStatus).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.VectraOrderWhereInput = {
        status: {
          in: [VectraOrderStatus.COMPLETED, VectraOrderStatus.NOT_COMPLETED],
        },
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

      const orders = await ctx.prisma.vectraOrder.findMany({
        where: filters,
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignedTo: { select: vectraUserBasicSelect },
        },
      })

      const totalOrders = await ctx.prisma.vectraOrder.count({ where: filters })
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
        type: z.nativeEnum(VectraOrderType).optional(),
        status: z.nativeEnum(VectraOrderStatus).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const technicianId = ctx.user?.id

      const filters: Prisma.VectraOrderWhereInput = {
        assignedToId: technicianId,
        status: {
          in: [VectraOrderStatus.COMPLETED, VectraOrderStatus.NOT_COMPLETED],
        },
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

      const orders = await ctx.prisma.vectraOrder.findMany({
        where: filters,
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignedTo: { select: vectraUserBasicSelect },
        },
      })

      const totalOrders = await ctx.prisma.vectraOrder.count({ where: filters })
      return { orders, totalOrders }
    }),

  /** Unassigned orders for planner drag-&-drop */
  getUnassignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const target = input?.date ? parseISO(input.date) : null
      const where: Prisma.VectraOrderWhereInput = {
        assignedToId: null,
        type: VectraOrderType.INSTALLATION,
      }
      if (target) {
        where.date = { gte: startOfDay(target), lte: endOfDay(target) }
      }

      const rows = await ctx.prisma.vectraOrder.findMany({
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
        operator: r.operator?.trim() || '-',
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
        orderType: z.nativeEnum(VectraOrderType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, orderType } = input

      const orders = await ctx.prisma.vectraOrder.findMany({
        where: {
          status: 'ASSIGNED',
          ...(dateFrom && dateTo
            ? {
                date: {
                  gte: dateFrom,
                  lte: dateTo,
                },
              }
            : {}),
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
          assignedTo: {
            select: vectraUserSlimSelect,
          },
        },
        orderBy: [{ date: 'desc' }, { timeSlot: 'desc' }],
      })

      return orders.map((o) => ({
        ...o,
        assignedTo: o.assignedTo
          ? {
              id: o.assignedTo.user.id,
              name: o.assignedTo.user.name,
            }
          : null,
      }))
    }),

  /** Accounting-level order breakdown */
  getOrderDetails: adminOrCoord
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const o = await ctx.prisma.vectraOrder.findUnique({
        where: { id: input.orderId },
        include: {
          assignedTo: { select: vectraUserBasicSelect },
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
        technician: o.assignedTo?.user.name ?? 'Nieznany',
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

    const filters: Prisma.VectraOrderWhereInput = {
      assignedToId: technicianId,
      status: { in: ['PENDING', 'ASSIGNED'] },
    }

    const orders = await ctx.prisma.vectraOrder.findMany({
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
        assignedTo: { select: vectraUserBasicSelect },
        notes: true,
      },
    })

    return orders
  }),
})
