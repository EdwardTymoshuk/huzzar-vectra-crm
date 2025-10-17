'use client'

import CompleteOrderWizard from '@/app/(technician)/components/orders/completeOrder/CompleteOrderWizard'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import { Button } from '@/app/components/ui/button'
import { formatDateTime } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OrderStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { IoCheckmarkDone } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { toast } from 'sonner'

type Props = { order: { id: string } }

/**
 * OrderAccordionDetails (Admin/Coordinator view)
 *
 * Displays full order details inside accordion row.
 * - Admin/coordinator can:
 *   • approve completed SERVICE/OUTAGE orders,
 *   • re-edit finished orders (no time limit),
 * - Uses CompleteOrderWizard with mode="adminEdit" for full data editing.
 */
const OrderAccordionDetails = ({ order }: Props) => {
  const utils = trpc.useUtils()
  const [openEdit, setOpenEdit] = useState(false)
  const { isWarehouseman, isAdmin, isCoordinator } = useRole()
  const session = useSession()
  const editOrder = trpc.order.editOrder.useMutation()

  /* ---------------- Fetch order details ---------------- */
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: order.id,
  })

  const { data: materialDefs } = trpc.materialDefinition.getAll.useQuery()
  const { data: rawMaterials } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: data?.assignedToId ?? 'self',
    itemType: 'MATERIAL',
  })
  const { data: rawDevices } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: data?.assignedToId ?? 'self',
    itemType: 'DEVICE',
  })

  const { data: workCodeDefs } = trpc.rateDefinition.getAllRates.useQuery()

  if (isLoading || !data)
    return (
      <div className="p-4">
        <LoaderSpinner />
      </div>
    )

  if (isError)
    return (
      <div className="p-4 text-destructive">
        Nie udało się załadować szczegółów zlecenia.
      </div>
    )

  if (!materialDefs || !rawMaterials)
    return (
      <div className="p-4 text-destructive">
        Nie udało się pobrać danych magazynowych.
      </div>
    )

  /* ---------------- Data prep ---------------- */
  const isConfirmed = data.notes?.toLowerCase().includes('zatwierdzone przez')

  const techMaterials = rawMaterials.map((m) => ({
    id: m.id,
    name: m.name,
    materialDefinitionId: m.materialDefinitionId ?? '',
    quantity: m.quantity ?? 0,
    type: 'MATERIAL' as const,
  }))

  const devices = (rawDevices ?? [])
    .filter((d) => !!d.serialNumber)
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber ?? '',
      category: d.category ?? 'OTHER',
      type: 'DEVICE' as const,
    }))

  /* ---------------- Logic flags ---------------- */
  const canApprove =
    (isAdmin || isCoordinator) &&
    (data.type === 'SERVICE' || data.type === 'OUTAGE') &&
    data.status === OrderStatus.COMPLETED &&
    !isConfirmed

  const canAdminEdit =
    isAdmin &&
    (data.status === OrderStatus.COMPLETED ||
      data.status === OrderStatus.NOT_COMPLETED)

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-4">
      <OrderDetailsContent order={data} isConfirmed={isConfirmed} />

      {(canAdminEdit || canApprove) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {/* --- Admin edit completed orders --- */}
          {canAdminEdit && !isWarehouseman && (
            <Button
              variant="warning"
              onClick={() => {
                utils.order.getOrderById.invalidate({ id: order.id })
                setOpenEdit(true)
              }}
            >
              <MdEdit className="mr-1" />
              Edytuj zakończone zlecenie
            </Button>
          )}

          {/* --- Approve completed SERVICE / OUTAGE --- */}
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
                    notes: updatedNotes,
                    orderNumber: data.orderNumber,
                    date: data.date.toISOString().split('T')[0],
                    timeSlot: data.timeSlot,
                    status: data.status,
                    city: data.city,
                    street: data.street,
                    assignedToId: data.assignedTo?.id,
                  })

                  toast.success('Zlecenie zostało zatwierdzone.')
                  await utils.order.getOrderById.invalidate({ id: data.id })
                  await utils.order.getOrders.invalidate()
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

      {/* --- Admin edit modal (CompleteOrderWizard) --- */}
      <CompleteOrderWizard
        key={order.id}
        open={openEdit}
        onCloseAction={async () => {
          setOpenEdit(false)
          await utils.order.getOrders.invalidate()
          await utils.order.getOrderById.invalidate({ id: order.id })
        }}
        order={data}
        orderType={data.type}
        materialDefs={materialDefs}
        techMaterials={techMaterials}
        devices={devices}
        mode="adminEdit"
        workCodeDefs={workCodeDefs}
      />
    </div>
  )
}

export default OrderAccordionDetails
