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
 *
 * Supports N:N technician assignments.
 * All assigned technicians are preserved (no flattening).
 */
export function mapOrderToTimelineVM(
  order: OrderOutput
): OplOrderWithAttempts & {
  type: OrderOutput['type']
  completedAt?: Date | null
  closedAt?: Date | null
  history?: TimelineHistoryEntry[]
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
    completedAt: order.completedAt,
    closedAt: order.closedAt,

    /** Preserve all assigned technicians (N:N) */
    assignedTechnicians:
      order.assignments?.map((a) => ({
        id: a.technician.user.id,
        name: a.technician.user.name,
      })) ?? [],

    /** Previous attempt */
    previousOrder: order.previousOrder
      ? {
          id: order.previousOrder.id,
          attemptNumber: order.previousOrder.attemptNumber,
          status: order.previousOrder.status,
          failureReason: order.previousOrder.failureReason,
          completedByName:
            order.previousOrder.history?.[0]?.changedBy?.user?.name ?? null,

          assignedTechnicians:
            order.previousOrder.assignments?.map((a) => ({
              id: a.technician.user.id,
              name: a.technician.user.name,
            })) ?? [],
        }
      : null,

    /** All attempts */
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

      assignedTechnicians:
        a.assignments?.map((ass) => ({
          id: ass.technician.user.id,
          name: ass.technician.user.name,
        })) ?? [],
    })),

    /** History entries */
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
