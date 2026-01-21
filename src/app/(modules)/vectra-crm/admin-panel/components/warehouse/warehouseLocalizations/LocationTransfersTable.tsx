'use client'

import { devicesTypeMap } from '@/app/(modules)/vectra-crm/lib/constants'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { materialUnitMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import {
  VectraDeviceCategory,
  VectraLocationTransferStatus,
  VectraMaterialUnit,
  VectraWarehouseItemType,
} from '@prisma/client'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

type LineRow = {
  id: string
  itemType: VectraWarehouseItemType
  quantity: number
  unit: VectraMaterialUnit | null
  warehouseItemId?: string | null
  materialDefinitionId?: string | null
  nameSnapshot?: string | null
  indexSnapshot?: string | null
  category?: VectraDeviceCategory | null
}

type TransferRow = {
  id: string
  fromLocation: { id: string; name: string }
  toLocation: { id: string; name: string }
  lines: LineRow[]
  status: VectraLocationTransferStatus
  incoming: boolean
  createdAt: Date
}

/**
 * LocationTransfersTable (ADMIN/WAREHOUSE)
 * -------------------------------------------------------------------------
 * • Displays all pending location-to-location transfers.
 * • Each transfer is an accordion item, listing all lines (devices/materials).
 * • Allows confirmation (incoming), rejection, or cancellation (outgoing).
 * • Uses ShadCN components for consistency and clarity.
 * ---------------------------------------------------------------------- */

const LocationTransfersTable = () => {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showSkeleton, setShowSkeleton] = useState(false)

  const searchParams = useSearchParams()
  const utils = trpc.useUtils()

  const activeLocationId = searchParams.get('loc')

  const { data: incoming = [], isLoading: inLoading } =
    trpc.vectra.warehouse.getIncomingLocationTransfers.useQuery(
      { locationId: activeLocationId || undefined },
      { staleTime: 30_000 }
    )

  const { data: outgoing = [], isLoading: outLoading } =
    trpc.vectra.warehouse.getOutgoingLocationTransfers.useQuery(
      { locationId: activeLocationId || undefined },
      { staleTime: 30_000 }
    )

  const accept = trpc.vectra.warehouse.confirmLocationTransfer.useMutation({
    onSuccess: () => {
      setLoadingId(null)
      utils.vectra.warehouse.getIncomingLocationTransfers.invalidate()
      toast.success('Przekazanie zaakceptowane.')
    },
    onError: () => setLoadingId(null),
  })

  const reject = trpc.vectra.warehouse.rejectLocationTransfer.useMutation({
    onSuccess: () => {
      setLoadingId(null)
      utils.vectra.warehouse.getIncomingLocationTransfers.invalidate()
      toast.info('Przekazanie odrzucone.')
    },
    onError: () => setLoadingId(null),
  })

  const cancel = trpc.vectra.warehouse.cancelLocationTransfer.useMutation({
    onSuccess: () => {
      setLoadingId(null)
      utils.vectra.warehouse.getOutgoingLocationTransfers.invalidate()
      toast.info('Przekazanie anulowane.')
    },
    onError: () => setLoadingId(null),
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inLoading || outLoading) setShowSkeleton(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [inLoading, outLoading])

  // show skeleton only when there are transfers and still loading
  const hasAnyTransfer =
    (incoming && incoming.length > 0) || (outgoing && outgoing.length > 0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasAnyTransfer && (inLoading || outLoading)) setShowSkeleton(true)
    }, 400)
    return () => clearTimeout(timer)
  }, [inLoading, outLoading, hasAnyTransfer])

  // skeleton appears only for existing transfers
  if (hasAnyTransfer && showSkeleton && (inLoading || outLoading))
    return <Skeleton className="h-8 w-full" />

  // skip rendering if no transfers and not loading
  if (!inLoading && !outLoading && !hasAnyTransfer) return null

  // merge incoming and outgoing transfers into one list
  const rows: TransferRow[] = [
    ...incoming.map((t) => ({
      ...t,
      incoming: true,
      lines: t.lines.map((l) => ({ ...l, quantity: l.quantity ?? 1 })),
    })),
    ...outgoing.map((t) => ({
      ...t,
      incoming: false,
      lines: t.lines.map((l) => ({ ...l, quantity: l.quantity ?? 1 })),
    })),
  ]

  return (
    <div className="border rounded-lg bg-card shadow-sm">
      <Accordion type="single" collapsible>
        {rows.map((transfer) => {
          const isIncoming = transfer.incoming
          const count = transfer.lines.length

          const title = isIncoming ? (
            <>
              Otrzymałeś sprzęt od:{' '}
              <span className="font-semibold">
                Magazyn {transfer.fromLocation.name}
              </span>
            </>
          ) : (
            <>
              Przekazałeś sprzęt do: Magazyn{' '}
              <span className="font-semibold">{transfer.toLocation.name}</span>
            </>
          )

          return (
            <AccordionItem key={transfer.id} value={transfer.id}>
              <AccordionTrigger className="px-4 py-3 flex justify-between items-center">
                <div className="flex flex-col text-left">
                  <span className="text-sm">{title}</span>
                  <span className="text-xs text-muted-foreground">
                    Utworzono:{' '}
                    {format(new Date(transfer.createdAt), 'dd.MM.yyyy HH:mm')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{count}</Badge>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4 space-y-3">
                {/* Items list */}
                <div className="space-y-2">
                  {transfer.lines.map((line) => {
                    const isDevice = line.itemType === 'DEVICE'
                    return (
                      <div
                        key={line.id}
                        className="border rounded p-2 text-sm bg-muted/30"
                      >
                        {isDevice ? (
                          <>
                            <span className="font-semibold">
                              {line.category
                                ? devicesTypeMap[line.category]
                                : 'Urządzenie'}{' '}
                              {line.nameSnapshot}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              SN: {line.indexSnapshot ?? '-'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">
                              {line.nameSnapshot}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Ilość: {line.quantity}{' '}
                              {line.unit ? materialUnitMap[line.unit] : ''}
                            </span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                {isIncoming ? (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        setLoadingId(transfer.id)
                        accept.mutate({
                          transferId: transfer.id,
                          locationId: activeLocationId || undefined,
                        })
                      }}
                      disabled={loadingId === transfer.id && accept.isLoading}
                    >
                      {loadingId === transfer.id && accept.isLoading
                        ? 'Akceptuję...'
                        : 'Akceptuj'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLoadingId(transfer.id)
                        reject.mutate({
                          transferId: transfer.id,
                          locationId: activeLocationId || undefined,
                        })
                      }}
                      disabled={loadingId === transfer.id && reject.isLoading}
                    >
                      {loadingId === transfer.id && reject.isLoading
                        ? 'Odrzucam...'
                        : 'Odrzuć'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-muted-foreground text-xs">
                      Oczekuje na akceptację
                    </p>
                    <Button
                      size="sm"
                      variant="warning"
                      onClick={() => {
                        setLoadingId(transfer.id)
                        cancel.mutate({
                          transferId: transfer.id,
                          locationId: activeLocationId || undefined,
                        })
                      }}
                      disabled={loadingId === transfer.id && cancel.isLoading}
                    >
                      {loadingId === transfer.id && cancel.isLoading
                        ? 'Anuluję...'
                        : 'Anuluj'}
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

export default LocationTransfersTable
