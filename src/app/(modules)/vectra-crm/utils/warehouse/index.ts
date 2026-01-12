import { VectraDeviceCategory, VectraWarehouseAction } from '@prisma/client'

/**
 * SlimHistory
 * ------------
 * Reduced history entry containing only the fields required for UI.
 */
export type SlimHistory = {
  action: VectraWarehouseAction
  actionDate: Date | string
  quantity: number | null
  assignedOrderId: string | null
  performedBy?: { id: string; name: string } | null
  assignedTo?: { id: string; name: string } | null
}

/**
 * SlimWarehouseItem
 * -----------------
 * Reduced warehouse item structure used in both Admin and Technician UI.
 * Keeps payload smaller than Prisma full relations.
 */
export type SlimWarehouseItem = {
  id: string
  name: string
  itemType: 'DEVICE' | 'MATERIAL'
  category?: VectraDeviceCategory
  serialNumber: string | null
  index: string | null
  unit: string | null
  createdAt: Date | string
  updatedAt: Date | string
  quantity: number
  price: number
  status: string
  assignedToId: string | null
  assignedTo?: { id: string; name: string } | null
  location?: { id: string; name: string } | null
  transferPending: boolean
  orderAssignments: {
    order: { id: string; orderNumber: string; createdAt: Date } | null
  }[]
  history: SlimHistory[]
}

/* ---------------- helpers ---------------- */

/**
 * Returns the first matching action in history (chronological).
 */
export const getActionDate = (
  hist: SlimHistory[],
  action: VectraWarehouseAction
): Date | null => {
  const h = hist.find((x) => x.action === action)
  return h ? new Date(h.actionDate) : null
}

/**
 * Returns the last matching action in history (reverse chronological).
 */
export const getLastActionDate = (
  hist: SlimHistory[],
  action: VectraWarehouseAction
): Date | null => {
  for (let i = hist.length - 1; i >= 0; i--)
    if (hist[i].action === action) return new Date(hist[i].actionDate)
  return null
}

/**
 * Returns the last action object (with performer/assignedTo).
 */
export const getLastAction = (
  hist: SlimHistory[],
  action: VectraWarehouseAction
): SlimHistory | undefined => {
  for (let i = hist.length - 1; i >= 0; i--)
    if (hist[i].action === action) return hist[i]
  return undefined
}

/**
 * Formats a Date into dd.MM.yyyy or returns a dash if null.
 */
import { format } from 'date-fns'
export const fmt = (d: Date | null, f = 'dd.MM.yyyy'): string =>
  d ? format(d, f) : '—'
