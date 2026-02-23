'use client'

import {
  oplDevicesTypeMap,
  oplWarehouseActionMap,
} from '@/app/(modules)/opl-crm/lib/constants'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { materialUnitMap } from '@/lib/constants'
import { OplWarehouseHistoryWithRelations } from '@/types/opl-crm'

import { format } from 'date-fns'

type Props = {
  entries: OplWarehouseHistoryWithRelations[]
}

/**
 * OplHistoryTable – grouped warehouse history display with source/target and user.
 * ----------------------------------------------------------------------------
 * • Displays both technician operations and inter-location transfers.
 * • Each row group (Accordion) represents one logical operation.
 */
const OplHistoryTable = ({ entries }: Props) => {
  if (!entries.length) {
    return (
      <p className="pt-8 text-sm text-muted-foreground text-center">
        Brak historii do wyświetlenia.
      </p>
    )
  }

  // Group records by “operation” (≈5s window, performer, action, notes)
  const groups = entries.reduce<
    Record<string, OplWarehouseHistoryWithRelations[]>
  >((acc, entry) => {
    const roundedTime = new Date(
      Math.floor(new Date(entry.actionDate).getTime() / 5000) * 5000
    ).toISOString()
    const key = `${roundedTime}__${entry.performedBy.user.id}__${
      entry.action
    }__${entry.notes || ''}`
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  const GRID =
    'grid grid-cols-[120px_130px_170px_170px_minmax(180px,1fr)_90px_minmax(280px,1.8fr)_20px]'

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1310px] w-full">
        {/* Table header row */}
        <div
          className={`${GRID} w-full items-center gap-2 px-4 py-2 text-sm border-b font-medium text-muted-foreground whitespace-nowrap`}
        >
          <span>Data</span>
          <span>Typ</span>
          <span>Od</span>
          <span>Do</span>
          <span>Użytkownik</span>
          <span>Pozycje</span>
          <span>Uwagi</span>
          <span />
        </div>

        <Accordion type="multiple">
          {Object.entries(groups).map(([groupKey, group], index) => {
            const first = group[0]
            const { label, variant } = oplWarehouseActionMap[first.action]
            const actionDate = new Date(first.actionDate)

            /** Determine source ("Od") and destination ("Do") based on action type */
            const getFromTo = () => {
              const fromLoc = first.fromLocation?.name ?? '—'
              const toLoc = first.toLocation?.name ?? '—'
              const itemLoc = first.warehouseItem.location?.name ?? '—'

              switch (first.action) {
                case 'TRANSFER':
                  return { from: fromLoc, to: toLoc }
                case 'ISSUED':
                  return {
                    from: itemLoc,
                    to: first.assignedTo?.user.name ?? '—',
                  }
                case 'RETURNED':
                  return {
                    from: first.assignedTo?.user.name ?? '—',
                    to: first.toLocation?.name ?? itemLoc,
                  }
                case 'RETURNED_TO_OPERATOR':
                  return { from: itemLoc, to: 'Operator' }
                case 'COLLECTED_FROM_CLIENT':
                  return { from: 'Klient', to: itemLoc }
                case 'RECEIVED':
                  return { from: 'Dystrybutor', to: 'Magazyn' }
                default:
                  return { from: '—', to: '—' }
              }
            }

            const { from, to } = getFromTo()

            return (
              <AccordionItem key={groupKey} value={`item-${index}`}>
                <AccordionTrigger className="py-4 px-2 hover:bg-muted text-left">
                  <div
                    className={`${GRID} w-full items-center gap-2 py-2 text-sm text-muted-foreground whitespace-nowrap`}
                  >
                    {/* Date + time */}
                    <div>
                      <div>{format(actionDate, 'dd.MM.yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(actionDate, 'HH:mm')}
                      </div>
                    </div>

                    <Badge variant={variant} className="w-fit">
                      {label}
                    </Badge>

                    <span className="block min-w-0 truncate" title={from}>
                      {from}
                    </span>
                    <span className="block min-w-0 truncate" title={to}>
                      {to}
                    </span>

                    <span
                      className="block min-w-0 truncate"
                      title={first.performedBy?.user.name ?? '—'}
                    >
                      {first.performedBy?.user.name ?? '—'}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      {group.length}
                    </span>

                    <span
                      className="block min-w-0 truncate text-xs text-muted-foreground"
                      title={first.notes ?? '—'}
                    >
                      {first.notes ? first.notes.slice(0, 60) : '—'}
                    </span>

                    <span />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="bg-muted/50 px-4 py-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nazwa</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead>SN / Index</TableHead>
                        <TableHead>Ilość</TableHead>
                        <TableHead>Jm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.map((entry) => {
                        const item = entry.warehouseItem
                        const isDevice = item.itemType === 'DEVICE'

                        return (
                          <TableRow
                            key={entry.id}
                            className="text-sm whitespace-nowrap"
                          >
                            <TableCell>{item.name}</TableCell>
                            <TableCell>
                              {isDevice
                                ? oplDevicesTypeMap[item.category ?? 'OTHER']
                                : 'MATERIAŁ'}
                            </TableCell>
                            <TableCell>
                              {isDevice
                                ? item.serialNumber ?? '—'
                                : item.index ?? '—'}
                            </TableCell>
                            <TableCell>
                              {isDevice ? 1 : entry.quantity}
                            </TableCell>
                            <TableCell>
                              {isDevice
                                ? 'szt'
                                : materialUnitMap[item.unit] ?? '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>

                  {first.notes && (
                    <div className="py-2">
                      <span className="font-bold">Uwagi: </span>
                      <span className="text-muted-foreground">
                        {first.notes}
                      </span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>
    </div>
  )
}

export default OplHistoryTable
