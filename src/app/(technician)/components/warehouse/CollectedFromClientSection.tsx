'use client'

import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { devicesTypeMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { differenceInDays, format } from 'date-fns'
import { useState } from 'react'
import { MdInventory } from 'react-icons/md'

const CollectedFromClientSection = () => {
  const [orderId, setOrderId] = useState<string | null>(null)

  const { data, isLoading } = trpc.warehouse.getCollectedWithDetails.useQuery()

  /* loading */
  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg mb-6" />

  // sort newest first
  const sortedData = (data ?? []).sort((a, b) => {
    const dateA = new Date(a.history[0]?.actionDate ?? a.updatedAt).getTime()
    const dateB = new Date(b.history[0]?.actionDate ?? b.updatedAt).getTime()

    return dateB - dateA
  })

  const count = data?.length ?? 0

  /* header badge colour */
  const headVariant = count === 0 ? 'success' : 'warning'

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-sm mb-6">
      <Accordion type="single" collapsible>
        <AccordionItem value="collected">
          {/* ───── header row ───── */}
          <AccordionTrigger className="flex items-center justify-between w-full p-4 gap-2">
            <div className="flex items-center gap-2">
              <MdInventory className="h-5 w-5 shrink-0" />
              <span className="font-semibold whitespace-nowrap">
                Odebrane od&nbsp;klienta
              </span>
            </div>
            <Badge variant={headVariant}>{count}</Badge>
          </AccordionTrigger>

          {/* ───── list ───── */}
          <AccordionContent className="px-4 pb-4">
            {count === 0 ? (
              <p className="text-sm text-muted-foreground">
                Brak urządzeń odebranych od klienta.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedData.map((item) => {
                  const order = item.orderAssignments[0]?.order
                  const collectedAt =
                    item.history[0]?.actionDate ?? item.updatedAt
                  const daysAgo = differenceInDays(new Date(), collectedAt)

                  /* badge colour vs days */
                  const variant: 'success' | 'warning' | 'danger' =
                    daysAgo > 30
                      ? 'danger'
                      : daysAgo > 14
                      ? 'warning'
                      : 'success'

                  return (
                    <div
                      key={item.id}
                      className={`
                        border rounded-md p-3
                        grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4
                        items-center
                      `}
                    >
                      {/* col 1 – name + SN */}
                      <div className="flex flex-col">
                        <span className="font-medium break-all">
                          {devicesTypeMap[item.category ?? 'OTHER']} {item.name}
                        </span>
                        {item.serialNumber && (
                          <span className="text-xs text-muted-foreground break-all">
                            SN: {item.serialNumber}
                          </span>
                        )}
                      </div>

                      {/* col 2 – order ref  (hidden on xs) */}
                      <div className="flex flex-col items-start">
                        {order ? (
                          <>
                            <Button
                              variant="link"
                              className="p-0"
                              onClick={() => setOrderId(order.id)}
                            >
                              {order.orderNumber}
                            </Button>

                            <span className="text-xs text-muted-foreground break-all">
                              {order.city}, {order.street}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>

                      {/* col 3 – date + badge */}
                      <div className="flex md:flex-col items-center justify-between gap-2">
                        <span className="text-xs md:text-sm shrink-0">
                          {format(collectedAt, 'dd.MM.yyyy')}
                        </span>
                        <Badge variant={variant} className="w-fit">
                          {daysAgo} dni
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      />
    </div>
  )
}

export default CollectedFromClientSection
