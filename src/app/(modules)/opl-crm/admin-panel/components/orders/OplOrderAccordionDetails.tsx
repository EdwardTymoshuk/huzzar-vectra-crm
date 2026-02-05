'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { IoCheckmarkDone } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { toast } from 'sonner'
import OplOrderDetailsContent from '../../../components/order/OplOrderDetailsContent'
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
  /** tRPC utils used for post-mutation invalidation */
  const utils = trpc.useUtils()

  /** Local state for admin edit modal */
  const [openEdit, setOpenEdit] = useState<boolean>(false)

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

  /* ---------------- Fetch dictionaries / stock ---------------- */
  // NOTE: these hooks must stay at the top-level to preserve hook order
  const { data: materialDefs } = trpc.opl.materialDefinition.getAll.useQuery()
  const { data: rawMaterials } = trpc.opl.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: data?.assignedToId ?? 'self',
      itemType: 'MATERIAL',
    }
  )
  const { data: rawDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery({
    technicianId: data?.assignedToId ?? 'self',
    itemType: 'DEVICE',
  })
  const { data: workCodeDefs } = trpc.opl.rateDefinition.getAllRates.useQuery()

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
    rawMaterials === undefined ||
    rawDevices === undefined ||
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
  const techMaterials = rawMaterials.map((m) => ({
    id: m.id,
    name: m.name,
    materialDefinitionId: m.materialDefinitionId ?? '',
    quantity: m.quantity ?? 0,
    type: 'MATERIAL' as const,
  }))

  // Devices from technician stock (normal case)
  const technicianDevices = (rawDevices ?? [])
    .filter((d) => !!d.serialNumber)
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber ?? '',
      category: d.category ?? 'OTHER',
      type: 'DEVICE' as const,
    }))

  // Devices already assigned directly to this order (ASSIGNED_TO_ORDER) – we must show them too
  const devicesFromOrder = (data.assignedEquipment ?? [])
    .map((ae) => ae.warehouse)
    .filter(
      (w): w is NonNullable<typeof w> =>
        !!w && !!w.serialNumber && w.status === 'ASSIGNED_TO_ORDER'
    )
    .map((w) => ({
      id: w.id,
      name: w.name,
      serialNumber: w.serialNumber ?? '',
      category: w.category ?? 'OTHER',
      type: 'DEVICE' as const,
    }))

  // ExtraDevices from each service
  const extraDevicesFromServices =
    data.services
      ?.flatMap((s) => s.extraDevices ?? [])
      .map((d) => ({
        id: d.id,
        name: d.name ?? '',
        serialNumber: d.serialNumber ?? '',
        category: d.category ?? 'OTHER',
        type: 'DEVICE' as const,
      })) ?? []

  // Merge technician devices with devices assigned to the order
  // and remove possible duplicates by serial number.
  const allDevices = (() => {
    /** Keep all possible sources together */
    const merged = [
      ...technicianDevices,
      ...devicesFromOrder,
      ...extraDevicesFromServices,
    ]

    /** Remove duplicates by serialNumber */
    const unique: typeof merged = []
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
    isAdmin &&
    (data.status === OplOrderStatus.COMPLETED ||
      data.status === OplOrderStatus.NOT_COMPLETED)

  /* ---------------- Render ---------------- */
  return (
    <div className="flex gap-6">
      {/* -------- LEFT COLUMN: main content -------- */}
      <div className="space-y-4 flex-1">
        <h3 className="text-base font-semibold mb-2">Informacja o zleceniu</h3>
        <OplOrderDetailsContent order={data} isConfirmed={isConfirmed} />

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
                      type: data.type,
                      notes: updatedNotes,
                      orderNumber: data.orderNumber,
                      date: data.date.toISOString().split('T')[0],
                      timeSlot: data.timeSlot,
                      status: data.status,
                      city: data.city,
                      street: data.street,
                      assignedToId: data.assignedTo?.user.id,
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

        <CompleteOrderWizard
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
