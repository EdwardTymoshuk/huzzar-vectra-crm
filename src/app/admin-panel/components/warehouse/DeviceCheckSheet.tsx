'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { trpc } from '@/utils/trpc'
import dayjs from 'dayjs'
import { useState } from 'react'

/** Device status → Polish label */
const devicesStatusMap: Record<string, string> = {
  AVAILABLE: 'DOSTĘPNY',
  ASSIGNED: 'PRZYPISANY DO TECHNIKA',
  RETURNED: 'ZWRÓCONY DO MAGAZYNU',
  RETURNED_TO_OPERATOR: 'ZWRÓCONY DO OPERATORA',
  ASSIGNED_TO_ORDER: 'WYDANY DO ZLECENIA',
}

/** Warehouse action → Polish label */
const actionMap: Record<string, string> = {
  RECEIVED: 'Przyjęcie',
  ISSUED: 'Wydanie',
  RETURNED: 'Zwrot',
  RETURNED_TO_OPERATOR: 'Zwrot do operatora',
}

type Props = { open: boolean; onClose: () => void }

const DeviceCheckSheet = ({ open, onClose }: Props) => {
  const [serial, setSerial] = useState('')
  const [submittedSerial, setSubmittedSerial] = useState<string | null>(null)

  const query = trpc.warehouse.checkDeviceBySerialNumber.useQuery(
    { serialNumber: submittedSerial ?? '' } as { serialNumber: string },
    { enabled: submittedSerial !== null }
  )

  const isChecking = query.fetchStatus === 'fetching'

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
    <Sheet open={open} onOpenChange={(val) => !val && handleClose()}>
      <SheetContent side="right" className="w-[95%] md:max-w-md">
        <SheetHeader>
          <SheetTitle>Sprawdź sprzęt po numerze seryjnym</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Serial input */}
          <div className="space-y-1">
            <Label htmlFor="serial">Numer seryjny</Label>
            <Input
              id="serial"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              placeholder="Wprowadź numer seryjny..."
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
            <div className="text-sm space-y-2 border-t pt-4">
              <p>
                <strong>Nazwa:</strong> {query.data.name}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                {devicesStatusMap[query.data.status] ?? query.data.status}
              </p>
              <p>
                <strong>Na stanie:</strong>{' '}
                {query.data.assignedTo?.name ?? 'Magazyn'}
              </p>
              <p>
                <strong>Przypisany do zlecenia:</strong>{' '}
                {query.data.assignedOrder?.orderNumber ?? 'Brak'}
              </p>

              {/* NEW: last operation */}
              {query.data.lastActionDate && (
                <p>
                  <strong>Ostatnia operacja:</strong>{' '}
                  {actionMap[query.data.lastAction ?? ''] ??
                    query.data.lastAction}
                  {' — '}
                  {dayjs(query.data.lastActionDate).format('DD.MM.YYYY HH:mm')}
                </p>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default DeviceCheckSheet
