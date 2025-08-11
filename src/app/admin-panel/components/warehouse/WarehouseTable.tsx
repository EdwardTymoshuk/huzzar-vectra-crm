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
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdKeyboardArrowRight } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'

type Props = {
  itemType: WarehouseItemType
  subcategoryFilter?: string
  searchTerm: string
}

type SortField = null | 'name' | 'category'
type SortOrder = null | 'asc' | 'desc'

/**
 * WarehouseTable:
 * - Groups warehouse items by name.
 * - Supports filtering by type or subcategory.
 * - Provides search and sort by name/category.
 */
const WarehouseTable = ({ itemType, subcategoryFilter, searchTerm }: Props) => {
  const { data, isLoading, isError } = trpc.warehouse.getAll.useQuery()
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  // Filter items by type and availability
  const filtered = useMemo(() => {
    if (!data) return []

    if (subcategoryFilter) {
      return data.filter((item) => item.subcategory === subcategoryFilter)
    }

    return data.filter(
      (item) => item.itemType === itemType && item.status === 'AVAILABLE'
    )
  }, [data, itemType, subcategoryFilter])

  // Group items by name
  const grouped = useMemo(() => {
    return Object.values(
      filtered.reduce<
        Record<
          string,
          { name: string; category: string; quantity: number; price: number }
        >
      >((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            name: item.name,
            category: item.category ?? item.subcategory ?? '—',
            quantity: 0,
            price: item.price,
          }
        }
        acc[item.name].quantity += item.quantity
        return acc
      }, {})
    )
  }, [filtered])

  // Filter by search term
  const searchedItems = useMemo(() => {
    return grouped.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [grouped, searchTerm])

  // Sort filtered results
  const sortedItems = useMemo(() => {
    const items = [...searchedItems]
    if (!sortField || !sortOrder) return items

    return items.sort((a, b) => {
      const aVal = a[sortField] || ''
      const bVal = b[sortField] || ''
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [searchedItems, sortField, sortOrder])

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
  }

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

  return (
    <div className="border rounded-md mb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('name')}
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

            {itemType === 'DEVICE' && (
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('category')}
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

            <TableHead>Ilość dostępna</TableHead>
            <TableHead>Cena j.</TableHead>
            <TableHead>Wartość</TableHead>
            <TableHead>Więcej</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedItems.map((item) => {
            const value = item.price * item.quantity
            const variant: 'default' | 'success' | 'warning' | 'danger' =
              item.quantity <= 5
                ? 'danger'
                : item.quantity <= 15
                ? 'warning'
                : 'success'

            return (
              <TableRow key={item.name}>
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape
                    textToHighlight={item.name}
                  />
                </TableCell>

                {itemType === 'DEVICE' && (
                  <TableCell>{devicesTypeMap[item.category]}</TableCell>
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
    </div>
  )
}

export default WarehouseTable
