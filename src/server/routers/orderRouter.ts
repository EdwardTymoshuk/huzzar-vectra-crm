import { prisma } from '@/utils/prisma'
import { Standard, TimeSlot } from '@prisma/client'
import { z } from 'zod'
import { protectedProcedure, roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const orderRouter = router({
  /**
   * Fetch orders with optional search and pagination.
   */
  getOrders: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        limit: z.number().optional().default(30),
        sortField: z.enum(['date', 'status']).optional().default('date'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
        status: z.string().optional(),
        technician: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortField, sortOrder, status, technician } = input

      // Filtry
      const filters: any = {}
      if (status) filters.status = status
      if (technician === 'assigned') {
        filters.assignedToId = { not: null }
      } else if (technician === 'unassigned') {
        filters.assignedToId = null
      }

      // Pobranie zleceń z paginacją, sortowaniem i filtrami
      const orders = await prisma.order.findMany({
        where: filters,
        orderBy: { [sortField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { name: true } },
        },
      })

      const totalOrders = await prisma.order.count({ where: filters })

      return { orders, totalOrders }
    }),
  /**
   * Create a new order.
   */
  createOrder: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(TimeSlot),
        standard: z.nativeEnum(Standard),
        contractRequired: z.boolean(),
        equipmentNeeded: z.array(z.string()).optional(),
        clientPhoneNumber: z.string().optional(),
        notes: z.string().optional(),
        status: z
          .enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'])
          .default('PENDING'),
        county: z.string().min(2),
        municipality: z.string().min(2),
        city: z.string().min(2),
        street: z.string().min(3),
        postalCode: z.string().min(5),
        technician: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.order.create({
        data: {
          orderNumber: input.orderNumber,
          date: new Date(input.date),
          timeSlot: input.timeSlot,
          standard: input.standard,
          contractRequired: input.contractRequired,
          equipmentNeeded: input.equipmentNeeded || [],
          clientPhoneNumber: input.clientPhoneNumber,
          notes: input.notes,
          status: input.status,
          county: input.county,
          municipality: input.municipality,
          city: input.city,
          street: input.street,
          postalCode: input.postalCode,
          assignedToId: input.technician || null,
        },
      })
    }),

  /**
   * Edit an existing order.
   */
  editOrder: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        id: z.string(),
        orderNumber: z.string().min(3),
        date: z.string(),
        city: z.string().min(2),
        street: z.string().min(3),
        technician: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.order.update({
        where: { id: input.id },
        data: {
          orderNumber: input.orderNumber,
          date: new Date(input.date),
          city: input.city,
          street: input.street,
          assignedToId: input.technician || null,
        },
      })
    }),

  /**
   * Delete an order by ID.
   */
  deleteOrder: roleProtectedProcedure(['ADMIN'])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.order.delete({ where: { id: input.id } })
    }),

  /**
   * Toggle order status.
   */
  toggleOrderStatus: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          'PENDING',
          'ASSIGNED',
          'IN_PROGRESS',
          'COMPLETED',
          'CANCELED',
        ]),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.order.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }),
  getOrderById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: { select: { name: true } },
        },
      })

      if (!order) {
        throw new Error('Zlecenie nie istnieje.')
      }

      return order
    }),
})
