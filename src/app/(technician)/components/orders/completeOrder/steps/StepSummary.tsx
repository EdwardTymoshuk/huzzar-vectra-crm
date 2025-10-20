'use client'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { devicesTypeMap, materialUnitMap } from '@/lib/constants'
import { ActivatedService } from '@/types'
import { getErrMessage } from '@/utils/errorHandler'
import { getSettlementWorkCodes } from '@/utils/getSettlementWorkCodes'
import {
  DeviceCategory,
  MaterialDefinition,
  OrderStatus,
  OrderType,
  RateDefinition,
  ServiceType,
} from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'

interface StepSummaryProps {
  orderType: OrderType
  status: OrderStatus
  services: ActivatedService[]
  install: {
    pion: number
    listwa: number
  }
  materials: { id: string; quantity: number }[]
  collected: {
    id: string
    name: string
    category: DeviceCategory
    serialNumber: string
  }[]
  notes?: string | null
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
  }) => Promise<void>
  materialDefs: MaterialDefinition[]
  workCodeDefs: RateDefinition[]
}

/**
 * StepSummary
 * -------------------------------------------------------
 * Final step of the CompleteOrderWizard.
 * Displays order summary with status, installation/service
 * blocks, used materials, collected devices, and total earnings.
 */
const StepSummary = ({
  orderType,
  status,
  services,
  install,
  materials,
  collected,
  notes,
  onBack,
  onSubmit,
  materialDefs,
  workCodeDefs,
}: StepSummaryProps) => {
  const [isSaving, setIsSaving] = useState(false)

  /** Handles final confirmation and order submission */
  const handleFinish = async () => {
    try {
      setIsSaving(true)

      const isInstallation = orderType === 'INSTALATION'
      const workCodes = isInstallation
        ? getSettlementWorkCodes(services, workCodeDefs, install)
        : undefined

      const equipmentIds = Array.from(
        new Set(
          services
            .flatMap((s) => [s.deviceId, s.deviceId2])
            .filter((id): id is string => !!id)
        )
      )

      await onSubmit({
        status,
        notes,
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
  const countType = (type: ServiceType) =>
    services.filter((s) => s.type === type).length

  return (
    <div className="flex flex-col h-full justify-between">
      {/* ============ SCROLLABLE CONTENT ============ */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Title */}
        <h3 className="text-xl font-semibold text-center mt-2">
          Podsumowanie zlecenia
        </h3>

        {/* --- Order status --- */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="font-medium">
              Status:{' '}
              {status === 'COMPLETED' ? (
                <span className="text-success">Wykonane</span>
              ) : (
                <span className="text-danger">Niewykonane</span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* --- Installation blocks --- */}
        {orderType === 'INSTALATION' && (
          <>
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-[0.65rem]"
                  >
                    PRZYŁĄCZA ×1
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    GNIAZDA ×
                    {
                      services.filter((s) =>
                        ['DTV', 'NET', 'TEL', 'ATV'].includes(s.type)
                      ).length
                    }
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    PION ×{install.pion || 0}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    LISTWY ×{install.listwa || 0}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    ATV ×{countType('ATV')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    DTV ×{countType('DTV')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    NET ×{countType('NET')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center font-semibold cursor-default hover:bg-secondary text-sm"
                  >
                    TEL ×{countType('TEL')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* --- Devices installed --- */}
        {services.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Zainstalowane urządzenia</p>
              {services.map((s) => (
                <div
                  key={s.id}
                  className="text-sm border-b last:border-none py-2 space-y-1"
                >
                  <div>
                    <span className="font-medium">{s.type}</span>
                    {s.deviceType && (
                      <span className="ml-1 text-muted-foreground">
                        {devicesTypeMap[s.deviceType]}
                      </span>
                    )}
                    {s.serialNumber && (
                      <span className="ml-1 text-muted-foreground">
                        SN: {s.serialNumber}
                      </span>
                    )}
                  </div>

                  {(s.deviceType2 || s.deviceId2) && s.serialNumber2 && (
                    <div className="text-xs text-muted-foreground ml-4">
                      Router:{' '}
                      {(s.deviceType2 && devicesTypeMap[s.deviceType2]) ||
                        'ROUTER'}{' '}
                      (SN: {s.serialNumber2})
                    </div>
                  )}

                  {(s.usDbmDown !== undefined ||
                    s.usDbmUp !== undefined ||
                    s.speedTest) && (
                    <div className="text-xs text-muted-foreground ml-4">
                      {s.usDbmDown !== undefined && `DS: ${s.usDbmDown} dBm | `}
                      {s.usDbmUp !== undefined && `US: ${s.usDbmUp} dBm`}
                      {s.speedTest && ` | Speedtest: ${s.speedTest} Mb/s`}
                    </div>
                  )}

                  {s.type === 'ATV' && s.notes && (
                    <div className="mt-1 text-muted-foreground text-xs whitespace-pre-line ml-2">
                      {s.notes}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* --- Devices removed --- */}
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

        {/* --- Materials used --- */}
        {materials.length > 0 && (
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

        {/* --- Notes --- */}
        {notes && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="font-semibold">Uwagi</p>
              <p className="text-sm">{notes}</p>
            </CardContent>
          </Card>
        )}

        {/* --- Billing summary --- */}
        {orderType === 'INSTALATION' && (
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

      {/* ============ Bottom navigation ============ */}
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
