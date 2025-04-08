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
    if (!serial) return

    try {
      // Force lowercase to normalize input
      const res = await utils.warehouse.getBySerialNumber.fetch({
        serial: serial.toLowerCase(),
      })

      if (!res) {
        toast.error('Nie znaleziono urządzenia o podanym numerze.')
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
        const assignedInfo = res.assignedTo
          ? ` (${res.assignedTo.name}, ${res.assignedTo.identyficator})`
          : ''
        toast.error(
          `Urządzenie niedostępne. Status: ${res.status}${assignedInfo}`
        )
        return
      }

      onAddDevice({
        id: res.id,
        type: 'DEVICE',
        name: res.name,
        serialNumber: res.serialNumber,
        category: res.category ?? 'OTHER',
      })
      toast.success('Dodano urządzenie')
      setValue('')
    } catch (err) {
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
        placeholder="Zeskanuj lub wpisz numer seryjny"
        autoFocus
      />
      <Button variant="secondary" onClick={handleSubmit}>
        Dodaj
      </Button>
    </div>
  )
}

export default SerialScanInput
