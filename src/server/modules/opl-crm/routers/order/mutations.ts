import { getCoreUserOrThrow } from '@/server/core/services/getCoreUserOrThrow'
import { requireOplModule } from '@/server/middleware/oplMiddleware'
import { adminOnly, adminOrCoord, loggedInEveryone } from '@/server/roleHelpers'
import { router } from '@/server/trpc'
import { parseLocalDate } from '@/utils/dates/parseLocalDate'
import { getCoordinatesFromAddress } from '@/utils/geocode'
import { normalizeAdressForSearch } from '@/utils/orders/normalizeAdressForSearch'
import { prisma } from '@/utils/prisma'
import {
  OplDeviceCategory,
  OplNetworkOeprator,
  OplOrderCreatedSource,
  OplOrderStandard,
  OplOrderStatus,
  OplOrderType,
  OplTimeSlot,
  OplWarehouseStatus,
  Prisma
} from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import {
  createAddressNoteRecord,
  normalizeAddressToken,
  resolveBuildingScope,
} from '../../helpers/addressNotes'
import { addOrderHistory } from '../../helpers/addOrderHistory'
import { canTechnicianAmendOrder } from '../../services/orderAmendPolicy'
import { processEquipmentDelta } from '../../services/orderEquipmentDelta'
import { reconcileOrderMaterials } from '../../services/orderMaterialsReconciliation'

const completionInputSchema = z.object({
  orderId: z.string().uuid(),
  status: z.nativeEnum(OplOrderStatus),
  notes: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  workCodes: z
    .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
    .optional(),
  equipmentIds: z.array(z.string()).optional(),
  usedMaterials: z
    .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
    .optional(),
  collectedDevices: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.nativeEnum(OplDeviceCategory),
        serialNumber: z.string().optional(),
      })
    )
    .optional(),
})

const normalizeSerial = (serial?: string | null): string | null => {
  if (!serial) return null
  const normalized = serial.trim().toUpperCase()
  return normalized.length > 0 ? normalized : null
}

const settleCodeMap: Record<string, string> = {
  I_1P: '1P',
  I_2P: '2P',
  I_3P: '3P',
}

const normalizeSettlementCode = (code: string): string =>
  settleCodeMap[code] ?? code

const createSettlementEntries = async ({
  tx,
  orderId,
  workCodes,
}: {
  tx: Prisma.TransactionClient
  orderId: string
  workCodes: { code: string; quantity: number }[]
}): Promise<{ warnings: string[] }> => {
  if (!workCodes.length) return { warnings: [] }

  const normalized = workCodes.map((entry) => ({
    code: normalizeSettlementCode(entry.code),
    quantity: entry.quantity,
  }))

  const uniqueCodes = [...new Set(normalized.map((entry) => entry.code))]
  const availableRates = await tx.oplRateDefinition.findMany({
    where: { code: { in: uniqueCodes } },
    select: { code: true },
  })

  const availableSet = new Set(availableRates.map((rate) => rate.code))
  const missingCodes = uniqueCodes.filter((code) => !availableSet.has(code))

  const warnings: string[] = []

  if (missingCodes.length > 0) {
    // Auto-create missing rates with 0 amount so order completion is not blocked.
    await tx.oplRateDefinition.createMany({
      data: missingCodes.map((code) => ({
        code,
        amount: 0,
      })),
      skipDuplicates: true,
    })

    warnings.push(
      `Brakujące definicje stawek utworzono z kwotą 0: ${missingCodes.join(', ')}`
    )
  }

  await tx.oplOrderSettlementEntry.createMany({
    data: normalized.map((entry) => ({
      orderId,
      code: entry.code,
      quantity: entry.quantity,
    })),
  })

  return { warnings }
}

const upsertCollectedDevices = async ({
  tx,
  orderId,
  performedById,
  technicianId,
  devices,
}: {
  tx: Prisma.TransactionClient
  orderId: string
  performedById: string
  technicianId: string
  devices: Array<{
    name: string
    category: OplDeviceCategory
    serialNumber?: string
  }>
}) => {
  if (!devices.length) return

  for (const device of devices) {
    const serial = normalizeSerial(device.serialNumber)

    const existing = serial
      ? await tx.oplWarehouse.findFirst({
          where: {
            itemType: 'DEVICE',
            serialNumber: serial,
          },
          select: {
            id: true,
            name: true,
            category: true,
          },
        })
      : null

    if (existing) {
      await tx.oplWarehouse.update({
        where: { id: existing.id },
        data: {
          name: device.name || existing.name,
          category: device.category ?? existing.category,
          serialNumber: serial,
          status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
          assignedToId: technicianId,
          locationId: null,
        },
      })

      await tx.oplOrderEquipment.upsert({
        where: {
          orderId_warehouseId: {
            orderId,
            warehouseId: existing.id,
          },
        },
        create: {
          orderId,
          warehouseId: existing.id,
        },
        update: {},
      })

      await tx.oplWarehouseHistory.create({
        data: {
          warehouseItemId: existing.id,
          action: 'COLLECTED_FROM_CLIENT',
          performedById,
          assignedToId: technicianId,
          assignedOrderId: orderId,
          actionDate: new Date(),
        },
      })

      continue
    }

    const created = await tx.oplWarehouse.create({
      data: {
        itemType: 'DEVICE',
        name: device.name,
        category: device.category,
        serialNumber: serial,
        quantity: 1,
        price: 0,
        status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
        assignedToId: technicianId,
        locationId: null,
      },
      select: { id: true },
    })

    await tx.oplOrderEquipment.create({
      data: { orderId, warehouseId: created.id },
    })

    await tx.oplWarehouseHistory.create({
      data: {
        warehouseItemId: created.id,
        action: 'COLLECTED_FROM_CLIENT',
        performedById,
        assignedToId: technicianId,
        assignedOrderId: orderId,
        actionDate: new Date(),
      },
    })
  }
}

