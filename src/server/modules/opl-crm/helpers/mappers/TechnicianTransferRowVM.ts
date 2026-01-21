// src/server/modules/opl-crm/helpers/mappers/TechnicianTransferRowVM.ts

import {
  OplDeviceCategory,
  OplMaterialUnit,
  OplWarehouseItemType,
} from '@prisma/client'
import { UserVM, mapOplUserToVM } from './mapOplUserToVM'

/**
 * TechnicianTransferRowVM
 * ------------------------------------------------------------------
 * UI-friendly representation of a single technician-to-technician
 * warehouse transfer row.
 *
 * This shape is consumed directly by React components and must NOT
 * expose any Prisma or relational database structures.
 */
export interface TechnicianTransferRowVM {
  id: string
  name: string
  itemType: OplWarehouseItemType
  serialNumber: string | null
  quantity: number
  unit: OplMaterialUnit
  category: OplDeviceCategory | null
  transferPending: boolean
  transferToId: string | null
  transferTo: UserVM | null
  assignedTo: UserVM | null
  incoming: boolean
}

/**
 * TechnicianTransferSource
 * ------------------------------------------------------------------
 * Minimal source shape required from Prisma/TRPC queries in order
 * to build a TechnicianTransferRowVM.
 *
 * This type represents backend data and MUST NOT be used in UI.
 */
interface TechnicianTransferSource {
  id: string
  name: string
  itemType: OplWarehouseItemType
  serialNumber: string | null
  quantity: number
  unit: OplMaterialUnit
  category: OplDeviceCategory | null
  transferPending: boolean
  transferToId: string | null
  transferTo: { userId: string; user: { id: string; name: string } } | null
  assignedTo: { userId: string; user: { id: string; name: string } } | null
}

/**
 * mapTechnicianTransferToVM
 * ------------------------------------------------------------------
 * Maps a warehouse transfer source object (Prisma/TRPC shape)
 * into a UI-safe TechnicianTransferRowVM.
 *
 * This function acts as a strict boundary between backend models
 * and frontend view models.
 */
export const mapTechnicianTransferToVM = (
  item: TechnicianTransferSource,
  incoming: boolean
): TechnicianTransferRowVM => {
  return {
    id: item.id,
    name: item.name,
    itemType: item.itemType,
    serialNumber: item.serialNumber,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    transferPending: item.transferPending,
    transferToId: item.transferToId ?? null,
    transferTo: mapOplUserToVM(item.transferTo),
    assignedTo: mapOplUserToVM(item.assignedTo),
    incoming,
  }
}
