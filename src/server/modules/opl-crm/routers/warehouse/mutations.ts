// server/routers/warehouse/mutations.ts
import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { adminCoordOrWarehouse, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { prisma } from '@/utils/prisma'
import { OplDeviceCategory, OplWarehouseItemType } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { addWarehouseHistory } from '../../helpers/addWarehouseHistory'
import { getOplUserOrThrow } from '../../services/oplUserAccess'
import { resolveLocationId } from '../../services/resolveLocationId'

export const mutationsRouter = router({
  /** 📥 Add new items to warehouse */
  addItems: adminCoordOrWarehouse
    .input(
      z.object({
        items: z.array(
          z.object({
            type: z.nativeEnum(OplWarehouseItemType),
            name: z.string(),
            category: z.nativeEnum(OplDeviceCategory).optional(),
            serialNumber: z.string().optional(),
            quantity: z.number().optional(),
          })
        ),
        notes: z.string().optional(),
        locationId: z.string().optional(), // manual location selection
      })
    )
    .mutation(async ({ input, ctx }) => {
      const coreUser = getCoreUserOrThrow(ctx)

      const oplUser = await getOplUserOrThrow(
        ctx.prisma,
        coreUser.id,
        coreUser.role
      )

      const activeLocationId = resolveLocationId(oplUser, input.locationId)

      const userId = oplUser.userId

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          const def = await prisma.oplDeviceDefinition.findFirst({
            where: { name: item.name, category: item.category ?? 'OTHER' },
          })
          if (!def || def.price === null) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak definicji urządzenia lub ceny dla ${item.name}`,
            })
          }

          const created = await prisma.oplWarehouse.create({
            data: {
              itemType: 'DEVICE',
              name: item.name,
              category: item.category,
              serialNumber: item.serialNumber?.trim().toUpperCase(),
              quantity: 1,
              price: def.price,
              warningAlert: def.warningAlert,
              alarmAlert: def.alarmAlert,
              status: 'AVAILABLE',
              locationId: activeLocationId,
            },
          })

          await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: created.id,
              action: 'RECEIVED',
              performedById: userId,
              notes: input.notes || undefined,
              toLocationId: activeLocationId,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const def = await prisma.oplMaterialDefinition.findFirst({
            where: { name: item.name },
          })
          if (!def || def.price === null) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak definicji materiału lub ceny dla ${item.name}`,
            })
          }

          const created = await prisma.oplWarehouse.create({
            data: {
              itemType: 'MATERIAL',
              name: item.name,
              quantity: item.quantity ?? 1,
              unit: def.unit,
              index: def.index,
              price: def.price,
              warningAlert: def.warningAlert,
              alarmAlert: def.alarmAlert,
              status: 'AVAILABLE',
              materialDefinitionId: def.id,
              locationId: activeLocationId,
            },
          })
          await addWarehouseHistory({
            prisma,
            itemId: created.id,
            userId,
            action: 'RECEIVED',
            qty: item.quantity ?? 1,
            notes: input.notes,
            toLocationId: activeLocationId,
          })
        }
      }
      return { success: true }
    }),

  /** 📤 Issue devices and materials to technician */
  issueItems: adminCoordOrWarehouse
    .input(
      z.object({
        assignedToId: z.string(),
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          await prisma.oplWarehouse.update({
            where: { id: item.id },
            data: {
              status: 'ASSIGNED',
              assignedToId: input.assignedToId,
            },
          })
          await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'ISSUED',
              performedById: userId,
              notes: input.notes,
              assignedToId: input.assignedToId,
            },
          })
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.oplWarehouse.findUnique({
            where: { id: item.id },
          })
          if (!original) throw new TRPCError({ code: 'NOT_FOUND' })

          if ((original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Brak wystarczającej ilości materiału (${original.name})`,
            })
          }

          // 1. Decrement main warehouse physical stock
          await prisma.oplWarehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })

          // 2. Check if technician has a virtual deficit for this material
          const deficit = await prisma.oplTechnicianMaterialDeficit.findUnique({
            where: {
              technicianId_materialDefinitionId: {
                technicianId: input.assignedToId,
                materialDefinitionId: original.materialDefinitionId!,
              },
            },
          })

          const deficitQty = deficit?.quantity ?? 0
          const usedToCoverDeficit = Math.min(deficitQty, item.quantity)
          const remainingToAddToStock = item.quantity - usedToCoverDeficit

          // 3. Reduce or clear the deficit
          if (usedToCoverDeficit > 0) {
            if (deficitQty - usedToCoverDeficit > 0) {
              await prisma.oplTechnicianMaterialDeficit.update({
                where: { id: deficit!.id },
                data: { quantity: deficitQty - usedToCoverDeficit },
              })
            } else {
              await prisma.oplTechnicianMaterialDeficit.delete({
                where: { id: deficit!.id },
              })
            }
          }

          // 4. Add only the remaining quantity to technician stock
          if (remainingToAddToStock > 0) {
            const existingTechMaterial = await prisma.oplWarehouse.findFirst({
              where: {
                itemType: 'MATERIAL',
                assignedToId: input.assignedToId,
                materialDefinitionId: original.materialDefinitionId,
                locationId: null,
              },
            })

            if (existingTechMaterial) {
              await prisma.oplWarehouse.update({
                where: { id: existingTechMaterial.id },
                data: {
                  quantity: { increment: remainingToAddToStock },
                  status: 'ASSIGNED',
                },
              })
            } else {
              await prisma.oplWarehouse.create({
                data: {
                  itemType: 'MATERIAL',
                  name: original.name,
                  quantity: remainingToAddToStock,
                  unit: original.unit,
                  index: original.index,
                  price: original.price,
                  materialDefinitionId: original.materialDefinitionId,
                  assignedToId: input.assignedToId,
                  status: 'ASSIGNED',
                  locationId: null,
                },
              })
            }
          }

          // 5. History entry (we log the **full** issuance)
          await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'ISSUED',
              quantity: item.quantity,
              performedById: userId,
              assignedToId: input.assignedToId,
              notes:
                deficitQty > 0
                  ? `Z ${item.quantity} szt., ${usedToCoverDeficit} pokryło wcześniejszy deficyt technika.`
                  : input.notes,
            },
          })
        }
      }
      return { success: true }
    }),

  /** 🔁 Return items from technician back to warehouse */
  returnToWarehouse: adminCoordOrWarehouse
    .input(
      z.object({
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        locationId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      for (const item of input.items) {
        if (item.type === 'DEVICE') {
          const current = await prisma.oplWarehouse.findUnique({
            where: { id: item.id },
            select: { status: true, locationId: true, assignedToId: true },
          })
          if (!current) throw new TRPCError({ code: 'NOT_FOUND' })

          const newStatus =
            current.status === 'COLLECTED_FROM_CLIENT'
              ? 'RETURNED'
              : 'AVAILABLE'

          await prisma.oplWarehouse.update({
            where: { id: item.id },
            data: {
              status: newStatus,
              assignedToId: null,
              locationId: input.locationId,
            },
          })

          await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED',
              performedById: userId,
              assignedToId: current.assignedToId ?? undefined,
              toLocationId: input.locationId,
              notes: input.notes,
            },
          })
          continue
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.oplWarehouse.findUnique({
            where: { id: item.id },
          })
          if (!original) throw new TRPCError({ code: 'NOT_FOUND' })
          if ((original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Not enough material on technician stock`,
            })
          }

          await prisma.oplWarehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })

          // Find existing AVAILABLE stock in warehouse
          const existingStock = await prisma.oplWarehouse.findFirst({
            where: {
              itemType: 'MATERIAL',
              name: original.name,
              index: original.index,
              unit: original.unit,
              locationId: input.locationId,
              assignedToId: null,
              status: 'AVAILABLE',
            },
          })

          if (existingStock) {
            // Increase warehouse stock quantity
            await prisma.oplWarehouse.update({
              where: { id: existingStock.id },
              data: { quantity: { increment: item.quantity } },
            })
          } else {
            // Create new material record in warehouse
            await prisma.oplWarehouse.create({
              data: {
                itemType: 'MATERIAL',
                name: original.name,
                quantity: item.quantity,
                unit: original.unit,
                index: original.index,
                price: original.price,
                status: 'AVAILABLE',
                materialDefinitionId: original.materialDefinitionId,
                locationId: input.locationId,
              },
            })
          }

          await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED',
              performedById: userId,
              assignedToId: original.assignedToId ?? undefined,
              toLocationId: input.locationId,
              quantity: item.quantity,
              notes: input.notes,
            },
          })
        }
      }
      return { success: true }
    }),

  /** Returns damaged/obsolete items to operator (permanent removal from stock). */
  returnToOperator: adminCoordOrWarehouse
    .input(
      z.object({
        items: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('DEVICE'), id: z.string() }),
            z.object({
              type: z.literal('MATERIAL'),
              id: z.string(),
              quantity: z.number().min(1),
            }),
          ])
        ),
        notes: z.string().optional(),
        locationId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const createdHistoryIds: string[] = []

      for (const item of input.items) {
        // Preserve link to the last order that used this item
        const previous = await prisma.oplWarehouseHistory.findFirst({
          where: {
            warehouseItemId: item.id,
            assignedOrderId: { not: null },
          },
          orderBy: { actionDate: 'desc' },
        })

        const assignedOrderId = previous?.assignedOrderId ?? null
        const activeLocationId = input.locationId

        if (item.type === 'DEVICE') {
          const hist = await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED_TO_OPERATOR',
              performedById: userId,
              notes: input.notes,
              assignedOrderId,
              fromLocationId: activeLocationId,
            },
          })
          createdHistoryIds.push(hist.id)

          await prisma.oplWarehouse.update({
            where: { id: item.id },
            data: { status: 'RETURNED_TO_OPERATOR' },
          })
        }

        if (item.type === 'MATERIAL') {
          const original = await prisma.oplWarehouse.findUnique({
            where: { id: item.id },
          })
          if (!original || (original.quantity ?? 0) < item.quantity) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Nieprawidłowa ilość materiału`,
            })
          }

          const hist = await prisma.oplWarehouseHistory.create({
            data: {
              warehouseItemId: item.id,
              action: 'RETURNED_TO_OPERATOR',
              performedById: userId,
              quantity: item.quantity,
              notes: input.notes,
              assignedOrderId,
              fromLocationId: activeLocationId,
            },
          })
          createdHistoryIds.push(hist.id)

          await prisma.oplWarehouse.update({
            where: { id: item.id },
            data: { quantity: { decrement: item.quantity } },
          })
        }
      }

      return { success: true, historyIds: createdHistoryIds }
    }),

  /** 📦 Collect device from client by technician */
  collectFromClient: loggedInEveryone
    .input(
      z.object({
        orderId: z.string().uuid(),
        device: z.object({
          name: z.string(),
          category: z.nativeEnum(OplDeviceCategory).optional(),
          serialNumber: z.string().optional(),
          price: z.number().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const techId = ctx.user?.id
      if (!techId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const activeLocationId = ctx.user?.locations?.[0]?.id
      if (!activeLocationId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Technik nie ma przypisanej lokalizacji',
        })
      }

      const device = await prisma.oplWarehouse.create({
        data: {
          itemType: 'DEVICE',
          name: input.device.name,
          category: input.device.category ?? 'OTHER',
          serialNumber: input.device.serialNumber?.trim().toUpperCase(),
          quantity: 1,
          price: input.device.price ?? 0,
          status: 'COLLECTED_FROM_CLIENT',
          assignedToId: techId,
          locationId: activeLocationId,
        },
      })

      await prisma.oplOrderEquipment.create({
        data: { orderId: input.orderId, warehouseId: device.id },
      })

      await prisma.oplWarehouseHistory.create({
        data: {
          warehouseItemId: device.id,
          action: 'COLLECTED_FROM_CLIENT',
          performedById: techId,
          assignedOrderId: input.orderId,
          assignedToId: techId,
          notes: 'Odebrano urządzenie od klienta',
        },
      })

      return { success: true, id: device.id }
    }),

  /** 🗂️ Devices returned by technicians – waiting to be shipped to operator */
  getReturnedFromTechnicians: adminCoordOrWarehouse.query(() =>
    prisma.oplWarehouse.findMany({
      where: { itemType: 'DEVICE', status: 'RETURNED' },
      include: {
        history: {
          orderBy: { actionDate: 'asc' },
          include: {
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
          },
        },
        orderAssignments: { include: { order: true } },
      },
    })
  ),

  /**
   * importDevices
   * -----------------------------------------------------------------------------
   * Secure batch import of device items:
   *  - Server-side validation of inputs (length, allowed characters, limits)
   *  - Prevents malformed identifiers and oversized uploads
   *  - Skips items without valid definitions or duplicates
   *  - Writes warehouse record + history entry inside a transaction
   */
  importDevices: adminCoordOrWarehouse
    .input(
      z.object({
        items: z
          .array(
            z.object({
              /** DeviceDefinition name (resolved on client) */
              name: z.string().min(1).max(100),

              /** SN/MAC identifier validated before DB operations */
              identifier: z
                .string()
                .min(1)
                .max(64)
                .regex(/^[A-Za-z0-9:-]+$/, 'Invalid identifier format'),
            })
          )
          .min(1)
          .max(5000), // Hard upper limit for batch size to prevent abuse

        /** Optional note added to warehouse history */
        notes: z.string().max(500).optional(),

        /** Explicit or user-derived warehouse location */
        locationId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
      const userId = user.id

      // Resolve effective location (user default or explicit override)
      const activeLocationId =
        input.locationId ?? user.locations?.[0]?.id ?? 'gdansk'

      let addedCount = 0
      let skippedCount = 0
      const skippedList: string[] = []

      for (const item of input.items) {
        /** Basic sanity checks for SN/MAC */
        if (!item.identifier || item.identifier.trim().length < 3) {
          skippedCount++
          skippedList.push(`${item.name} → missing identifier`)
          continue
        }

        /** Server-side allowlist for SN/MAC */
        if (!/^[A-Za-z0-9:-]+$/.test(item.identifier)) {
          skippedCount++
          skippedList.push(
            `${item.name} | ${item.identifier} → invalid characters`
          )
          continue
        }

        /** Find DeviceDefinition (required for category + pricing) */
        const def = await prisma.oplDeviceDefinition.findFirst({
          where: { name: item.name },
        })
        if (!def || def.price == null) {
          skippedCount++
          skippedList.push(`${item.name} | ${item.identifier} → no definition`)
          continue
        }

        /** Attempt to create warehouse entry */
        try {
          await prisma.$transaction(async (tx) => {
            const created = await tx.oplWarehouse.create({
              data: {
                itemType: 'DEVICE',
                name: def.name,
                category: def.category,
                serialNumber: item.identifier.toUpperCase(),
                quantity: 1,
                price: Number(def.price ?? 0),
                warningAlert: def.warningAlert,
                alarmAlert: def.alarmAlert,
                status: 'AVAILABLE',
                locationId: activeLocationId,
              },
            })

            /** Write initial warehouse history entry */
            await tx.oplWarehouseHistory.create({
              data: {
                warehouseItemId: created.id,
                action: 'RECEIVED',
                performedById: userId,
                notes: input.notes,
                toLocationId: activeLocationId,
              },
            })
          })

          addedCount++
        } catch (err) {
          // Handle duplicates or any DB constraint failures
          skippedCount++

          const reason =
            err instanceof Error && err.message.includes('Unique constraint')
              ? 'duplicate identifier'
              : err instanceof Error
              ? err.message
              : 'write error'

          skippedList.push(`${item.name} | ${item.identifier} → ${reason}`)
        }
      }

      return {
        addedCount,
        skippedCount,
        skippedList,
      }
    }),
})
