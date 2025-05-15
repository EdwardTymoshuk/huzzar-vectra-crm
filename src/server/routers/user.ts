import { prisma } from '@/utils/prisma'
import { OrderStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { protectedProcedure, roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const userRouter = router({
  // Fetch the currently logged-in user
  me: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    return prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
  }),

  // Fetch all technicians
  getTechnicians: roleProtectedProcedure(['ADMIN']).query(async () => {
    return prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        role: true,
        status: true,
        identyficator: true,
      },
    })
  }),

  // Fetch all administrators (Coordinator, Warehouseman, Admin)
  getAdmins: roleProtectedProcedure(['ADMIN']).query(async () => {
    return prisma.user.findMany({
      where: {
        role: {
          in: ['COORDINATOR', 'WAREHOUSEMAN', 'ADMIN'],
        },
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        role: true,
        status: true,
      },
    })
  }),

  // Fetch a user by ID (Admin only)
  getUserById: roleProtectedProcedure(['ADMIN'])
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          role: true,
          status: true,
          identyficator: true,
        },
      })

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Użytkownik nie istnieje.',
        })
      }

      return user
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
        // password remains optional
        password: z
          .string()
          .min(8, 'Hasło musi mieć co najmniej 8 znaków')
          .max(32, 'Hasło nie może mieć więcej niż 32 znaki')
          .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
          .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
          .regex(/\d/, 'Hasło musi zawierać cyfrę')
          .regex(/[!@#$%^&*()_+{}[\]<>?]/, 'Hasło musi zawierać znak specjalny')
          .optional(),
        // Add role as well (optional if user doesn't want to change role)
        role: z
          .enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Build update data
      const updateData: Partial<{
        name: string
        email: string
        phoneNumber: string
        password: string
        role: 'ADMIN' | 'TECHNICIAN' | 'COORDINATOR' | 'WAREHOUSEMAN'
      }> = {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
      }

      if (input.password && input.password.trim().length > 0) {
        const hashedPassword = await bcrypt.hash(input.password, 10)
        updateData.password = hashedPassword
      }

      if (input.role) {
        updateData.role = input.role
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

  // Get yechnician efficiency
  getTechnicianEfficiency: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        date: z.string(),
        range: z.enum(['day', 'month', 'year']),
      })
    )
    .query(async ({ input }) => {
      const date = new Date(input.date)
      const start = new Date(date)
      const end = new Date(date)

      if (input.range === 'day') {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
      } else if (input.range === 'month') {
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
      } else if (input.range === 'year') {
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
      }

      const relevantStatuses: OrderStatus[] = [
        'COMPLETED',
        'NOT_COMPLETED',
        'IN_PROGRESS',
        'CANCELED',
      ]

      const orders = await prisma.order.findMany({
        where: {
          assignedToId: { not: null },
          status: { in: relevantStatuses },
          date: { gte: start, lte: end },
        },
        select: {
          assignedToId: true,
          status: true,
          assignedTo: { select: { name: true } },
        },
      })

      const resultMap = new Map<
        string,
        {
          technicianId: string
          technicianName: string
          completed: number
          notCompleted: number
          inProgress: number
          canceled: number
        }
      >()

      for (const order of orders) {
        const id = order.assignedToId!
        const name = order.assignedTo?.name ?? 'Nieznany'

        if (!resultMap.has(id)) {
          resultMap.set(id, {
            technicianId: id,
            technicianName: name,
            completed: 0,
            notCompleted: 0,
            inProgress: 0,
            canceled: 0,
          })
        }

        const entry = resultMap.get(id)!
        if (order.status === 'COMPLETED') entry.completed++
        else if (order.status === 'NOT_COMPLETED') entry.notCompleted++
        else if (order.status === 'IN_PROGRESS') entry.inProgress++
        else if (order.status === 'CANCELED') entry.canceled++
      }

      return Array.from(resultMap.values()).sort(
        (a, b) => b.completed + b.notCompleted - (a.completed + a.notCompleted)
      )
    }),
})
