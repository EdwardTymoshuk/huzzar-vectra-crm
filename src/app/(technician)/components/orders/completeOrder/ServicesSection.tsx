'use client'

import ConfirmResetDialog from '@/app/components/shared/ConfirmResetDialog'
import SerialScanInput from '@/app/components/shared/SerialScanInput'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { devicesTypeMap } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { DeviceCategory, ServiceType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import { GrPowerReset } from 'react-icons/gr'
import { MdDelete } from 'react-icons/md'
import { toast } from 'sonner'
import ServiceConfigDialog from './ServiceConfigDialog'

interface ServicesSectionProps {
  operator: string
  /** merged list from parent (backend + freed) */
  devices: IssuedItemDevice[]
  /** current activated services */
  value: ActivatedService[]
  /** setter from parent wizard */
  onChangeAction: (services: ActivatedService[]) => void
  /**
   * Called when user deletes a service that had devices.
   * Parent must store those devices so they can be reused.
   */
  onDevicesFreed?: (devices: IssuedItemDevice[]) => void
}

const ServicesSection = ({
  operator,
  devices,
  value,
  onChangeAction,
  onDevicesFreed,
}: ServicesSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<ServiceType>('DTV')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const openDialog = (type: ServiceType) => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const addTel = () => {
    const tel: ActivatedService = {
      id: crypto.randomUUID(),
      type: 'TEL',
      serialNumber: '',
      deviceType: DeviceCategory.OTHER,
      deviceName: 'KARTA SIM',
    }
    onChangeAction([...value, tel])
    toast.success('Dodano usługę TEL')
  }

  const addAtv = () => {
    if (value.some((v) => v.type === 'ATV')) return
    onChangeAction([
      ...value,
      { id: crypto.randomUUID(), type: 'ATV', notes: '' },
    ])
    toast.success('Dodano usługę ATV')
  }

  /**
   * Remove service AND report all devices that belonged to it
   * (primary, router, extras)
   */
  const removeService = (id: string) => {
    const removed = value.find((v) => v.id === id)
    const freed: IssuedItemDevice[] = []

    if (removed) {
      // primary
      if (removed.deviceId) {
        freed.push({
          id: removed.deviceId,
          name: removed.deviceName ?? '',
          serialNumber: removed.serialNumber ?? '',
          category: removed.deviceType ?? DeviceCategory.OTHER,
          type: 'DEVICE',
        })
      }

      // router / deviceId2
      if (removed.deviceId2) {
        freed.push({
          id: removed.deviceId2,
          name: removed.deviceName2 ?? '',
          serialNumber: removed.serialNumber2 ?? '',
          category: removed.deviceType2 ?? DeviceCategory.OTHER,
          type: 'DEVICE',
        })
      }

      // extras
      if (removed.extraDevices && removed.extraDevices.length > 0) {
        removed.extraDevices.forEach((ex) => {
          freed.push({
            id: ex.id,
            name: ex.name ?? '',
            serialNumber: ex.serialNumber ?? '',
            category: ex.category ?? DeviceCategory.OTHER,
            type: 'DEVICE',
          })
        })
      }
    }

    // update services list
    onChangeAction(value.filter((v) => v.id !== id))

    // tell parent which devices can be used again
    if (freed.length > 0) {
      onDevicesFreed?.(freed)
    }

    toast.info('Usunięto usługę')
  }

  const resetAll = () => {
    const freed: IssuedItemDevice[] = []
    value.forEach((svc) => {
      if (svc.deviceId)
        freed.push({
          id: svc.deviceId,
          name: svc.deviceName ?? '',
          serialNumber: svc.serialNumber ?? '',
          category: svc.deviceType ?? DeviceCategory.OTHER,
          type: 'DEVICE',
        })
      if (svc.deviceId2)
        freed.push({
          id: svc.deviceId2,
          name: svc.deviceName2 ?? '',
          serialNumber: svc.serialNumber2 ?? '',
          category: svc.deviceType2 ?? DeviceCategory.OTHER,
          type: 'DEVICE',
        })
      if (svc.extraDevices)
        svc.extraDevices.forEach((ex) =>
          freed.push({
            id: ex.id,
            name: ex.name ?? '',
            serialNumber: ex.serialNumber ?? '',
            category: ex.category ?? DeviceCategory.OTHER,
            type: 'DEVICE',
          })
        )
    })

    onChangeAction([])
    if (freed.length > 0) onDevicesFreed?.(freed)
    toast.info('Zresetowano wszystkie usługi')
  }

  const count = (t: ServiceType) => value.filter((v) => v.type === t).length

  /** ids already used in current config */
  const usedDeviceIds = useMemo(
    () =>
      value
        .flatMap((v) => [
          v.deviceId,
          v.deviceId2,
          ...(v.extraDevices?.map((ex) => ex.id) ?? []),
        ])
        .filter((id): id is string => !!id),
    [value]
  )

  return (
    <div>
      {/* buttons */}
      <div className="grid gap-2 mb-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Button
          variant={count('DTV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          onClick={() => openDialog('DTV')}
        >
          DTV{count('DTV') > 0 && <span className="ml-1">×{count('DTV')}</span>}
        </Button>

        <Button
          variant={count('NET') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          onClick={() => openDialog('NET')}
          disabled={count('NET') > 0}
        >
          NET{count('NET') > 0 && <span className="ml-1">×{count('NET')}</span>}
        </Button>

        <Button
          variant={count('TEL') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          onClick={addTel}
        >
          TEL{count('TEL') > 0 && <span className="ml-1">×{count('TEL')}</span>}
        </Button>

        <Button
          variant={count('ATV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          onClick={addAtv}
          disabled={count('ATV') > 0}
        >
          ATV{count('ATV') > 0 && <span className="ml-1">×{count('ATV')}</span>}
        </Button>

        {value.length > 0 && (
          <Button
            variant="ghost"
            className="w-full col-span-1 sm:col-span-2 md:col-span-4"
            onClick={() => setConfirmOpen(true)}
          >
            <GrPowerReset /> Resetuj
          </Button>
        )}
      </div>

      {/* service cards */}
      <div className="space-y-4">
        {value.map((svc) => {
          const device =
            svc.serialNumber || svc.deviceName
              ? {
                  name: svc.deviceName ?? '',
                  serial: svc.serialNumber ?? '',
                  category: svc.deviceType ?? DeviceCategory.OTHER,
                }
              : undefined

          return (
            <div
              key={svc.id}
              className="rounded-md border p-3 bg-muted/30 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{svc.type}</div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeService(svc.id)}
                >
                  <MdDelete /> Usuń
                </Button>
              </div>

              {/* TEL */}
              {svc.type === 'TEL' && (
                <TelRow
                  service={svc}
                  devices={devices}
                  allServices={value}
                  onChange={(updated) =>
                    onChangeAction(
                      value.map((v) => (v.id === svc.id ? updated : v))
                    )
                  }
                />
              )}

              {/* ATV */}
              {svc.type === 'ATV' && (
                <Textarea
                  placeholder="Uwagi (opcjonalnie)"
                  value={svc.notes ?? ''}
                  onChange={(e) =>
                    onChangeAction(
                      value.map((v) =>
                        v.id === svc.id ? { ...v, notes: e.target.value } : v
                      )
                    )
                  }
                />
              )}

              {/* DTV / NET – show devices + extras + measurements */}
              {(svc.type === 'DTV' || svc.type === 'NET') && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {/* main */}
                  {device && (
                    <div>
                      {svc.deviceSource === 'CLIENT'
                        ? `Urządzenie klienta: ${device.name} (SN: ${device.serial})`
                        : `${devicesTypeMap[device.category]} ${device.name} ${
                            device.serial ? ` (SN: ${device.serial})` : ''
                          }`}
                    </div>
                  )}

                  {/* router */}
                  {svc.deviceId2 && (
                    <div>
                      {`ROUTER: ${devicesTypeMap[svc.deviceType2 ?? '']} ${
                        svc.deviceName2 ?? ''
                      } (SN: ${svc.serialNumber2 ?? ''})`}
                    </div>
                  )}

                  {/* extras */}
                  {svc.extraDevices && svc.extraDevices.length > 0 && (
                    <div>
                      {svc.extraDevices.map((ex, idx) => {
                        const label =
                          ex.category === 'MODEM_HFC'
                            ? 'MODEM HFC'
                            : ex.category === 'MODEM_GPON'
                            ? 'MODEM GPON'
                            : ex.name || 'URZĄDZENIE'
                        return (
                          <span key={ex.id}>
                            {idx > 0 ? ' | ' : ''}
                            {label}
                            {ex.serialNumber ? ` (SN: ${ex.serialNumber})` : ''}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* measurements */}
                  {(svc.usDbmDown !== undefined ||
                    svc.usDbmUp !== undefined ||
                    (svc.speedTest && svc.speedTest.length > 0)) && (
                    <div>
                      {svc.usDbmDown !== undefined
                        ? `DS: ${svc.usDbmDown} dBm`
                        : ''}
                      {svc.usDbmDown !== undefined && svc.usDbmUp !== undefined
                        ? ' | '
                        : ''}
                      {svc.usDbmUp !== undefined
                        ? `US: ${svc.usDbmUp} dBm`
                        : ''}
                      {(svc.usDbmDown !== undefined ||
                        svc.usDbmUp !== undefined) &&
                      svc.speedTest
                        ? ' | '
                        : ''}
                      {svc.speedTest ? `Speedtest: ${svc.speedTest} Mb/s` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* dialog – dostaje już merged devices z góry */}
      <ServiceConfigDialog
        open={dialogOpen}
        type={dialogType}
        operator={operator}
        devices={devices}
        usedDeviceIds={usedDeviceIds}
        onConfirmAction={(svc) => {
          onChangeAction([...value, svc])
          toast.success(`Dodano usługę ${svc.type}`)
        }}
        onCloseAction={() => setDialogOpen(false)}
      />

      <ConfirmResetDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          resetAll()
          setConfirmOpen(false)
        }}
        title="Potwierdź reset usług"
        description="Ta operacja usunie wszystkie aktywne usługi i powiązane urządzenia. Czy na pewno chcesz kontynuować?"
      />
    </div>
  )
}

export default ServicesSection

/* ------------------- TEL Row ------------------- */

type TelRowProps = {
  service: ActivatedService
  devices: IssuedItemDevice[]
  onChange: (s: ActivatedService) => void
  /** Cała lista usług, by wykryć kolejność TEL */
  allServices?: ActivatedService[]
}

/**
 * TelRow – SIM card assignment for TEL.
 * -----------------------------------------------------
 * - For the first TEL: optional serial, switch toggleable.
 * - For the second and further TEL: switch forced ON + required serial.
 */
const TelRow = ({ service, devices, onChange, allServices }: TelRowProps) => {
  // Count how many TELs are in total and find index of this one
  const telServices = allServices?.filter((s) => s.type === 'TEL') ?? []
  const isAdditionalTel = telServices.findIndex((s) => s.id === service.id) > 0

  // If additional TEL → always ON and cannot be toggled
  const [addSerial, setAddSerial] = useState<boolean>(
    isAdditionalTel || Boolean(service.serialNumber)
  )

  // When this TEL becomes additional (after list updates)
  useEffect(() => {
    if (isAdditionalTel) setAddSerial(true)
  }, [isAdditionalTel])

  const handleSelectSim = (device: IssuedItemDevice) => {
    onChange({
      ...service,
      deviceId: device.id,
      serialNumber: device.serialNumber,
      deviceName: 'KARTA SIM',
      deviceType: DeviceCategory.OTHER,
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label
          className={addSerial ? 'text-sm' : 'text-sm text-muted-foreground'}
        >
          Numer seryjny
        </Label>
        <Switch
          checked={addSerial}
          onCheckedChange={(v) => !isAdditionalTel && setAddSerial(v)}
          disabled={isAdditionalTel} // 🔒 Cannot disable for 2nd+ TEL
        />
      </div>

      {/* Serial input required for 2nd+ TEL */}
      {addSerial && !service.serialNumber && (
        <SerialScanInput
          serviceType="TEL"
          devices={devices.filter((d) => d.category === DeviceCategory.OTHER)}
          onAddDevice={handleSelectSim}
          variant="block"
        />
      )}

      {service.serialNumber && (
        <div className="text-sm text-muted-foreground">
          KARTA SIM (SN:{' '}
          <span className="font-medium">{service.serialNumber}</span>)
        </div>
      )}

      {/* 🔹 Validation note for second and further TELs */}
      {isAdditionalTel && !service.serialNumber && (
        <p className="text-xs text-danger mt-1">Numer seryjny jest wymagany.</p>
      )}
    </div>
  )
}
