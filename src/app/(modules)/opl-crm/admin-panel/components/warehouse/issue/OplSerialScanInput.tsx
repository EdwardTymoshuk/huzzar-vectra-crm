'use client'

import BarcodeScannerDialog from '@/app/components/BarcodeScannerDialog'
import { Button } from '@/app/components/ui/button'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'
import { devicesStatusMap } from '@/lib/constants'
import { OplDeviceBasic, OplIssuedItemDevice } from '@/types/opl-crm'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory, OplWarehouseStatus } from '@prisma/client'
import { ScanLine } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

interface Props {
  /** Callback triggered after successful device addition */
  onAdd: (device: OplIssuedItemDevice) => void

  /** Technician's current stock (local search) */
  devices?: OplDeviceBasic[]

  /** Allowed warehouse statuses */
  validStatuses?: OplWarehouseStatus[]

  /** Prevent duplicates in current order */
  isDeviceUsed?: (id: string) => boolean

  /** Optional category filter */
  allowedCategories?: OplDeviceCategory[]

  /** Layout variant */
  variant?: 'inline' | 'block'

  /**
   * If set to 'WAREHOUSE', blocks adding devices
   * that are not found in warehouse (Vectra-style).
   */
  strictSource?: 'WAREHOUSE'
}

/**
 * OplSerialScanInput
 * ------------------------------------------------------------
 * Serial-based device selector.
 *
 * Rules:
 * - Technician → can add only from own stock
 * - Admin / Coordinator → can search warehouse
 * - Backend guarantees non-null category & serial
 * - No "source" flag – backend validates everything
 */
const OplSerialScanInput = ({
  onAdd,
  devices = [],
  validStatuses = ['AVAILABLE', 'ASSIGNED'],
  isDeviceUsed,
  allowedCategories,
  variant = 'inline',
  strictSource,
}: Props) => {
  const [value, setValue] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const utils = trpc.useUtils()
  const { data: session } = useSession()
  const { isTechnician, isAdmin, isCoordinator } = useRole()
  const myId = session?.user.id

  /**
   * Remote warehouse search (admin/coordinator only)
   */
  const searchDevices = trpc.opl.warehouse.searchDevices.useQuery(
    {
      query: value.trim(),
      allowedCategories,
    },
    {
      enabled: (isAdmin || isCoordinator) && value.trim().length >= 3,
    }
  )

  /**
   * Local technician stock suggestions
   */
  const suggestions = useMemo(() => {
    if (value.trim().length < 3) return []
    const q = value.trim().toLowerCase()

    return devices.filter((d) => {
      const matchesSerial = d.serialNumber?.toLowerCase().includes(q)
      const matchesCategory =
        !allowedCategories || allowedCategories.includes(d.category)
      const matchesStatus = validStatuses.includes(d.status ?? 'AVAILABLE')

      return matchesSerial && matchesCategory && matchesStatus
    })
  }, [value, devices, allowedCategories, validStatuses])

  const fetchDevice = (serial: string) =>
    utils.opl.warehouse.getBySerialNumber.fetch({ serial })

  /**
   * Main add logic
   */
  const tryAdd = useCallback(
    async (serial: string) => {
      const s = serial.trim()
      if (!s) return toast.error('Wpisz numer seryjny.')
      setIsAdding(true)

      try {
        const normalized = s.toUpperCase()

        // 1️⃣ Local technician stock
        const local = devices.find(
          (d) => d.serialNumber?.toUpperCase() === normalized
        )

        if (local) {
          if (isDeviceUsed?.(local.id)) {
            toast.error('To urządzenie jest już dodane.')
            return
          }

          if (!validStatuses.includes(local.status ?? 'AVAILABLE')) {
            toast.error(
              `Urządzenie niedostępne: ${
                devicesStatusMap[local.status ?? 'AVAILABLE']
              }`
            )
            return
          }

          onAdd({
            id: local.id,
            type: 'DEVICE',
            name: local.name,
            serialNumber: local.serialNumber!,
            category: local.category,
            deviceDefinitionId: local.deviceDefinitionId,
          })

          toast.success('Dodano urządzenie ze stanu technika.')
          setValue('')
          setShowDD(false)
          return
        }

        // 2️⃣ Hard block for technicians
        if (isTechnician || strictSource === 'WAREHOUSE') {
          toast.error('Nie możesz dodać urządzenia spoza swojego stanu.')
          return
        }

        // 3️⃣ Admin / Coordinator → warehouse fetch
        const res = await fetchDevice(s)

        if (isDeviceUsed?.(res.id)) {
          toast.error('To urządzenie jest już dodane.')
          return
        }

        onAdd({
          id: res.id,
          type: 'DEVICE',
          name: res.name,
          serialNumber: res.serialNumber!,
          category: res.category,
          deviceDefinitionId: res.deviceDefinitionId,
        })

        toast.success('Dodano urządzenie z magazynu.')
        setValue('')
        setShowDD(false)
      } catch (err) {
        toast.error('Nie znaleziono urządzenia.')
      } finally {
        setIsAdding(false)
      }
    },
    [
      devices,
      isDeviceUsed,
      validStatuses,
      isTechnician,
      strictSource,
      fetchDevice,
      onAdd,
    ]
  )

  return (
    <div className="relative space-y-2">
      <div
        className={variant === 'inline' ? 'flex gap-2' : 'flex flex-col gap-2'}
      >
        <InputGroup className="flex-1">
          <InputGroupInput
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setShowDD(e.target.value.trim().length >= 3)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                tryAdd(value)
              }
            }}
            placeholder="Wpisz lub zeskanuj numer seryjny"
            className="[text-transform:uppercase]"
          />

          {isTechnician && (
            <InputGroupButton onClick={() => setScannerOpen(true)}>
              <ScanLine className="h-4 w-4" />
            </InputGroupButton>
          )}
        </InputGroup>

        <Button
          onClick={() => tryAdd(value)}
          disabled={!value.trim() || isAdding}
        >
          {isAdding ? 'Dodawanie…' : 'Dodaj'}
        </Button>
      </div>

      {showDD && (
        <div className="absolute z-10 w-full bg-background border rounded shadow">
          {suggestions.map((d) => (
            <div
              key={d.id}
              onClick={() => tryAdd(d.serialNumber!)}
              className="px-3 py-2 cursor-pointer hover:bg-muted text-sm"
            >
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-muted-foreground">
                SN: {d.serialNumber}
              </div>
            </div>
          ))}
        </div>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => tryAdd(code)}
      />
    </div>
  )
}

export default OplSerialScanInput
