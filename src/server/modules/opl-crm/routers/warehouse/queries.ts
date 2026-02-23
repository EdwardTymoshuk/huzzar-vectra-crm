import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { requireOplModule } from '@/server/middleware/oplMiddleware'
import {
  adminCoordOrWarehouse,
  adminOrCoord,
  loggedInEveryone,
} from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import {
  OplTechnicianStockItem,
  OplWarehouseDeviceDefinitionVM,
  OplWarehouseMaterialDefinitionVM,
} from '@/types/opl-crm'
import { prisma } from '@/utils/prisma'
import {
  OplDeviceCategory,
  OplMaterialUnit,
  OplWarehouseItemType,
  OplWarehouseStatus,
  Prisma,
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { mapWarehouseDeviceToBasic } from '../../helpers/mappers/mapWarehouseDevice'
import { oplUserBasicSelect, oplUserSlimSelect } from '../../helpers/selects'
import { getOplUserOrThrow } from '../../services/oplUserAccess'
import { resolveLocationId } from '../../services/resolveLocationId'

/** Modes for the ItemTabs views */
const Modes = ['warehouse', 'technicians', 'orders', 'returned'] as const

export const queriesRouter = router({
  /** 📦 Get all warehouse items (ordered by creation date) */
  getAll: loggedInEveryone
    .use(requireOplModule)
    .input(
      z
        .object({
          locationId: z.string().optional(),
          itemType: z.nativeEnum(OplWarehouseItemType).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const coreUser = getCoreUserOrThrow(ctx)
      const oplUser = await getOplUserOrThrow(
        ctx.prisma,
        coreUser.id,
        coreUser.role
      )
      const activeLocationId = resolveLocationId(oplUser, input?.locationId)

      return prisma.oplWarehouse.findMany({
        where: {
          locationId: activeLocationId,
          ...(input?.itemType ? { itemType: input.itemType } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  getDefinitionsWithStock: loggedInEveryone
    .use(requireOplModule)
    .input(
      z.object({
        itemType: z.nativeEnum(OplWarehouseItemType),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const coreUser = getCoreUserOrThrow(ctx)
      const oplUser = await getOplUserOrThrow(
        ctx.prisma,
        coreUser.id,
        coreUser.role
      )
      const activeLocationId = resolveLocationId(oplUser, input?.locationId)

      // ------------------------------------------------------------
      // DEVICE DEFINITIONS
      // ------------------------------------------------------------
      if (input.itemType === 'DEVICE') {
        // 1) Load all device definitions
        const definitions = await prisma.oplDeviceDefinition.findMany({
          orderBy: { name: 'asc' },
        })

        // 2) Load current warehouse stock (only names/prices/category)
        const stock = await prisma.oplWarehouse.findMany({
          where: {
            locationId: activeLocationId ?? undefined,
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
            category: OplDeviceCategory
            quantity: number
            price: number
            itemType: OplWarehouseItemType
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

        return Array.from(map.values()).map(
          (row): OplWarehouseDeviceDefinitionVM => ({
            itemType: 'DEVICE',
            name: row.name,
            category: row.category,
            quantity: row.quantity,
            price: row.price,
          })
        )
      }

      // ------------------------------------------------------------
      // MATERIAL DEFINITIONS
      // ------------------------------------------------------------
      if (input.itemType === 'MATERIAL') {
        const definitions = await prisma.oplMaterialDefinition.findMany({
          orderBy: { name: 'asc' },
        })

        const stock = await prisma.oplWarehouse.findMany({
          where: {
            locationId: activeLocationId ?? undefined,
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
            index: string | null
            unit: OplMaterialUnit
            quantity: number
            price: number
            itemType: 'MATERIAL'
          }
        >()

        // Populate definitions
        for (const def of definitions) {
          map.set(def.name, {
            name: def.name,
            index: def.index ?? null,
            unit: def.unit,
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
          if (item.index) row.index = item.index
          if (item.unit) row.unit = item.unit
        }

        return Array.from(map.values()).map(
          (row): OplWarehouseMaterialDefinitionVM => ({
            itemType: 'MATERIAL',
            name: row.name,
            index: row.index,
            unit: row.unit ?? 'PIECE',
            quantity: row.quantity,
            price: row.price,
          })
        )
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

      const items = await prisma.oplWarehouse.findMany({
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
          assignedTo: {
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },

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
              performedBy: { select: oplUserSlimSelect },
              assignedTo: {
                select: oplUserSlimSelect,
              },
            },
            orderBy: { actionDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      })

      return items.map((item) => ({
        ...item,
        category: item.category ?? undefined,

        assignedTo: item.assignedTo
          ? {
              id: item.assignedTo.user.id,
              name: item.assignedTo.user.name,
            }
          : null,

        history: item.history.map((h) => ({
          ...h,

          performedBy: h.performedBy
            ? {
                id: h.performedBy.user.id,
                name: h.performedBy.user.name,
              }
            : null,

          assignedTo: h.assignedTo
            ? {
                id: h.assignedTo.user.id,
                name: h.assignedTo.user.name,
              }
            : null,
        })),
      }))
    }),

  /** 🔍 Get warehouse item by serial number (DEVICE only, UI-safe) */
  getBySerialNumber: loggedInEveryone
    .input(z.object({ serial: z.string().min(1) }))
    .query(async ({ input }) => {
      const item = await prisma.oplWarehouse.findFirst({
        where: {
          serialNumber: {
            equals: input.serial,
            mode: 'insensitive',
          },
          itemType: 'DEVICE',
        },
        select: {
          id: true,
          name: true,
          serialNumber: true,
          category: true,
          status: true,
          deviceDefinitionId: true,
        },
      })

      if (!item) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Nie znaleziono urządzenia o podanym numerze seryjnym',
        })
      }

      return mapWarehouseDeviceToBasic(item)
    }),

  /** 🧰 Get all items currently assigned to a technician */
  getTechnicianStock: loggedInEveryone
    .input(
      z.object({
        technicianId: z.string(),
        itemType: z.nativeEnum(OplWarehouseItemType).optional(),
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

      const rows = await prisma.oplWarehouse.findMany({
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
          assignedTo: { include: { user: true } },
          transferTo: { include: { user: true } },
          history: {
            select: {
              action: true,
              actionDate: true,
              quantity: true,
              assignedOrderId: true,
              performedBy: { select: oplUserBasicSelect },
              assignedTo: { select: oplUserBasicSelect },
            },
            orderBy: { actionDate: 'asc' },
          },
          orderAssignments: { include: { order: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })

      /**
       * Map Prisma rows to UI-safe OplTechnicianStockItem VM.
       */
      return rows.map<OplTechnicianStockItem>((item) => {
        if (item.itemType === 'MATERIAL') {
          return {
            id: item.id,
            name: item.name,
            itemType: 'MATERIAL',

            quantity: item.quantity ?? 0,
            unit: item.materialDefinition?.unit ?? 'PIECE',
            materialDefinitionId: item.materialDefinition?.id ?? '',
            status: item.status,

            price: item.price,

            category: null,
            serialNumber: null,

            transferPending: item.transferPending,
            updatedAt: item.updatedAt,
          }
        }
        if (!item.category) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Warehouse device ${item.id} has no category`,
          })
        }

        return {
          id: item.id,
          deviceDefinitionId: item.deviceDefinitionId ?? null,
          name: item.name,
          itemType: 'DEVICE',

          category: item.category,
          serialNumber: item.serialNumber ?? null,
          status: item.status,

          price: item.price,

          quantity: null,
          unit: null,
          materialDefinitionId: null,

          transferPending: item.transferPending,
          updatedAt: item.updatedAt,
        }
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

      const item = await prisma.oplWarehouse.findFirst({
        where: {
          serialNumber: {
            equals: serial,
            mode: 'insensitive',
          },
          itemType: OplWarehouseItemType.DEVICE,
        },
        include: {
          // Relacja do technika – zgodnie z modelem Warehouse
          assignedTo: { select: oplUserBasicSelect },

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
              performedBy: { select: oplUserBasicSelect },
              assignedTo: { select: oplUserBasicSelect },
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
            ? { id: h.performedBy.user.id, name: h.performedBy.user.name }
            : null,
          assignedTo: h.assignedTo
            ? { id: h.assignedTo.user.id, name: h.assignedTo.user.name }
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
        allowedCategories: z.nativeEnum(OplDeviceCategory).array().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const isTech = user.role === 'TECHNICIAN'

      const where: Prisma.OplWarehouseWhereInput = {
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

      return ctx.prisma.oplWarehouse.findMany({
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

    return prisma.oplWarehouse.findMany({
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

  /** Get technichian stock for return */
  getItemsForReturn: adminCoordOrWarehouse
    .input(
      z.object({
        locationId: z.string().optional(),
        technicianId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const coreUser = getCoreUserOrThrow(ctx)
      const oplUser = await getOplUserOrThrow(
        ctx.prisma,
        coreUser.id,
        coreUser.role
      )

      const activeLocationId = resolveLocationId(oplUser, input?.locationId)

      return prisma.oplWarehouse.findMany({
        where: {
          OR: [
            { locationId: activeLocationId ?? undefined },
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
      const coreUser = getCoreUserOrThrow(ctx)
      const oplUser = await getOplUserOrThrow(
        ctx.prisma,
        coreUser.id,
        coreUser.role
      )

      const activeLocationId = resolveLocationId(oplUser, input?.locationId)

      // Find all existing devices by serialNumber (MACs are also stored there)
      const found = await prisma.oplWarehouse.findMany({
        where: {
          serialNumber: {
            in: input.identifiers,
            mode: 'insensitive',
          },
          ...(activeLocationId ? { locationId: activeLocationId } : {}),
        },
        select: {
          serialNumber: true,
          name: true,
          status: true,
          assignedTo: { select: oplUserBasicSelect },
        },
      })

      // Prepare normalized result maps
      const existing = new Set<string>()
      const details: Record<
        string,
        { name: string; status: OplWarehouseStatus; assignedTo?: string }
      > = {}

      for (const item of found) {
        if (!item.serialNumber) continue
        const normId = item.serialNumber.toUpperCase()
        existing.add(normId)
        details[normId] = {
          name: item.name,
          status: item.status,
          assignedTo: item.assignedTo?.user.name,
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
      const user = getCoreUserOrThrow(ctx)

      // 👮 Technician can only view his own deficits
      if (user.role === 'TECHNICIAN' && user.id !== input.technicianId) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }

      const deficits = await prisma.oplTechnicianMaterialDeficit.findMany({
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

  /** 🔍 Global material deficits summary (sum by material across technicians) */
  getMaterialDeficitsSummary: adminCoordOrWarehouse.query(async () => {
    const rows = await prisma.oplTechnicianMaterialDeficit.groupBy({
      by: ['materialDefinitionId'],
      _sum: { quantity: true },
    })
    const ids = rows.map((r) => r.materialDefinitionId)
    const defs =
      ids.length > 0
        ? await prisma.oplMaterialDefinition.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true },
          })
        : []
    const nameById = new Map(defs.map((d) => [d.id, d.name]))

    return rows.map((r) => ({
      materialDefinitionId: r.materialDefinitionId,
      materialName: nameById.get(r.materialDefinitionId) ?? '',
      quantity: r._sum.quantity ?? 0,
    }))
  }),
})
