import { authOptions } from '@/lib/authOptions'
import type { NormalizedUser } from '@/server/core/helpers/users/normalizeUser'
import { normalizeUser } from '@/server/core/helpers/users/normalizeUser'
import { prisma } from '@/utils/prisma'
import { getServerSession } from 'next-auth'

export type Context = {
  user: NormalizedUser | null
  prisma: typeof prisma
}

export const createContext = async (): Promise<Context> => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return {
      user: null,
      prisma,
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      locations: {
        include: {
          location: {
            select: { id: true, name: true },
          },
        },
      },
      modules: {
        include: {
          module: {
            select: { id: true, name: true, code: true },
          },
        },
      },
    },
  })

  if (!user) {
    return {
      user: null,
      prisma,
    }
  }

  return {
    user: normalizeUser(user),
    prisma,
  }
}
