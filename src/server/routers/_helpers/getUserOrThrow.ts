import { PrismaClient, User } from '@prisma/client'
import { TRPCError } from '@trpc/server'

/** Returns core/global user */
export function getCoreUserOrThrow(ctx: { user?: User | null }): User {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not logged in',
    })
  }
  return ctx.user
}

/** Loads VectraUser + validates module access */
export async function getVectraUserOrThrow(
  prisma: PrismaClient,
  coreUserId: string
) {
  const vectraUser = await prisma.vectraUser.findUnique({
    where: { userId: coreUserId },
    include: {
      user: true,
      locations: true,
      technicianSettings: true,
    },
  })

  if (!vectraUser) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User has no access to Vectra module',
    })
  }

  return vectraUser
}
