// server/orders/transfer.ts
import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { OrderStatus, Prisma } from '@prisma/client'
import { z } from 'zod'

/**
 * Helper – writes a single history entry inside the current transaction
 */
const addHistory = async ({
  orderId,
  userId,
  before,
  after,
  note,
  prisma,
}: {
  orderId: string
  userId: string
  before: OrderStatus
  after: OrderStatus
  note: string | null
  prisma: Prisma.TransactionClient // ← Transaction-scoped client
}) =>
  prisma.orderHistory.create({
    data: {
      orderId,
      changedById: userId,
      statusBefore: before,
      statusAfter: after,
      notes: note,
      equipmentUsed: [],
    },
  })

export const transferRouter = router({
  /** Returns transfers waiting for the current technician’s decision */
  getIncomingTransfers: technicianOnly.query(({ ctx }) =>
    ctx.prisma.order.findMany({
      where: { transferToId: ctx.user!.id, transferPending: true },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        city: true,
        street: true,
        date: true,
        timeSlot: true,
        assignedTo: {
          select: { id: true, name: true },
        },
      },
    })
  ),

  /** Technician A → asks technician B to take the order */
  requestTransfer: technicianOnly
    .input(z.object({ orderId: z.string(), newTechnicianId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orderId, newTechnicianId } = input
      const { id: me } = ctx.user!

      await ctx.prisma.$transaction(async (tx) => {
        const order = await tx.order.update({
          where: { id: orderId, assignedToId: me },
          data: { transferToId: newTechnicianId, transferPending: true },
          select: { status: true },
        })

        await addHistory({
          orderId,
          userId: me,
          before: order.status,
          after: order.status,
          note: `Zlecenie przekazane do technika ${newTechnicianId}`,
          prisma: tx,
        })
      })

      return { ok: true }
    }),

  /** Technician B → accepts the transfer */
  confirmTransfer: technicianOnly
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input
      const { id: me } = ctx.user!

      await ctx.prisma.$transaction(async (tx) => {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true },
        })

        await tx.order.update({
          where: { id: orderId, transferToId: me, transferPending: true },
          data: {
            assignedToId: me,
            transferToId: null,
            transferPending: false,
          },
        })

        await addHistory({
          orderId,
          userId: me,
          before: current.status,
          after: current.status, // status stays ASSIGNED
          note: `Technik ${me} przyjął przekazane zlecenie`,
          prisma: tx,
        })
      })

      return { ok: true }
    }),

  /** Technician B → rejects the transfer */
  rejectTransfer: technicianOnly
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input
      const { id: me } = ctx.user!

      await ctx.prisma.$transaction(async (tx) => {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true },
        })

        await tx.order.update({
          where: { id: orderId, transferToId: me, transferPending: true },
          data: { transferToId: null, transferPending: false },
        })

        await addHistory({
          orderId,
          userId: me,
          before: current.status,
          after: current.status,
          note: `Technik ${me} odrzucił przekazane zlecenie`,
          prisma: tx,
        })
      })

      return { ok: true }
    }),
})
