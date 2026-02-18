'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { materialUnitMap } from '@/lib/constants'
import { mapTechnicianTransferToVM } from '@/server/modules/vectra-crm/helpers/mappers/TechnicianTransferRowVM'
import { mapTechnicianStockToOutgoingTransferVM } from '@/server/modules/vectra-crm/helpers/mappers/mapTechnicianStockToOutgoingTransferVM'
import { trpc } from '@/utils/trpc'
import {
  VectraDeviceCategory,
  VectraMaterialUnit,
  VectraWarehouseItemType,
} from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'
import { devicesTypeMap } from '../../../lib/constants'

type Row = {
  id: string
  name: string
  itemType: VectraWarehouseItemType
  serialNumber: string | null
  quantity: number
  unit: VectraMaterialUnit
  category: VectraDeviceCategory | null
  transferPending: boolean
  transferToId?: string | null
  transferTo?: { id: string; name: string } | null
  assignedTo?: { id: string; name: string } | null
  incoming: boolean
}

const TechnicianTransfersTable = () => {
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const { data: incoming = [], isLoading: incLoading } =
    trpc.vectra.warehouse.getIncomingTechTransfers.useQuery(undefined, {
      staleTime: 30_000,
    })

  const { data: myStock = [], isLoading: stockLoading } =
    trpc.vectra.warehouse.getTechnicianStock.useQuery({ technicianId: 'self' })

  const utils = trpc.useUtils()

  const accept = trpc.vectra.warehouse.confirmTechTransfer.useMutation({
    onSuccess: () => {
      setAcceptingId(null)
      utils.vectra.warehouse.invalidate()
      utils.vectra.warehouse.getTechnicianStock.invalidate({
        technicianId: 'self',
      })
      toast.success('Sprzęt przyjęty.')
    },
    onError: () => setAcceptingId(null),
  })

  const reject = trpc.vectra.warehouse.rejectTechTransfer.useMutation({
    onSuccess: () => {
      setRejectingId(null)
      utils.vectra.warehouse.getIncomingTechTransfers.invalidate()
      utils.vectra.warehouse.getTechnicianStock.invalidate({
        technicianId: 'self',
      })
      toast.info('Przekazanie odrzucone.')
    },
    onError: () => setRejectingId(null),
  })

  const cancel = trpc.vectra.warehouse.cancelTechTransfer.useMutation({
    onSuccess: () => {
      setCancelLoadingId(null)
      utils.vectra.warehouse.getTechnicianStock.invalidate({
        technicianId: 'self',
      })
      toast.info('Przekazanie anulowane.')
    },
    onError: () => {
      setCancelLoadingId(null)
    },
  })

  if (incLoading || stockLoading)
    return (
      <div className="w-full flex justify-center">
        <LoaderSpinner />
      </div>
    )

  const outgoing = myStock.filter((item) => item.transferPending)
  const rows = [
    ...incoming.map((item) => mapTechnicianTransferToVM(item, true)),
    ...outgoing.map((item) => mapTechnicianStockToOutgoingTransferVM(item)),
  ]

  if (!rows.length) return <p></p>

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => {
        const isDevice = row.itemType === 'DEVICE'

        // Header message (depending on transfer direction)
        const headerText = row.incoming ? (
          <>
            Technik{' '}
            <span className="font-semibold">{row.assignedTo?.name ?? ''}</span>{' '}
            przekazał Ci {isDevice ? 'urządzenie' : 'materiał'}.
          </>
        ) : (
          <>
            Przekazałeś {isDevice ? 'urządzenie' : 'materiał'} do technika{' '}
            <span className="font-semibold">{row.transferTo?.name ?? ''}</span>.
          </>
        )

        // Details of the transferred item
        const itemDetails = isDevice ? (
          <>
            <span className="font-semibold break-all">
              {row.category ? devicesTypeMap[row.category] : ''} {row.name}
            </span>
            <span className="text-muted-foreground break-all text-xs md:text-sm">
              nr&nbsp;seryjny: {row.serialNumber}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold break-all">{row.name}</span>
            <span className="text-muted-foreground text-xs md:text-sm">
              Ilość: {row.quantity} {materialUnitMap[row.unit]}
            </span>
          </>
        )

        return (
          <div
            key={row.id}
            className="border rounded-lg p-4 bg-card text-card-foreground shadow-sm space-y-3"
          >
            {/* Transfer header */}
            <div className="text-sm">{headerText}</div>

            {/* Item details */}
            <div className="flex flex-col">{itemDetails}</div>

            {/* Action buttons */}
            {row.incoming ? (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => {
                    setAcceptingId(row.id)
                    accept.mutate({ itemId: row.id })
                  }}
                  disabled={acceptingId === row.id && accept.isLoading}
                >
                  {acceptingId === row.id && accept.isLoading
                    ? 'Akceptuję...'
                    : 'Akceptuj'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setRejectingId(row.id)
                    reject.mutate({ itemId: row.id })
                  }}
                  disabled={rejectingId === row.id && reject.isLoading}
                >
                  {rejectingId === row.id && reject.isLoading
                    ? 'Odrzucam...'
                    : 'Odrzuć'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <p className="text-muted-foreground text-xs md:text-sm">
                  Oczekuje na akceptację
                </p>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    setCancelLoadingId(row.id)
                    cancel.mutate({ itemId: row.id })
                  }}
                  disabled={cancelLoadingId === row.id && cancel.isLoading}
                >
                  {cancelLoadingId === row.id && cancel.isLoading
                    ? 'Anuluję...'
                    : 'Anuluj'}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default TechnicianTransfersTable
