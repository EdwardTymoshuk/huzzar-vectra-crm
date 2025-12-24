import { adminOnly, adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { parseLocalDate } from '@/utils/dates/parseLocalDate'
import { getCoordinatesFromAddress } from '@/utils/geocode'
import { normalizeAdressForSearch } from '@/utils/orders/normalizeAdressForSearch'
import { prisma } from '@/utils/prisma'
import {
  DeviceCategory,
  OrderCreatedSource,
  Prisma,
  ServiceType,
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
  VectraOrderStatus,
  VectraOrderType,
  VectraTimeSlot,
=======
  TimeSlot,
  WarehouseAction,
  WarehouseStatus,
>>>>>>> main:src/server/routers/order/mutations.ts
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { differenceInMinutes } from 'date-fns'
import { z } from 'zod'
import { getUserOrThrow } from '../../_helpers/getUserOrThrow'
import { reconcileOrderMaterials } from '../../_helpers/reconcileOrderMaterials'

function parseLocalDate(d: string): Date {
  const [year, month, day] = d.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
  // 12:00 = unikasz edge-case DST
}

async function canTechnicianAmend(
  tx: typeof prisma,
  orderId: string,
  userId: string
) {
  const o = await tx.order.findUnique({
    where: { id: orderId },
    select: { assignedToId: true, completedAt: true, status: true },
  })
  if (!o)
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Zlecenie nie istnieje' })
  if (o.assignedToId !== userId) throw new TRPCError({ code: 'FORBIDDEN' })
  if (!o.completedAt)
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Zlecenie nie jest zakończone',
    })
  const diff = differenceInMinutes(new Date(), o.completedAt)
  if (diff > 15)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Czas na poprawki minął (15 min).',
    })
  return true
}

/**
 * Maps input services to include deviceType and deviceType2 based on Warehouse category.
 * Used in completeOrder, amendCompletion, and adminEditCompletion.
 */
async function mapServicesWithDeviceTypes(
  tx: DbTx,
  services: {
    id: string
    type: ServiceType
    deviceId?: string
    deviceSource?: 'WAREHOUSE' | 'CLIENT'
    deviceName?: string
    deviceName2?: string
    deviceType?: DeviceCategory | null
    serialNumber?: string
    deviceId2?: string
    serialNumber2?: string
    speedTest?: string
    usDbmDown?: number
    usDbmUp?: number
    notes?: string
    extraDevices?: {
      id: string
      source: 'WAREHOUSE' | 'CLIENT'
      category: DeviceCategory
      name?: string
      serialNumber?: string
    }[]
  }[],
  orderId: string
) {
  return Promise.all(
    services.map(async (s) => {
      // If deviceSource = CLIENT, we use category/name directly from payload
      const [device1, device2] = await Promise.all([
        s.deviceSource === 'WAREHOUSE' && s.deviceId
          ? tx.vectraWarehouse.findUnique({
              where: { id: s.deviceId },
              select: { category: true },
            })
          : null,
        s.deviceId2
          ? tx.vectraWarehouse.findUnique({
              where: { id: s.deviceId2 },
              select: { category: true },
            })
          : null,
      ])

      return {
        id: s.id,
        orderId,
        type: s.type,
        // 🔹 save both warehouse or client device reference
        deviceId: s.deviceId ?? null,
        serialNumber: s.serialNumber ?? null,
        deviceSource: s.deviceSource ?? null,
        deviceName: s.deviceName ?? null,
        deviceType:
          s.deviceSource === 'CLIENT'
            ? s.deviceType ?? null
            : device1?.category ?? null,
        deviceId2: s.deviceId2 ?? null,
        deviceName2: s.deviceName2 ?? null,
        serialNumber2: s.serialNumber2 ?? null,
        deviceType2: device2?.category ?? null,
        speedTest: s.speedTest ?? null,
        usDbmDown: s.usDbmDown ?? null,
        usDbmUp: s.usDbmUp ?? null,
        notes: s.notes ?? null,
        extraDevices:
          s.extraDevices?.map((ex) => ({
            id: ex.id,
            source: ex.source,
            category: ex.category,
            name: ex.name ?? null,
            serialNumber: ex.serialNumber ?? null,
          })) ?? [],
      }
    })
  )
}

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
=======
/**
 * Unified equipment delta processor for COMPLETE, AMEND, and ADMIN EDIT.
 */

export type EquipmentDeltaMode = 'COMPLETE' | 'AMEND' | 'ADMIN'

export type TxContext =
  | PrismaClient
  | Omit<Prisma.TransactionClient, '$extends'>

interface ProcessEquipmentDeltaParams {
  tx: TxContext
  orderId: string
  newEquipmentIds: string[]
  technicianId: string | null
  editorId: string
  mode: EquipmentDeltaMode
}

/**
 * Shape returned by findMany for previous equipment.
 */
interface PreviousDevice {
  id: string
  status: WarehouseStatus
  assignedToId: string | null
}

interface AddedDevice {
  id: string
  assignedToId: string | null
  status: WarehouseStatus
}

export async function processEquipmentDelta({
  tx,
  orderId,
  newEquipmentIds,
  technicianId,
  editorId,
  mode,
}: ProcessEquipmentDeltaParams): Promise<void> {
  /**
   * STEP 1 — Load previous assigned equipment (DEVICE only).
   */
  const previous: PreviousDevice[] = await tx.warehouse.findMany({
    where: {
      itemType: 'DEVICE',
      orderAssignments: { some: { orderId } },
      status: { not: WarehouseStatus.COLLECTED_FROM_CLIENT },
    },
    select: {
      id: true,
      status: true,
      assignedToId: true,
    },
  })

  const prevIds = new Set(previous.map((x: PreviousDevice) => x.id))
  const newIds = new Set(newEquipmentIds)

  const removed: string[] = [...prevIds].filter((id: string) => !newIds.has(id))
  const added: string[] = [...newIds].filter((id: string) => !prevIds.has(id))

  /**
   * STEP 2 — Handle removed devices (rollback COMPLETE behavior).
   */
  for (const id of removed) {
    const lastAssign = await tx.warehouseHistory.findFirst({
      where: {
        warehouseItemId: id,
        action: WarehouseAction.ASSIGNED_TO_ORDER,
        assignedOrderId: orderId,
      },
      orderBy: { actionDate: 'desc' },
      select: { assignedToId: true },
    })

    const ownerId: string | null = lastAssign?.assignedToId ?? null

    const returnStatus: WarehouseStatus =
      ownerId !== null ? WarehouseStatus.ASSIGNED : WarehouseStatus.AVAILABLE

    const returnAction: WarehouseAction =
      ownerId !== null
        ? WarehouseAction.RETURNED_TO_TECHNICIAN
        : WarehouseAction.RETURNED

    await tx.warehouse.update({
      where: { id },
      data: {
        status: returnStatus,
        assignedToId: ownerId,
        locationId: ownerId ? null : undefined,
        history: {
          create: {
            action: returnAction,
            performedById: editorId,
            assignedOrderId: orderId,
            assignedToId: ownerId,
          },
        },
      },
    })

    await tx.orderEquipment.deleteMany({
      where: { orderId, warehouseId: id },
    })
  }

  /**
   * STEP 3 — Load devices to be added (with explicit typing).
   */
  const addedDevices: AddedDevice[] = await tx.warehouse.findMany({
    where: { id: { in: added } },
    select: {
      id: true,
      assignedToId: true,
      status: true,
    },
  })

  /**
   * Validate rules for technicians (COMPLETE / AMEND).
   */
  for (const dev of addedDevices) {
    if (mode === 'ADMIN') continue

    if (!technicianId) {
      throw new Error('TechnicianId missing for technician operation.')
    }

    if (dev.assignedToId !== technicianId) {
      throw new Error(
        `Technician attempted to use device not assigned to him. Device ID: ${dev.id}`
      )
    }
  }

  /**
   * STEP 4 — Assign added devices to order.
   */
  if (addedDevices.length > 0) {
    await tx.orderEquipment.createMany({
      data: addedDevices.map((dev: AddedDevice) => ({
        orderId,
        warehouseId: dev.id,
      })),
    })

    await tx.warehouse.updateMany({
      where: { id: { in: addedDevices.map((d: AddedDevice) => d.id) } },
      data: {
        status: WarehouseStatus.ASSIGNED_TO_ORDER,
        assignedToId: null,
        locationId: null,
      },
    })

    await tx.warehouseHistory.createMany({
      data: addedDevices.map((dev: AddedDevice) => ({
        warehouseItemId: dev.id,
        action: WarehouseAction.ASSIGNED_TO_ORDER,
        performedById: editorId,
        assignedOrderId: orderId,
      })),
    })
  }
}

