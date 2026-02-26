'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Switch } from '@/app/components/ui/switch'
import { Textarea } from '@/app/components/ui/textarea'
import { trpc } from '@/utils/trpc'
import { OplOrderStatus } from '@prisma/client'
import { useMemo, useState } from 'react'
import {
  MdDeleteOutline,
  MdKeyboardArrowRight,
  MdMailOutline,
} from 'react-icons/md'
import { toast } from 'sonner'
import OplFailureReasonSelect from '../OplFailureReasonSelect'

interface OplStepStatusProps {
  orderId: string
  orderNumber: string
  orderAddress: string
  status: OplOrderStatus | null
  setStatus: (v: OplOrderStatus) => void
  onNext: (data: {
    status: OplOrderStatus
    failureReason?: string | null
    notes?: string | null
    finishImmediately?: boolean
  }) => void
  failureReason: string
  notes: string
  setFailureReason: (v: string) => void
  setNotes: (v: string) => void
  isTeamOrder: boolean
  isAdminEditMode: boolean
  teamTechnicians: { id: string; name: string }[]
  soloCompletion: boolean
  setSoloCompletion: (v: boolean) => void
  soloTechnicianId: string
  setSoloTechnicianId: (v: string) => void
}

/**
 * OplStepStatus – Step 1 of CompleteOrderWizard
 * ---------------------------------------------------------
 * Provides a clear interface for selecting order status.
 * - If COMPLETED → proceeds to next step.
 * - If NOT_COMPLETED → requires failure reason and notes,
 *   then jumps to notes/summary flow (without forcing work-code steps).
 */
