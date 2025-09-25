'use client'

import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
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
  getActionDate,
  getLastAction,
  getLastActionDate,
} from '@/utils/warehouse'
import { WarehouseAction } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'

type Mode = 'warehouse' | 'technicians' | 'orders' | 'returned'

interface Props {
  mode: Mode
  items: SlimWarehouseItem[]
}

/**
 * ItemModeTable
 * A small, mode-aware table for warehouse items.
 * - Warehouse: received date + receiver
 * - Technicians: issued date + technician
 * - Orders: issued date + order number
 * - Returned: return date + who returned
 */
const ItemModeTable = ({ mode, items }: Props) => {
  const { searchTerm } = useSearch()
  const [orderId, setOrderId] = useState<string | null>(null)

  // Avoid filtering on every keystroke for empty query; keep logic stable.
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

  /**
   * Pick the most relevant date per mode.
   * We default to the *last* action when applicable (e.g., last RECEIVED, last ISSUED).
   */
  const pickDate = (it: SlimWarehouseItem): Date | null => {
    if (mode === 'warehouse') {
      // Prefer the last RECEIVED; if missing (legacy), fall back to createdAt.
      return (
        getLastActionDate(it.history, WarehouseAction.RECEIVED) ??
        new Date(it.createdAt)
      )
    }
    if (mode === 'technicians') {
      // Prefer the last ISSUED; if history is missing for legacy devices,
      // consider using updatedAt (if provided in the type/data) as a last resort.
      return getLastActionDate(it.history, WarehouseAction.ISSUED)
    }
    if (mode === 'orders') {
      // Issued to an order; fall back to order.createdAt when action is missing.
      return (
        getActionDate(it.history, WarehouseAction.ISSUED) ??
        (it.orderAssignments[0]?.order?.createdAt
          ? new Date(it.orderAssignments[0].order.createdAt)
          : null)
      )
    }
    if (mode === 'returned') {
      // The latest return event, either to warehouse or to operator.
      return (
        getLastActionDate(it.history, WarehouseAction.RETURNED) ??
        getLastActionDate(it.history, WarehouseAction.RETURNED_TO_OPERATOR)
      )
    }
    return null
  }

  if (items.length === 0) {
    // Nice UX: show an empty state instead of an empty table.
    return (
      <div className="text-sm text-center text-muted-foreground py-6">
        Brak pozycji do wyświetlenia
      </div>
    )
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
                <TableHead>Data przyjęcia</TableHead>
                <TableHead>Przyjęte przez</TableHead>
              </>
            )}
            {mode === 'technicians' && (
              <>
                <TableHead>Data wydania</TableHead>
                <TableHead>Technik</TableHead>
              </>
            )}
            {mode === 'orders' && (
              <>
                <TableHead>Data wydania</TableHead>
                <TableHead>Nr zlecenia</TableHead>
              </>
            )}
            {mode === 'returned' && (
              <>
                <TableHead>Data zwrotu</TableHead>
                <TableHead>Zwrot przez</TableHead>
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
            const order =
              it.orderAssignments.length > 0
                ? it.orderAssignments[0]?.order
                : undefined

            // Pull the last relevant history entry to show actors.
            const lastReceived = getLastAction(
              it.history,
              WarehouseAction.RECEIVED
            )
            const lastIssued = getLastAction(it.history, WarehouseAction.ISSUED)
            const lastReturned =
              getLastAction(it.history, WarehouseAction.RETURNED) ??
              getLastAction(it.history, WarehouseAction.RETURNED_TO_OPERATOR)

            const receivedBy = lastReceived?.performedBy?.name ?? '—'
            const issuedToTech =
              lastIssued?.assignedTo?.name ?? it.assignedTo?.name ?? '—'
            const returnedBy = lastReturned?.performedBy?.name ?? '—'

            return (
              <TableRow key={it.id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={searchTerm.trim() ? [searchTerm] : []}
                    autoEscape
                    textToHighlight={identifier}
                  />
                </TableCell>

                {mode === 'warehouse' && (
                  <>
                    <TableCell>{fmt(date)}</TableCell>
                    <TableCell>{receivedBy}</TableCell>
                  </>
                )}

                {mode === 'technicians' && (
                  <>
                    <TableCell>{fmt(date)}</TableCell>
                    <TableCell>{issuedToTech}</TableCell>
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

                {mode === 'returned' && (
                  <>
                    <TableCell>{fmt(date)}</TableCell>
                    <TableCell>{returnedBy}</TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Lazy sheet for order details; controlled by local state */}
      <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      />
    </>
  )
}

export default ItemModeTable