>>>>>>> main:src/server/routers/order/mutations.ts
export const mutationsRouter = router({
  /** Bulk import of installation orders from Excel */
  bulkImport: adminOrCoord
    .input(
      z.array(
        z.object({
          operator: z.string(),
          type: z.literal('INSTALATION'),
          clientId: z.string().optional(),
          orderNumber: z.string(),
          date: z.string(),
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
          timeSlot: z.nativeEnum(VectraTimeSlot),
=======
          timeSlot: z.nativeEnum(TimeSlot),
>>>>>>> main:src/server/routers/order/mutations.ts
          city: z.string(),
          street: z.string(),
          postalCode: z.string().optional(),
          assignedToId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const adminId = ctx.user!.id

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
      return await prisma.$transaction(async (tx) => {
        const summary = {
          added: 0,
          skippedPendingOrAssigned: 0,
          skippedCompleted: 0,
          otherErrors: 0,
        }

        for (const o of input) {
          try {
            const normOrder = normalizeAdressForSearch(o.orderNumber)

            /** Check if an order with this number exists */
            const existing = await tx.order.findFirst({
              where: {
                orderNumber: { equals: normOrder, mode: 'insensitive' },
              },
            })

            /** Local attempt handling state */
            let forcedAttempt = false
            let forcedAttemptNumber: number | null = null
            let forcedPreviousOrderId: string | null = null

            if (existing) {
              /** Skip active orders */
              if (
                existing.status === VectraOrderStatus.PENDING ||
                existing.status === VectraOrderStatus.ASSIGNED
              ) {
                summary.skippedPendingOrAssigned++
                continue
              }

              /** Skip completed */
              if (existing.status === VectraOrderStatus.COMPLETED) {
                summary.skippedCompleted++
                continue
              }

              /** NOT_COMPLETED → new attempt */
              if (existing.status === VectraOrderStatus.NOT_COMPLETED) {
                forcedAttempt = true
                forcedAttemptNumber = existing.attemptNumber + 1
                forcedPreviousOrderId = existing.id
              }
            }

            /** Resolve technician */
            let assignedToId: string | null = null

            if (o.assignedToId) {
              const t = await tx.user.findUnique({
                where: { id: o.assignedToId },
                select: { id: true },
              })
              assignedToId = t?.id ?? null
            }

            /** Attempt chain */
            let attemptNumber = 1
            let previousOrderId: string | null = null

            if (forcedAttempt && forcedAttemptNumber) {
              attemptNumber = forcedAttemptNumber
              previousOrderId = forcedPreviousOrderId
            } else if (o.clientId) {
              const last = await tx.$queryRaw<
                {
                  id: string
                  attemptNumber: number
                  status: VectraOrderStatus
                }[]
              >`
              SELECT id, "attemptNumber", "status"
              FROM "Order"
              WHERE "clientId" = ${o.clientId}
                AND unaccent(lower("city")) = unaccent(lower(${o.city}))
                AND unaccent(lower("street")) = unaccent(lower(${o.street}))
              ORDER BY "attemptNumber" DESC
              LIMIT 1;
            `

              if (
                last.length > 0 &&
                last[0].status === VectraOrderStatus.NOT_COMPLETED
              ) {
                attemptNumber = last[0].attemptNumber + 1
                previousOrderId = last[0].id
              }
            }

            /** Status based on assignment */
            const newStatus = assignedToId
              ? VectraOrderStatus.ASSIGNED
              : VectraOrderStatus.PENDING

            /** Create new order */
            const created = await tx.order.create({
              data: {
                clientId: o.clientId ?? null,
                operator: o.operator,
                type: o.type,
                orderNumber: o.orderNumber.trim(),
                date: new Date(o.date),
                timeSlot: o.timeSlot,
                city: o.city.trim(),
                street: o.street.trim(),
                postalCode: o.postalCode ?? null,
                notes: o.notes ?? null,
                assignedToId,
                status: newStatus,
                attemptNumber,
                previousOrderId,
                createdSource: 'PLANNER',
              },
              select: { id: true },
            })

            /** History */
=======
      const summary = {
        added: 0,
        skippedPendingOrAssigned: 0,
        skippedCompleted: 0,
        otherErrors: 0,
      }

      // ------------------------------------------------------------
      // IMPORTANT: No global transaction. Each row = separate TX.
      // ------------------------------------------------------------
      for (const o of input) {
        try {
          await prisma.$transaction(async (tx) => {
            const normOrder = normalizeForSearch(o.orderNumber)

            /** -------------------------------------------------------
             * 1. Load existing attempts for this order/location pair
             * ------------------------------------------------------ */
            const existing = await tx.order.findFirst({
              where: {
                orderNumber: { equals: normOrder, mode: 'insensitive' },
                city: { equals: o.city.trim(), mode: 'insensitive' },
                street: { equals: o.street.trim(), mode: 'insensitive' },
              },
              orderBy: { attemptNumber: 'desc' },
            })

            /** -------------------------------------------------------
             * 2. Decide what to do based on existing order status
             * ------------------------------------------------------ */
            let attemptNumber = 1
            let previousOrderId: string | null = null

            if (existing) {
              if (
                existing.status === OrderStatus.PENDING ||
                existing.status === OrderStatus.ASSIGNED
              ) {
                summary.skippedPendingOrAssigned++
                throw new Error('SKIP_ORDER_ACTIVE')
              }

              if (existing.status === OrderStatus.COMPLETED) {
                summary.skippedCompleted++
                throw new Error('SKIP_ORDER_COMPLETED')
              }

              if (existing.status === OrderStatus.NOT_COMPLETED) {
                attemptNumber = existing.attemptNumber + 1
                previousOrderId = existing.id
              }
            }

            /** -------------------------------------------------------
             * 3. Resolve technician (optional)
             * ------------------------------------------------------ */
            let assignedToId: string | null = null

            if (o.assignedToId) {
              const tech = await tx.user.findUnique({
                where: { id: o.assignedToId },
                select: { id: true },
              })
              assignedToId = tech?.id ?? null
            }

            const newStatus = assignedToId
              ? OrderStatus.ASSIGNED
              : OrderStatus.PENDING

            /** -------------------------------------------------------
             * 4. Create new attempt
             * ------------------------------------------------------ */
            const created = await tx.order.create({
              data: {
                clientId: o.clientId ?? null,
                operator: o.operator,
                type: o.type,
                orderNumber: o.orderNumber.trim(),
                date: new Date(o.date),
                timeSlot: o.timeSlot,
                city: o.city.trim(),
                street: o.street.trim(),
                postalCode: o.postalCode ?? null,
                notes: o.notes ?? null,
                assignedToId,
                status: newStatus,
                attemptNumber,
                previousOrderId,
                createdSource: 'PLANNER',
              },
              select: { id: true },
            })

            /** -------------------------------------------------------
             * 5. History entry
             * ------------------------------------------------------ */
            const historyNote = previousOrderId
              ? `Utworzono kolejne podejście (wejście ${attemptNumber}).`
              : 'Utworzono zlecenie (import).'

>>>>>>> main:src/server/routers/order/mutations.ts
            await tx.orderHistory.create({
              data: {
                orderId: created.id,
                changedById: adminId,
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
                statusBefore: VectraOrderStatus.PENDING,
                statusAfter: newStatus,
                notes: previousOrderId
                  ? `Utworzono kolejne podejście (wejście ${attemptNumber}).`
                  : 'Utworzono zlecenie (import).',
              },
            })

            summary.added++
          } catch {
            summary.otherErrors++
          }
=======
                statusBefore: OrderStatus.PENDING,
                statusAfter: newStatus,
                notes: historyNote,
              },
            })
          })

          summary.added++
        } catch (err) {
          // Orders intentionally skipped do not count as "errors"
          if (err instanceof Error && err.message === 'SKIP_ORDER_ACTIVE')
            continue
          if (err instanceof Error && err.message === 'SKIP_ORDER_COMPLETED')
            continue

          console.error(`❌ Import error for order ${o.orderNumber}`)
          console.error(err)
          summary.otherErrors++
>>>>>>> main:src/server/routers/order/mutations.ts
        }

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        return summary
      })
=======
      return summary
>>>>>>> main:src/server/routers/order/mutations.ts
    }),

  /** ✅ Create new order (clientId-aware, preserves Polish letters but uses normalized comparisons) */
  createOrder: loggedInEveryone
    .input(
      z.object({
        operator: z.string(),
        type: z.nativeEnum(VectraOrderType),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(VectraTimeSlot),
        clientId: z.string().min(3).optional(),
        clientPhoneNumber: z
          .string()
          .optional()
          .refine((val) => !val || /^(\+48)?\d{9}$/.test(val), {
            message: 'Nieprawidłowy numer telefonu',
          }),
        notes: z.string().optional(),
        county: z.string().optional(),
        municipality: z.string().optional(),
        city: z.string(),
        street: z.string(),
        postalCode: z.string().optional(),
        assignedToId: z.string().optional(),
        createdSource: z.nativeEnum(OrderCreatedSource).default('PLANNER'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const userId = user.id

      const normOrder = normalizeAdressForSearch(input.orderNumber)

      // ------------------------------------------------------------
      // 🔍 Check if order number already exists (global, case-insensitive)
      // ------------------------------------------------------------
      const existingOrder = await prisma.vectraOrder.findFirst({
        where: {
          orderNumber: { equals: normOrder, mode: 'insensitive' },
        },
      })

      if (existingOrder) {
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        if (
          existingOrder.status === VectraOrderStatus.COMPLETED ||
          existingOrder.status === VectraOrderStatus.NOT_COMPLETED
        ) {
=======
        if (existingOrder.status === OrderStatus.COMPLETED) {
>>>>>>> main:src/server/routers/order/mutations.ts
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Zlecenie ${input.orderNumber} jest już wykonane.`,
          })
        }

        if (
          existingOrder.status === OrderStatus.PENDING ||
          existingOrder.status === OrderStatus.ASSIGNED
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Zlecenie ${input.orderNumber} już istnieje i oczekuje na realizację.`,
          })
        }
      }

      /* ------------------------------------------------------------
       * 1️⃣ Validate assigned technician (if provided)
       * ---------------------------------------------------------- */
      if (input.assignedToId) {
        const tech = await prisma.user.findUnique({
          where: { id: input.assignedToId },
        })
        if (!tech)
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Technik nie istnieje',
          })
      }

      /* ------------------------------------------------------------
       * 2️⃣ Prepare geocoded coordinates
       * ---------------------------------------------------------- */
      let lat: number | null = null
      let lng: number | null = null
      try {
        const addressVariants = [
          `${input.street}, ${input.postalCode ?? ''} ${input.city}, Polska`,
          `${input.street}, ${input.city}, Polska`,
          `${input.city}, Polska`,
        ]
        for (const addr of addressVariants) {
          const coords = await getCoordinatesFromAddress(addr)
          if (coords) {
            lat = coords.lat
            lng = coords.lng
            break
          }
        }
      } catch {
        console.warn(
          '⚠️ Geocoding failed for address:',
          input.street,
          input.city
        )
      }

      /* ------------------------------------------------------------
       * 3️⃣ Determine attempt chain (based on orderNumber + address)
       * ---------------------------------------------------------- */
      let attemptNumber = 1
      let previousOrderId: string | null = null
      const status: VectraOrderStatus = input.assignedToId
        ? VectraOrderStatus.ASSIGNED
        : VectraOrderStatus.PENDING

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
      // 🔒 Enforce globally unique order number
      const existingSameNumber = await prisma.vectraOrder.findFirst({
        where: { orderNumber: { equals: normOrder, mode: 'insensitive' } },
=======
      const lastAttempt = await prisma.order.findFirst({
        where: {
          orderNumber: { equals: normOrder, mode: 'insensitive' },
          city: { equals: input.city.trim(), mode: 'insensitive' },
          street: { equals: input.street.trim(), mode: 'insensitive' },
          status: OrderStatus.NOT_COMPLETED,
        },
        orderBy: { attemptNumber: 'desc' },
>>>>>>> main:src/server/routers/order/mutations.ts
      })

      if (lastAttempt) {
        attemptNumber = lastAttempt.attemptNumber + 1
        previousOrderId = lastAttempt.id
      }

      /* ------------------------------------------------------------
       * 4️⃣ Create new order (preserves Polish letters in DB)
       * ---------------------------------------------------------- */
      const created = await prisma.vectraOrder.create({
        data: {
          clientId: input.clientId ?? null,
          operator: input.operator,
          type: input.type,
          orderNumber: input.orderNumber.trim(),
          date: parseLocalDate(input.date),
          timeSlot: input.timeSlot,
          clientPhoneNumber: input.clientPhoneNumber ?? null,
          notes: input.notes ?? null,
          county: input.county ?? null,
          municipality: input.municipality ?? null,
          city: input.city.trim(),
          street: input.street.trim(),
          postalCode: input.postalCode?.trim() ?? null,
          lat,
          lng,
          assignedToId: input.assignedToId ?? null,
          createdSource: input.createdSource,
          status,
          attemptNumber,
          previousOrderId,
        },
      })

      /* ------------------------------------------------------------
       * 5️⃣ Create order history entry
       * ---------------------------------------------------------- */
      const historyNote = input.clientId
        ? previousOrderId
          ? `Utworzono kolejne podejście (wejście ${attemptNumber}).`
          : 'Utworzono pierwsze zlecenie klienta.'
        : 'Utworzono pierwsze wejście (ręcznie lub z planera).'

      await prisma.vectraOrderHistory.create({
        data: {
          orderId: created.id,
          changedById: userId,
          statusBefore: VectraOrderStatus.PENDING,
          statusAfter: status,
          notes: historyNote,
        },
      })

      return created
    }),
  /** ✅ Edit existing order (clientId-aware, preserves Polish letters and recalculates attempt chain) */
  editOrder: adminOrCoord
    .input(
      z.object({
        id: z.string(),
        type: z.nativeEnum(VectraOrderType),
        operator: z.string(),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(VectraTimeSlot),
        notes: z.string().optional(),
        status: z.nativeEnum(VectraOrderStatus),
        city: z.string(),
        street: z.string(),
        assignedToId: z.string().optional(),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const existing = await prisma.vectraOrder.findUnique({
          where: { id: input.id },
        })
        if (!existing)
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zlecenie nie istnieje',
          })

        const normOrder = normalizeAdressForSearch(input.orderNumber)
        const normCity = normalizeAdressForSearch(input.city)
        const normStreet = normalizeAdressForSearch(input.street)

        const oldCityNorm = normalizeAdressForSearch(existing.city)
        const oldStreetNorm = normalizeAdressForSearch(existing.street)

        const addressChanged =
          normCity !== oldCityNorm || normStreet !== oldStreetNorm

        let attemptNumber = existing.attemptNumber
        let previousOrderId = existing.previousOrderId

        // 🔒 Prevent duplicate order number globally
        const existingSameNumber = await prisma.vectraOrder.findFirst({
          where: {
            orderNumber: { equals: normOrder, mode: 'insensitive' },
            NOT: { id: existing.id },
          },
        })
        if (existingSameNumber)
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Numer zlecenia "${input.orderNumber}" jest już używany.`,
          })

        /* ----------------------------------------------------------
         * 1️⃣ Recalculate attempt chain if address changed
         * ---------------------------------------------------------- */
        if (addressChanged) {
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
          const clientId = input.clientId ?? existing.clientId
          if (clientId) {
            const lastOrder = await prisma.$queryRaw<
              { id: string; attemptNumber: number; status: VectraOrderStatus }[]
            >`
              SELECT id, "attemptNumber", "status"
              FROM "Order"
              WHERE "clientId" = ${clientId}
                AND unaccent(lower("city")) = unaccent(lower(${input.city}))
                AND unaccent(lower("street")) = unaccent(lower(${input.street}))
              ORDER BY "attemptNumber" DESC
              LIMIT 1;
            `
=======
          const lastAttempt = await prisma.order.findFirst({
            where: {
              orderNumber: { equals: normOrder, mode: 'insensitive' },
              city: { equals: input.city.trim(), mode: 'insensitive' },
              street: { equals: input.street.trim(), mode: 'insensitive' },
              status: OrderStatus.NOT_COMPLETED,
              NOT: { id: existing.id },
            },
            orderBy: { attemptNumber: 'desc' },
          })
>>>>>>> main:src/server/routers/order/mutations.ts

          if (lastAttempt) {
            attemptNumber = lastAttempt.attemptNumber + 1
            previousOrderId = lastAttempt.id
          } else {
            attemptNumber = 1
            previousOrderId = null
          }
        }

        let lat: number | null | undefined = undefined
        let lng: number | null | undefined = undefined

        if (addressChanged) {
          const variants = [
            `${input.street}, ${input.city}, Polska`,
            `${input.city}, Polska`,
          ]

          for (const v of variants) {
            try {
              const coords = await getCoordinatesFromAddress(v)
              if (coords) {
                lat = coords.lat
                lng = coords.lng
                break
              }
            } catch {
              // ignore and check next variant
            }
          }

          // no result -> clear coordinates so they can be filled later
          if (lat === undefined) lat = null
          if (lng === undefined) lng = null
        }

        /* ----------------------------------------------------------
         * 2️⃣ Apply update (keep Polish letters in DB)
         * ---------------------------------------------------------- */
        const updated = await prisma.vectraOrder.update({
          where: { id: existing.id },
          data: {
            orderNumber: input.orderNumber.trim(),
            type: input.type,
            operator: input.operator,
            date: parseLocalDate(input.date),
            timeSlot: input.timeSlot,
            notes: input.notes,
            status: input.status,
            city: input.city.trim(),
            street: input.street.trim(),
            assignedToId: input.assignedToId ?? null,
            clientId: input.clientId ?? existing.clientId,
            attemptNumber,
            previousOrderId,
            ...(addressChanged
              ? {
                  lat: lat ?? null,
                  lng: lng ?? null,
                }
              : {}),
          },
        })

        /* ----------------------------------------------------------
         * 3️⃣ Log history entry if status changed
         * ---------------------------------------------------------- */
        if (input.status !== existing.status) {
          await prisma.vectraOrderHistory.create({
            data: {
              orderId: existing.id,
              changedById: ctx.user!.id,
              statusBefore: existing.status,
              statusAfter: input.status,
              notes: 'Zmieniono status przez edycję zlecenia',
            },
          })
        }

        return updated
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2002') {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Nie można zapisać — kombinacja numeru, adresu i wejścia już istnieje.',
            })
          }
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nieoczekiwany błąd przy edycji zlecenia.',
        })
      }
    }),

  /** ✅ Delete order */
  deleteOrder: adminOrCoord
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: input.id },
          select: { status: true },
        })

        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zlecenie nie istnieje',
          })
        }

        if (order.status === 'COMPLETED' || order.status === 'NOT_COMPLETED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nie można usunąć zlecenia, które zostało już rozliczone.',
          })
        }

        await tx.orderMaterial.deleteMany({ where: { orderId: input.id } })
        await tx.orderEquipment.deleteMany({ where: { orderId: input.id } })
        await tx.orderService.deleteMany({ where: { orderId: input.id } })
        await tx.orderExtraDevice.deleteMany({
          where: {
            service: { orderId: input.id },
          },
        })
        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.id },
        })
        await tx.orderHistory.deleteMany({
          where: { orderId: input.id },
        })

        return tx.order.delete({
          where: { id: input.id },
        })
      })
    }),

  /** ✅ Change order status */
  toggleOrderStatus: adminOrCoord
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(VectraOrderStatus),
      })
    )
    .mutation(async ({ input }) => {
      const order = await prisma.vectraOrder.findUnique({
        where: { id: input.id },
      })
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      return prisma.vectraOrder.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),

  /** ✅ Assign or unassign technician */
  assignTechnician: adminOnly
    .input(
      z.object({
        id: z.string(),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const order = await prisma.vectraOrder.findUnique({
        where: { id: input.id },
      })
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      // ✅ Validate technician existence when assigning
      if (input.assignedToId) {
        const tech = await prisma.user.findUnique({
          where: { id: input.assignedToId },
        })
        if (!tech) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Technik nie istnieje',
          })
        }
      }

      // ✅ Try to geocode if coordinates are missing
      let coords: { lat: number; lng: number } | null = null

      if (order.lat === null && order.lng === null) {
        const variants = [
          `${order.street}, ${order.city}, Polska`,
          `${order.city}, Polska`,
        ]

        for (const v of variants) {
          try {
            const result = await getCoordinatesFromAddress(v)
            if (result) {
              coords = result
              break
            }
          } catch {
            // Fail-safe: ignore geocoding errors
            coords = null
          }
        }
      }

      const newStatus = input.assignedToId
        ? VectraOrderStatus.ASSIGNED
        : VectraOrderStatus.PENDING

      console.info('[assignTechnician]', {
        orderNumber: order.orderNumber,
        city: order.city,
        street: order.street,
        coords,
        existing: { lat: order.lat, lng: order.lng },
      })

      // ✅ Update assignment and store coordinates if newly available
      return prisma.vectraOrder.update({
        where: { id: input.id },
        data: {
          assignedToId: input.assignedToId ?? null,
          status: newStatus,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
        },
      })
    }),

  /** ✅ Technician completes or fails an order (with extra devices support) */
  completeOrder: loggedInEveryone
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(VectraOrderStatus),
        notes: z.string().nullable().optional(),
        failureReason: z.string().nullable().optional(),
        workCodes: z
          .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
          .optional(),
        equipmentIds: z.array(z.string()).optional(),
        usedMaterials: z
          .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
          .optional(),
        issuedDevices: z.array(z.string()).optional(),
        collectedDevices: z
          .array(
            z.object({
              name: z.string(),
              category: z.nativeEnum(DeviceCategory),
              serialNumber: z.string().optional(),
            })
          )
          .optional(),

        services: z
          .array(
            z.object({
              id: z.string(),
              type: z.nativeEnum(ServiceType),
              deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
              deviceName: z.string().optional(),
              deviceType: z.nativeEnum(DeviceCategory).optional(),

              deviceId: z.string().optional(),
              serialNumber: z.string().optional(),
              deviceId2: z.string().optional(),
              deviceName2: z.string().optional(),
              serialNumber2: z.string().optional(),
              speedTest: z.string().optional(),
              usDbmDown: z.coerce.number().optional(),
              usDbmUp: z.coerce.number().optional(),
              notes: z.string().optional(),
              extraDevices: z
                .array(
                  z.object({
                    id: z.string(),
                    source: z.enum(['WAREHOUSE', 'CLIENT']),
                    category: z.nativeEnum(DeviceCategory),
                    name: z.string().optional(),
                    serialNumber: z.string().optional(),
                  })
                )
                .optional(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      console.log(input.services)

      const warnings: string[] = []

      // ----------- Validate order and technician permissions -----------
      const order = await prisma.vectraOrder.findUnique({
        where: { id: input.orderId },
        select: { id: true, assignedToId: true, type: true },
      })
      if (!order)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      if (order.assignedToId !== userId)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Nie masz dostępu do tego zlecenia',
        })
      if (
        input.status === VectraOrderStatus.COMPLETED &&
        order.type === VectraOrderType.INSTALATION &&
        (!input.workCodes || input.workCodes.length === 0)
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Brak dodanych kodów pracy dla instalacji',
        })
      }

      await prisma.$transaction(async (tx) => {
        /* -------------------------------------------------------------------
         * 1️⃣  Update order main info (status, notes, failure reason)
         * ------------------------------------------------------------------- */
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes,
            failureReason:
              input.status === VectraOrderStatus.NOT_COMPLETED
                ? input.failureReason
                : null,
            completedAt: new Date(),
          },
        })

        /* -------------------------------------------------------------------
         * 2️⃣  Reset settlement entries (work codes) for the order
         * ------------------------------------------------------------------- */
        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        /* -------------------------------------------------------------------
         * 3️⃣  Save settlement entries (work codes) if order is completed
         * ------------------------------------------------------------------- */
        if (
          input.status === VectraOrderStatus.COMPLETED &&
          input.workCodes?.length
        ) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((entry) => ({
              orderId: input.orderId,
              code: entry.code,
              quantity: entry.quantity,
            })),
          })
        }

        /* -------------------------------------------------------------------
         * 4️⃣  Save used materials and update technician warehouse stock
         *      (with virtual deficit tracking for technicians)
         * ------------------------------------------------------------------- */
        const { warnings: matWarnings } = await reconcileOrderMaterials({
          tx,
          orderId: input.orderId,
          technicianId: order.assignedToId,
          editorId: userId,
          newMaterials: input.usedMaterials ?? [],
        })
        warnings.push(...matWarnings)

        /* -------------------------------------------------------------------
         * 5️⃣  Assign used devices from technician warehouse (equipmentIds)
         * -------------------------------------------------------------------
         * - Links selected devices to the order (OrderEquipment).
         * - Changes status to ASSIGNED_TO_ORDER.
         * - Always clears assignedToId (device is no longer on technician stock).
         * ------------------------------------------------------------------- */
        if (input.equipmentIds?.length) {
          // 1) Devices already bound to other orders
          const conflictingDevices = await tx.orderEquipment.findMany({
            where: {
              warehouseId: { in: input.equipmentIds },
              orderId: { not: input.orderId },
            },
            include: {
              warehouse: { select: { name: true, serialNumber: true } },
              order: { select: { orderNumber: true } },
            },
          })

          if (conflictingDevices.length > 0) {
            const conflictList = conflictingDevices
              .map(
                (d) =>
                  `${d.warehouse?.name ?? 'Urządzenie'} SN: ${
                    d.warehouse?.serialNumber ?? 'brak'
                  } → zlecenie ${d.order?.orderNumber ?? d.orderId}`
              )
              .join(', ')

            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Niektóre urządzenia są już przypisane do innych zleceń: ' +
                conflictList,
            })
          }

          // 2) Load ALL referenced devices from warehouse (without filters)
          const allDevices = await tx.vectraWarehouse.findMany({
            where: { id: { in: input.equipmentIds } },
            select: {
              id: true,
              name: true,
              category: true,
              status: true,
              assignedToId: true,
              serialNumber: true,
            },
          })

          // Map for easier lookup
          const allById = new Map(allDevices.map((d) => [d.id, d]))

          // Helper: check whether single device is valid
          const isValidDevice = (device: {
            id: string
            category: DeviceCategory | null
            status: string
            assignedToId: string | null
          }): boolean => {
            if (device.assignedToId === userId) return true
            if (device.status === 'ASSIGNED_TO_ORDER') return true
            if (device.status === 'COLLECTED_FROM_CLIENT') return true
            if (device.category === DeviceCategory.OTHER) return true
            return false
          }

          const invalidDetails: string[] = []
          const validIds: string[] = []

          for (const id of input.equipmentIds) {
            const dev = allById.get(id)
            if (!dev) {
              invalidDetails.push(`ID ${id} → brak w magazynie`)
              continue
            }

            if (!isValidDevice(dev)) {
              invalidDetails.push(
                `${dev.name} SN: ${dev.serialNumber ?? 'brak'} (ID: ${
                  dev.id
                }) → status: ${dev.status}, assignedToId: ${
                  dev.assignedToId ?? 'null'
                }, category: ${dev.category}`
              )
              continue
            }

            validIds.push(dev.id)
          }

          if (invalidDetails.length > 0) {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Niektóre urządzenia nie są przypisane do Ciebie lub mają nieprawidłowy status:\n' +
                invalidDetails.join('\n'),
            })
          }

          // 3) Create order-equipment relations tylko dla validIds
          await tx.orderEquipment.createMany({
            data: validIds.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })

          // 4) Update statuses
          await tx.vectraWarehouse.updateMany({
            where: {
              id: { in: validIds },
              NOT: { status: 'COLLECTED_FROM_CLIENT' },
            },
            data: {
              status: 'ASSIGNED_TO_ORDER',
              assignedToId: null,
              locationId: null,
            },
          })

          await tx.warehouseHistory.createMany({
            data: validIds.map((id) => ({
              warehouseItemId: id,
              action: 'ASSIGNED_TO_ORDER',
              performedById: userId,
              assignedOrderId: input.orderId,
              actionDate: new Date(),
            })),
          })
        }

        /* -------------------------------------------------------------------
         * 5a  Issue devices to client (SERVICE / OUTAGE) - explicit issuedDevices
         * -------------------------------------------------------------------
         * - Devices are taken from technician stock.
         * - They are linked to the order and detached from technician.
         * ------------------------------------------------------------------- */
        if (input.issuedDevices?.length) {
          const toIssue = await tx.vectraWarehouse.findMany({
            where: {
              id: { in: input.issuedDevices },
              assignedToId: userId,
              itemType: 'DEVICE',
              status: { in: ['AVAILABLE', 'ASSIGNED', 'ASSIGNED_TO_ORDER'] },
            },
            select: { id: true },
          })
          if (toIssue.length !== input.issuedDevices.length) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Niektóre wydawane urządzenia nie są na Twoim stanie.',
            })
          }

          // Link issued devices to order
          await tx.orderEquipment.createMany({
            data: input.issuedDevices.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })

          // Detach issued devices from technician and mark as assigned to order
          await tx.vectraWarehouse.updateMany({
            where: { id: { in: input.issuedDevices } },
            data: {
              status: 'ASSIGNED_TO_ORDER',
              assignedToId: null,
              locationId: null,
            },
          })

          // History entries for devices issued to client (assigned to order)
          await tx.warehouseHistory.createMany({
            data: input.issuedDevices.map((id) => ({
              warehouseItemId: id,
              action: 'ASSIGNED_TO_ORDER', // kept for consistency with existing workflow
              performedById: userId,
              assignedOrderId: input.orderId,
              actionDate: new Date(),
            })),
          })
        }

        /* -------------------------------------------------------------------
         * 6️⃣  Save devices collected from client (reuse existing if serial exists)
         * -------------------------------------------------------------------
         */
        if (input.collectedDevices?.length) {
          for (const device of input.collectedDevices) {
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
            const w = await tx.vectraWarehouse.create({
              data: {
                itemType: 'DEVICE',
                name: device.name,
                category: device.category,
                serialNumber: device.serialNumber?.trim().toUpperCase(),
                quantity: 1,
                price: 0,
                status: 'COLLECTED_FROM_CLIENT',
                assignedToId: userId,
              },
            })
            await tx.vectraOrderEquipment.create({
              data: { orderId: input.orderId, warehouseId: w.id },
            })
            await tx.warehouseHistory.create({
              data: {
                warehouseItemId: w.id,
                action: 'COLLECTED_FROM_CLIENT',
                performedById: userId,
                assignedToId: userId,
                assignedOrderId: input.orderId,
              },
            })
=======
            const serial = device.serialNumber?.trim().toUpperCase() ?? null

            const technicianId = order.assignedToId ?? userId

            const existing = serial
              ? await tx.warehouse.findFirst({
                  where: {
                    itemType: 'DEVICE',
                    serialNumber: serial,
                  },
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                })
              : null

            if (existing) {
              await tx.warehouse.update({
                where: { id: existing.id },
                data: {
                  name: device.name || existing.name,
                  category: device.category ?? existing.category,
                  serialNumber: serial,
                  status: 'COLLECTED_FROM_CLIENT',
                  assignedToId: technicianId,
                },
              })
              await tx.orderEquipment.upsert({
                where: {
                  orderId_warehouseId: {
                    orderId: input.orderId,
                    warehouseId: existing.id,
                  },
                },
                create: {
                  orderId: input.orderId,
                  warehouseId: existing.id,
                },
                update: {},
              })
              await tx.warehouseHistory.create({
                data: {
                  warehouseItemId: existing.id,
                  action: 'COLLECTED_FROM_CLIENT',
                  performedById: userId,
                  assignedToId: technicianId,
                  assignedOrderId: input.orderId,
                  actionDate: new Date(),
                },
              })
            } else {
              const created = await tx.warehouse.create({
                data: {
                  itemType: 'DEVICE',
                  name: device.name,
                  category: device.category,
                  serialNumber: serial,
                  quantity: 1,
                  price: 0,
                  status: 'COLLECTED_FROM_CLIENT',
                  assignedToId: technicianId,
                },
                select: { id: true },
              })

              await tx.orderEquipment.create({
                data: { orderId: input.orderId, warehouseId: created.id },
              })

              await tx.warehouseHistory.create({
                data: {
                  warehouseItemId: created.id,
                  action: 'COLLECTED_FROM_CLIENT',
                  performedById: userId,
                  assignedToId: technicianId,
                  assignedOrderId: input.orderId,
                  actionDate: new Date(),
                },
              })
            }
>>>>>>> main:src/server/routers/order/mutations.ts
          }
        }

        /* -------------------------------------------------------------------
         * 7️⃣  Save measurement/services + extra devices
         * -------------------------------------------------------------------
         * - Clears previous services for this order.
         * - Stores NET/DTV/TEL/ATV services with device metadata.
         * - Handles extra devices (e.g. additional routers or modems).
         * ------------------------------------------------------------------- */
        if (input.status === VectraOrderStatus.COMPLETED) {
          await tx.orderService.deleteMany({
            where: { orderId: input.orderId },
          })

          if (input.services.length) {
            const servicesData = await mapServicesWithDeviceTypes(
              tx,
              input.services,
              input.orderId
            )

            for (const s of servicesData) {
              // Create main service entry (with deviceSource & deviceName support)
              const createdService = await tx.orderService.create({
                data: {
                  orderId: s.orderId,
                  type: s.type,
                  deviceId: s.deviceId,
                  serialNumber: s.serialNumber,
                  deviceId2: s.deviceId2,
                  serialNumber2: s.serialNumber2,
                  deviceType: s.deviceType,
                  deviceType2: s.deviceType2,
                  deviceSource: s.deviceSource ?? null,
                  deviceName: s.deviceName ?? null,
                  deviceName2: s.deviceName2 ?? null,
                  speedTest: s.speedTest,
                  usDbmDown: s.usDbmDown,
                  usDbmUp: s.usDbmUp,
                  notes: s.notes,
                },
              })

              // Handle extra devices attached to this service (e.g., additional routers)
              if (s.extraDevices?.length) {
                await tx.orderExtraDevice.createMany({
                  data: s.extraDevices.map((ex) => ({
                    serviceId: createdService.id,
                    warehouseId: ex.id,
                    source: ex.source,
                    name: ex.name ?? '',
                    serialNumber: ex.serialNumber ?? undefined,
                    category: ex.category ?? undefined,
                  })),
                })

                // ✅ Mark extra devices taken from technician warehouse as assigned to order
                const usedExtraSerials = s.extraDevices
                  .filter((ex) => ex.source === 'WAREHOUSE' && ex.serialNumber)
                  .map((ex) => ex.serialNumber!.trim().toUpperCase())

                if (usedExtraSerials.length > 0) {
                  const matched = await tx.vectraWarehouse.findMany({
                    where: {
                      assignedToId: userId,
                      itemType: 'DEVICE',
                      serialNumber: { in: usedExtraSerials },
                      status: { in: ['AVAILABLE', 'ASSIGNED'] },
                    },
                    select: { id: true },
                  })

                  if (matched.length) {
                    await tx.vectraWarehouse.updateMany({
                      where: {
                        id: { in: matched.map((m) => m.id) },
                        NOT: { status: 'COLLECTED_FROM_CLIENT' },
                      },
                      data: {
                        status: 'ASSIGNED_TO_ORDER',
                        assignedToId: null, // extra device is now bound to the order, not to technician
                        locationId: null,
                      },
                    })

                    await tx.warehouseHistory.createMany({
                      data: matched.map((m) => ({
                        warehouseItemId: m.id,
                        action: 'ASSIGNED_TO_ORDER',
                        performedById: userId,
                        assignedOrderId: input.orderId,
                        actionDate: new Date(),
                      })),
                    })
                  }
                }
              }
            }
          }
        }
      })

      return { success: true, warnings }
    }),

  /** ✅ Technician amendment of completed order (≤15 min window) */
  amendCompletion: loggedInEveryone
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(VectraOrderStatus),
        notes: z.string().nullable().optional(),
        failureReason: z.string().nullable().optional(),
        workCodes: z
          .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
          .optional(),
        equipmentIds: z.array(z.string()).optional(),
        usedMaterials: z
          .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
          .optional(),
        collectedDevices: z
          .array(
            z.object({
              name: z.string(),
              category: z.nativeEnum(DeviceCategory),
              serialNumber: z.string().optional(),
            })
          )
          .optional(),
        services: z
          .array(
            z.object({
              id: z.string(),
              type: z.nativeEnum(ServiceType),
              deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
              deviceName: z.string().optional(),
              deviceType: z.nativeEnum(DeviceCategory).optional(),
              deviceId: z.string().optional(),
              serialNumber: z.string().optional(),
              deviceId2: z.string().optional(),
              deviceName2: z.string().optional(),
              serialNumber2: z.string().optional(),
              speedTest: z.string().optional(),
              usDbmDown: z.coerce.number().optional(),
              usDbmUp: z.coerce.number().optional(),
              notes: z.string().optional(),
              extraDevices: z
                .array(
                  z.object({
                    id: z.string(),
                    source: z.enum(['WAREHOUSE', 'CLIENT']),
                    category: z.nativeEnum(DeviceCategory),
                    name: z.string().optional(),
                    serialNumber: z.string().optional(),
                  })
                )
                .optional(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      // ⏱ enforce 15-min window + technician ownership
      await canTechnicianAmend(prisma, input.orderId, userId)

      await prisma.$transaction(async (tx) => {
        /* -------------------------------------------------------------------
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
         * Step 1️⃣ — Fetch previously assigned equipment
         * Used later to detect removed devices.
         * ------------------------------------------------------------------- */
        const prevEquip = await tx.vectraWarehouse.findMany({
          where: {
            orderAssignments: { some: { orderId: input.orderId } },
            itemType: 'DEVICE',
          },
          select: { id: true, assignedToId: true },
        })

        /* -------------------------------------------------------------------
         * Step 2️⃣ — Clear previous work (materials, services, equipment)
=======
         * Step 1️⃣ — Clear previous non-collected equipment, services, work codes
>>>>>>> main:src/server/routers/order/mutations.ts
         * ------------------------------------------------------------------- */
        await tx.orderEquipment.deleteMany({
          where: {
            orderId: input.orderId,
            warehouse: {
              status: { not: WarehouseStatus.COLLECTED_FROM_CLIENT },
            },
          },
        })

        await tx.orderService.deleteMany({ where: { orderId: input.orderId } })
        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        const prevOrder = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { status: true },
        })

        /* -------------------------------------------------------------------
         * Step 2️⃣ — Update order fields
         * ------------------------------------------------------------------- */
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === VectraOrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
          },
        })

        /* -------------------------------------------------------------------
         * Step 3️⃣ — Rewrite work codes
         * ------------------------------------------------------------------- */
        if (
          input.status === VectraOrderStatus.COMPLETED &&
          input.workCodes?.length
        ) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((w) => ({
              orderId: input.orderId,
              code: w.code,
              quantity: w.quantity,
            })),
          })
        }

        /* -------------------------------------------------------------------
         * Step 4️⃣ — Material reconciliation
         * ------------------------------------------------------------------- */
        await reconcileOrderMaterials({
          tx,
          orderId: input.orderId,
          technicianId: userId,
          editorId: userId,
          newMaterials: input.usedMaterials ?? [],
        })

        /* -------------------------------------------------------------------
         * Step 5️⃣ — Equipment delta (technician)
         * -------------------------------------------------------------------
         * Only change: technician cannot add devices not assigned to him.
         * processEquipmentDelta enforces this automatically.
         * ------------------------------------------------------------------- */
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        const newSet = new Set(input.equipmentIds ?? [])

        for (const old of prevEquip) {
          if (newSet.has(old.id)) continue // still used, skip

          // Always determine original owner from history
          const lastAssign = await tx.warehouseHistory.findFirst({
            where: {
              warehouseItemId: old.id,
              action: 'ASSIGNED_TO_ORDER',
              assignedOrderId: input.orderId,
            },
            orderBy: { actionDate: 'desc' },
            select: { assignedToId: true },
          })

          const ownerId = lastAssign?.assignedToId ?? null

          const returnStatus = ownerId ? 'ASSIGNED' : 'AVAILABLE'
          const returnAction = ownerId ? 'RETURNED_TO_TECHNICIAN' : 'RETURNED'

          await tx.vectraWarehouse.update({
            where: { id: old.id },
            data: {
              status: returnStatus,
              assignedToId: ownerId,
              history: {
                create: {
                  action: returnAction,
                  actionDate: new Date(),
                  performedById: userId,
                  assignedOrderId: input.orderId,
                  assignedToId: ownerId,
                },
              },
            },
          })
        }
=======
        await processEquipmentDelta({
          tx,
          orderId: input.orderId,
          newEquipmentIds: input.equipmentIds ?? [],
          technicianId: userId,
          editorId: userId,
          mode: 'AMEND',
        })
>>>>>>> main:src/server/routers/order/mutations.ts

        /* -------------------------------------------------------------------
         * Step 6️⃣ — Collected devices rollback (identical to admin-edit)
         * -------------------------------------------------------------------
         * Technician must:
         *   - remove wrongly collected devices
         *   - add new collected devices
         *   - rollback system state if he removes collected device
         *
         * EXACTLY the same logic as admin-edit.
         * ------------------------------------------------------------------- */
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        if (input.equipmentIds?.length) {
          const assigned = await tx.vectraWarehouse.findMany({
            where: { id: { in: input.equipmentIds }, assignedToId: userId },
          })

          await tx.orderEquipment.createMany({
            data: assigned.map((d) => ({
              orderId: input.orderId,
              warehouseId: d.id,
            })),
          })

          for (const eq of assigned) {
            await tx.vectraWarehouse.update({
              where: { id: eq.id },
              data: {
                status: 'ASSIGNED_TO_ORDER',
                assignedToId: null,
                history: {
                  create: {
                    action: 'ASSIGNED_TO_ORDER',
                    actionDate: new Date(),
                    performedById: userId,
                    assignedOrderId: input.orderId,
                  },
                },
              },
            })
          }
=======

        const normalizeSerial = (serial?: string | null): string | null => {
          if (!serial) return null
          const s = serial.trim().toUpperCase()
          return s.length ? s : null
>>>>>>> main:src/server/routers/order/mutations.ts
        }

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        const prevCollectedTech = await tx.vectraWarehouse.findMany({
=======
        const prevCollected = await tx.warehouse.findMany({
>>>>>>> main:src/server/routers/order/mutations.ts
          where: {
            itemType: 'DEVICE',
            status: WarehouseStatus.COLLECTED_FROM_CLIENT,
            orderAssignments: { some: { orderId: input.orderId } },
          },
          select: { id: true, serialNumber: true },
        })

        const prevCollectedBySerial = new Map(
          prevCollected
            .map((d) => [normalizeSerial(d.serialNumber), d.id] as const)
            .filter(([s]) => s !== null)
        )

        const newCollected = input.collectedDevices ?? []
        const newSerials = new Set(
          newCollected
            .map((d) => normalizeSerial(d.serialNumber))
            .filter((s): s is string => s !== null)
        )

        // 🔥 removed collected devices
        const removedCollectedIds = [...prevCollectedBySerial.entries()]
          .filter(([serial]) => !newSerials.has(serial!))
          .map(([, id]) => id)

        for (const wid of removedCollectedIds) {
          // unlink
          await tx.orderEquipment.deleteMany({
            where: { orderId: input.orderId, warehouseId: wid },
          })

          const lastCollected = await tx.warehouseHistory.findFirst({
            where: {
              warehouseItemId: wid,
              action: WarehouseAction.COLLECTED_FROM_CLIENT,
              assignedOrderId: input.orderId,
            },
            orderBy: { actionDate: 'desc' },
          })

          if (!lastCollected) continue

          // remove history for this collection
          await tx.warehouseHistory.deleteMany({
            where: {
              warehouseItemId: wid,
              action: WarehouseAction.COLLECTED_FROM_CLIENT,
              assignedOrderId: input.orderId,
              actionDate: lastCollected.actionDate,
            },
          })

          const previousState = await tx.warehouseHistory.findFirst({
            where: {
              warehouseItemId: wid,
              actionDate: { lt: lastCollected.actionDate },
            },
            orderBy: { actionDate: 'desc' },
          })

          if (!previousState) {
            // delete temporary device
            await tx.warehouseHistory.deleteMany({
              where: { warehouseItemId: wid },
            })
            await tx.warehouse.delete({ where: { id: wid } })
          } else {
            let restoredStatus: WarehouseStatus

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
            // 3️⃣ Remove device itself
            await tx.vectraWarehouse.delete({
              where: { id: old.id },
=======
            switch (previousState.action) {
              case WarehouseAction.RETURNED_TO_TECHNICIAN:
                restoredStatus = WarehouseStatus.ASSIGNED
                break
              case WarehouseAction.RETURNED:
              case WarehouseAction.RECEIVED:
                restoredStatus = WarehouseStatus.AVAILABLE
                break
              default:
                restoredStatus = WarehouseStatus.ASSIGNED_TO_ORDER
                break
            }

            await tx.warehouse.update({
              where: { id: wid },
              data: {
                status: restoredStatus,
                assignedToId: previousState.assignedToId ?? null,
                ...(previousState.assignedToId ? { locationId: null } : {}),
              },
>>>>>>> main:src/server/routers/order/mutations.ts
            })
          }
        }

        // 🔥 add/update collected devices
        for (const d of newCollected) {
          const serial = normalizeSerial(d.serialNumber)
          let wid: string | null = null

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
          const existing = serial
            ? await tx.vectraWarehouse.findFirst({
                where: {
                  serialNumber: serial,
                  status: 'COLLECTED_FROM_CLIENT',
                  assignedToId: userId,
                },
=======
          const exists = serial
            ? await tx.warehouse.findFirst({
                where: { serialNumber: serial },
>>>>>>> main:src/server/routers/order/mutations.ts
                select: { id: true },
              })
            : null

          if (exists) {
            wid = exists.id

            await tx.warehouse.update({
              where: { id: wid },
              data: {
                name: d.name,
                category: d.category,
                serialNumber: serial,
                status: WarehouseStatus.COLLECTED_FROM_CLIENT,
                assignedToId: userId,
                locationId: null,
                history: {
                  create: {
                    action: WarehouseAction.COLLECTED_FROM_CLIENT,
                    performedById: userId,
                    assignedOrderId: input.orderId,
                    assignedToId: userId,
                  },
                },
              },
            })
          } else {
            const created = await tx.warehouse.create({
              data: {
                itemType: 'DEVICE',
                name: d.name,
                category: d.category,
                serialNumber: serial,
                quantity: 1,
                price: 0,
                status: WarehouseStatus.COLLECTED_FROM_CLIENT,
                assignedToId: userId,
              },
              select: { id: true },
            })

            wid = created.id

            await tx.warehouseHistory.create({
              data: {
                warehouseItemId: wid,
                action: WarehouseAction.COLLECTED_FROM_CLIENT,
                performedById: userId,
                assignedOrderId: input.orderId,
                assignedToId: userId,
              },
            })
          }

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
          const created = await tx.vectraWarehouse.create({
            data: {
              itemType: 'DEVICE',
              name: d.name,
              category: d.category,
              serialNumber: serial,
              quantity: 1,
              price: 0,
              status: 'COLLECTED_FROM_CLIENT',
              assignedToId: userId,
            },
            select: { id: true },
          })

          await tx.vectraOrderEquipment.create({
            data: {
              orderId: input.orderId,
              warehouseId: created.id,
            },
          })

          await tx.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'COLLECTED_FROM_CLIENT',
              performedById: userId,
              assignedOrderId: input.orderId,
=======
          await tx.orderEquipment.upsert({
            where: {
              orderId_warehouseId: {
                orderId: input.orderId,
                warehouseId: wid!,
              },
>>>>>>> main:src/server/routers/order/mutations.ts
            },
            create: { orderId: input.orderId, warehouseId: wid! },
            update: {},
          })
        }

        /* -------------------------------------------------------------------
         * Step 7️⃣ — Services and extra devices
         * ------------------------------------------------------------------- */
        if (
          input.status === VectraOrderStatus.COMPLETED &&
          input.services.length
        ) {
          const servicesData = await mapServicesWithDeviceTypes(
            tx,
            input.services,
            input.orderId
          )

          for (const s of servicesData) {
            const created = await tx.orderService.create({
              data: {
                orderId: s.orderId,
                type: s.type,
                deviceId: s.deviceId,
                serialNumber: s.serialNumber,
                deviceId2: s.deviceId2,
                serialNumber2: s.serialNumber2,
                deviceName2: s.deviceName2,
                deviceType: s.deviceType,
                deviceType2: s.deviceType2,
                deviceSource: s.deviceSource ?? null,
                deviceName: s.deviceName ?? null,
                speedTest: s.speedTest,
                usDbmDown: s.usDbmDown,
                usDbmUp: s.usDbmUp,
                notes: s.notes,
              },
            })

            if (s.extraDevices?.length) {
              await tx.orderExtraDevice.createMany({
                data: s.extraDevices.map((ex) => ({
                  serviceId: created.id,
                  warehouseId: ex.id,
                  source: ex.source,
                  name: ex.name ?? '',
                  serialNumber: ex.serialNumber ?? undefined,
                  category: ex.category,
                })),
              })
<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts

              // Extra devices from technician → mark as assigned to order
              const usedSerials = s.extraDevices
                .filter((ex) => ex.source === 'WAREHOUSE' && ex.serialNumber)
                .map((ex) => ex.serialNumber!.trim().toUpperCase())

              if (usedSerials.length > 0) {
                const matched = await tx.vectraWarehouse.findMany({
                  where: {
                    assignedToId: userId,
                    itemType: 'DEVICE',
                    serialNumber: { in: usedSerials },
                    status: { in: ['AVAILABLE', 'ASSIGNED'] },
                  },
                  select: { id: true },
                })

                if (matched.length) {
                  await tx.vectraWarehouse.updateMany({
                    where: {
                      id: { in: matched.map((m) => m.id) },
                      NOT: { status: 'COLLECTED_FROM_CLIENT' },
                    },
                    data: {
                      status: 'ASSIGNED_TO_ORDER',
                      assignedToId: null,
                      locationId: null,
                    },
                  })

                  await tx.warehouseHistory.createMany({
                    data: matched.map((m) => ({
                      warehouseItemId: m.id,
                      action: 'ASSIGNED_TO_ORDER',
                      performedById: userId,
                      assignedOrderId: input.orderId,
                      actionDate: new Date(),
                    })),
                  })
                }
              }
=======
>>>>>>> main:src/server/routers/order/mutations.ts
            }
          }
        }

        /* -------------------------------------------------------------------
         * Step 8️⃣ — Log amendment
         * ------------------------------------------------------------------- */
        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            statusBefore: prevOrder?.status ?? VectraOrderStatus.PENDING,
            statusAfter: input.status,
            changedById: userId,
            notes: 'Zlecenie edytowane przez technika.',
          },
        })
      })

      return { success: true }
    }),

  /** 🛠️ Admin/Coordinator edit of completed order (full stock + history sync) */
  adminEditCompletion: adminOrCoord
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(VectraOrderStatus),
        notes: z.string().nullable().optional(),
        failureReason: z.string().nullable().optional(),
        workCodes: z
          .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
          .optional(),
        equipmentIds: z.array(z.string()).optional(),
        usedMaterials: z
          .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
          .optional(),
        collectedDevices: z
          .array(
            z.object({
              name: z.string(),
              category: z.nativeEnum(DeviceCategory),
              serialNumber: z.string().optional(),
            })
          )
          .optional(),
        services: z
          .array(
            z.object({
              id: z.string(),
              type: z.nativeEnum(ServiceType),
              deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
              deviceName: z.string().optional(),
              deviceType: z.nativeEnum(DeviceCategory).optional(),
              deviceId: z.string().optional(),
              serialNumber: z.string().optional(),
              deviceId2: z.string().optional(),
              deviceName2: z.string().optional(),
              serialNumber2: z.string().optional(),
              speedTest: z.string().optional(),
              usDbmDown: z.coerce.number().optional(),
              usDbmUp: z.coerce.number().optional(),
              notes: z.string().optional(),
              extraDevices: z
                .array(
                  z.object({
                    id: z.string(),
                    source: z.enum(['WAREHOUSE', 'CLIENT']),
                    category: z.nativeEnum(DeviceCategory),
                    name: z.string().optional(),
                    serialNumber: z.string().optional(),
                  })
                )
                .optional(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const adminId = ctx.user?.id
      const adminName = ctx.user?.name
      if (!adminId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      await prisma.$transaction(async (tx) => {
        /* -------------------------------------------------------------------
         * Step 1️⃣ — Clear ALL order-related records
         * -------------------------------------------------------------------
         * Removing old materials, services, equipment, settlement entries.
         * This endpoint ALWAYS rebuilds the final state fully.
         * ------------------------------------------------------------------- */

        await tx.orderEquipment.deleteMany({
          where: {
            orderId: input.orderId,
            warehouse: { status: { not: 'COLLECTED_FROM_CLIENT' } },
          },
        })
        await tx.orderService.deleteMany({ where: { orderId: input.orderId } })
        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        /* -------------------------------------------------------------------
         * Step 2️⃣ — Load previous order info
         * ------------------------------------------------------------------- */
        const previous = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { status: true, assignedToId: true, type: true },
        })

        const assignedTechId = previous?.assignedToId ?? null

        /* -------------------------------------------------------------------
         * Step 3️⃣ — Update main order fields
         * ------------------------------------------------------------------- */
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === VectraOrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
            closedAt:
              previous?.type === VectraOrderType.INSTALATION
                ? undefined
                : new Date(),
          },
        })

        /* -------------------------------------------------------------------
         * Step 4️⃣ — Apply work codes
         * ------------------------------------------------------------------- */
        if (
          input.status === VectraOrderStatus.COMPLETED &&
          input.workCodes?.length
        ) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((w) => ({
              orderId: input.orderId,
              code: w.code,
              quantity: w.quantity,
            })),
          })
        }
        /* -------------------------------------------------------------------
         * Step 5️⃣ — Reconcile material usage (admin full rewrite)
         * -------------------------------------------------------------------
         */
        await reconcileOrderMaterials({
          tx,
          orderId: input.orderId,
          technicianId: assignedTechId,
          editorId: adminId,
          newMaterials: input.usedMaterials ?? [],
        })

        /* -------------------------------------------------------------------
         * Step 6️⃣ — HANDLE EQUIPMENT
         * -------------------------------------------------------------------
         * Main rule:
         *  • all new equipment → ASSIGNED_TO_ORDER + assignedToId = null
         *  • removed equipment → returned to previous owner using WarehouseHistory
         * ------------------------------------------------------------------- */

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        const prevCollected = await tx.vectraWarehouse.findMany({
=======
        await processEquipmentDelta({
          tx,
          orderId: input.orderId,
          newEquipmentIds: input.equipmentIds ?? [],
          technicianId: assignedTechId,
          editorId: adminId,
          mode: 'ADMIN',
        })
        /* -------------------------------------------------------------------
         * Step 7️⃣ — Sync collected devices (returned from client) — SAFE VERSION
         * ------------------------------------------------------------------- */

        // Helper to normalize serial numbers (consistent comparisons)
        const normalizeSerial = (
          serial: string | null | undefined
        ): string | null => {
          if (!serial) return null
          const trimmed = serial.trim()
          return trimmed.length === 0 ? null : trimmed.toUpperCase()
        }

        const assignedTechIdForCollected = previous?.assignedToId ?? null

        // 1️⃣ Previously collected devices for this order
        const prevCollectedDevices = await tx.warehouse.findMany({
>>>>>>> main:src/server/routers/order/mutations.ts
          where: {
            itemType: 'DEVICE',
            status: WarehouseStatus.COLLECTED_FROM_CLIENT,
            orderAssignments: { some: { orderId: input.orderId } },
          },
          select: {
            id: true,
            serialNumber: true,
          },
        })

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
        const newCollectedSerials = (input.collectedDevices ?? [])
          .map((d) => d.serialNumber?.trim().toUpperCase() ?? null)
          .filter((s): s is string => typeof s === 'string' && s.length > 0)

        for (const old of prevCollected) {
          const stillExists = newCollectedSerials.includes(
            old.serialNumber?.trim().toUpperCase() ?? ''
          )

          if (!stillExists) {
            await tx.orderEquipment.deleteMany({
              where: {
                orderId: input.orderId,
                warehouseId: old.id,
              },
            })

            await tx.warehouseHistory.deleteMany({
              where: { warehouseItemId: old.id },
            })

            await tx.vectraWarehouse.delete({
              where: { id: old.id },
            })
          }
        }

        // Fetch previously assigned devices to detect removed ones
        const prevDevices = await tx.vectraWarehouse.findMany({
          where: {
            orderAssignments: { some: { orderId: input.orderId } },
            itemType: 'DEVICE',
            status: { not: 'COLLECTED_FROM_CLIENT' },
          },
          select: { id: true },
        })
=======
        const prevCollectedBySerial = new Map<string, string>() // serial → warehouseId
        for (const dev of prevCollectedDevices) {
          const normalized = normalizeSerial(dev.serialNumber)
          if (normalized) {
            prevCollectedBySerial.set(normalized, dev.id)
          }
        }

        // 2️⃣ Current list of collected devices from input
        const collectedInput = input.collectedDevices ?? []
>>>>>>> main:src/server/routers/order/mutations.ts

        const newSerials = collectedInput
          .map((d) => normalizeSerial(d.serialNumber))
          .filter((s): s is string => s !== null)

        const newSerialSet = new Set<string>(newSerials)

        // 3️⃣ Calculate which previously collected devices were REMOVED
        const removedCollectedIds: string[] = []
        for (const [serial, warehouseId] of prevCollectedBySerial.entries()) {
          if (!newSerialSet.has(serial)) {
            removedCollectedIds.push(warehouseId)
          }
        }

        // 3a️⃣ Rollback for removed collected devices
        for (const wid of removedCollectedIds) {
          // a) Unlink device from current order
          await tx.orderEquipment.deleteMany({
            where: {
              orderId: input.orderId,
              warehouseId: wid,
            },
          })

          // b) Find last COLLECTED_FROM_CLIENT entry for THIS order
          const lastCollected = await tx.warehouseHistory.findFirst({
            where: {
              warehouseItemId: wid,
              action: WarehouseAction.COLLECTED_FROM_CLIENT,
              assignedOrderId: input.orderId,
            },
            orderBy: { actionDate: 'desc' },
          })

<<<<<<< HEAD:src/server/routers/vectra-crm/order/mutations.ts
          const ownerId = lastAssign?.assignedToId ?? null

          const returnStatus = ownerId ? 'ASSIGNED' : 'AVAILABLE'
          const returnAction = ownerId ? 'RETURNED_TO_TECHNICIAN' : 'RETURNED'

          await tx.vectraWarehouse.update({
            where: { id: oldId },
            data: {
              status: returnStatus,
              assignedToId: ownerId,
              history: {
                create: {
                  action: returnAction,
                  actionDate: new Date(),
                  performedById: adminId,
                  assignedOrderId: input.orderId,
                  assignedToId: ownerId,
                },
              },
            },
          })
        }

        // 2️⃣ Assign new selected devices
        if (input.equipmentIds?.length) {
          const equipmentItems = await tx.vectraWarehouse.findMany({
            where: { id: { in: input.equipmentIds } },
            select: { id: true },
          })

          // Create order-equipment links
          await tx.orderEquipment.createMany({
            data: equipmentItems.map((eq) => ({
              orderId: input.orderId,
              warehouseId: eq.id,
            })),
          })

          // Set devices as bound to order
          await tx.vectraWarehouse.updateMany({
            where: { id: { in: input.equipmentIds } },
            data: {
              status: 'ASSIGNED_TO_ORDER',
              assignedToId: null,
              locationId: null,
            },
          })

          await tx.warehouseHistory.createMany({
            data: equipmentItems.map((eq) => ({
              warehouseItemId: eq.id,
              action: 'ASSIGNED_TO_ORDER',
              performedById: adminId,
              assignedOrderId: input.orderId,
              actionDate: new Date(),
            })),
          })
        }

        /* -------------------------------------------------------------------
         * Step 7️⃣ — Sync collected devices (returned from client)
         * ------------------------------------------------------------------- */
        for (const d of input.collectedDevices ?? []) {
          const serial = d.serialNumber?.trim().toUpperCase() ?? null

          const existing = serial
            ? await tx.vectraWarehouse.findFirst({
                where: {
                  serialNumber: serial,
                  status: 'COLLECTED_FROM_CLIENT',
                  assignedToId: assignedTechId,
                },
                select: { id: true },
              })
            : null

          if (existing) {
            await tx.orderEquipment.upsert({
              where: {
                orderId_warehouseId: {
                  orderId: input.orderId,
                  warehouseId: existing.id,
                },
              },
              create: {
                orderId: input.orderId,
                warehouseId: existing.id,
              },
              update: {},
            })

            continue
          }

          const created = await tx.vectraWarehouse.create({
            data: {
              itemType: 'DEVICE',
              name: d.name,
              category: d.category,
              serialNumber: serial,
              quantity: 1,
              price: 0,
              status: 'COLLECTED_FROM_CLIENT',
              assignedToId: assignedTechId,
            },
            select: { id: true },
          })

          await tx.vectraOrderEquipment.create({
            data: { orderId: input.orderId, warehouseId: created.id },
          })

          await tx.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'COLLECTED_FROM_CLIENT',
              performedById: adminId,
=======
          if (!lastCollected) {
            // No matching history → nothing more to rollback
            continue
          }

          // c) Remove COLLECTED_FROM_CLIENT history entry for this order
          await tx.warehouseHistory.deleteMany({
            where: {
              warehouseItemId: wid,
              action: WarehouseAction.COLLECTED_FROM_CLIENT,
>>>>>>> main:src/server/routers/order/mutations.ts
              assignedOrderId: input.orderId,
              actionDate: lastCollected.actionDate,
            },
          })

          // d) Find history BEFORE this collection (previous state snapshot)
          const previousHistory = await tx.warehouseHistory.findFirst({
            where: {
              warehouseItemId: wid,
              actionDate: { lt: lastCollected.actionDate },
            },
            orderBy: { actionDate: 'desc' },
          })

          if (!previousHistory) {
            // Device existed ONLY as collected on this order → safe to remove
            await tx.warehouseHistory.deleteMany({
              where: { warehouseItemId: wid },
            })
            await tx.warehouse.delete({
              where: { id: wid },
            })
          } else {
            // Device existed earlier (e.g. issued to client) → restore previous state

            let restoredStatus: WarehouseStatus

            switch (previousHistory.action) {
              case WarehouseAction.RETURNED_TO_TECHNICIAN:
                restoredStatus = WarehouseStatus.ASSIGNED
                break
              case WarehouseAction.RETURNED:
              case WarehouseAction.RETURNED_TO_OPERATOR:
              case WarehouseAction.RECEIVED:
                restoredStatus = WarehouseStatus.AVAILABLE
                break
              case WarehouseAction.TRANSFER:
                // After transfer we still treat device as assigned to someone/location
                restoredStatus = WarehouseStatus.ASSIGNED
                break
              default:
                // ASSIGNED_TO_ORDER / ISSUED / ISSUED_TO_CLIENT etc.
                // For your domain this means "still at client (issued from previous order)".
                restoredStatus = WarehouseStatus.ASSIGNED_TO_ORDER
                break
            }

            await tx.warehouse.update({
              where: { id: wid },
              data: {
                status: restoredStatus,
                assignedToId: previousHistory.assignedToId ?? null,
                // When assigning back to a user keep location null
                ...(previousHistory.assignedToId ? { locationId: null } : {}),
              },
            })
          }
        }

        // 4️⃣ Apply current collected devices from input (create / update)
        for (const d of collectedInput) {
          const normalizedSerial = normalizeSerial(d.serialNumber)
          let warehouseId: string

          // Try to reuse any existing device with this serial (system device)
          let existing: { id: string } | null = null
          if (normalizedSerial) {
            existing = await tx.warehouse.findFirst({
              where: {
                itemType: 'DEVICE',
                serialNumber: normalizedSerial,
              },
              select: { id: true },
            })
          }

          if (existing) {
            warehouseId = existing.id

            await tx.warehouse.update({
              where: { id: warehouseId },
              data: {
                name: d.name,
                category: d.category,
                serialNumber: normalizedSerial,
                status: WarehouseStatus.COLLECTED_FROM_CLIENT,
                assignedToId: assignedTechIdForCollected,
                locationId: null,
                history: {
                  create: {
                    action: WarehouseAction.COLLECTED_FROM_CLIENT,
                    performedById: adminId,
                    assignedOrderId: input.orderId,
                    assignedToId: assignedTechIdForCollected,
                  },
                },
              },
            })
          } else {
            // Client device not known before → create new collected device
            const created = await tx.warehouse.create({
              data: {
                itemType: 'DEVICE',
                name: d.name,
                category: d.category,
                serialNumber: normalizedSerial,
                quantity: 1,
                price: 0,
                status: WarehouseStatus.COLLECTED_FROM_CLIENT,
                assignedToId: assignedTechIdForCollected,
              },
              select: { id: true },
            })

            warehouseId = created.id

            await tx.warehouseHistory.create({
              data: {
                warehouseItemId: warehouseId,
                action: WarehouseAction.COLLECTED_FROM_CLIENT,
                performedById: adminId,
                assignedOrderId: input.orderId,
                assignedToId: assignedTechIdForCollected,
              },
            })
          }

          // Always ensure relation with current order
          await tx.orderEquipment.upsert({
            where: {
              orderId_warehouseId: {
                orderId: input.orderId,
                warehouseId,
              },
            },
            create: {
              orderId: input.orderId,
              warehouseId,
            },
            update: {},
          })
        }

        /* -------------------------------------------------------------------
         * Step 8️⃣ — Recreate services and their extra devices
         * ------------------------------------------------------------------- */
        if (
          input.status === VectraOrderStatus.COMPLETED &&
          input.services.length
        ) {
          const servicesData = await mapServicesWithDeviceTypes(
            tx,
            input.services,
            input.orderId
          )

          const prevServices = await tx.orderService.findMany({
            where: { orderId: input.orderId },
          })

          for (const s of servicesData) {
            const old = prevServices.find((ps) => ps.id === s.id)

            const createdService = await tx.orderService.create({
              data: {
                orderId: s.orderId,
                type: s.type,

                deviceId: s.deviceId,
                serialNumber: s.serialNumber,

                deviceId2: s.deviceId2,
                serialNumber2: s.serialNumber2,

                deviceType: s.deviceType,
                deviceType2: s.deviceType2,

                deviceSource: s.deviceSource ?? null,
                deviceName: s.deviceName ?? null,
                deviceName2: s.deviceName2 ?? null,

                speedTest: s.speedTest ?? old?.speedTest ?? null,
                usDbmDown: s.usDbmDown ?? old?.usDbmDown ?? null,
                usDbmUp: s.usDbmUp ?? old?.usDbmUp ?? null,
                notes: s.notes ?? old?.notes ?? null,
              },
            })

            if (s.extraDevices?.length) {
              await tx.orderExtraDevice.createMany({
                data: s.extraDevices.map((ex) => ({
                  serviceId: createdService.id,
                  warehouseId: ex.id,
                  source: ex.source,
                  name: ex.name ?? '',
                  serialNumber: ex.serialNumber ?? undefined,
                  category: ex.category ?? undefined,
                })),
              })

              const usedSerials = s.extraDevices
                .filter((ex) => ex.source === 'WAREHOUSE' && ex.serialNumber)
                .map((ex) => ex.serialNumber!.trim().toUpperCase())

              if (usedSerials.length > 0) {
                const matched = await tx.vectraWarehouse.findMany({
                  where: {
                    itemType: 'DEVICE',
                    serialNumber: { in: usedSerials },
                    status: { in: ['AVAILABLE', 'ASSIGNED'] },
                  },
                })

                await tx.vectraWarehouse.updateMany({
                  where: { id: { in: matched.map((m) => m.id) } },
                  data: {
                    status: 'ASSIGNED_TO_ORDER',
                    assignedToId: null,
                    locationId: null,
                  },
                })

                await tx.warehouseHistory.createMany({
                  data: matched.map((m) => ({
                    warehouseItemId: m.id,
                    action: 'ASSIGNED_TO_ORDER',
                    performedById: adminId,
                    assignedOrderId: input.orderId,
                    actionDate: new Date(),
                  })),
                })
              }
            }
          }
        }

        /* -------------------------------------------------------------------
         * Step 9️⃣ — Log order edit in orderHistory
         * ------------------------------------------------------------------- */
        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            statusBefore: previous?.status ?? VectraOrderStatus.PENDING,
            statusAfter: input.status,
            changedById: adminId,
            notes: `Zlecenie edytowane przez administratora lun koordynatora ${adminName}`,
          },
        })
      })

      return { success: true }
    }),
})
