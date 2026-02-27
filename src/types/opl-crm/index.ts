//src/types/opl-crm/index.ts

// -----------------------------
// VECTRA CRM TYPES
// -----------------------------

import {
  OplActivationType,
  OplAddonCode,
  OplBaseWorkCode,
  OplDeviceCategory,
  OplMaterialUnit,
  OplOrderStatus,
  OplOrderStandard,
  OplOrderType,
  OplTimeSlot,
  OplNetworkOeprator,
  OplWarehouseAction,
  OplWarehouseItemType,
  OplWarehouseStatus,
} from '@prisma/client'

import {
  adminEditCompletionSchema,
  amendCompletionSchema,
  collectedDeviceSchema,
  completeOrderSchema,
  deviceSchema,
  materialSchema,
  operatorSchema,
  orderSchema,
  technicianOrderSchema,
  usedMaterialSchema,
  warehouseFormSchema,
  workCodeSchema,
} from '@/app/(modules)/opl-crm/lib/schema'

import type { Prisma } from '@prisma/client'

import { z } from 'zod'

// -----------------------------
// Forms (Zod)
// -----------------------------
export type DeviceFormData = z.infer<typeof deviceSchema>
export type MaterialFormData = z.infer<typeof materialSchema>
export type OperatorFormData = z.infer<typeof operatorSchema>

export type OplOrderFormData = z.infer<typeof orderSchema>
export type TechnicianOplOrderFormData = z.infer<typeof technicianOrderSchema>
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>

export type WorkCodeInput = z.infer<typeof workCodeSchema>
export type UsedMaterialInput = z.infer<typeof usedMaterialSchema>
export type CollectedDeviceInput = z.infer<typeof collectedDeviceSchema>

export type CompleteOrderInput = z.infer<typeof completeOrderSchema>
export type AmendCompletionInput = z.infer<typeof amendCompletionSchema>
export type AdminEditCompletionInput = z.infer<typeof adminEditCompletionSchema>

// -----------------------------
// OplWarehouse types
// -----------------------------

export type OplIssuedItemDevice = {
  id: string
  type: 'DEVICE'
  name: string
  serialNumber: string
  category: OplDeviceCategory
  status?: OplWarehouseStatus
  deviceDefinitionId: string | null
  sourceLabel?: string
}

export type OplIssuedItemMaterial = {
  id: string
  type: 'MATERIAL'
  name: string
  materialDefinitionId: string
  quantity: number
}

// Full warehouse history with relations
export type OplWarehouseHistoryWithRelations =
  Prisma.OplWarehouseHistoryGetPayload<{
    select: {
      id: true
      action: true
      actionDate: true
      quantity: true
      notes: true

      warehouseItem: {
        select: {
          id: true
          name: true
          itemType: true
          category: true
          serialNumber: true
          unit: true
          index: true
          location: {
            select: {
              id: true
              name: true
            }
          }
        }
      }

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

      fromLocation: {
        select: { id: true; name: true }
      }

      toLocation: {
        select: { id: true; name: true }
      }
    }
  }>

export type OplDeviceBasic = {
  id: string
  deviceDefinitionId: string | null
  name: string
  serialNumber: string | null
  category: OplDeviceCategory
  status?: OplWarehouseStatus
  sourceLabel?: string
}

// -----------------------------
// Order related
// -----------------------------

export interface OplTechnicianAssignment {
  rowId?: string
  dropTargetId?: string
  teamTechnicianIds?: string[]
  technicianName: string
  technicianId: string | null
  slots: {
    timeSlot: OplTimeSlot
    orders: {
      id: string
      orderNumber: string
      address: string
      lat?: number | null
      lng?: number | null
      date: Date
      operator: string
      status: OplOrderStatus
      notes?: string
      failureReason?: string | null
      standard?: OplOrderStandard | null
      network?: OplNetworkOeprator
      assignedToId?: string
      primaryTechnicianId?: string | null
      assignedTechnicians?: { id: string; name: string }[]
      completedByName?: string | null
    }[]
  }[]
}

export type SelectedCode = { code: string; quantity: number }

export type OplOrderWithAttempts = {
  id: string
  type: OplOrderType
  orderNumber: string
  attemptNumber: number
  status: OplOrderStatus
  failureReason?: string | null
  notes?: string | null
  date: Date
  assignedTechnicians: { id: string; name: string }[]
  previousOrder?: {
    id: string
    attemptNumber: number
    status: OplOrderStatus
    date?: Date | null
    completedAt?: Date | null
    closedAt?: Date | null
    failureReason?: string | null
    completedByName?: string | null
    assignedTechnicians: { id: string; name: string }[]
  } | null
  attempts: {
    id: string
    attemptNumber: number
    status: OplOrderStatus
    failureReason?: string | null
    notes?: string | null
    date: Date
    completedAt?: Date | null
    closedAt?: Date | null
    createdAt?: Date | null
    assignedTechnicians: { id: string; name: string }[]
  }[]
}

