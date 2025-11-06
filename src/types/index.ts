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
  OrderStatus,
  Prisma,
  PrismaClient,
  Role,
  TimeSlot,
  User,
  UserStatus,
  Warehouse,
  WarehouseAction,
  WarehouseHistory,
  WarehouseStatus,
} from '@prisma/client'
import { IconType } from 'react-icons'
import { z } from 'zod'

// context type trpc
export interface Context {
  user?: {
    id: string
    name: string
    email: string
    phoneNumber: string
    identyficator: number | null
    role: Role
    status: UserStatus
    locations: { id: string; name: string }[]
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
      date: Date
      operator: string
      status: string
      notes?: string
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
  status?: WarehouseStatus
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

export type WarehouseHistoryWithRelations = Prisma.WarehouseHistoryGetPayload<{
  include: {
    warehouseItem: {
      include: { location: true }
    }
    performedBy: true
    assignedTo: true
    assignedOrder: true
    fromLocation: true
    toLocation: true
  }
}>

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
  type: ServiceType

  // Primary device (decoder/modem)
  deviceSource?: DeviceSource
  deviceId?: string
  serialNumber?: string
  /** Optional label when using client's device */
  deviceName?: string
  deviceType?: DeviceCategory

  // Secondary device (router for HFC / special cases)
  device2Source?: DeviceSource
  deviceId2?: string
  serialNumber2?: string
  deviceName2?: string
  deviceType2?: DeviceCategory

  // NET-only: extra modems/routers that should count as sockets
  extraDevices?: ActivatedServiceExtraDevice[]

  // Measurements
  speedTest?: string
  usDbmDown?: number
  usDbmUp?: number

  // Free-form notes
  notes?: string
}

export type BaseUser = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    phoneNumber: true
    role: true
    status: true
    identyficator: true
  }
}>

export type UserWithLocations = Prisma.UserGetPayload<{
  select: {
    id: true
    name: true
    email: true
    phoneNumber: true
    role: true
    status: true
    identyficator: true
    locations: { select: { id: true; name: true } }
  }
}>

export type DeviceSource = 'WAREHOUSE' | 'CLIENT'

export type ActivatedServiceExtraDevice = {
  id: string
  source: DeviceSource
  deviceId?: string
  category: DeviceCategory
  name?: string
  serialNumber: string
}
/**
 * OrderWithAttempts
 * ------------------------------------------------------------------
 * Represents an order together with its retry attempts and previous
 * attempt metadata. Used in order details view and timeline.
 */
export type OrderWithAttempts = {
  id: string
  orderNumber: string
  attemptNumber: number
  status: OrderStatus
  failureReason?: string | null
  notes?: string | null
  date: Date
  assignedTo?: { id: string; name: string } | null
  previousOrder?: {
    id: string
    attemptNumber: number
    status: OrderStatus
    failureReason?: string | null
    assignedTo?: { id: string; name: string } | null
  } | null
  attempts: {
    id: string
    attemptNumber: number
    status: OrderStatus
    failureReason?: string | null
    notes?: string | null
    date: Date
    assignedTo?: { id: string; name: string } | null
  }[]
}

import { ReactNode } from 'react'

export type TimelineSize = 'sm' | 'md' | 'lg'
export type TimelineStatus = 'completed' | 'in-progress' | 'pending'

export interface TimelineElement {
  id: string | number
  date: string
  title: string | ReactNode
  description: string | ReactNode
  icon?: ReactNode | (() => ReactNode)
  status?: TimelineStatus
  color?: string
  size?: TimelineSize
  loading?: boolean
  error?: string
}

export interface TimelineProps {
  items: TimelineElement[]
  size?: TimelineSize
  animate?: boolean
  iconColor?: string
  connectorColor?: string
  className?: string
}

export const orderTimelineColorMap: Record<OrderStatus, string> = {
  COMPLETED: 'bg-success',
  NOT_COMPLETED: 'bg-danger',
  ASSIGNED: 'bg-warning',
  PENDING: 'bg-secondary',
}
