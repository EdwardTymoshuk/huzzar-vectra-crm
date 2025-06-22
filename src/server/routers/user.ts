import { router } from '@/server/trpc'

import { prisma } from '@/utils/prisma'
import { OrderStatus } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import { adminOnly, adminOrCoord, loggedInEveryone } from '../roleHelpers'

export const userRouter = router({
  /** Current logged-in user */
  me: loggedInEveryone.query(({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { id: true, email: true, name: true, role: true, status: true },
    })
  }),

  /** List of technicians (admin only) */
  getTechnicians: loggedInEveryone.query(() =>
    prisma.user.findMany({
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
  ),

  /** List of coordinators / warehousemen / admins */
  getAdmins: adminOnly.query(() =>
    prisma.user.findMany({
      where: { role: { in: ['COORDINATOR', 'WAREHOUSEMAN', 'ADMIN'] } },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        name: true,
        role: true,
        status: true,
      },
    })
  ),

  /** Single user by ID */
  getUserById: adminOnly
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
      if (!user)
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Użytkownik nie istnieje.',
        })
      return user
    }),

  /** Create new user */
  createUser: adminOnly
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
      const hashed = await bcrypt.hash(input.password, 10)
      return prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashed,
          phoneNumber: input.phoneNumber,
          identyficator: input.identyficator,
          role: input.role,
          status: 'ACTIVE',
        },
      })
    }),

  /** Edit user, optional password/role update */
  editUser: adminOnly
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2),
        email: z.string().email(),
        phoneNumber: z.string(),
        password: z
          .string()
          .min(8)
          .max(32)
          .regex(/[a-z]/)
          .regex(/[A-Z]/)
          .regex(/\d/)
          .regex(/[!@#$%^&*()_+{}[\]<>?]/)
          .optional(),
        role: z
          .enum(['ADMIN', 'TECHNICIAN', 'COORDINATOR', 'WAREHOUSEMAN'])
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data: any = {
        name: input.name,
        email: input.email,
        phoneNumber: input.phoneNumber,
      }
      if (input.password) data.password = await bcrypt.hash(input.password, 10)
      if (input.role) data.role = input.role
      return prisma.user.update({ where: { id: input.id }, data })
    }),

  /** Toggle ACTIVE / SUSPENDED */
  toggleUserStatus: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const user = await prisma.user.findUnique({ where: { id: input.id } })
      if (!user) throw new Error('Użytkownik nie istnieje')
      return prisma.user.update({
        where: { id: input.id },
        data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
      })
    }),

  /** Delete user */
  deleteUser: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => prisma.user.delete({ where: { id: input.id } })),

  /** Technician efficiency */
  getTechnicianEfficiency: adminOrCoord
    .input(
      z.object({
        date: z.string(),
        range: z.enum(['day', 'month', 'year']),
      })
    )
    .query(async ({ input }) => {
      const base = new Date(input.date)
      const start = new Date(base)
      const end = new Date(base)

      if (input.range === 'day') {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
      } else if (input.range === 'month') {
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(end.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
      } else {
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        end.setMonth(11, 31)
        end.setHours(23, 59, 59, 999)
      }

      const relevant: OrderStatus[] = [
        'COMPLETED',
        'NOT_COMPLETED',
        'IN_PROGRESS',
        'CANCELED',
      ]

      const rows = await prisma.order.findMany({
        where: {
          assignedToId: { not: null },
          status: { in: relevant },
          date: { gte: start, lte: end },
        },
        select: {
          assignedToId: true,
          status: true,
          assignedTo: { select: { name: true } },
        },
      })

      const map = new Map<
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

      rows.forEach((o) => {
        const id = o.assignedToId!
        if (!map.has(id))
          map.set(id, {
            technicianId: id,
            technicianName: o.assignedTo?.name ?? 'Nieznany',
            completed: 0,
            notCompleted: 0,
            inProgress: 0,
            canceled: 0,
          })
        const entry = map.get(id)!
        if (o.status === 'COMPLETED') entry.completed++
        else if (o.status === 'NOT_COMPLETED') entry.notCompleted++
        else if (o.status === 'IN_PROGRESS') entry.inProgress++
        else entry.canceled++
      })

      return [...map.values()].sort(
        (a, b) => b.completed + b.notCompleted - (a.completed + a.notCompleted)
      )
    }),

  /** Archive user (status → INACTIVE) */
  archiveUser: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      prisma.user.update({
        where: { id: input.id },
        data: { status: 'INACTIVE' },
      })
    ),

  /** Restore user (status → ACTIVE) */
  restoreUser: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) =>
      prisma.user.update({
        where: { id: input.id },
        data: { status: 'ACTIVE' },
      })
    ),

  /** Technicians for transfer – excludes given id (by default ctx.user.id) */
  getOtherTechnicians: loggedInEveryone
    .input(
      z.object({
        excludeId: z.string().optional(),
      })
    )
    .query(({ ctx, input }) =>
      prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          id: { not: input.excludeId ?? ctx.user!.id },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          status: true,
        },
      })
    ),
})
