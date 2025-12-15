//src/utils/roleHelpers/roleCheck.ts

import { User, VectraUser } from '@prisma/client'

/**
 * Returns true if the current vectra user is a technician.
 */
export const isVectraTechnician = (
  vectraUser: VectraUser & { user: User }
): boolean => {
  return vectraUser.user.role === 'TECHNICIAN'
}
