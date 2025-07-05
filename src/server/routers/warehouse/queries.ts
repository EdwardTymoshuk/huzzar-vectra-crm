// server/routers/warehouse/queries.ts
import { loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { WarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const queriesRouter = router({
  /** 📦 Get all warehouse items (ordered by creation date) */
  getAll: loggedInEveryone.query(() => {
    return prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }),

  /** 📦 Get items by name (scope = all | technician) */
  getItemsByName: loggedInEveryone
    .input(
      z.object({
        name: z.string().min(1),
        scope: z.enum(['all', 'technician']).default('all'),
      })
    )
    .query(async ({ input, ctx }) => {
      const techId = ctx.user?.id

      return prisma.warehouse.findMany({
        where: {
          name: { equals: input.name.trim(), mode: 'insensitive' },

          ...(input.scope === 'technician' && techId
            ? {
                OR: [
                  { assignedToId: techId },
                  { history: { some: { performedById: techId } } },
                ],
              }
            : {}),
        },
        include: {
          assignedTo: true,
          orderAssignments: { include: { order: true } },
          history: {
            include: { performedBy: true, assignedTo: true },
            orderBy: { actionDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  /** 🔍 Get warehouse item by serial number */
  getBySerialNumber: loggedInEveryone
    .input(z.object({ serial: z.string().min(1) }))
    .query(async ({ input }) => {
      const item = await prisma.warehouse.findFirst({
        where: {
          serialNumber: {
            equals: input.serial,
            mode: 'insensitive',
          },
        },
        include: { assignedTo: true },
      })

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Nie znaleziono urządzenia o podanym numerze seryjnym',
        })
      }

      return item
    }),

  /** 🧰 Get all items currently assigned to a technician */
  getTechnicianStock: loggedInEveryone
    .input(
      z.object({
        technicianId: z.string(),
        itemType: z.nativeEnum(WarehouseItemType).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const id =
        input.technicianId === 'self' ? ctx.user?.id : input.technicianId
      if (!id) throw new TRPCError({ code: 'UNAUTHORIZED' })

      return prisma.warehouse.findMany({
        where: {
          assignedToId: id,
          status: { in: ['AVAILABLE', 'ASSIGNED'] },
          ...(input.itemType ? { itemType: input.itemType } : {}),
          orderAssignments: {
            none: {},
          },
        },
        include: {
          assignedTo: true,
          transferTo: true,
          history: {
            include: {
              performedBy: true,
              assignedTo: true,
            },
            orderBy: { actionDate: 'asc' },
          },
          orderAssignments: {
            include: {
              order: true,
            },
          },
        },
      })
    }),

  /** 🔍 Check serial number for device status + last action */
  checkDeviceBySerialNumber: loggedInEveryone
    .input(z.object({ serialNumber: z.string().min(3) }))
    .query(async ({ input }) => {
      const item = await prisma.warehouse.findFirst({
        where: {
          serialNumber: {
            equals: input.serialNumber.trim(),
            mode: 'insensitive',
          },
          itemType: WarehouseItemType.DEVICE,
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
          orderAssignments: {
            include: {
              order: { select: { id: true, orderNumber: true } },
            },
          },
          history: {
            orderBy: { actionDate: 'desc' },
            take: 1,
            select: { action: true, actionDate: true },
          },
        },
      })

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Urządzenie nie istnieje',
        })
      }

      const last = item.history[0] ?? null

      return {
        id: item.id,
        name: item.name,
        status: item.status,
        assignedTo: item.assignedTo,
        assignedOrder: item.orderAssignments[0]?.order ?? null,
        lastAction: last?.action ?? null,
        lastActionDate: last?.actionDate ?? null,
      }
    }),
  // server/warehouse/router.ts  (lub w osobnym pliku)
  searchDevices: loggedInEveryone
    .input(z.object({ q: z.string().min(2) }))
    .query(({ ctx, input }) =>
      ctx.prisma.warehouse.findMany({
        where: {
          itemType: 'DEVICE',
          status: 'AVAILABLE',
          serialNumber: {
            not: null,
            startsWith: input.q,
            mode: 'insensitive',
          },
        },
        take: 10,
        select: { id: true, serialNumber: true, name: true },
      })
    ),
})
