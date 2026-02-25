'use client'

import { OplOrderStatus } from '@prisma/client'

export const PLANNER_ORDER_STATUS_COLORS: Record<
  OplOrderStatus | 'UNASSIGNED',
  string
> = {
  ASSIGNED: '#f59e0b',
  PENDING: '#26303d',
  COMPLETED: '#22c55e',
  NOT_COMPLETED: '#ef4444',
  UNASSIGNED: '#26303d',
}
