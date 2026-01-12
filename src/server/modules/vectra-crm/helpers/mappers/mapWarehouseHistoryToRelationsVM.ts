// src/server/modules/vectra-crm/helpers/mapWarehouseHistoryToRelationsVM.ts

import { WarehouseHistoryWithRelations } from '@/types/vectra-crm'
import { Prisma } from '@prisma/client'

type HistoryRow = Prisma.VectraWarehouseHistoryGetPayload<{
  include: {
    performedBy: {
      select: {
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
    warehouseItem: {
      include: {
        location: true
      }
    }
    fromLocation: true
    toLocation: true
  }
}>

/**
 * Maps warehouse history rows to a rich VM
 * used by the full Warehouse History table.
 */
export const mapWarehouseHistoryToRelationsVM = (
  rows: HistoryRow[]
): WarehouseHistoryWithRelations[] =>
  rows.map((h) => ({
    id: h.id,
    action: h.action,
    actionDate: h.actionDate,
    quantity: h.quantity,
    notes: h.notes,

    performedBy: {
      user: {
        id: h.performedBy.user.id,
        name: h.performedBy.user.name,
      },
    },

    assignedTo: h.assignedTo
      ? {
          user: {
            id: h.assignedTo.user.id,
            name: h.assignedTo.user.name,
          },
        }
      : null,

    // ✅ TO BYŁO BRAKUJĄCE
    assignedOrder: h.assignedOrder
      ? {
          id: h.assignedOrder.id,
          orderNumber: h.assignedOrder.orderNumber,
        }
      : null,

    warehouseItem: h.warehouseItem,
    fromLocation: h.fromLocation,
    toLocation: h.toLocation,
  }))
