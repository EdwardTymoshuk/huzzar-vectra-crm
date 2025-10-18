'use client'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
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
import { DeviceCategory } from '@prisma/client'
import { useState } from 'react'
import { toast } from 'sonner'

type CollectedDevice = {
  id: string
  name: string
  category: DeviceCategory
  serialNumber: string
}

interface Props {
  collected: CollectedDevice[]
  setCollected: (v: CollectedDevice[]) => void
  notes: string
  setNotes: (v: string) => void
  onBack: () => void
  onNext: (data: { collected: CollectedDevice[]; notes: string }) => void
}

/**
 * StepCollectedAndNotes
 * - Handles collected devices and technician notes.
 * - Validates input before proceeding.
 * - Displays devices as individual cards.
 */
const StepCollectedAndNotes = ({
  collected,
  setCollected,
  notes,
  setNotes,
  onBack,
  onNext,
}: Props) => {
  const [collectEnabled, setCollectEnabled] = useState(false)
  const [category, setCategory] = useState<DeviceCategory>('OTHER')
  const [name, setName] = useState('')
  const [sn, setSn] = useState('')
  const [touched, setTouched] = useState(false)

  /** Adds new collected device */
  const addCollected = () => {
    if (name.trim().length < 2) {
      toast.error('Podaj nazwę urządzenia.')
      return
    }
    if (sn.trim().length < 3) {
      toast.error('Podaj numer seryjny.')
      return
    }
    setCollected([
      ...collected,
      {
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        name: name.trim(),
        category: category,
        serialNumber: sn.trim().toUpperCase(),
      },
    ])
    setName('')
    setSn('')
  }

  /** Removes device from list */
  const removeCollected = (id: string) =>
    setCollected(collected.filter((d) => d.id !== id))

  /** Handles next step validation */
  const handleNext = () => {
    setTouched(true)
    if (collectEnabled && collected.length === 0) {
      toast.error('Dodaj przynajmniej jedno urządzenie lub wyłącz odbiór.')
      return
    }

    onNext({ collected: collectEnabled ? collected : [], notes })
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <h3 className="text-xl font-semibold text-center mt-3 mb-4">
          Dodaj odebrane urządzenia i uwagi
        </h3>

        {/* --- Switch: enable/disable collection --- */}
        <div className="flex items-center gap-3 mb-3">
          <Switch
            id="collect-switch"
            checked={collectEnabled}
            onCheckedChange={(checked) => {
              setCollectEnabled(checked)
              if (!checked) setCollected([])
            }}
          />
          <label htmlFor="collect-switch" className="font-semibold">
            Odbiór urządzeń od klienta
          </label>
        </div>

        {/* --- Collected devices section --- */}
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

            {/* List of collected devices as cards */}
            <h4 className="font-semibold mt-3">Odebrane urządzenia</h4>
            {collected.length > 0 ? (
              <div className="grid gap-3 mt-2">
                {collected.map((d) => (
                  <Card
                    key={d.id}
                    className="border bg-muted/30 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="text-sm">
                        <p className="font-medium">
                          {devicesTypeMap[d.category]} {d.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SN: {d.serialNumber}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeCollected(d.id)}
                        className="self-start w-full sm:self-auto"
                      >
                        Usuń
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Brak dodanych urządzeń.
              </p>
            )}
          </div>
        )}

        {/* --- Notes section --- */}
        <div className="mt-8">
          <h4 className="font-semibold mb-2">Uwagi technika</h4>
          <Textarea
            placeholder="Wpisz uwagi dotyczące wykonania zlecenia..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* --- Validation message --- */}
        {touched && collectEnabled && collected.length === 0 && (
          <p className="text-danger text-sm text-center mt-3">
            Dodaj przynajmniej jedno urządzenie lub wyłącz odbiór.
          </p>
        )}
      </div>

      {/* Bottom nav */}
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
