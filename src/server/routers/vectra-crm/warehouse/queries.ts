import {
  adminCoordOrWarehouse,
  adminOnly,
  adminOrCoord,
  loggedInEveryone,
} from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { DeviceCategory, Prisma, WarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { getUserOrThrow } from '../../_helpers/getUserOrThrow'
import { resolveLocationId } from '../../_helpers/resolveLocationId'

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
      return prisma.vectraWarehouse.findMany({
        where: {
          locationId: locId,
          ...(input?.itemType ? { itemType: input.itemType } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  getDefinitionsWithStock: loggedInEveryone
    .input(
      z.object({
        itemType: z.nativeEnum(WarehouseItemType),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = getUserOrThrow(ctx)
      const locId = resolveLocationId(user, input)

      // ------------------------------------------------------------
      // DEVICE DEFINITIONS
      // ------------------------------------------------------------
      if (input.itemType === 'DEVICE') {
        // 1) Load all device definitions
        const definitions = await prisma.vectraDeviceDefinition.findMany({
          orderBy: { name: 'asc' },
        })

        // 2) Load current warehouse stock (only names/prices/category)
        const stock = await prisma.vectraWarehouse.findMany({
          where: {
            locationId: locId ?? undefined,
            itemType: 'DEVICE',
            assignedToId: null,
            status: 'AVAILABLE',
            orderAssignments: { none: {} },
          },
          select: {
            name: true,
            quantity: true,
            price: true,
            category: true,
          },
        })

        // 3) Merge definitions and stock
        const map = new Map<
          string,
          {
            name: string
            category: string
            quantity: number
            price: number
            itemType: WarehouseItemType
          }
        >()

        // Populate all definitions with default quantity = 0
        for (const def of definitions) {
          map.set(def.name, {
            name: def.name,
            category: def.category,
            quantity: 0,
            price: Number(def.price ?? 0),
            itemType: 'DEVICE',
          })
        }

        // Add actual stock
        for (const item of stock) {
          const row = map.get(item.name)
          if (!row) continue
          row.quantity += item.quantity
          if (item.price != null) row.price = Number(item.price)
          if (item.category) row.category = item.category
        }

        return Array.from(map.values())
      }

      // ------------------------------------------------------------
      // MATERIAL DEFINITIONS
      // ------------------------------------------------------------
      if (input.itemType === 'MATERIAL') {
        const definitions = await prisma.vectraMaterialDefinition.findMany({
          orderBy: { name: 'asc' },
        })

        const stock = await prisma.vectraWarehouse.findMany({
          where: {
            locationId: locId ?? undefined,
            itemType: 'MATERIAL',
            assignedToId: null,
            status: 'AVAILABLE',
            orderAssignments: { none: {} },
          },
          select: {
            name: true,
            quantity: true,
            price: true,
            index: true,
            unit: true,
          },
        })

        const map = new Map<
          string,
          {
            name: string
            category: string
            quantity: number
            price: number
            itemType: WarehouseItemType
          }
        >()

        // Populate definitions
        for (const def of definitions) {
          map.set(def.name, {
            name: def.name,
            // For materials "category" shows supplier index code
            category: def.index ?? '—',
            quantity: 0,
            price: Number(def.price ?? 0),
            itemType: 'MATERIAL',
          })
        }

        // Merge stock
        for (const item of stock) {
          const row = map.get(item.name)
          if (!row) continue
          row.quantity += item.quantity
          if (item.price != null) row.price = Number(item.price)
          if (item.index) row.category = item.index
        }

        return Array.from(map.values())
      }

      // Should never happen
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unsupported item type.',
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
        locationId: z.string().optional(),
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
            ...(input.locationId ? { locationId: input.locationId } : {}),
          }
          break
        case 'technicians':
          whereClause = {
            ...baseWhere,
            assignedToId: { not: null },
            status: 'ASSIGNED',
            orderAssignments: { none: {} },
            ...(input.locationId ? { locationId: input.locationId } : {}),
          }
          break
        case 'orders':
          whereClause = {
            ...baseWhere,
            status: 'ASSIGNED_TO_ORDER',
            orderAssignments: { some: {} },
            ...(input.locationId ? { locationId: input.locationId } : {}),
          }
          break
        case 'returned':
          whereClause = {
            ...baseWhere,
            status: { in: ['RETURNED', 'RETURNED_TO_OPERATOR'] },
            ...(input.locationId ? { locationId: input.locationId } : {}),
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
              ...(input.locationId ? { locationId: input.locationId } : {}),
            }
          }
      }

      return prisma.vectraWarehouse.findMany({
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
              quantity: true,
              assignedOrderId: true,
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
      const item = await prisma.vectraWarehouse.findFirst({
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
      const user = ctx.user
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const targetId =
        input.technicianId === 'self' ? user.id : input.technicianId

      if (user.role === 'TECHNICIAN' && targetId !== user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      // ✅ Admin / Coordinator / Warehouseman can access any technician
      // Technician can only access their own stock

      return prisma.vectraWarehouse.findMany({
        where: {
          assignedToId: targetId,
          status: { in: ['AVAILABLE', 'ASSIGNED'] },
          ...(input.itemType ? { itemType: input.itemType } : {}),
          orderAssignments: { none: {} },
        },
        include: {
          materialDefinition: {
            select: { id: true, name: true, index: true, unit: true },
          },
          assignedTo: {
            include: {
              user: true,
            },
          },
          transferTo: {
            include: { user: true },
          },
          history: {
            select: {
              action: true,
              actionDate: true,
              quantity: true,
              assignedOrderId: true,
              performedBy: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, name: true } },
            },
            orderBy: { actionDate: 'asc' },
          },
          orderAssignments: { include: { order: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }),

  /** 🔍 Check serial number for device status + last action */
  checkDeviceBySerialNumber: loggedInEveryone
    .input(z.object({ serialNumber: z.string().min(3).optional() }))
    .query(async ({ input }) => {
      if (!input.serialNumber || input.serialNumber.trim().length < 3) {
        return null
      }

      const serial = input.serialNumber.trim()

      const item = await prisma.vectraWarehouse.findFirst({
        where: {
          serialNumber: {
            equals: serial,
            mode: 'insensitive',
          },
          itemType: WarehouseItemType.DEVICE,
        },
        include: {
          // Relacja do technika – zgodnie z modelem Warehouse
          assignedTo: { select: { id: true, name: true } },

          // Relacja do orderów przez OrderEquipment
          orderAssignments: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  createdAt: true,
                },
              },
            },
            // ⭐ Tu był błąd: trzeba sortować po polu relacji "order"
            // a nie po "createdAt" bezpośrednio na OrderEquipment
            orderBy: {
              order: {
                createdAt: 'desc',
              },
            },
            take: 1,
          },

          // Pełna historia magazynowa dla timeliny
          history: {
            orderBy: { actionDate: 'desc' },
            include: {
              performedBy: { select: { id: true, name: true } },
              assignedTo: { select: { id: true, name: true } },
              assignedOrder: {
                select: { id: true, orderNumber: true },
              },
              fromLocation: { select: { id: true, name: true } },
              toLocation: { select: { id: true, name: true } },
            },
          },

          // Lokalizacja zgodnie z modelem
          location: { select: { id: true, name: true } },
        },
      })

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Urządzenie nie istnieje',
        })
      }

      return {
        id: item.id,
        name: item.name,
        status: item.status,

        assignedTo: item.assignedTo,
        assignedOrder: item.orderAssignments[0]?.order ?? null,

        // Stara logika – zostawiamy, bo może być gdzieś używana
        lastAction: item.history[0]?.action ?? null,
        lastActionDate: item.history[0]?.actionDate ?? null,

        // Nowość: pełna historia dla timeline
        history: item.history.map((h) => ({
          id: h.id,
          action: h.action,
          actionDate: h.actionDate,
          notes: h.notes ?? null,
          quantity: h.quantity ?? null,
          performedBy: h.performedBy
            ? { id: h.performedBy.id, name: h.performedBy.name }
            : null,
          assignedTo: h.assignedTo
            ? { id: h.assignedTo.id, name: h.assignedTo.name }
            : null,
          assignedOrder: h.assignedOrder
            ? {
                id: h.assignedOrder.id,
                orderNumber: h.assignedOrder.orderNumber,
              }
            : null,
          fromLocation: h.fromLocation
            ? { id: h.fromLocation.id, name: h.fromLocation.name }
            : null,
          toLocation: h.toLocation
            ? { id: h.toLocation.id, name: h.toLocation.name }
            : null,
        })),

        location: item.location,
      }
    }),
  searchDevices: adminOrCoord
    .input(
      z.object({
        query: z.string().min(2),
        allowedCategories: z.nativeEnum(DeviceCategory).array().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const isTech = user.role === 'TECHNICIAN'

      const where: prisma.vectraWarehouseWhereInput = {
        itemType: 'DEVICE',
        serialNumber: { contains: input.query, mode: 'insensitive' },
        status: { in: ['AVAILABLE', 'ASSIGNED'] },
        ...(input.allowedCategories?.length
          ? { category: { in: input.allowedCategories } }
          : {}),
        ...(isTech
          ? { assignedToId: user.id }
          : {
              OR: [
                { assignedToId: null, status: 'AVAILABLE' },
                { assignedToId: user.id },
              ],
            }),
      }

      return ctx.prisma.vectraWarehouse.findMany({
        where,
        select: {
          id: true,
          name: true,
          serialNumber: true,
          category: true,
          assignedToId: true,
        },
        take: 10,
      })
    }),

  /** 🛠️  Devices/materials collected from clients (technician view) */
  getCollectedWithDetails: loggedInEveryone.query(({ ctx }) => {
    const techId = ctx.user?.id
    if (!techId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    return prisma.vectraWarehouse.findMany({
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
                id: true,
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
        return ctx.prisma.vectraWarehouseLocation.findMany({
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
      return ctx.prisma.vectraWarehouseLocation.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
    }

    if (user.role === 'WAREHOUSEMAN') {
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
        return await ctx.prisma.vectraWarehouseLocation.create({
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
        return await ctx.prisma.vectraWarehouseLocation.delete({
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
      ctx.prisma.vectraWarehouseLocation.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    ),

  /** Get technichian stock for return */
  getItemsForReturn: adminCoordOrWarehouse
    .input(
      z.object({
        locationId: z.string().optional(),
        technicianId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const locId = resolveLocationId(user, input)

      return prisma.vectraWarehouse.findMany({
        where: {
          OR: [
            { locationId: locId ?? undefined },
            { assignedToId: input.technicianId ?? undefined },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /** ⚙️ Check if given serials/MACs already exist in warehouse */
  checkExistingIdentifiers: adminCoordOrWarehouse
    .input(
      z.object({
        identifiers: z.array(z.string().min(3)),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const locId = resolveLocationId(user, input)

      // Find all existing devices by serialNumber (MACs are also stored there)
      const found = await prisma.vectraWarehouse.findMany({
        where: {
          serialNumber: {
            in: input.identifiers,
            mode: 'insensitive',
          },
          ...(locId ? { locationId: locId } : {}),
        },
        select: {
          serialNumber: true,
          name: true,
          status: true,
          assignedTo: { select: { id: true, name: true } },
        },
      })

      // Prepare normalized result maps
      const existing = new Set<string>()
      const details: Record<
        string,
        { name: string; status: string; assignedTo?: string }
      > = {}

      for (const item of found) {
        if (!item.serialNumber) continue
        const normId = item.serialNumber.toUpperCase()
        existing.add(normId)
        details[normId] = {
          name: item.name,
          status: item.status,
          assignedTo: item.assignedTo?.name,
        }
      }

      return {
        existing: Array.from(existing),
        details,
      }
    }),
  /** 🔍 Get virtual material deficits for a technician */
  getTechnicianDeficits: adminCoordOrWarehouse
    .input(z.object({ technicianId: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)

      // 👮 Technician can only view his own deficits
      if (user.role === 'TECHNICIAN' && user.id !== input.technicianId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const deficits = await prisma.technicianMaterialDeficit.findMany({
        where: { technicianId: input.technicianId },
        include: {
          materialDefinition: {
            select: { id: true, name: true, index: true, unit: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      return deficits.map((d) => ({
        materialDefinitionId: d.materialDefinitionId,
        quantity: d.quantity,
        material: {
          id: d.materialDefinition.id,
          name: d.materialDefinition.name,
          index: d.materialDefinition.index,
          unit: d.materialDefinition.unit,
        },
      }))
    }),
})
