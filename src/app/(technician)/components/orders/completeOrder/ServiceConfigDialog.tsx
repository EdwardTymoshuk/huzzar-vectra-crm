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
import { ActivatedService, IssuedItemDevice } from '@/types'
import { DeviceCategory, ServiceType } from '@prisma/client'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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
 * -------------------
 * Dialog used for configuring DTV and NET services before adding them to the list.
 * - Shows selected devices clearly in small cards.
 * - For T-Mobile + MODEM_HFC → router required.
 * - For T-Mobile + MODEM_GPON → router not required.
 * - Prevents duplicate or reused devices.
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
  const [primary, setPrimary] = useState<IssuedItemDevice | null>(null)
  const [secondary, setSecondary] = useState<IssuedItemDevice | null>(null)
  const [ds, setDs] = useState<number | undefined>()
  const [us, setUs] = useState<number | undefined>()
  const [speed, setSpeed] = useState('')

  /** Detect if operator is T-Mobile (covers all variations) */
  const isTMobile = useMemo(() => {
    const normalized = operator
      .trim()
      .toUpperCase()
      .replace(/[\s\-]+/g, '')
    return (
      normalized.includes('TMOBILE') ||
      normalized.includes('T-MOBILE') ||
      normalized.includes('TMPL') ||
      normalized.includes('TMB')
    )
  }, [operator])

  /** Derived flags */
  const isDecoder2Way =
    type === 'DTV' && primary?.category === DeviceCategory.DECODER_2_WAY

  /** Router required only if T-Mobile + NET + modem is HFC */
  const needsRouter =
    type === 'NET' &&
    isTMobile &&
    primary?.category === DeviceCategory.MODEM_HFC

  /** Filter available devices */
  const primaryOptions = useMemo(() => {
    if (type === 'DTV') {
      return devices.filter(
        (d) =>
          d.category === DeviceCategory.DECODER_1_WAY ||
          d.category === DeviceCategory.DECODER_2_WAY
      )
    }
    if (type === 'NET') {
      return devices.filter(
        (d) =>
          d.category === DeviceCategory.MODEM_HFC ||
          d.category === DeviceCategory.MODEM_GPON
      )
    }
    return devices
  }, [type, devices])

  /** Secondary devices for router */
  const secondaryOptions = useMemo(() => {
    return devices.filter(
      (d) =>
        d.category === DeviceCategory.MODEM_HFC ||
        d.category === DeviceCategory.MODEM_GPON
    )
  }, [devices])

  /** Validation logic */
  const isValid = useMemo(() => {
    if (!primary) return false
    if (type === 'DTV' && isDecoder2Way) {
      if (ds === undefined || us === undefined) return false
    }
    if (type === 'NET') {
      if (ds === undefined || us === undefined || !speed.trim()) return false
      if (needsRouter && !secondary) return false
    }
    return true
  }, [type, primary, secondary, ds, us, speed, needsRouter, isDecoder2Way])

  /** Confirm handler */
  const handleConfirm = () => {
    if (!isValid) return

    if (
      (primary && usedDeviceIds.includes(primary.id)) ||
      (secondary && usedDeviceIds.includes(secondary.id)) ||
      (primary && secondary && primary.id === secondary.id)
    ) {
      toast.error('To urządzenie jest już przypisane lub użyte jako router.')
      return
    }

    const newService: ActivatedService = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      type,
      deviceId: primary?.id,
      serialNumber: primary?.serialNumber,
      deviceId2: secondary?.id,
      serialNumber2: secondary?.serialNumber,
      usDbmDown: ds,
      usDbmUp: us,
      speedTest: type === 'NET' ? speed.trim() || undefined : undefined,
      deviceType:
        type === 'DTV'
          ? primary?.category === DeviceCategory.DECODER_2_WAY
            ? DeviceCategory.DECODER_2_WAY
            : DeviceCategory.DECODER_1_WAY
          : type === 'NET'
          ? primary?.category === DeviceCategory.MODEM_GPON
            ? DeviceCategory.MODEM_GPON
            : DeviceCategory.MODEM_HFC
          : undefined,
      deviceType2: type === 'NET' && secondary ? secondary.category : undefined,
    }

    onConfirmAction(newService)
    setPrimary(null)
    setSecondary(null)
    setDs(undefined)
    setUs(undefined)
    setSpeed('')
    onCloseAction()
  }

  /** Small card component for displaying selected devices */
  const DeviceCard = ({
    label,
    device,
  }: {
    label: string
    device: IssuedItemDevice
  }) => (
    <div className="flex items-center justify-between border rounded-md bg-muted/40 px-3 py-2 mt-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">
            {device.name} (SN: {device.serialNumber})
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-md w-[95vw] flex flex-col gap-4 space-y-4">
        <DialogHeader>
          <DialogTitle>
            {type === 'NET'
              ? 'Konfiguracja usługi NET'
              : 'Konfiguracja usługi DTV'}
          </DialogTitle>
        </DialogHeader>

        {/* --- Primary device selection --- */}
        <div className="space-y-2">
          <div className="text-sm font-medium">
            {type === 'DTV' ? 'Dekoder' : 'Modem'}
          </div>
          <SerialScanInput
            devices={primaryOptions}
            onAddDevice={(dev) => setPrimary(dev)}
            variant="block"
          />
          {primary && (
            <DeviceCard
              label={`${type === 'DTV' ? 'DEKODER' : 'MODEM'}`}
              device={primary}
            />
          )}
        </div>

        {/* --- Secondary device selection (router for T-Mobile HFC) --- */}
        {needsRouter && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Router</div>
            <SerialScanInput
              devices={secondaryOptions}
              onAddDevice={(dev) => setSecondary(dev)}
              variant="block"
            />
            {secondary && <DeviceCard label="ROUTER" device={secondary} />}
          </div>
        )}

        {/* --- Measurements (DS/US/Speedtest) --- */}
        {(type === 'NET' || isDecoder2Way) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              placeholder="DS [dBm]"
              type="number"
              step="0.1"
              value={ds ?? ''}
              onChange={(e) =>
                setDs(
                  e.target.value === '' ? undefined : Number(e.target.value)
                )
              }
            />
            <Input
              placeholder="US [dBm]"
              type="number"
              step="0.1"
              value={us ?? ''}
              onChange={(e) =>
                setUs(
                  e.target.value === '' ? undefined : Number(e.target.value)
                )
              }
            />
            {type === 'NET' && (
              <Input
                placeholder="Speedtest [Mb/s]"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
              />
            )}
          </div>
        )}

        {/* --- Dialog actions --- */}
        <DialogFooter className="gap-2">
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
