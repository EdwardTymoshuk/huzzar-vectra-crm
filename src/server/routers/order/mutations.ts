import { adminOnly, adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { normalizeName } from '@/utils/normalizeName'
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
    serialNumber?: string
    deviceId2?: string
    serialNumber2?: string
    speedTest?: string
    usDbmDown?: number
    usDbmUp?: number
    notes?: string
  }[],
  orderId: string
) {
  return Promise.all(
    services.map(async (s) => {
      const [device1, device2] = await Promise.all([
        s.deviceId
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
        deviceId: s.deviceId ?? null,
        serialNumber: s.serialNumber ?? null,
        deviceId2: s.deviceId2 ?? null,
        serialNumber2: s.serialNumber2 ?? null,
        deviceType: device1?.category ?? null,
        deviceType2: device2?.category ?? null,
        speedTest: s.speedTest ?? null,
        usDbmDown: s.usDbmDown ?? null,
        usDbmUp: s.usDbmUp ?? null,
        notes: s.notes ?? null,
      }
    })
  )
}

const parsedOrderSchema = z.object({
  operator: z.string(),
  orderNumber: z.string(),
  type: z.literal('INSTALATION'),
  city: z.string(),
  street: z.string(),
  postalCode: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Wymagany format YYYY-MM-DD'),
  timeSlot: z.nativeEnum(TimeSlot),
  assignedToName: z.string().optional(),
  notes: z.string(),
  status: z.nativeEnum(OrderStatus),
})

export const mutationsRouter = router({
  /** ✅ Create new order */
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
        status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
        county: z.string().optional(),
        municipality: z.string().optional(),
        city: z.string(),
        street: z.string(),
        postalCode: z.string(),
        assignedToId: z.string().optional(),
        createdSource: z.nativeEnum(OrderCreatedSource).default('PLANNER'),
      })
    )
    .mutation(async ({ input }) => {
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

      return prisma.order.create({
        data: {
          operator: input.operator,
          type: input.type,
          orderNumber: input.orderNumber,
          date: new Date(input.date),
          timeSlot: input.timeSlot,
          notes: input.notes,
          status: input.status,
          county: input.county,
          municipality: input.municipality,
          city: input.city,
          street: input.street,
          postalCode: input.postalCode,
          assignedToId: input.assignedToId ?? null,
          createdSource: input.createdSource,
        },
      })
    }),

  /** ✅ Edit existing order */
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
        data: {
          orderNumber: input.orderNumber,
          date: new Date(input.date),
          timeSlot: input.timeSlot,
          notes: input.notes,
          status: input.status,
          city: input.city,
          street: input.street,
          assignedToId: input.assignedToId ?? null,
        },
      })
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

  /** ✅ Technician completes or fails an order */
  completeOrder: loggedInEveryone
    .input(
      z.object({
        orderId: z.string(),
        status: z.nativeEnum(OrderStatus),
        notes: z.string().nullable().optional(),
        failureReason: z.string().nullable().optional(),

        // Settlement work codes (for completed orders)
        workCodes: z
          .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
          .optional(),

        // IDs of equipment assigned to this order (devices used)
        equipmentIds: z.array(z.string()).optional(),

        // Used materials (by material definition id and quantity)
        usedMaterials: z
          .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
          .optional(),

        // Devices collected from client during this order
        collectedDevices: z
          .array(
            z.object({
              name: z.string(),
              category: z.nativeEnum(DeviceCategory),
              serialNumber: z.string().optional(),
            })
          )
          .optional(),

        // NEW: Services (measurements) performed during the order
        services: z
          .array(
            z.object({
              id: z.string(),
              type: z.nativeEnum(ServiceType),
              deviceId: z.string().optional(),
              serialNumber: z.string().optional(),
              deviceId2: z.string().optional(),
              serialNumber2: z.string().optional(),
              speedTest: z.string().optional(),
              usDbmDown: z.coerce.number().optional(),
              usDbmUp: z.coerce.number().optional(),
              notes: z.string().optional(),
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
      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }
      if (order.assignedToId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Nie masz dostępu do tego zlecenia',
        })
      }
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
         * 1️⃣  Update order main info (status, notes, failure reason, date)
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
          // Map material definition id to unit (for correct unit storage)
          const materialUnitsMap = new Map<string, string>()
          const materialDefs = await tx.materialDefinition.findMany({
            where: { id: { in: input.usedMaterials.map((m) => m.id) } },
            select: { id: true, name: true, unit: true },
          })
          materialDefs.forEach((def) => {
            materialUnitsMap.set(def.id, def.unit)
          })

          // Save usage per order
          await tx.orderMaterial.createMany({
            data: input.usedMaterials.map((item) => ({
              orderId: input.orderId,
              materialId: item.id,
              quantity: item.quantity,
              unit: (materialUnitsMap.get(item.id) as MaterialUnit) ?? 'PIECE',
            })),
          })
          const nameMap = new Map(materialDefs.map((d) => [d.id, d.name]))

          // Decrement technician material stock and add warehouse history
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
              warnings.push(
                `Brak materiału ${materialName} na Twoim stanie. Uzupełnij magazyn.`
              )
              continue
            }
            const available = technicianMaterial.quantity
            const remaining = Math.max(available - item.quantity, 0)

            if (item.quantity > available) {
              warnings.push(
                `Zużyto ${item.quantity} szt. materiału „${materialName}”, ale na stanie było tylko ${available}. Zaktualizuj stan magazynu.`
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
          // Prevent assignment of already-used devices
          const conflictingDevices = await tx.orderEquipment.findMany({
            where: {
              warehouseId: { in: input.equipmentIds },
              orderId: { not: input.orderId },
            },
          })
          if (conflictingDevices.length > 0) {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Niektóre urządzenia są już przypisane do innych zleceń i nie mogą być użyte.',
            })
          }

          // Check that technician actually owns these devices
          const technicianDevices = await tx.warehouse.findMany({
            where: {
              id: { in: input.equipmentIds },
              assignedToId: userId,
              status: { in: ['AVAILABLE', 'ASSIGNED'] },
            },
          })
          if (technicianDevices.length !== input.equipmentIds.length) {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Niektóre urządzenia nie są przypisane do Ciebie lub nie są dostępne.',
            })
          }

          // Assign devices to order
          await tx.orderEquipment.createMany({
            data: input.equipmentIds.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })

          // Update warehouse status
          await tx.warehouse.updateMany({
            where: { id: { in: input.equipmentIds } },
            data: { status: 'ASSIGNED_TO_ORDER' },
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
         * 6️⃣  Save measurement and service info (speedtest/DS/US)
         *     - Remove previous orderService records for this order (if any)
         *     - Add all new service records from the form
         * ------------------------------------------------------------------- */
        if (input.status === OrderStatus.COMPLETED) {
          // Remove old services, then insert all provided
          await tx.orderService.deleteMany({
            where: { orderId: input.orderId },
          })
          if (input.services.length) {
            const servicesData = await mapServicesWithDeviceTypes(
              tx,
              input.services,
              input.orderId
            )

            await tx.orderService.createMany({ data: servicesData })
          }
        }
      })

      return { success: true, warnings }
    }),
  /** ✅ Amend completion (technician, no stock movements) */
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
              deviceId: z.string().optional(),
              serialNumber: z.string().optional(),
              deviceId2: z.string().optional(),
              serialNumber2: z.string().optional(),
              speedTest: z.string().optional(),
              usDbmDown: z.coerce.number().optional(),
              usDbmUp: z.coerce.number().optional(),
              notes: z.string().optional(),
            })
          )
          .default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      // Guard: only assigned tech can amend within 15 minutes
      await canTechnicianAmend(prisma, input.orderId, userId)

      await prisma.$transaction(async (tx) => {
        // Clear previous per-order details (we'll re-insert the new snapshot)
        await tx.orderMaterial.deleteMany({ where: { orderId: input.orderId } })
        await tx.orderEquipment.deleteMany({
          where: { orderId: input.orderId },
        })
        await tx.orderService.deleteMany({ where: { orderId: input.orderId } })
        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        const prev = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { status: true },
        })

        // Update order main fields
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

        // Work codes
        if (input.status === OrderStatus.COMPLETED && input.workCodes?.length) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((w) => ({
              orderId: input.orderId,
              code: w.code,
              quantity: w.quantity,
            })),
          })
        }

        // Used materials (snapshot only; no warehouse mutations on amend)
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

        // Equipment assigned to order (snapshot)
        if (input.equipmentIds?.length) {
          await tx.orderEquipment.createMany({
            data: input.equipmentIds.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })
        }

        // Collected devices from client (dedupe by serial, case-insensitive)
        if (input.collectedDevices?.length) {
          for (const d of input.collectedDevices) {
            const warehouseId = await getOrCreateCollectedWarehouseItem({
              tx,
              name: d.name,
              category: d.category,
              serialNumber: d.serialNumber,
              assignToUserId: userId, // technician ownership
            })
            await tx.orderEquipment.create({
              data: { orderId: input.orderId, warehouseId },
            })
          }
        }

        // Services/measurements snapshot
        if (input.status === OrderStatus.COMPLETED && input.services.length) {
          const servicesData = await mapServicesWithDeviceTypes(
            tx,
            input.services,
            input.orderId
          )
          await tx.orderService.createMany({ data: servicesData })
        }

        // History entry
        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            statusBefore: prev?.status ?? OrderStatus.PENDING,
            statusAfter: input.status,
            changedById: userId,
            notes: 'Technik poprawił rozliczenie (≤15 min)',
          },
        })
      })

      return { success: true }
    }),

  /** ✅ Admin/coordinator edit of completion (no stock movements) */
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
              deviceId: z.string().optional(),
              serialNumber: z.string().optional(),
              deviceId2: z.string().optional(),
              serialNumber2: z.string().optional(),
              speedTest: z.string().optional(),
              usDbmDown: z.coerce.number().optional(),
              usDbmUp: z.coerce.number().optional(),
              notes: z.string().optional(),
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
        // Clear previous per-order details (we'll re-insert the new snapshot)
        await tx.orderMaterial.deleteMany({ where: { orderId: input.orderId } })
        await tx.orderEquipment.deleteMany({
          where: { orderId: input.orderId },
        })
        await tx.orderService.deleteMany({ where: { orderId: input.orderId } })
        await tx.orderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        const prev = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { status: true },
        })

        // Update order main fields
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

        // Work codes
        if (input.status === OrderStatus.COMPLETED && input.workCodes?.length) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((w) => ({
              orderId: input.orderId,
              code: w.code,
              quantity: w.quantity,
            })),
          })
        }

        // Used materials (snapshot only)
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

        // Equipment assigned to order (snapshot)
        if (input.equipmentIds?.length) {
          await tx.orderEquipment.createMany({
            data: input.equipmentIds.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })
        }

        // Collected devices from client (dedupe by serial, case-insensitive)
        if (input.collectedDevices?.length) {
          for (const d of input.collectedDevices) {
            const warehouseId = await getOrCreateCollectedWarehouseItem({
              tx,
              name: d.name,
              category: d.category,
              serialNumber: d.serialNumber,
              // Admin edit: do not reassign ownership; keep null or existing
              assignToUserId: null,
            })
            await tx.orderEquipment.create({
              data: { orderId: input.orderId, warehouseId },
            })
          }
        }

        // Services/measurements snapshot
        if (input.status === OrderStatus.COMPLETED && input.services.length) {
          const servicesData = await mapServicesWithDeviceTypes(
            tx,
            input.services,
            input.orderId
          )
          await tx.orderService.createMany({ data: servicesData })
        }

        // History entry
        await tx.orderHistory.create({
          data: {
            orderId: input.orderId,
            statusBefore: prev?.status ?? OrderStatus.PENDING,
            statusAfter: input.status,
            changedById: adminId,
            notes: `Edycja zlecenia przez administratora/koordynatora ${adminName}`,
          },
        })
      })
      return { success: true }
    }),
  importParsedOrders: adminOrCoord
    .input(z.object({ orders: z.array(parsedOrderSchema) }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const orders = input.orders
      if (orders.length === 0)
        return { created: 0, duplicates: 0, unresolved: [] as string[] }

      // 1) Fetch active technicians once
      const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', status: 'ACTIVE' },
        select: { id: true, name: true },
      })

      // 2) Build normalized lookup map
      const techMap = new Map<string, string>()
      for (const t of technicians) {
        const key = normalizeName(t.name)
        if (!techMap.has(key)) techMap.set(key, t.id)
      }

      // 3) Prepare payloads and unresolved
      const unresolved: string[] = []
      const payloads = orders.map((o) => {
        let assignedToId: string | null = null
        if (o.assignedToName) {
          const key = normalizeName(o.assignedToName)
          assignedToId = techMap.get(key) ?? null
          if (!assignedToId) unresolved.push(o.assignedToName)
        }
        return {
          operator: o.operator,
          type: o.type,
          orderNumber: o.orderNumber,
          date: o.date,
          timeSlot: o.timeSlot,
          clientPhoneNumber: null,
          notes: o.notes,
          status: o.status,
          county: null,
          municipality: null,
          city: o.city,
          street: o.street,
          postalCode: o.postalCode,
          assignedToId,
        }
      })

      // 4) Create with duplicate counting
      let created = 0
      let duplicates = 0

      await prisma.$transaction(async (tx) => {
        for (const data of payloads) {
          try {
            await tx.order.create({ data })
            created++
          } catch (e) {
            const msg = (e as Error).message || ''
            if (msg.includes('Unique constraint failed')) {
              duplicates++
              continue
            }
            throw e
          }
        }
      })

      return { created, duplicates, unresolved }
    }),
})
