'use client'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { devicesTypeMap, materialUnitMap } from '@/lib/constants'
import { ActivatedService, IssuedItemDevice } from '@/types'
import { getErrMessage } from '@/utils/errorHandler'
import { getSettlementWorkCodes } from '@/utils/getSettlementWorkCodes'
import {
  DeviceCategory,
  MaterialDefinition,
  OrderStatus,
  OrderType,
  RateDefinition,
} from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'

interface StepSummaryProps {
  orderType: OrderType
  status: OrderStatus
  services: ActivatedService[]
  install: { pion: number; listwa: number }
  materials: { id: string; quantity: number }[]
  collected: {
    id: string
    name: string
    category: DeviceCategory
    serialNumber: string
  }[]
  notes?: string | null
  failureReason?: string | null
  onBack: () => void
  onSubmit: (payload: {
    status: OrderStatus
    notes?: string | null
    failureReason?: string
    workCodes?: { code: string; quantity: number }[]
    equipmentIds: string[]
    usedMaterials: { id: string; quantity: number }[]
    collectedDevices: {
      name: string
      category: DeviceCategory
      serialNumber?: string
    }[]
    services: ActivatedService[]
    issuedDevices?: string[]
  }) => Promise<void>
  materialDefs: MaterialDefinition[]
  workCodeDefs: RateDefinition[]
  issued?: IssuedItemDevice[]
}

/**
 * StepSummary
 * -------------------------------------------------------
 * Readable, structured final step summary:
 * - NET, DTV, TEL, ATV sections are visually separated
 * - Each has name header + devices/SN/pomiary in next lines
 */
