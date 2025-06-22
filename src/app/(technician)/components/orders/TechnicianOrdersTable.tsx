'use client'

import PaginationControls from '@/app/admin-panel/components/warehouse/history/PaginationControls'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { orderTypeMap, statusColorMap, statusMap } from '@/lib/constants'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { trpc } from '@/utils/trpc'
import { OrderStatus, OrderType, Prisma, TimeSlot } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { toast } from 'sonner'
import TechnicianOrderDetails from './TechnicianOrderDetails'
import TechnicianOrdersFilter from './TechnicianOrdersFilter'

type OrderRow = Prisma.OrderGetPayload<{
  select: {
    id: true
    orderNumber: true
    type: true
    city: true
    street: true
    date: true
    timeSlot: true
    status: true
    transferPending: true
    transferToId: true
    transferTo: { select: { id: true; name: true } }
    assignedTo: { select: { id: true; name: true } }
  }
}>

type SortField = null | 'date' | 'status'
type SortOrder = null | 'asc' | 'desc'
type Props = { searchTerm: string }

const TechnicianOrdersTable = ({ searchTerm }: Props) => {
  const { data: session } = useSession()
  const myId = session?.user.id

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(30)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [statusF, setStatusF] = useState<OrderStatus | null>(null)
  const [typeF, setTypeF] = useState<OrderType | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  const {
    data: list,
    isLoading,
    isError,
  } = trpc.order.getOrders.useQuery({
    page,
    limit: perPage,
    sortField: sortField ?? undefined,
    sortOrder: sortOrder ?? undefined,
    status: statusF ?? undefined,
    type: typeF ?? undefined,
  })

  const {
    data: incoming = [],
    isLoading: incLoading,
    isError: incError,
  } = trpc.order.getIncomingTransfers.useQuery(undefined, { staleTime: 30_000 })

  const utils = trpc.useUtils()
  const accept = trpc.order.confirmTransfer.useMutation({
    onSuccess: () => {
      utils.order.getOrders.invalidate()
      utils.order.getIncomingTransfers.invalidate()
      toast.success('Zlecenie zostało przyjęte.')
    },
  })
  const reject = trpc.order.rejectTransfer.useMutation({
    onSuccess: () => {
      utils.order.getOrders.invalidate()
      utils.order.getIncomingTransfers.invalidate()
      toast.info('Zlecenie zostało odrzucone.')
    },
  })

  const orders: OrderRow[] = useMemo(() => {
    const base = (list?.orders ?? []) as OrderRow[]
    const incRows = incoming.map(
      (t): OrderRow =>
        ({
          ...t,
          type: (t as any).type ?? ('SERVICE' as OrderType),
          status: 'ASSIGNED',
          transferPending: true,
          transferToId: myId,
        } as OrderRow)
    )
    return [...incRows, ...base]
  }, [list?.orders, incoming, myId])

  const totalPages = Math.ceil((list?.totalOrders || 1) / perPage)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${o.city} ${o.street}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      ),
    [orders, searchTerm]
  )

  const handleSort = (field: 'date' | 'status') => {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder('asc')
    } else {
      setSortOrder(
        sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc'
      )
      if (sortOrder === 'desc') setSortField(null)
    }
  }

  const badgeFor = (o: OrderRow) => {
    const outPending = o.transferPending && o.assignedTo?.id === myId
    const incoming = o.transferPending && o.transferToId === myId
    if (incoming)
      return {
        txt: 'Do akceptacji',
        cls: 'bg-amber-400 text-amber-950 hover:bg-amber-400/80',
      }
    if (outPending)
      return {
        txt: 'Przekazane',
        cls: 'bg-amber-300 text-amber-900 hover:bg-amber-300/80',
      }
    return { txt: statusMap[o.status], cls: statusColorMap[o.status] }
  }

  if (isLoading || incLoading) return <LoaderSpinner />
  if (isError || incError)
    return (
      <p className="w-full py-6 text-center text-destructive">
        Błąd ładowania danych.
      </p>
    )

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between gap-2 py-4">
        <TechnicianOrdersFilter
          setStatusFilter={setStatusF}
          setOrderTypeFilter={setTypeF}
        />
        <div className="flex gap-2">
          {[30, 50, 100].map((n) => (
            <Button
              key={n}
              variant={perPage === n ? 'default' : 'outline'}
              onClick={() => setPerPage(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      <div className="w-full md:overflow-x-auto">
        <div className="w-full md:min-w-[1050px]">
          {/* header is always rendered */}
          <div className="hidden md:grid grid-cols-[150px_minmax(180px,1fr)_minmax(280px,2fr)_140px_120px_120px] gap-2 px-4 py-2 border-b text-sm text-muted-foreground select-none">
            <span>Typ</span>
            <span>Nr zlecenia</span>
            <span>Adres</span>
            <span
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleSort('date')}
            >
              Data{' '}
              {sortField === 'date' ? (
                sortOrder === 'asc' ? (
                  <TiArrowSortedUp />
                ) : (
                  <TiArrowSortedDown />
                )
              ) : (
                <TiArrowUnsorted className="opacity-50" />
              )}
            </span>
            <span>Slot</span>
            <span
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleSort('status')}
            >
              Status{' '}
              {sortField === 'status' ? (
                sortOrder === 'asc' ? (
                  <TiArrowSortedUp />
                ) : (
                  <TiArrowSortedDown />
                )
              ) : (
                <TiArrowUnsorted className="opacity-50" />
              )}
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Brak wyników.
            </p>
          ) : (
            <Accordion type="multiple">
              {filtered.map((o) => {
                const open = openRowId === o.id
                const incoming = o.transferPending && o.transferToId === myId
                const outgoingPending =
                  o.transferPending && o.assignedTo?.id === myId
                const badge = badgeFor(o)

                return (
                  <AccordionItem
                    key={o.id}
                    value={o.id}
                    className={incoming || outgoingPending ? 'opacity-60' : ''}
                  >
                    <AccordionTrigger
                      className="px-4 py-3 text-start hover:bg-muted/40"
                      onClick={() => setOpenRowId(open ? null : o.id)}
                    >
                      <div className="w-full grid grid-cols-1 md:grid-cols-[150px_minmax(180px,1fr)_minmax(280px,2fr)_140px_120px_120px] gap-2 text-sm items-start">
                        <div>{orderTypeMap[o.type] ?? '—'}</div>
                        <div className="space-y-1">
                          <Highlight
                            searchWords={[searchTerm]}
                            textToHighlight={o.orderNumber}
                            className="break-all"
                          />
                          <div className="md:hidden">
                            <Badge className={badge.cls}>{badge.txt}</Badge>
                          </div>
                        </div>
                        <div>
                          <Highlight
                            searchWords={[searchTerm]}
                            textToHighlight={`${o.city}, ${o.street}`}
                          />
                        </div>
                        <div className="hidden md:block">
                          {new Date(o.date).toLocaleDateString()}
                        </div>
                        <div className="hidden md:block">
                          {getTimeSlotLabel(o.timeSlot as TimeSlot)}
                        </div>
                        <div className="hidden md:block">
                          <Badge className={badge.cls}>{badge.txt}</Badge>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="bg-muted/30 px-4 py-3">
                      <TechnicianOrderDetails
                        orderId={o.id}
                        orderStatus={o.status}
                        disableTransfer={incoming || outgoingPending}
                        incomingTransfer={incoming}
                        onAccept={() => accept.mutate({ orderId: o.id })}
                        onReject={() => reject.mutate({ orderId: o.id })}
                        pendingMessage={
                          incoming
                            ? `Technik ${
                                o.assignedTo?.name ?? ''
                              } przekazał Ci to zlecenie. Zaakceptuj lub odrzuć je, jeśli to pomyłka.`
                            : outgoingPending
                            ? `Przekazałeś zlecenie do technika ${
                                o.transferTo?.name ?? ''
                              }. Poczekaj, aż je zaakceptuje.`
                            : undefined
                        }
                      />
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>
      </div>

      {list && totalPages > 1 && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}

export default TechnicianOrdersTable
