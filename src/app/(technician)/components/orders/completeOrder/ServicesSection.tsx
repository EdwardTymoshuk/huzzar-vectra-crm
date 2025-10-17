'use client'

import { Button } from '@/app/components/ui/button'
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
  mode?: 'complete' | 'amend'
}

/**
 * ServicesSection
 * - DTV/NET → open modal for configuration
 * - TEL/ATV → added instantly (ATV adds notes)
 * - DTV supports multiple entries with live count
 */
const ServicesSection: React.FC<Props> = ({
  operator,
  devices,
  value,
  onChangeAction,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<ServiceType>('DTV')

  /** opens dialog for DTV/NET */
  const openDialog = (type: ServiceType) => {
    setDialogType(type)
    setDialogOpen(true)
  }

  /** adds TEL instantly */
  const addTel = () => {
    if (value.some((v) => v.type === 'TEL')) return
    onChangeAction([...value, { id: crypto.randomUUID(), type: 'TEL' }])
    toast.success('Dodano usługę TEL')
  }

  /** adds ATV instantly (with notes) */
  const addAtv = () => {
    if (value.some((v) => v.type === 'ATV')) return
    onChangeAction([
      ...value,
      { id: crypto.randomUUID(), type: 'ATV', notes: '' },
    ])
    toast.success('Dodano usługę ATV')
  }

  /** removes service by id */
  const removeService = (id: string) => {
    onChangeAction(value.filter((v) => v.id !== id))
    toast.info('Usunięto usługę')
  }

  /** resets all */
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
          disabled={count('NET') > 0}
          onClick={() => openDialog('NET')}
        >
          NET
        </Button>
        <Button
          variant={count('TEL') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('TEL') > 0}
          onClick={addTel}
        >
          TEL
        </Button>
        <Button
          variant={count('ATV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('ATV') > 0}
          onClick={addAtv}
        >
          ATV
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

      {/* Services list */}
      <div className="space-y-4">
        {value.map((svc) => {
          const device = svc.serialNumber
            ? {
                name: devices.find((d) => d.id === svc.deviceId)?.name ?? '',
                serial: svc.serialNumber,
                category:
                  devices.find((d) => d.id === svc.deviceId)?.category ??
                  svc.deviceType ??
                  DeviceCategory.OTHER,
              }
            : undefined

          return (
            <RowCard
              key={svc.id}
              label={svc.type}
              onRemove={() => removeService(svc.id)}
              device={device}
              extra={
                <>
                  {/* --- Router info --- */}
                  {svc.deviceId2 && svc.serialNumber2 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ROUTER{' '}
                      {devices.find((d) => d.id === svc.deviceId2)?.name ?? ''}{' '}
                      (SN: {svc.serialNumber2})
                    </div>
                  )}

                  {/* --- DS/US/speedtest --- */}
                  {(svc.type === 'NET' || svc.type === 'DTV') && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {svc.usDbmDown !== undefined &&
                        `DS: ${svc.usDbmDown} dBm | `}
                      {svc.usDbmUp !== undefined && `US: ${svc.usDbmUp} dBm`}
                      {svc.speedTest && ` | Speedtest: ${svc.speedTest} Mb/s`}
                    </div>
                  )}
                </>
              }
            >
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
            </RowCard>
          )
        })}
      </div>

      {/* Dialog for DTV / NET */}
      <ServiceConfigDialog
        open={dialogOpen}
        type={dialogType}
        operator={operator}
        devices={devices}
        usedDeviceIds={
          value
            .map((v) => [v.deviceId, v.deviceId2])
            .flat()
            .filter(Boolean) as string[]
        }
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

/* ------------------- RowCard ------------------- */

type RowCardProps = {
  label: string
  onRemove: () => void
  children?: React.ReactNode
  device?: { name: string; serial: string; category: DeviceCategory }
  extra?: React.ReactNode
}

const RowCard: React.FC<RowCardProps> = ({
  label,
  onRemove,
  children,
  device,
  extra,
}) => (
  <div className="rounded-md border p-3 bg-muted/30 space-y-3">
    <div className="flex items-center justify-between">
      <div className="font-semibold">{label}</div>
      <Button size="sm" variant="destructive" onClick={onRemove}>
        <MdDelete /> Usuń
      </Button>
    </div>

    {device && (
      <div className="text-sm">
        {devicesTypeMap[device.category]} {device.name}
        {device.serial ? ` (SN: ${device.serial})` : ''}
      </div>
    )}

    {children}
    {extra}
  </div>
)
