'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import { NavLink } from '@/app/components/navigation-progress'
import PaginationControls from '@/app/components/navigation/PaginationControls'
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
import { OPL_PATH } from '@/lib/constants'
import {
  OplWarehouseDefinitionWithStockVM,
  OplWarehouseDeviceDefinitionVM,
  OplWarehouseMaterialDefinitionVM,
} from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplWarehouseItemType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdKeyboardArrowRight } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'

type Props = {
  itemType: OplWarehouseItemType
  searchTerm: string
  categoryFilter: string | null
}

/**
 * Type guard for DEVICE definitions
 */
const isDevice = (
  item: OplWarehouseDefinitionWithStockVM
): item is OplWarehouseDeviceDefinitionVM => item.itemType === 'DEVICE'

/**
 * Type guard for MATERIAL definitions
 */
const isMaterial = (
  item: OplWarehouseDefinitionWithStockVM
): item is OplWarehouseMaterialDefinitionVM => item.itemType === 'MATERIAL'

/**
 * WarehouseTable
 * ------------------------------------------------------------------
 * Displays warehouse item definitions with aggregated stock values.
 * Backend is the single source of truth – no grouping or merging
 * is performed on the frontend.
 */
const WarehouseTableAdmin = ({
  itemType,
  searchTerm,
  categoryFilter,
}: Props) => {
  const [sortField, setSortField] = useState<'name' | 'category' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 100

  const locationId = useActiveLocation()
  const { isAdmin, isCoordinator, isTechnician } = useRole()

  const { data, isLoading, isError } =
    trpc.opl.warehouse.getDefinitionsWithStock.useQuery(
      {
        itemType,
        locationId: locationId ?? undefined,
      },
      {
        enabled: isAdmin || isCoordinator ? !!locationId : !isTechnician,
      }
    )

  /**
   * Apply filters (category only applies to DEVICE items)
   */
  const filtered = useMemo(() => {
    if (!data) return []

    if (itemType === 'DEVICE') {
      const devices = data as OplWarehouseDeviceDefinitionVM[]

      return devices.filter(
        (item) => !categoryFilter || item.category === categoryFilter
      )
    }

    const materials = data as OplWarehouseMaterialDefinitionVM[]
    return materials
  }, [data, itemType, categoryFilter])

  /**
   * Apply search (by name)
   */
  const searched = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!data) return []

    if (itemType === 'DEVICE') {
      const devices = data as OplWarehouseDeviceDefinitionVM[]

      return devices
        .filter((item) => !categoryFilter || item.category === categoryFilter)
        .filter((item) => !q || item.name.toLowerCase().includes(q))
    }

    const materials = data as OplWarehouseMaterialDefinitionVM[]

    return materials.filter((item) => !q || item.name.toLowerCase().includes(q))
  }, [data, itemType, categoryFilter, searchTerm])

  /**
   * Sorting logic
   * - Items with stock > 0 are always on top
   * - DEVICE can be sorted by category
   * - MATERIAL is always sorted by name
   */
  const sorted = useMemo(() => {
    const items = [...searched]

    return items.sort((a, b) => {
      // Rule 1: available stock first
      if (a.quantity > 0 && b.quantity === 0) return -1
      if (a.quantity === 0 && b.quantity > 0) return 1

      const field = itemType === 'DEVICE' ? sortField ?? 'name' : 'name'
      const order = sortOrder ?? 'asc'

      const aVal = field === 'category' && isDevice(a) ? a.category : a.name
      const bVal = field === 'category' && isDevice(b) ? b.category : b.name

      return order === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [searched, sortField, sortOrder, itemType])

  /**
   * Pagination
   */
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage, itemsPerPage])

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
    if (sortField !== field) {
      return <TiArrowUnsorted className="w-4 h-4 text-muted-foreground" />
    }

    return sortOrder === 'asc' ? (
      <TiArrowSortedUp className="w-4 h-4" />
    ) : (
      <TiArrowSortedDown className="w-4 h-4" />
    )
  }

  /**
   * UI states
   */
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">Brak sprzętu w magazynie.</p>
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

  /**
   * Render table
   */
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
            <TableHead />
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
                <TableRow key={item.name}>
                  {isDevice(item) && (
                    <TableCell>
                      {oplDevicesTypeMap[item.category] ?? item.category}
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
                        href={
                          locationId
                            ? `${OPL_PATH}/admin-panel/warehouse/details/${encodeURIComponent(
                                item.name
                              )}?loc=${locationId}`
                            : `${OPL_PATH}/admin-panel/warehouse/details/${encodeURIComponent(
                                item.name
                              )}`
                        }
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

export default WarehouseTableAdmin
