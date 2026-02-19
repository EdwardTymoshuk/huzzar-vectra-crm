'use client'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { formatMeasurementsLine } from '@/app/(modules)/opl-crm/utils/order/notesFormatting'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
import { useEffect, useRef, useState } from 'react'
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  orderId: string
  orderType: OplOrderType
  onBack: () => void
  onNext: () => void
}

const OplStepNotes = ({ orderId, orderType, onBack, onNext }: Props) => {
  const {
    state,
    setNotes,
    setMeasurementOpp,
    setMeasurementGo,
    setAddressNoteEnabled,
    setAddressNoteText,
    setAddressNoteScope,
  } = useCompleteOplOrder()
  const utils = trpc.useUtils()
  const createAddressNote = trpc.opl.order.createAddressNote.useMutation()
  const [orderNoteDraft, setOrderNoteDraft] = useState(state.notes)
  const [addressNoteDraft, setAddressNoteDraft] = useState(
    state.addressNoteText,
  )
  const [measurementOppDraft, setMeasurementOppDraft] = useState(
    state.measurementOpp,
  )
  const [measurementGoDraft, setMeasurementGoDraft] = useState(
    state.measurementGo,
  )
  const [addressScopeDraft, setAddressScopeDraft] = useState(
    state.addressNoteScope,
  )
  const lastSavedAddressSignatureRef = useRef(
    `${state.addressNoteText.trim()}|${state.addressNoteScope.trim()}`,
  )

  useEffect(() => {
    setOrderNoteDraft(state.notes)
  }, [state.notes])

  useEffect(() => {
    setMeasurementOppDraft(state.measurementOpp)
    setMeasurementGoDraft(state.measurementGo)
  }, [state.measurementGo, state.measurementOpp])

  useEffect(() => {
    setAddressNoteDraft(state.addressNoteText)
    setAddressScopeDraft(state.addressNoteScope)
  }, [state.addressNoteText, state.addressNoteScope])

  const persistMeasurements = () => {
    setMeasurementOpp(measurementOppDraft.trim())
    setMeasurementGo(measurementGoDraft.trim())
  }

  const persistDrafts = () => {
    persistMeasurements()
    setNotes(orderNoteDraft.trim())
    setAddressNoteText(addressNoteDraft.trim())
    setAddressNoteScope(addressScopeDraft.trim())
  }

  const handleNext = async () => {
    persistDrafts()

    const opp = measurementOppDraft.trim()
    const go = measurementGoDraft.trim()
    const measurementPattern = /^-?\d+(?:[.,]\d+)?$/
    const areMeasurementsMissing = !opp || !go
    const areMeasurementsInvalid =
      (!!opp && !measurementPattern.test(opp)) ||
      (!!go && !measurementPattern.test(go))

    if (
      orderType === 'INSTALLATION' &&
      state.status === 'COMPLETED' &&
      areMeasurementsMissing
    ) {
      toast.error('Uzupełnij pomiary OPP i GO.')
      return
    }

    if (
      orderType === 'INSTALLATION' &&
      state.status === 'COMPLETED' &&
      areMeasurementsInvalid
    ) {
      toast.error('Podaj poprawne wartości pomiarów (np. 12,3).')
      return
    }

    if (state.addressNoteEnabled && addressNoteDraft.trim()) {
      const signature = `${addressNoteDraft.trim()}|${addressScopeDraft.trim()}`
      if (signature === lastSavedAddressSignatureRef.current) {
        onNext()
        return
      }

      try {
        await createAddressNote.mutateAsync({
          orderId,
          note: addressNoteDraft.trim(),
          buildingScope: addressScopeDraft.trim() || undefined,
        })
        lastSavedAddressSignatureRef.current = signature
        await utils.opl.order.getAddressNotesForOrder.invalidate({ orderId })
      } catch {
        toast.error('Nie udało się zapisać uwagi do adresu.')
        return
      }
    }

    onNext()
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-4 p-4">
        <Card className="space-y-3 p-4">
          <h3 className="text-base font-semibold">Pomiary</h3>
          <p className="text-xs text-muted-foreground">
            Podaj wartości dla OPP i GO.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opl-measurement-opp">OPP (dB)</Label>
              <Input
                id="opl-measurement-opp"
                value={measurementOppDraft}
                onChange={(e) => {
                  const value = e.target.value
                  setMeasurementOppDraft(value)
                  setMeasurementOpp(value.trim())
                }}
                placeholder="np. 12,3"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opl-measurement-go">GO (dB)</Label>
              <Input
                id="opl-measurement-go"
                value={measurementGoDraft}
                onChange={(e) => {
                  const value = e.target.value
                  setMeasurementGoDraft(value)
                  setMeasurementGo(value.trim())
                }}
                placeholder="np. 12,7"
              />
            </div>
          </div>
          {formatMeasurementsLine({
            opp: measurementOppDraft,
            go: measurementGoDraft,
          }) && (
            <p className="text-xs text-muted-foreground">
              {formatMeasurementsLine({
                opp: measurementOppDraft,
                go: measurementGoDraft,
              })}
            </p>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-base font-semibold">Uwagi do zlecenia</h3>
          <p className="text-xs text-muted-foreground">
            Pole opcjonalne. Widoczne przy tym zleceniu.
          </p>
          <Textarea
            value={orderNoteDraft}
            onChange={(e) => {
              const value = e.target.value
              setOrderNoteDraft(value)
              setNotes(value.trim())
            }}
            placeholder="Dodaj uwagę do tego zlecenia (opcjonalnie)"
            className="min-h-24"
          />
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Uwaga do adresu</h3>
              <p className="text-xs text-muted-foreground">
                Będzie widoczna w kolejnych zleceniach pod tym adresem.
              </p>
            </div>
            <Switch
              checked={state.addressNoteEnabled}
              onCheckedChange={setAddressNoteEnabled}
            />
          </div>

          {state.addressNoteEnabled && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="opl-address-note-text">Treść uwagi</Label>
                <Textarea
                  id="opl-address-note-text"
                  value={addressNoteDraft}
                  onChange={(e) => {
                    setAddressNoteDraft(e.target.value)
                  }}
                  placeholder="Np. Kontakt do administracji: 600 000 000"
                  className="min-h-24"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="opl-address-note-scope">
                  Zakres budynków (opcjonalnie)
                </Label>
                <Input
                  id="opl-address-note-scope"
                  value={addressScopeDraft}
                  onChange={(e) => {
                    setAddressScopeDraft(e.target.value)
                  }}
                  placeholder="Np. 1,2,3,10-12 (puste = bieżący numer)"
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button
          className="flex-1 gap-1"
          onClick={handleNext}
          disabled={createAddressNote.isPending}
        >
          {createAddressNote.isPending ? 'Zapisywanie...' : 'Dalej'}
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

export default OplStepNotes