// -----------------------------
// Opl user
// -----------------------------

export type OplUserWithLocations = Prisma.OplUserGetPayload<{
  include: {
    user: {
      include: {
        locations: {
          include: {
            location: {
              select: {
                id: true
                name: true
              }
            }
          }
        }
      }
    }
  }
}>

export type OplClientHistoryItem = {
  id: string
  orderNumber: string
  date: Date
  status: OplOrderStatus
  type: OplOrderType
  city: string
  street: string
  attemptNumber: number
}

export type OplPreviousOrderPrismaResult = {
  id: string
  attemptNumber: number
  date: Date
  createdAt: Date | null
  completedAt: Date | null
  closedAt: Date | null
  status: OplOrderStatus
  failureReason: string | null
  notes: string | null
  previousOrderId: string | null
  assignedTo: {
    userId: string
    user: {
      id: string
      name: string
    }
  } | null
}

export interface OplOrderAttemptVM {
  id: string
  attemptNumber: number
  date: Date
  createdAt: Date | null
  completedAt: Date | null
  closedAt: Date | null
  status: OplOrderStatus
  failureReason: string | null
  notes: string | null
  previousOrderId: string | null
  assignedTo: { id: string; name: string } | null
}

export type OplWarehouseHistoryRowVM = {
  id: string
  action: OplWarehouseAction
  actionDate: Date
  quantity: number | null
  notes: string | null

  performedBy: {
    id: string
    name: string
  } | null

  assignedTo: {
    id: string
    name: string
  } | null

  assignedOrderId: string | null
  assignedOrder: {
    id: string
    orderNumber: string
  } | null
}

export type OplWarehouseDeviceDefinitionVM = {
  itemType: 'DEVICE'
  name: string
  category: OplDeviceCategory
  quantity: number
  price: number
}

export type OplWarehouseMaterialDefinitionVM = {
  itemType: 'MATERIAL'
  name: string
  index: string | null
  unit: OplMaterialUnit
  quantity: number
  price: number
}

export type OplWarehouseDefinitionWithStockVM =
  | OplWarehouseDeviceDefinitionVM
  | OplWarehouseMaterialDefinitionVM

type OplTechnicianStockBase = {
  id: string
  name: string
  itemType: OplWarehouseItemType
  transferPending: boolean
  updatedAt: Date
}

/** DEVICE */
export type OplTechnicianStockDeviceItem = OplTechnicianStockBase & {
  itemType: 'DEVICE'
  category: OplDeviceCategory
  serialNumber: string | null
  status: OplWarehouseStatus
  deviceDefinitionId: string | null

  price: number

  quantity: null
  unit: null
  materialDefinitionId: null
}

/** MATERIAL */
export type OplTechnicianStockMaterialItem = OplTechnicianStockBase & {
  itemType: 'MATERIAL'
  quantity: number
  unit: OplMaterialUnit
  materialDefinitionId: string
  status: OplWarehouseStatus

  price: number

  category: null
  serialNumber: null
}

export type OplTechnicianStockItem =
  | OplTechnicianStockDeviceItem
  | OplTechnicianStockMaterialItem

/**
 * Canonical OPL order billing configuration.
 * This model is UI-facing and validated before persistence.
 */
export type OplBillingDraft = {
  baseWork: {
    code: OplBaseWorkCode
  } | null

  activation: {
    type: OplActivationType
    multiroomCount: number // 0–3
    umz: boolean
  } | null

  addons: {
    code: OplAddonCode
    quantity: number
    autoAdded: boolean
  }[]

  showAllCodes: boolean
}
export type DigCode = 'ZJDD' | 'ZJKD' | 'ZJND'

/**
 * UI-only draft for OPL work code selection.
 * Converted to billingConfig / settlement entries later.
 */
export type OplWorkCodesDraft = {
  baseWork: OplBaseWorkCode | null

  activation: {
    enabled: boolean
    ports: 1 | 2 | 3 | null
  }

  addons: {
    MR: number
    UMZ: boolean
    dig?: {
      code: DigCode
      meters: number
    }
  }

  showAllBase: boolean
  showAllAddons: boolean
}

export type ActivationPrimaryItem = {
  code: OplActivationType | 'ZJWEW'
  auto: boolean
}

export type PrimaryAddonCode = OplAddonCode | DigCode
