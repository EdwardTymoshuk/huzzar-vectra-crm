'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { devicesTypeMap } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { DeviceCategory, ServiceType } from '@prisma/client'
import { useState } from 'react'
import { GrPowerReset } from 'react-icons/gr'
import { MdDelete } from 'react-icons/md'
import { toast } from 'sonner'
import ServiceConfigDialog from './ServiceConfigDialog'

interface Props {
  operator: string
  devices: IssuedItemDevice[]
  value: ActivatedService[]
  onChangeAction: (services: ActivatedService[]) => void
}

/**
 * ServicesSection
 * ------------------------------------------------------
 * - Buttons with 'secondary' bg + counts.
 * - TEL via SerialScanInput (KARTA SIM). Multiple TEL allowed.
 * - DTV/NET open modal; cards show router, extras, and measurements.
 */
const ServicesSection = ({
  operator,
  devices,
  value,
  onChangeAction,
}: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<ServiceType>('DTV')

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

  const removeService = (id: string) => {
    onChangeAction(value.filter((v) => v.id !== id))
    toast.info('Usunięto usługę')
  }

  const resetAll = () => {
    onChangeAction([])
    toast.info('Zresetowano wszystkie usługi')
  }

  const count = (t: ServiceType) => value.filter((v) => v.type === t).length

  return (
    <div>
      {/* Selection buttons */}
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
            onClick={resetAll}
          >
            <GrPowerReset /> Resetuj
          </Button>
        )}
      </div>

      {/* Cards */}
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

              {/* TEL: pick SIM via SerialScanInput; after pick show SN */}
              {svc.type === 'TEL' && (
                <TelRow
                  service={svc}
                  devices={devices}
                  onChange={(updated) =>
                    onChangeAction(
                      value.map((v) => (v.id === svc.id ? updated : v))
                    )
                  }
                />
              )}

              {/* ATV: notes */}
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

              {/* DTV / NET: main, router, extras, measurements */}
              {(svc.type === 'DTV' || svc.type === 'NET') && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {/* Main */}
                  {device && (
                    <div>
                      {svc.deviceSource === 'CLIENT'
                        ? `Urządzenie klienta: ${device.name} (SN: ${device.serial})`
                        : `${devicesTypeMap[device.category]} ${device.name}${
                            device.serial ? ` (SN: ${device.serial})` : ''
                          }`}
                    </div>
                  )}

                  {/* Router (deviceId2) */}
                  {svc.deviceId2 && (
                    <div>
                      {(() => {
                        if (svc.deviceType2 === 'MODEM_HFC') {
                          return `ROUTER: MODEM HFC (SN: ${
                            svc.serialNumber2 ?? ''
                          })`
                        }
                        if (svc.deviceType2 === 'MODEM_GPON') {
                          return `ROUTER: MODEM GPON (SN: ${
                            svc.serialNumber2 ?? ''
                          })`
                        }
                        // other categories → just name
                        return `ROUTER: ${svc.deviceName2 ?? ''}${
                          svc.serialNumber2 ? ` (SN: ${svc.serialNumber2})` : ''
                        }`
                      })()}
                    </div>
                  )}

                  {/* Extras list */}
                  {svc.extraDevices && svc.extraDevices.length > 0 && (
                    <div>
                      {svc.extraDevices.map((ex, idx) => {
                        const label =
                          ex.category === 'MODEM_HFC'
                            ? 'MODEM HFC'
                            : ex.category === 'MODEM_GPON'
                            ? 'MODEM GPON'
                            : ex.name || 'URZĄDZENIE'
                        const sn = ex.serialNumber
                          ? ` (SN: ${ex.serialNumber})`
                          : ''
                        return (
                          <span key={ex.id}>
                            {idx > 0 ? ' | ' : ''}
                            {label}
                            {sn}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Measurements */}
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

      {/* Dialog */}
      <ServiceConfigDialog
        open={dialogOpen}
        type={dialogType}
        operator={operator}
        devices={devices}
        usedDeviceIds={value
          .flatMap((v) => [v.deviceId, v.deviceId2])
          .filter((id): id is string => !!id)}
        onConfirmAction={(svc) => {
          onChangeAction([...value, svc])
          toast.success(`Dodano usługę ${svc.type}`)
        }}
        onCloseAction={() => setDialogOpen(false)}
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
}

/**
 * TelRow
 * ------------------------------------------------------
 * Handles TEL service SIM card serial number assignment.
 * - Toggle (Switch) controls showing SerialScanInput.
 * - Once SIM selected, displays SN and locks input.
 */
const TelRow = ({ service, devices, onChange }: TelRowProps) => {
  const [addSerial, setAddSerial] = useState(!!service.serialNumber)

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
          className={`text-sm ${
            addSerial ? 'text-normal' : 'text-muted-foreground'
          }`}
        >
          Numer seryjny
        </Label>
        <Switch checked={addSerial} onCheckedChange={setAddSerial} />
      </div>

      {addSerial && !service.serialNumber && (
        <SerialScanInput
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
    </div>
  )
}
