'use client'

import { useCompleteOplOrder } from '@/app/(modules)/opl-crm/utils/context/order/CompleteOplOrderContext'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent } from '@/app/components/ui/card'
import { ALL_PKI_DEFS, oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import {
  buildOrderedWorkCodes,
  shouldShowWorkCodeQuantity,
  toWorkCodeLabel,
} from '@/app/(modules)/opl-crm/utils/order/workCodesPresentation'
import { OplMaterialUnit } from '@prisma/client'
import { MdKeyboardArrowLeft } from 'react-icons/md'

type Props = {
  materialDefs: {
    id: string
    name: string
    unit: OplMaterialUnit
  }[]
  onBack: () => void
  onFinish: () => void
  isSubmitting?: boolean
}

const unitLabel: Record<OplMaterialUnit, string> = {
  PIECE: 'szt',
  METER: 'm',
}

const OplStepSummary = ({
  materialDefs,
  onBack,
  onFinish,
  isSubmitting = false,
}: Props) => {
  const { state } = useCompleteOplOrder()
  const orderedWorkCodes = buildOrderedWorkCodes(state.workCodes, state.digInput)
  const nonPkiCodes = orderedWorkCodes.filter((c) => !c.code.startsWith('PKI'))
  const pkiCodes = orderedWorkCodes.filter((c) => c.code.startsWith('PKI'))

  const materialNameById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.name ?? 'Nieznany materiał'

  const materialUnitById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.unit ?? 'PIECE'

  const showCollected = state.equipment.collected.items.length > 0

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <h2 className="text-xl font-semibold text-center mt-2">
          Podsumowanie zlecenia
        </h2>

        <Card>
          <CardContent className="p-4 space-y-1">
            <p>
              Status:{' '}
              {state.status === 'COMPLETED' ? (
                <span className="text-success">Wykonane</span>
              ) : (
                <span className="text-danger">Niewykonane</span>
              )}
            </p>
            {state.failureReason && (
              <p>
                <span className="font-semibold">Powód niewykonania:</span>{' '}
                {state.failureReason}
              </p>
            )}
            {state.notes && (
              <p className="whitespace-pre-wrap">
                <span className="font-semibold">Uwaga do zlecenia:</span>{' '}
                {state.notes}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="font-semibold">Kody pracy</p>
            {nonPkiCodes.length ? (
              <div className="flex flex-wrap gap-2">
                {nonPkiCodes.map((code) => (
                  <Button
                    key={code.code}
                    variant="secondary"
                    className="cursor-default"
                  >
                    {toWorkCodeLabel(code.code)}
                    {shouldShowWorkCodeQuantity(code.code, code.quantity)
                      ? ` x ${code.quantity}`
                      : ''}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Brak</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-semibold">Zużyte materiały</p>
            {state.usedMaterials.length ? (
              <ul className="list-none space-y-1">
                {state.usedMaterials.map((m) => (
                  <li key={m.id}>
                    {materialNameById(m.id)} x {m.quantity}{' '}
                    {unitLabel[materialUnitById(m.id)]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Brak</p>
            )}
          </CardContent>
        </Card>

        {state.equipment.issued.items.length > 0 && (
          <Card className="space-y-0">
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-semibold">Sprzęt wydany</p>
              <ul className="space-y-2">
                {state.equipment.issued.items.map((item) => (
                  <li key={item.clientId} className="rounded border p-2">
                    <p className="font-medium">{item.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      Typ: {oplDevicesTypeMap[item.category]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SN: {item.serial || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {showCollected && (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-semibold">Sprzęt odebrany od klienta</p>
              <ul className="space-y-2">
                {state.equipment.collected.items.map((item) => (
                  <li key={item.clientId} className="rounded border p-2">
                    <p className="font-medium">{item.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      Typ: {oplDevicesTypeMap[item.category]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SN: {item.serial || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {pkiCodes.length > 0 && (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-semibold">PKI</p>
              <ul className="list-none space-y-1">
                {pkiCodes.map((code) => {
                  const pkiName =
                    ALL_PKI_DEFS.find((p) => p.code === code.code)?.label ??
                    code.code
                  return (
                    <li key={code.code}>
                      {pkiName} x {code.quantity}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {state.addressNoteText && (
          <Card>
            <CardContent className="space-y-1 p-4 text-sm">
              <p className="font-semibold">Uwaga do adresu</p>
              <p className="whitespace-pre-wrap">{state.addressNoteText}</p>
              {state.addressNoteScope && (
                <p className="text-xs text-muted-foreground">
                  Zakres: {state.addressNoteScope}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex gap-3 p-4">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button className="flex-1" onClick={onFinish} disabled={isSubmitting}>
          {isSubmitting ? 'Zakończenie...' : 'Zakończ'}
        </Button>
      </div>
    </div>
  )
}

export default OplStepSummary
