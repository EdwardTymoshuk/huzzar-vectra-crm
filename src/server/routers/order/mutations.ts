import {
  adminOnly,
  adminOrCoord,
  loggedInEveryone,
  technicianOnly,
} from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import {
  DeviceCategory,
  MaterialUnit,
  OrderStatus,
  OrderType,
  TimeSlot,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

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

        contractRequired: z.boolean(),
        equipmentNeeded: z.array(z.string()).optional(),
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
          contractRequired: input.contractRequired,
          equipmentNeeded: input.equipmentNeeded ?? [],
          clientPhoneNumber: input.clientPhoneNumber,
          notes: input.notes,
          status: input.status,
          county: input.county,
          municipality: input.municipality,
          city: input.city,
          street: input.street,
          postalCode: input.postalCode,
          assignedToId: input.assignedToId ?? null,
        },
      })
    }),

  /** ✅ Edit existing order */
  editOrder: adminOnly
    .input(
      z.object({
        id: z.string(),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(TimeSlot),
        contractRequired: z.boolean(),
        equipmentNeeded: z.array(z.string()).optional(),
        clientPhoneNumber: z.string().optional(),
        notes: z.string().optional(),
        status: z.nativeEnum(OrderStatus),
        county: z.string().optional(),
        municipality: z.string().optional(),
        city: z.string(),
        street: z.string(),
        postalCode: z.string(),
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
          contractRequired: input.contractRequired,
          equipmentNeeded: input.equipmentNeeded ?? [],
          clientPhoneNumber: input.clientPhoneNumber,
          notes: input.notes,
          status: input.status,
          county: input.county,
          municipality: input.municipality,
          city: input.city,
          street: input.street,
          postalCode: input.postalCode,
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
  completeOrder: technicianOnly
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

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
        const materialUnitsMap = new Map<string, string>()

        if (input.usedMaterials?.length) {
          const materialDefs = await tx.materialDefinition.findMany({
            where: { id: { in: input.usedMaterials.map((m) => m.id) } },
            select: { id: true, unit: true },
          })
          materialDefs.forEach((def) => {
            materialUnitsMap.set(def.id, def.unit)
          })
        }

        // ✅ Update order
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

        // ✅ Save work codes
        if (input.status === OrderStatus.COMPLETED && input.workCodes?.length) {
          await tx.orderSettlementEntry.createMany({
            data: input.workCodes.map((entry) => ({
              orderId: input.orderId,
              code: entry.code,
              quantity: entry.quantity,
            })),
          })
        }

        // ✅ Save used materials and update technician stock
        if (input.usedMaterials?.length) {
          await tx.orderMaterial.createMany({
            data: input.usedMaterials.map((item) => ({
              orderId: input.orderId,
              materialId: item.id,
              quantity: item.quantity,
              unit: (materialUnitsMap.get(item.id) as MaterialUnit) ?? 'PIECE',
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

            if (!technicianMaterial) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: `Brak materiału (ID: ${item.id}) na Twoim stanie.`,
              })
            }

            if (technicianMaterial) {
              const available = technicianMaterial.quantity
              const remaining = Math.max(available - item.quantity, 0)

              await tx.warehouse.update({
                where: { id: technicianMaterial.id },
                data: { quantity: remaining },
              })
            }

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

        // ✅ Equipment assignment with validation
        if (input.equipmentIds?.length) {
          // 🔒 Check for already-assigned devices
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

          // 🔒 Check if devices are on technician stoke
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

          // ✅ Save assignments
          await tx.orderEquipment.createMany({
            data: input.equipmentIds.map((id) => ({
              orderId: input.orderId,
              warehouseId: id,
            })),
          })

          // ✅ Update status in warehouse
          await tx.warehouse.updateMany({
            where: { id: { in: input.equipmentIds } },
            data: { status: 'ASSIGNED_TO_ORDER' },
          })
        }

        /* #############  NEW: store collected devices  ############# */
        if (input.collectedDevices?.length) {
          for (const device of input.collectedDevices) {
            /* create warehouse item bound to technician */
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

            /* link to order */
            await tx.orderEquipment.create({
              data: { orderId: input.orderId, warehouseId: w.id },
            })

            /* history entry */
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
      })

      return { success: true }
    }),
})
