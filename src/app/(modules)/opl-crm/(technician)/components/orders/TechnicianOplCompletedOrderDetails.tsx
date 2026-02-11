'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { Separator } from '@/app/components/ui/separator'
import { OplIssuedItemDevice, OplIssuedItemMaterial } from '@/types/opl-crm'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory, OplOrderStatus } from '@prisma/client'
import { differenceInMinutes } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { MdEdit } from 'react-icons/md'
import OplOrderTimeline from '../../../admin-panel/components/order/OplOrderTimeline'
import { CompleteOplOrderProvider } from '../../../utils/context/order/CompleteOplOrderContext'
import CompleteOplOrderWizard from './completeOrder/CompleteOplOrderWizard'

interface Props {
  orderId: string
  autoOpen?: boolean
  onAutoOpenHandled?: () => void
  orderStatus: OplOrderStatus
}

/**
 * TechnicianOplCompletedOrderDetails
 *
 * Displays completed OPL order details for technician view.
 * Allows order completion or amendment within allowed time window.
 */
const TechnicianOplCompletedOrderDetails = ({
  orderId,
  autoOpen,
  onAutoOpenHandled,
  orderStatus,
}: Props) => {
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const utils = trpc.useUtils()
  const { isAdmin, isCoordinator, isTechnician } = useRole()

  /* ---------------- Fetch data ---------------- */
  const { data, isLoading, isError } = trpc.opl.order.getOrderById.useQuery({
    id: orderId,
  })

  const { data: materialDefs } =
    trpc.opl.settings.getAllOplMaterialDefinitions.useQuery()

  const { data: rawMaterials } = trpc.opl.warehouse.getTechnicianStock.useQuery(
    {
      technicianId: 'self',
      itemType: 'MATERIAL',
    }
  )

  const { data: rawDevices } = trpc.opl.warehouse.getTechnicianStock.useQuery({
    technicianId: 'self',
    itemType: 'DEVICE',
  })

  const { data: workCodeDefs } = trpc.opl.settings.getAllOplRates.useQuery()

  /* ---------------- Auto open (deep-link) ---------------- */
  useEffect(() => {
    if (autoOpen && data) {
      setShowCompleteModal(true)
      onAutoOpenHandled?.()
    }
  }, [autoOpen, data, onAutoOpenHandled])

  /* ---------------- Permissions ---------------- */
  const canShowAmendButton = useMemo(() => {
    const isEnded =
      orderStatus === OplOrderStatus.COMPLETED ||
      orderStatus === OplOrderStatus.NOT_COMPLETED

    if (!isEnded) return false
    if (isAdmin || isCoordinator) return true

    if (isTechnician && data?.completedAt) {
      const diff = differenceInMinutes(new Date(), new Date(data.completedAt))
      return diff <= 15
    }

    return false
  }, [orderStatus, isAdmin, isCoordinator, isTechnician, data?.completedAt])

  /* ---------------- Loading states ---------------- */
  if (isLoading) {
    return (
      <div className="w-full flex justify-center py-10">
        <LoaderSpinner />
      </div>
    )
  }

  if (isError || !data) {
    return <p className="text-destructive">Błąd ładowania danych.</p>
  }

  if (!materialDefs || !rawMaterials) {
    return (
      <p className="text-destructive">
        Nie udało się pobrać danych magazynowych.
      </p>
    )
  }

  /* ---------------- Prepare technician stock ---------------- */
  const techMaterials: OplIssuedItemMaterial[] = rawMaterials
    .filter((m) => !!m.materialDefinitionId)
    .map((m) => ({
      id: m.id,
      name: m.name,
      materialDefinitionId: m.materialDefinitionId!,
      quantity: m.quantity ?? 0,
      type: 'MATERIAL',
    }))

  const devices: OplIssuedItemDevice[] = (rawDevices ?? [])
    .filter(
      (d): d is typeof d & { serialNumber: string } =>
        typeof d.serialNumber === 'string'
    )
    .map((d) => ({
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber, // ← teraz TS wie że to string
      category: (d.category as OplDeviceCategory) ?? 'OTHER',
      deviceDefinitionId: d.deviceDefinitionId ?? null,
      type: 'DEVICE',
    }))

  /* ---------------- Render ---------------- */
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* -------- LEFT COLUMN -------- */}
      <div className="space-y-4 flex-1">
        <h3 className="text-base font-semibold mb-2">Informacja o zleceniu</h3>

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

        {/* Complete / amend wizard */}
        <CompleteOplOrderProvider orderId={data.id}>
          <CompleteOplOrderWizard
            key={data.id}
            open={showCompleteModal}
            order={data}
            orderType={data.type}
            mode={canShowAmendButton ? 'amend' : 'complete'}
            onCloseAction={async () => {
              setShowCompleteModal(false)
              await Promise.all([
                utils.opl.order.getTechnicianActiveOrders.invalidate(),
                utils.opl.order.getOrderById.invalidate({ id: orderId }),
              ])
            }}
            materialDefs={materialDefs}
            techMaterials={techMaterials}
            devices={devices}
            workCodeDefs={workCodeDefs}
          />
        </CompleteOplOrderProvider>
      </div>

      <Separator
        className="my-6 md:my-0 md:h-auto md:w-px"
        orientation="horizontal"
      />

      {/* -------- RIGHT COLUMN -------- */}
      <div className="flex-1">
        <h3 className="text-base font-semibold mb-2">Historia zlecenia</h3>
        <OplOrderTimeline order={data} />
      </div>
    </div>
  )
}

export default TechnicianOplCompletedOrderDetails
