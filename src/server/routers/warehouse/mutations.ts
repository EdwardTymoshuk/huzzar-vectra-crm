// server/router/warehouse/mutations.ts
import { adminOnly, adminOrCoord } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { DeviceCategory, WarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const mutationsRouter = router({
  /** 📥 Add new items to warehouse */
  addItems: adminOnly
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

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
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'RECEIVED',
              performedById: userId,
              notes: input.notes || undefined,
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
            },
          })

          await prisma.warehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'RECEIVED',
              performedById: userId,
              quantity: item.quantity ?? 1,
              notes: input.notes || undefined,
            },
          })
        }
      }

      return { success: true }
    }),

  /** 📤 Issue devices and materials to technician */
  issueItems: adminOrCoord
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
          const updated = await prisma.warehouse.update({
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
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
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
  returnToWarehouse: adminOrCoord
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
            data: {
              status: 'AVAILABLE',
              assignedToId: null,
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
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.warehouse.findUnique({
            where: { id: item.id },
          })
          if (!original) throw new TRPCError({ code: 'NOT_FOUND' })

          if ((original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak odpowiedniej ilości materiału do zwrotu`,
            })
          }

          await prisma.warehouse.update({
            where: { id: item.id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
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
  returnToOperator: adminOrCoord
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
            data: {
              quantity: { decrement: item.quantity },
            },
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
})
