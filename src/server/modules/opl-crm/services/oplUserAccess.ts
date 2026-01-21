import { OplUserWithLocations } from '@/types/opl-crm'
import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

/**
 * Loads VectraUser and validates access to Vectra CRM module.
 * User must exist and have active access to the module.
 */
export const getOplUserOrThrow = async (
  prisma: PrismaClient,
  coreUserId: string
): Promise<OplUserWithLocations> => {
  const oplUser = await prisma.oplUser.findUnique({
    where: { userId: coreUserId },
    include: {
      user: {
        include: {
          locations: true,
        },
      },
    },
  })

  if (!oplUser || !oplUser.active) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User has no active access to Opl module',
    })
  }

  return oplUser
}
