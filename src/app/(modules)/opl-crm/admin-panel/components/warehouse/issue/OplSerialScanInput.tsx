'use client'

import BarcodeScannerDialog from '@/app/components/BarcodeScannerDialog'
import { Button } from '@/app/components/ui/button'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'
import { OplDeviceBasic, OplIssuedItemDevice } from '@/types/opl-crm'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory, OplWarehouseStatus } from '@prisma/client'
import { ScanLine } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

type Mode = 'ISSUE' | 'TRANSFER'

interface Props {
  /** Devices list used for local suggestions (UX). */
  devices: OplDeviceBasic[]
  /** Adds selected device to parent list. */
  onAddDevice: (device: OplIssuedItemDevice) => void
  /** Component behavior profile. */
  mode: Mode
  /** Optional category filter (if you ever need it). */
  allowedCategories?: OplDeviceCategory[]
  /** Prevent duplicate additions in parent. */
  isDeviceUsed?: (id: string) => boolean
  /** Layout mode: inline (compact) or block (full width). */
  variant?: 'inline' | 'block'
}

/**
 * OplSerialScanInput
 * ------------------------------------------------------------
 * Device picker by serial number with local suggestions + backend validation.
 * - Suggestions: from `devices` prop (fast UX, no need to type full SN)
 * - Validation: always confirmed via backend when needed
 * - mode="ISSUE": allows only AVAILABLE devices
 * - mode="TRANSFER": typically allows only ASSIGNED devices (depends on your flow)
 */
