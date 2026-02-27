// src/server/modules/opl-crm/routers/order/queries.ts
import { router } from '@/server/trpc'
import { hasAnyRole, isTechnician } from './../../../../../utils/auth/role'

import { sortedOplTimeSlotsByHour } from '@/app/(modules)/opl-crm/lib/constants'
import { requireOplModule } from '@/server/middleware/oplMiddleware'
import {
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import { OplTechnicianAssignment } from '@/types/opl-crm'
import {
  cleanStreetName,
  getCoordinatesFromAddress,
  stripStreetUnit,
} from '@/utils/geocode'
import { getNextLineOrderNumber } from '@/utils/orders/nextLineOrderNumber'
import {
  OplNetworkOeprator,
  OplOrderStatus,
  OplOrderStandard,
  OplOrderType,
  OplTimeSlot,
  Prisma,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { endOfDay, endOfMonth, parseISO, startOfDay, startOfMonth } from 'date-fns'
import { z } from 'zod'
import {
  getAddressNotesByAddress,
  matchesBuildingScope,
  normalizeAddressToken,
  normalizeStreetBaseToken,
  searchAddressNotesByText,
} from '../../helpers/addressNotes'
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

/** Street endings that often break geocoding precision (local/unit suffixes). */
const SUSPICIOUS_STREET_SUFFIX_REGEX =
  /(?:\/\s*(?:LU|LOK|L|M|M\.|LOKAL)\s*[A-Z0-9-]+|\d+[A-Z]?\s*\/\s*[A-Z0-9-]+)\s*$/i

/* -----------------------------------------------------------
 * queriesRouter
 * ----------------------------------------------------------- */
export const queriesRouter = router({
  getAddressSuggestions: loggedInEveryone
    .use(requireOplModule)
    .input(
      z.object({
        query: z.string().trim().min(2),
        cityHint: z.string().trim().optional(),
        limit: z.number().min(1).max(20).default(8),
      })
    )
    .query(async ({ input, ctx }) => {
      const q = input.query.trim()
      const cityHint = input.cityHint?.trim()
      const limit = input.limit
      const isStreetSearch = Boolean(cityHint)

      const localRows = await ctx.prisma.oplOrder.findMany({
        where: {
          ...(isStreetSearch
            ? {
                AND: [
                  { street: { contains: q, mode: 'insensitive' as const } },
                  ...(cityHint
                    ? [
                        {
                          city: {
                            contains: cityHint,
                            mode: 'insensitive' as const,
                          },
                        },
                      ]
                    : []),
                ],
              }
            : {
                city: { contains: q, mode: 'insensitive' as const },
              }),
        },
        select: {
          city: true,
          street: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 60,
      })

      const seen = new Set<string>()
      const localSuggestions: Array<{
        city: string
        street: string
        label: string
        source: 'local' | 'photon'
      }> = []

      for (const row of localRows) {
        const city = (row.city ?? '').trim()
        const street = (row.street ?? '').trim()
        if (!city && !street) continue

        if (isStreetSearch) {
          if (!street || !street.toLowerCase().includes(q.toLowerCase())) continue
        } else {
          if (!city || !city.toLowerCase().includes(q.toLowerCase())) continue
        }

        if (
          cityHint &&
          city &&
          !city.toLowerCase().includes(cityHint.toLowerCase())
        ) {
          continue
        }

        const key = `${city.toLowerCase()}|${street.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)

        localSuggestions.push({
          city,
          street,
          label: [city, street].filter(Boolean).join(', '),
          source: 'local',
        })

        if (localSuggestions.length >= limit) break
      }

      if (localSuggestions.length >= limit) return localSuggestions

      const photonSuggestions: Array<{
        city: string
        street: string
        label: string
        source: 'local' | 'photon'
      }> = []

      try {
        const photonQuery = [q, cityHint, 'Polska'].filter(Boolean).join(', ')
        const url = new URL('https://photon.komoot.io/api/')
        url.searchParams.set('q', photonQuery)
        url.searchParams.set('lang', 'pl')
        url.searchParams.set('limit', String(Math.max(3, limit)))

        const res = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
        })

        if (res.ok) {
          const data = (await res.json()) as {
            features?: Array<{
              properties?: Record<string, unknown>
            }>
          }

          for (const feature of data.features ?? []) {
            const props = feature.properties ?? {}
            const city = String(
              props.city ?? props.locality ?? props.county ?? ''
            ).trim()
            const streetName = String(props.street ?? props.name ?? '').trim()
            const houseNumber = String(props.housenumber ?? '').trim()
            const street = [streetName, houseNumber].filter(Boolean).join(' ')

            if (!city && !street) continue
            const key = `${city.toLowerCase()}|${street.toLowerCase()}`
            if (seen.has(key)) continue
            seen.add(key)

            photonSuggestions.push({
              city,
              street,
              label: [city, street].filter(Boolean).join(', '),
              source: 'photon',
            })

            if (localSuggestions.length + photonSuggestions.length >= limit) {
              break
            }
          }
        }
      } catch {
        // Silent fallback: local suggestions are enough for manual entry.
      }

      return [...localSuggestions, ...photonSuggestions].slice(0, limit)
    }),

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
      const allowedLocationIds = new Set(ctx.user.locations.map((l) => l.id))

      const filters: Prisma.OplOrderWhereInput = {}

      /* -------------------------------------------
       * Technician access: only orders assigned to him
       * ------------------------------------------- */
      if (isTechnician(role)) {
        const finalStatuses = [
          OplOrderStatus.COMPLETED,
          OplOrderStatus.NOT_COMPLETED,
        ]

        if (
          input.status === OplOrderStatus.COMPLETED ||
          input.status === OplOrderStatus.NOT_COMPLETED
        ) {
          filters.status = input.status
          filters.history = {
            some: {
              changedById: userId,
              statusAfter: input.status,
            },
          }
        } else if (
          input.status === OplOrderStatus.PENDING ||
          input.status === OplOrderStatus.ASSIGNED
        ) {
          filters.status = input.status
          filters.assignments = {
            some: {
              technicianId: userId,
            },
          }
        } else {
          filters.OR = [
            {
              status: { in: [OplOrderStatus.PENDING, OplOrderStatus.ASSIGNED] },
              assignments: {
                some: {
                  technicianId: userId,
                },
              },
            },
            {
              status: { in: finalStatuses },
              history: {
                some: {
                  changedById: userId,
                  statusAfter: { in: finalStatuses },
                },
              },
            },
          ]
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

      if (!isTechnician(role) && input.status) filters.status = input.status
      if (input.type) filters.type = input.type

      if (role === 'WAREHOUSEMAN') {
        filters.status = {
          in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
        }
        if (allowedLocationIds.size === 0) {
          filters.id = '__no_access__'
        } else {
          filters.assignments = {
            some: {
              technician: {
                user: {
                  locations: {
                    some: {
                      locationId: {
                        in: Array.from(allowedLocationIds),
                      },
                    },
                  },
                },
              },
            },
          }
        }
      }

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
            orderBy: { assignedAt: 'asc' },
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
    .use(requireOplModule)
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.id },
        include: {
          /** Current technician assignments */
          assignments: {
            orderBy: { assignedAt: 'asc' },
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
                orderBy: { assignedAt: 'asc' },
                include: {
                  technician: {
                    select: oplUserWithCoreBasicSelect,
                  },
                },
              },
              history: {
                where: {
                  statusAfter: {
                    in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
                  },
                },
                orderBy: { changeDate: 'desc' },
                take: 1,
                include: {
                  changedBy: {
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
                orderBy: { assignedAt: 'asc' },
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
              warehouse: {
                include: {
                  history: {
                    select: {
                      action: true,
                      assignedOrderId: true,
                    },
                  },
                },
              },
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

      const actor = ctx.user
      if (!actor) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const isAssignedToActor = order.assignments.some(
        (a) => a.technician.user.id === actor.id
      )
      const finalizedByActor = order.history.some(
        (h) =>
          h.changedBy.user.id === actor.id &&
          (h.statusAfter === OplOrderStatus.COMPLETED ||
            h.statusAfter === OplOrderStatus.NOT_COMPLETED)
      )

      if (actor.role === 'TECHNICIAN' && !isAssignedToActor && !finalizedByActor) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Brak dostępu do tego zlecenia.',
        })
      }

      if (actor.role === 'WAREHOUSEMAN') {
        const actorLocationIds = new Set(actor.locations.map((l) => l.id))
        const hasLocationMatch =
          actorLocationIds.size > 0
            ? Boolean(
                await ctx.prisma.oplOrder.findFirst({
                  where: {
                    id: input.id,
                    assignments: {
                      some: {
                        technician: {
                          user: {
                            locations: {
                              some: {
                                locationId: { in: Array.from(actorLocationIds) },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  select: { id: true },
                })
              )
            : false

        if (!hasLocationMatch) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Brak dostępu do tego zlecenia.',
          })
        }

        if (
          order.status !== OplOrderStatus.COMPLETED &&
          order.status !== OplOrderStatus.NOT_COMPLETED
        ) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Magazynier ma dostęp tylko do zakończonych zleceń.',
          })
        }
      }

      return order
    }),

  /** Orders grouped by technician and time-slot for planning board */
  getAssignedOrders: adminOrCoord
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ input, ctx }): Promise<OplTechnicianAssignment[]> => {
      const target = input?.date
        ? new Date(`${input.date}T00:00:00`)
        : new Date()

      /* -------------------------------------------
       * 1️⃣ Load technicians
       * ------------------------------------------- */
      const techs = await ctx.prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          status: 'ACTIVE',
          modules: {
            some: {
              module: { code: 'OPL' },
            },
          },
        },
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
          standard: true,
          network: true,
          lat: true,
          lng: true,
          timeSlot: true,
          status: true,
          operator: true,
          notes: true,
          failureReason: true,
          date: true,
          assignments: {
            select: {
              technicianId: true,
              assignedAt: true,
              technician: {
                select: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
            orderBy: { assignedAt: 'asc' },
          },
          history: {
            where: {
              statusAfter: {
                in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
              },
              changedBy: {
                user: {
                  role: 'TECHNICIAN',
                },
              },
            },
            orderBy: { changeDate: 'desc' },
            take: 1,
            select: {
              changedBy: {
                select: {
                  user: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { timeSlot: 'asc' },
      })

      /* -------------------------------------------
       * 3️⃣ Auto-geocoding (bounded, concurrent)
       * ------------------------------------------- */
      const missingCoords = orders.filter((o) => o.lat === null || o.lng === null)
      const suspiciousCoords = orders.filter((o) =>
        SUSPICIOUS_STREET_SUFFIX_REGEX.test(o.street)
      )
      const MAX_GEOCODES = 60
      const CONCURRENCY = 3

      const geocodeTargets = Array.from(
        new Map(
          [...suspiciousCoords, ...missingCoords].map((order) => [order.id, order])
        ).values()
      )

      await mapWithConcurrency(
        geocodeTargets.slice(0, MAX_GEOCODES),
        CONCURRENCY,
        async (order) => {
          const cleanStreet = cleanStreetName(order.street)
          const strippedStreet = stripStreetUnit(cleanStreet)
          const variants = [
            `${cleanStreet}, ${order.city}, Polska`,
            ...(strippedStreet !== cleanStreet
              ? [`${strippedStreet}, ${order.city}, Polska`]
              : []),
            `${order.city}, Polska`,
          ]

          let coords = null as { lat: number; lng: number } | null
          for (const address of variants) {
            coords = await getCoordinatesFromAddress(address)
            if (coords) break
          }
          if (!coords) {
            if (SUSPICIOUS_STREET_SUFFIX_REGEX.test(order.street)) {
              order.lat = null
              order.lng = null
              await ctx.prisma.oplOrder.update({
                where: { id: order.id },
                data: { lat: null, lng: null },
              })
            }
            return
          }

          order.lat = coords.lat
          order.lng = coords.lng

          await ctx.prisma.oplOrder.update({
            where: { id: order.id },
            data: { lat: coords.lat, lng: coords.lng },
          })
        }
      )

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
          standard: OplOrderStandard | null
          network: OplNetworkOeprator
          lat: number | null
          lng: number | null
          timeSlot: OplTimeSlot
          status: OplOrderStatus
          operator: string
          notes: string | null
          failureReason: string | null
          date: Date
          primaryTechnicianId: string | null
          assignedTechnicians: { id: string; name: string }[]
          completedByName: string | null
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
          operator: data.operator?.trim() || '-',
          date: data.date,
          standard: data.standard ?? null,
          network: data.network,
          notes: data.notes ?? undefined,
          failureReason: data.failureReason ?? null,
          primaryTechnicianId: data.primaryTechnicianId,
          assignedTechnicians: data.assignedTechnicians,
          completedByName: data.completedByName,
        })
      }

      /* -------------------------------------------
       * 5️⃣ Fan-out: jedno zlecenie → wielu techników
       * ------------------------------------------- */
      orders.forEach((o) => {
        const assignedTechnicians = o.assignments.map((a) => ({
          id: a.technicianId,
          name: a.technician.user.name,
        }))
        const primaryTechnicianId = o.assignments[0]?.technicianId ?? null
        const completedByName = o.history[0]?.changedBy.user.name ?? null

        o.assignments.forEach((a) => {
          const tech = techs.find((t) => t.id === a.technicianId)
          if (!tech) return

          push(tech.id, tech.name, {
            ...o,
            primaryTechnicianId,
            assignedTechnicians,
            completedByName,
          })
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
        assignedTechnicianIdsAll: z.array(z.string()).min(2).max(2).optional(),
        type: z.nativeEnum(OplOrderType).optional(),
        status: z.nativeEnum(OplOrderStatus).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        searchTerm: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const filters: Prisma.OplOrderWhereInput = {
        status: {
          in: [OplOrderStatus.COMPLETED, OplOrderStatus.NOT_COMPLETED],
        },
      }

      if (input.assignedTechnicianIdsAll?.length === 2) {
        const [t1, t2] = input.assignedTechnicianIdsAll
        filters.AND = [
          {
            assignments: {
              some: {
                technicianId: t1,
              },
            },
          },
          {
            assignments: {
              some: {
                technicianId: t2,
              },
            },
          },
        ]
      } else if (input.assignedToId) {
        filters.assignments = {
          some: {
            technicianId: input.assignedToId,
          },
        }
      }
      if (input.type) filters.type = input.type
      if (input.status) filters.status = input.status
      if (input.dateFrom || input.dateTo) {
        const dateFilter: Prisma.DateTimeFilter = {}
        if (input.dateFrom) {
          dateFilter.gte = startOfDay(parseISO(input.dateFrom))
        }
        if (input.dateTo) {
          dateFilter.lte = endOfDay(parseISO(input.dateTo))
        }
        filters.date = dateFilter
      }

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
            orderBy: { assignedAt: 'asc' },
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
          some: {
            technicianId,
          },
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
            orderBy: { assignedAt: 'asc' },
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
          network: true,
          standard: true,
          notes: true,
          failureReason: true,
          timeSlot: true,
          status: true,
          postalCode: true,
          lat: true,
          lng: true,
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
        const strippedStreet = stripStreetUnit(street)
        const city = (r.city ?? '').trim()
        const pc = isUsablePostalCode(r.postalCode)
          ? r.postalCode!.trim()
          : null

        const variants: string[] = []
        if (street && city && pc)
          variants.push(`${street}, ${pc}, ${city}, Polska`)
        if (street && city) variants.push(`${street}, ${city}, Polska`)
        if (strippedStreet && strippedStreet !== street && city && pc)
          variants.push(`${strippedStreet}, ${pc}, ${city}, Polska`)
        if (strippedStreet && strippedStreet !== street && city)
          variants.push(`${strippedStreet}, ${city}, Polska`)
        if (city) variants.push(`${city}, Polska`)
        return Array.from(new Set(variants))
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

      const MAX_GEOCODES = 60
      const CONCURRENCY = 3 // tuned for Nominatim politeness + UX

      const missingRows = rows.filter((r) => r.lat === null || r.lng === null)
      const suspiciousRows = rows.filter((r) =>
        SUSPICIOUS_STREET_SUFFIX_REGEX.test(r.street)
      )
      const head = Array.from(
        new Map([...suspiciousRows, ...missingRows].map((r) => [r.id, r])).values()
      ).slice(0, MAX_GEOCODES)

      const enrichAndPersist = async (r: (typeof rows)[number]) => {
        const variants = buildAddressVariants(r)
        const coords = await geocodeWithFallback(variants)
        if (!coords) {
          if (SUSPICIOUS_STREET_SUFFIX_REGEX.test(r.street)) {
            r.lat = null
            r.lng = null
            await ctx.prisma.oplOrder.update({
              where: { id: r.id },
              data: { lat: null, lng: null },
            })
          }
          return
        }
        r.lat = coords.lat
        r.lng = coords.lng
        await ctx.prisma.oplOrder.update({
          where: { id: r.id },
          data: { lat: coords.lat, lng: coords.lng },
        })
      }

      try {
        // Run initial chunk with limited concurrency; never throw the whole route on single failure
        await mapWithConcurrency(head, CONCURRENCY, async (row) => {
          try {
            await enrichAndPersist(row)
          } catch {
            // Be fail-safe: fallback without coords
          }
        })

        return rows.map((r) => ({
          ...r,
          operator: r.operator?.trim() || '-',
          lat: r.lat ?? null,
          lng: r.lng ?? null,
        }))
      } catch (e) {
        // HARD FALLBACK: if geocoding infra is down, still return rows without coordinates
        console.error(
          'Geocoding batch failed — returning rows without coordinates',
          e
        )
        return rows.map((r) => ({
          ...r,
          operator: r.operator?.trim() || '-',
          lat: r.lat ?? null,
          lng: r.lng ?? null,
        }))
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
            orderBy: { assignedAt: 'asc' },
            select: {
              technician: {
                select: oplUserSlimSelect,
              },
            },
          },
        },
        orderBy: [{ date: 'desc' }, { timeSlot: 'desc' }],
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

  getPlannerMonthlyOrders: adminOrCoord
    .use(requireOplModule)
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      const baseDate = parseISO(input.month)
      const from = startOfMonth(baseDate)
      const to = endOfMonth(baseDate)

      const orders = await ctx.prisma.oplOrder.findMany({
        where: {
          date: {
            gte: startOfDay(from),
            lte: endOfDay(to),
          },
        },
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          date: true,
          timeSlot: true,
          status: true,
          operator: true,
          type: true,
          assignments: {
            orderBy: { assignedAt: 'asc' },
            select: {
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
        orderBy: [{ date: 'desc' }, { timeSlot: 'asc' }, { createdAt: 'desc' }],
      })

      return orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        city: o.city,
        street: o.street,
        date: o.date,
        timeSlot: o.timeSlot,
        status: o.status,
        operator: o.operator,
        type: o.type,
        technicians: o.assignments.map((a) => a.technician.user.name),
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
            orderBy: { assignedAt: 'asc' },
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

  getAddressNotesForOrder: loggedInEveryone
    .use(requireOplModule)
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          city: true,
          street: true,
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      const cityNorm = normalizeAddressToken(order.city)
      const streetNorm = normalizeStreetBaseToken(order.street)
      const streetNormLegacy = normalizeAddressToken(order.street)

      const rows = await getAddressNotesByAddress({
        prisma: ctx.prisma,
        cityNorm,
        streetNorm,
        streetNormLegacy,
      })

      return rows
        .map((row) => {
          const scopeMatches = matchesBuildingScope(row.buildingScope, order.street)
          return {
          id: row.id,
          city: row.city,
          street: row.street,
          note: row.note,
          buildingScope: row.buildingScope,
          createdAt: row.createdAt,
          createdBy: row.createdBy,
            scopeMatches,
          }
        })
        .sort((a, b) => {
          if (a.scopeMatches !== b.scopeMatches) {
            return a.scopeMatches ? -1 : 1
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
    }),

  searchAddressNotes: loggedInEveryone
    .use(requireOplModule)
    .input(
      z.object({
        query: z.string().trim().optional(),
        limit: z.number().int().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const queryNorm = input.query ? normalizeAddressToken(input.query) : ''

      const rows = await searchAddressNotesByText({
        prisma: ctx.prisma,
        query: input.query,
        queryNorm,
        limit: input.limit,
      })

      return rows.map((row) => ({
        id: row.id,
        city: row.city,
        street: row.street,
        note: row.note,
        buildingScope: row.buildingScope,
        createdAt: row.createdAt,
        createdBy: row.createdBy,
      }))
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
        network: true,
        operator: true,
        status: true,
        notes: true,
        standard: true,

        assignments: {
          orderBy: { assignedAt: 'asc' },
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
      network: o.network,
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
