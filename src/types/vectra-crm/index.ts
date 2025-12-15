// -----------------------------
// VECTRA CRM TYPES
// -----------------------------

import {
  VectraDeviceCategory,
  VectraDeviceSource,
  VectraOrderStatus,
  VectraOrderType,
  VectraServiceType,
  VectraTimeSlot,
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

export type OrderFormData = z.infer<typeof orderSchema>
export type TechnicianOrderFormData = z.infer<typeof technicianOrderSchema>
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

export type TechnicianStockItem = {
  id: string
  name: string
  serialNumber?: string | null
  quantity?: number
}

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
    include: {
      warehouseItem: { include: { location: true } }
      performedBy: true
      assignedTo: true
      assignedOrder: true
      fromLocation: true
      toLocation: true
    }
  }>

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
      status: string
      notes?: string
      assignedToId?: string
    }[]
  }[]
}

export type SelectedCode = { code: string; quantity: number }

export type OrderWithAttempts = {
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
    user: true
    locations: true
    technicianSettings: true
  }
}>

// -----------------------------
// Misc
// -----------------------------
export const orderTimelineColorMap: Record<VectraOrderStatus, string> = {
  COMPLETED: 'bg-success',
  NOT_COMPLETED: 'bg-danger',
  ASSIGNED: 'bg-warning',
  PENDING: 'bg-secondary',
}

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
