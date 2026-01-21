//src/server/core/routers/auth/auth.ts
import { loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { getCoreUserOrThrow } from '../../services/getCoreUserOrThrow'

/**
 * authUserRouter – handles authentication-related actions for logged-in users.
 * Includes self info and password change functionality.
 */
export const authCoreUserRouter = router({
  /** 👤 Basic data of the currently logged-in user */
  me: loggedInEveryone.query(({ ctx }) => {
    const user = getCoreUserOrThrow(ctx)

    return prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        phoneNumber: true,
      },
    })
  }),

  /** 🔒 Change own password */
  changePassword: loggedInEveryone
    .input(
      z.object({
        oldPassword: z.string().min(6),
        newPassword: z
          .string()
          .min(8)
          .max(32)
          .regex(/[a-z]/)
          .regex(/[A-Z]/)
          .regex(/\d/)
          .regex(/[!@#$%^&*()_+{}[\]<>?]/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getCoreUserOrThrow(ctx)

      const found = await prisma.user.findUnique({ where: { id: user.id } })
      if (!found) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const ok = await bcrypt.compare(input.oldPassword, found.password)
      if (!ok) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Stare hasło jest nieprawidłowe.',
        })
      }

      const hash = await bcrypt.hash(input.newPassword, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hash },
      })

      return { success: true }
    }),
})
