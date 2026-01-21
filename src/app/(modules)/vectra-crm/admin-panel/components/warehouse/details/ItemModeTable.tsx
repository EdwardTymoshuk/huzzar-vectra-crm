'use client'

import OrderDetailsSheet from '@/app/(modules)/vectra-crm/components/orders/OrderDetailsSheet'
import {
  SlimWarehouseItem,
  fmt,
  getActionDate,
  getLastAction,
  getLastActionDate,
} from '@/app/(modules)/vectra-crm/utils/warehouse'
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
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { VectraWarehouseAction } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'

type Mode = 'warehouse' | 'technicians' | 'orders' | 'returned'

interface Props {
  mode: Mode
  items: SlimWarehouseItem[]
}

/**
 * ItemModeTable
 * - Includes local search + location filter above the table.
 * - Dynamically shows "Lokalizacja" column for admins and multi-location users.
 */
const ItemModeTable = ({ mode, items }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  const { isAdmin, isCoordinator, isWarehouseman } = useRole()
  const { data: Locations = [] } = trpc.core.user.getUserLocations.useQuery(
    undefined,
    {
      enabled: isAdmin || isCoordinator || isWarehouseman,
    }
  )

  const locations = Locations.map((loc) => ({
    id: loc.id,
    name: loc.name,
  }))

  const showLocationColumn =
    isAdmin || ((isCoordinator || isWarehouseman) && locations.length > 1)

  // Apply filters
  const filtered = useMemo(() => {
    let data = items

    // Filter by search
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      data = data.filter((it) =>
        (it.itemType === 'MATERIAL'
          ? it.index ?? it.name
          : it.serialNumber ?? '—'
        )
          .toLowerCase()
          .includes(q)
      )
    }

    return data
  }, [items, searchTerm])

  const pickDate = (it: SlimWarehouseItem): Date | null => {
    if (mode === 'warehouse') {
      return (
        getLastActionDate(it.history, VectraWarehouseAction.RECEIVED) ??
        new Date(it.createdAt)
      )
    }
    if (mode === 'technicians') {
      return getLastActionDate(it.history, VectraWarehouseAction.ISSUED)
    }
    if (mode === 'orders') {
      return (
        getActionDate(it.history, VectraWarehouseAction.ISSUED) ??
        (it.orderAssignments[0]?.order?.createdAt
          ? new Date(it.orderAssignments[0].order.createdAt)
          : null)
      )
    }
    if (mode === 'returned') {
      return (
        getLastActionDate(it.history, VectraWarehouseAction.RETURNED) ??
        getLastActionDate(
          it.history,
          VectraWarehouseAction.RETURNED_TO_OPERATOR
        )
      )
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
      <div className="flex flex-col xs:flex-row w-full md:w-1/3 md:justify-self-end justify-between items-center gap-3 mb-3">
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
              {items[0]?.itemType === 'MATERIAL' ? 'Indeks' : 'SN/MAC'}
            </TableHead>
            {showLocationColumn && <TableHead>Magazyn</TableHead>}
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

            const lastReceived = getLastAction(
              it.history,
              VectraWarehouseAction.RECEIVED
            )
            const lastIssued = getLastAction(
              it.history,
              VectraWarehouseAction.ISSUED
            )
            const lastReturned =
              getLastAction(it.history, VectraWarehouseAction.RETURNED) ??
              getLastAction(
                it.history,
                VectraWarehouseAction.RETURNED_TO_OPERATOR
              )

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
                {showLocationColumn && (
                  <TableCell>{it.location?.name ?? '—'}</TableCell>
                )}
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

      <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      />
    </>
  )
}

export default ItemModeTable
