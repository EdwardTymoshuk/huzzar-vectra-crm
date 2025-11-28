'use client'

/* -------------------------------------------------------------------------
 * ReturnedFromTechniciansSection   (ADMIN PANEL)
 * -------------------------------------------------------------------------
 * • Lists all devices with status = RETURNED   (i.e. collected → warehouse)
 * • Admin can tick several rows and press “Wyślij do operatora”.
 * • A confirmation modal appears:
 *      – shows the selected devices
 *      – optional notes textarea
 *      – final “Wyślij” button
 * ---------------------------------------------------------------------- */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Textarea } from '@/app/components/ui/textarea'
import { trpc } from '@/utils/trpc'
import { differenceInDays, format } from 'date-fns'
import { useState } from 'react'
import { MdAssignmentReturn } from 'react-icons/md'
import { toast } from 'sonner'

const ReturnedFromTechniciansSection = () => {
  /* ───── queries & utils ─────────────────────────────────────────── */
  const { data, isLoading } =
    trpc.warehouse.getReturnedFromTechnicians.useQuery()
  const utils = trpc.useUtils()

  /* ───── local state ─────────────────────────────────────────────── */
  const [selected, setSelected] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  /* ───── mutation ───────────────────────────────────────────────── */
  const returnMutation = trpc.warehouse.returnToOperator.useMutation({
    onSuccess: () => {
      setLoading(false)
      setShowConfirm(false)
      setSelected([])
      setNotes('')
      utils.warehouse.getReturnedFromTechnicians.invalidate()
      toast.success('Sprzęt wysłany do operatora.')
    },
    onError: () => {
      setLoading(false)
      toast.error('Błąd – nie udało się wykonać zwrotu.')
    },
  })

  /* ───── helper functions ───────────────────────────────────────── */
  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const allIds = data?.map((d) => d.id) ?? []
  const allSelected = allIds.length > 0 && selected.length === allIds.length

  const toggleAll = () => setSelected(allSelected ? [] : [...allIds])

  const confirmSend = () => {
    if (selected.length === 0) return
    setLoading(true)
    returnMutation.mutate({
      items: selected.map((id) => ({ type: 'DEVICE' as const, id })),
      notes: notes || undefined,
    })
  }

  /* ───── loading skeleton ───────────────────────────────────────── */
  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg mb-6" />

  const count = data?.length ?? 0
  const noneSelected = selected.length === 0

  return (
    <>
      {/* -------------- MAIN ACCORDION -------------- */}
      <div className="border rounded-lg bg-card shadow-sm">
        <Accordion type="single" collapsible>
          <AccordionItem value="returned">
            <AccordionTrigger className="flex items-center justify-between w-full p-4 gap-2">
              <div className="flex items-center gap-2">
                <MdAssignmentReturn className="h-5 w-5" />
                <span className="font-semibold whitespace-nowrap">
                  Zwroty od&nbsp;klientów
                </span>
              </div>
              <Badge variant={count === 0 ? 'success' : 'warning'}>
                {count}
              </Badge>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-4">
              {/* empty state */}
              {count === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak urządzeń oczekujących na wysyłkę.
                </p>
              ) : (
                <>
                  {/* bulk-action button */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        id="select-all"
                      />
                      <label
                        htmlFor="select-all"
                        className="text-sm cursor-pointer select-none"
                      >
                        {allSelected
                          ? 'Odznacz wszystkie'
                          : 'Zaznacz wszystkie'}
                      </label>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={noneSelected}
                      onClick={() => setShowConfirm(true)}
                    >
                      Wyślij zaznaczone ({selected.length})
                    </Button>
                  </div>

                  {/* list */}
                  <div className="space-y-3">
                    {data!.map((item) => {
                      const collected = item.history.find(
                        (h) => h.action === 'COLLECTED_FROM_CLIENT'
                      )
                      const returned = item.history.find(
                        (h) => h.action === 'RETURNED'
                      )

                      const daysAgo = collected
                        ? differenceInDays(new Date(), collected.actionDate)
                        : 0
                      const badgeVariant: 'success' | 'warning' | 'danger' =
                        daysAgo > 30
                          ? 'danger'
                          : daysAgo > 14
                          ? 'warning'
                          : 'success'

                      const checked = selected.includes(item.id)

                      return (
                        <div
                          key={item.id}
                          className="border rounded-md p-3 grid grid-cols-1 md:grid-cols-[auto_2fr_2fr_1fr_auto] gap-2 md:gap-4"
                        >
                          {/* checkbox */}
                          <Checkbox
                            className="mt-1"
                            checked={checked}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />

                          {/* name + SN */}
                          <div className="flex flex-col">
                            <span className="font-medium break-all">
                              {item.name}
                            </span>
                            {item.serialNumber && (
                              <span className="text-xs text-muted-foreground break-all">
                                SN: {item.serialNumber}
                              </span>
                            )}
                          </div>

                          {/* who + when collected */}
                          <div className="flex flex-col">
                            {collected ? (
                              <>
                                <span className="text-sm break-all">
                                  Odebrał: {collected.performedBy.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(collected.actionDate, 'dd.MM.yyyy')}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>

                          {/* when returned to WH */}
                          <div className="flex flex-col">
                            {returned ? (
                              <>
                                <span className="text-sm break-all">
                                  W magazynie od
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(returned.actionDate, 'dd.MM.yyyy')}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>

                          {/* badge */}
                          <div className="flex md:flex-col items-center gap-2 justify-between">
                            <Badge variant={badgeVariant}>{daysAgo} dni</Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* -------------- CONFIRMATION MODAL -------------- */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-lg space-y-4">
          <DialogHeader>
            <DialogTitle>Czy wysłać urządzenia do operatora?</DialogTitle>
          </DialogHeader>

          {/* list of selected devices */}
          <ul className="list-disc list-inside space-y-1 text-sm max-h-40 overflow-auto pr-2">
            {data
              ?.filter((d) => selected.includes(d.id))
              .map((d) => (
                <li key={d.id}>
                  {d.name}
                  {d.serialNumber ? ` • SN: ${d.serialNumber}` : ''}
                </li>
              ))}
          </ul>

          {/* notes */}
          <Textarea
            placeholder="Uwagi (opcjonalnie)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button onClick={confirmSend} disabled={loading}>
              {loading ? 'Wysyłanie…' : 'Wyślij'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ReturnedFromTechniciansSection
