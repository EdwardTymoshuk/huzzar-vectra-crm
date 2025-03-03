// src/server/middleware

import { authOptions } from '@/lib/authOptions'
import { TRPCError, initTRPC } from '@trpc/server'
import { getServerSession } from 'next-auth'
import superjson from 'superjson'

// Typ kontekstu dla tRPC
interface Context {
  user?: {
    id: string
    name?: string
    email?: string
    phoneNumber?: string
    identyficator?: number | null
    role: 'USER' | 'TECHNICIAN' | 'COORDINATOR' | 'WAREHOUSEMAN' | 'ADMIN'
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  } | null
}

// Tworzenie kontekstu dla tRPC
export const createContext = async (): Promise<Context> => {
  const session = await getServerSession(authOptions)
  return {
    user: session?.user ?? null, // 🛠 Zapewnia, że `user` zawsze istnieje (może być `null`)
  }
}

// Inicjalizacja tRPC z kontekstem
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape
  },
})

// Middleware do sprawdzania autoryzacji
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

// Middleware do sprawdzania ról użytkownika
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

// Middleware do ochrony API (wymagana autoryzacja)
export const protectedProcedure = t.procedure.use(isAuthenticated)

// Middleware do ochrony API z rolami
export const roleProtectedProcedure = (roles: string[]) =>
  t.procedure.use(isAuthenticated).use(hasRole(roles))
