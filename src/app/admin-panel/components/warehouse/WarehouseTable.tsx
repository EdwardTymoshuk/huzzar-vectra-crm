'use client'

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
import Link from 'next/link'
import { useMemo } from 'react'
import Highlight from 'react-highlight-words'
import { MdKeyboardArrowRight } from 'react-icons/md'

type Props = {
  itemType: WarehouseItemType
  subcategoryFilter?: string
  searchTerm: string
}

/**
 * WarehouseTable:
 * - Groups warehouse items by name (device model/material).
 * - Sums available quantities.
 * - Displays quantity badge color-coded based on amount.
 * - Provides action to navigate to detailed view.
 */
const WarehouseTable = ({ itemType, subcategoryFilter, searchTerm }: Props) => {
  const { data, isLoading, isError } = trpc.warehouse.getAll.useQuery()

  // 🧠 Filter items based on type and subcategory (ZA or itemType)
  // - Executed only when data, itemType or subcategoryFilter changes
  const filtered = useMemo(() => {
    if (!data) return []

    // ZA tab: filter by subcategory
    if (subcategoryFilter) {
      return data.filter((item) => item.subcategory === subcategoryFilter)
    }

    // Other tabs: filter by item type and availability
    return data.filter(
      (item) => item.itemType === itemType && item.status === 'AVAILABLE'
    )
  }, [data, itemType, subcategoryFilter])

  // 📦 Group filtered items by name (e.g., CG3000T, WTYK F RG-6)
  // - Sum quantities for each group
  // - Store category for display (either `category` or `subcategory`)
  const grouped = useMemo(() => {
    return Object.values(
      filtered.reduce<
        Record<string, { name: string; category: string; quantity: number }>
      >((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            name: item.name,
            category: item.category ?? item.subcategory ?? '—',
            quantity: 0,
          }
        }
        acc[item.name].quantity += item.quantity
        return acc
      }, {})
    )
  }, [filtered])

  // 🔍 Final filter based on search term from context
  // - Performs case-insensitive match against name
  const filteredItems = useMemo(() => {
    return grouped.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [grouped, searchTerm])

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

  if (grouped.length === 0) {
    return (
      <p className="pt-8 text-sm text-center text-muted-foreground">
        Brak pozycji w tej kategorii.
      </p>
    )
  }

  // Return table of grouped items
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nazwa</TableHead>
            {itemType === 'DEVICE' && <TableHead>Kategoria</TableHead>}
            <TableHead>Ilość dostępna</TableHead>
            <TableHead>Akcje</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filteredItems.map((item) => {
            let variant: 'default' | 'success' | 'warning' | 'danger' =
              'default'
            if (item.quantity <= 5) variant = 'danger'
            else if (item.quantity <= 15) variant = 'warning'
            else variant = 'success'

            return (
              <TableRow key={item.name}>
                <TableCell>
                  {' '}
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape={true}
                    textToHighlight={item.name}
                  />
                </TableCell>
                {itemType === 'DEVICE' && (
                  <TableCell>{devicesTypeMap[item.category]}</TableCell>
                )}
                <TableCell>
                  <Badge variant={variant}>{item.quantity}</Badge>
                </TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      href={`/admin-panel/warehouse/details/${encodeURIComponent(
                        item.name.trim()
                      )}`}
                    >
                      <MdKeyboardArrowRight />
                    </Link>
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
