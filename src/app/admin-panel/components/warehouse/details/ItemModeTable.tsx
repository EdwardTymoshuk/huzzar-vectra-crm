'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import { Button } from '@/app/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { useRole } from '@/utils/hooks/useRole'
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
 * - Includes local search + location filter above the table.
 * - Dynamically shows "Lokalizacja" column for admins and multi-location users.
 */
const ItemModeTable = ({ mode, items }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLocation, setActiveLocation] = useState<'all' | string>('all')
  const [orderId, setOrderId] = useState<string | null>(null)

  const { isAdmin, isCoordinator, isWarehouseman } = useRole()
  const locations = Array.from(
    new Map(
      items
        .filter((i) => i.location)
        .map((i) => [i.location!.id, i.location!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }))

  const showLocationColumn =
    isAdmin || ((isCoordinator || isWarehouseman) && locations.length > 1)

  // Apply filters
  const filtered = useMemo(() => {
    let data = items

    // Filter by location
    if (activeLocation !== 'all') {
      data = data.filter((it) => it.location?.id === activeLocation)
    }

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
  }, [items, activeLocation, searchTerm])

  const pickDate = (it: SlimWarehouseItem): Date | null => {
    if (mode === 'warehouse') {
      return (
        getLastActionDate(it.history, WarehouseAction.RECEIVED) ??
        new Date(it.createdAt)
      )
    }
    if (mode === 'technicians') {
      return getLastActionDate(it.history, WarehouseAction.ISSUED)
    }
    if (mode === 'orders') {
      return (
        getActionDate(it.history, WarehouseAction.ISSUED) ??
        (it.orderAssignments[0]?.order?.createdAt
          ? new Date(it.orderAssignments[0].order.createdAt)
          : null)
      )
    }
    if (mode === 'returned') {
      return (
        getLastActionDate(it.history, WarehouseAction.RETURNED) ??
        getLastActionDate(it.history, WarehouseAction.RETURNED_TO_OPERATOR)
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
      <div className="flex flex-col xs:flex-row justify-between items-center gap-3 mb-3">
        <SearchInput
          placeholder="Szukaj"
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1 w-full"
        />
        {showLocationColumn && (
          <Select
            value={activeLocation}
            onValueChange={(val) =>
              setActiveLocation((val as 'all' | string) ?? 'all')
            }
          >
            <SelectTrigger className="flex-1 w-full xs:max-w-64">
              <SelectValue placeholder="Filtruj po magazynie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie magazyny</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lp</TableHead>
            <TableHead>
              {items[0]?.itemType === 'MATERIAL' ? 'Indeks' : 'Numer seryjny'}
            </TableHead>
            {showLocationColumn && <TableHead>Lokalizacja</TableHead>}
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
