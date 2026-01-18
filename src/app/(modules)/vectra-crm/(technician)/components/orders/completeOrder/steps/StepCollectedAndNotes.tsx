'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import SerialScanInput from '@/app/(modules)/vectra-crm/components/SerialScanInput'
import DeviceCard from '../DeviceCard'

import { devicesTypeMap } from '@/app/(modules)/vectra-crm/lib/constants'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'

import BarcodeScannerDialog from '@/app/(modules)/vectra-crm/components/orders/BarcodeScannerDialog'
import { IssuedItemDevice } from '@/types/vectra-crm'
import { VectraDeviceCategory, VectraOrderType } from '@prisma/client'

type CollectedDevice = {
  id: string
  name: string
  category: VectraDeviceCategory
  serialNumber: string
}

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

interface Props {
  /** All devices available in technician's stock */
  devices: IssuedItemDevice[]

  /** Already collected (from client) devices */
  collected: CollectedDevice[]
  setCollected: (v: CollectedDevice[]) => void

  /** Issued devices (to client) – only for SERVICE / OUTAGE */
  issued: IssuedItemDevice[]
  setIssued: Setter<IssuedItemDevice[]>

  /** Order metadata */
  orderType: VectraOrderType

  /** Technician notes */
  notes: string
  setNotes: (v: string) => void

  /** Navigation handlers */
  onBack: () => void
  onNext: (data: {
    collected: CollectedDevice[]
    issued: IssuedItemDevice[]
    notes: string
  }) => void
}

/**
 * StepCollectedAndNotes
 * ------------------------------------------------------
 * Handles:
 * - Issuing devices to client (SERVICE / OUTAGE)
 * - Collecting devices from client
 * - Technician notes
 * - Barcode scanning for serial numbers
 */
