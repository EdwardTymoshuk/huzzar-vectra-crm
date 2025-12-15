import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addWarehouseHistory } from '../../_helpers/addWarehouseHistory'
import { getUserOrThrow } from '../../_helpers/getUserOrThrow'

export const warehouseTransferRouter = router({
  getIncomingTechTransfers: technicianOnly.query(({ ctx }) => {
    const user = getUserOrThrow(ctx)
    return ctx.prisma.vectraWarehouse.findMany({
      where: { transferToId: user.id, transferPending: true },
      select: {
        id: true,
        name: true,
        itemType: true,
        serialNumber: true,
        quantity: true,
        unit: true,
        category: true,
        transferPending: true,
        transferToId: true,
        transferTo: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })
  }),

  requestTechTransfer: technicianOnly
    .input(
      z.object({
        newTechnicianId: z.string(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive().default(1),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const me = user.id
      await ctx.prisma.$transaction(async (tx) => {
        for (const { itemId, quantity } of input.items) {
          const row = await tx.vectraWarehouse.findUniqueOrThrow({
            where: { id: itemId },
            select: {
              id: true,
              itemType: true,
              quantity: true,
              unit: true,
              name: true,
              serialNumber: true,
              materialDefinitionId: true,
              price: true,
              assignedToId: true,
            },
          })
          if (row.assignedToId !== me) {
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: 'Przedmiot nie należy do Ciebie.',
            })
          }

          if (row.itemType === 'DEVICE') {
            await tx.vectraWarehouse.update({
              where: { id: row.id },
              data: {
                transferPending: true,
                transferToId: input.newTechnicianId,
              },
            })
            continue
          }

          if (row.quantity < quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Za mało materiału: "${row.name}"`,
            })
          }

          const existingPending = await tx.vectraWarehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: row.materialDefinitionId,
              assignedToId: me,
              transferToId: input.newTechnicianId,
              transferPending: true,
            },
          })

          if (existingPending) {
            await tx.vectraWarehouse.update({
              where: { id: existingPending.id },
              data: { quantity: { increment: quantity } },
            })
          } else {
            await tx.vectraWarehouse.create({
              data: {
                itemType: 'MATERIAL',
                name: row.name,
                quantity,
                unit: row.unit,
                price: row.price,
                status: 'ASSIGNED',
                materialDefinitionId: row.materialDefinitionId,
                assignedToId: me,
                transferPending: true,
                transferToId: input.newTechnicianId,
              },
            })
          }

          await tx.vectraWarehouse.update({
            where: { id: row.id },
            data: { quantity: { decrement: quantity } },
          })
        }
      })
      return { ok: true }
    }),

  confirmTechTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const me = user.id
      await ctx.prisma.$transaction(async (tx) => {
        const pending = await tx.vectraWarehouse.findUniqueOrThrow({
          where: { id: input.itemId, transferToId: me, transferPending: true },
          select: {
            id: true,
            itemType: true,
            quantity: true,
            unit: true,
            name: true,
            assignedToId: true,
            materialDefinitionId: true,
          },
        })
        const qty = pending.quantity
        const senderId = pending.assignedToId!

        let targetId = pending.id
        if (pending.itemType === 'MATERIAL') {
          const recipientStock = await tx.vectraWarehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: pending.materialDefinitionId,
              assignedToId: me,
              transferPending: false,
            },
          })

          if (recipientStock) {
            await tx.vectraWarehouse.update({
              where: { id: recipientStock.id },
              data: { quantity: { increment: qty } },
            })
            targetId = recipientStock.id
            await tx.vectraWarehouse.delete({ where: { id: pending.id } })
          } else {
            await tx.vectraWarehouse.update({
              where: { id: pending.id },
              data: {
                assignedToId: me,
                transferPending: false,
                transferToId: null,
              },
            })
          }
        } else {
          await tx.vectraWarehouse.update({
            where: { id: pending.id },
            data: {
              assignedToId: me,
              transferPending: false,
              transferToId: null,
            },
          })
        }

        await addWarehouseHistory({
          prisma: tx,
          itemId: targetId,
          userId: senderId,
          action: 'TRANSFER',
          qty,
          assignedToId: me,
        })
      })
      return { ok: true }
    }),

  rejectTechTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const me = user.id
      await ctx.prisma.$transaction(async (tx) => {
        const pending = await tx.vectraWarehouse.findUniqueOrThrow({
          where: { id: input.itemId, transferToId: me, transferPending: true },
          select: {
            itemType: true,
            quantity: true,
            materialDefinitionId: true,
            assignedToId: true,
            name: true,
            unit: true,
            price: true,
          },
        })

        if (pending.itemType === 'MATERIAL') {
          const senderStock = await tx.vectraWarehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: pending.materialDefinitionId,
              assignedToId: pending.assignedToId,
              transferPending: false,
            },
          })

          if (senderStock) {
            await tx.vectraWarehouse.update({
              where: { id: senderStock.id },
              data: { quantity: { increment: pending.quantity } },
            })
          } else {
            await tx.vectraWarehouse.create({
              data: {
                itemType: 'MATERIAL',
                name: pending.name,
                quantity: pending.quantity,
                unit: pending.unit,
                price: pending.price,
                status: 'ASSIGNED',
                materialDefinitionId: pending.materialDefinitionId,
                assignedToId: pending.assignedToId,
              },
            })
          }

          await tx.vectraWarehouse.delete({ where: { id: input.itemId } })
        } else {
          await tx.vectraWarehouse.update({
            where: { id: input.itemId },
            data: { transferPending: false, transferToId: null },
          })
        }
      })
      return { ok: true }
    }),

  cancelTechTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const me = user.id
      await ctx.prisma.$transaction(async (tx) => {
        const pending = await tx.vectraWarehouse.findUniqueOrThrow({
          where: { id: input.itemId, assignedToId: me, transferPending: true },
          select: {
            itemType: true,
            quantity: true,
            materialDefinitionId: true,
            name: true,
            unit: true,
            price: true,
          },
        })

        if (pending.itemType === 'MATERIAL') {
          const senderStock = await tx.vectraWarehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: pending.materialDefinitionId,
              assignedToId: me,
              transferPending: false,
            },
          })

          if (senderStock) {
            await tx.vectraWarehouse.update({
              where: { id: senderStock.id },
              data: { quantity: { increment: pending.quantity } },
            })
          } else {
            await tx.vectraWarehouse.create({
              data: {
                itemType: 'MATERIAL',
                name: pending.name,
                quantity: pending.quantity,
                unit: pending.unit,
                price: pending.price,
                status: 'ASSIGNED',
                materialDefinitionId: pending.materialDefinitionId,
                assignedToId: me,
              },
            })
          }

          await tx.vectraWarehouse.delete({ where: { id: input.itemId } })
        } else {
          await tx.vectraWarehouse.update({
            where: { id: input.itemId },
            data: { transferPending: false, transferToId: null },
          })
        }
      })
      return { ok: true }
    }),
})
