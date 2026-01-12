import { Role } from '@prisma/client'

export const isAdmin = (role?: Role): boolean => role === 'ADMIN'

export const isCoordinator = (role?: Role): boolean => role === 'COORDINATOR'

export const isTechnician = (role?: Role): boolean => role === 'TECHNICIAN'

export const isWarehouseman = (role?: Role): boolean => role === 'WAREHOUSEMAN'

export const hasAnyRole = (role: Role | undefined, allowed: Role[]): boolean =>
  !!role && allowed.includes(role)
