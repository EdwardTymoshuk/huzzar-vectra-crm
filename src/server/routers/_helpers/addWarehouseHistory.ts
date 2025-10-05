import { Prisma, PrismaClient, WarehouseAction } from '@prisma/client'

/**
 * addHistory – creates a warehouse history record with optional location metadata.
 * Used across all warehouse routers (mutations, transfers, returns, etc.).
 */
export const addWarehouseHistory = async ({
  prisma,
  itemId,
  userId,
  action,
  qty,
  notes,
  fromLocationId,
  toLocationId,
  transferId,
  assignedToId,
}: {
  prisma: Prisma.TransactionClient | PrismaClient
  itemId: string
  userId: string
  action: WarehouseAction
  qty: number
  notes?: string | null
  fromLocationId?: string | null
  toLocationId?: string | null
  transferId?: string | null
  assignedToId?: string | null
}) => {
  const item = await prisma.warehouse.findUnique({
    where: { id: itemId },
    select: { locationId: true },
  })

  return prisma.warehouseHistory.create({
    data: {
      warehouseItemId: itemId,
      performedById: userId,
      action,
      quantity: qty,
      notes,
      fromLocationId,
      toLocationId: toLocationId ?? item?.locationId ?? null,
      locationTransferId: transferId ?? null,
      assignedToId: assignedToId ?? null,
    },
  })
}
