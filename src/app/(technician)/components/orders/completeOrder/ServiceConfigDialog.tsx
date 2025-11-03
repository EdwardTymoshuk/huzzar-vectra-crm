'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { ActivatedService, DeviceSource, IssuedItemDevice } from '@/types'
import { DeviceCategory, ServiceType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import DeviceCard from './DeviceCard'
import ServiceDeviceSection from './ServiceDeviceSection'

/**
 * ServiceConfigDialog
 * ------------------------------------------------------
 * Configures DTV or NET service before saving into ActivatedService.
 * - Supports both warehouse and client devices.
 * - NET supports adding multiple extra devices (routers, extenders).
 * - Displays measurements and prevents duplicates or identical serials.
 */
interface Props {
  open: boolean
  type: ServiceType
  operator: string
  devices: IssuedItemDevice[]
  usedDeviceIds: string[]
  onConfirmAction: (service: ActivatedService) => void
  onCloseAction: () => void
}

const ServiceConfigDialog = ({
  open,
  type,
  operator,
  devices,
  usedDeviceIds,
  onConfirmAction,
  onCloseAction,
}: Props) => {
  const [primarySource, setPrimarySource] = useState<DeviceSource>('WAREHOUSE')
  const [primaryDevice, setPrimaryDevice] = useState<IssuedItemDevice | null>(
    null
  )
  const [clientCategory, setClientCategory] = useState<DeviceCategory | null>(
    null
  )
  const [primaryClientName, setPrimaryClientName] = useState('')
  const [primaryClientSn, setPrimaryClientSn] = useState('')

  const [secondaryDevice, setSecondaryDevice] =
    useState<IssuedItemDevice | null>(null)

  const [extras, setExtras] = useState<IssuedItemDevice[]>([])
  const [addExtras, setAddExtras] = useState(false)

  const [ds, setDs] = useState('')
  const [us, setUs] = useState('')
  const [speed, setSpeed] = useState('')

  /** Reset on open */
  useEffect(() => {
    if (!open) return
    setPrimarySource('WAREHOUSE')
    setPrimaryDevice(null)
    setClientCategory(null)
    setPrimaryClientName('')
    setPrimaryClientSn('')
    setSecondaryDevice(null)
    setExtras([])
    setAddExtras(false)
    setDs('')
    setUs('')
    setSpeed('')
  }, [open, type, devices])

  /**
   * Restore measurements and speedTest if editing an existing configuration.
   * (Triggered after selecting modem or reopening an already configured service)
   */
  useEffect(() => {
    if (!primaryDevice) return
    if (type !== 'NET') return

    // Type-safe check for custom property in case it's extended from backend
    if (
      'speedTest' in primaryDevice &&
      typeof primaryDevice.speedTest === 'string'
    ) {
      if (!speed) setSpeed(primaryDevice.speedTest)
    }
  }, [primaryDevice, type, speed])

  /** Operator detection */
  const isTMobile = useMemo(() => {
    const normalized = operator
      .trim()
      .toUpperCase()
      .replace(/[\s\-]+/g, '')
    return normalized.includes('TMOBILE') || normalized.includes('TMPL')
  }, [operator])

  /** Derived flags */
  const selectedCategory: DeviceCategory | undefined =
    primarySource === 'WAREHOUSE'
      ? primaryDevice?.category
      : clientCategory ?? undefined

  const isDecoder2Way = selectedCategory === DeviceCategory.DECODER_2_WAY
  const isModemGpon = selectedCategory === DeviceCategory.MODEM_GPON
  const needsRouter =
    type === 'NET' && isTMobile && selectedCategory === DeviceCategory.MODEM_HFC

  /** Filter main device list */
  const primaryOptions = useMemo(() => {
    const base = (() => {
      if (type === 'DTV') {
        return devices.filter(
          (d) =>
            d.category &&
            (
              [
                DeviceCategory.DECODER_1_WAY,
                DeviceCategory.DECODER_2_WAY,
              ] as DeviceCategory[]
            ).includes(d.category)
        )
      }
      if (type === 'NET') {
        return devices.filter(
          (d) =>
            d.category &&
            (
              [
                DeviceCategory.MODEM_HFC,
                DeviceCategory.MODEM_GPON,
              ] as DeviceCategory[]
            ).includes(d.category)
        )
      }

      return []
    })()

    return base.filter(
      (d) =>
        !usedDeviceIds.includes(d.id) &&
        !extras.some((ex) => ex.id === d.id) &&
        (!secondaryDevice || secondaryDevice.id !== d.id)
    )
  }, [type, devices, usedDeviceIds, extras, secondaryDevice])

  const secondaryOptions = useMemo(() => {
    return devices.filter(
      (d) =>
        d.category === DeviceCategory.NETWORK_DEVICE ||
        d.category === DeviceCategory.MODEM_HFC
    )
  }, [devices])

  /**
   * Validates DS/US signal ranges.
   * DS should be between -8 and 10 dBm.
   * US should be between 42 and 52 dBm.
   */
  const validateSignalRanges = (dsValue: string, usValue: string): boolean => {
    const dsNum = Number(dsValue)
    const usNum = Number(usValue)

    // Skip check if values are empty (they are validated elsewhere)
    if (!dsValue || !usValue) return true

    // DS validation
    if (isNaN(dsNum) || dsNum < -6 || dsNum > 10) {
      toast.error('Wartość DS musi być w zakresie od -6 do 10 dBm.')
      return false
    }

    // US validation
    if (isNaN(usNum) || usNum < 43 || usNum > 49) {
      toast.error('Wartość US musi być w zakresie od 43 do 49 dBm.')
      return false
    }

    return true
  }

  /** Switch between client and warehouse */
  const handleChangeSource = (src: DeviceSource) => {
    setPrimarySource(src)
    if (src === 'WAREHOUSE') {
      setClientCategory(null)
      setPrimaryClientName('')
      setPrimaryClientSn('')
    } else {
      setPrimaryDevice(null)
    }
  }

  const handleClientCategoryChange = (cat: DeviceCategory | null) => {
    setClientCategory(cat)
    if (type === 'NET' && cat === DeviceCategory.MODEM_GPON) {
      setDs('')
      setUs('')
    }
  }

  /** Add unique extra */
  const handleAddExtra = (device: IssuedItemDevice) => {
    const duplicate =
      extras.some((ex) => ex.id === device.id) ||
      primaryDevice?.id === device.id ||
      secondaryDevice?.id === device.id ||
      (primaryDevice?.serialNumber &&
        device.serialNumber &&
        primaryDevice.serialNumber.trim().toUpperCase() ===
          device.serialNumber.trim().toUpperCase())
    if (duplicate) {
      toast.warning('To urządzenie jest już przypisane do tej usługi.')
      return
    }
    if (device.status === 'ASSIGNED_TO_ORDER') {
      toast.error(
        `Urządzenie ${device.name} (${
          device.serialNumber ?? 'brak SN'
        }) jest już przypisane do innego zlecenia.`
      )
      return
    }
    setExtras((prev) => [...prev, device])
  }

  /** Validation logic */
  const isValid = useMemo(() => {
    if (!selectedCategory) return false
    if (primarySource === 'CLIENT') {
      if (!primaryClientName.trim() || !primaryClientSn.trim()) return false
    } else {
      if (!primaryDevice || usedDeviceIds.includes(primaryDevice.id))
        return false
    }

    // Prevent same serial between modem and router
    if (
      secondaryDevice &&
      primaryDevice?.serialNumber &&
      secondaryDevice.serialNumber &&
      primaryDevice.serialNumber.trim().toUpperCase() ===
        secondaryDevice.serialNumber.trim().toUpperCase()
    ) {
      return false
    }

    if (type === 'DTV' && isDecoder2Way && (!ds.trim() || !us.trim()))
      return false

    if (type === 'NET') {
      if (!speed.trim()) return false
      if (!isModemGpon && (!ds.trim() || !us.trim())) return false
      if (needsRouter && !secondaryDevice) return false
    }

    if (!isModemGpon && !validateSignalRanges(ds, us)) return false

    return true
  }, [
    primarySource,
    primaryDevice,
    secondaryDevice,
    primaryClientName,
    primaryClientSn,
    selectedCategory,
    type,
    isDecoder2Way,
    isModemGpon,
    needsRouter,
    ds,
    us,
    speed,
    usedDeviceIds,
  ])

  /** Confirm handler */
  const handleConfirm = () => {
    if (!isValid) {
      toast.error('Uzupełnij wymagane pola przed zatwierdzeniem.')
      return
    }

    if (
      secondaryDevice &&
      primaryDevice?.serialNumber &&
      secondaryDevice.serialNumber &&
      primaryDevice.serialNumber.trim().toUpperCase() ===
        secondaryDevice.serialNumber.trim().toUpperCase()
    ) {
      toast.error('Modem i router nie mogą mieć tego samego numeru seryjnego.')
      return
    }

    const payload: ActivatedService = {
      id: crypto.randomUUID(),
      type,
      deviceSource: primarySource,
      deviceId: primarySource === 'WAREHOUSE' ? primaryDevice?.id : undefined,
      deviceName:
        primarySource === 'CLIENT'
          ? primaryClientName.trim()
          : primaryDevice?.name,
      serialNumber:
        primarySource === 'CLIENT'
          ? primaryClientSn.trim().toUpperCase()
          : primaryDevice?.serialNumber,
      deviceType: selectedCategory,
      deviceId2: needsRouter ? secondaryDevice?.id : undefined,
      serialNumber2: needsRouter ? secondaryDevice?.serialNumber : undefined,
      deviceType2: needsRouter ? secondaryDevice?.category : undefined,
      deviceName2: needsRouter ? secondaryDevice?.name ?? '' : undefined,
      usDbmDown: ds ? Number(ds) : undefined,
      usDbmUp: us ? Number(us) : undefined,
      speedTest: type === 'NET' ? speed.trim() : undefined,
      extraDevices: extras.map((d) => ({
        id: crypto.randomUUID(),
        source: 'WAREHOUSE',
        category: d.category,
        serialNumber: d.serialNumber ?? '',
        name: d.name ?? '',
      })),
    }

    onConfirmAction(payload)
    onCloseAction()
  }

  const allowedCategoriesMap: Record<ServiceType, DeviceCategory[]> = {
    DTV: ['DECODER_1_WAY', 'DECODER_2_WAY'],
    NET: ['MODEM_HFC', 'MODEM_GPON', 'OTHER'],
    TEL: ['OTHER'],
    ATV: ['OTHER'],
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md w-[95vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {type === 'NET'
              ? 'Konfiguracja usługi NET'
              : 'Konfiguracja usługi DTV'}
          </DialogTitle>
        </DialogHeader>

        <ServiceDeviceSection
          type={type}
          primarySource={primarySource}
          onChangeSource={handleChangeSource}
          primaryDevice={primaryDevice}
          setPrimaryDevice={setPrimaryDevice}
          primaryOptions={primaryOptions}
          clientCategory={clientCategory}
          onChangeClientCategory={handleClientCategoryChange}
          primaryClientName={primaryClientName}
          setPrimaryClientName={setPrimaryClientName}
          primaryClientSn={primaryClientSn}
          setPrimaryClientSn={setPrimaryClientSn}
        />

        {primarySource === 'WAREHOUSE' && primaryDevice && (
          <DeviceCard
            label={type === 'DTV' ? 'DEKODER' : 'MODEM'}
            device={primaryDevice}
            onRemove={() => setPrimaryDevice(null)}
          />
        )}

        {needsRouter && (
          <div className="space-y-2 mb-6">
            <Label className="font-medium">Router</Label>
            <SerialScanInput
              devices={secondaryOptions}
              isDeviceUsed={(id) =>
                usedDeviceIds.includes(id) ||
                id === secondaryDevice?.id ||
                id === primaryDevice?.id
              }
              onAddDevice={(dev) => {
                if (
                  primaryDevice?.serialNumber &&
                  dev.serialNumber &&
                  primaryDevice.serialNumber.trim().toUpperCase() ===
                    dev.serialNumber.trim().toUpperCase()
                ) {
                  toast.warning(
                    'Router nie może mieć tego samego numeru seryjnego co modem.'
                  )
                  return
                }
                if (primaryDevice?.id === dev.id) {
                  toast.warning('Nie możesz dodać tego samego urządzenia.')
                  return
                }
                setSecondaryDevice(dev)
              }}
              allowedCategories={allowedCategoriesMap[type]}
              variant="block"
            />
            {secondaryDevice && (
              <DeviceCard
                label="ROUTER"
                device={secondaryDevice}
                onRemove={() => setSecondaryDevice(null)}
              />
            )}
          </div>
        )}

        {(type === 'NET' || isDecoder2Way) && (
          <>
            <Label className="font-semibold block">Pomiary</Label>
            <div className="w-full flex flex-col md:flex-row gap-4">
              {!isModemGpon && (
                <>
                  <Input
                    placeholder="DS [dBm]"
                    type="number"
                    step="0.1"
                    min={-6}
                    max={10}
                    value={ds}
                    onChange={(e) => setDs(e.target.value)}
                  />
                  <Input
                    placeholder="US [dBm]"
                    type="number"
                    step="0.1"
                    min={43}
                    max={49}
                    value={us}
                    onChange={(e) => setUs(e.target.value)}
                  />
                </>
              )}
              {type === 'NET' && (
                <Input
                  placeholder="Speedtest [Mb/s]"
                  type="text"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                />
              )}
            </div>
          </>
        )}

        {type === 'NET' && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Dodatkowe urządzenia</Label>
              <Switch checked={addExtras} onCheckedChange={setAddExtras} />
            </div>

            {addExtras && (
              <>
                <SerialScanInput
                  serviceType={type}
                  devices={devices.filter(
                    (d) =>
                      !extras.some((ex) => ex.id === d.id) &&
                      !usedDeviceIds.includes(d.id)
                  )}
                  isDeviceUsed={(id) =>
                    usedDeviceIds.includes(id) ||
                    extras.some((x) => x.id === id)
                  }
                  onAddDevice={handleAddExtra}
                  variant="block"
                  allowedCategories={allowedCategoriesMap[type]}
                />

                {extras.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {extras.map((d) => (
                      <DeviceCard
                        key={d.id}
                        label={d.name}
                        device={d}
                        onRemove={() =>
                          setExtras((prev) => prev.filter((x) => x.id !== d.id))
                        }
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCloseAction}>
            Anuluj
          </Button>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button onClick={handleConfirm} disabled={!isValid}>
                    Zatwierdź
                  </Button>
                </div>
              </TooltipTrigger>
              {!isValid && (
                <TooltipContent
                  side="top"
                  className="max-w-xs text-center overflow-hidden"
                >
                  {(() => {
                    if (!selectedCategory) return 'Wybierz urządzenie.'
                    if (
                      primarySource === 'CLIENT' &&
                      (!primaryClientName || !primaryClientSn)
                    )
                      return 'Uzupełnij nazwę i numer seryjny urządzenia klienta.'
                    if (primarySource === 'WAREHOUSE' && !primaryDevice)
                      return 'Wybierz urządzenie z magazynu.'
                    if (needsRouter && !secondaryDevice)
                      return 'Wybierz router.'
                    if (
                      secondaryDevice &&
                      primaryDevice?.serialNumber &&
                      secondaryDevice.serialNumber &&
                      primaryDevice.serialNumber.trim().toUpperCase() ===
                        secondaryDevice.serialNumber.trim().toUpperCase()
                    )
                      return 'Modem i router mają ten sam numer seryjny.'
                    if (type === 'NET' && !speed.trim())
                      return 'Podaj wynik Speedtest.'
                    if (
                      type === 'NET' &&
                      !isModemGpon &&
                      (!ds.trim() || !us.trim())
                    )
                      return 'Uzupełnij DS/US.'
                    return 'Uzupełnij wszystkie wymagane dane.'
                  })()}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ServiceConfigDialog
