import { OplDeviceCategory, OplWarehouseAction } from '@prisma/client'

/**
 * SlimHistory
 * ------------
 * Reduced history entry containing only the fields required for UI.
 */
export type OplSlimHistory = {
  action: OplWarehouseAction
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
export type OplSlimWarehouseItem = {
  id: string
  name: string
  itemType: 'DEVICE' | 'MATERIAL'
  category?: OplDeviceCategory
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
  history: OplSlimHistory[]
}

/* ---------------- helpers ---------------- */

/**
 * Returns the first matching action in history (chronological).
 */
export const getOplActionDate = (
  hist: OplSlimHistory[],
  action: OplWarehouseAction
): Date | null => {
  const h = hist.find((x) => x.action === action)
  return h ? new Date(h.actionDate) : null
}

/**
 * Returns the last matching action in history (reverse chronological).
 */
export const getOplLastActionDate = (
  hist: OplSlimHistory[],
  action: OplWarehouseAction
): Date | null => {
  for (let i = hist.length - 1; i >= 0; i--)
    if (hist[i].action === action) return new Date(hist[i].actionDate)
  return null
}

/**
 * Returns the last action object (with performer/assignedTo).
 */
export const getOplLastAction = (
  hist: OplSlimHistory[],
  action: OplWarehouseAction
): OplSlimHistory | undefined => {
  for (let i = hist.length - 1; i >= 0; i--)
    if (hist[i].action === action) return hist[i]
  return undefined
}
