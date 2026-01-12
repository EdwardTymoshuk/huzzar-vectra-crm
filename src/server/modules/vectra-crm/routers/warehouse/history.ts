// server/routers/warehouse/history.ts
import { adminCoordOrWarehouse, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { Prisma, VectraWarehouseAction } from '@prisma/client'
import { z } from 'zod'
import { mapWarehouseHistoryToRelationsVM } from '../../helpers/mappers/mapWarehouseHistoryToRelationsVM'
import { mapWarehouseHistoryToVM } from '../../helpers/mappers/mapWarehouseHistoryToVM'

/**
 * historyRouter – handles retrieval of warehouse-related history logs.
 * Includes per-item, per-material, and global paginated views.
 */
export const historyRouter = router({
  /** 📜 Get device history by item ID
   *  • scope = 'all'        – full log (admin view)
   *  • scope = 'technician' – only entries where the logged-in tech
   *                           was performer OR recipient
   */
  getHistory: loggedInEveryone
    .input(
      z.object({
        warehouseItemId: z.string(),
        scope: z.enum(['all', 'technician']).default('all'),
      })
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.prisma.vectraWarehouseHistory.findMany({
        where: {
          warehouseItemId: input.warehouseItemId,
        },
        orderBy: {
          actionDate: 'desc',
        },
        include: {
          performedBy: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignedTo: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignedOrder: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      })

      return mapWarehouseHistoryToVM(rows)
    }),

  /** 📜 Get material history by item name (grouped view) */
  getHistoryByName: loggedInEveryone
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const rows = await ctx.prisma.vectraWarehouseHistory.findMany({
        where: {
          warehouseItem: {
            name: input.name,
          },
        },
        orderBy: {
          actionDate: 'desc',
        },
        include: {
          performedBy: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignedTo: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assignedOrder: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      })

      return mapWarehouseHistoryToVM(rows)
    }),

  /** 📜 Full warehouse history – filterable & paginated */
  getWarehouseHistory: adminCoordOrWarehouse
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(30),
        actions: z.array(z.nativeEnum(VectraWarehouseAction)).optional(),
        performerId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        locationId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const {
        page,
        limit,
        actions,
        performerId,
        startDate,
        endDate,
        locationId,
      } = input

      // Base WHERE conditions
      const whereBase: Prisma.VectraWarehouseHistoryWhereInput = {
        action: actions?.length
          ? {
              in: actions.filter(
                (a) => !['ISSUED_TO_CLIENT', 'ASSIGNED_TO_ORDER'].includes(a)
              ) as VectraWarehouseAction[],
            }
          : {
              notIn: [
                VectraWarehouseAction.ISSUED_TO_CLIENT,
                VectraWarehouseAction.ASSIGNED_TO_ORDER,
              ],
            },
        NOT: {
          AND: [
            { action: VectraWarehouseAction.COLLECTED_FROM_CLIENT },
            { warehouseItem: { status: 'COLLECTED_FROM_CLIENT' } },
          ],
        },

        ...(performerId ? { performedById: performerId } : {}),
        ...(startDate || endDate
          ? {
              actionDate: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
        ...(locationId
          ? {
              OR: [
                { warehouseItem: { locationId } },
                { fromLocationId: locationId },
                { toLocationId: locationId },
              ],
            }
          : {}),
      }

      /**
       * Step 1️⃣ – Group unique operations (for pagination)
       * Each group is defined by (performedById, action, notes, rounded actionDate)
       */
      const rawGroups = await prisma.vectraWarehouseHistory.findMany({
        where: whereBase,
        select: {
          performedById: true,
          action: true,
          notes: true,
          actionDate: true,
        },
        orderBy: { actionDate: 'desc' },
      })

      if (!rawGroups.length) {
        return { data: [], page, totalPages: 1 }
      }

      // Normalize to 5s buckets (like frontend)
      const normalizeToBucket = (date: Date): string =>
        new Date(Math.floor(date.getTime() / 5000) * 5000).toISOString()

      // Build unique group keys
      const uniqueKeys = Array.from(
        new Set(
          rawGroups.map(
            (r) =>
              `${normalizeToBucket(r.actionDate)}__${r.performedById}__${
                r.action
              }__${r.notes || ''}`
          )
        )
      )

      // Pagination based on groups count
      const totalGroups = uniqueKeys.length
      const totalPages = Math.ceil(totalGroups / limit)
      const start = (page - 1) * limit
      const paginatedKeys = uniqueKeys.slice(start, start + limit)

      /**
       * Step 2️⃣ – Fetch full records for paginated groups
       */
      const data = await Promise.all(
        paginatedKeys.map(async (key) => {
          const [isoDate, performerId, action, notes] = key.split('__')
          const date = new Date(isoDate)

          const entries = await prisma.vectraWarehouseHistory.findMany({
            where: {
              performedById: performerId,
              action: action as VectraWarehouseAction,
              notes: notes || undefined,
              actionDate: {
                gte: new Date(date.getTime() - 5000),
                lte: new Date(date.getTime() + 5000),
              },
              ...whereBase,
            },
            include: {
              warehouseItem: { include: { location: true } },
              performedBy: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              assignedTo: {
                include: {
                  user: true,
                },
              },
              assignedOrder: true,
              fromLocation: true,
              toLocation: true,
            },
            orderBy: { actionDate: 'desc' },
          })

          return entries
        })
      )

      const flatRows = data.flat()

      return {
        data: mapWarehouseHistoryToRelationsVM(flatRows),
        page,
        totalPages,
      }
    }),
})
