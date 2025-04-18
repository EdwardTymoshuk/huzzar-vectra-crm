//sec/types/index.ts

import { itemSchema } from '@/lib/schema'
import {
  DeviceCategory,
  Order,
  TimeSlot,
  User,
  Warehouse,
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

export type ItemFormData = z.infer<typeof itemSchema>
