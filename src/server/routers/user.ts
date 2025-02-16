import { prisma } from '@/utils/prisma'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { protectedProcedure, roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const userRouter = router({
  // Fetch the currently logged-in user
  me: protectedProcedure.query(async ({ ctx }) => {
    return prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
  }),

  // Fetch all users (Admin only)
  getAllUsers: roleProtectedProcedure(['ADMIN']).query(async () => {
    return prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, status: true },
    })
  }),

  // Create a new user (Admin only)
  createUser: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        phoneNumber: z.string(),
        identyficator: z.number().optional(),
        role: z
          .enum(['TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN', 'ADMIN'])
          .default('TECHNICIAN'),
      })
    )
    .mutation(async ({ input }) => {
      const hashedPassword = await bcrypt.hash(input.password, 10)

      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          phoneNumber: input.phoneNumber,
          identyficator: input.identyficator,
          role: input.role,
          status: 'ACTIVE',
        },
      })
    }),

  // Delete a user by ID (Admin only)
  deleteUser: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.user.delete({
        where: { id: input.id },
      })
    }),
})
