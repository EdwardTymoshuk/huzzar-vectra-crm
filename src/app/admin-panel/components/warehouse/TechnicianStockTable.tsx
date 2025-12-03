'use client'

import { Badge } from '@/app/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { devicesTypeMap, materialUnitMap } from '@/lib/constants'
import { AppRouter } from '@/server/routers'
import { inferRouterOutputs } from '@trpc/server'
import Highlight from 'react-highlight-words'

type TechnicianStockItem =
  inferRouterOutputs<AppRouter>['warehouse']['getTechnicianStock'][number]

type Props = {
  items: TechnicianStockItem[]
  itemType: 'DEVICE' | 'MATERIAL'
  searchTerm: string
}

/**
 * TechnicianStockTable:
 * - Displays technician stock items in table format.
 * - Shows different columns depending on item type.
 */
const TechnicianStockTable = ({ items, itemType, searchTerm }: Props) => {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Brak pozycji.
      </p>
    )
  }

  return (
    <div className="w-full overflow-x-auto rounded-md border pb-4">
      <Table>
        <TableHeader>
          <TableRow>
            {itemType === 'DEVICE' && <TableHead>Typ</TableHead>}
            <TableHead>Nazwa</TableHead>
            {itemType === 'DEVICE' && <TableHead>SN</TableHead>}
            {itemType === 'MATERIAL' && <TableHead>Ilość</TableHead>}
            {itemType === 'MATERIAL' && <TableHead>Jm</TableHead>}
            {itemType === 'DEVICE' && <TableHead>Dni na stanie</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            return (
              <TableRow key={item.id}>
                {itemType === 'DEVICE' && (
                  <TableCell>
                    {devicesTypeMap[item.category ?? 'OTHER'] ?? '—'}
                  </TableCell>
                )}
                <TableCell>
                  <Highlight
                    searchWords={[searchTerm]}
                    textToHighlight={item.name}
                    highlightClassName="bg-yellow-200"
                    autoEscape
                  />
                </TableCell>
                {itemType === 'DEVICE' && (
                  <TableCell>
                    {' '}
                    <Highlight
                      searchWords={[searchTerm]}
                      textToHighlight={item.serialNumber ?? ''}
                      highlightClassName="bg-yellow-200"
                      autoEscape
                    />
                  </TableCell>
                )}
                {itemType === 'MATERIAL' && (
                  <TableCell>{item.quantity}</TableCell>
                )}
                {itemType === 'MATERIAL' && (
                  <TableCell>{materialUnitMap[item.unit] ?? '—'}</TableCell>
                )}
                {itemType === 'DEVICE' && (
                  <TableCell>
                    {(() => {
                      const assignedDate = new Date(item.updatedAt)
                      const daysOnStock = Math.floor(
                        (Date.now() - assignedDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      )

                      let variant:
                        | 'default'
                        | 'success'
                        | 'warning'
                        | 'destructive' = 'default'
                      if (daysOnStock <= 15) variant = 'success'
                      else if (daysOnStock <= 30) variant = 'warning'
                      else variant = 'destructive'

                      return (
                        <div className="w-fit text-center">
                          <Badge variant={variant}>{daysOnStock}</Badge>
                        </div>
                      )
                    })()}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default TechnicianStockTable
