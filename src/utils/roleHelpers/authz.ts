// src/utils/authz.ts
import type { Role } from '@prisma/client'

export const hasRole = (role: Role | undefined, expected: Role): boolean =>
  role === expected

export const hasAnyRole = (role: Role | undefined, allowed: Role[]): boolean =>
  !!role && allowed.includes(role)
