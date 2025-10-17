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
 * StepSummary – final step of CompleteOrderWizard
 * Displays the order summary including devices, routers, measurements and materials.
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

  /** Handles final submission */
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

  const materialById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.name ?? '—'
  const unitById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.unit ?? '—'

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable summary content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <h3 className="text-xl font-semibold text-center mt-2">
          Podsumowanie zlecenia
        </h3>

        {/* Status */}
        <Card>
          <CardContent className="p-4 space-y-1">
            <p className="font-medium">
              Status: {status === 'COMPLETED' ? 'Wykonane' : 'Niewykonane'}
            </p>
          </CardContent>
        </Card>

        {/* Services */}
        {services.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Uruchomione usługi</p>

              {services.map((s) => (
                <div
                  key={s.id}
                  className="text-sm border-b last:border-none py-2 space-y-1"
                >
                  {/* --- Service type and main device --- */}
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

                  {/* --- Router if present --- */}
                  {(s.deviceType2 || s.deviceId2) && s.serialNumber2 && (
                    <div className="text-xs text-muted-foreground ml-4">
                      Router:{' '}
                      {(s.deviceType2 && devicesTypeMap[s.deviceType2]) ||
                        'ROUTER'}{' '}
                      (SN: {s.serialNumber2})
                    </div>
                  )}

                  {/* --- Measurements --- */}
                  {(s.usDbmDown !== undefined ||
                    s.usDbmUp !== undefined ||
                    s.speedTest) && (
                    <div className="text-xs text-muted-foreground ml-4">
                      {s.usDbmDown !== undefined && `DS: ${s.usDbmDown} dBm | `}
                      {s.usDbmUp !== undefined && `US: ${s.usDbmUp} dBm`}
                      {s.speedTest && ` | Speedtest: ${s.speedTest} Mb/s`}
                    </div>
                  )}

                  {/* --- Notes for ATV --- */}
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

        {/* Installation */}
        {(install.pion > 0 || install.listwa > 0) && (
          <Card>
            <CardContent className="p-4">
              <p className="font-semibold">Elementy instalacji</p>
              <p className="text-sm text-muted-foreground">
                Piony: {install.pion} | Listwy: {install.listwa}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Materials */}
        {materials.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Zużyte materiały</p>
              {materials.map((m) => (
                <div key={m.id} className="text-sm flex justify-between">
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

        {/* Collected devices */}
        {collected.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-2">
              <p className="font-semibold">Odebrane urządzenia</p>
              {collected.map((d) => (
                <div key={d.id} className="text-sm">
                  {devicesTypeMap[d.category]} {d.name} (SN: {d.serialNumber})
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {notes && (
          <Card>
            <CardContent className="p-4 space-y-1">
              <p className="font-semibold">Uwagi</p>
              <p className="text-sm">{notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sticky bottom nav */}
      <div className="sticky bottom-0 bg-background border-t p-3 flex gap-3">
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
