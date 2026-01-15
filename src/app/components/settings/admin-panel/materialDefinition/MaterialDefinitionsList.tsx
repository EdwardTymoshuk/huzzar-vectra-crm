'use client'

import SearchInput from '@/app/components/SearchInput'
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
import { materialUnitMap } from '@/lib/constants'
import { MaterialDefinitionFormVM } from '@/server/modules/vectra-crm/helpers/mappers/mapMaterialDefinitionFormVM'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import { MdDelete, MdEdit } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { toast } from 'sonner'
import AddMaterialDefinitionDialog from './AddMaterialDefinitionDialog'
import EditMaterialDefinitionDialog from './EditMaterialDefinitionDialog'

type SortField = 'name' | 'unit' | null
type SortOrder = 'asc' | 'desc' | null

const MaterialDefinitionsList = () => {
  const [editingItem, setEditingItem] =
    useState<MaterialDefinitionFormVM | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const utils = trpc.useUtils()
  const { data, isLoading, isError } =
    trpc.vectra.materialDefinition.getAll.useQuery()

  const deleteMutation = trpc.vectra.materialDefinition.delete.useMutation({
    onSuccess: () => {
      toast.success('Materiał został usunięty.')
      utils.vectra.materialDefinition.getAll.invalidate()
    },
    onError: () => toast.error('Błąd podczas usuwania.'),
  })

  const safeData = useMemo(() => {
    return (data ?? []).map((item) => ({
      ...item,
      warningAlert: item.warningAlert ?? 10,
      alarmAlert: item.alarmAlert ?? 5,
      price: item.price ?? 0,
      unit: item.unit ?? 'PIECE',
      index: item.index ?? '',
    }))
  }, [data])

  const filtered = useMemo(() => {
    return safeData.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [safeData, searchTerm])

  const sorted = useMemo(() => {
    if (!sortField || !sortOrder) return filtered
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [filtered, sortField, sortOrder])

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
        <AlertTitle>Nie udało się załadować definicji materiałów.</AlertTitle>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 p-2">
      <div className="w-full flex flex-col lg:flex-row justify-between text-base font-normal">
        <AddMaterialDefinitionDialog />
        <SearchInput
          className="w-full lg:w-1/2 mt-2 lg:mt-0"
          onChange={setSearchTerm}
          value={searchTerm}
          placeholder="Szukaj materiał"
        />
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[800px]">
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

                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('unit')}
                >
                  <div className="flex items-center gap-1">
                    <span>Jm</span>
                    {sortField === 'unit' ? (
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

                <TableHead>Index</TableHead>
                <TableHead>Alert (ostrzeżenie)</TableHead>
                <TableHead>Alert (krytyczny)</TableHead>
                <TableHead>Cena</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-sm">
              {sorted.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {item.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {materialUnitMap[item.unit]}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {item.index}
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
        <EditMaterialDefinitionDialog
          open={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}

export default MaterialDefinitionsList
