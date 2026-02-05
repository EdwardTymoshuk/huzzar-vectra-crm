// mapOplOrderToListVM.ts
import {
  OplNetworkOeprator,
  OplOrderStatus,
  OplOrderType,
} from '@prisma/client'
import {
  OrderAssignmentVM,
  mapOplOrderAssignmentToVM,
} from './mapOplOrderAssignmentToVM'

export interface OplOrderListVM {
  id: string
  type: OplOrderType
  operator: string
  network: OplNetworkOeprator
  date: Date
  serviceId: string | null
  orderNumber: string
  city: string
  street: string
  status: OplOrderStatus
  createdSource: 'PLANNER' | 'MANUAL'
  assignedTechnicians: OrderAssignmentVM[]
}

export const mapOplOrderToListVM = (o: {
  id: string
  date: Date
  type: OplOrderType
  operator: string
  network: OplNetworkOeprator
  serviceId: string | null
  orderNumber: string
  city: string
  street: string
  status: OplOrderStatus
  createdSource: 'PLANNER' | 'MANUAL'
  assignments: any[]
}) => ({
  id: o.id,
  date: o.date,
  type: o.type,
  operator: o.operator,
  netword: o.network,
  serviceId: o.serviceId,
  orderNumber: o.orderNumber,
  city: o.city,
  street: o.street,
  status: o.status,
  createdSource: o.createdSource,
  assignedTechnicians: o.assignments.map(mapOplOrderAssignmentToVM),
})
