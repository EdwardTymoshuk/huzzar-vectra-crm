'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import {
  OplSlimWarehouseItem,
  getOplLastAction,
  getOplLastActionDate,
} from '@/app/(modules)/opl-crm/utils/warehouse/warehouse'
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
import { formatDateOrDash } from '@/utils/dates/formatDateTime'
import {
  OplWarehouseDefinitionWithStockVM,
  OplWarehouseDeviceDefinitionVM,
  OplWarehouseMaterialDefinitionVM,
} from '@/types/opl-crm'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OplWarehouseAction, OplWarehouseItemType } from '@prisma/client'
import { usePathname, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useMemo, useState } from 'react'
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

const isDevice = (
  item: OplWarehouseDefinitionWithStockVM
): item is OplWarehouseDeviceDefinitionVM => item.itemType === 'DEVICE'

const isMaterial = (
  item: OplWarehouseDefinitionWithStockVM
): item is OplWarehouseMaterialDefinitionVM => item.itemType === 'MATERIAL'

const OplWarehouseTableAdmin = ({
  itemType,
  searchTerm,
  categoryFilter,
}: Props) => {
  const [openDeviceName, setOpenDeviceName] = useState<string | null>(null)
  const [sortField, setSortField] = useState<'name' | 'category' | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 100

  const locationId = useActiveLocation()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAdmin, isCoordinator, isTechnician } = useRole()
  const query = searchParams.toString()
  const from = query ? `${pathname}?${query}` : pathname

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

  const { data: deficitsSummary = [] } =
    trpc.opl.warehouse.getMaterialDeficitsSummary.useQuery(undefined, {
      enabled: itemType === 'MATERIAL',
    })

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

  const sorted = useMemo(() => {
    const items = [...searched]

    return items.sort((a, b) => {
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

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return sorted.slice(start, start + itemsPerPage)
  }, [sorted, currentPage, itemsPerPage])

  const surplusByMaterialName = useMemo(
    () =>
      new Map(
        (deficitsSummary ?? []).map((d) => [d.materialName, d.quantity] as const)
      ),
    [deficitsSummary]
  )

  const hasAnyMaterialSurplus =
    itemType === 'MATERIAL' &&
    pageItems.some(
      (item) => isMaterial(item) && (surplusByMaterialName.get(item.name) ?? 0) > 0
    )

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

  const detailsHrefForName = (itemName: string) =>
    `${OPL_PATH}/admin-panel/warehouse/details/${encodeURIComponent(itemName)}?from=${encodeURIComponent(
      from
    )}`

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

  return (
    <div className="border rounded-md mb-4">
      {itemType === 'DEVICE' ? (
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={6}>
                  <p className="py-6 text-center text-muted-foreground">
                    Brak pozycji w tej kategorii.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.filter(isDevice).map((item) => {
                const value = item.price * item.quantity
                const variant: 'success' | 'warning' | 'danger' =
                  item.quantity <= 5
                    ? 'danger'
                    : item.quantity <= 15
                    ? 'warning'
                    : 'success'

                const isOpen = openDeviceName === item.name

                return (
                  <Fragment key={item.name}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() =>
                        setOpenDeviceName((prev) =>
                          prev === item.name ? null : item.name
                        )
                      }
                    >
                      <TableCell>
                        {oplDevicesTypeMap[item.category] ?? item.category}
                      </TableCell>
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
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <NavLink
                            href={detailsHrefForName(item.name)}
                            prefetch
                          >
                            <MdKeyboardArrowRight />
                          </NavLink>
                        </Button>
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20 p-0">
                          <div className="px-3 py-2">
                            <OplDeviceDetailsRows
                              name={item.name}
                              locationId={locationId ?? undefined}
                              open={isOpen}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      ) : (
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
              <TableHead>Ilość dostępna</TableHead>
              {hasAnyMaterialSurplus && <TableHead>Nadstan</TableHead>}
              <TableHead>Cena j.</TableHead>
              <TableHead>Wartość</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasAnyMaterialSurplus ? 6 : 5}>
                  <p className="py-6 text-center text-muted-foreground">
                    Brak pozycji w tej kategorii.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.filter(isMaterial).map((item) => {
                const value = item.price * item.quantity
                const variant: 'success' | 'warning' | 'danger' =
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
                    <TableCell>
                      <Badge variant={variant}>{item.quantity}</Badge>
                    </TableCell>
                    {hasAnyMaterialSurplus && (
                      <TableCell>
                        {(() => {
                          const surplus = surplusByMaterialName.get(item.name) ?? 0
                          return surplus > 0 ? (
                            <Badge variant="destructive">{surplus}</Badge>
                          ) : (
                            '—'
                          )
                        })()}
                      </TableCell>
                    )}
                    <TableCell>{item.price.toFixed(2)} zł</TableCell>
                    <TableCell>{value.toFixed(2)} zł</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <NavLink
                          href={detailsHrefForName(item.name)}
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
      )}

      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}

const OplDeviceDetailsRows = ({
  name,
  locationId,
  open,
}: {
  name: string
  locationId?: string
  open: boolean
}) => {
  const { data, isLoading } = trpc.opl.warehouse.getItemsByName.useQuery(
    {
      name,
      scope: 'all',
      mode: 'warehouse',
      locationId,
    },
    { enabled: open }
  )

  const devices = useMemo(
    () =>
      ((data ?? []) as OplSlimWarehouseItem[])
        .filter((item) => item.itemType === 'DEVICE')
        .filter((item) => item.status === 'AVAILABLE')
        .sort((a, b) =>
          (a.serialNumber ?? '').localeCompare(b.serialNumber ?? '', 'pl')
        ),
    [data]
  )

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />
  }

  if (!devices.length) {
    return <p className="py-2 text-sm text-muted-foreground">Brak urządzeń.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numer seryjny</TableHead>
          <TableHead>Data przyjęcia</TableHead>
          <TableHead>Przyjęte przez</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devices.map((item) => {
          const receivedDate =
            getOplLastActionDate(item.history, OplWarehouseAction.RECEIVED) ??
            new Date(item.createdAt)
          const receivedAction = getOplLastAction(
            item.history,
            OplWarehouseAction.RECEIVED
          )

          return (
            <TableRow key={item.id}>
              <TableCell>{item.serialNumber ?? '—'}</TableCell>
              <TableCell>{formatDateOrDash(receivedDate)}</TableCell>
              <TableCell>{receivedAction?.performedBy?.name ?? '—'}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default OplWarehouseTableAdmin
