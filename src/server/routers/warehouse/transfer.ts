// src/server/warehouse/transfer.ts
import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { Prisma } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

/* ------------------------------------------------------------------ */
/** Helper – write a single warehouseHistory entry inside TX */
const addHistory = ({
  prisma,
  itemId,
  userId,
  action,
  qty,
  notes,
}: {
  prisma: Prisma.TransactionClient
  itemId: string
  userId: string
  action: 'ISSUED' | 'RECEIVED' | 'RETURNED'
  qty: number
  notes?: string | null
}) =>
  prisma.warehouseHistory.create({
    data: {
      warehouseItemId: itemId,
      performedById: userId,
      action,
      quantity: qty,
      notes,
    },
  })

/* ------------------------------------------------------------------ */
export const warehouseTransferRouter = router({
  /* ========== 1. list items awaiting *my* decision ========== */
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

  /* ========== 2. requestTransfer – A  ➜  B  ========== */
  requestTransfer: technicianOnly
    .input(
      z.object({
        newTechnicianId: z.string(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive().default(1), // 1 for devices
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id

      console.log(me)

      await ctx.prisma.$transaction(async (tx) => {
        for (const { itemId, quantity } of input.items) {
          /* -------- fetch row & sanity-check ownership -------- */
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
              message: 'Przedmiot nie należy do Ciebie',
            })
          }

          /* ================= DEVICE ================= */
          if (row.itemType === 'DEVICE') {
            /* flag as pending – pozostaje przypisany do A */
            await tx.warehouse.update({
              where: { id: row.id },
              data: {
                transferPending: true,
                transferToId: input.newTechnicianId,
              },
            })

            await addHistory({
              prisma: tx,
              itemId: row.id,
              userId: me,
              action: 'ISSUED',
              qty: 1,
              notes: `Przekazano urządzenie do technika ${input.newTechnicianId}`,
            })
            continue
          }

          /* ================= MATERIAL ================= */
          /* 1. Make sure I have enough */
          if (row.quantity < quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Za mało materiału „${row.name}”`,
            })
          }

          /* 2. Decrement my stock row (might hit 0) */
          await tx.warehouse.update({
            where: { id: row.id },
            data: { quantity: { decrement: quantity } },
          })

          await addHistory({
            prisma: tx,
            itemId: row.id,
            userId: me,
            action: 'ISSUED',
            qty: quantity,
            notes: `Przekazano ${quantity} ${row.unit} do technika ${input.newTechnicianId}`,
          })

          /* 3. Create NEW pending row carrying the quantity */
          const pendingRow = await tx.warehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: row.name,
              quantity: quantity,
              unit: row.unit,
              price: row.price,
              status: 'ASSIGNED',
              materialDefinitionId: row.materialDefinitionId,
              // ownership stays with *sender* until accept/reject
              assignedToId: me,
              transferPending: true,
              transferToId: input.newTechnicianId,
            },
          })

          await addHistory({
            prisma: tx,
            itemId: pendingRow.id,
            userId: me,
            action: 'RECEIVED', // “creates” the pending packet
            qty: quantity,
            notes: `Oczekuje na akceptację przez technika ${input.newTechnicianId}`,
          })
        }
      })

      return { ok: true }
    }),

  /* ========== 3. acceptTransfer – B  ✔  ========== */
  confirmTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id
      const { itemId } = input

      await ctx.prisma.$transaction(async (tx) => {
        const row = await tx.warehouse.findUniqueOrThrow({
          where: { id: itemId, transferToId: me, transferPending: true },
          select: { itemType: true, quantity: true, unit: true, name: true },
        })

        /* simple accept – just flip assignment & flags */
        await tx.warehouse.update({
          where: { id: itemId },
          data: {
            assignedToId: me,
            transferToId: null,
            transferPending: false,
          },
        })

        await addHistory({
          prisma: tx,
          itemId: itemId,
          userId: me,
          action: 'RECEIVED',
          qty: row.itemType === 'DEVICE' ? 1 : row.quantity,
          notes: 'Technik zaakceptował przekazanie',
        })
      })

      return { ok: true }
    }),

  /* ========== 4. rejectTransfer – B  ✖  ========== */
  rejectTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id
      const { itemId } = input

      await ctx.prisma.$transaction(async (tx) => {
        const row = await tx.warehouse.findUniqueOrThrow({
          where: { id: itemId, transferToId: me, transferPending: true },
          select: {
            itemType: true,
            quantity: true,
            unit: true,
            name: true,
            assignedToId: true, // ← sender
          },
        })

        /* --- for MATERIAL we just cancel flags; quantity wraca do sendera automatycznie,
               bo wiersz już należy do niego (assignedToId). Ewentualne scalenie
               z innym rekordem można zrobić później. --- */

        await tx.warehouse.update({
          where: { id: itemId },
          data: { transferToId: null, transferPending: false },
        })

        await addHistory({
          prisma: tx,
          itemId: itemId,
          userId: me,
          action: 'RETURNED',
          qty: row.itemType === 'DEVICE' ? 1 : row.quantity,
          notes: 'Technik odrzucił przekazanie',
        })
      })

      return { ok: true }
    }),
  /* ========== 5. cancelTransfer – A ✎  ========== */
  cancelTransfer: technicianOnly
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const me = ctx.user!.id
      const { itemId } = input

      await ctx.prisma.$transaction(async (tx) => {
        const row = await tx.warehouse.findUniqueOrThrow({
          where: { id: itemId, assignedToId: me, transferPending: true },
          select: { itemType: true, quantity: true, unit: true, name: true },
        })

        /* clear flags – the item stays with the sender */
        await tx.warehouse.update({
          where: { id: itemId },
          data: { transferPending: false, transferToId: null },
        })

        await addHistory({
          prisma: tx,
          itemId,
          userId: me,
          action: 'RETURNED',
          qty: row.itemType === 'DEVICE' ? 1 : row.quantity,
          notes: 'Technik anulował przekazanie',
        })
      })

      return { ok: true }
    }),
})
