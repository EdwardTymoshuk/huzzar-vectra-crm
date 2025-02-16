import { authOptions } from '@/app/api/auth/[...nextauth]/route'
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
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated',
    })
  }

  if (session.user.status !== 'ACTIVE') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'User account is not active',
    })
  }

  return next({
    ctx: {
      user: session.user,
    },
  })
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
