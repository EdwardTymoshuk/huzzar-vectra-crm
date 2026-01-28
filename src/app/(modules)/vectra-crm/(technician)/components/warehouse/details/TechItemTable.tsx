'use client'

import OrderDetailsSheet from '@/app/(modules)/vectra-crm/components/orders/OrderDetailsSheet'
import {
  SlimWarehouseItem,
  fmt,
  getLastAction,
  getLastActionDate,
} from '@/app/(modules)/vectra-crm/utils/warehouse/warehouse'
import SearchInput from '@/app/components/SearchInput'
import { Button } from '@/app/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { VectraWarehouseAction } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'

type Props = {
  items: SlimWarehouseItem[]
  mode: 'warehouse' | 'orders' | 'transfer'
}

/**
 * TechItemTable
 * -------------
 * Technician’s table view for warehouse items.
 * • Includes search input above the table (local state).
 * • Mirrors admin ItemModeTable for consistency.
 */
const TechItemTable = ({ items, mode }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  // Filter by search
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

  // Resolve the most relevant date depending on mode
  const pickDate = (it: SlimWarehouseItem): Date | null => {
    if (mode === 'warehouse') {
      return getLastActionDate(it.history, VectraWarehouseAction.ISSUED)
    }
    if (mode === 'orders') {
      return (
        getLastActionDate(it.history, VectraWarehouseAction.ISSUED) ??
        it.orderAssignments[0]?.order?.createdAt ??
        null
      )
    }
    if (mode === 'transfer') {
      return getLastActionDate(it.history, VectraWarehouseAction.TRANSFER)
    }
    return null
  }

  if (items.length === 0) {
    return (
      <div className="text-sm text-center text-muted-foreground py-6">
        Brak pozycji do wyświetlenia
      </div>
    )
  }

  return (
    <>
      {/* Controls above table */}
      <div className="flex flex-col xs:flex-row justify-between items-center gap-3 mb-3">
        <SearchInput
          placeholder="Szukaj"
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1 w-full"
        />
      </div>

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

            const lastIssued = getLastAction(
              it.history,
              VectraWarehouseAction.ISSUED
            )
            const lastTransfer = getLastAction(
              it.history,
              VectraWarehouseAction.TRANSFER
            )

            const issuedBy = lastIssued?.performedBy?.name ?? '—'
            const transferredTo = lastTransfer?.assignedTo?.name ?? '—'

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

      <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      />
    </>
  )
}

export default TechItemTable
