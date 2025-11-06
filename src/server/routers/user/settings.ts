// src/server/routers/user/settings.ts
import { loggedInEveryone, technicianOnly } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { z } from 'zod'
import { getUserOrThrow } from '../_helpers/getUserOrThrow'

/**
 * settingsRouter – manages technician-specific settings (like personal goals)
 */
export const settingsRouter = router({
  /** 🎯 Get technician's personal goals */
  getGoals: loggedInEveryone.query(({ ctx }) => {
    const user = getUserOrThrow(ctx)

    return prisma.technicianSettings.findUnique({
      where: { userId: user.id },
    })
  }),

  /** 💾 Save or update technician goals */
  saveGoals: technicianOnly
    .input(
      z.object({
        workDays: z.number().min(1).max(31),
        incomeGoal: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = getUserOrThrow(ctx)

      await prisma.technicianSettings.upsert({
        where: { userId: user.id },
        update: {
          workingDaysGoal: input.workDays,
          revenueGoal: input.incomeGoal,
        },
        create: {
          userId: user.id,
          workingDaysGoal: input.workDays,
          revenueGoal: input.incomeGoal,
        },
      })

      return { success: true }
    }),
})
