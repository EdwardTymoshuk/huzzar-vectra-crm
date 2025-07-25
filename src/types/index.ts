//sec/types/index.ts

import {
  deviceSchema,
  materialSchema,
  operatorSchema,
  orderSchema,
  technicianOrderSchema,
  warehouseFormSchema,
} from '@/lib/schema'
import {
  DeviceCategory,
  Order,
  Prisma,
  PrismaClient,
  Role,
  TimeSlot,
  User,
  UserStatus,
  Warehouse,
  WarehouseAction,
  WarehouseHistory,
} from '@prisma/client'
import { IconType } from 'react-icons'
import { z } from 'zod'

// context type trpc
export interface Context {
  user?: {
    id: string
    name?: string
    email?: string
    phoneNumber?: string
    identyficator?: number | null
    role: Role
    status: UserStatus
  } | null
  prisma: PrismaClient
}

export interface TechnicianAssignment {
  technicianName: string
  technicianId: string | null
  slots: {
    timeSlot: TimeSlot
    orders: {
      id: string
      orderNumber: string
      address: string
      status: string
      assignedToId?: string
    }[]
  }[]
}
/**
 * Interface for menu items to enforce correct data structure.
 */
export interface MenuItem {
  key: string
  name: string
  icon: IconType
  href: string
}

export type UserWithBasic = Pick<
  User,
  'id' | 'email' | 'phoneNumber' | 'name' | 'role' | 'status' | 'identyficator'
>

export type IssuedItemDevice = {
  id: string
  type: 'DEVICE'
  name: string
  serialNumber: string
  category: DeviceCategory
}

export type IssuedItemMaterial = {
  id: string
  type: 'MATERIAL'
  name: string
  quantity: number
}

export type IssuedItem = IssuedItemDevice | IssuedItemMaterial

export type TechnicianStockItem = {
  id: string
  name: string
  serialNumber?: string | null
  quantity?: number
}

export type DeviceFormData = z.infer<typeof deviceSchema>
export type MaterialFormData = z.infer<typeof materialSchema>
export type OperatorFormData = z.infer<typeof operatorSchema>

export type DeviceDefinition = {
  id: string
  category: DeviceCategory
  price: number
  name: string
  warningAlert: number
  alarmAlert: number
}

export type MaterialDefinition = {
  id: string
  name: string
  index: string
  unit: 'PIECE' | 'METER'
  price: number
  warningAlert: number
  alarmAlert: number
}

export type OrderFormData = z.infer<typeof orderSchema>
export type TechnicianOrderFormData = z.infer<typeof technicianOrderSchema>
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>

export type WarehouseHistoryWithUser = WarehouseHistory & {
  performedBy: User
  assignedTo: User | null
  assignedOrder: Order | null
}

export type WarehouseHistoryWithRelations = WarehouseHistory & {
  warehouseItem: Warehouse
  performedBy: User
  assignedTo: User | null
  assignedOrder: Order | null
}

export type GroupedWarehouseHistory = {
  id: string
  action: WarehouseAction
  actionDate: Date
  performedBy: User
  notes?: string
  entries: {
    id: string
    warehouseItem: Warehouse
    assignedTo?: User | null
    assignedOrder?: Order | null
    quantity?: number
  }[]
}

export type WarehouseWithRelations = Prisma.WarehouseGetPayload<{
  include: {
    assignedTo: true
    orderAssignments: {
      include: {
        order: true
      }
    }
    history: true
  }
}>

export type SelectedCode = { code: string; quantity: number }

export type ServiceType = 'DTV' | 'NET' | 'TEL' | 'ATV'

export type ActivatedService = {
  id: string
  type: ServiceType // 'DTV' | 'INTERNET' | 'TEL' | 'ATV'
  deviceType?: 'DECODER_1_WAY' | 'DECODER_2_WAY' | 'MODEM' | 'ROUTER'
  deviceId?: string
  serialNumber?: string
  deviceId2?: string
  serialNumber2?: string
  usDbmDown?: string
  usDbmUp?: string
  usDbmConfirmed?: boolean
  speedTest?: string
  speedTestConfirmed?: boolean
  notes?: string
}
