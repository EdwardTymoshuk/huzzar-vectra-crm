// src/server/modules/opl-crm/helpers/mapWarehouseHistoryToVM.ts

import { OplWarehouseHistoryRowVM } from '@/types/opl-crm'
import { Prisma } from '@prisma/client'
import { mapOplUserToVM } from './mapOplUserToVM'

type HistoryRow = Prisma.OplWarehouseHistoryGetPayload<{
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
): OplWarehouseHistoryRowVM[] => {
  return rows.map((h) => ({
    id: h.id,
    action: h.action,
    actionDate: h.actionDate,
    quantity: h.quantity,
    notes: h.notes,

    performedBy: mapOplUserToVM(h.performedBy),
    assignedTo: mapOplUserToVM(h.assignedTo),

    assignedOrderId: h.assignedOrder?.id ?? null,
    assignedOrder: h.assignedOrder
      ? {
          id: h.assignedOrder.id,
          orderNumber: h.assignedOrder.orderNumber,
        }
      : null,
  }))
}
