// src/server/modules/opl-crm/helpers/mappers/mapOrderToTimelineVM.ts

import { RouterOutputs } from '@/types'
import { OplOrderWithAttempts } from '@/types/opl-crm'
import { OplOrderStatus } from '@prisma/client'

type OrderOutput = RouterOutputs['opl']['order']['getOrderById']

type TimelineHistoryEntry = {
  id: string
  changeDate: Date
  statusBefore?: OplOrderStatus
  statusAfter?: OplOrderStatus
  notes?: string | null
  changedBy?: { name: string } | null
}

/**
 * Maps full OPL order (with attempts and history) into a timeline-friendly view model.
 * Relational assignment model is flattened into a single "assigned technician"
 * based on the first available assignment entry.
 */
export function mapOrderToTimelineVM(
  order: OrderOutput
): OplOrderWithAttempts & {
  type: OrderOutput['type']
  closedAt?: Date | null
  history?: TimelineHistoryEntry[]
} {
  const currentTechnician = order.assignments?.[0]?.technician?.user ?? null

  return {
    id: order.id,
    type: order.type,
    orderNumber: order.orderNumber,
    attemptNumber: order.attemptNumber,
    status: order.status,
    failureReason: order.failureReason,
    notes: order.notes,
    date: order.date,
    closedAt: order.closedAt,

    assignedTo: currentTechnician
      ? {
          id: currentTechnician.id,
          name: currentTechnician.name,
        }
      : null,

    previousOrder: order.previousOrder
      ? {
          id: order.previousOrder.id,
          attemptNumber: order.previousOrder.attemptNumber,
          status: order.previousOrder.status,
          failureReason: order.previousOrder.failureReason,
          assignedTo: order.previousOrder.assignments?.[0]?.technician?.user
            ? {
                id: order.previousOrder.assignments[0].technician.user.id,
                name: order.previousOrder.assignments[0].technician.user.name,
              }
            : null,
        }
      : null,

    attempts: order.attempts.map((a) => {
      const attemptTechnician = a.assignments?.[0]?.technician?.user ?? null

      return {
        id: a.id,
        attemptNumber: a.attemptNumber,
        status: a.status,
        failureReason: a.failureReason,
        notes: a.notes,
        date: a.date,
        completedAt: a.completedAt,
        closedAt: a.closedAt,
        createdAt: a.createdAt,
        assignedTo: attemptTechnician
          ? {
              id: attemptTechnician.id,
              name: attemptTechnician.name,
            }
          : null,
      }
    }),

    history: order.history?.map<TimelineHistoryEntry>((h) => ({
      id: h.id,
      changeDate: h.changeDate,
      statusBefore: h.statusBefore,
      statusAfter: h.statusAfter,
      notes: h.notes,
      changedBy: h.changedBy ? { name: h.changedBy.user.name } : null,
    })),
  }
}
