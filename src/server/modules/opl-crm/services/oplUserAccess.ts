import { OplUserWithLocations } from '@/types/opl-crm'
import { PrismaClient, Role } from '@prisma/client'
import { TRPCError } from '@trpc/server'

/**
 * Loads OplUser and validates access to OPL CRM module.
 * User must exist and have active access to the module.
 */
export const getOplUserOrThrow = async (
  prisma: PrismaClient,
  coreUserId: string,
  role: Role
): Promise<OplUserWithLocations> => {
  let oplUser = await prisma.oplUser.findUnique({
    where: { userId: coreUserId },
    include: {
      user: {
        include: {
          locations: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  })

  // Legacy users may have module access but missing/inactive OPL profile.
  // For ADMIN, self-heal profile to keep global admin access consistent.
  if (role === 'ADMIN' && (!oplUser || !oplUser.active)) {
    await prisma.oplUser.upsert({
      where: { userId: coreUserId },
      update: {
        active: true,
        deactivatedAt: null,
      },
      create: {
        userId: coreUserId,
        active: true,
      },
    })

    oplUser = await prisma.oplUser.findUnique({
      where: { userId: coreUserId },
      include: {
        user: {
          include: {
            locations: {
              include: {
                location: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  if (!oplUser || !oplUser.active) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User has no active access to OPL module',
    })
  }

  return oplUser
}