const OplSerialScanInput = ({
  devices,
  onAddDevice,
  mode,
  allowedCategories,
  isDeviceUsed,
  variant = 'inline',
}: Props) => {
  const [value, setValue] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const utils = trpc.useUtils()

  const validStatuses: OplWarehouseStatus[] = useMemo(() => {
    // ISSUE: take from warehouse (available only)
    if (mode === 'ISSUE') return ['AVAILABLE']
    // TRANSFER: usually from technician stock (assigned only)
    return ['ASSIGNED']
  }, [mode])

  const normalizeSerial = (sn: string): string => sn.trim().toUpperCase()

  const isAllowedCategory = useCallback(
    (category: OplDeviceCategory | null | undefined): boolean => {
      if (!allowedCategories || allowedCategories.length === 0) return true
      if (!category) return false
      return allowedCategories.includes(category)
    },
    [allowedCategories]
  )

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (q.length < 3) return []

    return devices.filter((d) => {
      const sn = d.serialNumber?.toLowerCase() ?? ''
      const matchesSerial = sn.includes(q)
      const matchesCategory = isAllowedCategory(d.category)
      const status = d.status ?? 'AVAILABLE'
      const matchesStatus = validStatuses.includes(status)

      return matchesSerial && matchesCategory && matchesStatus
    })
  }, [value, devices, isAllowedCategory, validStatuses])

  const fetchBySerial = (serial: string) =>
    utils.opl.warehouse.getBySerialNumber.fetch({
      serial: serial.toLowerCase(),
    })

  const buildIssuedDevice = (d: {
    id: string
    name: string
    serialNumber: string | null
    category: OplDeviceCategory | null
  }): OplIssuedItemDevice | null => {
    if (!d.serialNumber) return null
    if (!d.category) return null

    return {
      id: d.id,
      type: 'DEVICE',
      name: d.name,
      serialNumber: d.serialNumber,
      category: d.category,
    }
  }

  const toastAdded = (): void => {
    toast.success(
      mode === 'ISSUE'
        ? 'Dodano urządzenie z magazynu.'
        : 'Dodano urządzenie do przekazania.'
    )
  }

  const rejectNotAllowedStatus = (status: OplWarehouseStatus): void => {
    const label =
      mode === 'ISSUE'
        ? 'To urządzenie nie jest dostępne na magazynie.'
        : 'To urządzenie nie jest dostępne do przekazania.'
    toast.error(`${label} Status: ${status}.`)
  }

  const tryAdd = async (serial: string) => {
    const s = normalizeSerial(serial)
    if (!s) return toast.error('Wpisz numer seryjny.')
    setIsAdding(true)

    try {
      // 1) Local match (fast path) — safe because list is filtered already
      const local = devices.find(
        (d) => normalizeSerial(d.serialNumber ?? '') === s
      )

      if (local) {
        const localStatus = local.status ?? 'AVAILABLE'
        if (!validStatuses.includes(localStatus)) {
          rejectNotAllowedStatus(localStatus)
          return
        }

        if (isDeviceUsed?.(local.id)) {
          toast.error('To urządzenie jest już dodane.')
          return
        }

        const issued = buildIssuedDevice({
          id: local.id,
          name: local.name,
          serialNumber: local.serialNumber,
          category: local.category,
        })

        if (!issued) {
          toast.error('Brakuje danych urządzenia (SN lub kategoria).')
          return
        }

        onAddDevice(issued)
        toastAdded()
        setValue('')
        setShowDD(false)
        return
      }

      // 2) Not in local list -> backend check (source of truth)
      const res = await fetchBySerial(s)

      // status validation
      if (!validStatuses.includes(res.status)) {
        rejectNotAllowedStatus(res.status)
        return
      }

      // category restriction
      if (!isAllowedCategory(res.category)) {
        toast.error('Ten typ urządzenia nie jest dozwolony.')
        return
      }

      // ownership / assigned checks (important!)
      // For ISSUE: device must be warehouse-available => should not be assignedToId
      if (mode === 'ISSUE' && res.assignedToId) {
        toast.error(
          'To urządzenie jest przypisane do technika i nie jest na magazynie.'
        )
        return
      }

      // For TRANSFER: device must be assigned (you can add extra check here if you pass target technician)
      if (mode === 'TRANSFER' && !res.assignedToId) {
        toast.error('To urządzenie nie jest przypisane do żadnego technika.')
        return
      }

      if (isDeviceUsed?.(res.id)) {
        toast.error('To urządzenie jest już dodane.')
        return
      }

      const issued = buildIssuedDevice(res)
      if (!issued) {
        toast.error('Brakuje danych urządzenia (SN lub kategoria).')
        return
      }

      onAddDevice(issued)
      toastAdded()
      setValue('')
      setShowDD(false)
    } catch (e) {
      console.error(e)
      toast.error('Nie znaleziono urządzenia o tym numerze.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="relative space-y-2">
      {variant === 'inline' ? (
        <div className="flex md:flex-row gap-2">
          <InputGroup className="flex-1">
            <InputGroupInput
              value={value}
              onChange={(e) => {
                const v = e.target.value
                setValue(v)
                setShowDD(v.trim().length >= 3)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void tryAdd(value)
                }
              }}
              className="[text-transform:uppercase] placeholder:normal-case"
              placeholder="Wpisz lub zeskanuj numer seryjny"
              autoFocus
            />

            <InputGroupButton
              type="button"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan barcode"
            >
              <ScanLine className="h-4 w-4" />
            </InputGroupButton>
          </InputGroup>

          <Button
            variant="default"
            onClick={() => void tryAdd(value)}
            disabled={!value.trim() || isAdding}
            className="md:w-fit"
          >
            {isAdding ? 'Dodawanie…' : 'Dodaj'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <InputGroup className="flex-1">
            <InputGroupInput
              value={value}
              onChange={(e) => {
                const v = e.target.value
                setValue(v)
                setShowDD(v.trim().length >= 3)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void tryAdd(value)
                }
              }}
              className="[text-transform:uppercase] placeholder:normal-case"
              placeholder="Wpisz lub zeskanuj numer seryjny"
              autoFocus
            />

            <InputGroupButton
              type="button"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan barcode"
            >
              <ScanLine className="h-4 w-4" />
            </InputGroupButton>
          </InputGroup>

          <Button
            variant="default"
            className="w-full md:w-fit"
            onClick={() => void tryAdd(value)}
            disabled={!value.trim() || isAdding}
          >
            {isAdding ? 'Dodawanie…' : 'Dodaj'}
          </Button>
        </div>
      )}

      {showDD && (
        <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow max-h-60 overflow-auto">
          {suggestions.map((d) => (
            <div
              key={d.id}
              onClick={() => void tryAdd(d.serialNumber ?? '')}
              className="cursor-pointer px-3 py-2 hover:bg-muted text-sm"
            >
              <div className="font-medium break-words">{d.name}</div>
              <div className="text-muted-foreground text-xs break-words">
                SN: {d.serialNumber}
              </div>
            </div>
          ))}

          {suggestions.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground text-sm">
              Brak wyników
            </div>
          )}
        </div>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          const normalized = normalizeSerial(code)
          setValue(normalized)
          void tryAdd(normalized)
        }}
      />
    </div>
  )
}

export default OplSerialScanInput
