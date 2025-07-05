// src/app/(technician)/components/warehouse/SerialScanInput.tsx
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
}

/**
 * SerialScanInput
 * ------------------------------------------------------------------
 * • Piszesz lub skanujesz numer -> Enter/Dodaj => walidacja + onAddDevice
 * • Gdy przekazane jest props.devices – po ≥ 3 znakach pokazuje dropdown
 *   z pasującymi numerami (klient-side).
 */
const SerialScanInput = ({
  onAddDevice,
  devices = [],
  validStatuses,
}: Props) => {
  const [value, setValue] = useState('')
  const [showDD, setShowDD] = useState(false)
  const utils = trpc.useUtils()

  const { data: session } = useSession()
  const myId = session?.user.id

  /* ------- lokalne podpowiedzi -------- */
  const suggestions = useMemo(() => {
    if (value.trim().length < 3) return []
    const lower = value.trim().toLowerCase()
    return devices.filter((d) => d.serialNumber?.toLowerCase().includes(lower))
  }, [value, devices])

  /* ------- walidacja przez backend -------- */
  const fetchDevice = (serial: string) =>
    utils.warehouse.getBySerialNumber.fetch({ serial: serial.toLowerCase() })

  const tryAdd = async (serial: string) => {
    const s = serial.trim()
    if (!s) return toast.error('Wpisz numer seryjny.')

    try {
      const res = await fetchDevice(s)
      if (!res) return toast.error('Nie znaleziono urządzenia o tym numerze.')
      if (!res.serialNumber)
        return toast.error('Brakuje numeru seryjnego dla tego urządzenia.')
      if (res.serialNumber.toLowerCase() !== s.toLowerCase())
        return toast.error('Numer seryjny nie pasuje dokładnie do urządzenia.')

      if (!validStatuses?.includes(res.status)) {
        toast.error(
          res.assignedTo
            ? 'To urządzenie jest przypisane do innego technika.'
            : 'To urządzenie nie jest dostępne.'
        )
        return
      }

      if (res.assignedToId && res.assignedToId !== myId) {
        toast.error('To urządzenie nie należy do Ciebie.')
        return
      }
      if (res.transferPending) {
        toast.error('To urządzenie jest już w trakcie przekazania.')
        return
      }

      console.log('Moj id: ', myId, res.id, res.status, res.assignedToId)

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
    }
  }

  /* ---------------- render ---------------- */
  return (
    <div className="relative space-y-2">
      <div className="flex gap-2">
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
          variant="secondary"
          onClick={() => tryAdd(value)}
          disabled={!value.trim()}
        >
          Dodaj
        </Button>
      </div>

      {/* dropdown z podpowiedziami */}
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
            <div className="absolute z-10 m123 w-full bg-background border rounded shadow px-3 py-2 text-muted-foreground">
              Brak wyników
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default SerialScanInput
