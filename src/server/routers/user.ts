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
      select: {
        id: true,
        email: true,
        password: true,
        phoneNumber: true,
        name: true,
        role: true,
        status: true,
      },
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

  // Edit a user including password update (Admin only)
  editUser: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
        phoneNumber: z.string(),
        password: z
          .string()
          .min(8, 'Hasło musi mieć co najmniej 8 znaków')
          .max(32, 'Hasło nie może mieć więcej niż 32 znaki')
          .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
          .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
          .regex(/\d/, 'Hasło musi zawierać cyfrę')
          .regex(/[!@#$%^&*()_+{}[\]<>?]/, 'Hasło musi zawierać znak specjalny')
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Partial<{
        name: string
        email: string
        phoneNumber: string
        password: string
      }> = {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
        password: input.password,
      }
      if (input.password && input.password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(input.password, 10)
        updateData.password = hashedPassword
      }
      return prisma.user.update({
        where: { id: input.id },
        data: updateData,
      })
    }),
  // user role status change
  toggleUserStatus: roleProtectedProcedure(['ADMIN'])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.id } })
      if (!user) throw new Error('Użytkownik nie istnieje')

      const updatedUser = await prisma.user.update({
        where: { id: input.id },
        data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
      })
      return updatedUser
    }),

  // Delete a user by ID (Admin only)
  deleteUser: roleProtectedProcedure(['ADMIN'])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.user.delete({
        where: { id: input.id },
      })
    }),
})
