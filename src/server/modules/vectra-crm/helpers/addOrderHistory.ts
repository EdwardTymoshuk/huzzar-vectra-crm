//src/server/modules/vectra-crm/helpers/addOrderHistory.ts

import { Prisma, VectraOrderStatus } from '@prisma/client'

/**
 * addOrderHistory – creates a single order history record inside current transaction.
 * Used in order-related routers (transfers, status changes, completion, etc.).
 */
export const addOrderHistory = async ({
  prisma,
  orderId,
  userId,
  before,
  after,
  note,
}: {
  prisma: Prisma.TransactionClient
  orderId: string
  userId: string
  before: VectraOrderStatus
  after: VectraOrderStatus
  note?: string | null
}) => {
  return prisma.vectraOrderHistory.create({
    data: {
      orderId,
      changedById: userId,
      statusBefore: before,
      statusAfter: after,
      notes: note,
      equipmentUsed: [],
    },
  })
}
