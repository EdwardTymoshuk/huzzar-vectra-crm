'use client'

import SerialScanInput from '@/app/components/shared/SerialScanInput'
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
import { devicesTypeMap } from '@/lib/constants'
import { IssuedItemDevice } from '@/types'
import { DeviceCategory, OrderType } from '@prisma/client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import DeviceCard from '../DeviceCard'

type CollectedDevice = {
  id: string
  name: string
  category: DeviceCategory
  serialNumber: string
}

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

interface Props {
  /** All devices available in technician's stock */
  devices: IssuedItemDevice[]

  /** Already collected (from client) devices */
  collected: CollectedDevice[]
  setCollected: (v: CollectedDevice[]) => void

  /** Issued devices (to client) – only for SERVICE/OUTAGE */
  issued: IssuedItemDevice[]
  setIssued: Setter<IssuedItemDevice[]>

  /** Order metadata */
  orderType: OrderType

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
 *  - (SERVICE/OUTAGE) Issuing new devices to client
 *  - Collecting devices from client
 *  - Technician notes
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
  const [category, setCategory] = useState<DeviceCategory>('OTHER')
  const [name, setName] = useState('')
  const [sn, setSn] = useState('')
  const [touched, setTouched] = useState(false)

  /** Adds manually collected device */
  const addCollected = () => {
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
  const removeCollected = (id: string) => {
    setCollected(collected.filter((d) => d.id !== id))
  }

  /** Removes issued device */
  const removeIssued = (id: string) => {
    setIssued(issued.filter((d) => d.id !== id))
  }

  useEffect(() => {
    // Enable collecting section if there are any collected devices
    if (collected.length > 0) {
      setCollectEnabled(true)
    }

    // Enable issuing section if there are any issued devices (SERVICE/OUTAGE)
    if (issued.length > 0 && orderType !== 'INSTALATION') {
      setIssueEnabled(true)
    }
  }, [collected.length, issued.length, orderType])

  /** Handles step validation + next */
  const handleNext = () => {
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
      collected: collectEnabled || collected.length > 0 ? collected : [],
      issued: issueEnabled || issued.length > 0 ? [...issued] : [],
      notes,
    })
  }

  /** Determines if issue section should be visible (SERVICE / OUTAGE only) */
  const canIssue = orderType !== 'INSTALATION'

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h3 className="text-xl font-semibold text-center mt-3 mb-4">
          Sprzęt klienta i uwagi
        </h3>

        {/* === Issued section (only for SERVICE / OUTAGE) === */}
        {canIssue && (
          <>
            <div className="flex items-center gap-3 mb-3">
              <Switch
                id="issue-switch"
                checked={issueEnabled}
                onCheckedChange={(checked) => {
                  setIssueEnabled(checked)
                  if (!checked) setIssued([])
                }}
              />
              <label htmlFor="issue-switch" className="font-semibold">
                Wydanie sprzętu klientowi
              </label>
            </div>

            {issueEnabled && (
              <div className="space-y-4 mb-6">
                <SerialScanInput
                  devices={devices.filter(
                    (d) =>
                      !issued.some((ex) => ex.id === d.id) &&
                      d.serialNumber &&
                      d.serialNumber.length > 0
                  )}
                  onAddDevice={(dev) => {
                    setIssued((prev) => [...prev, dev])
                  }}
                  variant="block"
                />

                {issued.length > 0 && (
                  <div className="grid gap-3 mt-2">
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

        {/* === Collected section (always visible) === */}
        <div className="flex items-center gap-3 mb-3">
          <Switch
            id="collect-switch"
            checked={collectEnabled}
            onCheckedChange={(checked) => {
              if (!checked && collected.length > 0) {
                const confirm = window.confirm(
                  'Masz już odebrane urządzenia. Wyłączenie spowoduje ich usunięcie. Chcesz kontyunować ?'
                )
                if (!confirm) return
                setCollected([])
              }
              setCollectEnabled(checked)
            }}
          />
          <label htmlFor="collect-switch" className="font-semibold">
            Odbiór urządzeń od klienta
          </label>
        </div>

        {collectEnabled && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-2">
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DeviceCategory)}
              >
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Typ urządzenia" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(DeviceCategory).map((c) => (
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
              <Input
                placeholder="Numer seryjny"
                value={sn}
                onChange={(e) => setSn(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addCollected} disabled={!sn.trim()}>
                Dodaj
              </Button>
            </div>

            <h4 className="font-semibold mt-3">Odebrane urządzenia</h4>
            {collected.length > 0 ? (
              <div className="grid gap-3 mt-2">
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
              <p className="text-xs text-muted-foreground text-center py-2">
                Brak dodanych urządzeń.
              </p>
            )}
          </div>
        )}

        {/* === Notes === */}
        <div className="mt-8">
          <h4 className="font-semibold mb-2">Uwagi technika</h4>
          <Textarea
            placeholder="Wpisz uwagi dotyczące wykonania zlecenia..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Validation */}
        {touched && (
          <>
            {collectEnabled && collected.length === 0 && (
              <p className="text-danger text-sm text-center mt-3">
                Dodaj przynajmniej jedno odebrane urządzenie lub wyłącz odbiór.
              </p>
            )}
            {canIssue && issueEnabled && issued.length === 0 && (
              <p className="text-danger text-sm text-center mt-3">
                Dodaj przynajmniej jedno wydane urządzenie lub wyłącz wydanie.
              </p>
            )}
          </>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-background flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          Wstecz
        </Button>
        <Button className="flex-1 h-12" onClick={handleNext}>
          Dalej
        </Button>
      </div>
    </div>
  )
}

export default StepCollectedAndNotes
