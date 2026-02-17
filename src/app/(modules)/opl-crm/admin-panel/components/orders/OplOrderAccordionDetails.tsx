'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { OplIssuedItemDevice } from '@/types/opl-crm'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { IoCheckmarkDone } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { toast } from 'sonner'
import CompleteOplOrderWizard from '../../../(technician)/components/orders/completeOrder/CompleteOplOrderWizard'
import OplOrderDetailsContent from '../../../components/order/OplOrderDetailsContent'
import { CompleteOplOrderProvider } from '../../../utils/context/order/CompleteOplOrderContext'
import OplOrderTimeline from '../order/OplOrderTimeline'

type Props = { order: { id: string } }

/**
 * OplOrderAccordionDetails (Admin/Coordinator view)
 *
 * Displays full order details inside accordion row.
 * - Admin/coordinator can:
 *   • approve completed SERVICE/OUTAGE orders,
 *   • re-edit finished orders (no time limit),
 * - Merges technician stock with devices assigned directly to the order
 *   to avoid missing serial numbers during admin edit.
 */
const OplOrderAccordionDetails = ({ order }: Props) => {
  /** Local state for admin edit modal */
  const [openEdit, setOpenEdit] = useState<boolean>(false)

  /** tRPC utils used for post-mutation invalidation */
  const utils = trpc.useUtils()
  /** Role flags (used to control available actions) */
  const { isWarehouseman, isAdmin, isCoordinator } = useRole()
  /** Current session, used to append user name in approval notes */
  const session = useSession()

  /** Mutation used to update order (for "Zatwierdź") */
  const editOrder = trpc.opl.order.editOrder.useMutation()

  /* ---------------- Fetch order details (base) ---------------- */
  const { data, isLoading, isError } = trpc.opl.order.getOrderById.useQuery({
    id: order.id,
  })

  const primaryAssignment = data?.assignments?.[0]
  const secondaryAssignment = data?.assignments?.[1]

  const primaryTechnicianId = primaryAssignment?.technicianId ?? 'self'
  const secondaryTechnicianId = secondaryAssignment?.technicianId
  const hasSecondTechnician =
    Boolean(secondaryTechnicianId) &&
    secondaryTechnicianId !== primaryTechnicianId

  const primarySourceLabel = primaryAssignment
    ? `Stan technika: ${primaryAssignment.technician.user.name}`
    : 'Stan technika'
  const secondarySourceLabel = secondaryAssignment
    ? `Stan technika: ${secondaryAssignment.technician.user.name}`
    : null

  /* ---------------- Fetch dictionaries / stock ---------------- */
  // NOTE: these hooks must stay at the top-level to preserve hook order
  const { data: materialDefs } =
    trpc.opl.settings.getAllOplMaterialDefinitions.useQuery()
  const { data: rawPrimaryMaterials } =
    trpc.opl.warehouse.getTechnicianStock.useQuery(
      {
        technicianId: primaryTechnicianId,
        itemType: 'MATERIAL',
      },
      {
        enabled: Boolean(data),
      }
    )
  const { data: rawSecondaryMaterials } =
    trpc.opl.warehouse.getTechnicianStock.useQuery(
      {
        technicianId: secondaryTechnicianId ?? 'self',
        itemType: 'MATERIAL',
      },
      {
        enabled: Boolean(data && hasSecondTechnician),
      }
    )

  const { data: rawPrimaryDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: primaryTechnicianId,
      itemType: 'DEVICE',
    },
    {
      enabled: Boolean(data),
    }
  )
  const { data: rawSecondaryDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: secondaryTechnicianId ?? 'self',
      itemType: 'DEVICE',
    },
    {
      enabled: Boolean(data && hasSecondTechnician),
    }
  )
  const { data: workCodeDefs } = trpc.opl.settings.getAllOplRates.useQuery()

  /* ---------------- Loading / error states ---------------- */
  if (isLoading || !data) {
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 text-destructive">
        Nie udało się załadować szczegółów zlecenia.
      </div>
    )
  }

  if (
    !materialDefs ||
    rawPrimaryMaterials === undefined ||
    rawPrimaryDevices === undefined ||
    (hasSecondTechnician &&
      (rawSecondaryMaterials === undefined || rawSecondaryDevices === undefined)) ||
    workCodeDefs === undefined
  ) {
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )
  }

  /* ---------------- Data preparation (no extra hooks) ---------------- */

  // Check if order was already approved by admin
  const isConfirmed =
    data.notes?.toLowerCase().includes('zatwierdzone przez') ?? false

  // Technician materials mapped to wizard's structure
  const techMaterials = [
    ...(rawPrimaryMaterials ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      materialDefinitionId: m.materialDefinitionId ?? '',
      quantity: m.quantity ?? 0,
      sourceLabel: primarySourceLabel,
      type: 'MATERIAL' as const,
    })),
    ...((rawSecondaryMaterials ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      materialDefinitionId: m.materialDefinitionId ?? '',
      quantity: m.quantity ?? 0,
      sourceLabel: secondarySourceLabel ?? undefined,
      type: 'MATERIAL' as const,
    })) ?? []),
  ]

  // Devices from technician stock (normal case)
  const technicianDevices = [rawPrimaryDevices ?? [], rawSecondaryDevices ?? []]
    .flatMap((rows, index) => {
      const sourceLabel =
        index === 0 ? primarySourceLabel : (secondarySourceLabel ?? undefined)

      return rows.map((row) => ({ ...row, sourceLabel }))
    })
    .filter(
      (d): d is typeof d & { serialNumber: string } =>
        typeof d.serialNumber === 'string'
    )
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category ?? 'OTHER',
      deviceDefinitionId: d.deviceDefinitionId ?? null,
      status: d.status,
      sourceLabel: d.sourceLabel,
      type: 'DEVICE' as const,
    }))

  // Devices already assigned directly to this order (ASSIGNED_TO_ORDER) – we must show them too
  const devicesFromOrder = (data.assignedEquipment ?? [])
    .map((ae) => ae.warehouse)
    .filter(
      (w): w is NonNullable<typeof w> & { serialNumber: string } =>
        !!w &&
        typeof w.serialNumber === 'string' &&
        w.status === 'ASSIGNED_TO_ORDER'
    )
    .map((w) => ({
      id: w.id,
      name: w.name,
      serialNumber: w.serialNumber,
      category: w.category ?? 'OTHER',
      deviceDefinitionId: w.deviceDefinitionId ?? null,
      status: w.status,
      sourceLabel: 'Pozycja przypisana w zleceniu',
      type: 'DEVICE' as const,
    }))

  // Merge technician devices with devices assigned to the order
  // and remove possible duplicates by serial number.
  const allDevices: OplIssuedItemDevice[] = (() => {
    const merged: OplIssuedItemDevice[] = [
      ...technicianDevices,
      ...devicesFromOrder,
    ]

    const unique: OplIssuedItemDevice[] = []
    const seen = new Set<string>()

    for (const dev of merged) {
      const sn = dev.serialNumber
      if (!sn) {
        unique.push(dev)
        continue
      }
      if (!seen.has(sn)) {
        seen.add(sn)
        unique.push(dev)
      }
    }

    return unique
  })()

  /* ---------------- Logic flags ---------------- */
  const canApprove =
    (isAdmin || isCoordinator) &&
    (data.type === 'SERVICE' || data.type === 'OUTAGE') &&
    data.status === OplOrderStatus.COMPLETED &&
    !isConfirmed

  const canAdminEdit =
    (isAdmin || isCoordinator) &&
    (data.status === OplOrderStatus.COMPLETED ||
      data.status === OplOrderStatus.NOT_COMPLETED)

  /* ---------------- Render ---------------- */
  return (
    <div className="flex gap-6">
      {/* -------- LEFT COLUMN: main content -------- */}
      <div className="space-y-4 flex-1">
        <h3 className="text-base font-semibold mb-2">Informacja o zleceniu</h3>
        <OplOrderDetailsContent
          order={data}
          isConfirmed={isConfirmed}
          amountMode="full"
          showTechnicianBreakdown
        />

        {(canAdminEdit || canApprove) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {canAdminEdit && !isWarehouseman && (
              <Button
                variant="warning"
                onClick={() => {
                  utils.opl.order.getOrderById.invalidate({ id: order.id })
                  setOpenEdit(true)
                }}
              >
                <MdEdit className="mr-1" />
                Edytuj zakończone zlecenie
              </Button>
            )}

            {canApprove && (
              <Button
                variant="success"
                onClick={async () => {
                  try {
                    const now = new Date()
                    const dateFormatted = formatDateTime(now)
                    const updatedNotes = `${
                      data.notes ? data.notes + '\n' : ''
                    }Zatwierdzone przez ${
                      session.data?.user?.name
                    } (${dateFormatted})`

                    await editOrder.mutateAsync({
                      id: data.id,
                      operator: data.operator,
                      serviceId: data.serviceId ?? undefined,
                      type: data.type,
                      notes: updatedNotes,
                      orderNumber: data.orderNumber,
                      date: data.date.toISOString().split('T')[0],
                      timeSlot: data.timeSlot,
                      status: data.status,
                      city: data.city,
                      street: data.street,
                      assignedTechnicianIds: data.assignments
                        .map((a) => a.technicianId)
                        .slice(0, 2),
                    })

                    toast.success('Zlecenie zostało zatwierdzone.')
                    await utils.opl.order.getOrderById.invalidate({
                      id: data.id,
                    })
                    await utils.opl.order.getOrders.invalidate()
                  } catch {
                    toast.error('Nie udało się zatwierdzić zlecenia.')
                  }
                }}
              >
                <IoCheckmarkDone className="mr-1" />
                Zatwierdź
              </Button>
            )}
          </div>
        )}

        <CompleteOplOrderProvider orderId={data.id}>
          <CompleteOplOrderWizard
            key={order.id}
            open={openEdit}
            onCloseAction={async () => {
              setOpenEdit(false)
              await utils.opl.order.getOrders.invalidate()
              await utils.opl.order.getOrderById.invalidate({ id: order.id })
            }}
            order={data}
            orderType={data.type}
            materialDefs={materialDefs}
            techMaterials={techMaterials}
            devices={allDevices}
            mode="adminEdit"
            workCodeDefs={workCodeDefs}
          />
        </CompleteOplOrderProvider>
      </div>

      <Separator className="h-auto" orientation="vertical" />

      {/* -------- RIGHT COLUMN: timeline -------- */}
      <div className="flex-1">
        <h3 className="text-base font-semibold mb-2">Historia zlecenia</h3>
        <OplOrderTimeline order={data} />
      </div>
    </div>
  )
}

export default OplOrderAccordionDetails
