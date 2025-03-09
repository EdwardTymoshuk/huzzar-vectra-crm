import { TechnicianAssignment } from '@/types'
import { prisma } from '@/utils/prisma'
import {
  Operator,
  OrderStatus,
  OrderType,
  Standard,
  TimeSlot,
} from '@prisma/client'
import { endOfDay, startOfDay } from 'date-fns'
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
        assignedToId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortField, sortOrder, status, assignedToId } = input

      const filters: {
        status?: OrderStatus
        assignedToId?: string | null
      } = {}

      if (status) filters.status = status
      if (assignedToId) {
        filters.assignedToId =
          assignedToId === 'unassigned' ? null : assignedToId
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
        operator: z.nativeEnum(Operator),
        type: z.nativeEnum(OrderType),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(TimeSlot),
        standard: z.nativeEnum(Standard).optional(),
        contractRequired: z.boolean(),
        equipmentNeeded: z.array(z.string()).optional(),
        clientPhoneNumber: z.string().optional(),
        notes: z.string().optional(),
        status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
        county: z.string().min(2).or(z.literal('')).optional(),
        municipality: z.string().min(2).or(z.literal('')).optional(),
        city: z.string().min(2),
        street: z.string().min(3),
        postalCode: z.string().min(5),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.order.create({
        data: {
          operator: input.operator,
          type: input.type,
          orderNumber: input.orderNumber,
          date: new Date(input.date),
          timeSlot: input.timeSlot,
          standard: input.standard || undefined,
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
          assignedToId: input.assignedToId || null,
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
        timeSlot: z.nativeEnum(TimeSlot),
        contractRequired: z.boolean(),
        equipmentNeeded: z.array(z.string()).optional(),
        clientPhoneNumber: z.string().optional(),
        notes: z.string().optional(),
        status: z.nativeEnum(OrderStatus),
        county: z.string().optional(),
        municipality: z.string().optional(),
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
        status: z.nativeEnum(OrderStatus),
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
          history: {
            include: {
              changedBy: { select: { id: true, name: true } },
            },
            orderBy: { changeDate: 'desc' },
          },
        },
      })

      if (!order) {
        throw new Error('Zlecenie nie istnieje.')
      }

      return order
    }),

  /**
   * Get assigned orders grouped by technician and time slot.
   */
  getAssignedOrders: protectedProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ ctx, input }): Promise<TechnicianAssignment[]> => {
      const selectedDate = input?.date
        ? new Date(input.date + 'T00:00:00')
        : new Date()

      const start = startOfDay(selectedDate)
      const end = endOfDay(selectedDate)

      const technicians = await ctx.prisma.user.findMany({
        // where: { role: 'TECHNICIAN' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      const assignedOrders = await ctx.prisma.order.findMany({
        where: {
          assignedToId: { not: null },
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          timeSlot: true,
          status: true,
          assignedTo: {
            select: { id: true, name: true },
          },
        },
        orderBy: { timeSlot: 'asc' },
      })

      const ordersByTechnician: Record<string, typeof assignedOrders> = {}
      technicians.forEach((tech) => {
        ordersByTechnician[tech.id] = []
      })
      assignedOrders.forEach((order) => {
        if (order.assignedTo?.id) {
          if (!ordersByTechnician[order.assignedTo.id]) {
            ordersByTechnician[order.assignedTo.id] = []
          }
          ordersByTechnician[order.assignedTo.id].push(order)
        }
      })

      const result: TechnicianAssignment[] = technicians.map((tech) => {
        const slotsMap: Record<
          string,
          {
            timeSlot: TimeSlot
            orders: TechnicianAssignment['slots'][number]['orders']
          }
        > = {}

        ordersByTechnician[tech.id].forEach((order) => {
          if (!slotsMap[order.timeSlot]) {
            slotsMap[order.timeSlot] = {
              timeSlot: order.timeSlot as TimeSlot,
              orders: [],
            }
          }
          slotsMap[order.timeSlot].orders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            address: `${order.city}, ${order.street}`,
            status: order.status,
            assignedToId: order.assignedTo ? order.assignedTo.id : undefined,
          })
        })

        return {
          technicianName: tech.name,
          technicianId: tech.id,
          slots: Object.values(slotsMap),
        }
      })

      const unassignedOrders = await ctx.prisma.order.findMany({
        where: {
          assignedToId: null,
          date: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          city: true,
          street: true,
          timeSlot: true,
          status: true,
        },
        orderBy: { timeSlot: 'asc' },
      })

      if (unassignedOrders.length > 0) {
        const slotsMap: Record<
          string,
          {
            timeSlot: TimeSlot
            orders: TechnicianAssignment['slots'][number]['orders']
          }
        > = {}

        unassignedOrders.forEach((order) => {
          if (!slotsMap[order.timeSlot]) {
            slotsMap[order.timeSlot] = {
              timeSlot: order.timeSlot as TimeSlot,
              orders: [],
            }
          }
          slotsMap[order.timeSlot].orders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            address: `${order.city}, ${order.street}`,
            status: order.status,
            assignedToId: undefined,
          })
        })

        result.push({
          technicianName: 'Nieprzypisany',
          technicianId: null,
          slots: Object.values(slotsMap),
        })
      }

      return result
    }),

  assignTechnician: roleProtectedProcedure(['ADMIN'])
    .input(
      z.object({
        id: z.string(),
        assignedToId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.id },
        select: { status: true },
      })

      if (!order) throw new Error('Zlecenie nie istnieje.')

      const updatedStatus =
        input.assignedToId && order.status === OrderStatus.PENDING
          ? OrderStatus.ASSIGNED
          : order.status

      const technicianExists = input.assignedToId
        ? await prisma.user.findUnique({ where: { id: input.assignedToId } })
        : true

      if (!technicianExists) {
        throw new Error('Technik o podanym ID nie istnieje')
      }

      return prisma.order.update({
        where: { id: input.id },
        data: {
          assignedToId: input.assignedToId ?? null,
        },
      })
    }),
})
