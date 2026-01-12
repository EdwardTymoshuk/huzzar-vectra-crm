// src/server/modules/vectra-crm/helpers/mapWarehouseHistoryToVM.ts

import { WarehouseHistoryRowVM } from '@/types/vectra-crm'
import { Prisma } from '@prisma/client'
import { mapVectraUserToVM } from './mapVectraUserToVM'

type HistoryRow = Prisma.VectraWarehouseHistoryGetPayload<{
  include: {
    performedBy: {
      select: {
        userId: true
        user: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    assignedTo: {
      select: {
        userId: true
        user: {
          select: {
            id: true
            name: true
          }
        }
      }
    }
    assignedOrder: {
      select: {
        id: true
        orderNumber: true
      }
    }
  }
}>

export const mapWarehouseHistoryToVM = (
  rows: HistoryRow[]
): WarehouseHistoryRowVM[] => {
  return rows.map((h) => ({
    id: h.id,
    action: h.action,
    actionDate: h.actionDate,
    quantity: h.quantity,
    notes: h.notes,

    performedBy: mapVectraUserToVM(h.performedBy),
    assignedTo: mapVectraUserToVM(h.assignedTo),

    assignedOrderId: h.assignedOrder?.id ?? null,
    assignedOrder: h.assignedOrder
      ? {
          id: h.assignedOrder.id,
          orderNumber: h.assignedOrder.orderNumber,
        }
      : null,
  }))
}
