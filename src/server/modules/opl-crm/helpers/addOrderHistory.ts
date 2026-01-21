//src/server/modules/opl-crm/helpers/addOrderHistory.ts

import { OplOrderStatus, Prisma } from '@prisma/client'

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
  before: OplOrderStatus
  after: OplOrderStatus
  note?: string | null
}) => {
  return prisma.oplOrderHistory.create({
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
