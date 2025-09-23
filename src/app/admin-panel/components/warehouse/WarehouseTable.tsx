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
  /** Free-text search across grouped item `name`. */
  searchTerm: string
}

type SortField = null | 'name' | 'category' | 'provider'
type SortOrder = null | 'asc' | 'desc'

/** Grouped row shape: 1 row per unique `name` (+ derived fields). */
type GroupedItem = {
  name: string
  category: string
  provider: string
  quantity: number
  price: number
}

/**
 * WarehouseTable
 * - Pipeline: filter → group → search → sort → paginate.
 * - Works for both DEVICE and MATERIAL tabs.
 * - Reuses global PaginationControls and the 30/50/100 buttons pattern.
 * - Strong typing to avoid implicit-`any` traps.
 */
const WarehouseTable = ({ itemType, searchTerm }: Props) => {
  const { data, isLoading, isError } = trpc.warehouse.getAll.useQuery()

  // Sorting state
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)

  /** 1) Base filtering by type; show only AVAILABLE for base view. */
  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter(
      (item) => item.itemType === itemType && item.status === 'AVAILABLE'
    )
  }, [data, itemType])

  /** 2) Group by `name`: sum quantities, keep latest price/category/provider. */
  const grouped: GroupedItem[] = useMemo(() => {
    const acc = filtered.reduce<Record<string, GroupedItem>>((map, item) => {
      const key = `${item.name}-${item.provider ?? ''}`
      if (!map[key]) {
        map[key] = {
          name: item.name,
          category: item.category ?? '—',
          provider: item.provider ?? '—',
          quantity: 0,
          price: Number(item.price ?? 0),
        }
      }
      map[key].quantity += item.quantity
      if (item.price != null) map[key].price = Number(item.price)
      if (item.category) map[key].category = item.category
      if (item.provider) map[key].provider = item.provider
      return map
    }, {})
    return Object.values(acc)
  }, [filtered])

  /** 3) Search by name (case-insensitive). */
  const searchedItems: GroupedItem[] = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return grouped
    return grouped.filter((it) => it.name.toLowerCase().includes(q))
  }, [grouped, searchTerm])

  /** 4) Sort by selected field (name/category/provider). */
  const sortedItems: GroupedItem[] = useMemo(() => {
    const items = [...searchedItems]
    if (!sortField || !sortOrder) return items

    return items.sort((a, b) => {
      const aVal = (a[sortField] ?? '') as string
      const bVal = (b[sortField] ?? '') as string
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [searchedItems, sortField, sortOrder])

  /** 5) Pagination AFTER filter/search/sort. */
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedItems.slice(start, start + itemsPerPage)
  }, [sortedItems, currentPage, itemsPerPage])

  /** Toggle/cycle sort for a field. */
  const handleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder('asc')
    } else {
      setSortOrder((prev) =>
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      )
      if (sortOrder === 'desc') setSortField(null)
    }
    setCurrentPage(1)
  }

  /** Header sort icon helper. */
  const renderSortIcon = (field: Exclude<SortField, null>) => {
    if (sortField !== field) {
      return <TiArrowUnsorted className="w-4 h-4 text-muted-foreground" />
    }
    return sortOrder === 'asc' ? (
      <TiArrowSortedUp className="w-4 h-4" />
    ) : (
      <TiArrowSortedDown className="w-4 h-4" />
    )
  }

  /* ---------------------- LOADING / EMPTY STATES ---------------------- */

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

  if (sortedItems.length === 0) {
    return (
      <p className="pt-8 text-sm text-center text-muted-foreground">
        Brak pozycji w tej kategorii.
      </p>
    )
  }

  /* ----------------------------- RENDER ------------------------------- */

  return (
    <div className="border rounded-md mb-4">
      <div className="flex items-center justify-end p-2">
        <div className="flex gap-2">
          {[30, 50, 100].map((n) => (
            <Button
              key={n}
              variant={itemsPerPage === n ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setItemsPerPage(n)
                setCurrentPage(1)
              }}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                <span>Nazwa</span>
                {renderSortIcon('name')}
              </div>
            </TableHead>

            {itemType === 'DEVICE' && (
              <>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    <span>Kategoria</span>
                    {renderSortIcon('category')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('provider')}
                >
                  <div className="flex items-center gap-1">
                    <span>Operator</span>
                    {renderSortIcon('provider')}
                  </div>
                </TableHead>
              </>
            )}

            <TableHead>Ilość dostępna</TableHead>
            <TableHead>Cena j.</TableHead>
            <TableHead>Wartość</TableHead>
            <TableHead>Więcej</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageItems.map((item) => {
            const value = item.price * item.quantity
            const variant: 'default' | 'success' | 'warning' | 'danger' =
              item.quantity <= 5
                ? 'danger'
                : item.quantity <= 15
                ? 'warning'
                : 'success'

            return (
              <TableRow key={`${item.name}-${item.category}-${item.provider}`}>
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape
                    textToHighlight={item.name}
                  />
                </TableCell>

                {itemType === 'DEVICE' && (
                  <>
                    <TableCell>
                      {devicesTypeMap[item.category] ?? item.category}
                    </TableCell>
                    <TableCell>{item.provider ?? '—'}</TableCell>
                  </>
                )}

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
          })}
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
