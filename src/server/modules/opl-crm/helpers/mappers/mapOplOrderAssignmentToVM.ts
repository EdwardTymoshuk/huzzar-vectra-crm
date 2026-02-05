// src/server/modules/opl-crm/helpers/mappers/mapOplOrderAssignmentToVM.ts

import { UserVM, mapOplUserToVM } from './mapOplUserToVM'

/**
 * OrderAssignmentVM
 * ------------------------------------------------------------
 * UI-safe representation of a technician assignment.
 */
export interface OrderAssignmentVM {
  id: string
  assignedAt: Date
  technician: UserVM
}

/**
 * Maps OplOrderAssignment relation to OrderAssignmentVM.
 * Acts as a strict boundary between Prisma models and UI.
 */
export const mapOplOrderAssignmentToVM = (a: {
  id: string
  assignedAt: Date
  technician: {
    userId: string
    user: { id: string; name: string }
  }
}): OrderAssignmentVM => {
  return {
    id: a.id,
    assignedAt: a.assignedAt,
    technician: mapOplUserToVM(a.technician)!,
  }
}
