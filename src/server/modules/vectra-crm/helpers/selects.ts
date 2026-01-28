// src/server/modules/vectra-crm/helpers/selects.ts
import { coreUserBasicSelect } from '@/server/core/helpers/coreUserBasicSelect'
import { Prisma } from '@prisma/client'

/**
 * Basic VectraUser projection used across VECTRA CRM.
 * Always traverse through the core `User` for display fields.
 */
export const vectraUserBasicSelect = {
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
} satisfies Prisma.VectraUserSelect

/**
 * Basic VectraUser projection that includes CORE User display fields.
 * Use this select whenever the relation type is `VectraUser`.
 */
export const vectraUserWithCoreBasicSelect =
  Prisma.validator<Prisma.VectraUserSelect>()({
    userId: true,
    user: {
      select: coreUserBasicSelect,
    },
  })

/**
 * Active Vectra order projection used by technician views.
 * ------------------------------------------------------------
 * Includes assigned technician (VectraUser -> CORE User).
 */
export const activeOrderSelect = {
  id: true,
  orderNumber: true,
  type: true,
  city: true,
  street: true,
  date: true,
  timeSlot: true,
  operator: true,
  status: true,
  notes: true,
  assignedTo: {
    select: vectraUserBasicSelect,
  },
} satisfies Prisma.VectraOrderSelect

/**
 * Select used ONLY for admin / coordinator / warehouseman lists.
 * Includes CORE user + locations.
 */
export const vectraAdminSelect = Prisma.validator<Prisma.VectraUserSelect>()({
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

export const vectraUserSlimSelect = {
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.VectraUserSelect
