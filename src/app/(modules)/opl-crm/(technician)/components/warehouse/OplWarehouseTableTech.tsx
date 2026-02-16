'use client'

import { oplDevicesTypeMap } from '@/app/(modules)/opl-crm/lib/constants'
import {
  OplSlimWarehouseItem,
  getOplLastActionDate,
} from '@/app/(modules)/opl-crm/utils/warehouse/warehouse'
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
import { OPL_PATH } from '@/lib/constants'
import { formatDateOrDash } from '@/utils/dates/formatDateTime'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory, OplWarehouseAction, OplWarehouseItemType } from '@prisma/client'
import { Fragment, useMemo, useState } from 'react'
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

type GroupedItem = {
  name: string
  category: OplDeviceCategory | null
  quantity: number
  price: number
  serialNumbers: string[]
}

type SortField = null | 'name' | 'category'
type SortOrder = null | 'asc' | 'desc'

const OplWarehouseTableTech = ({
  itemType,
  searchTerm,
  categoryFilter,
}: Props) => {
  const [openDeviceName, setOpenDeviceName] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const { data, isLoading, isError } =
    trpc.opl.warehouse.getTechnicianStock.useQuery({
      technicianId: 'self',
    })

  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter(
      (item) =>
        item.itemType === itemType &&
        !item.transferPending &&
        (!categoryFilter || item.category === categoryFilter)
    )
  }, [data, itemType, categoryFilter])

  const grouped = useMemo(() => {
    return Object.values(
      filtered.reduce<Record<string, GroupedItem>>((acc, item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            name: item.name,
            category: item.category,
            quantity: 0,
            price: item.price ?? 0,
            serialNumbers: [],
          }
        }

        acc[item.name].quantity +=
          item.itemType === 'DEVICE' ? 1 : item.quantity ?? 0
        if (item.itemType === 'DEVICE' && item.serialNumber) {
          acc[item.name].serialNumbers.push(item.serialNumber)
        }

        return acc
      }, {})
    )
  }, [filtered])

  const searched = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return grouped

    return grouped.filter((i) => {
      const byName = i.name.toLowerCase().includes(q)
      if (byName) return true
      return i.serialNumbers.some((sn) => sn.toLowerCase().includes(q))
    })
  }, [grouped, searchTerm])

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
      {itemType === 'DEVICE' ? (
        <Table>
          <TableHeader>
            <TableRow>
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

              const isOpen = openDeviceName === item.name
              const matchingSerials = searchTerm.trim()
                ? item.serialNumbers.filter((sn) =>
                    sn.toLowerCase().includes(searchTerm.trim().toLowerCase())
                  )
                : []

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
                      {item.category ? oplDevicesTypeMap[item.category] : '—'}
                    </TableCell>
                    <TableCell>
                      <Highlight
                        highlightClassName="bg-yellow-200"
                        searchWords={[searchTerm]}
                        autoEscape
                        textToHighlight={item.name}
                      />
                      {matchingSerials.length > 0 &&
                        !item.name
                          .toLowerCase()
                          .includes(searchTerm.trim().toLowerCase()) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            SN:{' '}
                            <Highlight
                              highlightClassName="bg-yellow-200"
                              searchWords={[searchTerm]}
                              autoEscape
                              textToHighlight={matchingSerials[0]}
                            />
                          </p>
                        )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant}>{item.quantity}</Badge>
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
                          href={`${OPL_PATH}/warehouse/details/${encodeURIComponent(
                            item.name.trim()
                          )}`}
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
                          <OplTechDeviceDetailsRows
                            name={item.name}
                            open={isOpen}
                            searchTerm={searchTerm}
                            availableSerials={item.serialNumbers}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
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
                        href={`${OPL_PATH}/warehouse/details/${encodeURIComponent(
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
      )}
    </div>
  )
}

const OplTechDeviceDetailsRows = ({
  name,
  open,
  searchTerm,
  availableSerials,
}: {
  name: string
  open: boolean
  searchTerm: string
  availableSerials: string[]
}) => {
  const { data, isLoading } = trpc.opl.warehouse.getItemsByName.useQuery(
    {
      name,
      scope: 'technician',
    },
    { enabled: open }
  )

  const devices = useMemo(
    () =>
      ((data ?? []) as OplSlimWarehouseItem[])
        .filter((item) => item.itemType === 'DEVICE')
        .filter((item) => {
          const sn = item.serialNumber ?? ''
          return !!sn && availableSerials.includes(sn)
        })
        .sort((a, b) =>
          (a.serialNumber ?? '').localeCompare(b.serialNumber ?? '', 'pl')
        ),
    [data, availableSerials]
  )

  if (isLoading) return <Skeleton className="h-16 w-full" />

  if (!devices.length) {
    return <p className="py-2 text-sm text-muted-foreground">Brak urządzeń.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numer seryjny</TableHead>
          <TableHead>Data wydania</TableHead>
          <TableHead>Dni na stanie</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {devices.map((item) => {
          const issuedDate = getOplLastActionDate(
            item.history,
            OplWarehouseAction.ISSUED
          )
          const daysOnStock = Math.max(
            0,
            Math.floor(
              (Date.now() - new Date(item.updatedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
          let daysVariant: 'success' | 'warning' | 'destructive' = 'success'
          if (daysOnStock <= 15) daysVariant = 'success'
          else if (daysOnStock <= 30) daysVariant = 'warning'
          else daysVariant = 'destructive'

          return (
            <TableRow key={item.id}>
              <TableCell>
                <Highlight
                  highlightClassName="bg-yellow-200"
                  searchWords={[searchTerm]}
                  autoEscape
                  textToHighlight={item.serialNumber ?? '—'}
                />
              </TableCell>
              <TableCell>{formatDateOrDash(issuedDate)}</TableCell>
              <TableCell>
                <Badge variant={daysVariant}>{daysOnStock}</Badge>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default OplWarehouseTableTech
