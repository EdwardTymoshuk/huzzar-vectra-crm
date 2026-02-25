'use client'

import { VectraOrderStatus } from '@prisma/client'

export const PLANNER_ORDER_STATUS_COLORS: Record<
  VectraOrderStatus | 'UNASSIGNED',
  string
> = {
  ASSIGNED: '#26303d',
  PENDING: '#26303d',
  COMPLETED: '#66b266',
  NOT_COMPLETED: '#E6262D',
  UNASSIGNED: '#E6262D',
}
