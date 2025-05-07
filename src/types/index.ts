//sec/types/index.ts

import {
  deviceSchema,
  materialSchema,
  operatorSchema,
  orderSchema,
  warehouseFormSchema,
} from '@/lib/schema'
import {
  DeviceCategory,
  Order,
  TimeSlot,
  User,
  Warehouse,
  WarehouseHistory,
} from '@prisma/client'
import { IconType } from 'react-icons'
import { z } from 'zod'

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

export type WarehouseWithRelations = Warehouse & {
  assignedTo?: User | null
  assignedOrder?: Order | null
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

export type DeviceFormData = z.infer<typeof deviceSchema>
export type MaterialFormData = z.infer<typeof materialSchema>
export type OperatorFormData = z.infer<typeof operatorSchema>

export type DeviceDefinition = {
  id: string
  category: 'MODEM' | 'DECODER' | 'ONT' | 'AMPLIFIER' | 'UA' | 'OTHER'
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
  warningAlert: number
  alarmAlert: number
}

export type OrderFormData = z.infer<typeof orderSchema>
export type WarehouseFormData = z.infer<typeof warehouseFormSchema>

export type WarehouseHistoryWithUser = WarehouseHistory & {
  performedBy: User
  assignedTo: User | null
  assignedOrder: Order | null
}
