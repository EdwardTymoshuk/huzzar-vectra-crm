//sec/types/index.ts

import { Order, TimeSlot, User, Warehouse } from '@prisma/client'
import { IconType } from 'react-icons'

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
