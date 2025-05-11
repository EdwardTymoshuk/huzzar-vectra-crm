'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { devicesTypeMap, materialUnitMap } from '@/lib/constants'
import { WarehouseWithRelations } from '@/types'
import Highlight from 'react-highlight-words'

type Props = {
  items: WarehouseWithRelations[]
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
            <TableHead>Nazwa</TableHead>
            {itemType === 'DEVICE' && <TableHead>Typ</TableHead>}
            {itemType === 'DEVICE' && <TableHead>SN</TableHead>}
            {itemType === 'MATERIAL' && <TableHead>Ilość</TableHead>}
            {itemType === 'MATERIAL' && <TableHead>Jm</TableHead>}
            <TableHead>Cena j.</TableHead>
            <TableHead>Wartość</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const price = item.price ?? 0
            const quantity = itemType === 'DEVICE' ? 1 : item.quantity
            const total = price * quantity

            return (
              <TableRow key={item.id}>
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
                    {devicesTypeMap[item.category ?? 'OTHER'] ?? '—'}
                  </TableCell>
                )}
                {itemType === 'DEVICE' && (
                  <TableCell>{item.serialNumber ?? '—'}</TableCell>
                )}
                {itemType === 'MATERIAL' && (
                  <TableCell>{item.quantity}</TableCell>
                )}
                {itemType === 'MATERIAL' && (
                  <TableCell>{materialUnitMap[item.unit] ?? '—'}</TableCell>
                )}
                <TableCell>{price.toFixed(2)} zł</TableCell>
                <TableCell>{total.toFixed(2)} zł</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default TechnicianStockTable
