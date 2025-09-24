// src/app/admin-panel/components/orders/OrdersTable.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { orderTypeMap, statusColorMap, statusMap } from '@/lib/constants'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { useDebounce } from '@/utils/hooks/useDebounce'
import { useRole } from '@/utils/roleHelpers/useRole'
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
import PaginationControls from '../warehouse/history/PaginationControls'
import EditOrderModal from './EditOrderModal'
import OrderAccordionDetails from './OrderAccordionDetails'
import OrderDetailsPanel from './OrderDetailsPanel'
import OrdersFilter from './OrdersFilter'

/* ============================== Types ============================== */
type OrderWithAssignedTo = Prisma.OrderGetPayload<{
  include: { assignedTo: { select: { id: true; name: true } } }
}>

type SortField = null | 'date' | 'status'
type SortOrder = null | 'asc' | 'desc'
type Props = { searchTerm: string }

type TechnicianLite = { id: string; name: string }

/* ============================ Guard shell ========================== */
const OrdersTable = ({ searchTerm }: Props) => {
  const { isWarehouseman, isLoading: isPageLoading } = useRole()
  if (isPageLoading) return <LoaderSpinner />
  return <OrdersTableInner searchTerm={searchTerm} readOnly={isWarehouseman} />
}

export default OrdersTable

/* ============================ Inner table ========================== */
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
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [editingTechId, setEditingTechId] = useState<string | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)

  // Side panels / dialogs
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithAssignedTo | null>(
    null
  )
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] =
    useState<OrderWithAssignedTo | null>(null)

  /* ---------------------------- Data ------------------------------ */
  const debouncedSearch = useDebounce(searchTerm, 300)

  const { data, isLoading, isError } = trpc.order.getOrders.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    ...(sortField ? { sortField, sortOrder: sortOrder ?? 'asc' } : {}),
    status: statusFilter ?? undefined,
    assignedToId: technicianFilter ?? undefined,
    type: orderTypeFilter ?? undefined,
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

  const { data: techniciansData } = trpc.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })
  const technicians: TechnicianLite[] = useMemo(
    () => (techniciansData ?? []).map((t) => ({ id: t.id, name: t.name })),
    [techniciansData]
  )

  /* -------------------------- Mutations --------------------------- */
  const utils = trpc.useUtils()
  const updateStatus = trpc.order.toggleOrderStatus.useMutation()
  const deleteOrder = trpc.order.deleteOrder.useMutation()
  const assignTech = trpc.order.assignTechnician.useMutation()

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

  /* ---------------------------- Render ---------------------------- */
  const GRID =
    'grid grid-cols-[120px_90px_140px_110px_120px_110px_minmax(260px,2fr)_minmax(160px,1fr)_max-content_40px]'

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
        <div className="w-full md:min-w-[1050px]">
          {/* Header */}
          <div
            className={`${GRID} gap-2 px-4 py-2 border-b min-w-min text-sm text-start font-normal text-muted-foreground select-none`}
          >
            <span>Operator</span>
            <span>Typ</span>
            <span>Nr zlecenia</span>
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
            <span>Slot</span>
            <span>Adres</span>
            <span>Technik</span>
            <span>Akcje</span>
            <span />
          </div>

          {/* List / states */}
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
              Brak danych do wyświetlenia.
            </p>
          ) : (
            <Accordion type="multiple">
              {orders.map((o) => {
                const open = openRowId === o.id
                return (
                  <AccordionItem key={o.id} value={o.id}>
                    <AccordionTrigger
                      className="text-sm px-4 py-3 hover:bg-muted/50 justify-start cursor-pointer"
                      asChild
                    >
                      <div
                        onClick={() => setOpenRowId(open ? null : o.id)}
                        className={`${GRID} w-full gap-2 items-center text-start`}
                      >
                        <span>{o.operator}</span>
                        <span>{orderTypeMap[o.type]}</span>
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
                        <span>{new Date(o.date).toLocaleDateString()}</span>
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingStatusId(o.id)
                          }}
                        >
                          {editingStatusId === o.id ? (
                            <Select
                              defaultValue={o.status}
                              onValueChange={(v) =>
                                updateStatus.mutate(
                                  { id: o.id, status: v as OrderStatus },
                                  {
                                    onSuccess: () =>
                                      utils.order.getOrders.invalidate(),
                                  }
                                )
                              }
                              onOpenChange={(isO) =>
                                !isO && setEditingStatusId(null)
                              }
                            >
                              <SelectTrigger className="w-[110px] h-7">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusMap).map(([k, l]) => (
                                  <SelectItem key={k} value={k}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              className={statusColorMap[o.status] + ' w-fit'}
                            >
                              {statusMap[o.status]}
                            </Badge>
                          )}
                        </span>
                        <span>{getTimeSlotLabel(o.timeSlot)}</span>
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
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingTechId(o.id)
                          }}
                        >
                          {editingTechId === o.id ? (
                            <Select
                              defaultValue={o.assignedTo?.id || 'none'}
                              onValueChange={(v) =>
                                assignTech.mutate(
                                  {
                                    id: o.id,
                                    assignedToId: v === 'none' ? undefined : v,
                                  },
                                  {
                                    onSuccess: () =>
                                      utils.order.getOrders.invalidate(),
                                  }
                                )
                              }
                              onOpenChange={(isO) =>
                                !isO && setEditingTechId(null)
                              }
                            >
                              <SelectTrigger className="w-[150px] h-7">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Nieprzypisany
                                </SelectItem>
                                {technicians.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : o.assignedTo ? (
                            <Badge className="bg-secondary">
                              {o.assignedTo.name}
                            </Badge>
                          ) : (
                            <span className="italic text-muted-foreground">
                              —
                            </span>
                          )}
                        </span>
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
                                    setSelectedOrderId(o.id)
                                    setIsPanelOpen(true)
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
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
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

      {/* Pagination */}
      {data && (
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Side panel */}
      <OrderDetailsPanel
        orderId={selectedOrderId}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
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
                utils.order.getOrders.invalidate()
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
