import { adminOnly, adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import {
  DeviceCategory,
  MaterialUnit,
  OrderCreatedSource,
  OrderStatus,
  OrderType,
  Prisma,
  PrismaClient,
  ServiceType,
  TimeSlot,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { differenceInMinutes } from 'date-fns'
import { z } from 'zod'
import { getUserOrThrow } from '../_helpers/getUserOrThrow'

type DbTx = Prisma.TransactionClient | PrismaClient

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

const normalizeSerial = (sn?: string | null): string | null => {
  if (!sn) return null
  const v = sn.trim().toUpperCase()
  return v.length ? v : null
}

async function getOrCreateCollectedWarehouseItem(opts: {
  tx: DbTx
  name: string
  category: DeviceCategory
  serialNumber?: string | null
  assignToUserId?: string | null
}) {
  const { tx, name, category } = opts
  const serialNormalized = normalizeSerial(opts.serialNumber)

  if (serialNormalized) {
    // Try to reuse existing record to avoid unique-constraint violations
    const existing = await tx.warehouse.findUnique({
      where: { serialNumber: serialNormalized },
      select: { id: true },
    })
    if (existing) return existing.id
  }

  // Create a new record (serial may be null or unique string)
  const created = await tx.warehouse.create({
    data: {
      itemType: 'DEVICE',
      name,
      category,
      serialNumber: serialNormalized,
      quantity: 1,
      price: 0,
      status: 'COLLECTED_FROM_CLIENT',
      // Assign to technician only when action is done by technician
      assignedToId: opts.assignToUserId ?? null,
    },
    select: { id: true },
  })
  return created.id
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
          ? tx.warehouse.findUnique({
              where: { id: s.deviceId },
              select: { category: true },
            })
          : null,
        s.deviceId2
          ? tx.warehouse.findUnique({
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
            source: ex.source,
            category: ex.category,
            name: ex.name ?? null,
            serialNumber: ex.serialNumber ?? null,
          })) ?? [],
      }
    })
  )
}