export const mutationsRouter = router({
  /** Bulk import of installation orders from Excel */
  bulkImport: adminOrCoord
    .input(
      z.array(
        z.object({
          operator: z.string(),
          type: z.literal('INSTALLATION'),
          serviceId: z.string().optional(),
          network: z.nativeEnum(OplNetworkOeprator),
          orderNumber: z.string(),
          date: z.string(),
          timeSlot: z.nativeEnum(OplTimeSlot),
          city: z.string(),
          street: z.string(),
          postalCode: z.string().optional(),
          assignedTechnicianIds: z.array(z.string()).optional(),
          notes: z.string().optional(),
        })
      )
    )
    .mutation(async ({ input, ctx }) => {
      const { id: adminId } = getCoreUserOrThrow(ctx)

      const summary = {
        added: 0,
        skippedPendingOrAssigned: 0,
        skippedCompleted: 0,
        otherErrors: 0,
      }

      // ------------------------------------------------------------
      // IMPORTANT: No global transaction. Each row = separate TX.
      // ------------------------------------------------------------
      for (const o of input) {
        try {
          await ctx.prisma.$transaction(async (tx) => {
            const orderNumber = o.orderNumber.trim()
            const city = o.city.trim()
            const street = o.street.trim()
            const date = new Date(o.date)

            if (Number.isNaN(date.getTime())) {
              throw new Error('INVALID_DATE')
            }

            /** -------------------------------------------------------
             * 1. Load latest attempt
             * ------------------------------------------------------ */
            const existing = await tx.oplOrder.findFirst({
              where: {
                orderNumber: { equals: orderNumber, mode: 'insensitive' },
                city: { equals: city, mode: 'insensitive' },
                street: { equals: street, mode: 'insensitive' },
              },
              orderBy: { attemptNumber: 'desc' },
            })

            /** -------------------------------------------------------
             * 2. Decide if we can create a new attempt
             * ------------------------------------------------------ */
            let attemptNumber = 1
            let previousOrderId: string | null = null

            if (existing) {
              if (
                existing.status === OplOrderStatus.PENDING ||
                existing.status === OplOrderStatus.ASSIGNED
              ) {
                summary.skippedPendingOrAssigned++
                return
              }

              if (existing.status === OplOrderStatus.COMPLETED) {
                summary.skippedCompleted++
                return
              }

              if (existing.status === OplOrderStatus.NOT_COMPLETED) {
                attemptNumber = existing.attemptNumber + 1
                previousOrderId = existing.id
              }
            }

            /** -------------------------------------------------------
             * 3. Resolve technicians (0..N)
             * ------------------------------------------------------ */
            const technicianIds =
              o.assignedTechnicianIds && o.assignedTechnicianIds.length > 0
                ? (
                    await tx.user.findMany({
                      where: {
                        id: { in: o.assignedTechnicianIds },
                        role: 'TECHNICIAN',
                      },
                      select: { id: true },
                    })
                  ).map((t) => t.id)
                : []

            const status =
              technicianIds.length > 0
                ? OplOrderStatus.ASSIGNED
                : OplOrderStatus.PENDING

            /** -------------------------------------------------------
             * 4. Create order attempt
             * ------------------------------------------------------ */
            const created = await tx.oplOrder.create({
              data: {
                serviceId: o.serviceId ?? null,
                operator: o.operator,
                type: o.type,
                network: o.network,
                orderNumber,
                date,
                timeSlot: o.timeSlot,
                city,
                street,
                postalCode: o.postalCode ?? null,
                notes: o.notes ?? null,
                status,
                attemptNumber,
                previousOrderId,
                createdSource: 'PLANNER',
              },
              select: { id: true },
            })

            /** -------------------------------------------------------
             * 5. Create technician assignments
             * ------------------------------------------------------ */
            if (technicianIds.length > 0) {
              await tx.oplOrderAssignment.createMany({
                data: technicianIds.map((technicianId, idx) => ({
                  orderId: created.id,
                  technicianId,
                  assignedAt: new Date(Date.now() + idx),
                })),
                skipDuplicates: true,
              })
            }

            /** -------------------------------------------------------
             * 6. History entry
             * ------------------------------------------------------ */
            await tx.oplOrderHistory.create({
              data: {
                orderId: created.id,
                changedById: adminId,
                statusBefore: previousOrderId
                  ? OplOrderStatus.NOT_COMPLETED
                  : OplOrderStatus.PENDING,
                statusAfter: status,
                notes: previousOrderId
                  ? `Utworzono kolejne podejście (wejście ${attemptNumber}).`
                  : technicianIds.length > 0
                  ? `Utworzono zlecenie i przypisano do ${technicianIds.length} techników.`
                  : 'Utworzono zlecenie (import).',
              },
            })

            summary.added++
          })
        } catch (err) {
          console.error(`❌ Import error for order ${o.orderNumber}`)
          console.error(err)
          summary.otherErrors++
        }
      }

      return summary
    }),

  /** ✅ Create new order (serviceId-aware, preserves Polish letters but uses normalized comparisons) */
  createOrder: loggedInEveryone
    .input(
      z.object({
        operator: z.string(),
        type: z.nativeEnum(OplOrderType),
        network: z.nativeEnum(OplNetworkOeprator),
        serviceId: z.string().length(12).optional(),
        standard: z.nativeEnum(OplOrderStandard).optional(),

        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(OplTimeSlot),

        clientPhoneNumber: z
          .string()
          .min(7)
          .max(20)
          .optional()
          .refine((val) => !val || /^(\+48)?\d{9}$/.test(val), {
            message: 'Nieprawidłowy numer telefonu',
          }),

        city: z.string(),
        street: z.string(),
        postalCode: z.string().optional(),
        county: z.string().optional(),
        municipality: z.string().optional(),

        /** Contract required (yes / no) */
        contractRequired: z.boolean().default(false),

        /** Optional suggested equipment to be issued */
        equipmentRequirements: z
          .array(
            z.object({
              deviceDefinitionId: z.string(),
              quantity: z.number().min(1).default(1),
            })
          )
          .optional(),

        assignedTechnicianIds: z.array(z.string()).optional(),

        notes: z.string().optional(),
        createdSource: z.nativeEnum(OplOrderCreatedSource).default('PLANNER'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id: userId } = getCoreUserOrThrow(ctx)

      const normOrder = input.orderNumber.trim()

      const existingOrder = await prisma.oplOrder.findFirst({
        where: {
          orderNumber: { equals: normOrder, mode: 'insensitive' },
        },
      })

      if (existingOrder) {
        if (existingOrder.status === OplOrderStatus.COMPLETED) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Zlecenie ${input.orderNumber} jest już wykonane.`,
          })
        }

        if (
          existingOrder.status === OplOrderStatus.PENDING ||
          existingOrder.status === OplOrderStatus.ASSIGNED
        ) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Zlecenie ${input.orderNumber} już istnieje i oczekuje na realizację.`,
          })
        }
      }

      let lat: number | null = null
      let lng: number | null = null

      try {
        const addressVariants = [
          `${input.street}, ${input.postalCode ?? ''} ${input.city}, Polska`,
          `${input.street}, ${input.city}, Polska`,
          `${input.city}, Polska`,
        ]

        for (const addr of addressVariants) {
          const coords = await getCoordinatesFromAddress(addr)
          if (coords) {
            lat = coords.lat
            lng = coords.lng
            break
          }
        }
      } catch {
        console.warn('Geocoding failed for address:', input.street, input.city)
      }

      let attemptNumber = 1
      let previousOrderId: string | null = null

      const lastAttempt = await prisma.oplOrder.findFirst({
        where: {
          orderNumber: { equals: normOrder, mode: 'insensitive' },
          city: { equals: input.city.trim(), mode: 'insensitive' },
          street: { equals: input.street.trim(), mode: 'insensitive' },
          status: OplOrderStatus.NOT_COMPLETED,
        },
        orderBy: { attemptNumber: 'desc' },
      })

      if (lastAttempt) {
        attemptNumber = lastAttempt.attemptNumber + 1
        previousOrderId = lastAttempt.id
      }

      const technicianIds =
        input.assignedTechnicianIds && input.assignedTechnicianIds.length > 0
          ? (
              await prisma.user.findMany({
                where: {
                  id: { in: input.assignedTechnicianIds },
                  role: 'TECHNICIAN',
                },
                select: { id: true },
              })
            ).map((t) => t.id)
          : []

      const status =
        technicianIds.length > 0
          ? OplOrderStatus.ASSIGNED
          : OplOrderStatus.PENDING

      const created = await prisma.oplOrder.create({
        data: {
          serviceId: input.serviceId ?? null,
          operator: input.operator,
          type: input.type,
          network: input.network,
          standard: input.standard ?? null,
          orderNumber: input.orderNumber.trim(),
          date: parseLocalDate(input.date),
          timeSlot: input.timeSlot,
          clientPhoneNumber: input.clientPhoneNumber ?? null,
          notes: input.notes ?? null,
          county: input.county ?? null,
          municipality: input.municipality ?? null,
          city: input.city.trim(),
          street: input.street.trim(),
          postalCode: input.postalCode?.trim() ?? null,
          contractRequired: input.contractRequired,
          lat,
          lng,
          createdSource: input.createdSource,
          status,
          attemptNumber,
          previousOrderId,
        },
      })

      if (input.equipmentRequirements?.length) {
        await prisma.oplOrderEquipmentRequirement.createMany({
          data: input.equipmentRequirements.map((req) => ({
            orderId: created.id,
            deviceDefinitionId: req.deviceDefinitionId,
            quantity: req.quantity,
          })),
          skipDuplicates: true,
        })
      }

      if (technicianIds.length > 0) {
        await prisma.oplOrderAssignment.createMany({
          data: technicianIds.map((technicianId, idx) => ({
            orderId: created.id,
            technicianId,
            assignedAt: new Date(Date.now() + idx),
          })),
          skipDuplicates: true,
        })
      }

      const historyNote = input.serviceId
        ? previousOrderId
          ? `Utworzono kolejne podejście (wejście ${attemptNumber}).`
          : 'Utworzono pierwsze zlecenie klienta.'
        : 'Utworzono pierwsze wejście (ręcznie lub z planera).'

      await prisma.oplOrderHistory.create({
        data: {
          orderId: created.id,
          changedById: userId,
          statusBefore: previousOrderId
            ? OplOrderStatus.NOT_COMPLETED
            : OplOrderStatus.PENDING,
          statusAfter: status,
          notes: historyNote,
        },
      })

      return created
    }),

  /** ✅ Edit existing order (serviceId-aware, preserves Polish letters and recalculates attempt chain) */
  editOrder: adminOrCoord
    .input(
      z.object({
        id: z.string(),
        type: z.nativeEnum(OplOrderType),
        operator: z.string(),
        orderNumber: z.string().min(3),
        date: z.string(),
        timeSlot: z.nativeEnum(OplTimeSlot),
        notes: z.string().optional(),
        status: z.nativeEnum(OplOrderStatus),
        city: z.string(),
        street: z.string(),
        assignedTechnicianIds: z.array(z.string()).optional(),
        serviceId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const existing = await prisma.oplOrder.findUnique({
          where: { id: input.id },
          include: {
            assignments: true,
          },
        })

        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zlecenie nie istnieje',
          })
        }

        const normOrder = input.orderNumber.trim()
        const normCity = normalizeAdressForSearch(input.city)
        const normStreet = normalizeAdressForSearch(input.street)

        const oldCityNorm = normalizeAdressForSearch(existing.city)
        const oldStreetNorm = normalizeAdressForSearch(existing.street)

        const addressChanged =
          normCity !== oldCityNorm || normStreet !== oldStreetNorm

        let attemptNumber = existing.attemptNumber
        let previousOrderId = existing.previousOrderId

        const existingSameNumber = await prisma.oplOrder.findFirst({
          where: {
            orderNumber: { equals: normOrder, mode: 'insensitive' },
            NOT: { id: existing.id },
          },
        })

        if (existingSameNumber) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Numer zlecenia "${input.orderNumber}" jest już używany.`,
          })
        }

        if (addressChanged) {
          const lastAttempt = await prisma.oplOrder.findFirst({
            where: {
              orderNumber: { equals: normOrder, mode: 'insensitive' },
              city: { equals: input.city.trim(), mode: 'insensitive' },
              street: { equals: input.street.trim(), mode: 'insensitive' },
              status: OplOrderStatus.NOT_COMPLETED,
              NOT: { id: existing.id },
            },
            orderBy: { attemptNumber: 'desc' },
          })

          if (lastAttempt) {
            attemptNumber = lastAttempt.attemptNumber + 1
            previousOrderId = lastAttempt.id
          } else {
            attemptNumber = 1
            previousOrderId = null
          }
        }

        let lat: number | null | undefined = undefined
        let lng: number | null | undefined = undefined

        if (addressChanged) {
          const variants = [
            `${input.street}, ${input.city}, Polska`,
            `${input.city}, Polska`,
          ]

          for (const v of variants) {
            try {
              const coords = await getCoordinatesFromAddress(v)
              if (coords) {
                lat = coords.lat
                lng = coords.lng
                break
              }
            } catch {
              // ignore and continue
            }
          }

          if (lat === undefined) lat = null
          if (lng === undefined) lng = null
        }

        const technicianIds =
          input.assignedTechnicianIds && input.assignedTechnicianIds.length > 0
            ? (
                await prisma.user.findMany({
                  where: {
                    id: { in: input.assignedTechnicianIds },
                    role: 'TECHNICIAN',
                  },
                  select: { id: true },
                })
              ).map((t) => t.id)
            : []

        const isFinalizedOrder =
          existing.status === OplOrderStatus.COMPLETED ||
          existing.status === OplOrderStatus.NOT_COMPLETED

        const status = isFinalizedOrder
          ? existing.status
          : technicianIds.length > 0
            ? OplOrderStatus.ASSIGNED
            : OplOrderStatus.PENDING

        const updated = await prisma.$transaction(async (tx) => {
          const order = await tx.oplOrder.update({
            where: { id: existing.id },
            data: {
              orderNumber: normOrder,
              type: input.type,
              operator: input.operator,
              date: parseLocalDate(input.date),
              timeSlot: input.timeSlot,
              notes: input.notes,
              status,
              city: input.city.trim(),
              street: input.street.trim(),
              serviceId: input.serviceId ?? existing.serviceId,
              attemptNumber,
              previousOrderId,
              ...(addressChanged
                ? {
                    lat: lat ?? null,
                    lng: lng ?? null,
                  }
                : {}),
            },
          })

          await tx.oplOrderAssignment.deleteMany({
            where: { orderId: existing.id },
          })

          if (technicianIds.length > 0) {
            await tx.oplOrderAssignment.createMany({
              data: technicianIds.map((technicianId, idx) => ({
                orderId: existing.id,
                technicianId,
                assignedAt: new Date(Date.now() + idx),
              })),
              skipDuplicates: true,
            })
          }

          if (existing.status !== status) {
            await tx.oplOrderHistory.create({
              data: {
                orderId: existing.id,
                changedById: ctx.user!.id,
                statusBefore: existing.status,
                statusAfter: status,
                notes: 'Zmieniono status przez edycję zlecenia',
              },
            })
          }

          return order
        })

        return updated
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          if (err.code === 'P2002') {
            throw new TRPCError({
              code: 'CONFLICT',
              message:
                'Nie można zapisać — kombinacja numeru, adresu i wejścia już istnieje.',
            })
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nieoczekiwany błąd przy edycji zlecenia.',
        })
      }
    }),

  /** ✅ Delete order */
  deleteOrder: adminOrCoord
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.$transaction(async (tx) => {
        const order = await tx.oplOrder.findUnique({
          where: { id: input.id },
          select: { status: true },
        })

        if (!order) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Zlecenie nie istnieje',
          })
        }

        if (
          order.status === OplOrderStatus.COMPLETED ||
          order.status === OplOrderStatus.NOT_COMPLETED
        ) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nie można usunąć zlecenia, które zostało już rozliczone.',
          })
        }

        /* ----------------------------------------------------------
         * Remove dependent entities
         * ---------------------------------------------------------- */

        await tx.oplOrderAssignment.deleteMany({
          where: { orderId: input.id },
        })

        await tx.oplOrderMaterial.deleteMany({
          where: { orderId: input.id },
        })

        await tx.oplOrderEquipment.deleteMany({
          where: { orderId: input.id },
        })

        await tx.oplOrderSettlementEntry.deleteMany({
          where: { orderId: input.id },
        })

        await tx.oplOrderHistory.deleteMany({
          where: { orderId: input.id },
        })

        /* ----------------------------------------------------------
         * Remove order
         * ---------------------------------------------------------- */
        return tx.oplOrder.delete({
          where: { id: input.id },
        })
      })
    }),

  /** ✅ Assign or unassign technician */
  assignTechnician: adminOnly
    .input(
      z.object({
        id: z.string(),
        technicianId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const order = await prisma.oplOrder.findUnique({
        where: { id: input.id },
        include: {
          assignments: true,
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      let technicianIds: string[] = []

      if (input.technicianId) {
        const tech = await prisma.user.findUnique({
          where: { id: input.technicianId, role: 'TECHNICIAN' },
          select: { id: true },
        })

        if (!tech) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Technik nie istnieje',
          })
        }

        technicianIds = [tech.id]
      }

      let lat: number | null | undefined = undefined
      let lng: number | null | undefined = undefined

      if (order.lat === null && order.lng === null) {
        const variants = [
          `${order.street}, ${order.city}, Polska`,
          `${order.city}, Polska`,
        ]

        for (const v of variants) {
          try {
            const coords = await getCoordinatesFromAddress(v)
            if (coords) {
              lat = coords.lat
              lng = coords.lng
              break
            }
          } catch {
            // ignore and continue
          }
        }

        if (lat === undefined) lat = null
        if (lng === undefined) lng = null
      }

      const isFinalizedOrder =
        order.status === OplOrderStatus.COMPLETED ||
        order.status === OplOrderStatus.NOT_COMPLETED

      const status = isFinalizedOrder
        ? order.status
        : technicianIds.length > 0
          ? OplOrderStatus.ASSIGNED
          : OplOrderStatus.PENDING

      return prisma.$transaction(async (tx) => {
        await tx.oplOrderAssignment.deleteMany({
          where: { orderId: order.id },
        })

        if (technicianIds.length > 0) {
          await tx.oplOrderAssignment.createMany({
            data: technicianIds.map((technicianId, idx) => ({
              orderId: order.id,
              technicianId,
              assignedAt: new Date(Date.now() + idx),
            })),
            skipDuplicates: true,
          })
        }

        return tx.oplOrder.update({
          where: { id: order.id },
          data: {
            status,
            ...(lat !== undefined && lng !== undefined ? { lat, lng } : {}),
          },
        })
      })
    }),

  completeOrder: loggedInEveryone
    .use(requireOplModule)
    .input(completionInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const order = await ctx.prisma.oplOrder.findFirst({
        where: {
          id: input.orderId,
          assignments: {
            some: {
              technicianId: userId,
            },
          },
        },
        select: {
          id: true,
          type: true,
          status: true,
          assignments: {
            orderBy: { assignedAt: 'asc' },
            select: { technicianId: true },
          },
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Nie masz dostępu do tego zlecenia',
        })
      }

      if (
        input.status === OplOrderStatus.COMPLETED &&
        order.type === OplOrderType.INSTALLATION &&
        (!input.workCodes || input.workCodes.length === 0)
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Brak dodanych kodów pracy dla instalacji',
        })
      }

      const technicianId = order.assignments[0]?.technicianId ?? userId
      const warnings: string[] = []
      const equipmentIds =
        input.status === OplOrderStatus.COMPLETED ? input.equipmentIds ?? [] : []
      const materials =
        input.status === OplOrderStatus.COMPLETED ? input.usedMaterials ?? [] : []
      const collected =
        input.status === OplOrderStatus.COMPLETED
          ? input.collectedDevices ?? []
          : []

      await ctx.prisma.$transaction(async (tx) => {
        await tx.oplOrder.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === OplOrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
            completedAt: new Date(),
          },
        })

        await tx.oplOrderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        if (
          input.status === OplOrderStatus.COMPLETED &&
          input.workCodes?.length
        ) {
          const { warnings: settlementWarnings } = await createSettlementEntries({
            tx,
            orderId: input.orderId,
            workCodes: input.workCodes,
          })
          warnings.push(...settlementWarnings)
        }

        const { warnings: matWarnings } = await reconcileOrderMaterials({
          tx,
          orderId: input.orderId,
          technicianId,
          editorId: userId,
          newMaterials: materials,
        })
        warnings.push(...matWarnings)

        await processEquipmentDelta({
          tx,
          orderId: input.orderId,
          newEquipmentIds: equipmentIds,
          technicianId,
          editorId: userId,
          mode: 'COMPLETE',
        })

        await upsertCollectedDevices({
          tx,
          orderId: input.orderId,
          performedById: userId,
          technicianId,
          devices: collected,
        })

        await addOrderHistory({
          prisma: tx,
          orderId: input.orderId,
          userId,
          before: order.status,
          after: input.status,
          note:
            input.status === OplOrderStatus.COMPLETED
              ? 'Zlecenie zakończone przez technika.'
              : 'Zlecenie oznaczone jako niewykonane przez technika.',
        })
      })

      return { success: true, warnings }
    }),

  amendCompletion: loggedInEveryone
    .use(requireOplModule)
    .input(completionInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      await canTechnicianAmendOrder(ctx.prisma, {
        orderId: input.orderId,
        technicianId: userId,
      })

      const order = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.orderId },
        select: {
          status: true,
          assignments: {
            orderBy: { assignedAt: 'asc' },
            select: { technicianId: true },
          },
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      const technicianId = order.assignments[0]?.technicianId ?? userId
      const warnings: string[] = []
      const equipmentIds =
        input.status === OplOrderStatus.COMPLETED ? input.equipmentIds ?? [] : []
      const materials =
        input.status === OplOrderStatus.COMPLETED ? input.usedMaterials ?? [] : []
      const collected =
        input.status === OplOrderStatus.COMPLETED
          ? input.collectedDevices ?? []
          : []

      await ctx.prisma.$transaction(async (tx) => {
        await tx.oplOrder.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === OplOrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
          },
        })

        await tx.oplOrderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        if (
          input.status === OplOrderStatus.COMPLETED &&
          input.workCodes?.length
        ) {
          const { warnings: settlementWarnings } = await createSettlementEntries({
            tx,
            orderId: input.orderId,
            workCodes: input.workCodes,
          })
          warnings.push(...settlementWarnings)
        }

        const { warnings: matWarnings } = await reconcileOrderMaterials({
          tx,
          orderId: input.orderId,
          technicianId,
          editorId: userId,
          newMaterials: materials,
        })
        warnings.push(...matWarnings)

        await processEquipmentDelta({
          tx,
          orderId: input.orderId,
          newEquipmentIds: equipmentIds,
          technicianId,
          editorId: userId,
          mode: 'AMEND',
        })

        await upsertCollectedDevices({
          tx,
          orderId: input.orderId,
          performedById: userId,
          technicianId,
          devices: collected,
        })

        await addOrderHistory({
          prisma: tx,
          orderId: input.orderId,
          userId,
          before: order.status,
          after: input.status,
          note: 'Zlecenie poprawione przez technika.',
        })
      })

      return { success: true, warnings }
    }),

  adminEditCompletion: adminOrCoord
    .use(requireOplModule)
    .input(completionInputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const order = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.orderId },
        select: {
          status: true,
          assignments: {
            orderBy: { assignedAt: 'asc' },
            select: { technicianId: true },
          },
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      const technicianId = order.assignments[0]?.technicianId ?? null
      const warnings: string[] = []
      const equipmentIds =
        input.status === OplOrderStatus.COMPLETED ? input.equipmentIds ?? [] : []
      const materials =
        input.status === OplOrderStatus.COMPLETED ? input.usedMaterials ?? [] : []
      const collected =
        input.status === OplOrderStatus.COMPLETED
          ? input.collectedDevices ?? []
          : []

      await ctx.prisma.$transaction(async (tx) => {
        await tx.oplOrder.update({
          where: { id: input.orderId },
          data: {
            status: input.status,
            notes: input.notes ?? null,
            failureReason:
              input.status === OplOrderStatus.NOT_COMPLETED
                ? input.failureReason ?? null
                : null,
          },
        })

        await tx.oplOrderSettlementEntry.deleteMany({
          where: { orderId: input.orderId },
        })

        if (
          input.status === OplOrderStatus.COMPLETED &&
          input.workCodes?.length
        ) {
          const { warnings: settlementWarnings } = await createSettlementEntries({
            tx,
            orderId: input.orderId,
            workCodes: input.workCodes,
          })
          warnings.push(...settlementWarnings)
        }

        const { warnings: matWarnings } = await reconcileOrderMaterials({
          tx,
          orderId: input.orderId,
          technicianId,
          editorId: userId,
          newMaterials: materials,
        })
        warnings.push(...matWarnings)

        await processEquipmentDelta({
          tx,
          orderId: input.orderId,
          newEquipmentIds: equipmentIds,
          technicianId,
          editorId: userId,
          mode: 'ADMIN',
        })

        if (technicianId) {
          await upsertCollectedDevices({
            tx,
            orderId: input.orderId,
            performedById: userId,
            technicianId,
            devices: collected,
          })
        }

        await addOrderHistory({
          prisma: tx,
          orderId: input.orderId,
          userId,
          before: order.status,
          after: input.status,
          note: `Zlecenie edytowane przez administratora/koordynatora.`,
        })
      })

      return { success: true, warnings }
    }),

  /** ✅ Technician completes or fails an order (with extra devices support) */
  // completeOrder: loggedInEveryone
  //   .input(
  //     z.object({
  //       orderId: z.string(),
  //       status: z.nativeEnum(OplOrderStatus),
  //       notes: z.string().nullable().optional(),
  //       failureReason: z.string().nullable().optional(),
  //       workCodes: z
  //         .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
  //         .optional(),
  //       equipmentIds: z.array(z.string()).optional(),
  //       usedMaterials: z
  //         .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
  //         .optional(),
  //       issuedDevices: z.array(z.string()).optional(),
  //       collectedDevices: z
  //         .array(
  //           z.object({
  //             name: z.string(),
  //             category: z.nativeEnum(OplDeviceCategory),
  //             serialNumber: z.string().optional(),
  //           })
  //         )
  //         .optional(),

  //       services: z
  //         .array(
  //           z.object({
  //             id: z.string(),
  //             type: z.nativeEnum(OplBaseWorkCode),
  //             deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
  //             deviceName: z.string().optional(),
  //             deviceType: z.nativeEnum(OplDeviceCategory).optional(),

  //             deviceId: z.string().optional(),
  //             serialNumber: z.string().optional(),
  //             deviceId2: z.string().optional(),
  //             deviceName2: z.string().optional(),
  //             serialNumber2: z.string().optional(),
  //             speedTest: z.string().optional(),
  //             usDbmDown: z.coerce.number().optional(),
  //             usDbmUp: z.coerce.number().optional(),
  //             notes: z.string().optional(),
  //             extraDevices: z
  //               .array(
  //                 z.object({
  //                   id: z.string(),
  //                   source: z.enum(['WAREHOUSE', 'CLIENT']),
  //                   category: z.nativeEnum(OplDeviceCategory),
  //                   name: z.string().optional(),
  //                   serialNumber: z.string().optional(),
  //                 })
  //               )
  //               .optional(),
  //           })
  //         )
  //         .default([]),
  //     })
  //   )
  //   .mutation(async ({ input, ctx }) => {
  //     const userId = ctx.user?.id
  //     if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

  //     const warnings: string[] = []

  //     // ----------- Validate order and technician permissions -----------
  //     const order = await prisma.oplOrder.findUnique({
  //       where: { id: input.orderId },
  //       select: { id: true, assignments: true, type: true },
  //     })
  //     if (!order)
  //       throw new TRPCError({
  //         code: 'NOT_FOUND',
  //         message: 'Zlecenie nie istnieje',
  //       })
  //     if (order.assignedToId !== userId)
  //       throw new TRPCError({
  //         code: 'FORBIDDEN',
  //         message: 'Nie masz dostępu do tego zlecenia',
  //       })
  //     if (
  //       input.status === OplOrderStatus.COMPLETED &&
  //       order.type === OplOrderType.INSTALLATION &&
  //       (!input.workCodes || input.workCodes.length === 0)
  //     ) {
  //       throw new TRPCError({
  //         code: 'BAD_REQUEST',
  //         message: 'Brak dodanych kodów pracy dla instalacji',
  //       })
  //     }

  //     await prisma.$transaction(async (tx) => {
  //       /* -------------------------------------------------------------------
  //        * 1️⃣  Update order main info (status, notes, failure reason)
  //        * ------------------------------------------------------------------- */
  //       await tx.oplOrder.update({
  //         where: { id: input.orderId },
  //         data: {
  //           status: input.status,
  //           notes: input.notes,
  //           failureReason:
  //             input.status === OplOrderStatus.NOT_COMPLETED
  //               ? input.failureReason
  //               : null,
  //           completedAt: new Date(),
  //         },
  //       })

  //       /* -------------------------------------------------------------------
  //        * 2️⃣  Reset settlement entries (work codes) for the order
  //        * ------------------------------------------------------------------- */
  //       await tx.oplOrderSettlementEntry.deleteMany({
  //         where: { orderId: input.orderId },
  //       })

  //       /* -------------------------------------------------------------------
  //        * 3️⃣  Save settlement entries (work codes) if order is completed
  //        * ------------------------------------------------------------------- */
  //       if (
  //         input.status === OplOrderStatus.COMPLETED &&
  //         input.workCodes?.length
  //       ) {
  //         await tx.oplOrderSettlementEntry.createMany({
  //           data: input.workCodes.map((entry) => ({
  //             orderId: input.orderId,
  //             code: entry.code,
  //             quantity: entry.quantity,
  //           })),
  //         })
  //       }

  //       /* -------------------------------------------------------------------
  //        * 4️⃣  Save used materials and update technician warehouse stock
  //        *      (with virtual deficit tracking for technicians)
  //        * ------------------------------------------------------------------- */
  //       const { warnings: matWarnings } = await reconcileOrderMaterials({
  //         tx,
  //         orderId: input.orderId,
  //         technicianId: order.assignedToId,
  //         editorId: userId,
  //         newMaterials: input.usedMaterials ?? [],
  //       })
  //       warnings.push(...matWarnings)

  //       /* -------------------------------------------------------------------
  //        * 5️⃣  Assign used devices from technician warehouse (equipmentIds)
  //        * -------------------------------------------------------------------
  //        * - Links selected devices to the order (OrderEquipment).
  //        * - Changes status to ASSIGNED_TO_ORDER.
  //        * - Always clears assignedToId (device is no longer on technician stock).
  //        * ------------------------------------------------------------------- */
  //       if (input.equipmentIds?.length) {
  //         // 1) Devices already bound to other orders
  //         const conflictingDevices = await tx.oplOrderEquipment.findMany({
  //           where: {
  //             warehouseId: { in: input.equipmentIds },
  //             orderId: { not: input.orderId },
  //           },
  //           include: {
  //             warehouse: { select: { name: true, serialNumber: true } },
  //             order: { select: { orderNumber: true } },
  //           },
  //         })

  //         if (conflictingDevices.length > 0) {
  //           const conflictList = conflictingDevices
  //             .map(
  //               (d) =>
  //                 `${d.warehouse?.name ?? 'Urządzenie'} SN: ${
  //                   d.warehouse?.serialNumber ?? 'brak'
  //                 } → zlecenie ${d.order?.orderNumber ?? d.orderId}`
  //             )
  //             .join(', ')

  //           throw new TRPCError({
  //             code: 'CONFLICT',
  //             message:
  //               'Niektóre urządzenia są już przypisane do innych zleceń: ' +
  //               conflictList,
  //           })
  //         }

  //         // 2) Load ALL referenced devices from warehouse (without filters)
  //         const allDevices = await tx.oplWarehouse.findMany({
  //           where: { id: { in: input.equipmentIds } },
  //           select: {
  //             id: true,
  //             name: true,
  //             category: true,
  //             status: true,
  //             assignedToId: true,
  //             serialNumber: true,
  //           },
  //         })

  //         // Map for easier lookup
  //         const allById = new Map(allDevices.map((d) => [d.id, d]))

  //         // Helper: check whether single device is valid
  //         const isValidDevice = (device: {
  //           id: string
  //           category: OplDeviceCategory | null
  //           status: string
  //           assignedToId: string | null
  //         }): boolean => {
  //           if (device.assignedToId === userId) return true
  //           if (device.status === 'ASSIGNED_TO_ORDER') return true
  //           if (device.status === 'COLLECTED_FROM_CLIENT') return true
  //           if (device.category === OplDeviceCategory.OTHER) return true
  //           return false
  //         }

  //         const invalidDetails: string[] = []
  //         const validIds: string[] = []

  //         for (const id of input.equipmentIds) {
  //           const dev = allById.get(id)
  //           if (!dev) {
  //             invalidDetails.push(`ID ${id} → brak w magazynie`)
  //             continue
  //           }

  //           if (!isValidDevice(dev)) {
  //             invalidDetails.push(
  //               `${dev.name} SN: ${dev.serialNumber ?? 'brak'} (ID: ${
  //                 dev.id
  //               }) → status: ${dev.status}, assignedToId: ${
  //                 dev.assignedToId ?? 'null'
  //               }, category: ${dev.category}`
  //             )
  //             continue
  //           }

  //           validIds.push(dev.id)
  //         }

  //         if (invalidDetails.length > 0) {
  //           throw new TRPCError({
  //             code: 'CONFLICT',
  //             message:
  //               'Niektóre urządzenia nie są przypisane do Ciebie lub mają nieprawidłowy status:\n' +
  //               invalidDetails.join('\n'),
  //           })
  //         }

  //         // 3) Create order-equipment relations tylko dla validIds
  //         await tx.oplOrderEquipment.createMany({
  //           data: validIds.map((id) => ({
  //             orderId: input.orderId,
  //             warehouseId: id,
  //           })),
  //         })

  //         // 4) Update statuses
  //         await tx.oplWarehouse.updateMany({
  //           where: {
  //             id: { in: validIds },
  //             NOT: { status: 'COLLECTED_FROM_CLIENT' },
  //           },
  //           data: {
  //             status: 'ASSIGNED_TO_ORDER',
  //             assignedToId: null,
  //             locationId: null,
  //           },
  //         })

  //         await tx.oplWarehouseHistory.createMany({
  //           data: validIds.map((id) => ({
  //             warehouseItemId: id,
  //             action: 'ASSIGNED_TO_ORDER',
  //             performedById: userId,
  //             assignedOrderId: input.orderId,
  //             actionDate: new Date(),
  //           })),
  //         })
  //       }

  //       /* -------------------------------------------------------------------
  //        * 5a  Issue devices to client (SERVICE / OUTAGE) - explicit issuedDevices
  //        * -------------------------------------------------------------------
  //        * - Devices are taken from technician stock.
  //        * - They are linked to the order and detached from technician.
  //        * ------------------------------------------------------------------- */
  //       if (input.issuedDevices?.length) {
  //         const toIssue = await tx.oplWarehouse.findMany({
  //           where: {
  //             id: { in: input.issuedDevices },
  //             assignedToId: userId,
  //             itemType: 'DEVICE',
  //             status: { in: ['AVAILABLE', 'ASSIGNED', 'ASSIGNED_TO_ORDER'] },
  //           },
  //           select: { id: true },
  //         })
  //         if (toIssue.length !== input.issuedDevices.length) {
  //           throw new TRPCError({
  //             code: 'CONFLICT',
  //             message: 'Niektóre wydawane urządzenia nie są na Twoim stanie.',
  //           })
  //         }

  //         // Link issued devices to order
  //         await tx.oplOrderEquipment.createMany({
  //           data: input.issuedDevices.map((id) => ({
  //             orderId: input.orderId,
  //             warehouseId: id,
  //           })),
  //         })

  //         // Detach issued devices from technician and mark as assigned to order
  //         await tx.oplWarehouse.updateMany({
  //           where: { id: { in: input.issuedDevices } },
  //           data: {
  //             status: 'ASSIGNED_TO_ORDER',
  //             assignedToId: null,
  //             locationId: null,
  //           },
  //         })

  //         // History entries for devices issued to client (assigned to order)
  //         await tx.oplWarehouseHistory.createMany({
  //           data: input.issuedDevices.map((id) => ({
  //             warehouseItemId: id,
  //             action: 'ASSIGNED_TO_ORDER', // kept for consistency with existing workflow
  //             performedById: userId,
  //             assignedOrderId: input.orderId,
  //             actionDate: new Date(),
  //           })),
  //         })
  //       }

  //       /* -------------------------------------------------------------------
  //        * 6️⃣  Save devices collected from client (reuse existing if serial exists)
  //        * -------------------------------------------------------------------
  //        */
  //       if (input.collectedDevices?.length) {
  //         for (const device of input.collectedDevices) {
  //           const serial = device.serialNumber?.trim().toUpperCase() ?? null

  //           const technicianId = order.assignedToId ?? userId

  //           const existing = serial
  //             ? await tx.oplWarehouse.findFirst({
  //                 where: {
  //                   itemType: 'DEVICE',
  //                   serialNumber: serial,
  //                 },
  //                 select: {
  //                   id: true,
  //                   name: true,
  //                   category: true,
  //                 },
  //               })
  //             : null

  //           if (existing) {
  //             await tx.oplWarehouse.update({
  //               where: { id: existing.id },
  //               data: {
  //                 name: device.name || existing.name,
  //                 category: device.category ?? existing.category,
  //                 serialNumber: serial,
  //                 status: 'COLLECTED_FROM_CLIENT',
  //                 assignedToId: technicianId,
  //               },
  //             })
  //             await tx.oplOrderEquipment.upsert({
  //               where: {
  //                 orderId_warehouseId: {
  //                   orderId: input.orderId,
  //                   warehouseId: existing.id,
  //                 },
  //               },
  //               create: {
  //                 orderId: input.orderId,
  //                 warehouseId: existing.id,
  //               },
  //               update: {},
  //             })
  //             await tx.oplWarehouseHistory.create({
  //               data: {
  //                 warehouseItemId: existing.id,
  //                 action: 'COLLECTED_FROM_CLIENT',
  //                 performedById: userId,
  //                 assignedToId: technicianId,
  //                 assignedOrderId: input.orderId,
  //                 actionDate: new Date(),
  //               },
  //             })
  //           } else {
  //             const created = await tx.oplWarehouse.create({
  //               data: {
  //                 itemType: 'DEVICE',
  //                 name: device.name,
  //                 category: device.category,
  //                 serialNumber: serial,
  //                 quantity: 1,
  //                 price: 0,
  //                 status: 'COLLECTED_FROM_CLIENT',
  //                 assignedToId: technicianId,
  //               },
  //               select: { id: true },
  //             })

  //             await tx.oplOrderEquipment.create({
  //               data: { orderId: input.orderId, warehouseId: created.id },
  //             })

  //             await tx.oplWarehouseHistory.create({
  //               data: {
  //                 warehouseItemId: created.id,
  //                 action: 'COLLECTED_FROM_CLIENT',
  //                 performedById: userId,
  //                 assignedToId: technicianId,
  //                 assignedOrderId: input.orderId,
  //                 actionDate: new Date(),
  //               },
  //             })
  //           }
  //         }
  //       }

  //       /* -------------------------------------------------------------------
  //        * 7️⃣  Save measurement/services + extra devices
  //        * -------------------------------------------------------------------
  //        * - Clears previous services for this order.
  //        * - Stores NET/DTV/TEL/ATV services with device metadata.
  //        * - Handles extra devices (e.g. additional routers or modems).
  //        * ------------------------------------------------------------------- */
  //       if (input.status === OplOrderStatus.COMPLETED) {
  //         await tx.oplOrderService.deleteMany({
  //           where: { orderId: input.orderId },
  //         })

  //         if (input.services.length) {
  //           const servicesData = await mapServicesWithDeviceTypes(tx, {
  //             orderId: input.orderId,
  //             services: input.services,
  //           })

  //           for (const s of servicesData) {
  //             // Create main service entry (with deviceSource & deviceName support)
  //             const createdService = await tx.oplOrderService.create({
  //               data: {
  //                 orderId: s.orderId,
  //                 type: s.type,
  //                 deviceId: s.deviceId,
  //                 serialNumber: s.serialNumber,
  //                 deviceId2: s.deviceId2,
  //                 serialNumber2: s.serialNumber2,
  //                 deviceType: s.deviceType,
  //                 deviceType2: s.deviceType2,
  //                 deviceSource: s.deviceSource ?? null,
  //                 deviceName: s.deviceName ?? null,
  //                 deviceName2: s.deviceName2 ?? null,
  //                 speedTest: s.speedTest,
  //                 usDbmDown: s.usDbmDown,
  //                 usDbmUp: s.usDbmUp,
  //                 notes: s.notes,
  //               },
  //             })

  //             // Handle extra devices attached to this service (e.g., additional routers)
  //             if (s.extraDevices?.length) {
  //               await tx.oplOrderExtraDevice.createMany({
  //                 data: s.extraDevices.map((ex) => ({
  //                   serviceId: createdService.id,
  //                   warehouseId: ex.id,
  //                   source: ex.source,
  //                   name: ex.name ?? '',
  //                   serialNumber: ex.serialNumber ?? undefined,
  //                   category: ex.category ?? undefined,
  //                 })),
  //               })

  //               // ✅ Mark extra devices taken from technician warehouse as assigned to order
  //               const usedExtraSerials = s.extraDevices
  //                 .filter((ex) => ex.source === 'WAREHOUSE' && ex.serialNumber)
  //                 .map((ex) => ex.serialNumber!.trim().toUpperCase())

  //               if (usedExtraSerials.length > 0) {
  //                 const matched = await tx.oplWarehouse.findMany({
  //                   where: {
  //                     assignedToId: userId,
  //                     itemType: 'DEVICE',
  //                     serialNumber: { in: usedExtraSerials },
  //                     status: { in: ['AVAILABLE', 'ASSIGNED'] },
  //                   },
  //                   select: { id: true },
  //                 })

  //                 if (matched.length) {
  //                   await tx.oplWarehouse.updateMany({
  //                     where: {
  //                       id: { in: matched.map((m) => m.id) },
  //                       NOT: { status: 'COLLECTED_FROM_CLIENT' },
  //                     },
  //                     data: {
  //                       status: 'ASSIGNED_TO_ORDER',
  //                       assignedToId: null, // extra device is now bound to the order, not to technician
  //                       locationId: null,
  //                     },
  //                   })

  //                   await tx.oplWarehouseHistory.createMany({
  //                     data: matched.map((m) => ({
  //                       warehouseItemId: m.id,
  //                       action: 'ASSIGNED_TO_ORDER',
  //                       performedById: userId,
  //                       assignedOrderId: input.orderId,
  //                       actionDate: new Date(),
  //                     })),
  //                   })
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     })

  //     return { success: true, warnings }
  //   }),

  /** ✅ Technician amendment of completed order (≤15 min window) */
  // amendCompletion: loggedInEveryone
  //   .input(
  //     z.object({
  //       orderId: z.string(),
  //       status: z.nativeEnum(OplOrderStatus),
  //       notes: z.string().nullable().optional(),
  //       failureReason: z.string().nullable().optional(),
  //       workCodes: z
  //         .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
  //         .optional(),
  //       equipmentIds: z.array(z.string()).optional(),
  //       usedMaterials: z
  //         .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
  //         .optional(),
  //       collectedDevices: z
  //         .array(
  //           z.object({
  //             name: z.string(),
  //             category: z.nativeEnum(OplDeviceCategory),
  //             serialNumber: z.string().optional(),
  //           })
  //         )
  //         .optional(),
  //       services: z
  //         .array(
  //           z.object({
  //             id: z.string(),
  //             type: z.nativeEnum(OplBaseWorkCode),
  //             deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
  //             deviceName: z.string().optional(),
  //             deviceType: z.nativeEnum(OplDeviceCategory).optional(),
  //             deviceId: z.string().optional(),
  //             serialNumber: z.string().optional(),
  //             deviceId2: z.string().optional(),
  //             deviceName2: z.string().optional(),
  //             serialNumber2: z.string().optional(),
  //             speedTest: z.string().optional(),
  //             usDbmDown: z.coerce.number().optional(),
  //             usDbmUp: z.coerce.number().optional(),
  //             notes: z.string().optional(),
  //             extraDevices: z
  //               .array(
  //                 z.object({
  //                   id: z.string(),
  //                   source: z.enum(['WAREHOUSE', 'CLIENT']),
  //                   category: z.nativeEnum(OplDeviceCategory),
  //                   name: z.string().optional(),
  //                   serialNumber: z.string().optional(),
  //                 })
  //               )
  //               .optional(),
  //           })
  //         )
  //         .default([]),
  //     })
  //   )
  //   .mutation(async ({ input, ctx }) => {
  //     const { id: userId } = getCoreUserOrThrow(ctx)

  //     if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' })

  //     // ⏱ enforce 15-min window + technician ownership
  //     await canTechnicianAmendOrder(prisma, {
  //       orderId: input.orderId,
  //       technicianId: userId,
  //     })

  //     await prisma.$transaction(async (tx) => {
  //       /* -------------------------------------------------------------------
  //        * Step 1️⃣ — Clear previous non-collected equipment, services, work codes
  //        * ------------------------------------------------------------------- */

  //       await tx.oplOrderService.deleteMany({
  //         where: { orderId: input.orderId },
  //       })
  //       await tx.oplOrderSettlementEntry.deleteMany({
  //         where: { orderId: input.orderId },
  //       })

  //       const prevOrder = await tx.oplOrder.findUnique({
  //         where: { id: input.orderId },
  //         select: { status: true },
  //       })

  //       /* -------------------------------------------------------------------
  //        * Step 2️⃣ — Update order fields
  //        * ------------------------------------------------------------------- */
  //       await tx.oplOrder.update({
  //         where: { id: input.orderId },
  //         data: {
  //           status: input.status,
  //           notes: input.notes ?? null,
  //           failureReason:
  //             input.status === OplOrderStatus.NOT_COMPLETED
  //               ? input.failureReason ?? null
  //               : null,
  //         },
  //       })

  //       /* -------------------------------------------------------------------
  //        * Step 3️⃣ — Rewrite work codes
  //        * ------------------------------------------------------------------- */
  //       if (
  //         input.status === OplOrderStatus.COMPLETED &&
  //         input.workCodes?.length
  //       ) {
  //         await tx.oplOrderSettlementEntry.createMany({
  //           data: input.workCodes.map((w) => ({
  //             orderId: input.orderId,
  //             code: w.code,
  //             quantity: w.quantity,
  //           })),
  //         })
  //       }

  //       /* -------------------------------------------------------------------
  //        * Step 4️⃣ — Material reconciliation
  //        * ------------------------------------------------------------------- */
  //       await reconcileOrderMaterials({
  //         tx,
  //         orderId: input.orderId,
  //         technicianId: userId,
  //         editorId: userId,
  //         newMaterials: input.usedMaterials ?? [],
  //       })

  //       /* -------------------------------------------------------------------
  //        * Step 5️⃣ — Equipment delta (technician)
  //        * -------------------------------------------------------------------
  //        * Only change: technician cannot add devices not assigned to him.
  //        * processEquipmentDelta enforces this automatically.
  //        * ------------------------------------------------------------------- */
  //       await processEquipmentDelta({
  //         tx,
  //         orderId: input.orderId,
  //         newEquipmentIds: input.equipmentIds ?? [],
  //         technicianId: userId,
  //         editorId: userId,
  //         mode: 'AMEND',
  //       })

  //       /* -------------------------------------------------------------------
  //        * Step 6️⃣ — Collected devices rollback (identical to admin-edit)
  //        * -------------------------------------------------------------------
  //        * Technician must:
  //        *   - remove wrongly collected devices
  //        *   - add new collected devices
  //        *   - rollback system state if he removes collected device
  //        *
  //        * EXACTLY the same logic as admin-edit.
  //        * ------------------------------------------------------------------- */

  //       const normalizeSerial = (serial?: string | null): string | null => {
  //         if (!serial) return null
  //         const s = serial.trim().toUpperCase()
  //         return s.length ? s : null
  //       }

  //       const prevCollected = await tx.oplWarehouse.findMany({
  //         where: {
  //           itemType: 'DEVICE',
  //           status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
  //           orderAssignments: { some: { orderId: input.orderId } },
  //         },
  //         select: { id: true, serialNumber: true },
  //       })

  //       const prevCollectedBySerial = new Map(
  //         prevCollected
  //           .map((d) => [normalizeSerial(d.serialNumber), d.id] as const)
  //           .filter(([s]) => s !== null)
  //       )

  //       const newCollected = input.collectedDevices ?? []
  //       const newSerials = new Set(
  //         newCollected
  //           .map((d) => normalizeSerial(d.serialNumber))
  //           .filter((s): s is string => s !== null)
  //       )

  //       // 🔥 removed collected devices
  //       const removedCollectedIds = [...prevCollectedBySerial.entries()]
  //         .filter(([serial]) => !newSerials.has(serial!))
  //         .map(([, id]) => id)

  //       for (const wid of removedCollectedIds) {
  //         // unlink
  //         await tx.oplOrderEquipment.deleteMany({
  //           where: { orderId: input.orderId, warehouseId: wid },
  //         })

  //         const lastCollected = await tx.oplWarehouseHistory.findFirst({
  //           where: {
  //             warehouseItemId: wid,
  //             action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
  //             assignedOrderId: input.orderId,
  //           },
  //           orderBy: { actionDate: 'desc' },
  //         })

  //         if (!lastCollected) continue

  //         // remove history for this collection
  //         await tx.oplWarehouseHistory.deleteMany({
  //           where: {
  //             warehouseItemId: wid,
  //             action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
  //             assignedOrderId: input.orderId,
  //             actionDate: lastCollected.actionDate,
  //           },
  //         })

  //         const previousState = await tx.oplWarehouseHistory.findFirst({
  //           where: {
  //             warehouseItemId: wid,
  //             actionDate: { lt: lastCollected.actionDate },
  //           },
  //           orderBy: { actionDate: 'desc' },
  //         })

  //         if (!previousState) {
  //           // delete temporary device
  //           await tx.oplWarehouseHistory.deleteMany({
  //             where: { warehouseItemId: wid },
  //           })
  //           await tx.oplWarehouse.delete({ where: { id: wid } })
  //         } else {
  //           let restoredStatus: OplWarehouseStatus

  //           switch (previousState.action) {
  //             case OplWarehouseAction.RETURNED_TO_TECHNICIAN:
  //               restoredStatus = OplWarehouseStatus.ASSIGNED
  //               break
  //             case OplWarehouseAction.RETURNED:
  //             case OplWarehouseAction.RECEIVED:
  //               restoredStatus = OplWarehouseStatus.AVAILABLE
  //               break
  //             default:
  //               restoredStatus = OplWarehouseStatus.ASSIGNED_TO_ORDER
  //               break
  //           }

  //           await tx.oplWarehouse.update({
  //             where: { id: wid },
  //             data: {
  //               status: restoredStatus,
  //               assignedToId: previousState.assignedToId ?? null,
  //               ...(previousState.assignedToId ? { locationId: null } : {}),
  //             },
  //           })
  //         }
  //       }

  //       // 🔥 add/update collected devices
  //       for (const d of newCollected) {
  //         const serial = normalizeSerial(d.serialNumber)
  //         let wid: string | null = null

  //         const exists = serial
  //           ? await tx.oplWarehouse.findFirst({
  //               where: { serialNumber: serial },
  //               select: { id: true },
  //             })
  //           : null

  //         if (exists) {
  //           wid = exists.id

  //           await tx.oplWarehouse.update({
  //             where: { id: wid },
  //             data: {
  //               name: d.name,
  //               category: d.category,
  //               serialNumber: serial,
  //               status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
  //               assignedToId: userId,
  //               locationId: null,
  //               history: {
  //                 create: {
  //                   action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
  //                   performedById: userId,
  //                   assignedOrderId: input.orderId,
  //                   assignedToId: userId,
  //                 },
  //               },
  //             },
  //           })
  //         } else {
  //           const created = await tx.oplWarehouse.create({
  //             data: {
  //               itemType: 'DEVICE',
  //               name: d.name,
  //               category: d.category,
  //               serialNumber: serial,
  //               quantity: 1,
  //               price: 0,
  //               status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
  //               assignedToId: userId,
  //             },
  //             select: { id: true },
  //           })

  //           wid = created.id

  //           await tx.oplWarehouseHistory.create({
  //             data: {
  //               warehouseItemId: wid,
  //               action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
  //               performedById: userId,
  //               assignedOrderId: input.orderId,
  //               assignedToId: userId,
  //             },
  //           })
  //         }

  //         await tx.oplOrderEquipment.upsert({
  //           where: {
  //             orderId_warehouseId: {
  //               orderId: input.orderId,
  //               warehouseId: wid!,
  //             },
  //           },
  //           create: { orderId: input.orderId, warehouseId: wid! },
  //           update: {},
  //         })
  //       }

  //       /* -------------------------------------------------------------------
  //        * Step 7️⃣ — Services and extra devices
  //        * ------------------------------------------------------------------- */
  //       if (
  //         input.status === OplOrderStatus.COMPLETED &&
  //         input.services.length
  //       ) {
  //         const servicesData = await mapServicesWithDeviceTypes(tx, {
  //           orderId: input.orderId,
  //           services: input.services,
  //         })

  //         for (const s of servicesData) {
  //           const created = await tx.oplOrderService.create({
  //             data: {
  //               orderId: s.orderId,
  //               type: s.type,
  //               deviceId: s.deviceId,
  //               serialNumber: s.serialNumber,
  //               deviceId2: s.deviceId2,
  //               serialNumber2: s.serialNumber2,
  //               deviceName2: s.deviceName2,
  //               deviceType: s.deviceType,
  //               deviceType2: s.deviceType2,
  //               deviceSource: s.deviceSource ?? null,
  //               deviceName: s.deviceName ?? null,
  //               speedTest: s.speedTest,
  //               usDbmDown: s.usDbmDown,
  //               usDbmUp: s.usDbmUp,
  //               notes: s.notes,
  //             },
  //           })

  //           if (s.extraDevices?.length) {
  //             await tx.oplOrderExtraDevice.createMany({
  //               data: s.extraDevices.map((ex) => ({
  //                 serviceId: created.id,
  //                 warehouseId: ex.id,
  //                 source: ex.source,
  //                 name: ex.name ?? '',
  //                 serialNumber: ex.serialNumber ?? undefined,
  //                 category: ex.category,
  //               })),
  //             })
  //           }
  //         }
  //       }

  //       /* -------------------------------------------------------------------
  //        * Step 8️⃣ — Log amendment
  //        * ------------------------------------------------------------------- */
  //       await tx.oplOrderHistory.create({
  //         data: {
  //           orderId: input.orderId,
  //           statusBefore: prevOrder?.status ?? OplOrderStatus.PENDING,
  //           statusAfter: input.status,
  //           changedById: userId,
  //           notes: 'Zlecenie edytowane przez technika.',
  //         },
  //       })
  //     })

  //     return { success: true }
  //   }),

  /** 🛠️ Admin/Coordinator edit of completed order (full stock + history sync) */
  // adminEditCompletion: adminOrCoord
    // .input(
    //   z.object({
    //     orderId: z.string(),
    //     status: z.nativeEnum(OplOrderStatus),
    //     notes: z.string().nullable().optional(),
    //     failureReason: z.string().nullable().optional(),
    //     workCodes: z
    //       .array(z.object({ code: z.string(), quantity: z.number().min(1) }))
    //       .optional(),
    //     equipmentIds: z.array(z.string()).optional(),
    //     usedMaterials: z
    //       .array(z.object({ id: z.string(), quantity: z.number().min(1) }))
    //       .optional(),
    //     collectedDevices: z
    //       .array(
    //         z.object({
    //           name: z.string(),
    //           category: z.nativeEnum(OplDeviceCategory),
    //           serialNumber: z.string().optional(),
    //         })
    //       )
    //       .optional(),
    //     services: z
    //       .array(
    //         z.object({
    //           id: z.string(),
    //           type: z.nativeEnum(OplBaseWorkCode),
    //           deviceSource: z.enum(['WAREHOUSE', 'CLIENT']).optional(),
    //           deviceName: z.string().optional(),
    //           deviceType: z.nativeEnum(OplDeviceCategory).optional(),
    //           deviceId: z.string().optional(),
    //           serialNumber: z.string().optional(),
    //           deviceId2: z.string().optional(),
    //           deviceName2: z.string().optional(),
    //           serialNumber2: z.string().optional(),
    //           speedTest: z.string().optional(),
    //           usDbmDown: z.coerce.number().optional(),
    //           usDbmUp: z.coerce.number().optional(),
    //           notes: z.string().optional(),
    //           extraDevices: z
    //             .array(
    //               z.object({
    //                 id: z.string(),
    //                 source: z.enum(['WAREHOUSE', 'CLIENT']),
    //                 category: z.nativeEnum(OplDeviceCategory),
    //                 name: z.string().optional(),
    //                 serialNumber: z.string().optional(),
    //               })
    //             )
    //             .optional(),
    //         })
    //       )
    //       .default([]),
    //   })
    // )
    // .mutation(async ({ input, ctx }) => {
    //   const adminId = ctx.user?.id
    //   const adminName = ctx.user?.name
    //   if (!adminId) throw new TRPCError({ code: 'UNAUTHORIZED' })

    //   await prisma.$transaction(async (tx) => {
    //     /* -------------------------------------------------------------------
    //      * Step 1️⃣ — Clear ALL order-related records
    //      * -------------------------------------------------------------------
    //      * Removing old materials, services, equipment, settlement entries.
    //      * This endpoint ALWAYS rebuilds the final state fully.
    //      * ------------------------------------------------------------------- */
    //     await tx.oplOrderService.deleteMany({
    //       where: { orderId: input.orderId },
    //     })
    //     await tx.oplOrderSettlementEntry.deleteMany({
    //       where: { orderId: input.orderId },
    //     })

    //     /* -------------------------------------------------------------------
    //      * Step 2️⃣ — Load previous order info
    //      * ------------------------------------------------------------------- */
    //     const previous = await tx.oplOrder.findUnique({
    //       where: { id: input.orderId },
    //       select: { status: true, assignedToId: true, type: true },
    //     })

    //     const assignedTechId = previous?.assignedToId ?? null

    //     /* -------------------------------------------------------------------
    //      * Step 3️⃣ — Update main order fields
    //      * ------------------------------------------------------------------- */
    //     await tx.oplOrder.update({
    //       where: { id: input.orderId },
    //       data: {
    //         status: input.status,
    //         notes: input.notes ?? null,
    //         failureReason:
    //           input.status === OplOrderStatus.NOT_COMPLETED
    //             ? input.failureReason ?? null
    //             : null,
    //         closedAt:
    //           previous?.type === OplOrderType.INSTALLATION
    //             ? undefined
    //             : new Date(),
    //       },
    //     })

    //     /* -------------------------------------------------------------------
    //      * Step 4️⃣ — Apply work codes
    //      * ------------------------------------------------------------------- */
    //     if (
    //       input.status === OplOrderStatus.COMPLETED &&
    //       input.workCodes?.length
    //     ) {
    //       await tx.oplOrderSettlementEntry.createMany({
    //         data: input.workCodes.map((w) => ({
    //           orderId: input.orderId,
    //           code: w.code,
    //           quantity: w.quantity,
    //         })),
    //       })
    //     }
    //     /* -------------------------------------------------------------------
    //      * Step 5️⃣ — Reconcile material usage (admin full rewrite)
    //      * -------------------------------------------------------------------
    //      */
    //     await reconcileOrderMaterials({
    //       tx,
    //       orderId: input.orderId,
    //       technicianId: assignedTechId,
    //       editorId: adminId,
    //       newMaterials: input.usedMaterials ?? [],
    //     })

    //     /* -------------------------------------------------------------------
    //      * Step 6️⃣ — HANDLE EQUIPMENT
    //      * -------------------------------------------------------------------
    //      * Main rule:
    //      *  • all new equipment → ASSIGNED_TO_ORDER + assignedToId = null
    //      *  • removed equipment → returned to previous owner using WarehouseHistory
    //      * ------------------------------------------------------------------- */

    //     await processEquipmentDelta({
    //       tx,
    //       orderId: input.orderId,
    //       newEquipmentIds: input.equipmentIds ?? [],
    //       technicianId: assignedTechId,
    //       editorId: adminId,
    //       mode: 'ADMIN',
    //     })
    //     /* -------------------------------------------------------------------
    //      * Step 7️⃣ — Sync collected devices (returned from client) — SAFE VERSION
    //      * ------------------------------------------------------------------- */

    //     // Helper to normalize serial numbers (consistent comparisons)
    //     const normalizeSerial = (
    //       serial: string | null | undefined
    //     ): string | null => {
    //       if (!serial) return null
    //       const trimmed = serial.trim()
    //       return trimmed.length === 0 ? null : trimmed.toUpperCase()
    //     }

    //     const assignedTechIdForCollected = previous?.assignedToId ?? null

    //     // 1️⃣ Previously collected devices for this order
    //     const prevCollectedDevices = await tx.oplWarehouse.findMany({
    //       where: {
    //         itemType: 'DEVICE',
    //         status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
    //         orderAssignments: { some: { orderId: input.orderId } },
    //       },
    //       select: {
    //         id: true,
    //         serialNumber: true,
    //       },
    //     })

    //     const prevCollectedBySerial = new Map<string, string>() // serial → warehouseId
    //     for (const dev of prevCollectedDevices) {
    //       const normalized = normalizeSerial(dev.serialNumber)
    //       if (normalized) {
    //         prevCollectedBySerial.set(normalized, dev.id)
    //       }
    //     }

    //     // 2️⃣ Current list of collected devices from input
    //     const collectedInput = input.collectedDevices ?? []

    //     const newSerials = collectedInput
    //       .map((d) => normalizeSerial(d.serialNumber))
    //       .filter((s): s is string => s !== null)

    //     const newSerialSet = new Set<string>(newSerials)

    //     // 3️⃣ Calculate which previously collected devices were REMOVED
    //     const removedCollectedIds: string[] = []
    //     for (const [serial, warehouseId] of prevCollectedBySerial.entries()) {
    //       if (!newSerialSet.has(serial)) {
    //         removedCollectedIds.push(warehouseId)
    //       }
    //     }

    //     // 3a️⃣ Rollback for removed collected devices
    //     for (const wid of removedCollectedIds) {
    //       // a) Unlink device from current order
    //       await tx.oplOrderEquipment.deleteMany({
    //         where: {
    //           orderId: input.orderId,
    //           warehouseId: wid,
    //         },
    //       })

    //       // b) Find last COLLECTED_FROM_CLIENT entry for THIS order
    //       const lastCollected = await tx.oplWarehouseHistory.findFirst({
    //         where: {
    //           warehouseItemId: wid,
    //           action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
    //           assignedOrderId: input.orderId,
    //         },
    //         orderBy: { actionDate: 'desc' },
    //       })

    //       if (!lastCollected) {
    //         // No matching history → nothing more to rollback
    //         continue
    //       }

    //       // c) Remove COLLECTED_FROM_CLIENT history entry for this order
    //       await tx.oplWarehouseHistory.deleteMany({
    //         where: {
    //           warehouseItemId: wid,
    //           action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
    //           assignedOrderId: input.orderId,
    //           actionDate: lastCollected.actionDate,
    //         },
    //       })

    //       // d) Find history BEFORE this collection (previous state snapshot)
    //       const previousHistory = await tx.oplWarehouseHistory.findFirst({
    //         where: {
    //           warehouseItemId: wid,
    //           actionDate: { lt: lastCollected.actionDate },
    //         },
    //         orderBy: { actionDate: 'desc' },
    //       })

    //       if (!previousHistory) {
    //         // Device existed ONLY as collected on this order → safe to remove
    //         await tx.oplWarehouseHistory.deleteMany({
    //           where: { warehouseItemId: wid },
    //         })
    //         await tx.oplWarehouse.delete({
    //           where: { id: wid },
    //         })
    //       } else {
    //         // Device existed earlier (e.g. issued to client) → restore previous state

    //         let restoredStatus: OplWarehouseStatus

    //         switch (previousHistory.action) {
    //           case OplWarehouseAction.RETURNED_TO_TECHNICIAN:
    //             restoredStatus = OplWarehouseStatus.ASSIGNED
    //             break
    //           case OplWarehouseAction.RETURNED:
    //           case OplWarehouseAction.RETURNED_TO_OPERATOR:
    //           case OplWarehouseAction.RECEIVED:
    //             restoredStatus = OplWarehouseStatus.AVAILABLE
    //             break
    //           case OplWarehouseAction.TRANSFER:
    //             // After transfer we still treat device as assigned to someone/location
    //             restoredStatus = OplWarehouseStatus.ASSIGNED
    //             break
    //           default:
    //             // ASSIGNED_TO_ORDER / ISSUED / ISSUED_TO_CLIENT etc.
    //             // For your domain this means "still at client (issued from previous order)".
    //             restoredStatus = OplWarehouseStatus.ASSIGNED_TO_ORDER
    //             break
    //         }

    //         await tx.oplWarehouse.update({
    //           where: { id: wid },
    //           data: {
    //             status: restoredStatus,
    //             assignedToId: previousHistory.assignedToId ?? null,
    //             // When assigning back to a user keep location null
    //             ...(previousHistory.assignedToId ? { locationId: null } : {}),
    //           },
    //         })
    //       }
    //     }

    //     // 4️⃣ Apply current collected devices from input (create / update)
    //     for (const d of collectedInput) {
    //       const normalizedSerial = normalizeSerial(d.serialNumber)
    //       let warehouseId: string

    //       // Try to reuse any existing device with this serial (system device)
    //       let existing: { id: string } | null = null
    //       if (normalizedSerial) {
    //         existing = await tx.oplWarehouse.findFirst({
    //           where: {
    //             itemType: 'DEVICE',
    //             serialNumber: normalizedSerial,
    //           },
    //           select: { id: true },
    //         })
    //       }

    //       if (existing) {
    //         warehouseId = existing.id

    //         await tx.oplWarehouse.update({
    //           where: { id: warehouseId },
    //           data: {
    //             name: d.name,
    //             category: d.category,
    //             serialNumber: normalizedSerial,
    //             status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
    //             assignedToId: assignedTechIdForCollected,
    //             locationId: null,
    //             history: {
    //               create: {
    //                 action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
    //                 performedById: adminId,
    //                 assignedOrderId: input.orderId,
    //                 assignedToId: assignedTechIdForCollected,
    //               },
    //             },
    //           },
    //         })
    //       } else {
    //         // Client device not known before → create new collected device
    //         const created = await tx.oplWarehouse.create({
    //           data: {
    //             itemType: 'DEVICE',
    //             name: d.name,
    //             category: d.category,
    //             serialNumber: normalizedSerial,
    //             quantity: 1,
    //             price: 0,
    //             status: OplWarehouseStatus.COLLECTED_FROM_CLIENT,
    //             assignedToId: assignedTechIdForCollected,
    //           },
    //           select: { id: true },
    //         })

    //         warehouseId = created.id

    //         await tx.oplWarehouseHistory.create({
    //           data: {
    //             warehouseItemId: warehouseId,
    //             action: OplWarehouseAction.COLLECTED_FROM_CLIENT,
    //             performedById: adminId,
    //             assignedOrderId: input.orderId,
    //             assignedToId: assignedTechIdForCollected,
    //           },
    //         })
    //       }

    //       // Always ensure relation with current order
    //       await tx.oplOrderEquipment.upsert({
    //         where: {
    //           orderId_warehouseId: {
    //             orderId: input.orderId,
    //             warehouseId,
    //           },
    //         },
    //         create: {
    //           orderId: input.orderId,
    //           warehouseId,
    //         },
    //         update: {},
    //       })
    //     }

    //     /* -------------------------------------------------------------------
    //      * Step 8️⃣ — Recreate services and their extra devices
    //      * ------------------------------------------------------------------- */
    //     if (
    //       input.status === OplOrderStatus.COMPLETED &&
    //       input.services.length
    //     ) {
    //       const servicesData = await mapServicesWithDeviceTypes(tx, {
    //         orderId: input.orderId,
    //         services: input.services,
    //       })

    //       const prevServices = await tx.oplOrderService.findMany({
    //         where: { orderId: input.orderId },
    //       })

    //       for (const s of servicesData) {
    //         const old = prevServices.find((ps) => ps.id === s.id)

    //         const createdService = await tx.oplOrderService.create({
    //           data: {
    //             orderId: s.orderId,
    //             type: s.type,

    //             deviceId: s.deviceId,
    //             serialNumber: s.serialNumber,

    //             deviceId2: s.deviceId2,
    //             serialNumber2: s.serialNumber2,

    //             deviceType: s.deviceType,
    //             deviceType2: s.deviceType2,

    //             deviceSource: s.deviceSource ?? null,
    //             deviceName: s.deviceName ?? null,
    //             deviceName2: s.deviceName2 ?? null,

    //             speedTest: s.speedTest ?? old?.speedTest ?? null,
    //             usDbmDown: s.usDbmDown ?? old?.usDbmDown ?? null,
    //             usDbmUp: s.usDbmUp ?? old?.usDbmUp ?? null,
    //             notes: s.notes ?? old?.notes ?? null,
    //           },
    //         })

    //         if (s.extraDevices?.length) {
    //           await tx.oplOrderExtraDevice.createMany({
    //             data: s.extraDevices.map((ex) => ({
    //               serviceId: createdService.id,
    //               warehouseId: ex.id,
    //               source: ex.source,
    //               name: ex.name ?? '',
    //               serialNumber: ex.serialNumber ?? undefined,
    //               category: ex.category ?? undefined,
    //             })),
    //           })

    //           const usedSerials = s.extraDevices
    //             .filter((ex) => ex.source === 'WAREHOUSE' && ex.serialNumber)
    //             .map((ex) => ex.serialNumber!.trim().toUpperCase())

    //           if (usedSerials.length > 0) {
    //             const matched = await tx.oplWarehouse.findMany({
    //               where: {
    //                 itemType: 'DEVICE',
    //                 serialNumber: { in: usedSerials },
    //                 status: { in: ['AVAILABLE', 'ASSIGNED'] },
    //               },
    //             })

    //             await tx.oplWarehouse.updateMany({
    //               where: { id: { in: matched.map((m) => m.id) } },
    //               data: {
    //                 status: 'ASSIGNED_TO_ORDER',
    //                 assignedToId: null,
    //                 locationId: null,
    //               },
    //             })

    //             await tx.oplWarehouseHistory.createMany({
    //               data: matched.map((m) => ({
    //                 warehouseItemId: m.id,
    //                 action: 'ASSIGNED_TO_ORDER',
    //                 performedById: adminId,
    //                 assignedOrderId: input.orderId,
    //                 actionDate: new Date(),
    //               })),
    //             })
    //           }
    //         }
    //       }
    //     }

    //     /* -------------------------------------------------------------------
    //      * Step 9️⃣ — Log order edit in oplOrderHistory
    //      * ------------------------------------------------------------------- */
    //     await tx.oplOrderHistory.create({
    //       data: {
    //         orderId: input.orderId,
    //         statusBefore: previous?.status ?? OplOrderStatus.PENDING,
    //         statusAfter: input.status,
    //         changedById: adminId,
    //         notes: `Zlecenie edytowane przez administratora lun koordynatora ${adminName}`,
    //       },
    //     })
    //   })

    //   return { success: true }
    // }),

  createAddressNote: loggedInEveryone
    .use(requireOplModule)
    .input(
      z.object({
        orderId: z.string().uuid(),
        note: z.string().trim().min(3).max(2000),
        buildingScope: z.string().trim().max(120).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const order = await ctx.prisma.oplOrder.findUnique({
        where: { id: input.orderId },
        select: {
          city: true,
          street: true,
        },
      })

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Zlecenie nie istnieje',
        })
      }

      const cityNorm = normalizeAddressToken(order.city)
      const streetNorm = normalizeAddressToken(order.street)
      const buildingScope = resolveBuildingScope(input.buildingScope, order.street)

      const created = await createAddressNoteRecord({
        prisma: ctx.prisma,
        city: order.city,
        street: order.street,
        cityNorm,
        streetNorm,
        buildingScope,
        note: input.note,
        createdById: userId,
      })

      return {
        id: created.id,
        city: created.city,
        street: created.street,
        note: created.note,
        buildingScope: created.buildingScope,
        createdAt: created.createdAt,
        createdBy: created.createdBy,
      }
    }),
})
