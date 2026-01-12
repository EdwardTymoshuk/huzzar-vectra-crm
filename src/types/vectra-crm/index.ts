//src/types/vectra-crm/index.ts

// -----------------------------
// VECTRA CRM TYPES
// -----------------------------

import {
  User,
  VectraDeviceCategory,
  VectraDeviceSource,
  VectraMaterialUnit,
  VectraOrder,
  VectraOrderStatus,
  VectraOrderType,
  VectraServiceType,
  VectraTimeSlot,
  VectraWarehouseAction,
  VectraWarehouseHistory,
  VectraWarehouseItemType,
  VectraWarehouseStatus,
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
  serviceSchema,
  technicianOrderSchema,
  usedMaterialSchema,
  warehouseFormSchema,
  workCodeSchema,
} from '@/app/(modules)/vectra-crm/lib/schema'

import type { Prisma } from '@prisma/client'

import { z } from 'zod'

// -----------------------------
// Forms (Zod)
// -----------------------------
export type DeviceFormData = z.infer<typeof deviceSchema>
export type MaterialFormData = z.infer<typeof materialSchema>
export type OperatorFormData = z.infer<typeof operatorSchema>

export type VectraOrderFormData = z.infer<typeof orderSchema>
export type TechnicianVectraOrderFormData = z.infer<
  typeof technicianOrderSchema
>
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>

export type WorkCodeInput = z.infer<typeof workCodeSchema>
export type UsedMaterialInput = z.infer<typeof usedMaterialSchema>
export type CollectedDeviceInput = z.infer<typeof collectedDeviceSchema>
export type ServiceInput = z.infer<typeof serviceSchema>

export type CompleteOrderInput = z.infer<typeof completeOrderSchema>
export type AmendCompletionInput = z.infer<typeof amendCompletionSchema>
export type AdminEditCompletionInput = z.infer<typeof adminEditCompletionSchema>

// -----------------------------
// VectraWarehouse types
// -----------------------------

export type IssuedItemDevice = {
  id: string
  type: 'DEVICE'
  name: string
  serialNumber: string
  category: VectraDeviceCategory
  status?: VectraWarehouseStatus
}

export type IssuedItemMaterial = {
  id: string
  type: 'MATERIAL'
  name: string
  materialDefinitionId: string
  quantity: number
}

export type IssuedItem = IssuedItemDevice | IssuedItemMaterial

export type ActivatedServiceExtraDevice = {
  id: string
  source: VectraDeviceSource
  deviceId?: string
  category: VectraDeviceCategory
  name?: string
  serialNumber: string
}

