import {
  adminCoordOrWarehouse,
  adminOnly,
  loggedInEveryone,
} from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { Prisma, WarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getUserOrThrow } from '../_helpers/getUserOrThrow'
import { resolveLocationId } from '../_helpers/resolveLocationId'

/** Modes for the ItemTabs views */
const Modes = ['warehouse', 'technicians', 'orders', 'returned'] as const

export const queriesRouter = router({
  /** 📦 Get all warehouse items (ordered by creation date) */
  getAll: loggedInEveryone
    .input(
      z
        .object({
          locationId: z.string().optional(),
          itemType: z.nativeEnum(WarehouseItemType).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const user = getUserOrThrow(ctx)
      const locId = resolveLocationId(user, input)
      return prisma.warehouse.findMany({
        where: {
          locationId: locId,
          ...(input?.itemType ? { itemType: input.itemType } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /**
   * 📦 Get items by name for a concrete mode (Magazyn/Technicy/Wydane/Zwrócone).
   * Server-side filtering keeps payload small and ensures typing matches WarehouseWithRelations.
   */
  getItemsByName: loggedInEveryone
    .input(
      z.object({
        name: z.string().min(1),
        scope: z.enum(['all', 'technician']).default('all'),
        mode: z.enum(Modes).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const techId = ctx.user?.id
      const baseWhere = {
        name: { equals: input.name.trim(), mode: 'insensitive' as const },
      }

      let whereClause: Record<string, unknown> = { ...baseWhere }

      switch (input.mode) {
        case 'warehouse':
          whereClause = {
            ...baseWhere,
            assignedToId: null,
            status: 'AVAILABLE',
            orderAssignments: { none: {} },
          }
          break
        case 'technicians':
          whereClause = {
            ...baseWhere,
            assignedToId: { not: null },
            status: 'ASSIGNED',
            orderAssignments: { none: {} },
          }
          break
        case 'orders':
          whereClause = {
            ...baseWhere,
            status: 'ASSIGNED_TO_ORDER',
            orderAssignments: { some: {} },
          }
          break
        case 'returned':
          whereClause = {
            ...baseWhere,
            status: { in: ['RETURNED', 'RETURNED_TO_OPERATOR'] },
          }
          break
        default:
          if (input.scope === 'technician' && techId) {
            whereClause = {
              ...baseWhere,
              OR: [
                { assignedToId: techId },
                { history: { some: { performedById: techId } } },
              ],
            }
          }
      }

      return prisma.warehouse.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          itemType: true,
          category: true,
          serialNumber: true,
          index: true,
          unit: true,
          createdAt: true,
          updatedAt: true,
          quantity: true,
          price: true,
          status: true,
          assignedToId: true,
          transferPending: true,
          assignedTo: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          orderAssignments: {
            take: 1,
            select: {
              order: {
                select: { id: true, orderNumber: true, createdAt: true },
              },
            },
          },
          history: {
            select: {
              action: true,
              actionDate: true,
              performedBy: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, name: true } },
            },
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
          orderAssignments: { none: {} },
        },
        include: {
          assignedTo: true,
          transferTo: true,
          history: {
            include: { performedBy: true, assignedTo: true },
            orderBy: { actionDate: 'asc' },
          },
          orderAssignments: { include: { order: true } },
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
            include: { order: { select: { id: true, orderNumber: true } } },
          },
          history: {
            orderBy: { actionDate: 'desc' },
            take: 1,
            select: { action: true, actionDate: true },
          },
          location: { select: { id: true, name: true } },
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
        location: item.location,
      }
    }),

  /** 🔎 Autocomplete search by serial number (available devices only) */
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

  /** 🛠️  Devices/materials collected from clients (technician view) */
  getCollectedWithDetails: loggedInEveryone.query(({ ctx }) => {
    const techId = ctx.user?.id
    if (!techId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    return prisma.warehouse.findMany({
      where: { assignedToId: techId, status: 'COLLECTED_FROM_CLIENT' },
      include: {
        history: {
          where: { action: 'COLLECTED_FROM_CLIENT' },
          orderBy: { actionDate: 'desc' },
          take: 1,
        },
        orderAssignments: {
          include: {
            order: {
              select: {
                orderNumber: true,
                city: true,
                street: true,
                date: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'asc' },
    })
  }),

  /** 📍 Get warehouse locations depending on role */
  getAllLocations: adminCoordOrWarehouse.query(async ({ ctx }) => {
    const { user } = ctx
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    switch (user.role) {
      case 'ADMIN':
      case 'COORDINATOR':
      case 'WAREHOUSEMAN':
        return ctx.prisma.warehouseLocation.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        })
      default:
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Technicians cannot access locations',
        })
    }
  }),

  /** 📍 Only user-assigned locations (for sidebar menu) */
  getUserLocations: adminCoordOrWarehouse.query(async ({ ctx }) => {
    const { user } = ctx
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    if (user.role === 'ADMIN' || user.role === 'COORDINATOR') {
      // Admin/koordynator ma wszystkie
      return ctx.prisma.warehouseLocation.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
    }

    if (user.role === 'WAREHOUSEMAN') {
      // Magazynier tylko przypisane
      return user.locations
    }

    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Technicians cannot access locations',
    })
  }),

  /** ➕ Create new warehouse location */
  createLocation: adminOnly
    .input(z.object({ id: z.string().min(2), name: z.string().min(2) }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.warehouseLocation.create({
          data: { id: input.id.trim().toLowerCase(), name: input.name.trim() },
        })
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Identyfikator lub nazwa lokalizacji już istnieje.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nie udało się dodać lokalizacji.',
        })
      }
    }),

  /** 🗑️ Delete warehouse location */
  deleteLocation: adminOnly
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        return await ctx.prisma.warehouseLocation.delete({
          where: { id: input.id },
        })
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2025'
        ) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Lokalizacja już nie istnieje.',
          })
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nie udało się usunąć lokalizacji.',
        })
      }
    }),

  /** ✏️ Update warehouse location */
  updateLocation: adminOnly
    .input(z.object({ id: z.string(), name: z.string().min(2) }))
    .mutation(({ input, ctx }) =>
      ctx.prisma.warehouseLocation.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    ),
})
