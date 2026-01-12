import { Role, UserStatus } from '@prisma/client'

export interface EmployeeVM {
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

export interface EmployeeVM {
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
