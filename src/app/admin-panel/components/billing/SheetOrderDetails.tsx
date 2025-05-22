'use client'

import { Badge } from '@/app/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Skeleton } from '@/app/components/ui/skeleton'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useEffect } from 'react'

type Props = {
  orderId: string | null
  onClose: () => void
}

/**
 * SheetOrderDetails component:
 * Displays full order information in a side sheet:
 * - Order number, date, address, status, technician, work codes, notes and total amount.
 */
const SheetOrderDetails = ({ orderId, onClose }: Props) => {
  const { data, isLoading, refetch } = trpc.order.getOrderById.useQuery(
    { id: orderId ?? '' },
    { enabled: !!orderId }
  )

  useEffect(() => {
    if (orderId) refetch()
  }, [orderId, refetch])

  return (
    <Sheet open={!!orderId} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="mb-4">
          <SheetTitle>Szczegóły zlecenia</SheetTitle>
        </SheetHeader>

        {!data || isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <div>
                <p className="text-muted-foreground text-xs">Nr zlecenia</p>
                <p className="font-medium">{data.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Data</p>
                <p className="font-medium">
                  {format(new Date(data.date), 'dd.MM.yyyy', { locale: pl })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">Technik</p>
              <p>{data.assignedTo?.name ?? 'Nieprzypisany'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge
                variant={
                  data.status === 'COMPLETED' ? 'success' : 'destructive'
                }
              >
                {data.status === 'COMPLETED' ? 'Wykonane' : 'Niewykonane'}
              </Badge>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">Operator</p>
              <p>{data.operator}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">Adres</p>
              <p>
                {data.city}, {data.street} ({data.postalCode})
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">Uwagi</p>
              <p>{data.notes || '—'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-xs">Kody pracy</p>
              {data.settlementEntries?.length ? (
                <ul className="list-disc pl-4">
                  {data.settlementEntries.map((entry) => (
                    <li key={entry.code}>
                      {entry.code} – {entry.quantity}× (
                      {entry.rate?.amount?.toFixed(2) ?? '0.00'} zł)
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Brak</p>
              )}
            </div>

            <div className="font-semibold text-sm">
              Suma:{' '}
              {data.settlementEntries
                .reduce(
                  (acc, e) => acc + (e.rate?.amount ?? 0) * (e.quantity ?? 0),
                  0
                )
                .toFixed(2)}{' '}
              zł
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default SheetOrderDetails
