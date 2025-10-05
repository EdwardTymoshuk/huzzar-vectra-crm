// server/routers/warehouse/mutations.ts
import { adminCoordOrWarehouse, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { DeviceCategory, WarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addWarehouseHistory } from '../_helpers/addWarehouseHistory'
import { getUserOrThrow } from '../_helpers/getUserOrThrow'
import { resolveLocationId } from '../_helpers/resolveLocationId'

export const mutationsRouter = router({
  /** 📥 Add new items to warehouse */
  addItems: adminCoordOrWarehouse
    .input(
      z.object({
        items: z.array(
          z.object({
            type: z.nativeEnum(WarehouseItemType),
            name: z.string(),
            category: z.nativeEnum(DeviceCategory).optional(),
            serialNumber: z.string().optional(),
            quantity: z.number().optional(),
          })
        ),
        notes: z.string().optional(),
        locationId: z.string().optional(), // manual location selection
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const userId = user.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const activeLocationId = resolveLocationId(user, {
        locationId: input.locationId,
      })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          const def = await prisma.deviceDefinition.findFirst({
            where: { name: item.name, category: item.category ?? 'OTHER' },
          })
          if (!def || def.price === null) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak definicji urządzenia lub ceny dla ${item.name}`,
            })
          }

          const created = await prisma.warehouse.create({
            data: {
              itemType: 'DEVICE',
              name: item.name,
              category: item.category,
              serialNumber: item.serialNumber?.trim().toUpperCase(),
              quantity: 1,
              price: def.price,
              warningAlert: def.warningAlert,
              alarmAlert: def.alarmAlert,
              status: 'AVAILABLE',
              locationId: activeLocationId,
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'RECEIVED',
              performedById: userId,
              notes: input.notes || undefined,
              toLocationId: activeLocationId,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const def = await prisma.materialDefinition.findFirst({
            where: { name: item.name },
          })
          if (!def || def.price === null) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak definicji materiału lub ceny dla ${item.name}`,
            })
          }

          const created = await prisma.warehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: item.name,
              quantity: item.quantity ?? 1,
              unit: def.unit,
              index: def.index,
              price: def.price,
              warningAlert: def.warningAlert,
              alarmAlert: def.alarmAlert,
              status: 'AVAILABLE',
              materialDefinitionId: def.id,
              locationId: activeLocationId,
            },
          })
          await addWarehouseHistory({
            prisma,
            itemId: created.id,
            userId,
            action: 'RECEIVED',
            qty: item.quantity ?? 1,
            notes: input.notes,
            toLocationId: activeLocationId,
          })
        }
      }
      return { success: true }
    }),

  /** 📤 Issue devices and materials to technician */
  issueItems: adminCoordOrWarehouse
    .input(
      z.object({
        assignedToId: z.string(),
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          await prisma.warehouse.update({
            where: { id: item.id },
            data: {
              status: 'ASSIGNED',
              assignedToId: input.assignedToId,
            },
          })
          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'ISSUED',
              performedById: userId,
              notes: input.notes,
              assignedToId: input.assignedToId,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })
          if (!original) throw new TRPCError({ code: 'NOT_FOUND' })
          if ((original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak wystarczającej ilości materiału (${original.name})`,
            })
          }

          await prisma.warehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })

          await prisma.warehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: original.name,
              quantity: item.quantity,
              unit: original.unit,
              index: original.index,
              price: original.price,
              assignedToId: input.assignedToId,
              status: 'ASSIGNED',
              materialDefinitionId: original.materialDefinitionId,
              locationId: original.locationId, // keep original location
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'ISSUED',
              quantity: item.quantity,
              performedById: userId,
              assignedToId: input.assignedToId,
              notes: input.notes,
            },
          })
        }
      }
      return { success: true }
    }),

  /** 🔁 Return items from technician back to warehouse */
  returnToWarehouse: adminCoordOrWarehouse
    .input(
      z.object({
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          const current = await prisma.warehouse.findUnique({
            where: { id: item.id },
            select: { status: true, locationId: true },
          })
          if (!current) throw new TRPCError({ code: 'NOT_FOUND' })

          const newStatus =
            current.status === 'COLLECTED_FROM_CLIENT'
              ? 'RETURNED'
              : 'AVAILABLE'

          await prisma.warehouse.update({
            where: { id: item.id },
            data: {
              status: newStatus,
              assignedToId: null,
              locationId: current.locationId,
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED',
              performedById: userId,
              notes: input.notes,
            },
          })
          continue
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })
          if (!original) throw new TRPCError({ code: 'NOT_FOUND' })
          if ((original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Not enough material on technician stock`,
            })
          }

          await prisma.warehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })

          await prisma.warehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: original.name,
              quantity: item.quantity,
              unit: original.unit,
              index: original.index,
              price: original.price,
              status: 'AVAILABLE',
              materialDefinitionId: original.materialDefinitionId,
              locationId: original.locationId, // preserve location
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED',
              performedById: userId,
              quantity: item.quantity,
              notes: input.notes,
            },
          })
        }
      }
      return { success: true }
    }),

  /** ❌ Return damaged/obsolete items to operator (removal) */
  returnToOperator: adminCoordOrWarehouse
    .input(
      z.object({
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          await prisma.warehouse.update({
            where: { id: item.id },
            data: { status: 'RETURNED_TO_OPERATOR' },
          })
          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED_TO_OPERATOR',
              performedById: userId,
              notes: input.notes,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })
          if (!original || (original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Nieprawidłowa ilość materiału`,
            })
          }

          await prisma.warehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED_TO_OPERATOR',
              performedById: userId,
              quantity: item.quantity,
              notes: input.notes,
            },
          })
        }
      }
      return { success: true }
    }),

  /** 📦 Collect device from client by technician */
  collectFromClient: loggedInEveryone
    .input(
      z.object({
        orderId: z.string().uuid(),
        device: z.object({
          name: z.string(),
          category: z.nativeEnum(DeviceCategory).optional(),
          serialNumber: z.string().optional(),
          price: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const techId = ctx.user?.id
      if (!techId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const activeLocationId = ctx.user?.locations?.[0]?.id
      if (!activeLocationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Technik nie ma przypisanej lokalizacji',
        })
      }

      const device = await prisma.warehouse.create({
        data: {
          itemType: 'DEVICE',
          name: input.device.name,
          category: input.device.category ?? 'OTHER',
          serialNumber: input.device.serialNumber?.trim().toUpperCase(),
          quantity: 1,
          price: input.device.price ?? 0,
          status: 'COLLECTED_FROM_CLIENT',
          assignedToId: techId,
          locationId: activeLocationId,
        },
      })

      await prisma.orderEquipment.create({
        data: { orderId: input.orderId, warehouseId: device.id },
      })

      await prisma.warehouseHistory.create({
        data: {
          warehouseItemId: device.id,
          action: 'COLLECTED_FROM_CLIENT',
          performedById: techId,
          assignedOrderId: input.orderId,
          assignedToId: techId,
          notes: 'Device picked up from client',
        },
      })

      return { success: true, id: device.id }
    }),

  /** 🗂️ Devices returned by technicians – waiting to be shipped to operator */
  getReturnedFromTechnicians: adminCoordOrWarehouse.query(() =>
    prisma.warehouse.findMany({
      where: { itemType: 'DEVICE', status: 'RETURNED' },
      include: {
        history: {
          include: { performedBy: true },
          orderBy: { actionDate: 'asc' },
        },
        orderAssignments: { include: { order: true } },
      },
      orderBy: { updatedAt: 'asc' },
    })
  ),
})
