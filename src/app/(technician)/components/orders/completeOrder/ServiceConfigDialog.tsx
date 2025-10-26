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
 * - Displays measurements and prevents duplicates.
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
  }, [open, type])

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
        return devices.filter((d) =>
          (
            [
              DeviceCategory.DECODER_1_WAY,
              DeviceCategory.DECODER_2_WAY,
            ] as DeviceCategory[]
          ).includes(d.category)
        )
      }
      if (type === 'NET') {
        return devices.filter((d) =>
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
    const alreadyExists = extras.some((ex) => ex.id === device.id)
    if (alreadyExists) {
      toast.warning('To urządzenie zostało już dodane.')
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
    if (type === 'DTV' && isDecoder2Way && (!ds.trim() || !us.trim()))
      return false
    if (type === 'NET') {
      if (!speed.trim()) return false
      if (!isModemGpon && (!ds.trim() || !us.trim())) return false
      if (needsRouter && !secondaryDevice) return false
    }
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

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md w-[95vw]">
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
              onAddDevice={(dev) => setSecondaryDevice(dev)}
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
                    value={ds}
                    onChange={(e) => setDs(e.target.value)}
                  />
                  <Input
                    placeholder="US [dBm]"
                    type="number"
                    step="0.1"
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
                  devices={devices.filter(
                    (d) =>
                      !extras.some((ex) => ex.id === d.id) &&
                      !usedDeviceIds.includes(d.id) &&
                      !(
                        [
                          DeviceCategory.DECODER_1_WAY,
                          DeviceCategory.DECODER_2_WAY,
                          DeviceCategory.NETWORK_DEVICE,
                        ] as DeviceCategory[]
                      ).includes(d.category)
                  )}
                  onAddDevice={handleAddExtra}
                  variant="block"
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
          <Button onClick={handleConfirm} disabled={!isValid}>
            Zatwierdź
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ServiceConfigDialog
