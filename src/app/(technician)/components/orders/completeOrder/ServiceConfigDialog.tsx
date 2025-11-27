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

interface Props {
  open: boolean
  type: ServiceType
  operator: string
  devices: IssuedItemDevice[]
  usedDeviceIds: string[]
  onConfirmAction: (service: ActivatedService) => void
  onCloseAction: () => void
}

/**
 * ServiceConfigDialog
 * ------------------------------------------------------
 * Configures DTV or NET service before saving into ActivatedService.
 * - Supports both warehouse and client devices.
 * - NET (T-Mobile) has special rules for HFC/GPON + router.
 * - Displays measurements and prevents duplicates or identical serials.
 */
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
   */
  useEffect(() => {
    if (!primaryDevice) return
    if (type !== 'NET') return

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

  /** Selected category from either warehouse or client input */
  const selectedCategory: DeviceCategory | undefined =
    primarySource === 'WAREHOUSE'
      ? primaryDevice?.category
      : clientCategory ?? undefined

  /** T-Mobile specific flags */
  const isPrimaryHfc = selectedCategory === DeviceCategory.MODEM_HFC
  const isPrimaryGpon = selectedCategory === DeviceCategory.MODEM_GPON

  /**
   * For T-Mobile NET:
   * - if primary is HFC → router is REQUIRED
   * - if primary is GPON → router is OPTIONAL
   * For other operators → keep old behavior (only HFC T-Mobile case)
   */
  const requiresRouter = type === 'NET' && isTMobile && Boolean(isPrimaryHfc)

  /**
   * Router section should be visible when:
   * - NET
   * - T-Mobile
   * - and primary is HFC or GPON (HFC → required, GPON → optional)
   */
  const canHaveRouter =
    type === 'NET' && isTMobile && (isPrimaryHfc || isPrimaryGpon)

  /**
   * Router can be ONLY GPON for T-Mobile cases (your requirement).
   * We exclude everything else.
   */
  const secondaryOptions = useMemo(() => {
    return devices.filter(
      (d) =>
        d.category === DeviceCategory.MODEM_GPON &&
        !usedDeviceIds.includes(d.id) &&
        d.id !== primaryDevice?.id
    )
  }, [devices, usedDeviceIds, primaryDevice])

  /** Derived flags */
  const isDecoder2Way = selectedCategory === DeviceCategory.DECODER_2_WAY
  const isModemGpon = selectedCategory === DeviceCategory.MODEM_GPON

  /** Filter main device list */
  const primaryOptions = useMemo(() => {
    const base = (() => {
      if (type === 'DTV') {
        // filter only 1-way and 2-way decoders
        return devices.filter(
          (d) =>
            d.category === DeviceCategory.DECODER_1_WAY ||
            d.category === DeviceCategory.DECODER_2_WAY
        )
      }

      if (type === 'NET') {
        // filter only HFC and GPON modems
        return devices.filter(
          (d) =>
            d.category === DeviceCategory.MODEM_HFC ||
            d.category === DeviceCategory.MODEM_GPON
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

  /**
   * Validates DS/US signal ranges.
   */
  const validateSignalRanges = (dsValue: string, usValue: string): boolean => {
    const dsNum = Number(dsValue)
    const usNum = Number(usValue)

    if (!dsValue || !usValue) return true

    if (isNaN(dsNum) || dsNum < -6 || dsNum > 10) {
      toast.error('Wartość DS musi być w zakresie od -6 do 10 dBm.')
      return false
    }

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

    // client device validation
    if (primarySource === 'CLIENT') {
      if (!primaryClientName.trim() || !primaryClientSn.trim()) return false
    } else {
      if (!primaryDevice || usedDeviceIds.includes(primaryDevice.id))
        return false
    }

    // T-Mobile router rules
    if (requiresRouter && !secondaryDevice) return false
    if (
      canHaveRouter &&
      secondaryDevice &&
      secondaryDevice.category !== DeviceCategory.MODEM_GPON
    ) {
      return false
    }

    // NET rules
    if (type === 'NET') {
      if (!speed.trim()) return false
      if (!isModemGpon && (!ds.trim() || !us.trim())) return false
    }

    // DTV decoder 2-way requires DS/US
    if (type === 'DTV' && isDecoder2Way && (!ds.trim() || !us.trim()))
      return false

    // signal range (only for non-GPON)
    if (!isModemGpon && !validateSignalRanges(ds, us)) return false

    return true
  }, [
    primarySource,
    primaryDevice,
    primaryClientName,
    primaryClientSn,
    selectedCategory,
    type,
    isDecoder2Way,
    isModemGpon,
    requiresRouter,
    canHaveRouter,
    secondaryDevice,
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

    // extra safety for router type
    if (
      canHaveRouter &&
      secondaryDevice &&
      secondaryDevice.category !== DeviceCategory.MODEM_GPON
    ) {
      toast.error('Router dla T-Mobile musi być urządzeniem typu MODEM GPON.')
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
      // router / second device
      deviceId2:
        canHaveRouter && secondaryDevice ? secondaryDevice.id : undefined,
      serialNumber2:
        canHaveRouter && secondaryDevice
          ? secondaryDevice.serialNumber
          : undefined,
      deviceType2:
        canHaveRouter && secondaryDevice ? secondaryDevice.category : undefined,
      deviceName2:
        canHaveRouter && secondaryDevice
          ? secondaryDevice.name ?? ''
          : undefined,
      usDbmDown: ds ? Number(ds) : undefined,
      usDbmUp: us ? Number(us) : undefined,
      speedTest: type === 'NET' ? speed.trim() : undefined,
      extraDevices: extras.map((d) => ({
        id: d.id,
        source: 'WAREHOUSE',
        category: d.category,
        serialNumber: d.serialNumber ?? '',
        name: d.name ?? '',
      })),
    }

    onConfirmAction(payload)
    onCloseAction()
  }

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md w-[95vw] overflow-x-hidden">
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

        {/* T-Mobile router section (HFC → required, GPON → optional) */}
        {canHaveRouter && (
          <div className="space-y-2 mb-6">
            <Label className="font-medium">
              {requiresRouter ? 'Router (wymagany)' : 'Router (opcjonalny)'}
            </Label>
            <SerialScanInput
              serviceType="NET"
              devices={secondaryOptions}
              isDeviceUsed={(id) =>
                usedDeviceIds.includes(id) ||
                id === secondaryDevice?.id ||
                id === primaryDevice?.id
              }
              onAddDevice={(dev) => {
                // safety: only GPON is allowed here
                if (dev.category !== DeviceCategory.MODEM_GPON) {
                  toast.warning(
                    'Dla T-Mobile jako router możesz dodać tylko MODEM GPON.'
                  )
                  return
                }
                setSecondaryDevice(dev)
              }}
              // here we limit selection explicitly to GPON
              allowedCategories={[DeviceCategory.MODEM_GPON]}
              variant="block"
            />
            {secondaryDevice && (
              <DeviceCard
                label="ROUTER (GPON)"
                device={secondaryDevice}
                onRemove={() => setSecondaryDevice(null)}
              />
            )}
          </div>
        )}

        {(type === 'NET' || isDecoder2Way) && (
          <>
            <Label className="font-semibold block mb-1">Pomiary</Label>

            <div className="w-full flex flex-col md:flex-row gap-4">
              {!isModemGpon && (
                <>
                  <div className="flex flex-col w-full">
                    <Input
                      placeholder="DS [dBm]"
                      type="number"
                      step="0.1"
                      min={-6}
                      max={10}
                      value={ds}
                      onChange={(e) => setDs(e.target.value)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value)
                        if (isNaN(v)) return setDs('')
                        if (v < -6 || v > 10) setDs('')
                      }}
                      className={`
                ${
                  ds !== '' && (Number(ds) < -6 || Number(ds) > 10)
                    ? 'border-danger focus-visible:ring-danger'
                    : ''
                }
              `}
                    />
                    {ds !== '' && (Number(ds) < -6 || Number(ds) > 10) && (
                      <span className="text-xs text-danger mt-1">
                        Zakres DS: -6 do 10 dBm
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col w-full">
                    <Input
                      placeholder="US [dBm]"
                      type="number"
                      step="0.1"
                      min={43}
                      max={49}
                      value={us}
                      onChange={(e) => setUs(e.target.value)}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value)
                        if (isNaN(v)) return setUs('')
                        if (v < 43 || v > 49) setUs('')
                      }}
                      className={`
                ${
                  us !== '' && (Number(us) < 43 || Number(us) > 49)
                    ? 'border-danger focus-visible:ring-danger'
                    : ''
                }
              `}
                    />
                    {us !== '' && (Number(us) < 43 || Number(us) > 49) && (
                      <span className="text-xs text-danger mt-1">
                        Zakres US: 43 – 49 dBm
                      </span>
                    )}
                  </div>
                </>
              )}

              {type === 'NET' && (
                <div className="flex flex-col w-full">
                  <Input
                    placeholder="Speedtest [Mb/s]"
                    type="number"
                    step="0.1"
                    min={1}
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    className={`
              ${
                speed !== '' && Number(speed) <= 0
                  ? 'border-danger focus-visible:ring-danger'
                  : ''
              }
            `}
                  />
                  {speed !== '' && Number(speed) <= 0 && (
                    <span className="text-xs text-danger mt-1">
                      Wartość Speedtest musi być dodatnia.
                    </span>
                  )}
                </div>
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
                  allowedCategories={[
                    DeviceCategory.MODEM_HFC,
                    DeviceCategory.MODEM_GPON,
                    DeviceCategory.OTHER,
                    DeviceCategory.NETWORK_DEVICE,
                  ]}
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
                <Button onClick={handleConfirm} disabled={!isValid}>
                  Zatwierdź
                </Button>
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
                    if (requiresRouter && !secondaryDevice)
                      return 'Dla T-Mobile z modemem HFC wymagany jest router GPON.'
                    if (
                      secondaryDevice &&
                      secondaryDevice.category !== DeviceCategory.MODEM_GPON
                    )
                      return 'Router dla T-Mobile musi być urządzeniem typu MODEM GPON.'
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