export const mutationsRouter = router({
  /** ✅ Create new order with full retry logic (attempts + address validation) */
  createOrder: loggedInEveryone
    .input(
      z.object({
        operator: z.string(),
        type: z.nativeEnum(OrderType),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(TimeSlot),
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
        postalCode: z.string(),
        assignedToId: z.string().optional(),
        createdSource: z.nativeEnum(OrderCreatedSource).default('PLANNER'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const userId = user.id
      const normalize = (val?: string | null): string =>
        (val ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toUpperCase()

      const normOrder = normalize(input.orderNumber)
      const normCity = normalize(input.city)
      const normStreet = normalize(input.street)

      // 1️⃣ Validate assigned technician if provided
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

      // 2️⃣ Find the latest existing order with this number
      const existing = await prisma.order.findFirst({
        where: { orderNumber: { equals: normOrder, mode: 'insensitive' } },
        orderBy: { attemptNumber: 'desc' },
      })

      // 3️⃣ If any order exists with this number, validate address and status
      if (existing) {
        const sameAddress =
          normalize(existing.city) === normCity &&
          normalize(existing.street) === normStreet

        // ❌ Same number but different address — forbidden
        if (!sameAddress) {
          throw new TRPCError({
            code: 'CONFLICT',
            message:
              'Numer zlecenia już istnieje, ale z innym adresem. Sprawdź poprawność danych.',
          })
        }

        // ✅ Same number + same address — only allowed if previous was NOT_COMPLETED
        if (existing.status === OrderStatus.NOT_COMPLETED) {
          const nextAttempt = existing.attemptNumber + 1
          const status = input.assignedToId
            ? OrderStatus.ASSIGNED
            : OrderStatus.PENDING

          const newOrder = await prisma.order.create({
            data: {
              operator: input.operator,
              type: input.type,
              orderNumber: normOrder,
              date: new Date(
                `${input.date}T${new Date().toISOString().split('T')[1]}`
              ),
              timeSlot: input.timeSlot,
              clientPhoneNumber: input.clientPhoneNumber ?? null,
              notes: input.notes ?? null,
              county: input.county ?? null,
              municipality: input.municipality ?? null,
              city: input.city,
              street: input.street,
              postalCode: input.postalCode,
              assignedToId: input.assignedToId ?? null,
              createdSource: input.createdSource,
              status,
              attemptNumber: nextAttempt,
              previousOrderId: existing.id,
            },
          })

          await prisma.orderHistory.create({
            data: {
              orderId: newOrder.id,
              changedById: userId,
              statusBefore: status,
              statusAfter: status,
              notes: `Utworzono ponowne podejście (wejście ${nextAttempt})`,
            },
          })

          return newOrder
        }

        // ❌ Same number + same address but previous not NOT_COMPLETED — reject
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'Zlecenie o tym numerze i adresie już istnieje i nie jest oznaczone jako nieskuteczne.',
        })
      }

      // 4️⃣ No existing order — create the first one
      const firstStatus = input.assignedToId
        ? OrderStatus.ASSIGNED
        : OrderStatus.PENDING

      const created = await prisma.order.create({
        data: {
          operator: input.operator,
          type: input.type,
          orderNumber: normOrder,
          date: new Date(input.date),
          timeSlot: input.timeSlot,
          clientPhoneNumber: input.clientPhoneNumber ?? null,
          notes: input.notes ?? null,
          county: input.county ?? null,
          municipality: input.municipality ?? null,
          city: input.city,
          street: input.street,
          postalCode: input.postalCode,
          assignedToId: input.assignedToId ?? null,
          createdSource: input.createdSource,
          status: firstStatus,
          attemptNumber: 1,
          previousOrderId: null,
        },
      })

      await prisma.orderHistory.create({
        data: {
          orderId: created.id,
          changedById: userId,
          statusBefore: OrderStatus.PENDING,
          statusAfter: firstStatus,
          notes: `Utworzono pierwsze wejście (${
            input.createdSource === 'MANUAL' ? 'ręcznie' : 'z planera'
          })`,
        },
      })

      return created
    }),

  /** ✅ Edit existing order (safe chain recalculation with Prisma error logging) */
  editOrder: adminOrCoord
    .input(
      z.object({
        id: z.string(),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(TimeSlot),
        notes: z.string().optional(),
        status: z.nativeEnum(OrderStatus),
        city: z.string(),
        street: z.string(),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const prisma = ctx.prisma

      try {
        const existing = await prisma.order.findUnique({
          where: { id: input.id },
        })
        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zlecenie nie istnieje',
          })
        }

        const normalize = (val: string): string =>
          val
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase()

        const newOrderNumber = normalize(input.orderNumber)
        const newCity = normalize(input.city)
        const newStreet = normalize(input.street)

        const oldOrderNumber = normalize(existing.orderNumber)
        const oldCity = normalize(existing.city)
        const oldStreet = normalize(existing.street)

        const addressChanged =
          newOrderNumber !== oldOrderNumber ||
          newCity !== oldCity ||
          newStreet !== oldStreet

        let attemptNumber = existing.attemptNumber
        let previousOrderId = existing.previousOrderId

        /* ----------------------------------------------------------
         * 1️⃣ Recalculate attempt chain if number/address changed
         * ---------------------------------------------------------- */
        if (addressChanged) {
          const lastOrder = await prisma.order.findFirst({
            where: {
              orderNumber: { equals: newOrderNumber, mode: 'insensitive' },
              city: { equals: newCity, mode: 'insensitive' },
              street: { equals: newStreet, mode: 'insensitive' },
            },
            orderBy: { attemptNumber: 'desc' },
          })

          if (lastOrder && lastOrder.status === 'NOT_COMPLETED') {
            attemptNumber = lastOrder.attemptNumber + 1
            previousOrderId = lastOrder.id
          } else {
            attemptNumber = 1
            previousOrderId = null
          }

          // ✅ Ensure uniqueness — bump attempt if collision
          const conflict = await prisma.order.findFirst({
            where: {
              orderNumber: newOrderNumber,
              city: newCity,
              street: newStreet,
              attemptNumber,
              NOT: { id: existing.id },
            },
          })

          if (conflict) {
            attemptNumber = conflict.attemptNumber + 1
          }
        }

        /* ----------------------------------------------------------
         * 2️⃣ Apply the update
         * ---------------------------------------------------------- */
        const updated = await prisma.order.update({
          where: { id: existing.id },
          data: {
            orderNumber: newOrderNumber,
            date: new Date(input.date),
            timeSlot: input.timeSlot,
            notes: input.notes,
            status: input.status,
            city: input.city,
            street: input.street,
            assignedToId: input.assignedToId ?? null,
            attemptNumber,
            previousOrderId,
          },
        })

        return updated
      } catch (err) {
        // ----------------------------------------------------------
        // 🧠 Prisma error diagnostics
        // ----------------------------------------------------------
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          console.error('PrismaClientKnownRequestError:')
          console.error('Code:', err.code)
          console.error('Message:', err.message)
          console.error('Meta:', err.meta)

          // Handle specific unique constraint case
          if (err.code === 'P2002') {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Nie można zapisać zmian — kombinacja numeru, adresu i wejścia już istnieje.',
            })
          }
        }

        if (err instanceof Prisma.PrismaClientValidationError) {
          console.error('PrismaClientValidationError:')
          console.error(err.message)
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Błąd walidacji danych przy edycji zlecenia.',
          })
        }

        if (err instanceof Error) {
          console.error('Unexpected error in editOrder:', err)
        }

        // Fallback — throw general TRPC error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message:
            'Nieoczekiwany błąd podczas edycji zlecenia. Sprawdź logi serwera.',
        })
      }
    }),

  /** ✅ Delete order */
  deleteOrder: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const order = await prisma.order.findUnique({ where: { id: input.id } })
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }
      return prisma.order.delete({ where: { id: input.id } })
    }),

  /** ✅ Change order status */
  toggleOrderStatus: adminOrCoord
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(OrderStatus),
      })
    )
    .mutation(async ({ input }) => {
      const order = await prisma.order.findUnique({ where: { id: input.id } })
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      return prisma.order.update({
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
      const order = await prisma.order.findUnique({ where: { id: input.id } })
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

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

      const newStatus = input.assignedToId
        ? OrderStatus.ASSIGNED
        : OrderStatus.PENDING

      return prisma.order.update({
        where: { id: input.id },
        data: {
          assignedToId: input.assignedToId ?? null,
          status: newStatus,
        },
      })
    }),

  /** ✅ Technician completes or fails an order (with extra devices support) */
  completeOrder: loggedInEveryone
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(OrderStatus),
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

      const warnings: string[] = []

      // ----------- Validate order and technician permissions -----------
      const order = await prisma.order.findUnique({
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
        input.status === OrderStatus.COMPLETED &&
        order.type === OrderType.INSTALATION &&
        (!input.workCodes || input.workCodes.length === 0)
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Brak dodanych kodów pracy dla instalacji',
        })
      }

      await prisma.$transaction(async (tx) => {
        /* -------------------------------------------------------------------
         * 1️⃣  Update order main info
         * ------------------------------------------------------------------- */
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes,
            failureReason:
              input.status === OrderStatus.NOT_COMPLETED
                ? input.failureReason
                : null,
            completedAt: new Date(),
          },
        })

        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        /* -------------------------------------------------------------------
         * 2️⃣  Save settlement entries (work codes)
         * ------------------------------------------------------------------- */
        if (input.status === OrderStatus.COMPLETED && input.workCodes?.length) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((entry) => ({
              orderId: input.orderId,
              code: entry.code,
              quantity: entry.quantity,
            })),
          })
        }

        /* -------------------------------------------------------------------
         * 3️⃣  Save used materials and update technician warehouse stock
         * ------------------------------------------------------------------- */
        if (input.usedMaterials?.length) {
          const materialDefs = await tx.materialDefinition.findMany({
            where: { id: { in: input.usedMaterials.map((m) => m.id) } },
            select: { id: true, name: true, unit: true },
          })
          const nameMap = new Map(materialDefs.map((d) => [d.id, d.name]))
          const unitMap = new Map(materialDefs.map((d) => [d.id, d.unit]))

          await tx.orderMaterial.createMany({
            data: input.usedMaterials.map((item) => ({
              orderId: input.orderId,
              materialId: item.id,
              quantity: item.quantity,
              unit: (unitMap.get(item.id) as MaterialUnit) ?? 'PIECE',
            })),
          })

          for (const item of input.usedMaterials) {
            const technicianMaterial = await tx.warehouse.findFirst({
              where: {
                materialDefinitionId: item.id,
                assignedToId: userId,
                itemType: 'MATERIAL',
              },
            })

            const materialName = nameMap.get(item.id) ?? `ID: ${item.id}`

            if (!technicianMaterial) {
              warnings.push(`Brak materiału ${materialName} na Twoim stanie.`)
              continue
            }

            const available = technicianMaterial.quantity
            const remaining = Math.max(available - item.quantity, 0)

            if (item.quantity > available) {
              warnings.push(
                `Zużyto ${item.quantity} szt. materiału „${materialName}”, ale na stanie było tylko ${available}.`
              )
            }

            await tx.warehouse.update({
              where: { id: technicianMaterial.id },
              data: { quantity: remaining },
            })
            await tx.warehouseHistory.create({
              data: {
                warehouseItemId: technicianMaterial.id,
                action: 'ISSUED',
                quantity: item.quantity,
                performedById: userId,
                assignedOrderId: input.orderId,
                actionDate: new Date(),
              },
            })
          }
        }

        /* -------------------------------------------------------------------
         * 4️⃣  Assign used devices from technician warehouse
         * ------------------------------------------------------------------- */
        if (input.equipmentIds?.length) {
          const conflictingDevices = await tx.orderEquipment.findMany({
            where: {
              warehouseId: { in: input.equipmentIds },
              orderId: { not: input.orderId },
            },
          })
          if (conflictingDevices.length > 0)
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Niektóre urządzenia są już przypisane do innych zleceń i nie mogą być użyte.',
            })

          const technicianDevices = await tx.warehouse.findMany({
            where: {
              id: { in: input.equipmentIds },
              assignedToId: userId,
              status: { in: ['AVAILABLE', 'ASSIGNED'] },
              NOT: { status: 'COLLECTED_FROM_CLIENT' },
            },
          })
          if (technicianDevices.length !== input.equipmentIds.length)
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Niektóre urządzenia nie są przypisane do Ciebie.',
            })

          await tx.orderEquipment.createMany({
            data: input.equipmentIds.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })
          await tx.warehouse.updateMany({
            where: {
              id: { in: input.equipmentIds },
              NOT: { status: 'COLLECTED_FROM_CLIENT' },
            },
            data: { status: 'ASSIGNED_TO_ORDER' },
          })
        }

        /* -------------------------------------------------------------------
         * 4a  Issue devices to client (SERVICE / OUTAGE)
         * ------------------------------------------------------------------- */
        if (input.issuedDevices?.length) {
          const toIssue = await tx.warehouse.findMany({
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

          await tx.orderEquipment.createMany({
            data: input.issuedDevices.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })

          await tx.warehouse.updateMany({
            where: { id: { in: input.issuedDevices } },
            data: { status: 'ASSIGNED_TO_ORDER', assignedToId: null },
          })

          await tx.warehouseHistory.createMany({
            data: input.issuedDevices.map((id) => ({
              warehouseItemId: id,
              action: 'ASSIGNED_TO_ORDER',
              performedById: userId,
              assignedOrderId: input.orderId,
              actionDate: new Date(),
            })),
          })
        }

        /* -------------------------------------------------------------------
         * 5️⃣  Save devices collected from client (added to technician stock)
         * ------------------------------------------------------------------- */
        if (input.collectedDevices?.length) {
          for (const device of input.collectedDevices) {
            const w = await tx.warehouse.create({
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
            await tx.orderEquipment.create({
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
          }
        }
        /* -------------------------------------------------------------------
         * 6️⃣  Save measurement/services + extra devices
         * ------------------------------------------------------------------- */
        if (input.status === OrderStatus.COMPLETED) {
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
              // 🔹 Create service (with deviceSource & deviceName support)
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

              // 🔹 Create extra devices if present
              if (s.extraDevices?.length) {
                await tx.orderExtraDevice.createMany({
                  data: s.extraDevices.map((ex) => ({
                    serviceId: createdService.id,
                    source: ex.source,
                    name: ex.name ?? '',
                    serialNumber: ex.serialNumber ?? undefined,
                    category: ex.category ?? undefined,
                  })),
                })

                // ✅ Remove used extra devices (from technician warehouse)
                const usedExtraSerials = s.extraDevices
                  .filter((ex) => ex.source === 'WAREHOUSE' && ex.serialNumber)
                  .map((ex) => ex.serialNumber!.trim().toUpperCase())

                if (usedExtraSerials.length > 0) {
                  const matched = await tx.warehouse.findMany({
                    where: {
                      assignedToId: userId,
                      itemType: 'DEVICE',
                      serialNumber: { in: usedExtraSerials },
                      status: { in: ['AVAILABLE', 'ASSIGNED'] },
                    },
                    select: { id: true },
                  })

                  if (matched.length) {
                    await tx.warehouse.updateMany({
                      where: {
                        id: { in: matched.map((m) => m.id) },
                        NOT: { status: 'COLLECTED_FROM_CLIENT' },
                      },
                      data: {
                        status: 'ASSIGNED_TO_ORDER',
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
  /** ✅ Technician amendment of completed order (with stock correction, ≤15 min) */
  amendCompletion: loggedInEveryone
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(OrderStatus),
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

      // Validate technician + 15-minute rule
      await canTechnicianAmend(prisma, input.orderId, userId)

      await prisma.$transaction(async (tx) => {
        /* -------------------------------------------------------------------
         * Step 1️⃣ — Fetch previously assigned devices
         * ------------------------------------------------------------------- */
        const prevEquipments = await tx.warehouse.findMany({
          where: {
            orderAssignments: { some: { orderId: input.orderId } },
            itemType: 'DEVICE',
          },
          select: { id: true, assignedToId: true },
        })

        /* -------------------------------------------------------------------
         * Step 2️⃣ — Clear previous order data
         * ------------------------------------------------------------------- */
        await tx.orderMaterial.deleteMany({ where: { orderId: input.orderId } })
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

        const prevOrder = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { status: true },
        })

        /* -------------------------------------------------------------------
         * Step 3️⃣ — Update order base info
         * ------------------------------------------------------------------- */
        await tx.order.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === OrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
          },
        })

        /* -------------------------------------------------------------------
         * Step 4️⃣ — Work codes
         * ------------------------------------------------------------------- */
        if (input.status === OrderStatus.COMPLETED && input.workCodes?.length) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((w) => ({
              orderId: input.orderId,
              code: w.code,
              quantity: w.quantity,
            })),
          })
        }

        /* -------------------------------------------------------------------
         * Step 5️⃣ — Used materials snapshot only (no warehouse mutations)
         * ------------------------------------------------------------------- */
        if (input.usedMaterials?.length) {
          const defs = await tx.materialDefinition.findMany({
            where: { id: { in: input.usedMaterials.map((m) => m.id) } },
            select: { id: true, unit: true },
          })
          const unitMap = new Map(defs.map((d) => [d.id, d.unit]))
          await tx.orderMaterial.createMany({
            data: input.usedMaterials.map((m) => ({
              orderId: input.orderId,
              materialId: m.id,
              quantity: m.quantity,
              unit: (unitMap.get(m.id) as MaterialUnit) ?? 'PIECE',
            })),
          })
        }

        /* -------------------------------------------------------------------
         * Step 6️⃣ — Equipment (return removed, assign new)
         * ------------------------------------------------------------------- */
        const newEquipIds = new Set(input.equipmentIds ?? [])

        // Return removed ones back to technician
        for (const old of prevEquipments) {
          if (newEquipIds.has(old.id)) continue

          // 🔒 do not touch devices collected from client
          const current = await tx.warehouse.findUnique({
            where: { id: old.id },
            select: { status: true },
          })
          if (current?.status === 'COLLECTED_FROM_CLIENT') {
            // collected ones stay collected and stay linked to technician
            continue
          }

          await tx.warehouse.update({
            where: { id: old.id },
            data: {
              status: 'ASSIGNED',
              assignedToId: userId,
              history: {
                create: {
                  action: 'RETURNED_TO_TECHNICIAN',
                  actionDate: new Date(),
                  performedById: userId,
                  assignedOrderId: input.orderId,
                  assignedToId: userId,
                },
              },
            },
          })
        }

        // Assign new devices (taken from technician)
        if (input.equipmentIds?.length) {
          const assigned = await tx.warehouse.findMany({
            where: { id: { in: input.equipmentIds }, assignedToId: userId },
          })

          await tx.orderEquipment.createMany({
            data: assigned.map((d) => ({
              orderId: input.orderId,
              warehouseId: d.id,
            })),
          })

          for (const eq of assigned) {
            await tx.warehouse.update({
              where: { id: eq.id },
              data: {
                status: 'ASSIGNED_TO_ORDER',
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
        }

        /* -------------------------------------------------------------------
         * Step 7️⃣ — Collected devices (handle removal / addition)
         * -------------------------------------------------------------------
         * - Keeps previously collected devices unless explicitly removed.
         * - Prevents accidental deletion when technician did not edit them.
         * ------------------------------------------------------------------- */

        // 1️⃣ Fetch previously collected devices
        const prevCollected = await tx.warehouse.findMany({
          where: {
            assignedToId: userId,
            status: 'COLLECTED_FROM_CLIENT',
            orderAssignments: { some: { orderId: input.orderId } },
          },
          select: { id: true, serialNumber: true },
        })

        // 2️⃣ If technician didn't include collectedDevices in input -> skip entire section
        if (input.collectedDevices && Array.isArray(input.collectedDevices)) {
          const newDeviceSerials = new Set(
            input.collectedDevices
              .map((d) => d.serialNumber?.trim().toUpperCase())
              .filter(Boolean)
          )

          // Remove only those explicitly missing from the new list
          for (const old of prevCollected) {
            const stillUsed = newDeviceSerials.has(
              old.serialNumber?.trim().toUpperCase()
            )
            if (!stillUsed) {
              // Soft-delete (optional) or just detach instead of full delete
              await tx.warehouse.update({
                where: { id: old.id },
                data: {
                  assignedToId: userId,
                  status: 'COLLECTED_FROM_CLIENT', // stays the same
                },
              })
            }
          }

          // 3️⃣ Add new collected devices if provided
          for (const d of input.collectedDevices) {
            const serial = d.serialNumber?.trim().toUpperCase() ?? null

            const existing = serial
              ? await tx.warehouse.findFirst({
                  where: {
                    serialNumber: serial,
                    status: 'COLLECTED_FROM_CLIENT',
                    assignedToId: userId,
                  },
                  select: { id: true },
                })
              : null

            if (existing) continue

            const warehouseId = await getOrCreateCollectedWarehouseItem({
              tx,
              name: d.name,
              category: d.category,
              serialNumber: serial,
              assignToUserId: userId,
            })

            await tx.orderEquipment.create({
              data: { orderId: input.orderId, warehouseId },
            })
          }
        }

        /* -------------------------------------------------------------------
         * Step 8️⃣ — Services and measurements
         * ------------------------------------------------------------------- */
        if (input.status === OrderStatus.COMPLETED && input.services.length) {
          const servicesData = await mapServicesWithDeviceTypes(
            tx,
            input.services,
            input.orderId
          )
          for (const s of servicesData) {
            await tx.orderService.create({
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
                usDbmDown: s.usDbmDown,
                usDbmUp: s.usDbmUp,
                notes: s.notes,
              },
            })
          }
        }

        /* -------------------------------------------------------------------
         * Step 9️⃣ — Return previously assigned devices that were removed
         * -------------------------------------------------------------------
         *  - Finds all devices which still have status ASSIGNED_TO_ORDER
         *    but are no longer linked to this order.
         *  - Returns them either to technician or to warehouse.
         *  - ⚙️ Excludes devices collected from client.
         * ------------------------------------------------------------------- */
        const allDevicesInOrder = new Set<string>(
          [
            ...(input.equipmentIds ?? []),
            ...input.services.flatMap((service) => {
              const ids: string[] = []
              if (service.deviceId) ids.push(service.deviceId)
              if (service.deviceId2) ids.push(service.deviceId2)
              if (service.extraDevices && Array.isArray(service.extraDevices)) {
                for (const ex of service.extraDevices) {
                  if (ex.id) ids.push(ex.id)
                }
              }
              return ids
            }),
          ].filter(Boolean)
        )

        const orphaned = await tx.warehouse.findMany({
          where: {
            itemType: 'DEVICE',
            status: 'ASSIGNED_TO_ORDER',
            NOT: {
              OR: [
                { id: { in: Array.from(allDevicesInOrder) } },
                { status: 'COLLECTED_FROM_CLIENT' },
              ],
            },
          },
          select: { id: true, assignedToId: true, status: true },
        })

        for (const device of orphaned) {
          if (device.status === 'COLLECTED_FROM_CLIENT') continue

          const returnStatus = device.assignedToId ? 'ASSIGNED' : 'AVAILABLE'
          const returnAction = device.assignedToId
            ? 'RETURNED_TO_TECHNICIAN'
            : 'RETURNED'

          await tx.warehouse.update({
            where: { id: device.id },
            data: {
              status: returnStatus,
              assignedToId: device.assignedToId ?? null,
              history: {
                create: {
                  action: returnAction,
                  actionDate: new Date(),
                  performedById: userId,
                  assignedOrderId: input.orderId,
                  assignedToId: device.assignedToId ?? null,
                },
              },
            },
          })
        }

        /* -------------------------------------------------------------------
         * Step 🔟 — Create audit history entry
         * -------------------------------------------------------------------
         * Final audit log entry confirming technician amendment.
         * ------------------------------------------------------------------- */
        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            statusBefore: prevOrder?.status ?? OrderStatus.PENDING,
            statusAfter: input.status,
            changedById: userId,
            notes: 'Technician corrected order within 15 minutes',
          },
        })
      })

      return { success: true }
    }),

  //** ✅ Admin/Coordinator edit of completed order (full stock + history sync) */
  adminEditCompletion: adminOrCoord
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(OrderStatus),
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
         * Step 1️⃣ — Clear all existing order-related data
         * -------------------------------------------------------------------
         * Remove all materials, equipment, services, and settlement entries.
         * This ensures that we are re-creating a clean state.
         */
        await tx.orderMaterial.deleteMany({ where: { orderId: input.orderId } })
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

        const previous = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { status: true },
        })

        /* -------------------------------------------------------------------
         * Step 2️⃣ — Update main order fields
         * -------------------------------------------------------------------
         * Update status, notes, and failure reason.
         */
        const orderType = (
          await tx.order.findUnique({
            where: { id: input.orderId },
            select: { type: true },
          })
        )?.type

        await tx.order.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === OrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
            closedAt:
              orderType === OrderType.INSTALATION ? undefined : new Date(),
          },
        })

        /* -------------------------------------------------------------------
         * Step 3️⃣ — Work codes synchronization
         * -------------------------------------------------------------------
         * Recreate all settlement entries for the order.
         */
        if (input.status === OrderStatus.COMPLETED && input.workCodes?.length) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((w) => ({
              orderId: input.orderId,
              code: w.code,
              quantity: w.quantity,
            })),
          })
        }

        /* -------------------------------------------------------------------
         * Step 4️⃣ — Used materials snapshot
         * -------------------------------------------------------------------
         * Only store a record of used materials, without altering warehouse stock.
         */
        if (input.usedMaterials?.length) {
          const defs = await tx.materialDefinition.findMany({
            where: { id: { in: input.usedMaterials.map((m) => m.id) } },
            select: { id: true, unit: true },
          })
          const unitMap = new Map(defs.map((d) => [d.id, d.unit]))
          await tx.orderMaterial.createMany({
            data: input.usedMaterials.map((m) => ({
              orderId: input.orderId,
              materialId: m.id,
              quantity: m.quantity,
              unit: (unitMap.get(m.id) as MaterialUnit) ?? 'PIECE',
            })),
          })
        }

        /* -------------------------------------------------------------------
         * Step 5️⃣ — Assign selected equipment to order
         * -------------------------------------------------------------------
         * Admin can assign any devices (from warehouse or technician stock)
         * to the order. Previous assignments are cleared and replaced.
         */
        if (input.equipmentIds?.length) {
          // 1️⃣ Clear previous non-collected equipment links
          await tx.orderEquipment.deleteMany({
            where: {
              orderId: input.orderId,
              warehouse: { status: { not: 'COLLECTED_FROM_CLIENT' } },
            },
          })

          // 2️⃣ Fetch new equipment items
          const equipmentItems = await tx.warehouse.findMany({
            where: { id: { in: input.equipmentIds } },
            select: { id: true, assignedToId: true, status: true },
          })

          // 3️⃣ Assign new items to this order
          for (const eq of equipmentItems) {
            await tx.orderEquipment.create({
              data: {
                orderId: input.orderId,
                warehouseId: eq.id,
              },
            })

            // 4️⃣ Update warehouse status and add history
            await tx.warehouse.update({
              where: { id: eq.id },
              data: {
                status: 'ASSIGNED_TO_ORDER',
                assignedToId: null, // because once used, it belongs to the client
                history: {
                  create: {
                    action: 'ASSIGNED_TO_ORDER',
                    actionDate: new Date(),
                    performedById: adminId,
                    assignedOrderId: input.orderId,
                  },
                },
              },
            })
          }
        }

        /* -------------------------------------------------------------------
         * Step 6️⃣ — Sync collected devices (returned from client)
         * -------------------------------------------------------------------
         * Deletes old devices that were removed from the form
         * and creates new ones as "COLLECTED_FROM_CLIENT".
         */
        const assignedTechId =
          (
            await tx.order.findUnique({
              where: { id: input.orderId },
              select: { assignedToId: true },
            })
          )?.assignedToId ?? null

        // 1️⃣ Fetch previously collected devices for this order
        const prevCollectedDevices = await tx.warehouse.findMany({
          where: {
            assignedToId: assignedTechId,
            status: 'COLLECTED_FROM_CLIENT',
            orderAssignments: { some: { orderId: input.orderId } },
          },
          select: { id: true, serialNumber: true },
        })

        // 2️⃣ Gather serial numbers of new devices from form input
        const newSerials = new Set(
          (input.collectedDevices ?? [])
            .map((d) => d.serialNumber?.trim().toUpperCase())
            .filter(Boolean)
        )

        // 3️⃣ Delete old collected devices that were removed from the form
        for (const old of prevCollectedDevices) {
          const stillUsed = newSerials.has(
            old.serialNumber?.trim().toUpperCase()
          )
          if (!stillUsed) {
            await tx.warehouse.delete({ where: { id: old.id } })
          }
        }

        // 4️⃣ Create new collected devices if not already existing
        if (input.collectedDevices?.length) {
          for (const d of input.collectedDevices) {
            const serial = d.serialNumber?.trim().toUpperCase() ?? null

            // Skip if already exists in technician's collected stock
            const existing = serial
              ? await tx.warehouse.findFirst({
                  where: {
                    serialNumber: serial,
                    status: 'COLLECTED_FROM_CLIENT',
                    assignedToId: assignedTechId,
                  },
                  select: { id: true },
                })
              : null

            if (existing) continue

            const created = await tx.warehouse.create({
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

            await tx.orderEquipment.create({
              data: { orderId: input.orderId, warehouseId: created.id },
            })

            await tx.warehouseHistory.create({
              data: {
                warehouseItemId: created.id,
                action: 'COLLECTED_FROM_CLIENT',
                performedById: adminId,
                assignedOrderId: input.orderId,
              },
            })
          }
        }

        /* -------------------------------------------------------------------
         * Step 7️⃣ — Recreate services and related data
         * -------------------------------------------------------------------
         * Completely rebuilds the order services, devices, and extra devices.
         */
        if (input.status === OrderStatus.COMPLETED && input.services.length) {
          const servicesData = await mapServicesWithDeviceTypes(
            tx,
            input.services,
            input.orderId
          )

          for (const s of servicesData) {
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

            if (s.extraDevices?.length) {
              await tx.orderExtraDevice.createMany({
                data: s.extraDevices.map((ex) => ({
                  serviceId: createdService.id,
                  source: ex.source,
                  name: ex.name ?? '',
                  serialNumber: ex.serialNumber ?? undefined,
                  category: ex.category ?? undefined,
                })),
              })
            }
          }
        }

        /* -------------------------------------------------------------------
         * Step 8️⃣ — Restore ownership for removed equipment
         * -------------------------------------------------------------------
         * Returns devices that were previously assigned to the order
         * but are no longer present after the edit.
         */
        const allCurrentEquipment = await tx.orderEquipment.findMany({
          where: { orderId: input.orderId },
          select: { warehouseId: true },
        })
        const stillAssignedIds = new Set(
          allCurrentEquipment.map((e) => e.warehouseId)
        )

        const previouslyAssigned = await tx.warehouse.findMany({
          where: {
            orderAssignments: { some: { orderId: input.orderId } },
            id: { notIn: Array.from(stillAssignedIds) },
          },
          select: { id: true, assignedToId: true },
        })

        for (const item of previouslyAssigned) {
          const returnStatus = item.assignedToId ? 'ASSIGNED' : 'AVAILABLE'
          const returnAction = item.assignedToId
            ? 'RETURNED_TO_TECHNICIAN'
            : 'RETURNED'

          await tx.warehouse.update({
            where: { id: item.id },
            data: {
              status: returnStatus,
              history: {
                create: {
                  action: returnAction,
                  actionDate: new Date(),
                  performedById: adminId,
                  assignedOrderId: input.orderId,
                  assignedToId: item.assignedToId ?? undefined,
                },
              },
            },
          })
        }
        /* -------------------------------------------------------------------
         * Step 9️⃣ — Return previously assigned devices that were removed
         * -------------------------------------------------------------------
         *  - Finds all devices which still have status ASSIGNED_TO_ORDER
         *    but are no longer linked to this order.
         *  - Returns them either to technician or to warehouse.
         * ------------------------------------------------------------------- */
        const allDevicesInOrder = new Set<string>(
          [
            ...(input.equipmentIds ?? []),
            ...input.services.flatMap((service) => {
              const ids: string[] = []
              if (service.deviceId) ids.push(service.deviceId)
              if (service.deviceId2) ids.push(service.deviceId2)
              if (service.extraDevices && Array.isArray(service.extraDevices)) {
                for (const ex of service.extraDevices) {
                  if (ex.id) ids.push(ex.id)
                }
              }
              return ids
            }),
          ].filter(Boolean)
        )

        const orphaned = await tx.warehouse.findMany({
          where: {
            itemType: 'DEVICE',
            status: 'ASSIGNED_TO_ORDER',
            NOT: {
              OR: [
                { id: { in: Array.from(allDevicesInOrder) } },
                { status: 'COLLECTED_FROM_CLIENT' },
              ],
            },
          },
          select: { id: true, assignedToId: true, status: true },
        })

        for (const device of orphaned) {
          // skip collected devices (safety check)
          if (device.status === 'COLLECTED_FROM_CLIENT') continue

          const returnStatus = device.assignedToId ? 'ASSIGNED' : 'AVAILABLE'
          const returnAction = device.assignedToId
            ? 'RETURNED_TO_TECHNICIAN'
            : 'RETURNED'

          await tx.warehouse.update({
            where: { id: device.id },
            data: {
              status: returnStatus,
              assignedToId: device.assignedToId ?? null,
              history: {
                create: {
                  action: returnAction,
                  actionDate: new Date(),
                  performedById: adminId,
                  assignedOrderId: input.orderId,
                  assignedToId: device.assignedToId ?? null,
                },
              },
            },
          })
        }

        /* -------------------------------------------------------------------
         * Step 🔟 — Log order change in orderHistory
         * -------------------------------------------------------------------
         * Final audit trail entry for transparency.
         */
        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            statusBefore: previous?.status ?? OrderStatus.PENDING,
            statusAfter: input.status,
            changedById: adminId,
            notes: `Edited by ${adminName} (Admin/Coordinator)`,
          },
        })
      })

      return { success: true }
    }),
})
