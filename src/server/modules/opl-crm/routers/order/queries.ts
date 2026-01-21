// src/server/modules/opl-crm/routers/order/queries.ts
import { router } from '@/server/trpc'
import { hasAnyRole, isTechnician } from './../../../../../utils/auth/role'

import { sortedOplTimeSlotsByHour } from '@/app/(modules)/opl-crm/lib/constants'
import {
  adminCoordOrWarehouse,
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import {
  OplOrderAttemptVM,
  OplPreviousOrderPrismaResult,
  OplTechnicianAssignment,
} from '@/types/opl-crm'
import { cleanStreetName, getCoordinatesFromAddress } from '@/utils/geocode'
import { getNextLineOrderNumber } from '@/utils/orders/nextLineOrderNumber'
import {
  OplOrderStatus,
  OplOrderType,
  OplTimeSlot,
  Prisma,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { endOfDay, parseISO, startOfDay } from 'date-fns'
import { z } from 'zod'
import { mapOplUserToVM } from '../../helpers/mappers/mapOplUserToVM'
import {
  oplUserBasicSelect,
  oplUserSlimSelect,
  oplUserWithCoreBasicSelect,
} from '../../helpers/selects'
import { oplProcedure } from '../trpc'

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
  getOrders: oplProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(30),
        sortField: z.enum(['createdAt', 'date', 'status']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        status: z.nativeEnum(OplOrderStatus).optional(),
        assignedToId: z.string().optional(),
        type: z.nativeEnum(OplOrderType).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.OplOrderWhereInput = {}

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

      const orders = await ctx.prisma.oplOrder.findMany({
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

      const totalOrders = await ctx.prisma.oplOrder.count({ where: filters })
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
      const order = await prisma.oplOrder.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: {
            select: oplUserWithCoreBasicSelect,
          },
          history: {
            include: {
              changedBy: { select: oplUserWithCoreBasicSelect },
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
              assignedTo: { select: oplUserWithCoreBasicSelect },
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
      ): Promise<OplOrderAttemptVM[]> {
        const results: OplOrderAttemptVM[] = []

        let currentId: string | null = orderId

        while (currentId) {
          const prev: OplPreviousOrderPrismaResult | null =
            await prisma.oplOrder.findUnique({
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
                assignedTo: { select: oplUserWithCoreBasicSelect },
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
            assignedTo: mapOplUserToVM(prev.assignedTo),
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
          assignedTo: mapOplUserToVM(order.assignedTo),
        },
      ]

      /* ------------------------------------------------------------
       * 4️⃣ Merge all orderHistory entries from all attempts
       * ---------------------------------------------------------- */
      const allOrderIds = [order.id, ...previousChain.map((o) => o.id)]

      const mergedHistory = await prisma.oplOrderHistory.findMany({
        where: { orderId: { in: allOrderIds } },
        include: { changedBy: { select: oplUserBasicSelect } },
        orderBy: { changeDate: 'desc' },
      })

      /* ------------------------------------------------------------
       * 5️⃣ Fetch full client history (all orders by clientId)
       * ---------------------------------------------------------- */
      let clientHistory: {
        id: string
        orderNumber: string
        date: Date
        status: OplOrderStatus
        type: OplOrderType
        city: string
        street: string
        attemptNumber: number
      }[] = []

      if (order.clientId) {
        const ordersByClient = await prisma.oplOrder.findMany({
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
    .query(async ({ input, ctx }): Promise<OplTechnicianAssignment[]> => {
      const target = input?.date
        ? new Date(`${input.date}T00:00:00`)
        : new Date()

      const techs = await ctx.prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      const byTech: Record<string, OplTechnicianAssignment> = {}
      techs.forEach((t) => {
        byTech[t.id] = { technicianId: t.id, technicianName: t.name, slots: [] }
      })

      const assigned = await ctx.prisma.oplOrder.findMany({
        where: {
          assignedToId: { not: null },
          type: OplOrderType.INSTALLATION,
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
          assignedTo: { select: oplUserBasicSelect },
          operator: true,
          date: true,
        },
        orderBy: { timeSlot: 'asc' },
      })

      // Auto-geocode assigned orders missing coordinates
      for (const o of assigned) {
        if (o.lat === null || o.lng === null) {
          const address = `${o.street}, ${o.city}, Polska`
          const coords = await getCoordinatesFromAddress(address)

          if (coords) {
            o.lat = coords.lat
            o.lng = coords.lng

            // Update DB so next time the order already has coords
            await ctx.prisma.oplOrder.update({
              where: { id: o.id },
              data: { lat: coords.lat, lng: coords.lng },
            })
          }
        }
      }

      const push = (
        key: string,
        data: {
          id: string
          orderNumber: string
          city: string
          street: string
          lat: number | null
          lng: number | null
          timeSlot: OplTimeSlot
          status: OplOrderStatus
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
              sortedOplTimeSlotsByHour.indexOf(a.timeSlot) -
              sortedOplTimeSlotsByHour.indexOf(b.timeSlot)
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
        type: z.nativeEnum(OplOrderType).optional(),
        status: z.nativeEnum(OplOrderStatus).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.OplOrderWhereInput = {
        status: {
          in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
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

      const orders = await ctx.prisma.oplOrder.findMany({
        where: filters,
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignedTo: { select: oplUserBasicSelect },
        },
      })

      const totalOrders = await ctx.prisma.oplOrder.count({ where: filters })
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
        type: z.nativeEnum(OplOrderType).optional(),
        status: z.nativeEnum(OplOrderStatus).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const technicianId = ctx.user?.id

      const filters: Prisma.OplOrderWhereInput = {
        assignedToId: technicianId,
        status: {
          in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
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

      const orders = await ctx.prisma.oplOrder.findMany({
        where: filters,
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignedTo: { select: oplUserBasicSelect },
        },
      })

      const totalOrders = await ctx.prisma.oplOrder.count({ where: filters })
      return { orders, totalOrders }
    }),

  /** Unassigned orders for planner drag-&-drop (with polite geocoding + fallbacks) */
  getUnassignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const target = input?.date ? parseISO(input.date) : null
      const where: Prisma.OplOrderWhereInput = {
        assignedToId: null,
        type: OplOrderType.INSTALLATION,
      }
      if (target) {
        where.date = { gte: startOfDay(target), lte: endOfDay(target) }
      }

      const rows = await ctx.prisma.oplOrder.findMany({
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

  /** Fetches ALL in progress orders from all technitians and from all the time */
  getAllInProgress: adminOrCoord
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        orderType: z.nativeEnum(OplOrderType).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { dateFrom, dateTo, orderType } = input

      const orders = await ctx.prisma.oplOrder.findMany({
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
            select: oplUserSlimSelect,
          },
        },
        orderBy: {
          date: 'asc',
        },
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
      const o = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.orderId },
        include: {
          assignedTo: { select: oplUserBasicSelect },
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

    const filters: Prisma.OplOrderWhereInput = {
      assignedToId: technicianId,
      status: { in: ['PENDING', 'ASSIGNED'] },
    }

    const orders = await ctx.prisma.oplOrder.findMany({
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
        assignedTo: { select: oplUserBasicSelect },
        notes: true,
      },
    })

    return orders
  }),
})
