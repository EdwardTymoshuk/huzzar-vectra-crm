//src/server/context.ts

import { authOptions } from '@/lib/authOptions'
import { Context } from '@/types'
import { prisma } from '@/utils/prisma'
import { getServerSession } from 'next-auth'

/**
 * Creates a tRPC context containing the authenticated user and Prisma client.
 */
export const createContext = async (): Promise<Context> => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      user: null,
      prisma,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      identyficator: true,
      role: true,
      status: true,
      locations: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return {
    user,
    prisma,
  }
}
