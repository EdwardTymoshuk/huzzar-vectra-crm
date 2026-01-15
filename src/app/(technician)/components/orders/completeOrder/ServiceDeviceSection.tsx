'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
import BarcodeScannerDialog from '@/app/components/shared/orders/BarcodeScannerDialog'
import { Input } from '@/app/components/ui/input'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@/app/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { DeviceSource, IssuedItemDevice } from '@/types'
import { DeviceCategory, ServiceType } from '@prisma/client'
import { ScanLine } from 'lucide-react'
import { useState } from 'react'

/**
 * ServiceDeviceSection
 * -------------------------------------------------------------
 * Primary device selection for ServiceConfigDialog.
 * - Warehouse: selects from available devices (via SerialScanInput).
 * - Client: allows manual input (category + name + SN/MAC).
 * - Determines whether SN or MAC is required based on category.
 */
interface Props {
  type: ServiceType
  primarySource: DeviceSource
  onChangeSource: (src: DeviceSource) => void
  primaryDevice: IssuedItemDevice | null
  setPrimaryDevice: (d: IssuedItemDevice | null) => void
  primaryOptions: IssuedItemDevice[]
  clientCategory: DeviceCategory | null
  onChangeClientCategory: (c: DeviceCategory | null) => void
  primaryClientName: string
  setPrimaryClientName: (v: string) => void
  primaryClientSn: string
  setPrimaryClientSn: (v: string) => void
}

/** Helper – returns whether given category should use MAC instead of SN */
const requiresMac = (cat?: DeviceCategory): boolean => {
  if (!cat) return false
  return (
    cat === DeviceCategory.DECODER_2_WAY ||
    cat === DeviceCategory.MODEM_HFC ||
    cat === DeviceCategory.MODEM_GPON
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
      ? [DeviceCategory.DECODER_1_WAY, DeviceCategory.DECODER_2_WAY]
      : [DeviceCategory.MODEM_HFC, DeviceCategory.MODEM_GPON]

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
              ? [DeviceCategory.DECODER_1_WAY, DeviceCategory.DECODER_2_WAY]
              : [DeviceCategory.MODEM_HFC, DeviceCategory.MODEM_GPON]
          }
        />
      ) : (
        /* --- Client device manual input --- */
        <div className="grid gap-2">
          {/* Category select */}
          <Select
            value={clientCategory ?? undefined}
            onValueChange={(val) =>
              onChangeClientCategory(val as DeviceCategory)
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
