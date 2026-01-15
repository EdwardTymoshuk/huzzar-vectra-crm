'use client'

import { Button } from '@/app/components/ui/button'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'
import { devicesStatusMap } from '@/lib/constants'
import { IssuedItemDevice } from '@/types'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { DeviceCategory, WarehouseStatus } from '@prisma/client'
import { ScanLine } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import BarcodeScannerDialog from './orders/BarcodeScannerDialog'

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
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isScanAttempt, setIsScanAttempt] = useState(false)

  const utils = trpc.useUtils()
  const { data: session } = useSession()
  const { isTechnician, isAdmin, isCoordinator } = useRole()
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
  /**
   * Validates if device is allowed for given service type.
   * Includes support for additional devices (e.g. extenders).
   */
  const isAllowedForService = useCallback(
    (device: { name: string; category?: DeviceCategory }): boolean => {
      if (!serviceType) return true

      const category = device.category
      const nameUpper = device.name?.toUpperCase() ?? ''

      switch (serviceType) {
        // NET: main -> modems only, additional -> extenders/routers
        case 'NET':
          if (allowedCategories?.includes(DeviceCategory.OTHER)) {
            return (
              nameUpper.includes('EXTENDER') ||
              nameUpper.includes('PLC') ||
              nameUpper.includes('REPEATER') ||
              nameUpper.includes('EXT') ||
              category === DeviceCategory.NETWORK_DEVICE
            )
          }
          return (
            category === DeviceCategory.MODEM_HFC ||
            category === DeviceCategory.MODEM_GPON
          )

        // TEL: SIM devices only
        case 'TEL':
          return nameUpper.includes('SIM') || nameUpper.includes('KARTA SIM')

        // DTV/ATV: decoders only
        case 'DTV':
        case 'ATV':
          return (
            category === DeviceCategory.DECODER_1_WAY ||
            category === DeviceCategory.DECODER_2_WAY
          )

        default:
          return true
      }
    },
    [serviceType, allowedCategories]
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
   * Attempts to add a device by serial number.
   * - Technicians → only own stock (devices[])
   * - Admin / Coordinator → can fetch from warehouse
   * - Validates duplicates, ownership, status, and service compatibility
   */
  const tryAdd = async (serial: string) => {
    const s = serial.trim()
    if (!s) return toast.error('Wpisz numer seryjny.')
    setIsAdding(true)

    try {
      /** ✅ STEP 1: Try to find device locally (technician stock) */
      const normalizedSerial = s.toUpperCase()
      const localDevice = devices.find(
        (d) => d.serialNumber?.trim().toUpperCase() === normalizedSerial
      )

      if (localDevice) {
        // Router for T-Mobile (GPON required)
        if (
          allowedCategories?.length === 1 &&
          allowedCategories[0] === DeviceCategory.MODEM_GPON &&
          localDevice.category !== DeviceCategory.MODEM_GPON
        ) {
          toast.warning(
            `Urządzenie ${localDevice.name} (SN: ${
              localDevice.serialNumber ?? 'brak'
            }) nie jest dozwolone jako router T-Mobile. Wybierz MODEM GPON.`
          )
          setIsAdding(false)
          return
        }

        // Service-type compatibility
        if (!isAllowedForService(localDevice)) {
          toast.warning(
            `Urządzenie ${localDevice.name} (SN: ${
              localDevice.serialNumber ?? 'brak'
            }) nie jest dozwolone dla tej usługi.`
          )
          setIsAdding(false)
          return
        }

        // Prevent duplicate
        if (isDeviceUsed?.(localDevice.id)) {
          toast.error('To urządzenie zostało już dodane do tego zlecenia.')
          setIsAdding(false)
          return
        }

        // Status validation
        if (!validStatuses.includes(localDevice.status ?? 'AVAILABLE')) {
          toast.error(
            `Urządzenie ${localDevice.name} (SN: ${
              localDevice.serialNumber ?? 'brak'
            }) nie może być użyte, status: ${
              devicesStatusMap[localDevice.status ?? 'AVAILABLE']
            }.`
          )
          setIsAdding(false)
          return
        }

        // Add from technician stock
        onAddDevice({
          id: localDevice.id,
          type: 'DEVICE',
          name: localDevice.name,
          serialNumber: localDevice.serialNumber ?? '',
          category: localDevice.category,
        })

        toast.success('Dodano urządzenie z lokalnego stanu technika.')
        setValue('')
        setShowDD(false)
        setIsScanAttempt(false)
        setIsAdding(false)
        return
      }

      /** 🚫 STEP 2: Block lookup for technicians (no local match) */
      if (!isAdmin && !isCoordinator) {
        toast.error(
          'Nie możesz dodać urządzenia spoza swojego stanu. Skontaktuj się z magazynem.'
        )

        if (isScanAttempt) {
          setValue('')
          setIsScanAttempt(false)
        }

        setIsAdding(false)
        return
      }

      /** 🔹 STEP 3: Admin / Coordinator → fetch from warehouse */
      const res = await fetchDevice(s)

      if (!res) {
        toast.error('Nie znaleziono urządzenia o tym numerze.')
        setIsAdding(false)
        return
      }

      // Normalize category type (convert null → undefined for TS safety)
      const category: DeviceCategory | undefined = res.category ?? undefined

      // Service-type validation
      if (!isAllowedForService({ name: res.name, category })) {
        toast.error('To urządzenie nie jest dozwolone dla tej usługi.')
        setIsAdding(false)
        return
      }

      // Serial and category required
      if (!res.serialNumber)
        return toast.error('Brakuje numeru seryjnego urządzenia.')
      if (!category)
        return toast.error('Urządzenie nie ma przypisanej kategorii.')

      // Ownership check
      if (
        !isAdmin &&
        !isCoordinator &&
        res.assignedToId &&
        res.assignedToId !== myId
      ) {
        toast.error('To urządzenie jest przypisane do innego technika.')
        setIsAdding(false)
        return
      }

      // Status check
      if (!validStatuses.includes(res.status)) {
        toast.error(
          `Urządzenie ${res.name} | ${
            res.serialNumber
          } nie jest dostępne, status: ${devicesStatusMap[res.status]}.`
        )
        setIsAdding(false)
        return
      }

      // Category restriction
      if (allowedCategories && !allowedCategories.includes(category)) {
        toast.error('Ten typ urządzenia nie jest dozwolony dla tej usługi.')
        setIsAdding(false)
        return
      }

      // Transfer state
      if (res.transferPending) {
        toast.error('To urządzenie jest w trakcie przekazania.')
        setIsAdding(false)
        return
      }

      // Duplicate prevention
      if (isDeviceUsed?.(res.id)) {
        toast.error('To urządzenie zostało już dodane do tego zlecenia.')
        setIsAdding(false)
        return
      }

      /** ✅ STEP 4: Add device from warehouse */
      onAddDevice({
        id: res.id,
        type: 'DEVICE',
        name: res.name,
        serialNumber: res.serialNumber ?? '',
        category: category,
      })

      toast.success('Dodano urządzenie z magazynu.')
      setValue('')
      setShowDD(false)
    } catch (err) {
      console.error(err)
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
          <InputGroup className="flex-1">
            <InputGroupInput
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
              className="h-12 [text-transform:uppercase] placeholder:normal-case"
              placeholder="Wpisz lub zeskanuj numer seryjny"
              autoFocus
            />

            {isTechnician && (
              <InputGroupButton
                type="button"
                onClick={() => setScannerOpen(true)}
                aria-label="Scan barcode"
              >
                <ScanLine className="h-4 w-4" />
              </InputGroupButton>
            )}
          </InputGroup>

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
          <InputGroup className="flex-1">
            <InputGroupInput
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
              className="h-12 [text-transform:uppercase] placeholder:normal-case"
              placeholder="Wpisz lub zeskanuj numer seryjny"
              autoFocus
            />

            {isTechnician && (
              <InputGroupButton
                type="button"
                onClick={() => setScannerOpen(true)}
                aria-label="Scan barcode"
                size="sm"
                className="h-full"
              >
                <ScanLine className="h-4 w-4" />
              </InputGroupButton>
            )}
          </InputGroup>

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
              ?.filter((gd) => {
                const category: DeviceCategory | undefined =
                  gd.category ?? undefined

                return (
                  isAllowedForService({ name: gd.name, category }) &&
                  !suggestions.some(
                    (ld) =>
                      ld.serialNumber &&
                      gd.serialNumber &&
                      ld.serialNumber.toLowerCase() ===
                        gd.serialNumber.toLowerCase()
                  )
                )
              })
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

      {/* --- Barcode scanner dialog --- */}
      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          const normalized = code.trim().toUpperCase()
          setIsScanAttempt(true)
          setValue(normalized)
        }}
      />
    </div>
  )
}

export default SerialScanInput