const StepCollectedAndNotes = ({
  devices,
  collected,
  setCollected,
  issued,
  setIssued,
  orderType,
  notes,
  setNotes,
  onBack,
  onNext,
}: Props) => {
  const [collectEnabled, setCollectEnabled] = useState(false)
  const [issueEnabled, setIssueEnabled] = useState(false)

  const [category, setCategory] = useState<VectraDeviceCategory>('OTHER')
  const [name, setName] = useState('')
  const [sn, setSn] = useState('')

  const [touched, setTouched] = useState(false)

  /** Barcode scanner state */
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanTarget, setScanTarget] = useState<'collected' | 'issued'>(
    'collected'
  )

  /**
   * Handles scanned barcode value.
   * Applies serial number to correct input.
   */
  const handleScan = (value: string): void => {
    const normalized = value.trim().toUpperCase()

    if (!normalized) return

    if (scanTarget === 'collected') {
      setSn(normalized)
      toast.success('Numer seryjny zeskanowany')
    }

    setScannerOpen(false)
  }

  /** Adds manually collected device */
  const addCollected = (): void => {
    if (name.trim().length < 2) {
      toast.error('Podaj nazwę urządzenia.')
      return
    }

    if (sn.trim().length < 3) {
      toast.error('Podaj numer seryjny.')
      return
    }

    const newDevice: CollectedDevice = {
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      name: name.trim(),
      category,
      serialNumber: sn.trim().toUpperCase(),
    }

    setCollected([...collected, newDevice])
    setName('')
    setSn('')
  }

  /** Removes collected device */
  const removeCollected = (id: string): void => {
    setCollected(collected.filter((d) => d.id !== id))
  }

  /** Removes issued device */
  const removeIssued = (id: string): void => {
    setIssued(issued.filter((d) => d.id !== id))
  }

  useEffect(() => {
    if (collected.length > 0) {
      setCollectEnabled(true)
    }

    if (issued.length > 0 && orderType !== 'INSTALATION') {
      setIssueEnabled(true)
    }
  }, [collected.length, issued.length, orderType])

  /** Handles step validation + next */
  const handleNext = (): void => {
    setTouched(true)

    if (collectEnabled && collected.length === 0) {
      toast.error(
        'Dodaj przynajmniej jedno odebrane urządzenie lub wyłącz odbiór.'
      )
      return
    }

    if (orderType !== 'INSTALATION' && issueEnabled && issued.length === 0) {
      toast.error(
        'Dodaj przynajmniej jedno wydane urządzenie lub wyłącz wydanie.'
      )
      return
    }

    onNext({
      collected: collectEnabled ? collected : [],
      issued: issueEnabled ? [...issued] : [],
      notes,
    })
  }

  const canIssue = orderType !== 'INSTALATION'

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h3 className="text-xl font-semibold text-center mt-3 mb-4">
          Sprzęt klienta i uwagi
        </h3>

        {/* === Issued section === */}
        {canIssue && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Switch
                checked={issueEnabled}
                onCheckedChange={(checked) => {
                  setIssueEnabled(checked)
                  if (!checked) setIssued([])
                }}
              />
              <span className="font-semibold">Wydanie sprzętu klientowi</span>
            </div>

            {issueEnabled && (
              <div className="space-y-4 mb-6">
                <SerialScanInput
                  devices={devices.filter(
                    (d) =>
                      !issued.some((ex) => ex.id === d.id) && !!d.serialNumber
                  )}
                  onAddDevice={(dev) => {
                    setIssued((prev) => [...prev, dev])
                  }}
                  variant="block"
                />

                {issued.length > 0 && (
                  <div className="grid gap-3">
                    {issued.map((d) => (
                      <DeviceCard
                        key={d.id}
                        label={devicesTypeMap[d.category]}
                        device={d}
                        onRemove={() => removeIssued(d.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* === Collected section === */}
        <div className="flex items-center gap-3 mb-3">
          <Switch
            checked={collectEnabled}
            onCheckedChange={(checked) => {
              if (!checked && collected.length > 0) {
                const confirmed = window.confirm(
                  'Masz już odebrane urządzenia. Wyłączenie spowoduje ich usunięcie. Kontynuować?'
                )
                if (!confirmed) return
                setCollected([])
              }
              setCollectEnabled(checked)
            }}
          />
          <span className="font-semibold">Odbiór urządzeń od klienta</span>
        </div>

        {collectEnabled && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-2">
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as VectraDeviceCategory)}
              >
                <SelectTrigger className="md:w-36">
                  <SelectValue placeholder="Typ" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(VectraDeviceCategory).map((c) => (
                    <SelectItem key={c} value={c}>
                      {devicesTypeMap[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Nazwa urządzenia"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
              />

              <div className="flex flex-1 gap-2">
                <Input
                  placeholder="Numer seryjny"
                  value={sn}
                  onChange={(e) => setSn(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setScanTarget('collected')
                    setScannerOpen(true)
                  }}
                >
                  Skanuj
                </Button>
              </div>

              <Button onClick={addCollected} disabled={!sn.trim()}>
                Dodaj
              </Button>
            </div>

            {collected.length > 0 ? (
              <div className="grid gap-3">
                {collected.map((d) => (
                  <DeviceCard
                    key={d.id}
                    label={devicesTypeMap[d.category]}
                    device={{
                      id: d.id,
                      type: 'DEVICE',
                      name: d.name,
                      serialNumber: d.serialNumber,
                      category: d.category,
                    }}
                    onRemove={() => removeCollected(d.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Brak dodanych urządzeń.
              </p>
            )}
          </div>
        )}

        {/* === Notes === */}
        <div className="mt-8">
          <h4 className="font-semibold mb-2">Uwagi technika</h4>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Wpisz uwagi dotyczące wykonania zlecenia..."
            className="min-h-[100px]"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-background flex gap-3 p-4">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          Wstecz
        </Button>
        <Button className="flex-1 h-12" onClick={handleNext}>
          Dalej
        </Button>
      </div>

      {/* Barcode scanner dialog */}
      <BarcodeScannerDialog
        open={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  )
}

export default StepCollectedAndNotes
