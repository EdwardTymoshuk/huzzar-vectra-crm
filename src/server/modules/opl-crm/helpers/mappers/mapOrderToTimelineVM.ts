// src/server/modules/opl-crm/helpers/mappers/mapOrderToTimelineVM.ts

import { RouterOutputs } from '@/types'
import { OplOrderWithAttempts } from '@/types/opl-crm'

type OrderOutput = RouterOutputs['opl']['order']['getOrderById']

export function mapOrderToTimelineVM(
  order: OrderOutput
): OplOrderWithAttempts & {
  type: OrderOutput['type']
  closedAt?: Date | null
  history?: {
    id: string
    changeDate: Date
    statusBefore?: any
    statusAfter?: any
    notes?: string | null
    changedBy?: { name: string } | null
  }[]
} {
  return {
    id: order.id,
    type: order.type,
    orderNumber: order.orderNumber,
    attemptNumber: order.attemptNumber,
    status: order.status,
    failureReason: order.failureReason,
    notes: order.notes,
    date: order.date,

    assignedTo: order.assignedTo
      ? {
          id: order.assignedTo.user.id,
          name: order.assignedTo.user.name,
        }
      : null,

    previousOrder: order.previousOrder
      ? {
          id: order.previousOrder.id,
          attemptNumber: order.previousOrder.attemptNumber,
          status: order.previousOrder.status,
          failureReason: order.previousOrder.failureReason,
          assignedTo: order.previousOrder.assignedTo
            ? {
                id: order.previousOrder.assignedTo.user.id,
                name: order.previousOrder.assignedTo.user.name,
              }
            : null,
        }
      : null,

    attempts: order.attempts.map((a) => ({
      id: a.id,
      attemptNumber: a.attemptNumber,
      status: a.status,
      failureReason: a.failureReason,
      notes: a.notes,
      date: a.date,
      completedAt: a.completedAt,
      closedAt: a.closedAt,
      createdAt: a.createdAt,
      assignedTo: a.assignedTo
        ? {
            id: a.assignedTo.id,
            name: a.assignedTo.name,
          }
        : null,
    })),

    history: order.history?.map((h) => ({
      id: h.id,
      changeDate: h.changeDate,
      statusBefore: h.statusBefore,
      statusAfter: h.statusAfter,
      notes: h.notes,
      changedBy: h.changedBy ? { name: h.changedBy.user.name } : null,
    })),

    closedAt: order.closedAt,
  }
}