const StepSummary = ({
  orderType,
  status,
  services,
  install,
  materials,
  collected,
  notes,
  failureReason,
  onBack,
  onSubmit,
  materialDefs,
  workCodeDefs,
  issued,
}: StepSummaryProps) => {
  const [isSaving, setIsSaving] = useState(false)

  const isCompleted = status === 'COMPLETED'
  const isInstallation = orderType === 'INSTALATION'

  /** Submit handler */
  const handleFinish = async () => {
    try {
      setIsSaving(true)
      const workCodes =
        status === 'COMPLETED' && isInstallation
          ? getSettlementWorkCodes(services, workCodeDefs, install)
          : undefined

      const equipmentIds = Array.from(
        new Set(
          [
            ...services.flatMap((s) => [
              s.deviceId,
              s.deviceId2,
              ...(s.extraDevices?.map((e) => e.id) ?? []),
            ]),
            ...(issued?.map((i) => i.id) ?? []),
          ].filter((id): id is string => !!id)
        )
      )

      await onSubmit({
        status,
        notes,
        failureReason:
          status === 'NOT_COMPLETED' ? failureReason ?? undefined : undefined,
        equipmentIds,
        usedMaterials: materials,
        collectedDevices: collected,
        services,
        workCodes,
      })
    } catch (err) {
      toast.error('Błąd podczas zapisu.', { description: getErrMessage(err) })
    } finally {
      setIsSaving(false)
    }
  }

  /** Helpers */
  const materialById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.name ?? '—'
  const unitById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.unit ?? '—'

  /** Split services by type for display */
  const netServices = services.filter((s) => s.type === 'NET')
  const dtvServices = services.filter((s) => s.type === 'DTV')
  const telServices = services.filter((s) => s.type === 'TEL')
  const atvServices = services.filter((s) => s.type === 'ATV')

  return (
    <div className="flex flex-col h-full justify-between">
      {/* ===== Content ===== */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <h2 className="text-xl font-semibold text-center mt-2">
          Podsumowanie zlecenia
        </h2>

        {/* Status */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <h3>
              Status:{' '}
              {isCompleted ? (
                <span className="text-success">Wykonane</span>
              ) : (
                <span className="text-danger">Niewykonane</span>
              )}
            </h3>
          </CardContent>
        </Card>

        {/* If NOT_COMPLETED show only failure + notes */}
        {!isCompleted && (
          <>
            {failureReason && (
              <Card>
                <CardContent className="p-4">
                  <p className="font-semibold mb-1">Powód niewykonania</p>
                  <p className="text-sm whitespace-pre-line">{failureReason}</p>
                </CardContent>
              </Card>
            )}
            {notes && (
              <Card>
                <CardContent className="p-4">
                  <p className="font-semibold mb-1">Uwagi</p>
                  <p className="text-sm whitespace-pre-line">{notes}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Completed */}
        {isCompleted && (
          <>
            {/* Installation counts */}
            {isInstallation && (
              <Card>
                <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <Button
                    variant="secondary"
                    className="cursor-default w-full text-[0.65rem]"
                  >
                    PRZYŁĄCZA ×1
                  </Button>
                  <Button variant="secondary" className="cursor-default w-full">
                    GNIAZDA ×
                    {services.reduce((acc, s) => {
                      if (s.type === 'DTV') return acc + 1
                      if (s.type === 'TEL') return acc + 1
                      if (s.type === 'NET')
                        return acc + 1 + (s.extraDevices?.length ?? 0)
                      if (s.type === 'ATV') return acc + 1
                      return acc
                    }, 0)}
                  </Button>
                  <Button variant="secondary" className="cursor-default w-full">
                    PION ×{install.pion || 0}
                  </Button>
                  <Button variant="secondary" className="cursor-default w-full">
                    LISTWY ×{install.listwa || 0}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Services breakdown */}
            {(netServices.length > 0 ||
              dtvServices.length > 0 ||
              telServices.length > 0 ||
              atvServices.length > 0) && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <p className="font-semibold text-base">
                    Zainstalowane usługi i urządzenia
                  </p>

                  {/* --- NET --- */}
                  {netServices.map((s, i) => (
                    <div
                      key={`net-${i}`}
                      className="border-b pb-2 last:border-none"
                    >
                      <h3 className="font-semibold">NET</h3>
                      <div className="text-sm text-muted-foreground ml-2 mt-1 space-y-1">
                        {/* --- Main device (MODEM) --- */}
                        <div className="leading-tight">
                          {(() => {
                            const category = s.deviceType?.toUpperCase?.() ?? ''
                            const name =
                              s.deviceName?.toUpperCase?.() ??
                              devicesTypeMap[
                                s.deviceType ?? ''
                              ]?.toUpperCase?.() ??
                              '—'
                            const sn = s.serialNumber
                              ? s.serialNumber.toUpperCase()
                              : '—'
                            return `${
                              devicesTypeMap[category]
                            } ${name} SN: ${sn} ${
                              s.deviceSource === 'CLIENT'
                                ? ' [SPRZĘT KLIENTA]'
                                : ''
                            }`
                          })()}
                        </div>

                        {/* --- Router (deviceId2) --- */}
                        {s.deviceId2 && (
                          <div className="leading-tight">
                            {(() => {
                              const category =
                                s.deviceType2?.toUpperCase?.() ?? ''
                              const name =
                                s.deviceName?.toUpperCase?.() ??
                                devicesTypeMap[
                                  s.deviceType ?? ''
                                ]?.toUpperCase?.() ??
                                '—'
                              const sn = s.serialNumber2
                                ? s.serialNumber2.toUpperCase()
                                : '—'
                              return `${
                                devicesTypeMap[category]
                              } ${name} SN: ${sn} ${
                                s.deviceSource === 'CLIENT'
                                  ? ' [SPRZĘT KLIENTA]'
                                  : ''
                              }`
                            })()}
                          </div>
                        )}

                        {/* --- Extra devices --- */}
                        {s.extraDevices && s.extraDevices.length > 0 && (
                          <div className="leading-tight">
                            {s.extraDevices.map((ex) => {
                              const name = ex.name?.toUpperCase() ?? ''
                              const sn = ex.serialNumber
                                ? ex.serialNumber.toUpperCase()
                                : '—'
                              const cat =
                                ex.category !== 'OTHER'
                                  ? ex.category?.toUpperCase?.()
                                  : ''
                              const src =
                                ex.source === 'CLIENT'
                                  ? ' [SPRZĘT KLIENTA]'
                                  : ''
                              return (
                                <div key={ex.id}>
                                  {cat} {name} SN: {sn}
                                  {src}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* --- Measurements --- */}
                        {(s.usDbmDown !== undefined ||
                          s.usDbmUp !== undefined ||
                          s.speedTest) && (
                          <div className="mt-1">
                            {s.usDbmDown !== undefined &&
                              `DS: ${s.usDbmDown} dBm `}
                            {s.usDbmUp !== undefined &&
                              `| US: ${s.usDbmUp} dBm | `}
                            {s.speedTest && `Speedtest: ${s.speedTest} Mb/s`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* --- DTV --- */}
                  {dtvServices.map((s, i) => (
                    <div
                      key={`dtv-${i}`}
                      className="border-b pb-2 last:border-none"
                    >
                      <h3 className="font-semibold">DTV</h3>
                      <div className="text-sm text-muted-foreground ml-2 mt-1 space-y-1">
                        <div className="leading-tight">
                          {(() => {
                            const category = s.deviceType?.toUpperCase?.() ?? ''
                            const name =
                              s.deviceName?.toUpperCase?.() ??
                              devicesTypeMap[
                                s.deviceType ?? ''
                              ]?.toUpperCase?.() ??
                              ''
                            const sn = s.serialNumber
                              ? s.serialNumber.toUpperCase()
                              : '—'
                            return `${
                              devicesTypeMap[category]
                            } ${name} SN: ${sn} ${
                              s.deviceSource === 'CLIENT'
                                ? ' [SPRZĘT KLIENTA]'
                                : ''
                            }`
                          })()}
                        </div>

                        {(s.usDbmDown !== undefined ||
                          s.usDbmUp !== undefined) && (
                          <div>
                            {s.usDbmDown !== undefined &&
                              `DS: ${s.usDbmDown} dBm `}
                            {s.usDbmUp !== undefined &&
                              `| US: ${s.usDbmUp} dBm`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* --- TEL --- */}
                  {telServices.map((s, i) => (
                    <div
                      key={`tel-${i}`}
                      className="border-b pb-2 last:border-none"
                    >
                      <h3>TEL</h3>
                      <div className="text-sm text-muted-foreground ml-2 mt-1">
                        {s.serialNumber
                          ? `KARTA SIM SN: ${s.serialNumber}`
                          : ''}
                      </div>
                    </div>
                  ))}

                  {/* --- ATV --- */}
                  {atvServices.map((s, i) => (
                    <div
                      key={`atv-${i}`}
                      className="border-b pb-2 last:border-none"
                    >
                      <h3>ATV</h3>
                      <div className="text-sm text-muted-foreground ml-2 mt-1">
                        {s.notes && s.notes.length > 0 ? s.notes : ''}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!isInstallation && issued && issued.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Zamontowane urządzenia</p>
              {issued.map((d) => (
                <div key={d.id} className="text-sm">
                  {devicesTypeMap[d.category]} {d.name} (SN: {d.serialNumber})
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Collected devices */}
        {collected.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Zdemontowane urządzenia</p>
              {collected.map((d) => (
                <div key={d.id} className="text-sm">
                  {devicesTypeMap[d.category]} {d.name} (SN: {d.serialNumber})
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Materials */}
        {isCompleted && materials.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Zużyte materiały</p>
              {materials.map((m) => (
                <div
                  key={m.id}
                  className="text-sm flex justify-between border-b last:border-none py-1"
                >
                  <span>{materialById(m.id)}</span>
                  <span>
                    {m.quantity}{' '}
                    {materialUnitMap[unitById(m.id)] ?? unitById(m.id)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {isCompleted && notes && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="font-semibold">Uwagi</p>
              <p className="text-sm whitespace-pre-line">{notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Billing */}
        {isCompleted && isInstallation && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="font-semibold mb-1">Rozliczenie</p>
              {(() => {
                const workCodes = getSettlementWorkCodes(
                  services,
                  workCodeDefs,
                  install
                )
                const total = workCodes.reduce((sum, wc) => {
                  const rate = workCodeDefs.find((r) => r.code === wc.code)
                  return sum + (rate?.amount ?? 0) * wc.quantity
                }, 0)
                return (
                  <p className="text-success text-lg font-bold">
                    {total.toFixed(2)} zł
                  </p>
                )
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== Footer ===== */}
      <div className="sticky bottom-0 bg-background flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          Wstecz
        </Button>
        <Button
          className="flex-1 h-12"
          onClick={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? 'Zapisywanie...' : 'Zatwierdź i zakończ'}
        </Button>
      </div>
    </div>
  )
}

export default StepSummary
