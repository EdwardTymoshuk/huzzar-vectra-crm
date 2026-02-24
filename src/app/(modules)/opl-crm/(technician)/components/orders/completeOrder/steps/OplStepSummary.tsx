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
import { formatMeasurementsLine } from '@/app/(modules)/opl-crm/utils/order/notesFormatting'
import { OplMaterialUnit, OplOrderType } from '@prisma/client'
import { MdContentCopy, MdKeyboardArrowLeft } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  orderType: OplOrderType
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
  orderType,
  materialDefs,
  onBack,
  onFinish,
  isSubmitting = false,
}: Props) => {
  const { state } = useCompleteOplOrder()
  const measurementLine = formatMeasurementsLine({
    opp: state.measurementOpp,
    go: state.measurementGo,
  })
  const orderedWorkCodes = buildOrderedWorkCodes(state.workCodes, state.digInput)
  const nonPkiCodes = orderedWorkCodes.filter((c) => !c.code.startsWith('PKI'))
  const pkuCodes =
    orderType === 'SERVICE'
      ? nonPkiCodes.filter((c) => c.code.toUpperCase().startsWith('PKU'))
      : []
  const serviceMainCodes =
    orderType === 'SERVICE'
      ? nonPkiCodes.filter((c) => !c.code.toUpperCase().startsWith('PKU'))
      : nonPkiCodes
  const pkiCodes =
    orderType === 'INSTALLATION'
      ? orderedWorkCodes.filter((c) => c.code.startsWith('PKI'))
      : []

  const materialNameById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.name ?? 'Nieznany materiał'

  const materialUnitById = (id: string) =>
    materialDefs.find((m) => m.id === id)?.unit ?? 'PIECE'

  const showCollected = state.equipment.collected.items.length > 0

  const handleCopySummary = async () => {
    const codesLine = serviceMainCodes.length
      ? `KODY PRACY: ${serviceMainCodes
          .map((code) => `# ${toWorkCodeLabel(code.code)}`)
          .join(' ')}`
      : 'KODY PRACY:'

    const pkiLines = pkiCodes.length
      ? pkiCodes
          .map((code) => {
            const pkiDef = ALL_PKI_DEFS.find((p) => p.code === code.code)
            const label = pkiDef?.label ?? code.code
            return `# ${label}`
          })
          .join('\n')
      : ''

    const materialLines = state.usedMaterials.length
      ? state.usedMaterials
          .map((m) => {
            const name = materialNameById(m.id)
            return `# ${name} - ${m.quantity} ${unitLabel[materialUnitById(m.id)]}`
          })
          .join('\n')
      : ''

    const chunks = [
      measurementLine ? measurementLine : 'POMIAR:',
      codesLine,
      ...(orderType === 'SERVICE'
        ? [
            `PKU:${
              pkuCodes.length
                ? ` ${pkuCodes
                    .map((code) => `# ${toWorkCodeLabel(code.code)} x ${code.quantity}`)
                    .join(' ')}`
                : ''
            }`.trim(),
          ]
        : []),
      ...(orderType === 'INSTALLATION'
        ? [`PKI:${pkiLines ? ` ${pkiLines}` : ''}`.trim()]
        : []),
      `MATERIAŁ:${materialLines ? ` ${materialLines}` : ''}`.trim(),
      `UWAGI: ${state.notes || '-'}`,
    ]

    try {
      await navigator.clipboard.writeText(chunks.join('\n'))
      toast.success('Skopiowano podsumowanie do schowka.')
    } catch {
      toast.error('Nie udało się skopiować podsumowania.')
    }
  }

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
            {state.soloCompletion && (
              <p>
                <span className="font-semibold">Tryb realizacji:</span> Solo
              </p>
            )}
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
          <CardContent className="p-4">
            <p className="font-semibold">Pomiary</p>
            <p className="mt-1 text-sm">
              {measurementLine
                ? measurementLine.replace(/^POMIAR:\s*/i, '')
                : 'Brak pomiaru'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="font-semibold">Kody pracy</p>
            {serviceMainCodes.length ? (
              <div className="flex flex-wrap gap-2">
                {serviceMainCodes.map((code) => (
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

        {orderType === 'SERVICE' && pkuCodes.length > 0 && (
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-semibold">PKU</p>
              <ul className="list-none space-y-1">
                {pkuCodes.map((code) => (
                  <li key={code.code}>
                    {toWorkCodeLabel(code.code)} x {code.quantity}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {orderType === 'INSTALLATION' && pkiCodes.length > 0 && (
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

        {state.equipment.issued.items.length > 0 && (
          <Card className="space-y-0">
            <CardContent className="space-y-2 p-4 text-sm">
              <p className="font-semibold">Sprzęt wydany</p>
              <ul className="divide-y divide-border rounded-md border border-border/70 px-3">
                {state.equipment.issued.items.map((item) => (
                  <li key={item.clientId} className="py-2">
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
              <ul className="divide-y divide-border rounded-md border border-border/70 px-3">
                {state.equipment.collected.items.map((item) => (
                  <li key={item.clientId} className="py-2">
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

        {state.addressNoteEnabled && state.addressNoteText && (
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

      <div className="space-y-3 p-4">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleCopySummary}
        >
          <MdContentCopy className="h-4 w-4" />
          Kopiuj do schowka
        </Button>

        <div className="flex gap-3">
        <Button variant="outline" className="flex-1 gap-1" onClick={onBack}>
          <MdKeyboardArrowLeft className="h-5 w-5" />
          Wstecz
        </Button>
        <Button className="flex-1" onClick={onFinish} disabled={isSubmitting}>
          {isSubmitting ? 'Zakończenie...' : 'Zakończ'}
        </Button>
        </div>
      </div>
    </div>
  )
}

export default OplStepSummary
