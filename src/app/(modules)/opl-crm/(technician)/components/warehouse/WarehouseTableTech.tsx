'use client'

import { oplDeviceTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { NavLink } from '@/app/components/navigation-progress'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { VECTRA_PATH } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory, OplWarehouseItemType } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdKeyboardArrowRight } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'

/**
 * WarehouseTable (technician):
 * - Groups available items by name.
 * - Supports search and sorting by name / category.
 * - “More” column links to technician route
 *   /technician/warehouse/details/[name]
 */

type Props = {
  itemType: OplWarehouseItemType
  searchTerm: string
  categoryFilter: string | null
}

type GroupedItem = {
  name: string
  category: OplDeviceCategory | null
  quantity: number
  price: number
}

type SortField = null | 'name' | 'category'
type SortOrder = null | 'asc' | 'desc'

const WarehouseTableTech = ({
  itemType,
  searchTerm,
  categoryFilter,
}: Props) => {
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const { data, isLoading, isError } =
    trpc.opl.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
    })

  /* ---------------------------- filtering ---------------------------- */
  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter(
      (item) =>
        item.itemType === itemType &&
        !item.transferPending &&
        (!categoryFilter || item.category === categoryFilter)
    )
  }, [data, itemType, categoryFilter])

  /* ---------------------------- grouping ----------------------------- */
  const grouped = useMemo(() => {
    return Object.values(
      filtered.reduce<Record<string, GroupedItem>>((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            name: item.name,
            category: item.category,
            quantity: 0,
            price: item.price ?? 0,
          }
        }

        acc[item.name].quantity +=
          item.itemType === 'DEVICE' ? 1 : item.quantity ?? 0

        return acc
      }, {})
    )
  }, [filtered])

  /* ----------------------------- search ------------------------------ */
  const searched = useMemo(() => {
    return grouped.filter((i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [grouped, searchTerm])

  /* ------------------------------ sort ------------------------------- */
  const sorted = useMemo(() => {
    const list = [...searched]
    if (!sortField || !sortOrder) return list
    return list.sort((a, b) => {
      const aVal = a[sortField] || ''
      const bVal = b[sortField] || ''
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [searched, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder('asc')
    } else {
      setSortOrder((prev) =>
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      )
      if (sortOrder === 'desc') setSortField(null)
    }
  }

  console.log(sorted)

  /* ------------------------------ ui ------------------------------- */
  if (isLoading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )

  if (isError || !data)
    return (
      <p className="text-sm text-muted-foreground">
        Nie udało się załadować danych.
      </p>
    )

  if (sorted.length === 0)
    return (
      <p className="pt-8 text-sm text-center text-muted-foreground">
        Brak pozycji w tej kategorii.
      </p>
    )

  return (
    <div className="border rounded-md mb-4">
      <Table>
        <TableHeader>
          <TableRow>
            {itemType === 'DEVICE' && (
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort('category')}
              >
                <div className="flex items-center gap-1">
                  <span>Kategoria</span>
                  {sortField === 'category' ? (
                    sortOrder === 'asc' ? (
                      <TiArrowSortedUp className="w-4 h-4" />
                    ) : (
                      <TiArrowSortedDown className="w-4 h-4" />
                    )
                  ) : (
                    <TiArrowUnsorted className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </TableHead>
            )}
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort('name')}
            >
              <div className="flex items-center gap-1">
                <span>Nazwa</span>
                {sortField === 'name' ? (
                  sortOrder === 'asc' ? (
                    <TiArrowSortedUp className="w-4 h-4" />
                  ) : (
                    <TiArrowSortedDown className="w-4 h-4" />
                  )
                ) : (
                  <TiArrowUnsorted className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </TableHead>
            <TableHead>Ilość</TableHead>
            <TableHead>Cena j.</TableHead>
            <TableHead>Wartość</TableHead>
            <TableHead>Więcej</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sorted.map((item) => {
            const value = item.price * item.quantity
            const badgeVariant: 'default' | 'success' | 'warning' | 'danger' =
              item.quantity <= 5
                ? 'danger'
                : item.quantity <= 15
                ? 'warning'
                : 'success'

            return (
              <TableRow key={item.name}>
                {itemType === 'DEVICE' && (
                  <TableCell>
                    {item.category ? oplDeviceTypeMap[item.category] : '—'}
                  </TableCell>
                )}
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape
                    textToHighlight={item.name}
                  />
                </TableCell>

                <TableCell>
                  <Badge variant={badgeVariant}>{item.quantity}</Badge>
                </TableCell>
                <TableCell>{item.price.toFixed(2)} zł</TableCell>
                <TableCell>{value.toFixed(2)} zł</TableCell>

                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <NavLink
                      href={`${VECTRA_PATH}/warehouse/details/${encodeURIComponent(
                        item.name.trim()
                      )}`}
                      prefetch
                    >
                      {' '}
                      <MdKeyboardArrowRight />
                    </NavLink>
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default WarehouseTableTech
