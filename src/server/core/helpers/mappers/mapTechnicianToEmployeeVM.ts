// src/server/core/helpers/mappers/mapTechnicianToEmployeeVM.ts

import { EmployeeVM } from '@/types'
import { Role, UserStatus } from '@prisma/client'

type TechnicianSource = {
  user: {
    id: string
    name: string
    email: string
    phoneNumber: string
    role: Role
    status: UserStatus
    identyficator: number | null
    locations: {
      id: string
      name: string
    }[]
  }
}

/**
 * Maps Prisma VectraUser (technician) to EmployeeVM.
 * This abstraction prevents UI from depending on database structure.
 */
export const mapTechnicianToEmployeeVM = (
  source: TechnicianSource
): EmployeeVM => {
  const { user } = source

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    status: user.status,
    identyficator: user.identyficator,
    locations: user.locations,
  }
}
