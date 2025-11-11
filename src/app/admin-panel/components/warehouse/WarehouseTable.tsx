'use client'

import { NavLink } from '@/app/components/shared/navigation-progress'
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
import { devicesTypeMap } from '@/lib/constants'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { WarehouseItemType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdKeyboardArrowRight } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import PaginationControls from '../warehouse/history/PaginationControls'

type Props = {
  itemType: WarehouseItemType
  searchTerm: string
  categoryFilter: string | null
}

/**
 * WarehouseTable
 * ------------------------------------------------------
 * Displays grouped warehouse items by type (device/material),
 * with sorting, pagination and highlighting of search terms.
 * Filters (category) are now handled externally via props.
 */
const WarehouseTable = ({ itemType, searchTerm, categoryFilter }: Props) => {
  const [sortField, setSortField] = useState<'name' | 'category' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 100 // ✅ fixed limit

  const locationId = useActiveLocation()
  const { isAdmin, isCoordinator, isTechnician } = useRole()

  const { data, isLoading, isError } = trpc.warehouse.getAll.useQuery(
    { locationId: locationId ?? undefined },
    { enabled: isAdmin || isCoordinator ? !!locationId : !isTechnician }
  )

  /** Filter data */
  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((item) => {
      const matchesType =
        item.itemType === itemType && item.status === 'AVAILABLE'
      const matchesCategory = categoryFilter
        ? item.category === categoryFilter
        : true
      return matchesType && matchesCategory
    })
  }, [data, itemType, categoryFilter])

  /** Group items */
  const grouped = useMemo(() => {
    const acc = filtered.reduce<
      Record<
        string,
        { name: string; category: string; quantity: number; price: number }
      >
    >((map, item) => {
      const key = `${item.name} ?? ''`
      if (!map[key]) {
        map[key] = {
          name: item.name,
          category: item.category ?? '—',
          quantity: 0,
          price: Number(item.price ?? 0),
        }
      }
      map[key].quantity += item.quantity
      if (item.price != null) map[key].price = Number(item.price)
      if (item.category) map[key].category = item.category
      return map
    }, {})
    return Object.values(acc)
  }, [filtered])

  /** Apply search */
  const searched = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return grouped
    return grouped.filter((it) => it.name.toLowerCase().includes(q))
  }, [grouped, searchTerm])

  /** Sorting */
  const sorted = useMemo(() => {
    const items = [...searched]
    if (!sortField || !sortOrder) return items
    return items.sort((a, b) => {
      const aVal = (a[sortField] ?? '') as string
      const bVal = (b[sortField] ?? '') as string
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [searched, sortField, sortOrder])

  /** Pagination */
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage, itemsPerPage])

  /** Handlers */
  const handleSort = (field: 'name' | 'category') => {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder('asc')
    } else {
      setSortOrder(
        sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc'
      )
      if (sortOrder === 'desc') setSortField(null)
    }
    setCurrentPage(1)
  }

  const renderSortIcon = (field: 'name' | 'category') => {
    if (sortField !== field)
      return <TiArrowUnsorted className="w-4 h-4 text-muted-foreground" />
    return sortOrder === 'asc' ? (
      <TiArrowSortedUp className="w-4 h-4" />
    ) : (
      <TiArrowSortedDown className="w-4 h-4" />
    )
  }

  /** UI states */
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-muted-foreground">
        Nie udało się załadować danych.
      </p>
    )
  }

  if ((isAdmin || isCoordinator) && !locationId) {
    return (
      <p className="text-sm text-muted-foreground">
        Wybierz magazyn z menu po lewej.
      </p>
    )
  }

  /** Render */
  return (
    <div className="border rounded-md mb-4">
      <Table>
        <TableHeader>
          <TableRow>
            {itemType === 'DEVICE' && (
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1">
                  <span>Kategoria</span>
                  {renderSortIcon('category')}
                </div>
              </TableHead>
            )}
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                <span>Nazwa</span>
                {renderSortIcon('name')}
              </div>
            </TableHead>
            <TableHead>Ilość dostępna</TableHead>
            <TableHead>Cena j.</TableHead>
            <TableHead>Wartość</TableHead>
            <TableHead>Więcej</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={itemType === 'DEVICE' ? 6 : 5}>
                <p className="py-6 text-center text-muted-foreground">
                  Brak pozycji w tej kategorii.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((item) => {
              const value = item.price * item.quantity
              const variant: 'success' | 'warning' | 'danger' =
                item.quantity <= 5
                  ? 'danger'
                  : item.quantity <= 15
                  ? 'warning'
                  : 'success'

              return (
                <TableRow key={`${item.name}-${item.category}`}>
                  {itemType === 'DEVICE' && (
                    <TableCell>
                      {devicesTypeMap[item.category] ?? item.category}
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
                    <Badge variant={variant}>{item.quantity}</Badge>
                  </TableCell>
                  <TableCell>{item.price.toFixed(2)} zł</TableCell>
                  <TableCell>{value.toFixed(2)} zł</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="ghost">
                      <NavLink
                        href={`/admin-panel/warehouse/details/${encodeURIComponent(
                          item.name.trim()
                        )}`}
                        prefetch
                      >
                        <MdKeyboardArrowRight />
                      </NavLink>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}

export default WarehouseTable
