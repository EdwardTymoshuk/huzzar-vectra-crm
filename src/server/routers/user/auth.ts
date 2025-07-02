// server/routers/user/auth.ts
import { loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'

export const authUserRouter = router({
  /** Basic data of the currently logged-in user */
  me: loggedInEveryone.query(({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return prisma.user.findUnique({
      where: { id: ctx.user.id },
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

  /** Change own password */
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
      const uid = ctx.user!.id
      const user = await prisma.user.findUnique({ where: { id: uid } })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const ok = await bcrypt.compare(input.oldPassword, user.password)
      if (!ok)
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Stare hasło jest nieprawidłowe.',
        })

      const hash = await bcrypt.hash(input.newPassword, 10)
      await prisma.user.update({ where: { id: uid }, data: { password: hash } })
      return { success: true }
    }),
})
