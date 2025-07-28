'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { IssuedItemDevice } from '@/types'
import { trpc } from '@/utils/trpc'
import { WarehouseStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type DeviceBasic = { id: string; name: string; serialNumber: string | null }

interface Props {
  onAddDevice: (device: IssuedItemDevice) => void
  devices?: DeviceBasic[]
  validStatuses?: WarehouseStatus[]
  variant?: 'inline' | 'block'
}

/**
 * SerialScanInput – device serial number search and validation.
 * Shows dropdown suggestions (if devices provided), validates from backend.
 * Calls onAddDevice when device is accepted.
 */
const SerialScanInput = ({
  onAddDevice,
  devices = [],
  validStatuses,
  variant = 'inline',
}: Props) => {
  const [value, setValue] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const utils = trpc.useUtils()
  const { data: session } = useSession()

  const myId = session?.user.id

  // Suggestions for local search (min 3 chars)
  const suggestions = useMemo(() => {
    if (value.trim().length < 3) return []
    const lower = value.trim().toLowerCase()
    return devices.filter((d) => d.serialNumber?.toLowerCase().includes(lower))
  }, [value, devices])

  // Fetches device info from backend
  const fetchDevice = (serial: string) =>
    utils.warehouse.getBySerialNumber.fetch({ serial: serial.toLowerCase() })

  // Main logic for adding device (with backend validation)
  const tryAdd = async (serial: string) => {
    const s = serial.trim()
    if (!s) return toast.error('Wpisz numer seryjny.')
    setIsAdding(true)
    try {
      const res = await fetchDevice(s)
      if (!res) return toast.error('Nie znaleziono urządzenia o tym numerze.')
      if (!res.serialNumber)
        return toast.error('Brakuje numeru seryjnego dla tego urządzenia.')
      if (res.serialNumber.toLowerCase() !== s.toLowerCase())
        return toast.error('Numer seryjny nie pasuje dokładnie do urządzenia.')

      // Technicians can only add their own devices
      if (res.assignedToId && res.assignedToId !== myId) {
        toast.error('To urządzenie jest przypisane do innego technika.')
        return
      }

      // Only allowed statuses are accepted
      if (
        !res.assignedToId &&
        validStatuses &&
        !validStatuses.includes(res.status)
      ) {
        toast.error('To urządzenie nie jest dostępne.')
        return
      }

      if (res.transferPending) {
        toast.error('To urządzenie jest już w trakcie przekazania.')
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
      setShowDD(false)
    } catch {
      toast.error('Wystąpił błąd podczas wyszukiwania urządzenia.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="relative space-y-2">
      {/* Input + button layout (inline or block variant) */}
      {variant === 'inline' ? (
        <div className="flex md:flex-row gap-2">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setShowDD(e.target.value.trim().length >= 3 && devices.length > 0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                tryAdd(value)
              }
            }}
            className="[text-transform:uppercase] placeholder:normal-case"
            placeholder="Wpisz lub zeskanuj numer seryjny"
            autoFocus
          />
          <Button
            variant="default"
            onClick={() => tryAdd(value)}
            disabled={!value.trim() || isAdding}
            className="md:w-fit"
          >
            {isAdding ? 'Dodawanie…' : 'Dodaj'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setShowDD(e.target.value.trim().length >= 3 && devices.length > 0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                tryAdd(value)
              }
            }}
            className="[text-transform:uppercase] placeholder:normal-case"
            placeholder="Wpisz lub zeskanuj numer seryjny"
            autoFocus
          />
          <Button
            variant="default"
            className="w-full md:w-fit"
            onClick={() => tryAdd(value)}
            disabled={!value.trim()}
          >
            Dodaj
          </Button>
        </div>
      )}

      {/* Local dropdown suggestions */}
      {showDD && (
        <>
          {suggestions.length > 0 ? (
            <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow max-h-60 overflow-auto">
              {suggestions.map((d) => (
                <div
                  key={d.id}
                  onClick={() => tryAdd(d.serialNumber ?? '')}
                  className="cursor-pointer px-3 py-2 hover:bg-muted text-sm"
                >
                  <div className="font-medium break-words">{d.name}</div>
                  <div className="text-muted-foreground text-xs break-words">
                    SN: {d.serialNumber}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="absolute z-10 w-full bg-background border rounded shadow px-3 py-2 text-muted-foreground">
              Brak wyników
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SerialScanInput