const OplStepStatus = ({
  orderId,
  orderNumber,
  orderAddress,
  status,
  setStatus,
  failureReason,
  setFailureReason,
  notes,
  setNotes,
  isTeamOrder,
  isAdminEditMode,
  teamTechnicians,
  soloCompletion,
  setSoloCompletion,
  soloTechnicianId,
  setSoloTechnicianId,
  onNext,
}: OplStepStatusProps) => {
  const sendFailureEmailMutation = trpc.opl.order.sendFailureEmail.useMutation()
  const createAddressNote = trpc.opl.order.createAddressNote.useMutation()
  const utils = trpc.useUtils()
  const [mailDialogOpen, setMailDialogOpen] = useState(false)
  const [mailSubject, setMailSubject] = useState(
    `${orderNumber} - ${orderAddress}`,
  )
  const [mailExtraNote, setMailExtraNote] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [addressNoteEnabled, setAddressNoteEnabled] = useState(false)
  const [addressNoteText, setAddressNoteText] = useState('')
  const [addressNoteScope, setAddressNoteScope] = useState('')

  const mailBody = useMemo(() => {
    const base = [
      `Numer zlecenia: ${orderNumber}`,
      `Adres: ${orderAddress}`,
      '',
      `Powód niewykonania: ${failureReason.trim() || '-'}`,
      `Uwagi: ${notes.trim() || '-'}`,
    ]

    if (mailExtraNote.trim()) {
      base.push('', `Dodatkowe informacje:`, mailExtraNote.trim())
    }

    return base.join('\n')
  }, [failureReason, mailExtraNote, notes, orderAddress, orderNumber])

  const serializeFiles = (files: File[]) =>
    Promise.all(
      files.map(
        (file) =>
          new Promise<{
            filename: string
            contentType: string
            contentBase64: string
          }>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result
              if (typeof result !== 'string') {
                reject(new Error('FILE_READ_ERROR'))
                return
              }
              const [, base64 = ''] = result.split(',')
              resolve({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                contentBase64: base64,
              })
            }
            reader.onerror = () => reject(new Error('FILE_READ_ERROR'))
            reader.readAsDataURL(file)
          }),
      ),
    )

  const handleOpenFailureEmailDialog = () => {
    if (!failureReason.trim()) {
      toast.error('Wybierz powód niewykonania przed wysłaniem maila.')
      return
    }
    setMailSubject(`${orderNumber} - ${orderAddress}`)
    setMailDialogOpen(true)
  }

  const handleSendFailureEmail = async () => {
    if (!mailSubject.trim()) {
      toast.error('Temat maila nie może być pusty.')
      return
    }

    const maxSingleMb = 8
    const maxTotalMb = 20
    const tooLarge = attachments.find((f) => f.size > maxSingleMb * 1024 * 1024)
    if (tooLarge) {
      toast.error(`Plik ${tooLarge.name} przekracza ${maxSingleMb} MB.`)
      return
    }
    const total = attachments.reduce((sum, f) => sum + f.size, 0)
    if (total > maxTotalMb * 1024 * 1024) {
      toast.error(`Łączny rozmiar załączników przekracza ${maxTotalMb} MB.`)
      return
    }

    try {
      const serializedAttachments = await serializeFiles(attachments)
      await sendFailureEmailMutation.mutateAsync({
        subject: mailSubject.trim(),
        body: mailBody,
        attachments: serializedAttachments,
      })
      toast.success('Email do COK został wysłany.')
      setMailDialogOpen(false)
    } catch {
      toast.error('Nie udało się wysłać emaila do COK.')
    }
  }

  const handleSubmit = async () => {
    if (status === 'NOT_COMPLETED') {
      if (!failureReason.trim()) {
        toast.error('Wybierz powód niewykonania.')
        return
      }

      if (!notes.trim()) {
        toast.error('Pole Uwagi jest obowiązkowe.')
        return
      }

      if (addressNoteEnabled && !addressNoteText.trim()) {
        toast.error('Uzupełnij treść uwagi do adresu albo wyłącz przełącznik.')
        return
      }

      if (addressNoteEnabled && addressNoteText.trim()) {
        try {
          await createAddressNote.mutateAsync({
            orderId,
            note: addressNoteText.trim(),
            buildingScope: addressNoteScope.trim(),
          })
          await utils.opl.order.getAddressNotesForOrder.invalidate({ orderId })
        } catch {
          toast.error('Nie udało się zapisać uwagi do adresu.')
          return
        }
      }

      onNext({
        status,
        failureReason,
        notes,
        finishImmediately: true,
      })
      return
    }

    if (status === 'COMPLETED') {
      onNext({
        status,
        notes: notes || null,
        finishImmediately: false,
      })
    }
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* ============ Main content area ============ */}
      <div className="flex-1 px-4">
        <h3 className="text-lg font-semibold text-center mb-6">
          Wybierz status zlecenia
        </h3>

        {/* Status selection buttons */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          <Button
            variant={status === 'COMPLETED' ? 'success' : 'outline'}
            onClick={() => setStatus('COMPLETED')}
            className="h-12 text-base font-medium"
          >
            Wykonane
          </Button>

          <Button
            variant={status === 'NOT_COMPLETED' ? 'danger' : 'outline'}
            onClick={() => setStatus('NOT_COMPLETED')}
            className="h-12 text-base font-medium"
          >
            Niewykonane
          </Button>
        </div>

        {isTeamOrder &&
          (status === 'COMPLETED' || status === 'NOT_COMPLETED') && (
          <div className="mt-4 max-w-md mx-auto rounded-md border border-border/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">
                {isAdminEditMode ? 'Rozlicz solo' : 'Rozlicz solo przeze mnie'}
              </div>
              <Switch
                checked={soloCompletion}
                onCheckedChange={(next) => {
                  setSoloCompletion(next)
                  if (!next) {
                    setSoloTechnicianId('')
                    return
                  }
                  if (isAdminEditMode && !soloTechnicianId) {
                    setSoloTechnicianId(teamTechnicians[0]?.id ?? '')
                  }
                }}
              />
            </div>
            {isAdminEditMode && soloCompletion && (
              <div className="mt-3">
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  Technik rozliczany solo
                </Label>
                <Select
                  value={soloTechnicianId}
                  onValueChange={setSoloTechnicianId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz technika" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamTechnicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Additional fields visible only when NOT_COMPLETED */}
        {status === 'NOT_COMPLETED' && (
          <div className="mt-6 space-y-4 max-w-md mx-auto">
            <OplFailureReasonSelect
              value={failureReason}
              onChange={setFailureReason}
            />

            <div>
              <h3 className="mb-1">
                Uwagi: <span className="text-danger">*</span>
              </h3>
              <Textarea
                placeholder="Dodaj uwagi do zlecenia"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleOpenFailureEmailDialog}
              disabled={sendFailureEmailMutation.isPending}
            >
              <MdMailOutline className="mr-1 h-4 w-4" />
              Wyślij email do COK
            </Button>

            <div className="rounded-md border border-border/70 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-medium">Uwaga do adresu</h4>
                  <p className="text-xs text-muted-foreground">
                    Będzie widoczna w kolejnych zleceniach pod tym adresem.
                  </p>
                </div>
                <Switch
                  checked={addressNoteEnabled}
                  onCheckedChange={setAddressNoteEnabled}
                />
              </div>

              {addressNoteEnabled && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="opl-status-address-note-text">
                      Treść uwagi
                    </Label>
                    <Textarea
                      id="opl-status-address-note-text"
                      value={addressNoteText}
                      onChange={(e) => setAddressNoteText(e.target.value)}
                      placeholder="Np. Kontakt do administracji: 600 000 000"
                      className="min-h-[90px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="opl-status-address-note-scope">
                      Zakres budynków (opcjonalnie)
                    </Label>
                    <Input
                      id="opl-status-address-note-scope"
                      value={addressNoteScope}
                      onChange={(e) => setAddressNoteScope(e.target.value)}
                      placeholder="Np. 1,2,3,10-12 (puste = bieżący numer)"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ============ Bottom navigation ============ */}
      <div className="sticky bottom-0 bg-background p-4">
        <Button
          onClick={() => {
            void handleSubmit()
          }}
          className="w-full h-11 text-base gap-1"
          disabled={!status || createAddressNote.isPending}
        >
          {createAddressNote.isPending ? 'Zapisywanie...' : 'Dalej'}
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={mailDialogOpen} onOpenChange={setMailDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Email do COK</DialogTitle>
            <DialogDescription>
              Możesz dodać zdjęcia i dopisać dodatkowe informacje.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="opl-mail-subject">Temat</Label>
              <Input
                id="opl-mail-subject"
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opl-mail-extra">
                Dodatkowa treść (opcjonalnie)
              </Label>
              <Textarea
                id="opl-mail-extra"
                value={mailExtraNote}
                onChange={(e) => setMailExtraNote(e.target.value)}
                placeholder="Dopisz dodatkowe informacje do wiadomości"
                className="min-h-[90px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opl-mail-files">Zdjęcia (opcjonalnie)</Label>
              <Input
                id="opl-mail-files"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const next = Array.from(e.target.files ?? [])
                  if (!next.length) return
                  setAttachments((prev) => [...prev, ...next].slice(0, 8))
                  e.currentTarget.value = ''
                }}
              />
              {attachments.length > 0 && (
                <ul className="space-y-2 rounded-md border p-2 text-sm">
                  {attachments.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setAttachments((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        aria-label="Usuń załącznik"
                      >
                        <MdDeleteOutline className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Treść wiadomości</Label>
              <Textarea value={mailBody} readOnly className="min-h-[170px]" />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMailDialogOpen(false)}
              disabled={sendFailureEmailMutation.isPending}
            >
              Anuluj
            </Button>
            <Button
              type="button"
              onClick={handleSendFailureEmail}
              disabled={sendFailureEmailMutation.isPending}
            >
              {sendFailureEmailMutation.isPending ? 'Wysyłanie...' : 'Wyślij'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OplStepStatus
