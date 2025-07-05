// src/app/(technician)/components/warehouse/DeviceTransferScan.tsx
'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { IssuedItemDevice } from '@/types'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = { onAdd: (device: IssuedItemDevice) => void }

/**
 * DeviceTransferScan
 * --------------------------------------------------
 * • Technician types / scans a serial number and adds the device
 *   to the transfer list (ASSIGNED → pending transfer).
 * • Validates ownership / status and shows proper toasts.
 */
const DeviceTransferScan = ({ onAdd }: Props) => {
  const [serialInput, setSerialInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trpcUtils = trpc.useUtils()

  /** Handle form submission */
  const handleSubmit = async () => {
    const trimmedSerial = serialInput.trim()
    if (!trimmedSerial) {
      toast.error('Wpisz numer seryjny.')
      return
    }

    try {
      setIsSubmitting(true)

      const device = await trpcUtils.warehouse.getBySerialNumber.fetch({
        serial: trimmedSerial.toLowerCase(),
      })

      if (!device) {
        toast.error('Nie znaleziono urządzenia.')
        return
      }
      if (device.status !== 'ASSIGNED') {
        toast.error('Urządzenie nie jest przypisane do Ciebie.')
        return
      }

      onAdd({
        id: device.id,
        type: 'DEVICE',
        name: device.name,
        serialNumber: device.serialNumber!,
        category: device.category ?? 'OTHER',
      })

      toast.success('Dodano urządzenie do listy.')
      setSerialInput('')
    } catch {
      toast.error('Błąd podczas wyszukiwania.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* -------------------- render -------------------- */
  return (
    <div className="flex gap-2">
      <Input
        className="[text-transform:uppercase] placeholder:normal-case"
        value={serialInput}
        onChange={(e) => setSerialInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Wpisz lub zeskanuj numer seryjny urządzenia"
        autoFocus
      />

      <Button
        variant="secondary"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Dodawanie…' : 'Dodaj'}
      </Button>
    </div>
  )
}

export default DeviceTransferScan
