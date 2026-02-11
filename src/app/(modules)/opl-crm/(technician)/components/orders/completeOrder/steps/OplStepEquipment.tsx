'use client'

import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Label } from '@/app/components/ui/label'
import { Separator } from '@/app/components/ui/separator'
import { Switch } from '@/app/components/ui/switch'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { OplDeviceCategory } from '@prisma/client'
import { useEffect } from 'react'

import OplSerialScanInput from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/issue/OplSerialScanInput'
import OplEquipmentDraftRow from '../OplEquipmentDraftRow'

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

export type OplSuggestedEquipmentVM = {
  deviceDefinitionId: string
  name: string
  category: OplDeviceCategory
  quantity: number
}

type TechnicianDeviceVM = {
  id: string
  deviceDefinitionId: string
  name: string
  serialNumber: string
  category: OplDeviceCategory
}

type Props = {
  suggestedIssued: OplSuggestedEquipmentVM[]
  technicianDevices?: TechnicianDeviceVM[]
  mode?: 'complete' | 'amend' | 'adminEdit'
  onBack: () => void
  onNext: () => void
}

/**
 * OPL order wizard – Equipment step.
 *
 * Responsibilities:
 * - Handle issued equipment (suggested or manual)
 * - Handle collected equipment (manual only)
 * - Persist state in CompleteOplOrderContext
 *
 * Notes:
 * - In adminEdit mode suggested equipment is NOT auto-seeded
 * - Admin can add devices from warehouse and technician stock
 */
const OplStepEquipment = ({
  suggestedIssued,
  technicianDevices,
  mode = 'complete',
  onBack,
  onNext,
}: Props) => {
  const {
    state,

    /* issued */
    setIssuedEnabled,
    setIssuedSkip,
    addIssuedItem,
    updateIssuedItem,
    removeIssuedItem,
    seedIssuedFromSuggestions,

    /* collected */
    setCollectedEnabled,
    addCollectedItem,
    updateCollectedItem,
    removeCollectedItem,
  } = useCompleteOplOrder()

  const { issued, collected } = state.equipment

  /* ------------------------------------------------------------------ */
  /* SEED ISSUED FROM SUGGESTIONS                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (mode !== 'adminEdit' && suggestedIssued.length > 0) {
      seedIssuedFromSuggestions(suggestedIssued)
    }
  }, [mode, suggestedIssued, seedIssuedFromSuggestions])

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6 p-4">
        {/* ============================================================ */}
        {/* ISSUED EQUIPMENT                                             */}
        {/* ============================================================ */}

        <Card className="p-4 space-y-4">
          <h3 className="font-semibold">Wydany sprzęt</h3>

          {/* ------------------------------------------------------------ */}
          {/* CASE: Suggested equipment exists                            */}
          {/* ------------------------------------------------------------ */}

          {suggestedIssued.length > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skip-issued"
                  checked={issued.skip}
                  onCheckedChange={(v) => setIssuedSkip(Boolean(v))}
                />
                <Label htmlFor="skip-issued">
                  Pomiń wydanie sprzętu w tym zleceniu
                </Label>
              </div>

              {!issued.skip && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    {issued.items.map((item) => (
                      <OplEquipmentDraftRow
                        key={item.clientId}
                        item={item}
                        mode="issued"
                        onChange={(patch) =>
                          updateIssuedItem(item.clientId, patch)
                        }
                        onRemove={() => removeIssuedItem(item.clientId)}
                      />
                    ))}
                  </div>

                  <OplSerialScanInput
                    validStatuses={['AVAILABLE', 'ASSIGNED']}
                    strictSource="WAREHOUSE"
                    devices={technicianDevices}
                    onAdd={(device) => {
                      addIssuedItem({
                        deviceDefinitionId: device.deviceDefinitionId,
                        name: device.name,
                        category: device.category,
                        serial: device.serialNumber,
                      })
                    }}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {/* -------------------------------------------------------- */}
              {/* CASE: No suggestions → switch-driven                     */}
              {/* -------------------------------------------------------- */}

              <div className="flex items-center justify-between">
                <Label>Wydać sprzęt</Label>
                <Switch
                  checked={issued.enabled}
                  onCheckedChange={setIssuedEnabled}
                />
              </div>

              {issued.enabled && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    {issued.items.map((item) => (
                      <OplEquipmentDraftRow
                        key={item.clientId}
                        item={item}
                        mode="issued"
                        onChange={(patch) =>
                          updateIssuedItem(item.clientId, patch)
                        }
                        onRemove={() => removeIssuedItem(item.clientId)}
                      />
                    ))}
                  </div>

                  <OplSerialScanInput
                    validStatuses={['AVAILABLE', 'ASSIGNED']}
                    strictSource="WAREHOUSE"
                    devices={technicianDevices}
                    onAdd={(device) => {
                      addIssuedItem({
                        deviceDefinitionId: device.deviceDefinitionId,
                        name: device.name,
                        category: device.category,
                        serial: device.serialNumber,
                      })
                    }}
                  />
                </>
              )}
            </>
          )}
        </Card>

        {/* ============================================================ */}
        {/* COLLECTED EQUIPMENT                                          */}
        {/* ============================================================ */}

        <Card className="p-4 space-y-4">
          <h3 className="font-semibold">Odebrany sprzęt</h3>

          <div className="flex items-center justify-between">
            <Label>Odebrać sprzęt</Label>
            <Switch
              checked={collected.enabled}
              onCheckedChange={setCollectedEnabled}
            />
          </div>

          {collected.enabled && (
            <>
              <Separator />

              <div className="space-y-3">
                {collected.items.map((item) => (
                  <OplEquipmentDraftRow
                    key={item.clientId}
                    item={item}
                    mode="collected"
                    onChange={(patch) =>
                      updateCollectedItem(item.clientId, patch)
                    }
                    onRemove={() => removeCollectedItem(item.clientId)}
                  />
                ))}
              </div>

              <OplSerialScanInput
                validStatuses={undefined}
                devices={technicianDevices}
                onAdd={(device) => {
                  addCollectedItem({
                    deviceDefinitionId: device.deviceDefinitionId,
                    name: device.name,
                    category: device.category,
                    serial: device.serialNumber,
                  })
                }}
              />
            </>
          )}
        </Card>
      </div>

      {/* ============================================================ */}
      {/* FOOTER                                                        */}
      {/* ============================================================ */}

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Wstecz
        </Button>
        <Button className="flex-1" onClick={onNext}>
          Dalej
        </Button>
      </div>
    </div>
  )
}

export default OplStepEquipment
