// server/orders/transfer.ts
import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { z } from 'zod'
import { addOrderHistory } from '../../helpers/addOrderHistory'
import { vectraUserBasicSelect } from '../../helpers/selects'

/**
 * transferRouter – handles technician-to-technician order transfers.
 * Includes request, accept, and reject actions with history tracking.
 */
export const transferRouter = router({
  /** Returns transfers waiting for the current technician’s decision */
  getIncomingTransfers: technicianOnly.query(({ ctx }) => {
    const user = getCoreUserOrThrow(ctx)

    return ctx.prisma.vectraOrder.findMany({
      where: { transferToId: user.id, transferPending: true },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        city: true,
        street: true,
        date: true,
        timeSlot: true,
        assignedTo: { select: vectraUserBasicSelect },
      },
    })
  }),

  /** Technician A → asks technician B to take the order */
  requestTransfer: technicianOnly
    .input(z.object({ orderId: z.string(), newTechnicianId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { orderId, newTechnicianId } = input
      const user = getCoreUserOrThrow(ctx)
      const me = user.id

      await ctx.prisma.$transaction(async (tx) => {
        const targetTech = await tx.user.findUnique({
          where: { id: newTechnicianId },
          select: { name: true },
        })

        if (!targetTech) throw new Error('Nie znaleziono technika docelowego.')

        const order = await tx.vectraOrder.update({
          where: { id: orderId, assignedToId: me },
          data: {
            transferToId: newTechnicianId,
            transferPending: true,
          },
          select: { status: true },
        })

        await addOrderHistory({
          orderId,
          userId: me,
          before: order.status,
          after: order.status,
          note: `Zlecenie przekazane do technika ${targetTech.name}`,
          prisma: tx,
        })
      })

      return { ok: true }
    }),

  /** Technician B → accepts the transfer */
  confirmTransfer: technicianOnly
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = getCoreUserOrThrow(ctx)
      const userId = user.id
      const userName = user.name
      const { orderId } = input

      await ctx.prisma.$transaction(async (tx) => {
        const current = await tx.vectraOrder.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true },
        })

        await tx.vectraOrder.update({
          where: { id: orderId, transferToId: userId, transferPending: true },
          data: {
            assignedToId: userId,
            transferToId: null,
            transferPending: false,
          },
        })

        await addOrderHistory({
          orderId,
          userId,
          before: current.status,
          after: current.status,
          note: `Technik ${userName} przyjął przekazane zlecenie`,
          prisma: tx,
        })
      })

      return { ok: true }
    }),

  /** Technician B → rejects the transfer */
  rejectTransfer: technicianOnly
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id: userId, name: userName } = getCoreUserOrThrow(ctx)
      const { orderId } = input

      await ctx.prisma.$transaction(async (tx) => {
        const current = await tx.vectraOrder.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true },
        })

        await tx.vectraOrder.update({
          where: { id: orderId, transferToId: userId, transferPending: true },
          data: {
            transferToId: null,
            transferPending: false,
          },
        })

        await addOrderHistory({
          orderId,
          userId,
          before: current.status,
          after: current.status,
          note: `Technik ${userName} odrzucił przekazane zlecenie`,
          prisma: tx,
        })
      })

      return { ok: true }
    }),
})
