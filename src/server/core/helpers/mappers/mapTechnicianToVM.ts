// src/server/core//helpers/mappers/mapTechnicianToVM.ts

import { UserStatus } from '@prisma/client'

export interface TechnicianLiteVM {
  id: string
  name: string
  identyficator: number | null
  status: UserStatus
}

export const mapTechnicianToVM = (source: {
  user: {
    id: string
    name: string
    identyficator: number | null
    status: UserStatus
  }
}): TechnicianLiteVM => ({
  id: source.user.id,
  name: source.user.name,
  identyficator: source.user.identyficator,
  status: source.user.status,
})
