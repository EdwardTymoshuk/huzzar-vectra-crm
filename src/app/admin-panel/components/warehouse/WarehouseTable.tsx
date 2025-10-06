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
import WarehouseFilter from './WarehouseFilter'

type Props = {
  itemType: WarehouseItemType
  searchTerm: string
}

type SortField = null | 'name' | 'category'
type SortOrder = null | 'asc' | 'desc'

type GroupedItem = {
  name: string
  category: string
  quantity: number
  price: number
}

const WarehouseTable = ({ itemType, searchTerm }: Props) => {
  // Sorting
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)

  const locationId = useActiveLocation()
  const { isAdmin, isCoordinator, isTechnician } = useRole()

  const { data, isLoading, isError } = trpc.warehouse.getAll.useQuery(
    { locationId: locationId ?? undefined },
    {
      enabled: isAdmin || isCoordinator ? !!locationId : !isTechnician,
    }
  )

  /** 1) Base filtering */
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

  /** 2) Group by name */
  const grouped: GroupedItem[] = useMemo(() => {
    const acc = filtered.reduce<Record<string, GroupedItem>>((map, item) => {
      const key = `${item.name} ?? ''}`
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

  /** 3) Search */
  const searchedItems: GroupedItem[] = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return grouped
    return grouped.filter((it) => it.name.toLowerCase().includes(q))
  }, [grouped, searchTerm])

  /** 4) Sort */
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

  /** 5) Pagination */
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sortedItems.slice(start, start + itemsPerPage)
  }, [sortedItems, currentPage, itemsPerPage])

  /** Handlers */
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

  /* ---------------------- UI states ---------------------- */

  /* ---------------------- LOADING ---------------------- */
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

  /* ---------------------- Render ---------------------- */
  return (
    <div className="border rounded-md mb-4">
      {/* Filters & page size */}
      <div className="flex items-center justify-between p-2">
        <WarehouseFilter setCategoryFilter={setCategoryFilter} />

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
              </>
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
              <TableCell colSpan={itemType === 'DEVICE' ? 6 : 4}>
                <p className="py-6 text-center text-muted-foreground">
                  Brak pozycji w tej kategorii.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((item) => {
              const value = item.price * item.quantity
              const variant: 'default' | 'success' | 'warning' | 'danger' =
                item.quantity <= 5
                  ? 'danger'
                  : item.quantity <= 15
                  ? 'warning'
                  : 'success'

              return (
                <TableRow key={`${item.name}-${item.category}`}>
                  {itemType === 'DEVICE' && (
                    <>
                      <TableCell>
                        {devicesTypeMap[item.category] ?? item.category}
                      </TableCell>
                    </>
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
