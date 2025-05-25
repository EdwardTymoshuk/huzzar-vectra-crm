// components/warehouse/history/HistoryTable.tsx
'use client'

/**
 * HistoryTable – accordion list of grouped history entries.
 * ----------------------------------------------------------------------------
 * • Layout: 7-column grid (header + trigger rows) – identical desktop look.
 * • Wrapper `overflow-x-auto` + `min-w-[960px]` ⇒ horizontal scroll on mobile.
 * • Inside the accordion content nadal klasyczna tabela z itemami.
 */

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

const HistoryTable = ({ entries }: Props) => {
  if (!entries.length) {
    return (
      <p className="pt-8 text-sm text-muted-foreground text-center">
        Brak historii do wyświetlenia.
      </p>
    )
  }

  /** Group records by “operation” (±5 s, performer, action, notes). */
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
    /* Horizontal scroll container – mobile swipes, desktop 100 % width */
    <div className="w-full overflow-x-auto">
      {/* fixed min-width so header + rows scroll together */}
      <div className="min-w-[960px]">
        {/* Header row */}
        <div className="grid grid-cols-7 gap-2 px-4 py-2 text-sm border-b font-medium text-muted-foreground whitespace-nowrap">
          <span>Data</span>
          <span>Typ</span>
          <span>Od</span>
          <span>Do</span>
          <span className="text-center">Pozycje</span>
          <span className="text-right">Uwagi</span>
          <span />
        </div>

        <Accordion type="multiple">
          {Object.entries(groups).map(([groupKey, group], index) => {
            const first = group[0]
            const { label, variant } = warehouseActionMap[first.action]
            const actionDate = new Date(first.actionDate)

            /* Who / where the stock went to */
            const to =
              first.action === 'RETURNED_TO_OPERATOR'
                ? 'Operator'
                : first.action === 'RETURNED'
                ? 'Magazyn'
                : first.action === 'ISSUED'
                ? first.assignedTo?.name ?? 'Nieznany'
                : 'Magazyn'

            return (
              <AccordionItem key={groupKey} value={`item-${index}`}>
                {/* Trigger row – 7-column grid, no responsive stacking */}
                <AccordionTrigger className="py-4 px-2 hover:bg-muted text-left">
                  <div className="grid grid-cols-7 gap-2 items-center whitespace-nowrap text-sm w-full">
                    {/* Data + godzina */}
                    <div>
                      <div>{format(actionDate, 'dd.MM.yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(actionDate, 'HH:mm')}
                      </div>
                    </div>

                    <Badge variant={variant} className="w-fit">
                      {label}
                    </Badge>

                    <span>{first.performedBy?.name || '—'}</span>
                    <span>{to}</span>

                    <span className="text-xs text-muted-foreground text-center">
                      {group.length}
                    </span>

                    <span className="text-xs text-muted-foreground text-right truncate">
                      {first.notes ? first.notes.slice(0, 60) : '—'}
                    </span>

                    {/* Ostatnia pusta kolumna –\u00A0miejsce na chevron z Accordion */}
                    <span />
                  </div>
                </AccordionTrigger>

                {/* Content – klasyczna tabela z pozycjami */}
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
