import { UserModule } from '@/types'
import { Role } from '@prisma/client'

export type AccessLevel = 'VIEW' | 'EDIT' | 'ADMIN'

export const hasModule = (
  role: Role | undefined,
  modules: UserModule[],
  moduleCode: string
): boolean => {
  if (role === 'ADMIN') return true
  return modules.some((m) => m.code === moduleCode)
}

export const canView = (
  user: { role?: Role; modules: UserModule[] },
  moduleCode: string
): boolean => {
  return hasModule(user.role, user.modules, moduleCode)
}

export const canEdit = (
  user: { role?: Role; modules: UserModule[] },
  moduleCode: string
): boolean => {
  if (!hasModule(user.role, user.modules, moduleCode)) return false

  return user.role === 'ADMIN' || user.role === 'COORDINATOR'
}
