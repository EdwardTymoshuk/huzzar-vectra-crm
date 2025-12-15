import { adminCoordOrWarehouse } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addWarehouseHistory } from '../../_helpers/addWarehouseHistory'
import { getUserOrThrow } from '../../_helpers/getUserOrThrow'

/**
 * Resolves the source location for a warehouseman or validates explicit input.
 * Admins and coordinators must always specify it explicitly.
 */
function resolveSingleLocation(
  user: { role: string; locations: { id: string }[] },
  explicitId?: string
): string {
  if (explicitId) return explicitId

  if (user.role === 'ADMIN' || user.role === 'COORDINATOR') {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Admin/koordynator musi wskazać magazyn źródłowy',
    })
  }
  if (user.role === 'WAREHOUSEMAN') {
    if (!user.locations?.length) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Brak lokalizacji' })
    }
    if (user.locations.length > 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Wybierz magazyn źródłowy (wiele lokalizacji)',
      })
    }
    return user.locations[0].id
  }
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Technicy nie robią transferów między oddziałami',
  })
}

/* =========================================================================================
 * LOCATION TRANSFER ROUTER
 * Handles warehouse-to-warehouse transfers (materials and devices).
 * =======================================================================================*/
export const locationTransferRouter = router({
  /* ---------------------------------------------------------------------------
   * CREATE TRANSFER (source warehouse)
   * ---------------------------------------------------------------------------
   * • Creates a new LocationTransfer request.
   * • Can contain both devices and materials.
   * • Captures snapshots of transferred items (name, SN, category).
   */
  createTransfer: adminCoordOrWarehouse
    .input(
      z.object({
        fromLocationId: z.string().optional(),
        toLocationId: z.string(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            itemType: z.enum(['DEVICE', 'MATERIAL']),
            warehouseItemId: z.string().optional(),
            materialDefinitionId: z.string().optional(),
            quantity: z.number().int().positive().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const fromLocationId = resolveSingleLocation(user, input.fromLocationId)

      return await ctx.prisma.$transaction(async (tx) => {
        const transfer = await tx.locationTransfer.create({
          data: {
            fromLocationId,
            toLocationId: input.toLocationId,
            notes: input.notes,
            requestedById: user.id,
            status: 'REQUESTED',
          },
        })

        for (const item of input.items) {
          if (item.itemType === 'DEVICE') {
            if (!item.warehouseItemId)
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Missing warehouseItemId for DEVICE transfer.',
              })

            const device = await tx.vectraWarehouse.findUniqueOrThrow({
              where: { id: item.warehouseItemId },
              select: {
                name: true,
                serialNumber: true,
                category: true,
              },
            })

            await tx.locationTransferLine.create({
              data: {
                transferId: transfer.id,
                itemType: 'DEVICE',
                warehouseItemId: item.warehouseItemId,
                nameSnapshot: device.name,
                indexSnapshot: device.serialNumber,
                category: device.category,
              },
            })

            await tx.vectraWarehouse.update({
              where: { id: item.warehouseItemId },
              data: { status: 'TRANSFER' },
            })
          } else {
            if (!item.materialDefinitionId || !item.quantity)
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                  'Missing materialDefinitionId or quantity for MATERIAL.',
              })

            const stock = await tx.vectraWarehouse.findFirstOrThrow({
              where: {
                materialDefinitionId: item.materialDefinitionId,
                locationId: fromLocationId,
                itemType: 'MATERIAL',
              },
            })

            if (stock.quantity < item.quantity)
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Insufficient material stock.',
              })

            await tx.vectraWarehouse.update({
              where: { id: stock.id },
              data: { quantity: { decrement: item.quantity } },
            })

            await tx.locationTransferLine.create({
              data: {
                transferId: transfer.id,
                itemType: 'MATERIAL',
                materialDefinitionId: item.materialDefinitionId,
                quantity: item.quantity,
                unit: stock.unit,
                nameSnapshot: stock.name,
                indexSnapshot: stock.index,
              },
            })
          }
        }

        return { id: transfer.id }
      })
    }),

  /* ---------------------------------------------------------------------------
   * GET INCOMING TRANSFERS (destination warehouse)
   * ---------------------------------------------------------------------------
   * • Returns all incoming transfer requests for the current warehouse.
   * • Admin can optionally filter by locationId (URL param `?loc=`).
   */
  getIncomingLocationTransfers: adminCoordOrWarehouse
    .input(z.object({ locationId: z.string().optional() }))
    .query(({ ctx, input }) => {
      const user = getUserOrThrow(ctx)
      const isAdmin = user.role === 'ADMIN'
      const locIds = user.locations.map((l) => l.id)
      const filterLocs = input.locationId
        ? [input.locationId]
        : isAdmin
        ? undefined
        : locIds

      return ctx.prisma.vectraLocationTransfer.findMany({
        where: {
          status: 'REQUESTED',
          ...(filterLocs ? { toLocationId: { in: filterLocs } } : {}),
        },
        include: {
          lines: {
            select: {
              id: true,
              itemType: true,
              quantity: true,
              unit: true,
              materialDefinitionId: true,
              warehouseItemId: true,
              transferId: true,
              nameSnapshot: true,
              indexSnapshot: true,
              category: true,
            },
          },
          fromLocation: true,
          toLocation: true,
          requestedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /* ---------------------------------------------------------------------------
   * GET OUTGOING TRANSFERS (source warehouse)
   * ---------------------------------------------------------------------------
   * • Returns all outgoing transfers initiated from the current warehouse.
   * • Admin can optionally filter by locationId (URL param `?loc=`).
   */
  getOutgoingLocationTransfers: adminCoordOrWarehouse
    .input(z.object({ locationId: z.string().optional() }))
    .query(({ ctx, input }) => {
      const user = getUserOrThrow(ctx)
      const isAdmin = user.role === 'ADMIN'
      const locIds = user.locations.map((l) => l.id)
      const filterLocs = input.locationId
        ? [input.locationId]
        : isAdmin
        ? undefined
        : locIds

      return ctx.prisma.vectraLocationTransfer.findMany({
        where: {
          status: 'REQUESTED',
          ...(filterLocs ? { fromLocationId: { in: filterLocs } } : {}),
        },
        include: {
          lines: {
            select: {
              id: true,
              itemType: true,
              quantity: true,
              unit: true,
              materialDefinitionId: true,
              warehouseItemId: true,
              transferId: true,
              nameSnapshot: true,
              indexSnapshot: true,
              category: true,
            },
          },
          toLocation: true,
          fromLocation: true,
          confirmedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  /* ---------------------------------------------------------------------------
   * CONFIRM TRANSFER (destination warehouse)
   * ---------------------------------------------------------------------------
   * • Marks the transfer as RECEIVED.
   * • Moves all items to the destination location and logs history.
   */
  confirmLocationTransfer: adminCoordOrWarehouse
    .input(
      z.object({
        transferId: z.string(),
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const userLocs = user.locations.map((l) => l.id)
      const allowedLocs = input.locationId
        ? [...userLocs, input.locationId]
        : userLocs

      await ctx.prisma.$transaction(async (tx) => {
        const transfer = await tx.locationTransfer.findUniqueOrThrow({
          where: { id: input.transferId },
          include: { lines: true },
        })

        // ✅ Only destination warehouse (or admin acting for one) can confirm
        if (!allowedLocs.includes(transfer.toLocationId))
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This is not your destination warehouse.',
          })

        if (transfer.status !== 'REQUESTED')
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Transfer is not in REQUESTED state.',
          })

        // --- Process all transferred items ---
        for (const line of transfer.lines) {
          /* ------------------ DEVICE ------------------ */
          if (line.itemType === 'DEVICE' && line.warehouseItemId) {
            await tx.vectraWarehouse.update({
              where: { id: line.warehouseItemId },
              data: {
                locationId: transfer.toLocationId,
                status: 'AVAILABLE',
              },
            })

            await addWarehouseHistory({
              prisma: tx,
              itemId: line.warehouseItemId,
              userId: user.id,
              action: 'TRANSFER',
              qty: 1,
              fromLocationId: transfer.fromLocationId,
              toLocationId: transfer.toLocationId,
              transferId: transfer.id,
            })
          }

          /* ------------------ MATERIAL ------------------ */
          if (
            line.itemType === 'MATERIAL' &&
            line.materialDefinitionId &&
            line.quantity
          ) {
            const existing = await tx.vectraWarehouse.findFirst({
              where: {
                locationId: transfer.toLocationId,
                materialDefinitionId: line.materialDefinitionId,
                itemType: 'MATERIAL',
              },
            })

            if (existing) {
              await tx.vectraWarehouse.update({
                where: { id: existing.id },
                data: { quantity: { increment: line.quantity } },
              })

              await addWarehouseHistory({
                prisma: tx,
                itemId: existing.id,
                userId: user.id,
                action: 'TRANSFER',
                qty: line.quantity,
                fromLocationId: transfer.fromLocationId,
                toLocationId: transfer.toLocationId,
                transferId: transfer.id,
              })
            } else {
              const newRow = await tx.vectraWarehouse.create({
                data: {
                  itemType: 'MATERIAL',
                  name: line.nameSnapshot ?? 'Material',
                  index: line.indexSnapshot ?? null,
                  quantity: line.quantity,
                  unit: line.unit ?? 'PIECE',
                  price: 0,
                  status: 'AVAILABLE',
                  locationId: transfer.toLocationId,
                  materialDefinitionId: line.materialDefinitionId,
                },
              })

              await addWarehouseHistory({
                prisma: tx,
                itemId: newRow.id,
                userId: user.id,
                action: 'TRANSFER',
                qty: line.quantity,
                fromLocationId: transfer.fromLocationId,
                toLocationId: transfer.toLocationId,
                transferId: transfer.id,
              })
            }
          }
        }

        // ✅ Mark transfer as confirmed
        await tx.locationTransfer.update({
          where: { id: transfer.id },
          data: {
            status: 'RECEIVED',
            confirmedById: user.id,
            confirmedAt: new Date(),
          },
        })
      })

      return { ok: true }
    }),

  /* ---------------------------------------------------------------------------
   * REJECT TRANSFER (destination warehouse)
   * ---------------------------------------------------------------------------
   * • Restores all items back to the source warehouse.
   * • Marks transfer as REJECTED.
   */
  rejectLocationTransfer: adminCoordOrWarehouse
    .input(
      z.object({
        transferId: z.string(),
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const userLocs = user.locations.map((l) => l.id)
      const allowedLocs = input.locationId
        ? [...userLocs, input.locationId]
        : userLocs

      await ctx.prisma.$transaction(async (tx) => {
        const transfer = await tx.locationTransfer.findUniqueOrThrow({
          where: { id: input.transferId },
          include: { lines: true },
        })

        // ✅ Only destination warehouse (or admin acting for one) can reject
        if (!allowedLocs.includes(transfer.toLocationId))
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This is not your destination warehouse.',
          })

        // --- Restore all transferred items to source location ---
        for (const line of transfer.lines) {
          // DEVICE rollback
          if (line.itemType === 'DEVICE' && line.warehouseItemId) {
            await tx.vectraWarehouse.update({
              where: { id: line.warehouseItemId },
              data: {
                status: 'AVAILABLE',
                locationId: transfer.fromLocationId,
              },
            })
          }

          // MATERIAL rollback
          if (
            line.itemType === 'MATERIAL' &&
            line.materialDefinitionId &&
            line.quantity
          ) {
            const existing = await tx.vectraWarehouse.findFirst({
              where: {
                locationId: transfer.fromLocationId,
                materialDefinitionId: line.materialDefinitionId,
                itemType: 'MATERIAL',
              },
            })

            if (existing) {
              await tx.vectraWarehouse.update({
                where: { id: existing.id },
                data: { quantity: { increment: line.quantity } },
              })
            } else {
              await tx.vectraWarehouse.create({
                data: {
                  itemType: 'MATERIAL',
                  name: line.nameSnapshot ?? 'Material',
                  index: line.indexSnapshot,
                  quantity: line.quantity,
                  unit: line.unit ?? 'PIECE',
                  price: 0,
                  status: 'AVAILABLE',
                  locationId: transfer.fromLocationId,
                  materialDefinitionId: line.materialDefinitionId,
                },
              })
            }
          }
        }

        // ✅ Update transfer status
        await tx.locationTransfer.update({
          where: { id: transfer.id },
          data: {
            status: 'REJECTED',
            confirmedById: user.id,
            confirmedAt: new Date(),
          },
        })
      })

      return { ok: true }
    }),

  /* ---------------------------------------------------------------------------
   * CANCEL TRANSFER (source warehouse)
   * ---------------------------------------------------------------------------
   * • Can be performed only by the warehouse that initiated the transfer.
   * • Restores all items to the source location.
   * • Admins can cancel using `locationId` param if not explicitly assigned.
   */
  cancelLocationTransfer: adminCoordOrWarehouse
    .input(
      z.object({ transferId: z.string(), locationId: z.string().optional() })
    )
    .mutation(async ({ input, ctx }) => {
      const user = getUserOrThrow(ctx)
      const userLocs = user.locations.map((l) => l.id)
      const allowedLocs = input.locationId
        ? [...userLocs, input.locationId]
        : userLocs

      await ctx.prisma.$transaction(async (tx) => {
        const transfer = await tx.locationTransfer.findUniqueOrThrow({
          where: { id: input.transferId },
          include: { lines: true },
        })

        if (!allowedLocs.includes(transfer.fromLocationId))
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This is not your source warehouse.',
          })

        for (const line of transfer.lines) {
          if (line.itemType === 'DEVICE' && line.warehouseItemId) {
            await tx.vectraWarehouse.update({
              where: { id: line.warehouseItemId },
              data: {
                status: 'AVAILABLE',
                locationId: transfer.fromLocationId,
              },
            })
          }

          if (
            line.itemType === 'MATERIAL' &&
            line.materialDefinitionId &&
            line.quantity
          ) {
            const existing = await tx.vectraWarehouse.findFirst({
              where: {
                locationId: transfer.fromLocationId,
                materialDefinitionId: line.materialDefinitionId,
                itemType: 'MATERIAL',
              },
            })

            if (existing) {
              await tx.vectraWarehouse.update({
                where: { id: existing.id },
                data: { quantity: { increment: line.quantity } },
              })
            } else {
              await tx.vectraWarehouse.create({
                data: {
                  itemType: 'MATERIAL',
                  name: line.nameSnapshot ?? 'Material',
                  index: line.indexSnapshot,
                  quantity: line.quantity,
                  unit: line.unit ?? 'PIECE',
                  price: 0,
                  status: 'AVAILABLE',
                  locationId: transfer.fromLocationId,
                  materialDefinitionId: line.materialDefinitionId,
                },
              })
            }
          }
        }

        await tx.locationTransferLine.deleteMany({
          where: { transferId: transfer.id },
        })

        await tx.locationTransfer.update({
          where: { id: transfer.id },
          data: {
            status: 'CANCELED',
            confirmedById: user.id,
            confirmedAt: new Date(),
          },
        })
      })

      return { ok: true }
    }),
})
