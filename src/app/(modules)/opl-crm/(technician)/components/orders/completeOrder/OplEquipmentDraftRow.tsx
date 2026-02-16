'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import BarcodeScannerDialog from '@/app/components/BarcodeScannerDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { OplIssuedItemDevice } from '@/types/opl-crm'
import { useEffect, useState } from 'react'
import { MdDeleteOutline, MdQrCodeScanner } from 'react-icons/md'
import OplSerialScanInput from '@/app/(modules)/opl-crm/admin-panel/components/warehouse/issue/OplSerialScanInput'
import { OplDeviceBasic } from '@/types/opl-crm'

import type { OplDeviceCategory } from '@prisma/client'

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

export type OplEquipmentDraftItem = {
  clientId: string
  deviceDefinitionId: string | null
  warehouseId?: string | null
  name: string
  category: OplDeviceCategory
  serial: string
  sourceLabel?: string
}

type Props = {
  /** Draft item from CompleteOplOrderContext */
  item: OplEquipmentDraftItem

  /** issued | collected (UI only, no logic branching) */
  mode: 'issued' | 'collected'

  /** Patch updater */
  onChange: (patch: Partial<OplEquipmentDraftItem>) => void

  /** Remove item from draft */
  onRemove: () => void

  /** Render SerialScanInput picker instead of plain serial input */
  useSerialPicker?: boolean

  /** Optional device pool used by SerialScanInput */
  devices?: OplDeviceBasic[]
  deviceDefinitions?: {
    id: string
    name: string
    category: OplDeviceCategory
  }[]
}

/**
 * OplEquipmentDraftRow
 * ------------------------------------------------------------
 * Single row representing issued or collected equipment
 * in OPL order completion wizard.
 *
 * This component is UI-only:
 * - no backend access
 * - no warehouse validation
 * - no source awareness (warehouse / technician)
 */
const OplEquipmentDraftRow = ({
  item,
  mode,
  onChange,
  onRemove,
  useSerialPicker = false,
  devices = [],
  deviceDefinitions = [],
}: Props) => {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [isEditingSuggested, setIsEditingSuggested] = useState(!item.serial)
  const [pendingMismatch, setPendingMismatch] =
    useState<OplIssuedItemDevice | null>(null)
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false)

  useEffect(() => {
    if (!item.serial) {
      setIsEditingSuggested(true)
    }
  }, [item.serial])

  const applyPickedDevice = (device: OplIssuedItemDevice) => {
    onChange({
      serial: device.serialNumber,
      name: device.name,
      category: device.category,
      deviceDefinitionId: device.deviceDefinitionId,
      warehouseId: device.id,
      sourceLabel: device.sourceLabel,
    })
    setIsEditingSuggested(false)
    setMismatchDialogOpen(false)
    setPendingMismatch(null)
  }

  const handleSuggestedPick = (device: OplIssuedItemDevice) => {
    if (device.category !== item.category) {
      setPendingMismatch(device)
      setMismatchDialogOpen(true)
      return
    }

    applyPickedDevice(device)
  }

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      {/* ---------------------------------------------------------- */}
      {/* DEVICE INFO                                               */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            {mode === 'collected' ? (
              <span className="text-xs text-muted-foreground">
                Odebrany sprzęt
              </span>
            ) : (
              <>
                <span className="font-medium leading-tight">{item.name}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {oplDevicesTypeMap[item.category]}
                  </Badge>
                </div>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            aria-label="Usuń sprzęt"
            className="text-destructive hover:text-destructive"
          >
            <MdDeleteOutline className="h-5 w-5" />
          </Button>
        </div>

        {mode === 'collected' && (
          <div className="space-y-2">
            <Select
              value={item.deviceDefinitionId ?? undefined}
              onValueChange={(deviceDefinitionId) => {
                const selected = deviceDefinitions.find(
                  (d) => d.id === deviceDefinitionId
                )

                onChange({
                  deviceDefinitionId,
                  category: selected?.category ?? item.category,
                  name: selected?.name ?? item.name,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz typ urządzenia" />
              </SelectTrigger>
              <SelectContent>
                {deviceDefinitions.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name} ({oplDevicesTypeMap[def.category]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={item.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Nazwa urządzenia"
            />

            <InputGroup>
              <InputGroupInput
                value={item.serial}
                onChange={(e) =>
                  onChange({
                    serial: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Numer seryjny"
                className="[text-transform:uppercase]"
              />
              <InputGroupButton
                type="button"
                onClick={() => setScannerOpen(true)}
                aria-label="Skanuj kod"
              >
                <MdQrCodeScanner className="h-4 w-4" />
              </InputGroupButton>
            </InputGroup>
          </div>
        )}

        {mode !== 'collected' &&
          (useSerialPicker ? (
            <div className="space-y-2">
              {item.serial && !isEditingSuggested ? (
                <div className="rounded-md border bg-background p-3">
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Model</span>
                      <span className="font-medium">
                        {oplDevicesTypeMap[item.category]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nazwa</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SN</span>
                      <span className="font-medium">{item.serial}</span>
                    </div>
                    {item.sourceLabel && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Źródło</span>
                        <span className="font-medium">{item.sourceLabel}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setIsEditingSuggested(true)}
                  >
                    Zmień urządzenie
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Wybierz urządzenie ze stanu techników (SN / skaner).
                  </p>

                  <OplSerialScanInput
                    devices={devices}
                    validStatuses={['AVAILABLE', 'ASSIGNED']}
                    strictSource="WAREHOUSE"
                    onAdd={handleSuggestedPick}
                  />
                </>
              )}
            </div>
          ) : (
            <InputGroup>
              <InputGroupInput
                value={item.serial}
                onChange={(e) =>
                  onChange({
                    serial: e.target.value.toUpperCase(),
                  })
                }
                placeholder="Wpisz lub zeskanuj numer seryjny"
                className="[text-transform:uppercase]"
              />
              <InputGroupButton
                type="button"
                onClick={() => setScannerOpen(true)}
                aria-label="Skanuj kod"
              >
                <MdQrCodeScanner className="h-4 w-4" />
              </InputGroupButton>
            </InputGroup>
          ))}
      </div>

      {!useSerialPicker && (
        <BarcodeScannerDialog
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(code) =>
            onChange({
              serial: code.toUpperCase(),
            })
          }
        />
      )}

      <AlertDialog open={mismatchDialogOpen} onOpenChange={setMismatchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inny typ urządzenia</AlertDialogTitle>
            <AlertDialogDescription>
              Dla tej pozycji sugerowany był typ{' '}
              <strong>{oplDevicesTypeMap[item.category]}</strong>, a wybrano{' '}
              <strong>
                {pendingMismatch
                  ? oplDevicesTypeMap[pendingMismatch.category]
                  : 'inny typ'}
              </strong>
              . Czy chcesz podmienić urządzenie?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingMismatch) return
                applyPickedDevice(pendingMismatch)
              }}
            >
              Tak, podmień
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OplEquipmentDraftRow
