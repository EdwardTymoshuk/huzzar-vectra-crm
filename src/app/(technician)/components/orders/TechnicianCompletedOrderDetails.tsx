'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import OrderDetailsContent from '@/app/components/shared/orders/OrderDetailsContent'
import OrderTimeline from '@/app/components/shared/orders/OrderTimeline'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { IssuedItemDevice, IssuedItemMaterial } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { DeviceCategory, OrderStatus } from '@prisma/client'
import { differenceInMinutes } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { MdEdit } from 'react-icons/md'
import CompleteOrderWizard from './completeOrder/CompleteOrderWizard'

interface Props {
  orderId: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  orderStatus: OrderStatus
}

/**
 * TechnicianCompletedOrderDetails
 * - Displays technician order details and actions.
 * - Handles "transfer" and "complete order" flows.
 * - Opens CompleteOrderWizard as a Dialog (mobile fullscreen, desktop modal).
 */
const TechnicianCompletedOrderDetails = ({
  orderId,
  autoOpen,
  onAutoOpenHandled,
  orderStatus,
}: Props) => {
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const utils = trpc.useUtils()
  const { isAdmin, isCoordinator, isTechnician } = useRole()

  /* ---------------- Fetch data ---------------- */
  const { data, isLoading, isError } = trpc.order.getOrderById.useQuery({
    id: orderId,
  })
  const { data: materialDefs } = trpc.materialDefinition.getAll.useQuery()
  const { data: rawMaterials } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'MATERIAL',
  })
  const { data: rawDevices } = trpc.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'DEVICE',
  })
  const { data: workCodeDefs } = trpc.rateDefinition.getAllRates.useQuery()

  /* ---------------- Auto open (deep-link) ---------------- */
  useEffect(() => {
    if (autoOpen) {
      setShowCompleteModal(true)
      onAutoOpenHandled?.()
    }
  }, [autoOpen, onAutoOpenHandled])

  /* ---------------- Permissions ---------------- */
  const canShowAmendButton = useMemo(() => {
    const isEnded =
      orderStatus === OrderStatus.COMPLETED ||
      orderStatus === OrderStatus.NOT_COMPLETED
    if (!isEnded) return false
    if (isAdmin || isCoordinator) return true

    if (isTechnician && data?.completedAt) {
      const diff = differenceInMinutes(new Date(), new Date(data.completedAt))
      return diff <= 15
    }
    return false
  }, [orderStatus, isAdmin, isCoordinator, isTechnician, data?.completedAt])

  /* ---------------- Loading states ---------------- */
  if (isLoading)
    return (
      <div className="w-full flex justify-center py-10">
        <LoaderSpinner />
      </div>
    )

  if (isError || !data)
    return <p className="text-destructive">Błąd ładowania danych.</p>

  if (!materialDefs || !rawMaterials)
    return (
      <p className="text-destructive">
        Nie udało się pobrać danych magazynowych.
      </p>
    )

  /* ---------------- Prepare technician stock ---------------- */
  const techMaterials: IssuedItemMaterial[] = rawMaterials
    .filter((m) => !!m.materialDefinitionId)
    .map((m) => ({
      id: m.id,
      name: m.name,
      materialDefinitionId: m.materialDefinitionId!,
      quantity: m.quantity ?? 0,
      type: 'MATERIAL',
    }))

  const devices: IssuedItemDevice[] = (rawDevices ?? [])
    .filter((d) => !!d.serialNumber)
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber ?? '',
      category: (d.category as DeviceCategory) ?? 'OTHER',
      type: 'DEVICE',
    }))

  /* ---------------- Render ---------------- */
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* -------- LEFT COLUMN: main content -------- */}
      <div className="space-y-4 flex-1">
        <h3 className="text-base font-semibold mb-2">Informacja o zleceniu</h3>
        <OrderDetailsContent order={data} hideTechnician />

        {canShowAmendButton && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="success"
              onClick={() => setShowCompleteModal(true)}
            >
              <MdEdit className="mr-1" />
              Edytuj / uzupełnij odpis
            </Button>
          </div>
        )}

        {/* Complete wizard modal */}
        <CompleteOrderWizard
          key={data.id}
          open={showCompleteModal}
          order={data}
          orderType={data.type}
          onCloseAction={async () => {
            setShowCompleteModal(false)
            await utils.order.getRealizedOrders.invalidate()
            await utils.order.getOrderById.invalidate({ id: orderId })
          }}
          materialDefs={materialDefs}
          techMaterials={techMaterials}
          devices={devices}
          workCodeDefs={workCodeDefs}
          mode={canShowAmendButton ? 'amend' : 'complete'}
        />
      </div>

      {/* Separator: poziomy na mobile, pionowy na desktop */}
      <Separator
        className="my-6 md:my-0 md:h-auto md:w-px"
        orientation="horizontal"
      />

      {/* -------- RIGHT COLUMN: timeline -------- */}
      <div className="flex-1">
        <h3 className="text-base font-semibold mb-2">Historia zlecenia</h3>
        <OrderTimeline order={data} />
      </div>
    </div>
  )
}

export default TechnicianCompletedOrderDetails
