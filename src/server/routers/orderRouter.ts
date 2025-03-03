import { prisma } from '@/utils/prisma'
import { OrderStatus, Standard, TimeSlot } from '@prisma/client'
import { z } from 'zod'
import { protectedProcedure, roleProtectedProcedure } from '../middleware'
import { router } from '../trpc'

export const orderRouter = router({
  /**
   * Fetch orders with optional filters, sorting, and pagination.
   */
  getOrders: protectedProcedure
    .input(
      z.object({
        page: z.number().optional().default(1),
        limit: z.number().optional().default(30),
        sortField: z.enum(['date', 'status']).optional().default('date'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
        status: z.nativeEnum(OrderStatus).optional(),
        technician: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortField, sortOrder, status, technician } = input

      const filters: {
        status?: OrderStatus
        assignedToId?: string | null
      } = {}

      if (status) filters.status = status
      if (technician) {
        filters.assignedToId = technician === 'unassigned' ? null : technician
      }

      const orders = await prisma.order.findMany({
        where: filters,
        orderBy: { [sortField]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedTo: { select: { id: true, name: true } },
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
  editOrder: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        id: z.string(),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.enum([
          'EIGHT_ELEVEN',
          'ELEVEN_FOURTEEN',
          'FOURTEEN_SEVENTEEN',
          'SEVENTEEN_TWENTY',
        ]),
        standard: z.enum(['W1', 'W2', 'W3', 'W4', 'W5', 'W6']),
        contractRequired: z.boolean(),
        equipmentNeeded: z.array(z.string()),
        clientPhoneNumber: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum([
          'PENDING',
          'ASSIGNED',
          'IN_PROGRESS',
          'COMPLETED',
          'NOT_COMPLETED',
          'CANCELED',
        ]),
        county: z.string(),
        municipality: z.string(),
        city: z.string(),
        street: z.string(),
        postalCode: z.string(),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.order.update({
        where: { id: input.id },
        data: {
          orderNumber: input.orderNumber,
          date: new Date(input.date),
          timeSlot: input.timeSlot,
          standard: input.standard,
          contractRequired: input.contractRequired,
          equipmentNeeded: input.equipmentNeeded,
          clientPhoneNumber: input.clientPhoneNumber,
          notes: input.notes,
          status: input.status,
          county: input.county,
          municipality: input.municipality,
          city: input.city,
          street: input.street,
          postalCode: input.postalCode,
          assignedToId: input.assignedToId || null,
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
          'NOT_COMPLETED',
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
          assignedTo: { select: { id: true, name: true } },
        },
      })

      if (!order) {
        throw new Error('Zlecenie nie istnieje.')
      }

      return order
    }),
})
