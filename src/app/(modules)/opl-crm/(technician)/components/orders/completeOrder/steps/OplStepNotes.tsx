'use client'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import {
  MdEdit,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
} from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  orderId: string
  onBack: () => void
  onNext: () => void
}

const OplStepNotes = ({ orderId, onBack, onNext }: Props) => {
  const {
    state,
    setNotes,
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
  const [addressScopeDraft, setAddressScopeDraft] = useState(
    state.addressNoteScope,
  )
  const [editingOrderNote, setEditingOrderNote] = useState(
    state.notes.length === 0,
  )
  const [editingAddressNote, setEditingAddressNote] = useState(
    state.addressNoteText.length === 0,
  )

  useEffect(() => {
    setOrderNoteDraft(state.notes)
    setEditingOrderNote(state.notes.length === 0)
  }, [state.notes])

  useEffect(() => {
    setAddressNoteDraft(state.addressNoteText)
    setAddressScopeDraft(state.addressNoteScope)
    setEditingAddressNote(state.addressNoteText.length === 0)
  }, [state.addressNoteText, state.addressNoteScope])

  const handleAddOrderNote = () => {
    setNotes(orderNoteDraft.trim())
    setEditingOrderNote(false)
    toast.success('Dodano uwagę do zlecenia.')
  }

  const handleAddAddressNote = async () => {
    if (!addressNoteDraft.trim()) {
      toast.error('Wpisz treść uwagi do adresu.')
      return
    }

    try {
      const note = addressNoteDraft.trim()
      const scope = addressScopeDraft.trim()

      await createAddressNote.mutateAsync({
        orderId,
        note,
        buildingScope: scope || undefined,
      })

      setAddressNoteText(note)
      setAddressNoteScope(scope)
      setEditingAddressNote(false)
      await utils.opl.order.getAddressNotesForOrder.invalidate({ orderId })
      toast.success('Dodano uwagę do adresu.')
    } catch {
      toast.error('Nie udało się dodać uwagi do adresu.')
    }
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-4 p-4">
        <Card className="space-y-3 p-4">
          <h3 className="text-base font-semibold">Uwagi do zlecenia</h3>
          {editingOrderNote ? (
            <>
              <p className="text-xs text-muted-foreground">
                Pole opcjonalne. Widoczne przy tym zleceniu.
              </p>
              <Textarea
                value={orderNoteDraft}
                onChange={(e) => setOrderNoteDraft(e.target.value)}
                placeholder="Dodaj uwagę do tego zlecenia (opcjonalnie)"
                className="min-h-24"
              />
              <Button
                type="button"
                variant="default"
                onClick={handleAddOrderNote}
              >
                Dodaj
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Uwaga zapisana</p>
              <p className="text-sm whitespace-pre-wrap">{state.notes}</p>
              <Button
                type="button"
                variant="warning"
                onClick={() => setEditingOrderNote(true)}
              >
                <MdEdit /> Zmień
              </Button>
            </div>
          )}
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

          {state.addressNoteEnabled &&
            (editingAddressNote ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="opl-address-note-text">Treść uwagi</Label>
                  <Textarea
                    id="opl-address-note-text"
                    value={addressNoteDraft}
                    onChange={(e) => setAddressNoteDraft(e.target.value)}
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
                    onChange={(e) => setAddressScopeDraft(e.target.value)}
                    placeholder="Np. 1,2,3,10-12 (puste = bieżący numer)"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddAddressNote}
                  disabled={createAddressNote.isPending}
                >
                  Dodaj
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Uwaga adresowa zapisana
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {state.addressNoteText}
                </p>
                {state.addressNoteScope && (
                  <p className="text-xs text-muted-foreground">
                    Zakres: {state.addressNoteScope}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAddressNote(true)}
                >
                  Zmień
                </Button>
              </div>
            ))}
        </Card>
      </div>

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
    </div>
  )
}

export default OplStepNotes
