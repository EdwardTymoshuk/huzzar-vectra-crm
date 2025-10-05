'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
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
import { DeviceDefinition } from '@/types'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import { MdDelete, MdEdit } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { toast } from 'sonner'
import AddDeviceDefinitionDialog from './AddDeviceDefinitionDialog'
import EditDeviceDefinitionDialog from './EditDeviceDefinitionDialog'

/** Available sort fields for device definitions table */
type SortField = 'name' | 'category' | null
type SortOrder = 'asc' | 'desc' | null

/**
 * DeviceDefinitionsList
 * - Displays all device definitions with category, alerts and price.
 * - Supports search, sorting, editing and deleting.
 */
const DeviceDefinitionsList = () => {
  const [editingItem, setEditingItem] = useState<DeviceDefinition | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const utils = trpc.useUtils()
  const { data, isLoading, isError } =
    trpc.deviceDefinition.getAllDefinitions.useQuery()
  const { data: categories = [] } =
    trpc.deviceDefinition.getAllCategories.useQuery()

  const deleteMutation = trpc.deviceDefinition.deleteDefinition.useMutation({
    onSuccess: () => {
      toast.success('Urządzenie zostało usunięte.')
      utils.deviceDefinition.getAllDefinitions.invalidate()
    },
    onError: () => toast.error('Błąd podczas usuwania.'),
  })

  /** Normalizes null values to defaults */
  const safeData: DeviceDefinition[] = useMemo(() => {
    if (!data) return []
    return data.map((item) => ({
      ...item,
      warningAlert: item.warningAlert ?? 5,
      alarmAlert: item.alarmAlert ?? 10,
      price: item.price ?? 0,
    }))
  }, [data])

  /** Search by device name */
  const filtered = useMemo(() => {
    return safeData.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [safeData, searchTerm])

  /** Sort by selected field */
  const sorted = useMemo(() => {
    if (!sortField || !sortOrder) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = (a[sortField] ?? '') as string
      const bVal = (b[sortField] ?? '') as string
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [filtered, sortField, sortOrder])

  /** Handles header click for sorting */
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
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Nie udało się załadować definicji urządzeń.</AlertTitle>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 p-2">
      <div className="w-full flex flex-col lg:flex-row justify-between text-base font-normal">
        <AddDeviceDefinitionDialog categories={categories} />
        <SearchInput
          className="w-full lg:w-1/2 mt-2 lg:mt-0"
          onChange={setSearchTerm}
          value={searchTerm}
          placeholder="Szukaj urządzenie"
        />
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[950px]">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Name */}
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

                {/* Category */}
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
                <TableHead>Alert (ostrzeżenie)</TableHead>
                <TableHead>Alert (krytyczny)</TableHead>
                <TableHead>Cena</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {item.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {devicesTypeMap[item.category]}
                  </TableCell>
                  <TableCell>{item.warningAlert}</TableCell>
                  <TableCell>{item.alarmAlert}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.price.toFixed(2)} zł
                  </TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setEditingItem(item)}
                      aria-label="Edytuj"
                      className="w-7 h-7"
                    >
                      <MdEdit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate({ id: item.id })}
                      aria-label="Usuń"
                      className="w-7 h-7"
                    >
                      <MdDelete className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {editingItem && (
        <EditDeviceDefinitionDialog
          open={!!editingItem}
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}

export default DeviceDefinitionsList
