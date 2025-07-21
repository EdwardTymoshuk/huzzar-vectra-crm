import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { Prisma, WarehouseAction } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/* ------------------------------------------------------------------ */
/* Helper – create a history entry inside an existing transaction     */
/* ------------------------------------------------------------------ */
const addHistory = ({
  prisma,
  itemId,
  userId,
  action,
  qty,
  notes,
  assignedToId,
}: {
  prisma: Prisma.TransactionClient
  itemId: string
  userId: string
  action: WarehouseAction
  qty: number
  notes?: string | null
  assignedToId?: string | null
}) =>
  prisma.warehouseHistory.create({
    data: {
      warehouseItemId: itemId,
      performedById: userId,
      action,
      quantity: qty,
      notes,
      assignedToId: assignedToId ?? null,
    },
  })

/* ================================================================== */
/*  Warehouse transfer router – technicians can send/receive items    */
/* ================================================================== */
export const warehouseTransferRouter = router({
  /* ------------------------------------------------------------ *
   * 1. Transfers waiting for the current technician to accept / reject
   * ------------------------------------------------------------ */
  getIncomingTransfers: technicianOnly.query(({ ctx }) =>
    ctx.prisma.warehouse.findMany({
      where: { transferToId: ctx.user!.id, transferPending: true },
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
  ),

  /* ------------------------------------------------------------ *
   * 2. requestTransfer – Technician A ➜ Technician B
   *    • DEVICES   → set flags only
   *    • MATERIALS → create / update pending row AND decrement A‑stock
   * ------------------------------------------------------------ */
  requestTransfer: technicianOnly
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
      const me = ctx.user!.id

      await ctx.prisma.$transaction(async (tx) => {
        for (const { itemId, quantity } of input.items) {
          /* 1️⃣ fetch sender row & guard ownership */
          const row = await tx.warehouse.findUniqueOrThrow({
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

          /* 2️⃣ devices → tylko flagi */
          if (row.itemType === 'DEVICE') {
            await tx.warehouse.update({
              where: { id: row.id },
              data: {
                transferPending: true,
                transferToId: input.newTechnicianId,
              },
            })
            continue
          }

          /* 3️⃣ materials */
          if (row.quantity < quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Za mało materiału: "${row.name}"`,
            })
          }

          const existingPending = await tx.warehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: row.materialDefinitionId,
              assignedToId: me,
              transferToId: input.newTechnicianId,
              transferPending: true,
            },
          })

          if (existingPending) {
            await tx.warehouse.update({
              where: { id: existingPending.id },
              data: { quantity: { increment: quantity } },
            })
          } else {
            await tx.warehouse.create({
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

          /* 3‑b. od razu zmniejszamy stan technika A */
          await tx.warehouse.update({
            where: { id: row.id },
            data: { quantity: { decrement: quantity } },
          })
        }
      })

      return { ok: true }
    }),

  /* ------------------------------------------------------------ *
   * 3. confirmTransfer – Technician B akceptuje
   * ------------------------------------------------------------ */
  confirmTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id

      await ctx.prisma.$transaction(async (tx) => {
        const pending = await tx.warehouse.findUniqueOrThrow({
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

        /* Merge with recipient stock (material) */
        let targetId = pending.id
        if (pending.itemType === 'MATERIAL') {
          const recipientStock = await tx.warehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: pending.materialDefinitionId,
              assignedToId: me,
              transferPending: false,
            },
          })

          if (recipientStock) {
            await tx.warehouse.update({
              where: { id: recipientStock.id },
              data: { quantity: { increment: qty } },
            })
            targetId = recipientStock.id
            await tx.warehouse.delete({ where: { id: pending.id } })
          } else {
            await tx.warehouse.update({
              where: { id: pending.id },
              data: {
                assignedToId: me,
                transferPending: false,
                transferToId: null,
              },
            })
          }
        } else {
          /* device – just clear flags */
          await tx.warehouse.update({
            where: { id: pending.id },
            data: {
              assignedToId: me,
              transferPending: false,
              transferToId: null,
            },
          })
        }

        /* single TRANSFER history record */
        await addHistory({
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

  /* ------------------------------------------------------------ *
   * 4. rejectTransfer – Technician B odrzuca
   *    • MATERIALS → zwrot ilości do technika A
   *    • DEVICES   → czyszczenie flag
   * ------------------------------------------------------------ */
  rejectTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id

      await ctx.prisma.$transaction(async (tx) => {
        const pending = await tx.warehouse.findUniqueOrThrow({
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
          /* oddajemy ilość do technika A */
          const senderStock = await tx.warehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: pending.materialDefinitionId,
              assignedToId: pending.assignedToId,
              transferPending: false,
            },
          })

          if (senderStock) {
            await tx.warehouse.update({
              where: { id: senderStock.id },
              data: { quantity: { increment: pending.quantity } },
            })
          } else {
            await tx.warehouse.create({
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

          /* usuwamy wiersz pending */
          await tx.warehouse.delete({ where: { id: input.itemId } })
        } else {
          /* device – po prostu kasujemy flagi */
          await tx.warehouse.update({
            where: { id: input.itemId },
            data: { transferPending: false, transferToId: null },
          })
        }
      })

      return { ok: true }
    }),

  /* ------------------------------------------------------------ *
   * 5. cancelTransfer – Technician A anuluje własne pending‑zlecenie
   * ------------------------------------------------------------ */
  cancelTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id

      await ctx.prisma.$transaction(async (tx) => {
        const pending = await tx.warehouse.findUniqueOrThrow({
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
          const senderStock = await tx.warehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              materialDefinitionId: pending.materialDefinitionId,
              assignedToId: me,
              transferPending: false,
            },
          })

          if (senderStock) {
            await tx.warehouse.update({
              where: { id: senderStock.id },
              data: { quantity: { increment: pending.quantity } },
            })
          } else {
            await tx.warehouse.create({
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

          await tx.warehouse.delete({ where: { id: input.itemId } })
        } else {
          await tx.warehouse.update({
            where: { id: input.itemId },
            data: { transferPending: false, transferToId: null },
          })
        }
      })

      return { ok: true }
    }),
})
