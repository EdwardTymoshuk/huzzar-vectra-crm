import { authOptions } from '@/lib/authOptions'
import { Context } from '@/types'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import { getServerSession } from 'next-auth'
import { t } from './trpc'

/**
 * Creates a tRPC context containing the authenticated user and Prisma client.
 */
export const createContext = async (): Promise<Context> => {
  const session = await getServerSession(authOptions)
  return {
    user: session?.user ?? null,
    prisma,
  }
}

/**
 * Middleware that ensures the user is authenticated and active.
 * Throws UNAUTHORIZED or FORBIDDEN errors otherwise.
 */
export const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated',
    })
  }

  if (ctx.user.status !== 'ACTIVE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User account is not active',
    })
  }

  return next()
})

/**
 * Middleware that ensures the user has one of the allowed roles.
 * Throws FORBIDDEN error if not authorized.
 */
export const hasRole = (roles: string[]) =>
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'User does not have the required role',
      })
    }

    return next()
  })

/** Procedure wrapper that requires a logged-in and active user */
export const protectedProcedure = t.procedure.use(isAuthenticated)

/**
 * Procedure wrapper that requires both authentication and specific roles.
 * Accepts an array of allowed role names.
 */
export const roleProtectedProcedure = (roles: string[]) =>
  t.procedure.use(isAuthenticated).use(hasRole(roles))
