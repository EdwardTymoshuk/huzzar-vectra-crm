// src/server/modules/opl-crm/routers/order/queries.ts
import { router } from '@/server/trpc'
import { hasAnyRole, isTechnician } from './../../../../../utils/auth/role'

import { sortedOplTimeSlotsByHour } from '@/app/(modules)/opl-crm/lib/constants'
import { requireOplModule } from '@/server/middleware/oplMiddleware'
import {
  adminCoordOrWarehouse,
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import { OplTechnicianAssignment } from '@/types/opl-crm'
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
import { mapOplOrderToListVM } from '../../helpers/mappers/mapOplOrderToListVM'
import {
  oplUserBasicSelect,
  oplUserSlimSelect,
  oplUserWithCoreBasicSelect,
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

/* -----------------------------------------------------------
 * queriesRouter
 * ----------------------------------------------------------- */
export const queriesRouter = router({
  /** Paginated order list with filters and sort */
  getOrders: loggedInEveryone
    .use(requireOplModule)
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(30),
        sortField: z.enum(['createdAt', 'date', 'status']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        status: z.nativeEnum(OplOrderStatus).optional(),
        technicianId: z.string().optional(),
        type: z.nativeEnum(OplOrderType).optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const { role, id: userId } = ctx.user

      const filters: Prisma.OplOrderWhereInput = {}

      /* -------------------------------------------
       * Technician access: only orders assigned to him
       * ------------------------------------------- */
      if (isTechnician(role)) {
        filters.assignments = {
          some: {
            technicianId: userId,
          },
        }
      }

      /* -------------------------------------------
       * Admin / Coordinator filtering by technician
       * ------------------------------------------- */
      if (
        hasAnyRole(role, ['ADMIN', 'COORDINATOR']) &&
        input.technicianId !== undefined
      ) {
        if (input.technicianId === 'unassigned') {
          // Orders WITHOUT any technician assigned
          filters.assignments = {
            none: {},
          }
        } else {
          filters.assignments = {
            some: {
              technicianId: input.technicianId,
            },
          }
        }
      }

      if (input.status) filters.status = input.status
      if (input.type) filters.type = input.type

      /* -------------------------------------------
       * Text search
       * ------------------------------------------- */
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
          assignments: {
            include: {
              technician: {
                select: oplUserSlimSelect,
              },
            },
          },
          transferTo: {
            include: {
              user: true,
            },
          },
        },
      })

      const totalOrders = await ctx.prisma.oplOrder.count({
        where: filters,
      })

      return {
        orders: orders.map(mapOplOrderToListVM),
        totalOrders,
      }
    }),

  /** ✅ Full order details (with complete attempt chain + full client history) */
  getOrderById: loggedInEveryone
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.id },
        include: {
          /** Current technician assignments */
          assignments: {
            include: {
              technician: {
                select: oplUserWithCoreBasicSelect,
              },
            },
          },

          /** Attempt chain */
          previousOrder: {
            include: {
              assignments: {
                include: {
                  technician: {
                    select: oplUserWithCoreBasicSelect,
                  },
                },
              },
            },
          },

          attempts: {
            orderBy: { attemptNumber: 'asc' },
            include: {
              assignments: {
                include: {
                  technician: {
                    select: oplUserWithCoreBasicSelect,
                  },
                },
              },
            },
          },

          /** Wizard billing state (NOT source of truth) */
          billingConfig: {
            include: {
              addons: true,
            },
          },

          /** Final settlement lines (SOURCE OF TRUTH) */
          settlementEntries: {
            include: {
              rate: true,
            },
          },

          /** Required equipment definitions */
          equipmentRequirements: {
            include: {
              deviceDefinition: true,
            },
          },

          /** Assigned / collected equipment */
          assignedEquipment: {
            include: {
              warehouse: true,
            },
          },

          /** Used materials */
          usedMaterials: {
            include: {
              material: true,
            },
          },

          /** Audit trail */
          history: {
            orderBy: { changeDate: 'desc' },
            include: {
              changedBy: {
                select: oplUserWithCoreBasicSelect,
              },
            },
          },
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      return order
    }),

  /** Orders grouped by technician and time-slot for planning board */
  getAssignedOrders: adminCoordOrWarehouse
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }): Promise<OplTechnicianAssignment[]> => {
      const target = input?.date
        ? new Date(`${input.date}T00:00:00`)
        : new Date()

      /* -------------------------------------------
       * 1️⃣ Load technicians
       * ------------------------------------------- */
      const techs = await ctx.prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      const byTech: Record<string, OplTechnicianAssignment> = {}

      techs.forEach((t) => {
        byTech[t.id] = {
          technicianId: t.id,
          technicianName: t.name,
          slots: [],
        }
      })

      /* -------------------------------------------
       * 2️⃣ Load assigned orders (ASSIGNMENTS!)
       * ------------------------------------------- */
      const orders = await ctx.prisma.oplOrder.findMany({
        where: {
          type: OplOrderType.INSTALLATION,
          date: {
            gte: startOfDay(target),
            lte: endOfDay(target),
          },
          assignments: {
            some: {}, // 🔥 tylko z przypisaniami
          },
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
          operator: true,
          date: true,
          assignments: {
            select: {
              technicianId: true,
            },
          },
        },
        orderBy: { timeSlot: 'asc' },
      })

      /* -------------------------------------------
       * 3️⃣ Auto-geocoding (bez zmian)
       * ------------------------------------------- */
      for (const o of orders) {
        if (o.lat === null || o.lng === null) {
          const address = `${o.street}, ${o.city}, Polska`
          const coords = await getCoordinatesFromAddress(address)

          if (coords) {
            o.lat = coords.lat
            o.lng = coords.lng

            await ctx.prisma.oplOrder.update({
              where: { id: o.id },
              data: { lat: coords.lat, lng: coords.lng },
            })
          }
        }
      }

      /* -------------------------------------------
       * 4️⃣ Helper do wrzucania w sloty
       * ------------------------------------------- */
      const push = (
        technicianId: string,
        technicianName: string,
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
        if (!byTech[technicianId]) {
          byTech[technicianId] = {
            technicianId,
            technicianName,
            slots: [],
          }
        }

        let slot = byTech[technicianId].slots.find(
          (s) => s.timeSlot === data.timeSlot
        )

        if (!slot) {
          slot = { timeSlot: data.timeSlot, orders: [] }
          byTech[technicianId].slots.push(slot)
          byTech[technicianId].slots.sort(
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
          assignedToId: technicianId,
          operator: data.operator,
          date: data.date,
        })
      }

      /* -------------------------------------------
       * 5️⃣ Fan-out: jedno zlecenie → wielu techników
       * ------------------------------------------- */
      orders.forEach((o) => {
        o.assignments.forEach((a) => {
          const tech = techs.find((t) => t.id === a.technicianId)
          if (!tech) return

          push(tech.id, tech.name, o)
        })
      })

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

      if (input.assignedToId) {
        filters.assignments = {
          some: {
            technicianId: input.assignedToId,
          },
        }
      }
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
          assignments: {
            include: {
              technician: {
                select: oplUserSlimSelect,
              },
            },
          },
        },
      })

      const totalOrders = await ctx.prisma.oplOrder.count({ where: filters })
      return {
        orders: orders.map(mapOplOrderToListVM),
        totalOrders,
      }
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
      const technicianId = ctx.user!.id

      const filters: Prisma.OplOrderWhereInput = {
        status: {
          in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
        },
        assignments: {
          some: { technicianId },
        },
      }

      if (input.type) filters.type = input.type
      if (input.status) filters.status = input.status

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
        orderBy: input.sortField
          ? { [input.sortField]: input.sortOrder ?? 'asc' }
          : { date: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
          assignments: {
            include: {
              technician: {
                select: oplUserSlimSelect,
              },
            },
          },
        },
      })

      const totalOrders = await ctx.prisma.oplOrder.count({ where: filters })

      return {
        orders: orders.map(mapOplOrderToListVM),
        totalOrders,
      }
    }),

  /** Unassigned orders for planner drag-&-drop (with polite geocoding + fallbacks) */
  getUnassignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const target = input?.date ? parseISO(input.date) : null
      const where: Prisma.OplOrderWhereInput = {
        assignments: { none: {} },
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
          status: { in: [OplOrderStatus.PENDING, OplOrderStatus.ASSIGNED] },
          assignments: {
            some: {}, // ✅ MUSI mieć przypisanych techników
          },
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
          serviceId: true,
          status: true,
          timeSlot: true,
          assignments: {
            select: {
              technician: {
                select: oplUserSlimSelect,
              },
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      })

      return orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        city: o.city,
        street: o.street,
        date: o.date,
        operator: o.operator,
        serviceId: o.serviceId,
        status: o.status,
        timeSlot: o.timeSlot,
        technicians: o.assignments.map((a) => ({
          id: a.technician.user.id,
          name: a.technician.user.name,
        })),
      }))
    }),

  /** Accounting-level order breakdown */
  getOrderDetails: adminOrCoord
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const o = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.orderId },
        include: {
          assignments: {
            include: {
              technician: {
                select: oplUserBasicSelect,
              },
            },
          },
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
        technicians: o.assignments.map((a) => a.technician.user.name),
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
    const technicianId = ctx.user!.id

    const orders = await ctx.prisma.oplOrder.findMany({
      where: {
        status: { in: [OplOrderStatus.PENDING, OplOrderStatus.ASSIGNED] },
        assignments: {
          some: {
            technicianId,
          },
        },
      },
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
        notes: true,
        standard: true,

        assignments: {
          select: {
            technician: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    /**
     * Map relational assignment model into a flat, UI-friendly view model.
     * The frontend must not depend on join tables or relational structures.
     */
    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      type: o.type,
      city: o.city,
      street: o.street,
      date: o.date,
      timeSlot: o.timeSlot,
      operator: o.operator,
      status: o.status,
      notes: o.notes,

      technicians: o.assignments.map((a) => ({
        id: a.technician.user.id,
        name: a.technician.user.name,
      })),
    }))
  }),
})
