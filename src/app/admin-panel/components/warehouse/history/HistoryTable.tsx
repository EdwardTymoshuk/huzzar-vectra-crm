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
 * HistoryTable:
 * - Groups warehouse history entries by operation (actionDate + action + performer + notes).
 * - Each group is rendered as an accordion section with metadata and a nested item table.
 */
const HistoryTable = ({ entries }: Props) => {
  if (!entries.length) {
    return (
      <p className="pt-8 text-sm text-muted-foreground text-center">
        Brak historii do wyświetlenia.
      </p>
    )
  }

  // Group entries by operation (datetime ~5s window + user + action + notes)
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
    <div className="overflow-hidden gap-2">
      {/* Static table header for accordion summary */}
      <div className="grid grid-cols-7 gap-2 px-4 py-2 text-sm border-b font-medium text-muted-foreground">
        <span>Data</span>
        <span>Typ</span>
        <span>Od</span>
        <span>Do</span>
        <span className="text-center">Pozycje</span>
        <span className="text-right">Uwagi</span>
        <span> </span>
      </div>

      <Accordion type="multiple">
        {Object.entries(groups).map(([groupKey, group], index) => {
          const first = group[0]

          // Determine recipient field
          const to =
            first.action === 'RETURNED_TO_OPERATOR'
              ? 'Operator'
              : first.action === 'RETURNED'
              ? 'Magazyn'
              : first.action === 'ISSUED'
              ? first.assignedTo?.name ?? 'Nieznany'
              : 'Magazyn'

          const { label, variant } = warehouseActionMap[first.action]
          const actionDate = new Date(first.actionDate)

          return (
            <AccordionItem key={groupKey} value={`item-${index}`}>
              <AccordionTrigger className="py-4 px-2 hover:bg-muted text-left">
                <div className="grid grid-cols-7 items-center gap-2 w-full text-sm">
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
                  <span className="text-xs text-muted-foreground text-right">
                    {first.notes ? first.notes.slice(0, 60) : '—'}
                  </span>
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
                        <TableRow key={entry.id}>
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
                          <TableCell>{isDevice ? 1 : entry.quantity}</TableCell>
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
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

export default HistoryTable
