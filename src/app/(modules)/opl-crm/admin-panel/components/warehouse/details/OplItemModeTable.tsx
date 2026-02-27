'use client'

import {
  OplSlimWarehouseItem,
  getOplActionDate,
  getOplLastAction,
  getOplLastActionDate,
} from '@/app/(modules)/opl-crm/utils/warehouse/warehouse'
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
import { formatDateOrDash } from '@/utils/dates/formatDateTime'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplWarehouseAction } from '@prisma/client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'

type Mode = 'warehouse' | 'technicians' | 'orders' | 'returned'

interface Props {
  mode: Mode
  items: OplSlimWarehouseItem[]
}

/**
 * OplItemModeTable
 * - Includes local search + location filter above the table.
 * - Dynamically shows "Lokalizacja" column for admins and multi-location users.
 */
const OplItemModeTable = ({ mode, items }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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

  const openOrderDetails = (orderId: string) => {
    const query = searchParams.toString()
    const from = query ? `${pathname}?${query}` : pathname
    router.push(
      `/opl-crm/admin-panel/orders/${orderId}?from=${encodeURIComponent(from)}`
    )
  }

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

  const pickDate = (it: OplSlimWarehouseItem): Date | null => {
    if (mode === 'warehouse') {
      return (
        getOplLastActionDate(it.history, OplWarehouseAction.RECEIVED) ??
        new Date(it.createdAt)
      )
    }
    if (mode === 'technicians') {
      return getOplLastActionDate(it.history, OplWarehouseAction.ISSUED)
    }
    if (mode === 'orders') {
      return (
        getOplActionDate(it.history, OplWarehouseAction.ISSUED) ??
        (it.orderAssignments[0]?.order?.createdAt
          ? new Date(it.orderAssignments[0].order.createdAt)
          : null)
      )
    }
    if (mode === 'returned') {
      return (
        getOplActionDate(it.history, OplWarehouseAction.RETURNED) ??
        getOplActionDate(it.history, OplWarehouseAction.RETURNED_TO_OPERATOR)
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

            const lastReceived = getOplLastAction(
              it.history,
              OplWarehouseAction.RECEIVED
            )
            const lastIssued = getOplLastAction(
              it.history,
              OplWarehouseAction.ISSUED
            )
            const lastReturned =
              getOplLastAction(it.history, OplWarehouseAction.RETURNED) ??
              getOplLastAction(
                it.history,
                OplWarehouseAction.RETURNED_TO_OPERATOR
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
                    <TableCell>{formatDateOrDash(date)}</TableCell>
                    <TableCell>{receivedBy}</TableCell>
                  </>
                )}
                {mode === 'technicians' && (
                  <>
                    <TableCell>{formatDateOrDash(date)}</TableCell>
                    <TableCell>{issuedToTech}</TableCell>
                  </>
                )}
                {mode === 'orders' && (
                  <>
                    <TableCell>{formatDateOrDash(date)}</TableCell>
                    <TableCell>
                      {order ? (
                        <Button
                          variant="link"
                          className="p-0"
                          onClick={() => openOrderDetails(order.id)}
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
                    <TableCell>{formatDateOrDash(date)}</TableCell>
                    <TableCell>{returnedBy}</TableCell>
                  </>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

export default OplItemModeTable
