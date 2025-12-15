'use client'

import { getDeviceTimeline } from '@/app/(modules)/vectra-crm/utils/warehouse/getDeviceTimeline'
import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { Timeline } from '@/app/components/ui/timeline'
import { devicesStatusMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'

type Props = { open: boolean; onClose: () => void }

const DeviceCheckSheet = ({ open, onClose }: Props) => {
  const [serial, setSerial] = useState('')
  const [submittedSerial, setSubmittedSerial] = useState<string | null>(null)

  // NEW — state for opening the order sheet
  const [orderId, setOrderId] = useState<string | null>(null)

  const query = trpc.warehouse.checkDeviceBySerialNumber.useQuery(
    { serialNumber: submittedSerial ?? undefined },
    { enabled: submittedSerial !== null }
  )

  const isChecking = query.fetchStatus === 'fetching'

  useEffect(() => {
    if (open) {
      setSerial('')
      setSubmittedSerial(null)
    }
  }, [open])

  const handleCheck = () => {
    const trimmed = serial.trim()
    if (trimmed.length >= 3) setSubmittedSerial(trimmed)
  }

  const handleClose = () => {
    setSerial('')
    setSubmittedSerial(null)
    onClose()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => !val && handleClose()}>
        <SheetContent side="right" className="w-[95%] md:max-w-md">
          <SheetHeader>
            <SheetTitle>Sprawdź sprzęt po numerze seryjnym lub MAC</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Serial input */}
            <div className="space-y-1">
              <Label htmlFor="serial">Numer seryjny/MAC</Label>
              <Input
                id="serial"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                placeholder="Wprowadź numer seryjny lub MAC..."
                autoFocus
              />
            </div>

            {/* Action button */}
            <Button
              onClick={handleCheck}
              disabled={serial.trim().length < 3 || isChecking}
            >
              {isChecking ? 'Sprawdzanie…' : 'Sprawdź'}
            </Button>

            {/* Error state */}
            {query.isError && (
              <p className="text-sm text-destructive">
                Nie znaleziono urządzenia o podanym numerze seryjnym.
              </p>
            )}

            {/* Success state */}
            {query.data && (
              <section className="text-sm border-t pt-4">
                <h4 className="font-semibold mb-2">Szczegóły urządzenia</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="font-medium">Nazwa</dt>
                    <dd>{query.data.name}</dd>
                  </div>

                  <div>
                    <dt className="font-medium">Status</dt>
                    <dd>
                      {query.data.status
                        ? devicesStatusMap[query.data.status]
                        : ''}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-medium">Na stanie</dt>
                    <dd>
                      {query.data.assignedTo
                        ? query.data.assignedTo.name
                        : query.data.location
                        ? `Magazyn ${query.data.location.name}`
                        : '-'}
                    </dd>
                  </div>

                  {/* *** CLICKABLE ORDER NUMBER *** */}
                  <div>
                    <dt className="font-medium">Przypisany do zlecenia</dt>
                    <dd>
                      {query.data.assignedOrder ? (
                        <Button
                          variant="link"
                          className="p-0"
                          onClick={() =>
                            setOrderId(query?.data?.assignedOrder.id ?? '')
                          }
                        >
                          {query.data.assignedOrder.orderNumber}
                        </Button>
                      ) : (
                        'Brak'
                      )}
                    </dd>
                  </div>
                  {query.data.history && query.data.history.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Historia operacji</h4>
                      <Timeline items={getDeviceTimeline(query.data.history)} />
                    </div>
                  )}
                </dl>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ORDER DETAILS SHEET */}
      <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      />
    </>
  )
}

export default DeviceCheckSheet
