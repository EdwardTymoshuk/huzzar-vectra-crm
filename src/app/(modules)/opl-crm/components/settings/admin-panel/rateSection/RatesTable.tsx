'use client'

import SearchInput from '@/app/components/SearchInput'
import { Alert, AlertTitle } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { trpc } from '@/utils/trpc'
import { useMemo, useState } from 'react'
import { MdDelete, MdEdit } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { toast } from 'sonner'
import EditRateDefinitionDialog from './EditRateDefinitionDialog'

type SortField = 'code' | 'amount' | null
type SortOrder = 'asc' | 'desc' | null
type RateGroup = 'INSTALLATION' | 'SERVICE' | 'PKI'

const SERVICE_CODES = new Set([
  'N-FTTH',
  'N-ZA',
  'NP-FTTH',
  'SPLIT32',
  'SPLIT64',
  'PKU1',
  'PKU2',
  'PKU3',
])

const RatesList = () => {
  const [editingItem, setEditingItem] = useState<{
    id: string
    code: string
    amount: number
  } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [activeGroup, setActiveGroup] = useState<RateGroup>('INSTALLATION')

  const utils = trpc.useUtils()
  const { data, isLoading, isError } =
    trpc.opl.settings.getAllOplRates.useQuery()

  const deleteMutation = trpc.opl.settings.deleteOplRate.useMutation({
    onSuccess: () => {
      toast.success('Stawka została usunięta.')
      utils.opl.settings.getAllOplRates.invalidate()
    },
    onError: (err) =>
      toast.error(err.message || 'Błąd podczas usuwania.'),
  })

  const normalizeRatesMutation = trpc.opl.settings.normalizeOplRates.useMutation({
    onSuccess: (summary) => {
      toast.success(
        `Naprawiono stawki: scalono ${summary.merged}, przepięto rozliczeń ${summary.rewiredSettlements}, zmieniono kodów ${summary.renamed}.`
      )
      utils.opl.settings.getAllOplRates.invalidate()
    },
    onError: (err) => toast.error(err.message || 'Nie udało się naprawić stawek.'),
  })

  const grouped = useMemo(() => {
    const source = data ?? []
    return {
      INSTALLATION: source.filter((rate) => {
        const code = rate.code.toUpperCase()
        return !code.startsWith('PKI') && !SERVICE_CODES.has(code)
      }),
      SERVICE: source.filter((rate) => SERVICE_CODES.has(rate.code.toUpperCase())),
      PKI: source.filter((rate) => rate.code.toUpperCase().startsWith('PKI')),
    }
  }, [data])

  const filtered = useMemo(() => {
    return grouped[activeGroup].filter((rate) =>
      rate.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [grouped, activeGroup, searchTerm])

  const sorted = useMemo(() => {
    if (!sortField || !sortOrder) return filtered

    return [...filtered].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (sortField === 'amount') {
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      }

      return sortOrder === 'asc'
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string)
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
        <AlertTitle>Nie udało się załadować stawek.</AlertTitle>
      </Alert>
    )
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-col gap-3">
        <Tabs
          value={activeGroup}
          onValueChange={(value) => setActiveGroup(value as RateGroup)}
          className="w-full"
        >
          <TabsList className="mx-auto grid h-auto w-full max-w-2xl grid-cols-3 gap-1 p-1">
            <TabsTrigger value="INSTALLATION">
              Instalacje ({grouped.INSTALLATION.length})
            </TabsTrigger>
            <TabsTrigger value="SERVICE">
              Serwis ({grouped.SERVICE.length})
            </TabsTrigger>
            <TabsTrigger value="PKI">PKI ({grouped.PKI.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-center">
        <h2 className="text-lg font-semibold">Lista stawek</h2>
        <div className="w-full lg:w-1/2 mt-2 lg:mt-0 flex gap-2">
          <SearchInput
            className="w-full"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Szukaj kodu pracy"
          />
          <Button
            variant="outline"
            onClick={() => normalizeRatesMutation.mutate()}
            disabled={normalizeRatesMutation.isLoading}
          >
            {normalizeRatesMutation.isLoading ? 'Naprawianie...' : 'Napraw kody'}
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center gap-1">
                    Kod
                    {sortField === 'code' ? (
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
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    Stawka (zł)
                    {sortField === 'amount' ? (
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
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sorted.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="uppercase font-medium">
                    {rate.code.toUpperCase()}
                  </TableCell>
                  <TableCell>{rate.amount.toFixed(2)} zł</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setEditingItem(rate)}
                      aria-label="Edytuj"
                      className="w-7 h-7"
                    >
                      <MdEdit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate({ id: rate.id })}
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
        <EditRateDefinitionDialog
          open={!!editingItem}
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}

export default RatesList
