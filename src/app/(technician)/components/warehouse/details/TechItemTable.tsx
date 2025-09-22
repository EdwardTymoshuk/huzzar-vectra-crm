'use client'

/**
 * TechItemTable
 * -------------
 * Technician’s table view for warehouse items.
 * • Mirrors admin ItemModeTable for consistency.
 * • Shows stock assigned to the logged-in technician.
 * • Uses SearchContext for filtering.
 */

import SheetOrderDetails from '@/app/admin-panel/components/billing/SheetOrderDetails'
import { Button } from '@/app/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { useSearch } from '@/app/context/SearchContext'
import {
  SlimWarehouseItem,
  fmt,
  getLastAction,
  getLastActionDate,
} from '@/utils/warehouse'
import { WarehouseAction } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'

type Props = {
  items: SlimWarehouseItem[]
  mode: 'warehouse' | 'orders' | 'transfer'
}

const TechItemTable = ({ items, mode }: Props) => {
  const { searchTerm } = useSearch()
  const [orderId, setOrderId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) =>
      (it.itemType === 'MATERIAL'
        ? it.index ?? it.name
        : it.serialNumber ?? '—'
      )
        .toLowerCase()
        .includes(q)
    )
  }, [items, searchTerm])

  const pickDate = (it: SlimWarehouseItem): Date | null => {
    if (mode === 'warehouse') {
      // last issue to technician
      return getLastActionDate(it.history, WarehouseAction.ISSUED)
    }
    if (mode === 'orders') {
      // date of last issue OR fallback to order creation
      return (
        getLastActionDate(it.history, WarehouseAction.ISSUED) ??
        it.orderAssignments[0]?.order?.createdAt ??
        null
      )
    }
    return null
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lp</TableHead>
            <TableHead>
              {items[0]?.itemType === 'MATERIAL' ? 'Indeks' : 'Numer seryjny'}
            </TableHead>

            {mode === 'warehouse' && (
              <>
                <TableHead>Data wydania</TableHead>
                <TableHead>Wydane przez</TableHead>
              </>
            )}
            {mode === 'orders' && (
              <>
                <TableHead>Data wydania</TableHead>
                <TableHead>Zlecenie</TableHead>
              </>
            )}
            {mode === 'transfer' && (
              <>
                <TableHead>Data przekazania</TableHead>
                <TableHead>Przekazano do</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>

        <TableBody>
          {filtered.map((it, idx) => {
            const identifier =
              it.itemType === 'MATERIAL'
                ? it.index ?? it.name
                : it.serialNumber ?? '—'
            const date = pickDate(it)
            const order = it.orderAssignments[0]?.order

            const lastIssued = getLastAction(it.history, WarehouseAction.ISSUED)
            const lastTransfer = getLastAction(
              it.history,
              WarehouseAction.TRANSFER
            )

            const issuedBy = lastIssued?.performedBy?.name ?? '—'
            const transferredTo = lastTransfer?.assignedTo?.name ?? '—'

            return (
              <TableRow key={it.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape
                    textToHighlight={identifier}
                  />
                </TableCell>

                {mode === 'warehouse' && (
                  <>
                    <TableCell>{fmt(date)}</TableCell>
                    <TableCell>{issuedBy}</TableCell>
                  </>
                )}
                {mode === 'orders' && (
                  <>
                    <TableCell>{fmt(date)}</TableCell>
                    <TableCell>
                      {order ? (
                        <Button
                          variant="link"
                          className="p-0"
                          onClick={() => setOrderId(order.id)}
                        >
                          {order.orderNumber}
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </>
                )}
                {mode === 'transfer' && (
                  <>
                    <TableCell>{fmt(date)}</TableCell>
                    <TableCell>{transferredTo}</TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <SheetOrderDetails orderId={orderId} onClose={() => setOrderId(null)} />
    </>
  )
}

export default TechItemTable
