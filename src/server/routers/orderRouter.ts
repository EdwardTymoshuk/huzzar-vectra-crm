import { sortedTimeSlotsByHour } from '@/lib/constants'
import { TechnicianAssignment } from '@/types'
import { cleanStreetName, getCoordinatesFromAddress } from '@/utils/geocode'
import { prisma } from '@/utils/prisma'
import { sortCodes } from '@/utils/sortCodes'
import { writeToBuffer } from '@/utils/writeToBuffer'
import { OrderStatus, OrderType, Standard, TimeSlot } from '@prisma/client'
import { endOfDay, format, startOfDay } from 'date-fns'
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
        sortField: z
          .enum(['createdAt', 'date', 'status'])
          .optional()
          .default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
        status: z.nativeEnum(OrderStatus).optional(),
        assignedToId: z.string().optional(),
        type: z.nativeEnum(OrderType).optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, sortField, sortOrder, status, assignedToId } = input

      const filters: {
        status?: OrderStatus
        assignedToId?: string | null
        type?: OrderType
      } = {}

      if (status) filters.status = status
      if (assignedToId) {
        filters.assignedToId =
          assignedToId === 'unassigned' ? null : assignedToId
      }
      if (input.type) filters.type = input.type

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

  getOrderById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.id },
        include: {
          assignedTo: {
            select: { id: true, name: true },
          },
          history: {
            include: {
              changedBy: { select: { id: true, name: true } },
            },
            orderBy: { changeDate: 'desc' },
          },
          settlementEntries: {
            include: { rate: true },
          },
          usedMaterials: {
            include: {
              material: true,
            },
          },
          assignedEquipment: true,
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
        where: { role: 'TECHNICIAN' },
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
          slots: Object.values(slotsMap).sort(
            (a, b) =>
              sortedTimeSlotsByHour.indexOf(a.timeSlot) -
              sortedTimeSlotsByHour.indexOf(b.timeSlot)
          ),
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
          slots: Object.values(slotsMap).sort(
            (a, b) =>
              sortedTimeSlotsByHour.indexOf(a.timeSlot) -
              sortedTimeSlotsByHour.indexOf(b.timeSlot)
          ),
        })
      }

      return result
    }),

  /**
   * Fetches all unassigned orders (orders that are not yet assigned to a technician).
   * These orders are needed for planning and can be dragged to technicians.
   */
  getUnassignedOrders: protectedProcedure.query(async () => {
    /**
     * Fetch unassigned orders from the database.
     * - Orders are considered "unassigned" if `assignedToId` is NULL.
     * - We select only the necessary fields to optimize database queries.
     * - Orders are sorted by `timeSlot` to ensure logical order.
     */
    const unassignedOrders = await prisma.order.findMany({
      where: {
        assignedToId: null, // Only orders that are not yet assigned
      },
      select: {
        id: true,
        orderNumber: true,
        city: true,
        street: true,
        operator: true,
        timeSlot: true,
        status: true,
        postalCode: true,
      },
      orderBy: { timeSlot: 'asc' },
    })

    const enrichedOrders = await Promise.all(
      unassignedOrders.map(async (order) => {
        const cleanedStreet = cleanStreetName(order.street)
        const fullAddress = `${cleanedStreet}, ${order.postalCode}, ${order.city}`
        const coordinates = await getCoordinatesFromAddress(fullAddress)

        return {
          ...order,
          lat: coordinates?.lat ?? null,
          lng: coordinates?.lng ?? null,
        }
      })
    )

    return enrichedOrders
  }),

  /**
   * Create a new order.
   */
  createOrder: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        operator: z.string(),
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

      const technicianExists = input.assignedToId
        ? await prisma.user.findUnique({ where: { id: input.assignedToId } })
        : true

      if (!technicianExists) {
        throw new Error('Technik o podanym ID nie istnieje')
      }

      const newStatus = input.assignedToId
        ? OrderStatus.ASSIGNED
        : OrderStatus.PENDING

      return prisma.order.update({
        where: { id: input.id },
        data: {
          assignedToId: input.assignedToId ?? null,
          status: newStatus,
        },
      })
    }),
  //get orders stats
  getOrderStats: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        range: z.enum(['day', 'month', 'year']),
      })
    )
    .query(async ({ input }) => {
      const [y, m, d] = input.date.split('-').map(Number)
      const date = new Date(y, m - 1, d)

      const getRange = (d: Date, r: 'day' | 'month' | 'year') => {
        const start = new Date(d)
        const end = new Date(d)

        if (r === 'day') {
          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)
        } else if (r === 'month') {
          start.setDate(1)
          start.setHours(0, 0, 0, 0)
          end.setMonth(end.getMonth() + 1, 0)
          end.setHours(23, 59, 59, 999)
        } else if (r === 'year') {
          start.setMonth(0, 1)
          start.setHours(0, 0, 0, 0)
          end.setMonth(11, 31)
          end.setHours(23, 59, 59, 999)
        }

        return { start, end }
      }

      const getStats = async (start: Date, end: Date) => {
        const orders = await prisma.order.findMany({
          where: {
            date: { gte: start, lte: end },
            assignedToId: { not: null },
          },
          select: { status: true },
        })

        let completed = 0
        let failed = 0
        let inProgress = 0
        let canceled = 0

        for (const order of orders) {
          switch (order.status) {
            case 'COMPLETED':
              completed++
              break
            case 'NOT_COMPLETED':
              failed++
              break
            case 'IN_PROGRESS':
              inProgress++
              break
            case 'CANCELED':
              canceled++
              break
          }
        }

        const total = completed + failed + inProgress + canceled
        const totalForSuccess = completed + failed
        const successRate =
          totalForSuccess > 0
            ? Math.round((completed / totalForSuccess) * 100)
            : 0

        return {
          total,
          completed,
          failed,
          inProgress,
          canceled,
          successRate,
        }
      }

      const current = getRange(date, input.range)

      // Wyliczamy datę poprzedniego okresu
      const prevDate = new Date(date)
      if (input.range === 'day') prevDate.setDate(prevDate.getDate() - 1)
      else if (input.range === 'month')
        prevDate.setMonth(prevDate.getMonth() - 1)
      else if (input.range === 'year')
        prevDate.setFullYear(prevDate.getFullYear() - 1)

      const previous = getRange(prevDate, input.range)

      const [currentStats, prevStats] = await Promise.all([
        getStats(current.start, current.end),
        getStats(previous.start, previous.end),
      ])

      return {
        ...currentStats,
        prevTotal: prevStats.total,
        prevCompleted: prevStats.completed,
        prevFailed: prevStats.failed,
        prevInProgress: prevStats.inProgress,
        prevCanceled: prevStats.canceled,
      }
    }),
  generateDailyReport: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(z.object({ date: z.string() }))
    .mutation(async ({ input }) => {
      const targetDate = new Date(input.date)
      const start = new Date(targetDate)
      const end = new Date(targetDate)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)

      const orders = await prisma.order.findMany({
        where: { date: { gte: start, lte: end } },
        include: { assignedTo: true },
        orderBy: { date: 'asc' },
      })

      if (orders.length === 0) {
        // Zwróć null (frontend to obsłuży i pokaże toast)
        return null
      }

      const rows = orders.map((o, idx) => ({
        Lp: idx + 1,
        'Nr zlecenia': o.orderNumber,
        Adres: `${o.city} ${o.postalCode}, ${o.street}`,
        Wykonana: o.status === 'COMPLETED' ? 'TAK' : 'NIE',
        'Powód niewykonania': o.status === 'NOT_COMPLETED' ? o.notes ?? '' : '',
        Technik: o.assignedTo?.name ?? 'Nieprzypisany',
        Operator: o.operator,
      }))

      const buffer = await writeToBuffer(
        rows,
        `Raport ${format(start, 'yyyy-MM-dd')}`
      )

      return buffer.toString('base64')
    }),
  /**
   * getBillingMonthlySummary
   * Returns a monthly summary: one row per technician,
   * all codes as columns (summed), and totalAmount.
   */
  getBillingMonthlySummary: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(
      z.object({
        from: z.string(), // e.g. "2025-03-01"
        to: z.string(), // e.g. "2025-03-31"
        operator: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { from, to, operator } = input

      // Get all rate definitions (for columns)
      const allRates = await prisma.rateDefinition.findMany()
      const allCodes = sortCodes(allRates.map((r) => r.code))

      // Get all installation orders with settlements, grouped by technician
      const orders = await prisma.order.findMany({
        where: {
          type: 'INSTALATION',
          date: { gte: new Date(from), lte: new Date(to) },
          ...(operator && { operator }),
          status: { in: ['COMPLETED', 'NOT_COMPLETED'] },
          assignedToId: { not: null },
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          settlementEntries: { include: { rate: true } },
        },
      })

      // Map by technicianId
      const techMap: Record<
        string,
        {
          technicianId: string
          technicianName: string
          codes: Record<string, number>
          totalAmount: number
        }
      > = {}

      for (const order of orders) {
        const tech = order.assignedTo
        if (!tech) continue
        if (!techMap[tech.id]) {
          techMap[tech.id] = {
            technicianId: tech.id, // <- to pole jest wymagane!
            technicianName: tech.name,
            codes: {},
            totalAmount: 0,
          }
          allCodes.forEach((code) => (techMap[tech.id].codes[code] = 0))
        }
        for (const entry of order.settlementEntries) {
          if (entry.code && techMap[tech.id].codes[entry.code] !== undefined) {
            techMap[tech.id].codes[entry.code] += entry.quantity
            techMap[tech.id].totalAmount +=
              (entry.rate?.amount ?? 0) * entry.quantity
          }
        }
      }

      // Return as array, sorted by name
      return Object.values(techMap).sort((a, b) =>
        a.technicianName.localeCompare(b.technicianName)
      )
    }),

  getOrderDetails: roleProtectedProcedure(['ADMIN', 'COORDINATOR'])
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          assignedTo: { select: { id: true, name: true } },
          settlementEntries: {
            include: {
              rate: { select: { amount: true } },
            },
          },
          usedMaterials: {
            include: {
              material: true,
            },
          },
          assignedEquipment: true,
        },
      })
      if (!order) return null

      const codes = order.settlementEntries.map((entry) => ({
        code: entry.code,
        quantity: entry.quantity,
        amount: (entry.rate?.amount ?? 0) * entry.quantity,
      }))

      const materials = order.usedMaterials.map((mat) => ({
        name: mat.material.name,
        quantity: mat.quantity,
        unit: mat.unit,
      }))

      const equipment = order.assignedEquipment.map((item) => ({
        name: item.name,
        serialNumber: item.serialNumber,
      }))

      return {
        orderId: order.id,
        technician: order.assignedTo?.name ?? 'Nieznany',
        status: order.status,
        closedAt: order.closedAt,
        failureReason: order.failureReason,
        notes: order.notes,
        codes,
        materials,
        equipment,
      }
    }),
})
