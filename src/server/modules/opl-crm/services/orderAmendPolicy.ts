// src/server/modules/opl-crm/services/orderAmendPolicy.ts

import { DbTx } from '@/types'
import { TRPCError } from '@trpc/server'
import { differenceInMinutes } from 'date-fns'

/**
 * Validates whether a technician is allowed to amend a completed order.
 *
 * Rules:
 * - Order must exist
 * - Technician must be assigned to the order (N:N relation)
 * - Order must be completed
 * - Amendment window is limited (default 15 minutes)
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

  const order = await tx.oplOrder.findFirst({
    where: {
      id: orderId,
      assignments: {
        some: {
          technicianId,
        },
      },
    },
    select: {
      completedAt: true,
    },
  })

  if (!order) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Brak dostępu do zlecenia lub zlecenie nie istnieje',
    })
  }

  /** Order must be completed */
  if (!order.completedAt) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Zlecenie nie jest zakończone',
    })
  }

  /** Validate amendment time window */
  const diff = differenceInMinutes(new Date(), order.completedAt)

  if (diff > windowMinutes) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Czas na poprawki minął (${windowMinutes} min).`,
    })
  }
}
