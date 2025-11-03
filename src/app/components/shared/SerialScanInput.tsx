'use client'

import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { devicesStatusMap } from '@/lib/constants'
import { IssuedItemDevice } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { DeviceCategory, WarehouseStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

/**
 * DeviceBasic – local device definition used for technician stock.
 */
export type DeviceBasic = {
  id: string
  name: string
  serialNumber: string | null
  category: DeviceCategory
  status?: WarehouseStatus
}

interface Props {
  /** Callback triggered after successful device addition */
  onAddDevice: (device: IssuedItemDevice) => void
  /** Technician's current stock (local suggestions) */
  devices?: DeviceBasic[]
  /** Allowed warehouse statuses for adding device */
  validStatuses?: WarehouseStatus[]
  /** Layout mode: inline (compact) or block (full width) */
  variant?: 'inline' | 'block'
  /** Function checking if device already used in current order */
  isDeviceUsed?: (id: string) => boolean
  /** Allowed categories for filtering (e.g., only modems for NET) */
  allowedCategories?: DeviceCategory[]
  /** Optional service context (NET, TEL, etc.) for category-based filtering */
  serviceType?: 'NET' | 'TEL' | 'DTV' | 'ATV'
}

/**
 * SerialScanInput
 * ------------------------------------------------------------
 * Component for searching and validating devices by serial number.
 * - Technician → can add only from own stock (devices[])
 * - Admin / Coordinator → can search globally (warehouse search)
 * - Validates device category, availability, duplicates, and now filters by serviceType.
 */
const SerialScanInput = ({
  onAddDevice,
  devices = [],
  validStatuses = ['AVAILABLE', 'ASSIGNED'],
  variant = 'inline',
  isDeviceUsed,
  allowedCategories,
  serviceType,
}: Props) => {
  const [value, setValue] = useState('')
  const [showDD, setShowDD] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const utils = trpc.useUtils()
  const { data: session } = useSession()
  const { isAdmin, isCoordinator } = useRole()
  const myId = session?.user.id

  /**
   * Remote TRPC search (admin/coordinator only)
   */
  const searchDevices = trpc.warehouse.searchDevices.useQuery(
    {
      query: value.trim(),
      allowedCategories,
    },
    {
      enabled: (isAdmin || isCoordinator) && value.trim().length >= 3,
    }
  )

  /**
   * Determines if a given device is allowed for the current service type.
   * - NET → only devices whose name includes "EXTENDER"
   * - TEL → only devices whose name includes "SIM" or "KARTA SIM"
   * - Otherwise → all devices allowed
   */
  const isAllowedForService = useCallback(
    (device: { name: string }): boolean => {
      if (!serviceType) return true
      const nameUpper = device.name?.toUpperCase() ?? ''

      if (serviceType === 'NET') return nameUpper.includes('EXTENDER')
      if (serviceType === 'TEL')
        return nameUpper.includes('SIM') || nameUpper.includes('KARTA SIM')
      return true
    },
    [serviceType]
  )

  /**
   * Local search (technician stock only)
   * - Includes category filter
   * - Includes serviceType filter (NET → only extenders, TEL → only SIM cards)
   */
  const suggestions = useMemo(() => {
    if (value.trim().length < 3) return []
    const lower = value.trim().toLowerCase()

    return devices.filter((d) => {
      const matchesSerial = d.serialNumber?.toLowerCase().includes(lower)
      const matchesCategory =
        !allowedCategories || allowedCategories.includes(d.category)
      const matchesService = isAllowedForService(d)
      const isValidStatus = validStatuses.includes(d.status ?? 'AVAILABLE')

      return matchesSerial && matchesCategory && matchesService && isValidStatus
    })
  }, [value, devices, allowedCategories, isAllowedForService, validStatuses])

  /** Fetch single device by serial number from backend */
  const fetchDevice = (serial: string) =>
    utils.warehouse.getBySerialNumber.fetch({
      serial: serial.toLowerCase(),
    })

  /**
   * Adds a device to the current order
   * - First tries to resolve locally (technician stock / freed devices)
   * - If not found, fetches from backend (admin/coordinator mode)
   * - Includes all validation: duplicates, ownership, status, serviceType
   */
  const tryAdd = async (serial: string) => {
    const s = serial.trim()
    if (!s) return toast.error('Wpisz numer seryjny.')
    setIsAdding(true)

    try {
      /** ✅ Step 1: Check if device exists locally */
      const localDevice = devices.find(
        (d) => d.serialNumber?.trim().toUpperCase() === s.toUpperCase()
      )

      if (localDevice) {
        // Validate service type rule
        if (!isAllowedForService(localDevice)) {
          toast.error('To urządzenie nie jest dozwolone dla tej usługi.')
          setIsAdding(false)
          return
        }

        // Prevent duplicates
        if (isDeviceUsed?.(localDevice.id)) {
          toast.error('To urządzenie zostało już dodane do tego zlecenia.')
          setIsAdding(false)
          return
        }

        // ✅ Add device directly from local technician stock
        onAddDevice({
          id: localDevice.id,
          type: 'DEVICE',
          name: localDevice.name,
          serialNumber: localDevice.serialNumber ?? '',
          category: localDevice.category,
        })
        toast.success('Dodano urządzenie z lokalnego stanu.')
        setValue('')
        setShowDD(false)
        setIsAdding(false)
        return
      }

      /** 🔹 Step 2: Fallback – fetch from backend */
      const res = await fetchDevice(s)

      if (!res) {
        toast.error('Nie znaleziono urządzenia o tym numerze.')
        return
      }

      // Validate service type rule
      if (!isAllowedForService(res)) {
        toast.error('To urządzenie nie jest dozwolone dla tej usługi.')
        return
      }

      // Category and serial validation
      if (!res.serialNumber)
        return toast.error('Brakuje numeru seryjnego urządzenia.')
      if (!res.category)
        return toast.error('Urządzenie nie ma przypisanej kategorii.')

      // Technician ownership check
      if (
        !isAdmin &&
        !isCoordinator &&
        res.assignedToId &&
        res.assignedToId !== myId
      ) {
        toast.error('To urządzenie jest przypisane do innego technika.')
        return
      }

      // Status validation
      if (!validStatuses.includes(res.status)) {
        toast.error(
          `Urządzenie ${res.name} | ${
            res.serialNumber
          } nie jest dostępne, status: ${devicesStatusMap[res.status]}.`
        )
        return
      }

      // Category validation
      if (allowedCategories && !allowedCategories.includes(res.category)) {
        toast.error('Ten typ urządzenia nie jest dozwolony dla tej usługi.')
        return
      }

      // Transfer state check
      if (res.transferPending) {
        toast.error('To urządzenie jest w trakcie przekazania.')
        return
      }

      // Duplicate prevention
      if (isDeviceUsed?.(res.id)) {
        toast.error('To urządzenie zostało już dodane do tego zlecenia.')
        return
      }

      // ✅ Success
      onAddDevice({
        id: res.id,
        type: 'DEVICE',
        name: res.name,
        serialNumber: res.serialNumber ?? '',
        category: res.category ?? 'OTHER',
      })
      toast.success('Dodano urządzenie.')
      setValue('')
      setShowDD(false)
    } catch {
      toast.error('Nie znaleziono urządzenia o tym numerze.')
    } finally {
      setIsAdding(false)
    }
  }

  /** Component render */
  return (
    <div className="relative space-y-2">
      {/* --- Input field and action button --- */}
      {variant === 'inline' ? (
        <div className="flex md:flex-row gap-2">
          <Input
            value={value}
            onChange={(e) => {
              const v = e.target.value.trim()
              setValue(e.target.value)
              setShowDD(v.length >= 3 && devices.length > 0)
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
              const v = e.target.value.trim()
              setValue(e.target.value)
              setShowDD(v.length >= 3 && devices.length > 0)
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
            disabled={!value.trim() || isAdding}
          >
            {isAdding ? 'Dodawanie…' : 'Dodaj'}
          </Button>
        </div>
      )}

      {/* --- Suggestion dropdown --- */}
      {showDD && (
        <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow max-h-60 overflow-auto">
          {/* Local technician stock */}
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

          {/* Global warehouse (admin/coordinator only, excluding duplicates) */}
          {(isAdmin || isCoordinator) &&
            searchDevices.data
              ?.filter(
                (gd) =>
                  isAllowedForService(gd) &&
                  !suggestions.some(
                    (ld) =>
                      ld.serialNumber &&
                      gd.serialNumber &&
                      ld.serialNumber.toLowerCase() ===
                        gd.serialNumber.toLowerCase()
                  )
              )
              .map((d) => (
                <div
                  key={d.id}
                  onClick={() => tryAdd(d.serialNumber ?? '')}
                  className="cursor-pointer px-3 py-2 hover:bg-muted text-sm border-t"
                >
                  <div className="font-medium text-amber-600">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    SN: {d.serialNumber} (magazyn)
                  </div>
                </div>
              ))}

          {/* Empty state */}
          {suggestions.length === 0 &&
            (!searchDevices.data || searchDevices.data.length === 0) && (
              <div className="px-3 py-2 text-muted-foreground text-sm">
                Brak wyników
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default SerialScanInput