// Full warehouse history with relations
export type WarehouseHistoryWithRelations =
  Prisma.VectraWarehouseHistoryGetPayload<{
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

export type WarehouseHistoryWithUser = VectraWarehouseHistory & {
  performedBy: User
  assignedTo: User | null
  assignedOrder: VectraOrder | null
}

export type VectraActivatedService = {
  id: string
  type: VectraServiceType

  // Primary device (decoder/modem)
  deviceSource?: VectraDeviceSource
  deviceId?: string
  serialNumber?: string
  /** Optional label when using client's device */
  deviceName?: string
  deviceType?: VectraDeviceCategory

  // Secondary device (router for HFC / special cases)
  device2Source?: VectraDeviceSource
  deviceId2?: string
  serialNumber2?: string
  deviceName2?: string
  deviceType2?: VectraDeviceCategory

  // NET-only: extra modems/routers that should count as sockets
  extraDevices?: ActivatedServiceExtraDevice[]

  // Measurements
  speedTest?: string
  usDbmDown?: number
  usDbmUp?: number

  // Free-form notes
  notes?: string
}

// -----------------------------
// Order related
// -----------------------------

export interface TechnicianAssignment {
  technicianName: string
  technicianId: string | null
  slots: {
    timeSlot: VectraTimeSlot
    orders: {
      id: string
      orderNumber: string
      address: string
      lat?: number | null
      lng?: number | null
      date: Date
      operator: string
      status: VectraOrderStatus
      notes?: string
      assignedToId?: string
    }[]
  }[]
}

export type SelectedCode = { code: string; quantity: number }

export type VectraOrderWithAttempts = {
  id: string
  type: VectraOrderType
  orderNumber: string
  attemptNumber: number
  status: VectraOrderStatus
  failureReason?: string | null
  notes?: string | null
  date: Date
  assignedTo?: { id: string; name: string } | null
  previousOrder?: {
    id: string
    attemptNumber: number
    status: VectraOrderStatus
    failureReason?: string | null
    assignedTo?: { id: string; name: string } | null
  } | null
  attempts: {
    id: string
    attemptNumber: number
    status: VectraOrderStatus
    failureReason?: string | null
    notes?: string | null
    date: Date
    completedAt?: Date | null
    closedAt?: Date | null
    createdAt?: Date | null
    assignedTo?: { id: string; name: string } | null
  }[]
}

// -----------------------------
// Vectra user
// -----------------------------

export type VectraUserWithLocations = Prisma.VectraUserGetPayload<{
  include: {
    user: {
      include: {
        locations: true
      }
    }
    technicianSettings: true
  }
}>

export type ClientHistoryItem = {
  id: string
  orderNumber: string
  date: Date
  status: VectraOrderStatus
  type: VectraOrderType
  city: string
  street: string
  attemptNumber: number
}

export type PreviousOrderPrismaResult = {
  id: string
  attemptNumber: number
  date: Date
  createdAt: Date | null
  completedAt: Date | null
  closedAt: Date | null
  status: VectraOrderStatus
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

export interface OrderAttemptVM {
  id: string
  attemptNumber: number
  date: Date
  createdAt: Date | null
  completedAt: Date | null
  closedAt: Date | null
  status: VectraOrderStatus
  failureReason: string | null
  notes: string | null
  previousOrderId: string | null
  assignedTo: { id: string; name: string } | null
}

export type WarehouseHistoryRowVM = {
  id: string
  action: VectraWarehouseAction
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

export type WarehouseDeviceDefinitionVM = {
  itemType: 'DEVICE'
  name: string
  category: VectraDeviceCategory
  quantity: number
  price: number
}

export type WarehouseMaterialDefinitionVM = {
  itemType: 'MATERIAL'
  name: string
  index: string | null
  unit: VectraMaterialUnit
  quantity: number
  price: number
}

export type WarehouseDefinitionWithStockVM =
  | WarehouseDeviceDefinitionVM
  | WarehouseMaterialDefinitionVM

type TechnicianStockBase = {
  id: string
  name: string
  itemType: VectraWarehouseItemType
  transferPending: boolean
  updatedAt: Date
}

/** DEVICE */
export type TechnicianStockDeviceItem = TechnicianStockBase & {
  itemType: 'DEVICE'
  category: VectraDeviceCategory
  serialNumber: string | null
  status: VectraWarehouseStatus

  price: number

  quantity: null
  unit: null
  materialDefinitionId: null
}

/** MATERIAL */
export type TechnicianStockMaterialItem = TechnicianStockBase & {
  itemType: 'MATERIAL'
  quantity: number
  unit: VectraMaterialUnit
  materialDefinitionId: string
  status: VectraWarehouseStatus

  price: number

  category: null
  serialNumber: null
}

export type TechnicianStockItem =
  | TechnicianStockDeviceItem
  | TechnicianStockMaterialItem

export type OrderAssignedUserVM = {
  id: string
  name: string
}

export type OrderWithAssignedToVM = {
  id: string
  orderNumber: string
  status: VectraOrderStatus
  date: Date
  timeSlot: VectraTimeSlot
  assignedToId: string | null
  assignedTo: OrderAssignedUserVM | null
}
