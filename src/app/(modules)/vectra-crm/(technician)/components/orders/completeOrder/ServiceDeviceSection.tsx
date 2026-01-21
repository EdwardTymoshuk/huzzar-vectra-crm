'use client'

import SerialScanInput from '@/app/(modules)/vectra-crm/components/SerialScanInput'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { VectraIssuedItemDevice } from '@/types/vectra-crm'
import {
  VectraDeviceCategory,
  VectraDeviceSource,
  VectraServiceType,
} from '@prisma/client'
import { ScanLine } from 'lucide-react'
import { useState } from 'react'

import BarcodeScannerDialog from '@/app/(modules)/vectra-crm/components/orders/BarcodeScannerDialog'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'

/**
 * ServiceDeviceSection
 * -------------------------------------------------------------
 * Primary device selection for ServiceConfigDialog.
 * - Warehouse: selects from available devices (via SerialScanInput).
 * - Client: allows manual input (category + name + SN/MAC).
 * - Determines whether SN or MAC is required based on category.
 */
interface Props {
  type: VectraServiceType
  primarySource: VectraDeviceSource
  onChangeSource: (src: VectraDeviceSource) => void
  primaryDevice: VectraIssuedItemDevice | null
  setPrimaryDevice: (d: VectraIssuedItemDevice | null) => void
  primaryOptions: VectraIssuedItemDevice[]
  clientCategory: VectraDeviceCategory | null
  onChangeClientCategory: (c: VectraDeviceCategory | null) => void
  primaryClientName: string
  setPrimaryClientName: (v: string) => void
  primaryClientSn: string
  setPrimaryClientSn: (v: string) => void
}

/** Helper – returns whether given category should use MAC instead of SN */
const requiresMac = (cat?: VectraDeviceCategory): boolean => {
  if (!cat) return false
  return (
    cat === VectraDeviceCategory.DECODER_2_WAY ||
    cat === VectraDeviceCategory.MODEM_HFC ||
    cat === VectraDeviceCategory.MODEM_GPON
  )
}

const ServiceDeviceSection = ({
  type,
  primarySource,
  onChangeSource,
  setPrimaryDevice,
  primaryOptions,
  clientCategory,
  onChangeClientCategory,
  primaryClientName,
  setPrimaryClientName,
  primaryClientSn,
  setPrimaryClientSn,
}: Props) => {
  const [scannerOpen, setScannerOpen] = useState(false)
  // Allowed categories for CLIENT based on service type
  const clientCategories =
    type === 'DTV'
      ? [VectraDeviceCategory.DECODER_1_WAY, VectraDeviceCategory.DECODER_2_WAY]
      : [VectraDeviceCategory.MODEM_HFC, VectraDeviceCategory.MODEM_GPON]

  return (
    <div className="space-y-2 mb-6">
      {/* --- Source switch --- */}
      <div className="flex items-center gap-2">
        <Switch
          checked={primarySource === 'CLIENT'}
          onCheckedChange={(v) => onChangeSource(v ? 'CLIENT' : 'WAREHOUSE')}
        />
        <span className="text-sm text-muted-foreground">
          Urządzenie klienta
        </span>
      </div>

      {/* --- Warehouse device --- */}
      {primarySource === 'WAREHOUSE' ? (
        <SerialScanInput
          devices={primaryOptions}
          onAddDevice={(dev) => setPrimaryDevice(dev)}
          variant="block"
          allowedCategories={
            type === 'DTV'
              ? [
                  VectraDeviceCategory.DECODER_1_WAY,
                  VectraDeviceCategory.DECODER_2_WAY,
                ]
              : [
                  VectraDeviceCategory.MODEM_HFC,
                  VectraDeviceCategory.MODEM_GPON,
                ]
          }
        />
      ) : (
        /* --- Client device manual input --- */
        <div className="grid gap-2">
          {/* Category select */}
          <Select
            value={clientCategory ?? undefined}
            onValueChange={(val) =>
              onChangeClientCategory(val as VectraDeviceCategory)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz kategorię" />
            </SelectTrigger>
            <SelectContent>
              {clientCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {type === 'DTV'
                    ? c === 'DECODER_2_WAY'
                      ? 'DEKODER 2-WAY'
                      : 'DEKODER 1-WAY'
                    : c === 'MODEM_GPON'
                    ? 'MODEM GPON'
                    : 'MODEM HFC'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Device name */}
          <Input
            placeholder="Nazwa urządzenia"
            value={primaryClientName}
            onChange={(e) => setPrimaryClientName(e.target.value)}
          />

          {/* Serial number or MAC address depending on category */}
          <InputGroup>
            <InputGroupInput
              placeholder={
                requiresMac(clientCategory ?? undefined)
                  ? 'Adres MAC'
                  : 'Numer seryjny'
              }
              value={primaryClientSn}
              onChange={(e) => setPrimaryClientSn(e.target.value)}
              className="[text-transform:uppercase] placeholder:normal-case"
            />
            <InputGroupButton
              type="button"
              onClick={() => setScannerOpen(true)}
              aria-label="Scan serial or MAC"
              size="sm"
              className="h-full"
            >
              <ScanLine className="h-6 w-6" size={30} />
            </InputGroupButton>
          </InputGroup>
        </div>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => {
          setPrimaryClientSn(code.trim().toUpperCase())
        }}
      />
    </div>
  )
}

export default ServiceDeviceSection
