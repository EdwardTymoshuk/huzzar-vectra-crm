import { Context } from '@/types'

/**
 * Returns true if the current user is a technician.
 */
export const isTechnician = (ctx: Context): boolean => {
  return ctx.user?.role === 'TECHNICIAN'
}
