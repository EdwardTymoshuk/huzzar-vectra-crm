'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { IssuedItemDevice } from '@/types'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  onAddDevice: (device: IssuedItemDevice) => void
}

/**
 * SerialScanInput:
 * - Allows scanning or typing a serial number to add a device.
 * - Fetches device info via TRPC and validates availability.
 */
const SerialScanInput = ({ onAddDevice }: Props) => {
  const [value, setValue] = useState('')
  const utils = trpc.useUtils()

  const handleSubmit = async () => {
    const serial = value.trim()
    if (!serial) return toast.error('Wpisz numer seryjny.')

    try {
      const res = await utils.warehouse.getBySerialNumber.fetch({
        serial: serial.toLowerCase(),
      })

      if (!res) {
        toast.error('Nie znaleziono urządzenia o tym numerze.')
        return
      }

      if (!res.serialNumber) {
        toast.error('Brakuje numeru seryjnego dla tego urządzenia.')
        return
      }

      if (res.serialNumber.toLowerCase() !== serial.toLowerCase()) {
        toast.error('Numer seryjny nie pasuje dokładnie do urządzenia.')
        return
      }

      if (res.status !== 'AVAILABLE') {
        if (res.assignedTo) {
          toast.error('To urządzenie jest przypisane do innego technika.')
        } else {
          toast.error('To urządzenie nie może zostać zwrócone.')
        }
        return
      }

      onAddDevice({
        id: res.id,
        type: 'DEVICE',
        name: res.name,
        serialNumber: res.serialNumber,
        category: res.category ?? 'OTHER',
      })

      toast.success('Dodano urządzenie.')
      setValue('')
    } catch {
      toast.error('Wystąpił błąd podczas wyszukiwania urządzenia.')
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Wpisz lub zeskanuj numer seryjny urządzenia"
        autoFocus
      />
      <Button variant="secondary" onClick={handleSubmit}>
        Dodaj
      </Button>
    </div>
  )
}

export default SerialScanInput
