import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

/**
 * Loads VectraUser and validates access to Vectra CRM module.
 * User must exist and have active access to the module.
 */
export const getVectraUserOrThrow = async (
  prisma: PrismaClient,
  coreUserId: string
) => {
  const vectraUser = await prisma.vectraUser.findUnique({
    where: { userId: coreUserId },
    include: {
      user: {
        include: {
          locations: true,
        },
      },
      technicianSettings: true,
    },
  })

  if (!vectraUser || !vectraUser.active) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User has no active access to Vectra module',
    })
  }

  return vectraUser
}
