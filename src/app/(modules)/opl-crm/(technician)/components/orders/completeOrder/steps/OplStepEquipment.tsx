'use client'

import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Separator } from '@/app/components/ui/separator'
import { Switch } from '@/app/components/ui/switch'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { OplDeviceBasic } from '@/types/opl-crm'
import { OplDeviceCategory } from '@prisma/client'
import { useEffect, useRef, useState } from 'react'
import {
  MdAddCircleOutline,
  MdDeleteOutline,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdQrCodeScanner,
} from 'react-icons/md'

import OplSerialScanInput from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/issue/OplSerialScanInput'
import BarcodeScannerDialog from '@/app/components/BarcodeScannerDialog'
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

type Props = {
  suggestedIssued: OplSuggestedEquipmentVM[]
  technicianDevices?: OplDeviceBasic[]
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
    removeCollectedItem,
  } = useCompleteOplOrder()

  const { issued, collected } = state.equipment
  const hasSeededSuggestionsRef = useRef(false)
  const hasSuggestions = suggestedIssued.length > 0
  const [extraDeviceDialogOpen, setExtraDeviceDialogOpen] = useState(false)
  const [collectedCategory, setCollectedCategory] =
    useState<OplDeviceCategory>('MODEM')
  const [collectedName, setCollectedName] = useState('')
  const [collectedSerial, setCollectedSerial] = useState('')
  const [collectedScannerOpen, setCollectedScannerOpen] = useState(false)

  /* ------------------------------------------------------------------ */
  /* SEED ISSUED FROM SUGGESTIONS                                       */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (mode === 'adminEdit') return
    if (suggestedIssued.length === 0) return
    if (hasSeededSuggestionsRef.current) return

    seedIssuedFromSuggestions(suggestedIssued)
    hasSeededSuggestionsRef.current = true
  }, [mode, suggestedIssued, seedIssuedFromSuggestions])

  const handleIssuedToggle = (enabled: boolean) => {
    setIssuedEnabled(enabled)
    setIssuedSkip(!enabled && hasSuggestions)
  }

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
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="issued-enabled">
                Wydać sprzęt w tym zleceniu
              </Label>
              <p className="text-xs text-muted-foreground">
                Dodaj urządzenia po numerze seryjnym lub skanerem.
              </p>
            </div>
            <Switch
              id="issued-enabled"
              checked={hasSuggestions ? !issued.skip : issued.enabled}
              onCheckedChange={handleIssuedToggle}
            />
          </div>

          {(hasSuggestions ? !issued.skip : issued.enabled) && (
            <>
              <Separator />

              <div className="space-y-3">
                {issued.items.map((item) => (
                  <OplEquipmentDraftRow
                    key={item.clientId}
                    item={item}
                    mode="issued"
                    useSerialPicker={hasSuggestions}
                    devices={technicianDevices}
                    onChange={(patch) => updateIssuedItem(item.clientId, patch)}
                    onRemove={() => removeIssuedItem(item.clientId)}
                  />
                ))}
              </div>

              {hasSuggestions ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setExtraDeviceDialogOpen(true)}
                >
                  <MdAddCircleOutline className="h-5 w-5" />
                  Dodaj dodatkowy sprzęt
                </Button>
              ) : (
                <OplSerialScanInput
                  validStatuses={['AVAILABLE', 'ASSIGNED']}
                  strictSource="WAREHOUSE"
                  devices={technicianDevices}
                  onAdd={(device) => {
                    addIssuedItem({
                      warehouseId: device.id,
                      deviceDefinitionId: device.deviceDefinitionId,
                      name: device.name,
                      category: device.category,
                      serial: device.serialNumber,
                      sourceLabel: device.sourceLabel,
                    })
                  }}
                />
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
            <div className="space-y-0.5">
              <Label>Odebrać sprzęt od klienta</Label>
              <p className="text-xs text-muted-foreground">
                Dodaj urządzenia, które wróciły od klienta.
              </p>
            </div>
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
                  <div
                    key={item.clientId}
                    className="rounded-lg border bg-muted/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium leading-tight">
                          {item.name || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Typ: {oplDevicesTypeMap[item.category]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SN: {item.serial || '—'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCollectedItem(item.clientId)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Usuń odebrany sprzęt"
                      >
                        <MdDeleteOutline className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
                <Select
                  value={collectedCategory}
                  onValueChange={(value) =>
                    setCollectedCategory(value as OplDeviceCategory)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ urządzenia" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(OplDeviceCategory).map((category) => (
                      <SelectItem key={category} value={category}>
                        {oplDevicesTypeMap[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={collectedName}
                  onChange={(e) => setCollectedName(e.target.value)}
                  placeholder="Nazwa urządzenia (np. FUNBOX 3)"
                  className="[text-transform:uppercase]"
                />

                <InputGroup>
                  <InputGroupInput
                    value={collectedSerial}
                    onChange={(e) =>
                      setCollectedSerial(e.target.value.toUpperCase())
                    }
                    placeholder="Numer seryjny"
                    className="[text-transform:uppercase]"
                  />
                  <InputGroupButton
                    type="button"
                    onClick={() => setCollectedScannerOpen(true)}
                    aria-label="Skanuj kod"
                  >
                    <MdQrCodeScanner className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroup>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    const name = collectedName.trim()
                    const serial = collectedSerial.trim().toUpperCase()

                    if (!name) return

                    addCollectedItem({
                      deviceDefinitionId: null,
                      warehouseId: null,
                      name,
                      category: collectedCategory,
                      serial,
                    })
                    setCollectedName('')
                    setCollectedSerial('')
                  }}
                >
                  <MdAddCircleOutline className="h-5 w-5" />
                  Dodaj odebrany sprzęt
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ============================================================ */}
      {/* FOOTER                                                        */}
      {/* ============================================================ */}

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button className="flex-1 gap-1" onClick={onNext}>
          Dalej
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>

      <Dialog
        open={extraDeviceDialogOpen}
        onOpenChange={setExtraDeviceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj dodatkowy sprzęt</DialogTitle>
            <DialogDescription>
              Wyszukaj urządzenie po numerze seryjnym lub użyj skanera.
            </DialogDescription>
          </DialogHeader>

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
              setExtraDeviceDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <BarcodeScannerDialog
        open={collectedScannerOpen}
        onClose={() => setCollectedScannerOpen(false)}
        onScan={(code) => setCollectedSerial(code.toUpperCase())}
      />
    </div>
  )
}

export default OplStepEquipment
