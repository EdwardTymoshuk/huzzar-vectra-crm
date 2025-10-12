'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { Badge } from '@/app/components/ui/badge'
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
import { orderTypeMap, statusColorMap, statusMap } from '@/lib/constants'
import { useDebounce } from '@/utils/hooks/useDebounce'
import { useRole } from '@/utils/hooks/useRole'
import { trpc } from '@/utils/trpc'
import { OrderStatus, OrderType, Prisma } from '@prisma/client'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdDelete, MdEdit, MdVisibility } from 'react-icons/md'
import { PiDotsThreeOutlineVerticalFill } from 'react-icons/pi'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import OrderDetailsSheet from '../../../components/shared/orders/OrderDetailsSheet'
import PaginationControls from '../warehouse/history/PaginationControls'
import EditOrderModal from './EditOrderModal'
import OrderAccordionDetails from './OrderAccordionDetails'
import OrdersFilter from './OrdersFilter'

/* ============================================================
 * Types
 * ============================================================ */
type OrderWithAssignedTo = Prisma.OrderGetPayload<{
  include: { assignedTo: { select: { id: true; name: true } } }
}>

type SortField = null | 'date' | 'status'
type SortOrder = null | 'asc' | 'desc'
type Props = { searchTerm: string }

/* ============================================================
 * Guard shell
 * ============================================================ */
const OrdersTable = ({ searchTerm }: Props) => {
  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return <LoaderSpinner />
  return <OrdersTableInner searchTerm={searchTerm} readOnly={isWarehouseman} />
}

export default OrdersTable

/* ============================================================
 * OrdersTableInner — realized orders only (COMPLETED / NOT_COMPLETED)
 * ============================================================ */
const OrdersTableInner = ({
  searchTerm,
  readOnly,
}: {
  searchTerm: string
  readOnly: boolean
}) => {
  /* -------------------------- Local state ------------------------- */
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  // Side panels / dialogs
  const [orderId, setOrderId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithAssignedTo | null>(
    null
  )
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] =
    useState<OrderWithAssignedTo | null>(null)

  /* ---------------------------- Data ------------------------------ */
  const debouncedSearch = useDebounce(searchTerm, 300)

  // ✅ Fetch only realized orders (COMPLETED or NOT_COMPLETED)
  const { data, isLoading, isError } = trpc.order.getRealizedOrders.useQuery({
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
  const deleteOrder = trpc.order.deleteOrder.useMutation()

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
    'grid grid-cols-[110px_120px_160px_140px_minmax(260px,2fr)_120px_130px_40px_40px_20px]'

  /* ============================================================
   * Render
   * ============================================================ */
  return (
    <div>
      {/* Filters & page size */}
      <div className="flex items-center justify-between py-4">
        <OrdersFilter
          setStatusFilter={setStatusFilter}
          setTechnicianFilter={setTechnicianFilter}
          setOrderTypeFilter={setOrderTypeFilter}
        />
        <div className="flex gap-2">
          {[30, 50, 100].map((n) => (
            <Button
              key={n}
              variant={itemsPerPage === n ? 'default' : 'outline'}
              onClick={() => setItemsPerPage(n)}
            >
              {n}
            </Button>
          ))}
        </div>
      </div>

      {/* Scroll wrapper */}
      <div className="w-full overflow-x-auto">
        <div className="w-full min-w-fit md:min-w-[1100px]">
          {/* Header */}
          <div
            className={`${GRID} gap-2 px-4 py-2 border-b min-w-min text-sm text-start font-normal text-muted-foreground select-none`}
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
            <span>Nr zlecenia</span>
            <span>Adres</span>
            <span>Operator</span>
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
            {/* 🧠 P/R header with tooltip explanation */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-help font-medium">
                    P/R
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-[220px] text-center bg-background"
                >
                  <p>
                    <span className="text-success font-semibold">P</span> –
                    dodane przez planer
                  </p>
                  <p>
                    <span className="text-warning font-semibold">R</span> –
                    dodane ręcznie
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span>Akcje</span>
            <span />
          </div>

          {/* Data / Loading / Empty states */}
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
                      className="text-sm px-4 py-3 hover:bg-muted/50 justify-start cursor-pointer"
                      asChild
                    >
                      <div
                        onClick={() => setOpenRowId(open ? null : o.id)}
                        className={`${GRID} w-full gap-2 items-center text-start`}
                      >
                        <span>{orderTypeMap[o.type]}</span>
                        <span>{new Date(o.date).toLocaleDateString()}</span>
                        <span>
                          {o.assignedTo ? (
                            <Badge className="bg-secondary">
                              {o.assignedTo.name}
                            </Badge>
                          ) : (
                            <span className="italic text-muted-foreground">
                              —
                            </span>
                          )}
                        </span>
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
                        <span>{o.operator}</span>
                        <span>
                          <Badge
                            className={statusColorMap[o.status] + ' w-fit'}
                          >
                            {statusMap[o.status]}
                          </Badge>
                        </span>
                        <span>
                          {o.createdSource === 'PLANNER' ? (
                            <span className="text-success font-semibold cursor-help">
                              P
                            </span>
                          ) : (
                            <span className="text-warning font-semibold cursor-help">
                              R
                            </span>
                          )}
                        </span>
                        {/* 🔹 Actions */}
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
                                    setOrderId(o.id)
                                  }}
                                >
                                  <MdVisibility className="mr-2 w-4 h-4 text-warning" />
                                  Podgląd
                                </DropdownMenuItem>
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

                        <ChevronDown className="h-4 w-4 shrink-0 justify-self-end transition-transform duration-200" />
                      </div>
                    </AccordionTrigger>

                    {/* Accordion details */}
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

      {/* Pagination */}
      {data && (
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Side panel */}
      <OrderDetailsSheet
        orderId={orderId}
        open={!!orderId}
        onClose={() => setOrderId(null)}
      />

      {/* Edit modal */}
      {isEditModalOpen && editingOrder && (
        <EditOrderModal
          open={isEditModalOpen}
          order={editingOrder}
          onCloseAction={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Delete dialog */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć to zlecenie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tej operacji nie można cofnąć.
              <br />
              <strong>Nr:</strong> {orderToDelete?.orderNumber}
              <br />
              <strong>Adres:</strong> {orderToDelete?.city},{' '}
              {orderToDelete?.street}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/80"
              onClick={async () => {
                if (!orderToDelete) return
                await deleteOrder.mutateAsync({ id: orderToDelete.id })
                utils.order.getRealizedOrders.invalidate()
                setIsDeleteModalOpen(false)
              }}
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
