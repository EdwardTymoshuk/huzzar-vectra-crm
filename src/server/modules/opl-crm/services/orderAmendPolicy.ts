//src/server/modules/opl-crm/services/orderAmendpolicy.ts

import { DbTx } from '@/types'
import { TRPCError } from '@trpc/server'
import { differenceInMinutes } from 'date-fns'

/**
 * Validates whether a technician is allowed to amend a completed order.
 * - Order must be completed
 * - Technician must be assigned to the order
 * - Amendment window is limited (15 minutes)
 */
export const canTechnicianAmendOrder = async (
  tx: DbTx,
  params: {
    orderId: string
    technicianId: string
    windowMinutes?: number
  }
): Promise<void> => {
  const { orderId, technicianId, windowMinutes = 15 } = params

  const order = await tx.oplOrder.findUnique({
    where: { id: orderId },
    select: {
      assignedToId: true,
      completedAt: true,
      status: true,
    },
  })

  if (!order) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Zlecenie nie istnieje',
    })
  }

  if (order.assignedToId !== technicianId) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }

  if (!order.completedAt) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Zlecenie nie jest zakończone',
    })
  }

  const diff = differenceInMinutes(new Date(), order.completedAt)
  if (diff > windowMinutes) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Czas na poprawki minął (${windowMinutes} min).`,
    })
  }
}
