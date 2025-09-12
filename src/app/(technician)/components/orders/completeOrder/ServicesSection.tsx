'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { devicesTypeMap } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice, ServiceType } from '@/types'
import { DeviceCategory } from '@prisma/client'
import { useState } from 'react'
import { GrPowerReset } from 'react-icons/gr'
import { MdDelete, MdEdit } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  operator: string
  devices: IssuedItemDevice[]
  value: ActivatedService[]
  onChangeAction: (services: ActivatedService[]) => void
  /** 'amend' => show "Zainstalowany ..." lines in summaries */
  mode?: 'complete' | 'amend'
}

/* ---------------- helpers ---------------- */

const isTMobile = (op: string) => {
  const s = op.trim().toUpperCase().replace(/\s+/g, '')
  return s.includes('TMOBILE') || s === 'TMPL'
}

const asDeviceCategory = (cat?: string | null): DeviceCategory => {
  if (!cat || !(cat in DeviceCategory)) return DeviceCategory.OTHER
  return cat as DeviceCategory
}

const deviceBy = (pool: IssuedItemDevice[], id?: string, sn?: string) =>
  (id && pool.find((d) => d.id === id)) ||
  (sn && pool.find((d) => d.serialNumber === sn)) ||
  undefined

/** true => some other service already uses that device (deviceId or deviceId2) */
const isUsedElsewhere = (
  services: ActivatedService[],
  currentServiceId: string,
  candidateDeviceId: string
) =>
  services.some(
    (s) =>
      s.id !== currentServiceId &&
      (s.deviceId === candidateDeviceId || s.deviceId2 === candidateDeviceId)
  )

/* ---------------- component ---------------- */

