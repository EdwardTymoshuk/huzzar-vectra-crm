// server/routers/_helpers/getUserOrThrow.ts
import { UserWithLocations } from '@/types'
import { TRPCError } from '@trpc/server'

export function getUserOrThrow(ctx: {
  user?: UserWithLocations | null
}): UserWithLocations {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not logged in' })
  }
  return ctx.user
}
