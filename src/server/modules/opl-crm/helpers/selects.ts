// src/server/modules/opl-crm/helpers/selects.ts
import { coreUserBasicSelect } from '@/server/core/helpers/coreUserBasicSelect'
import { Prisma } from '@prisma/client'

/**
 * Basic OplUser projection used across VECTRA CRM.
 * Always traverse through the core `User` for display fields.
 */
export const oplUserBasicSelect = {
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  },
} satisfies Prisma.OplUserSelect

/**
 * Basic OplUser projection that includes CORE User display fields.
 * Use this select whenever the relation type is `OplUser`.
 */
export const oplUserWithCoreBasicSelect =
  Prisma.validator<Prisma.OplUserSelect>()({
    userId: true,
    user: {
      select: coreUserBasicSelect,
    },
  })

/**
 * Select used ONLY for admin / coordinator / warehouseman lists.
 * Includes CORE user + locations.
 */
export const oplAdminSelect = Prisma.validator<Prisma.OplUserSelect>()({
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
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
})

export const oplUserSlimSelect = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.OplUserSelect
