'use client'

import DateRangePicker from '@/app/components/DateRangePicker'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { VectraOrderStatus } from '@prisma/client'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'

/**
 * Strong UI type for unassigned orders.
 */

type UnassignedOrder = {
  id: string
  date: Date
  orderNumber: string
  city: string
  street: string
  assignedTo: {
    id: string
    name: string
  } | null
  clientId: string | null
  status: VectraOrderStatus
}

type Props = {
  data: UnassignedOrder[]
  loading: boolean
  from: Date | undefined
  to: Date | undefined
  setFrom: (d: Date | undefined) => void
  setTo: (d: Date | undefined) => void
  onOpenOrder: (id: string) => void
}

/**
 * UnassignedOrdersAccordion
 * ------------------------------------------------------------------
 * Displays backlog of all unassigned orders.
 * Sorting via header click + arrow icons,
 * full search, date range, compact UI.
 */
const UnassignedOrdersAccordion = ({
  data,
  loading,
  from,
  to,
  setFrom,
  setTo,
  onOpenOrder,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState('')

  const [sortKey, setSortKey] = useState<
    'date' | 'orderNumber' | 'technician' | 'address'
  >('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)

  /** Toggle sort mode */
  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  /** Sorting icon */
  const renderSortIcon = (key: typeof sortKey) => {
    if (sortKey !== key) return <TiArrowUnsorted className="inline-block" />
    return sortDir === 'asc' ? (
      <TiArrowSortedUp className="inline-block" />
    ) : (
      <TiArrowSortedDown className="inline-block" />
    )
  }

  /** Full filtering + sorting */
  const filtered = useMemo(() => {
    if (loading) return []

    const enriched = data.map((o) => ({
      ...o,
      address: `${o.city}, ${o.street}`,
      technician: o.assignedTo?.name ?? 'Nieprzypisany',
    }))

    const term = searchTerm.toLowerCase()
    const searched = term
      ? enriched.filter((o) =>
          `${o.orderNumber} ${o.address} ${o.technician}`
            .toLowerCase()
            .includes(term)
        )
      : enriched

    const byTechnician = technicianFilter
      ? searched.filter((o) => o.technician === technicianFilter)
      : searched

    return [...byTechnician].sort((a, b) => {
      const A = a[sortKey]
      const B = b[sortKey]

      if (A instanceof Date && B instanceof Date) {
        return sortDir === 'asc'
          ? A.getTime() - B.getTime()
          : B.getTime() - A.getTime()
      }

      if (typeof A === 'string' && typeof B === 'string') {
        return sortDir === 'asc' ? A.localeCompare(B) : B.localeCompare(A)
      }

      return 0
    })
  }, [data, loading, searchTerm, technicianFilter, sortKey, sortDir])

  return (
    <Accordion type="single" collapsible className="mb-6">
      <AccordionItem value="unassigned">
        <AccordionTrigger className="text-lg font-semibold bg-secondary text-white px-4 py-3 rounded-md">
          W realizacji ({filtered.length})
        </AccordionTrigger>

        <AccordionContent className="p-4 border rounded-md mt-2">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4 items-center">
            <DateRangePicker
              from={from}
              to={to}
              setFrom={setFrom}
              setTo={setTo}
            />

            <Input
              placeholder="Szukaj..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-60"
            />

            {technicianFilter && (
              <div className="flex items-center gap-2 bg-secondary text-white px-3 py-1 rounded-md">
                <span>Technik: {technicianFilter}</span>
                <button onClick={() => setTechnicianFilter(null)}>×</button>
              </div>
            )}

            <Button
              onClick={() => {
                setSearchTerm('')
                setTechnicianFilter(null)
                setFrom(undefined)
                setTo(undefined)
              }}
            >
              Wyczyść
            </Button>
          </div>

          {/* TABLE */}
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => toggleSort('date')}
                  className="text-center cursor-pointer select-none"
                >
                  Data {renderSortIcon('date')}
                </TableHead>

                <TableHead
                  onClick={() => toggleSort('orderNumber')}
                  className="text-center cursor-pointer select-none"
                >
                  Nr zlecenia {renderSortIcon('orderNumber')}
                </TableHead>

                <TableHead
                  onClick={() => toggleSort('address')}
                  className="text-center cursor-pointer select-none"
                >
                  Adres {renderSortIcon('address')}
                </TableHead>

                <TableHead
                  onClick={() => toggleSort('technician')}
                  className="text-center cursor-pointer select-none"
                >
                  Technik {renderSortIcon('technician')}
                </TableHead>

                <TableHead className="text-center">ID klienta</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-4"
                  >
                    Brak niepodjętych zleceń.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow
                    key={o.id}
                    className="hover:bg-muted cursor-pointer uppercase"
                    onDoubleClick={() => onOpenOrder(o.id)}
                  >
                    <TableCell className="text-center">
                      {new Date(o.date).toLocaleDateString('pl-PL')}
                    </TableCell>

                    <TableCell className="text-center font-medium">
                      {o.orderNumber}
                    </TableCell>

                    <TableCell className="text-center">
                      <Highlight
                        highlightClassName="bg-yellow-200"
                        searchWords={[searchTerm]}
                        textToHighlight={`${o.city}, ${o.street}`}
                      />
                    </TableCell>

                    <TableCell
                      className="text-center text-primary cursor-pointer underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTechnicianFilter(o.technician)
                      }}
                    >
                      {o.technician}
                    </TableCell>

                    <TableCell className="text-center">
                      {o.clientId ?? '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default UnassignedOrdersAccordion