const ServicesSection: React.FC<Props> = ({
  operator,
  devices,
  value,
  onChangeAction,
  mode = 'complete',
}) => {
  // Local edit flags per service id (do NOT touch data model)
  const [editDtv, setEditDtv] = useState<Record<string, boolean>>({})
  const [editNet, setEditNet] = useState<Record<string, boolean>>({})

  const addService = (type: ServiceType) => {
    if (type === 'DTV' || !value.some((v) => v.type === type)) {
      onChangeAction([
        ...value,
        {
          id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
          type,
        },
      ])
    }
  }

  const removeService = (id: string) =>
    onChangeAction(value.filter((v) => v.id !== id))

  const patch = (id: string, partial: Partial<ActivatedService>) =>
    onChangeAction(value.map((v) => (v.id === id ? { ...v, ...partial } : v)))

  const resetAll = () => onChangeAction([])

  const count = (t: ServiceType) => value.filter((v) => v.type === t).length

  const needsRouter = isTMobile(operator)

  /** prevent duplicates via `isUsedElsewhere` */
  const onPickDevice = (
    svcId: string,
    candidate: IssuedItemDevice,
    pos: 1 | 2
  ) => {
    if (isUsedElsewhere(value, svcId, candidate.id)) {
      toast.error(
        'To urządzenie jest już użyte w innej usłudze w tym zleceniu.'
      )
      return
    }
    if (pos === 1) {
      patch(svcId, {
        deviceId: candidate.id,
        serialNumber: candidate.serialNumber,
        deviceType:
          candidate.category === DeviceCategory.DECODER_2_WAY
            ? 'DECODER_2_WAY'
            : candidate.category === DeviceCategory.DECODER_1_WAY
            ? 'DECODER_1_WAY'
            : undefined,
      })
    } else {
      patch(svcId, {
        deviceId2: candidate.id,
        serialNumber2: candidate.serialNumber,
      })
    }
  }

  return (
    <div>
      {/* selection buttons */}
      <div className="grid gap-2 mb-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Button
          variant={count('DTV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          onClick={() => addService('DTV')}
        >
          DTV{count('DTV') > 0 && <span className="ml-1">×{count('DTV')}</span>}
        </Button>
        <Button
          variant={count('NET') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('NET') > 0}
          onClick={() => addService('NET')}
        >
          NET
        </Button>
        <Button
          variant={count('TEL') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('TEL') > 0}
          onClick={() => addService('TEL')}
        >
          TEL
        </Button>
        <Button
          variant={count('ATV') > 0 ? 'secondary' : 'outline'}
          className="w-full"
          disabled={count('ATV') > 0}
          onClick={() => addService('ATV')}
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

      {/* rows */}
      <div className="space-y-4">
        {value.map((svc) => {
          if (svc.type === 'DTV') {
            const decoderOptions = devices.filter(
              (d) =>
                d.category === DeviceCategory.DECODER_1_WAY ||
                d.category === DeviceCategory.DECODER_2_WAY
            )
            const attached = deviceBy(devices, svc.deviceId, svc.serialNumber)
            const is2way =
              svc.deviceType === 'DECODER_2_WAY' ||
              attached?.category === DeviceCategory.DECODER_2_WAY

            // STEP 1: pick decoder
            if (!svc.deviceId && !svc.serialNumber) {
              return (
                <RowCard
                  key={svc.id}
                  label="DTV"
                  onRemove={() => removeService(svc.id)}
                >
                  <div className="text-sm mb-1">Dekoder</div>
                  <SerialScanInput
                    devices={decoderOptions}
                    onAddDevice={(dev) => onPickDevice(svc.id, dev, 1)}
                    variant="block"
                  />
                </RowCard>
              )
            }

            const isAmend = mode === 'amend'
            const showDtvMetrics =
              is2way && (editDtv[svc.id] || (!isAmend && !svc.usDbmConfirmed))

            if (showDtvMetrics) {
              return (
                <RowCard
                  key={svc.id}
                  label="DTV"
                  onRemove={() => removeService(svc.id)}
                  device={{
                    name: attached?.name ?? '',
                    serial: svc.serialNumber ?? attached?.serialNumber ?? '',
                    category:
                      attached?.category ?? asDeviceCategory(svc.deviceType),
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <Input
                      placeholder="DS [dBm]"
                      type="number"
                      step="0.1"
                      value={svc.usDbmDown ?? ''}
                      onChange={(e) =>
                        patch(svc.id, {
                          usDbmDown:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      placeholder="US [dBm]"
                      type="number"
                      step="0.1"
                      value={svc.usDbmUp ?? ''}
                      onChange={(e) =>
                        patch(svc.id, {
                          usDbmUp:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          patch(svc.id, { usDbmConfirmed: true })
                          setEditDtv((st) => ({ ...st, [svc.id]: false }))
                        }}
                        disabled={
                          svc.usDbmDown === undefined ||
                          svc.usDbmUp === undefined
                        }
                      >
                        Dodaj
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          patch(svc.id, {
                            usDbmDown: svc.usDbmDown,
                            usDbmUp: svc.usDbmUp,
                            usDbmConfirmed: true,
                          })
                          setEditDtv((st) => ({ ...st, [svc.id]: false }))
                        }}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                </RowCard>
              )
            }

            // SUMMARY (+ Edytuj → measurements only; keep device attached)
            const showDtvExtra =
              is2way || svc.usDbmDown !== undefined || svc.usDbmUp !== undefined

            return (
              // AFTER: hide "Urządzenie: ..." on amend, keep "Zainstalowany: ..."
              <RowCard
                key={svc.id}
                label="DTV"
                onRemove={() => removeService(svc.id)}
                device={
                  mode === 'amend'
                    ? undefined
                    : {
                        name: attached?.name ?? '',
                        serial:
                          svc.serialNumber ?? attached?.serialNumber ?? '',
                        category:
                          attached?.category ??
                          asDeviceCategory(svc.deviceType),
                      }
                }
                extra={
                  // show metrics row when 2-way or any metric present
                  showDtvExtra ? (
                    <div className="text-sm text-muted-foreground mt-1">
                      DS: {svc.usDbmDown ?? '—'} dBm | US: {svc.usDbmUp ?? '—'}{' '}
                      dBm
                    </div>
                  ) : null
                }
                installedSummary={
                  mode === 'amend'
                    ? attached
                      ? `${devicesTypeMap[attached.category]} ${attached.name}${
                          attached.serialNumber
                            ? ` (SN: ${attached.serialNumber})`
                            : ''
                        }`
                      : svc.serialNumber
                      ? `(SN: ${svc.serialNumber})`
                      : '—'
                    : undefined
                }
                onEdit={() => setEditDtv((st) => ({ ...st, [svc.id]: true }))}
              />
            )
          }

          if (svc.type === 'NET') {
            const modemOptions = devices.filter(
              (d) =>
                d.category === DeviceCategory.MODEM ||
                d.category === DeviceCategory.ONT
            )
            const routerOptions = devices.filter(
              (d) =>
                d.category === DeviceCategory.UA ||
                d.category === DeviceCategory.MODEM
            )
            const modem = deviceBy(devices, svc.deviceId, svc.serialNumber)
            const router = deviceBy(devices, svc.deviceId2, svc.serialNumber2)

            // STEP 1: modem/ONT
            if (!svc.deviceId && !svc.serialNumber) {
              return (
                <RowCard
                  key={svc.id}
                  label="NET"
                  onRemove={() => removeService(svc.id)}
                >
                  <div className="text-sm mb-1">Modem/ONT</div>
                  <SerialScanInput
                    devices={modemOptions}
                    onAddDevice={(dev) => onPickDevice(svc.id, dev, 1)}
                    variant="block"
                  />
                </RowCard>
              )
            }

            // STEP 2: router (T-Mobile only)
            if (needsRouter && !svc.deviceId2 && !svc.serialNumber2) {
              return (
                <RowCard
                  key={svc.id}
                  label="NET"
                  onRemove={() => removeService(svc.id)}
                  device={{
                    name: modem?.name ?? '',
                    serial: svc.serialNumber ?? modem?.serialNumber ?? '',
                    category: modem?.category ?? DeviceCategory.MODEM,
                  }}
                >
                  <div className="text-sm mb-1 mt-2">Router</div>
                  <SerialScanInput
                    devices={routerOptions}
                    onAddDevice={(dev) => onPickDevice(svc.id, dev, 2)}
                    variant="block"
                  />
                </RowCard>
              )
            }

            // STEP 3: DS/US + speedtest (confirm)
            const netHasAll = !!(
              svc.usDbmDown !== undefined &&
              svc.usDbmUp !== undefined &&
              svc.speedTest
            )
            const isAmend = mode === 'amend'
            const showNetInputs =
              editNet[svc.id] || (!isAmend && !svc.speedTestConfirmed)

            if (showNetInputs) {
              return (
                <RowCard
                  key={svc.id}
                  label="NET"
                  onRemove={() => removeService(svc.id)}
                  device={{
                    name: modem?.name ?? '',
                    serial: svc.serialNumber ?? modem?.serialNumber ?? '',
                    category: modem?.category ?? DeviceCategory.MODEM,
                  }}
                  extra={
                    needsRouter && (router || svc.serialNumber2) ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        Router:{' '}
                        {router
                          ? `${devicesTypeMap[router.category]} ${router.name}${
                              router.serialNumber
                                ? ` (SN: ${router.serialNumber})`
                                : ''
                            }`
                          : svc.serialNumber2
                          ? `(SN: ${svc.serialNumber2})`
                          : '—'}
                      </div>
                    ) : null
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <Input
                      placeholder="DS [dBm]"
                      type="number"
                      step="0.1"
                      value={svc.usDbmDown ?? ''}
                      onChange={(e) =>
                        patch(svc.id, {
                          usDbmDown:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      placeholder="US [dBm]"
                      type="number"
                      step="0.1"
                      value={svc.usDbmUp ?? ''}
                      onChange={(e) =>
                        patch(svc.id, {
                          usDbmUp:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      placeholder="Speedtest [Mb/s]"
                      value={svc.speedTest ?? ''}
                      onChange={(e) =>
                        patch(svc.id, {
                          speedTest: e.target.value || undefined,
                        })
                      }
                    />
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          patch(svc.id, { speedTestConfirmed: true })
                          setEditNet((st) => ({ ...st, [svc.id]: false }))
                        }}
                        disabled={!netHasAll}
                      >
                        Dodaj
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          patch(svc.id, {
                            usDbmDown: svc.usDbmDown,
                            usDbmUp: svc.usDbmUp,
                            speedTest: svc.speedTest,
                            speedTestConfirmed: true,
                          })
                          setEditNet((st) => ({ ...st, [svc.id]: false }))
                        }}
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                </RowCard>
              )
            }

            // SUMMARY (+ Edytuj)
            return (
              <RowCard
                key={svc.id}
                label="NET"
                onRemove={() => removeService(svc.id)}
                device={
                  mode === 'amend'
                    ? undefined
                    : {
                        name: modem?.name ?? '',
                        serial: svc.serialNumber ?? modem?.serialNumber ?? '',
                        category: modem?.category ?? DeviceCategory.MODEM,
                      }
                }
                extra={
                  <div className="text-sm text-muted-foreground mt-1">
                    DS: {svc.usDbmDown} dBm | US: {svc.usDbmUp} dBm |{' '}
                    {svc.speedTest} Mb/s
                  </div>
                }
                installedSummary={
                  mode === 'amend'
                    ? modem
                      ? `${devicesTypeMap[modem.category]} ${modem.name}${
                          modem.serialNumber
                            ? ` (SN: ${modem.serialNumber})`
                            : ''
                        }`
                      : svc.serialNumber
                      ? `(SN: ${svc.serialNumber})`
                      : '—'
                    : undefined
                }
                onEdit={() => setEditNet((st) => ({ ...st, [svc.id]: true }))}
              />
            )
          }

          if (svc.type === 'TEL') {
            return (
              <RowCard
                key={svc.id}
                label="TEL"
                onRemove={() => removeService(svc.id)}
              />
            )
          }

          // ATV
          return (
            <RowCard
              key={svc.id}
              label="ATV"
              onRemove={() => removeService(svc.id)}
            >
              <Textarea
                placeholder="Uwagi (opcjonalnie)"
                value={svc.notes ?? ''}
                onChange={(e) => patch(svc.id, { notes: e.target.value })}
              />
            </RowCard>
          )
        })}
      </div>
    </div>
  )
}

export default ServicesSection

/* ---------------- presentational row card ---------------- */

type RowCardProps = {
  label: string
  onRemove: () => void
  children?: React.ReactNode
  device?: { name: string; serial: string; category: DeviceCategory }
  extra?: React.ReactNode
  /** shown only in amend mode; pass ready string */
  installedSummary?: string
  onEdit?: () => void
}

const RowCard: React.FC<RowCardProps> = ({
  label,
  onRemove,
  children,
  device,
  extra,
  installedSummary,
  onEdit,
}) => (
  <div className="rounded-md border p-3 bg-muted/30 space-y-3">
    <div className="flex items-center justify-between">
      <div className="font-semibold">{label}</div>
      <div className="flex gap-2">
        {onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            <MdEdit /> Edytuj
          </Button>
        )}
        <Button size="sm" variant="danger" onClick={onRemove}>
          <MdDelete /> Usuń
        </Button>
      </div>
    </div>

    {device && (
      <div className="text-sm">
        <span className="text-muted-foreground">Urządzenie: </span>
        {devicesTypeMap[device.category]} {device.name}
        {device.serial ? ` (SN: ${device.serial})` : ''}
      </div>
    )}

    {installedSummary && (
      <div className="text-xs text-muted-foreground">
        Zainstalowany: {installedSummary}
      </div>
    )}

    {children}
    {extra}
  </div>
)
