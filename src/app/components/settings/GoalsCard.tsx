// src/app/(technician)/components/settings/GoalsCard.tsx
'use client'

import { Button } from '@/app/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'
import { useEffect, useState } from 'react'
import { MdEdit } from 'react-icons/md'
import CustomInputGroup from '../fields/CustomInputGroup'
import ReadonlyRow from '../fields/ReadonlyRow'

type Props = {
  initialDays?: number
  initialRevenue?: number
  onSave: (days: number, revenue: number) => Promise<unknown>
}

const GoalsCard = ({ initialDays, initialRevenue, onSave }: Props) => {
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [days, setDays] = useState<number | undefined>(initialDays)
  const [rev, setRev] = useState<number | undefined>(initialRevenue)

  const handleSave = async () => {
    if (!days || !rev) return
    setSaving(true)
    try {
      await onSave(days, rev)
      setEdit(false)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!edit) {
      setDays(initialDays)
      setRev(initialRevenue)
    }
  }, [initialDays, initialRevenue, edit])

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl md:text-2xl text-primary">
          Cele na miesiąc
        </CardTitle>
      </CardHeader>

      {/* view mode */}
      {!edit && (
        <CardContent className="space-y-3">
          <ReadonlyRow
            label="Dni robocze"
            value={initialDays?.toString() ?? 'Brak'}
          />
          <ReadonlyRow
            label="Cel przychodu (zł)"
            value={
              initialRevenue
                ? initialRevenue.toLocaleString('pl-PL', {
                    maximumFractionDigits: 0,
                  })
                : 'Brak'
            }
          />
          <div className="flex w-full justify-stretch sm:justify-end pt-1">
            {!edit && (
              <Button
                size="sm"
                variant="default"
                className="w-full sm:w-auto gap-1.5"
                onClick={() => {
                  setDays(initialDays)
                  setRev(initialRevenue)
                  setEdit(true)
                }}
              >
                <MdEdit /> Zmień dane
              </Button>
            )}
          </div>
        </CardContent>
      )}

      {/* edit mode */}
      {edit && (
        <CardContent className="space-y-4">
          <CustomInputGroup
            id="days"
            label="Dni robocze"
            type="number"
            min={1}
            value={days ?? ''}
            onChange={(e) => setDays(Number(e.target.value))}
            disabled={saving}
          />
          <CustomInputGroup
            id="rev"
            label="Cel przychodu (zł)"
            type="number"
            min={0}
            value={rev ?? ''}
            onChange={(e) => setRev(Number(e.target.value))}
            disabled={saving}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEdit(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default GoalsCard
