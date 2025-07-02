//src/server/routers/user/settings.ts

import { technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'

export const settingsRouter = router({
  /** Get current goals */
  getGoals: technicianOnly.query(({ ctx }) =>
    prisma.technicianSettings.findUnique({
      where: { userId: ctx.user!.id },
    })
  ),

  /** Save or update goals */
  saveGoals: technicianOnly
    .input(
      z.object({
        workDays: z.number().min(1).max(31),
        incomeGoal: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.technicianSettings.upsert({
        where: { userId: ctx.user!.id },
        update: {
          workingDaysGoal: input.workDays,
          revenueGoal: input.incomeGoal,
        },
        create: {
          userId: ctx.user!.id,
          workingDaysGoal: input.workDays,
          revenueGoal: input.incomeGoal,
        },
      })
      return { success: true }
    }),
})
