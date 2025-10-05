'use client'

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
import {
  devicesTypeMap,
  materialUnitMap,
  warehouseActionMap,
} from '@/lib/constants'
import { WarehouseHistoryWithRelations } from '@/types'
import { format } from 'date-fns'

type Props = {
  entries: WarehouseHistoryWithRelations[]
}

/**
 * HistoryTable – grouped warehouse history display with source/target and user.
 * ----------------------------------------------------------------------------
 * • Displays both technician operations and inter-location transfers.
 * • Each row group (Accordion) represents one logical operation.
 */
const HistoryTable = ({ entries }: Props) => {
  if (!entries.length) {
    return (
      <p className="pt-8 text-sm text-muted-foreground text-center">
        Brak historii do wyświetlenia.
      </p>
    )
  }

  // Group records by “operation” (≈5s window, performer, action, notes)
  const groups = entries.reduce<
    Record<string, WarehouseHistoryWithRelations[]>
  >((acc, entry) => {
    const roundedTime = new Date(
      Math.floor(new Date(entry.actionDate).getTime() / 5000) * 5000
    ).toISOString()
    const key = `${roundedTime}__${entry.performedById}__${entry.action}__${
      entry.notes || ''
    }`
    if (!acc[key]) acc[key] = []
    acc[key].push(entry)
    return acc
  }, {})

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[1100px]">
        {/* Table header row */}
        <div className="grid grid-cols-8 gap-2 px-4 py-2 text-sm border-b font-medium text-muted-foreground whitespace-nowrap">
          <span>Data</span>
          <span>Typ</span>
          <span>Od</span>
          <span>Do</span>
          <span>Użytkownik</span>
          <span className="text-center">Pozycje</span>
          <span className="text-right">Uwagi</span>
          <span />
        </div>

        <Accordion type="multiple">
          {Object.entries(groups).map(([groupKey, group], index) => {
            const first = group[0]
            const { label, variant } = warehouseActionMap[first.action]
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
                  return { from: itemLoc, to: first.assignedTo?.name ?? '—' }
                case 'RETURNED':
                  return { from: first.assignedTo?.name ?? '—', to: itemLoc }
                case 'RETURNED_TO_OPERATOR':
                  return { from: itemLoc, to: 'Operator' }
                case 'COLLECTED_FROM_CLIENT':
                  return { from: 'Klient', to: itemLoc }
                case 'RECEIVED':
                  return { from: '—', to: first.toLocation?.name ?? '—' }
                default:
                  return { from: '—', to: '—' }
              }
            }

            const { from, to } = getFromTo()

            return (
              <AccordionItem key={groupKey} value={`item-${index}`}>
                <AccordionTrigger className="py-4 px-2 hover:bg-muted text-left">
                  <div className="grid grid-cols-8 gap-2 items-center whitespace-nowrap text-sm w-full">
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

                    <span>{from}</span>
                    <span>{to}</span>

                    <span>{first.performedBy?.name ?? '—'}</span>

                    <span className="text-xs text-muted-foreground text-center">
                      {group.length}
                    </span>

                    <span className="text-xs text-muted-foreground text-right truncate">
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
                                ? devicesTypeMap[item.category ?? 'OTHER']
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

export default HistoryTable
