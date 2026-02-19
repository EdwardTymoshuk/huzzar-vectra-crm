'use client'

import { OPL_SERVICE_WORK_CODES } from '@/app/(modules)/opl-crm/lib/constants'
import { SelectedCodesSummary } from '@/app/(modules)/opl-crm/(technician)/components/orders/completeOrder/SelectedCodesSummary'
import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { useMemo, useState } from 'react'
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdRestartAlt,
} from 'react-icons/md'

type Props = {
  onBack: () => void
  onNext: () => void
}

const OplStepServiceCodes = ({ onBack, onNext }: Props) => {
  const { state, setWorkCodes } = useCompleteOplOrder()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const MAIN_CODES = useMemo(
    () =>
      OPL_SERVICE_WORK_CODES.filter(
        (item) => !item.code.toUpperCase().startsWith('PKU')
      ),
    []
  )

  const PKU_CODES = useMemo(
    () =>
      OPL_SERVICE_WORK_CODES.filter((item) =>
        item.code.toUpperCase().startsWith('PKU')
      ),
    []
  )

  const quantityOf = (code: string) =>
    state.workCodes.find((item) => item.code === code)?.quantity ?? 0

  const setQuantity = (code: string, quantity: number) => {
    const next = state.workCodes.filter((item) => item.code !== code)
    if (quantity > 0) {
      next.push({ code, quantity })
    }
    setWorkCodes(next)
  }

  const toggleMainCode = (code: string) => {
    const current = quantityOf(code)
    setQuantity(code, current > 0 ? 0 : 1)
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-4 p-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Kody pracy</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Wybierz wykonane czynności serwisowe.
          </p>

          <div className="space-y-2">
            {MAIN_CODES.map((item) => {
              const selected = quantityOf(item.code) > 0

              return (
                <div
                  key={item.code}
                  className={`rounded-md border p-3 transition-colors ${
                    selected
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={selected ? 'secondary' : 'default'}
                      onClick={() => toggleMainCode(item.code)}
                    >
                      {selected ? 'Usuń' : 'Dodaj'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2">PKU</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Dodaj pozycje ilościowe PKU (analogicznie jak PKI w instalacji).
          </p>
          <div className="space-y-2">
            {PKU_CODES.map((item) => {
              const qty = quantityOf(item.code)

              return (
                <div key={item.code} className="rounded-md border p-3 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>

                    {qty === 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setQuantity(item.code, 1)}
                      >
                        Dodaj
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setQuantity(item.code, qty - 1)}
                        >
                          -
                        </Button>
                        <span className="min-w-8 text-center text-sm font-semibold">
                          {qty}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setQuantity(item.code, qty + 1)}
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Wybrane kody</h3>
          <SelectedCodesSummary value={state.workCodes} />
        </Card>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setResetDialogOpen(true)}
          disabled={state.workCodes.length === 0}
          className="w-full gap-2"
        >
          <MdRestartAlt className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button
          className="flex-1 gap-1"
          onClick={onNext}
          disabled={state.workCodes.length === 0}
        >
          Dalej
          <MdKeyboardArrowRight className="h-5 w-5" />
        </Button>
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zresetować wybrane kody?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz zresetować formularz? Wybrane kody zostaną
              usunięte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWorkCodes([])
                setResetDialogOpen(false)
              }}
            >
              Tak, resetuj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OplStepServiceCodes
