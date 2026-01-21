'use client'

import OrderStatusBadge from '@/app/(modules)/vectra-crm/components/orders/OrderStatusBadge'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import PaginationControls from '@/app/components/navigation/PaginationControls'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { trpc } from '@/utils/trpc'
import { Prisma, VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { orderTypeMap } from '../../../lib/constants'
import TechnicianCompletedOrderDetails from './TechnicianCompletedOrderDetails'

/**
 * TechnicianOrdersTable
 * --------------------------------------------------------------
 * Displays technician’s realized orders (COMPLETED / NOT_COMPLETED)
 * in a layout visually consistent with admin OrdersTable.
 */

type OrderRow = Prisma.VectraOrderGetPayload<{
  select: {
    id: true
    orderNumber: true
    type: true
    city: true
    street: true
    date: true
    status: true
    operator: true
  }
}>

type SortField = null | 'date' | 'status'
type SortOrder = null | 'asc' | 'desc'

type Props = {
  searchTerm: string
  autoOpenOrderId?: string
  onAutoOpenHandled?: () => void
  statusFilter: VectraOrderStatus | null
  typeFilter: VectraOrderType | null
}

const TechnicianOrdersTable = ({
  searchTerm,
  autoOpenOrderId,
  onAutoOpenHandled,
  statusFilter,
  typeFilter,
}: Props) => {
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [openIds, setOpenIds] = useState<string[]>([])

  const perPage = 100

  useEffect(() => setPage(1), [statusFilter, typeFilter])

  const {
    data: list,
    isLoading,
    isError,
  } = trpc.vectra.order.getTechnicianRealizedOrders.useQuery({
    page,
    limit: perPage,
    sortField: sortField ?? undefined,
    sortOrder: sortOrder ?? undefined,
    status: statusFilter ?? undefined,
    type: typeFilter ?? undefined,
    searchTerm: searchTerm || undefined,
  })

  const orders: OrderRow[] = useMemo(() => list?.orders ?? [], [list?.orders])

  const totalPages = Math.ceil((list?.totalOrders || 1) / perPage)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    if (autoOpenOrderId && !openIds.includes(autoOpenOrderId)) {
      setOpenIds((prev) => [...prev, autoOpenOrderId])
    }
  }, [autoOpenOrderId, openIds])

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

  /* --------------------------- RENDER --------------------------- */
  if (isLoading)
    return (
      <div className="w-full flex justify-center py-10">
        <LoaderSpinner />
      </div>
    )

  if (isError)
    return (
      <p className="w-full py-6 text-center text-destructive">
        Błąd ładowania danych.
      </p>
    )

  const GRID =
    'hidden md:grid md:grid-cols-[120px_120px_minmax(220px,1fr)_minmax(280px,2fr)_120px]'

  return (
    <div>
      <div className="w-full overflow-x-auto">
        <div className="w-full min-w-fit md:min-w-[900px]">
          {/* Header row */}
          <div
            className={`${GRID} gap-2 px-4 py-2 border-b text-sm uppercase text-start font-semibold text-muted-foreground select-none`}
          >
            <span>Typ</span>
            <span
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleSort('date')}
            >
              Data
              {sortField === 'date' ? (
                sortOrder === 'asc' ? (
                  <TiArrowSortedUp />
                ) : (
                  <TiArrowSortedDown />
                )
              ) : (
                <TiArrowUnsorted className="opacity-60" />
              )}
            </span>
            <span>Nr zlecenia</span>
            <span>Adres</span>
            <span
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => handleSort('status')}
            >
              Status
              {sortField === 'status' ? (
                sortOrder === 'asc' ? (
                  <TiArrowSortedUp />
                ) : (
                  <TiArrowSortedDown />
                )
              ) : (
                <TiArrowUnsorted className="opacity-60" />
              )}
            </span>
          </div>

          {/* Data rows */}
          {orders.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Brak zrealizowanych zleceń.
            </p>
          ) : (
            <Accordion
              type="multiple"
              value={openIds}
              onValueChange={setOpenIds}
            >
              {orders.map((o) => {
                const open = openIds.includes(o.id)
                return (
                  <AccordionItem key={o.id} value={o.id} className="min-w-fit">
                    <AccordionTrigger
                      className="text-sm font-normal uppercase px-4 py-3 hover:bg-muted/50 justify-start cursor-pointer"
                      asChild
                    >
                      <div
                        onClick={() =>
                          setOpenIds(
                            open
                              ? openIds.filter((id) => id !== o.id)
                              : [...openIds, o.id]
                          )
                        }
                        className="w-full"
                      >
                        {/* ===== DESKTOP VIEW ===== */}
                        <div
                          className={`${GRID} w-full gap-2 items-center text-start`}
                        >
                          <span>{orderTypeMap[o.type]}</span>
                          <span>{new Date(o.date).toLocaleDateString()}</span>
                          <span
                            className="min-w-0 whitespace-normal break-words"
                            title={o.orderNumber}
                          >
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={o.orderNumber}
                              autoEscape
                            />
                          </span>
                          <span
                            className="min-w-0 whitespace-normal break-words"
                            title={`${o.city}, ${o.street}`}
                          >
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={`${o.city}, ${o.street}`}
                              autoEscape
                            />
                          </span>
                          <span>
                            <OrderStatusBadge status={o.status} compact />
                          </span>
                        </div>

                        {/* ===== MOBILE VIEW ===== */}
                        <div className="md:hidden flex flex-col gap-1 text-sm border-b last:border-0 pb-3 mb-2 w-full">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col text-[11px] text-muted-foreground uppercase leading-tight">
                              <span>{orderTypeMap[o.type]}</span>
                              <span>{o.operator}</span>
                            </div>
                            <div className="flex flex-col text-[11px] text-right text-muted-foreground leading-tight">
                              <span>
                                {new Date(o.date).toLocaleDateString()}
                              </span>
                              <OrderStatusBadge
                                status={o.status}
                                compact
                                className="mt-1 self-end"
                              />
                            </div>
                          </div>

                          <div className="font-semibold text-sm mt-1 tracking-wide">
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={o.orderNumber}
                              autoEscape
                            />
                          </div>
                          <div className="font-semibold text-xs uppercase">
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={`${o.city}, ${o.street}`}
                              autoEscape
                            />
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="bg-muted/40 px-4 py-3">
                      <TechnicianCompletedOrderDetails
                        orderId={o.id}
                        autoOpen={autoOpenOrderId === o.id}
                        onAutoOpenHandled={onAutoOpenHandled}
                        orderStatus={o.status}
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
