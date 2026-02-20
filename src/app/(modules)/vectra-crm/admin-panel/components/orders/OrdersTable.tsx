'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import OrderStatusBadge from '@/app/components/order/OrderStatusBadge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { useDebounce } from '@/utils/hooks/useDebounce'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { Prisma, VectraOrderStatus, VectraOrderType } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdDelete, MdEdit } from 'react-icons/md'
import { PiDotsThreeOutlineVerticalFill } from 'react-icons/pi'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import { toast } from 'sonner'
import PaginationControls from '../../../../../components/navigation/PaginationControls'
import { orderTypeMap } from '../../../lib/constants'
import EditOrderModal from './EditOrderModal'
import OrderAccordionDetails from './OrderAccordionDetails'

/**
 * OrdersTable
 * --------------------------------------------------
 * Displays realized orders (COMPLETED / NOT_COMPLETED).
 * Supports sorting, pagination, and inline accordion details.
 * Filters (status, type, technician) are handled externally in OrdersPage.
 */

/* =============================== TYPES =============================== */

type OrderWithAssignedTo = Prisma.VectraOrderGetPayload<{
  include: {
    assignedTo: {
      include: {
        user: true
      }
    }
  }
}>

type SortField = null | 'date' | 'status'
type SortOrder = null | 'asc' | 'desc'

interface OrdersTableProps {
  searchTerm: string
  statusFilter: VectraOrderStatus | null
  technicianFilter: string | null
  orderTypeFilter: VectraOrderType | null
}

/* =============================== MAIN COMPONENT =============================== */

const OrdersTable = ({
  searchTerm,
  statusFilter,
  technicianFilter,
  orderTypeFilter,
}: OrdersTableProps) => {
  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return <LoaderSpinner />
  return (
    <OrdersTableInner
      searchTerm={searchTerm}
      readOnly={isWarehouseman}
      statusFilter={statusFilter}
      technicianFilter={technicianFilter}
      orderTypeFilter={orderTypeFilter}
    />
  )
}

export default OrdersTable

/* ============================ INNER TABLE ============================ */

const OrdersTableInner = ({
  searchTerm,
  readOnly,
  statusFilter,
  technicianFilter,
  orderTypeFilter,
}: {
  searchTerm: string
  readOnly: boolean
  statusFilter: VectraOrderStatus | null
  technicianFilter: string | null
  orderTypeFilter: VectraOrderType | null
}) => {
  /* -------------------------- Local state ------------------------- */
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  // Dialogs / panels
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithAssignedTo | null>(
    null
  )
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] =
    useState<OrderWithAssignedTo | null>(null)

  /* ---------------------------- Data ------------------------------ */
  const debouncedSearch = useDebounce(searchTerm, 300)
  const itemsPerPage = 100 // ✅ fixed per page

  const { data, isLoading, isError } =
    trpc.vectra.order.getRealizedOrders.useQuery({
      page: currentPage,
      limit: itemsPerPage,
      ...(sortField ? { sortField, sortOrder: sortOrder ?? 'asc' } : {}),
      assignedToId: technicianFilter ?? undefined,
      type: orderTypeFilter ?? undefined,
      status: statusFilter ?? undefined,
      searchTerm: debouncedSearch || undefined,
    })

  const orders = useMemo<OrderWithAssignedTo[]>(
    () => (data?.orders ?? []) as OrderWithAssignedTo[],
    [data?.orders]
  )

  const totalPages = Math.max(
    1,
    Math.ceil((data?.totalOrders ?? 0) / itemsPerPage)
  )

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  /* -------------------------- Mutations --------------------------- */
  const utils = trpc.useUtils()
  const deleteOrder = trpc.vectra.order.deleteOrder.useMutation({
    onSuccess: () => {
      toast.success('Zlecenie zostało usunięte.')
      utils.vectra.order.getRealizedOrders.invalidate()
    },
    onError: (err) => {
      console.error('[deleteOrder error]', err)

      if (err.data?.code === 'NOT_FOUND') {
        toast.error('Zlecenie nie istnieje lub zostało już usunięte.')
      } else if (err.data?.code === 'BAD_REQUEST') {
        toast.error('Nie można usunąć zlecenia, które zostało wykonane.')
      } else if (err.data?.code === 'CONFLICT') {
        toast.error('Nie można usunąć zlecenia powiązanego z innymi rekordami.')
      } else {
        toast.error('Wystąpił nieoczekiwany błąd podczas usuwania zlecenia.')
      }

      setIsDeleteModalOpen(false)
    },
  })

  /* --------------------------- Handlers --------------------------- */
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

  /* ---------------------------- Layout ---------------------------- */
  const GRID =
    'grid grid-cols-[40px_120px_220px_220px_220px_minmax(260px,2fr)_80px_40px_40px]'

  /* ---------------------------- Render ---------------------------- */
  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Scroll wrapper */}
      <div className="w-full min-h-0 flex-1 overflow-x-auto uppercase">
        <div className="w-full min-w-fit md:min-w-[1100px] h-full min-h-0 flex flex-col">
          {/* Header row */}
          <div
            className={`${GRID} gap-2 px-4 py-2 border-b min-w-min text-xs uppercase text-start font-semibold text-muted-foreground select-none shrink-0 sticky top-0 z-20 bg-background`}
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
            <span>Technik</span>
            <span>Id klienta</span>
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
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help font-semibold">
                    P/R
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[220px] text-center bg-background"
                >
                  <p>
                    <span className="text-success font-semibold">P</span> – z
                    planera
                  </p>
                  <p>
                    <span className="text-warning font-semibold">R</span> –
                    ręcznie
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>Akcje</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Data states */}
            {isLoading ? (
              <div className="w-full py-10 flex items-center justify-center">
                <LoaderSpinner />
              </div>
            ) : isError ? (
              <p className="py-10 text-center text-danger">
                Błąd ładowania danych.
              </p>
            ) : !orders.length ? (
              <p className="py-10 text-center text-muted-foreground">
                Brak zrealizowanych zleceń do wyświetlenia.
              </p>
            ) : (
              <Accordion type="multiple">
                {orders.map((o) => {
                  const open = openRowId === o.id
                  return (
                    <AccordionItem key={o.id} value={o.id} className="min-w-fit">
                      <AccordionTrigger
                        className="text-xs font-normal uppercase px-4 py-3 hover:bg-muted/50 justify-start cursor-pointer"
                        asChild
                      >
                        <div
                          onClick={() => setOpenRowId(open ? null : o.id)}
                          className={`${GRID} w-full gap-2 items-center text-start`}
                        >
                          <span>
                            {orderTypeMap[o.type]
                              .trim()
                              .split('')[0]
                              .toUpperCase()}
                          </span>
                          <span>{new Date(o.date).toLocaleDateString()}</span>
                          <span>
                            {o.assignedTo ? o.assignedTo.user.name : '-'}
                          </span>
                          <span>{o.clientId}</span>
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
                            className="min-w-0 w-full whitespace-normal break-words"
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
                          <span>
                            {o.createdSource === 'PLANNER' ? (
                              <span className="text-success font-semibold">
                                P
                              </span>
                            ) : (
                              <span className="text-warning font-semibold">
                                R
                              </span>
                            )}
                          </span>

                          {/* 🔹 Row actions */}
                          <span className="text-right">
                            {!readOnly && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                    <PiDotsThreeOutlineVerticalFill className="w-5 h-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-background">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingOrder(o)
                                      setIsEditModalOpen(true)
                                    }}
                                  >
                                    <MdEdit className="mr-2 w-4 h-4 text-success" />
                                    Edytuj
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setOrderToDelete(o)
                                      setIsDeleteModalOpen(true)
                                    }}
                                    className="text-danger"
                                  >
                                    <MdDelete className="mr-2 w-4 h-4 text-danger" />
                                    Usuń
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="bg-muted/40 px-4 py-3">
                        <OrderAccordionDetails order={{ id: o.id }} />
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {data && (
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Edit modal */}
      {isEditModalOpen && editingOrder && (
        <EditOrderModal
          open={isEditModalOpen}
          order={editingOrder}
          onCloseAction={() => setIsEditModalOpen(false)}
        />
      )}

      <ConfirmDeleteDialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!orderToDelete) return
          try {
            await deleteOrder.mutateAsync({ id: orderToDelete.id })
            toast.success('Zlecenie usunięte.')
            utils.vectra.order.getRealizedOrders.invalidate()
          } catch (err) {
            // ❗ Error already handled inside mutation handler
            console.error('[OrdersTable delete error]', err)
          }
          setIsDeleteModalOpen(false)
        }}
        description={`Czy na pewno chcesz usunąć zlecenie "${orderToDelete?.orderNumber}" z adresu "${orderToDelete?.city}, ${orderToDelete?.street}"? Tej operacji nie można cofnąć.`}
      />
    </div>
  )
}
