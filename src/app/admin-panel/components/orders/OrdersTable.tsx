'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { statusColorMap, statusMap } from '@/lib/constants'
import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
import { trpc } from '@/utils/trpc'
import { OrderStatus, Prisma } from '@prisma/client'
import { useEffect, useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdDelete, MdEdit, MdVisibility } from 'react-icons/md'
import {
  TiArrowSortedDown,
  TiArrowSortedUp,
  TiArrowUnsorted,
} from 'react-icons/ti'
import PaginationControls from '../warehouse/history/PaginationControls'
import EditOrderModal from './EditOrderModal'
import OrderDetailsPanel from './OrderDetailsPanel'
import OrdersFilterSort from './OrdersFilter'

type OrderWithAssignedTo = Prisma.OrderGetPayload<{
  include: {
    assignedTo: {
      select: {
        id: true
        name: true
      }
    }
  }
}>

type SortField = null | 'date' | 'status'
type SortOrder = null | 'asc' | 'desc'

type Props = {
  searchTerm: string
}

const OrdersTable = ({ searchTerm }: Props) => {
  // Current pagination page
  const [currentPage, setCurrentPage] = useState(1)
  // How many items per page
  const [itemsPerPage, setItemsPerPage] = useState(30)
  // Local states for sorting
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  // States for filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)

  // State for details panel
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // State for "edit order" modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithAssignedTo | null>(
    null
  )

  // Inline edit states (double click on cells)
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)
  const [editingTechId, setEditingTechId] = useState<string | null>(null)

  // Deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] =
    useState<OrderWithAssignedTo | null>(null)

  const trpcUtils = trpc.useUtils()

  // tRPC queries
  const { data, isLoading, isError } = trpc.order.getOrders.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    // Only send sort params if not null
    ...(sortField ? { sortField, sortOrder: sortOrder ?? 'asc' } : {}),
    status: statusFilter || undefined,
    assignedToId: technicianFilter || undefined,
  })

  // We store the actual orders from the query
  const orders = useMemo(() => {
    return (data?.orders ?? []) as OrderWithAssignedTo[]
  }, [data?.orders])

  // Calculate total pages based on totalOrders
  const totalPages = Math.ceil((data?.totalOrders || 1) / itemsPerPage)

  // If the user is on a page > totalPages, we correct it automatically
  useEffect(() => {
    // Example: if current page is bigger than totalPages, jump back to last page
    // You could also do `setCurrentPage(1)` if you always want to go back to page 1
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  // For listing technicians
  const { data: technicians } = trpc.user.getTechnicians?.useQuery() || {
    data: [],
  }

  // Searching on the client side as well
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${order.city} ${order.street}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    )
  }, [orders, searchTerm])

  // Function to cycle sort states (null => asc => desc => null)
  const handleSort = (field: 'date' | 'status') => {
    if (sortField !== field) {
      setSortField(field)
      setSortOrder('asc')
    } else {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      } else {
        setSortOrder('asc')
      }
    }
  }

  // Open "Edit order" modal
  const handleEditOrder = (order: OrderWithAssignedTo) => {
    setEditingOrder({
      ...order,
      assignedTo: order.assignedTo || null,
    })
    setIsEditModalOpen(true)
  }

  // Delete confirmation dialog
  const handleDeleteOrder = (order: OrderWithAssignedTo) => {
    setOrderToDelete(order)
    setIsDeleteModalOpen(true)
  }
  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return
    await deleteOrderMutation.mutateAsync({ id: orderToDelete.id })
    setIsDeleteModalOpen(false)
    setOrderToDelete(null)
    trpcUtils.order.getOrders.invalidate()
  }

  // Mutations
  const updateStatusMutation = trpc.order.toggleOrderStatus.useMutation()
  const deleteOrderMutation = trpc.order.deleteOrder.useMutation()
  const assignTechMutation = trpc.order.assignTechnician?.useMutation()

  // In-line status change
  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return

    const finalStatus =
      newStatus === OrderStatus.PENDING && order.assignedToId
        ? OrderStatus.ASSIGNED
        : newStatus

    await updateStatusMutation.mutateAsync({ id: orderId, status: finalStatus })

    trpcUtils.order.getOrders.invalidate()
    setEditingStatusId(null)
  }

  // In-line technician change
  const handleTechChange = async (orderId: string, newTechId: string) => {
    if (!assignTechMutation) {
      console.warn('No "assignTechnician" mutation found in the router.')
      setEditingTechId(null)
      return
    }
    const assignedToId = newTechId === 'none' ? undefined : newTechId
    await assignTechMutation.mutateAsync({ id: orderId, assignedToId })
    trpcUtils.order.getOrders.invalidate()
    setEditingTechId(null)
  }

  return (
    <div className="overflow-hidden">
      <div className="flex flex-row items-center w-full justify-between py-4">
        {/* Top filters */}
        <OrdersFilterSort
          setStatusFilter={setStatusFilter}
          setTechnicianFilter={setTechnicianFilter}
        />

        {/* Items per page controls */}
        <div className="flex justify-end gap-2">
          {[30, 50, 100].map((size) => (
            <Button
              key={size}
              variant={itemsPerPage === size ? 'default' : 'outline'}
              onClick={() => setItemsPerPage(size)}
            >
              {size}
            </Button>
          ))}
        </div>
      </div>

      <Table className="border rounded-lg">
        <TableHeader>
          <TableRow>
            <TableHead>Operator</TableHead>
            <TableHead>Nr zlecenia</TableHead>
            <TableHead
              onClick={() => handleSort('date')}
              className="cursor-pointer whitespace-nowrap px-4 py-2"
            >
              <div className="flex items-center gap-1">
                <span>Data</span>
                {sortField === 'date' ? (
                  sortOrder === 'asc' ? (
                    <TiArrowSortedUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <TiArrowSortedDown className="w-4 h-4 text-gray-500" />
                  )
                ) : (
                  <TiArrowUnsorted className="w-4 h-4 text-gray-300 hover:text-gray-400" />
                )}
              </div>
            </TableHead>

            <TableHead
              onClick={() => handleSort('status')}
              className="cursor-pointer whitespace-nowrap px-4 py-2"
            >
              <div className="flex items-center gap-1">
                <span>Status</span>
                {sortField === 'status' ? (
                  sortOrder === 'asc' ? (
                    <TiArrowSortedUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <TiArrowSortedDown className="w-4 h-4 text-gray-500" />
                  )
                ) : (
                  <TiArrowUnsorted className="w-4 h-4 text-gray-300 hover:text-gray-400" />
                )}
              </div>
            </TableHead>
            <TableHead>Slot czasowy</TableHead>
            <TableHead>Adres</TableHead>
            <TableHead>Technik</TableHead>
            <TableHead>Akcje</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                <LoaderSpinner />
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-danger">
                Błąd ładowania danych.
              </TableCell>
            </TableRow>
          ) : orders.length ? (
            filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.operator}</TableCell>
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape={true}
                    textToHighlight={order.orderNumber}
                  />
                </TableCell>
                <TableCell>
                  {new Date(order.date).toLocaleDateString()}
                </TableCell>
                {/* STATUS - in-line editing */}
                <TableCell
                  onDoubleClick={() => setEditingStatusId(order.id)}
                  className="cursor-pointer"
                >
                  {editingStatusId === order.id ? (
                    <Select
                      defaultValue={order.status}
                      onValueChange={(value) =>
                        handleStatusChange(order.id, value as OrderStatus)
                      }
                      onOpenChange={(isOpen) => {
                        if (!isOpen) {
                          setEditingStatusId(null)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusMap).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusColorMap[order.status]}>
                      {statusMap[order.status]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-nowrap">
                  {getTimeSlotLabel(order.timeSlot)}
                </TableCell>
                <TableCell>
                  <Highlight
                    highlightClassName="bg-yellow-200"
                    searchWords={[searchTerm]}
                    autoEscape={true}
                    textToHighlight={`${order.city}, ${order.street}`}
                  />
                </TableCell>

                {/* TECHNICIAN - in-line editing */}
                <TableCell
                  onDoubleClick={() => setEditingTechId(order.id)}
                  className="cursor-pointer"
                >
                  {editingTechId === order.id ? (
                    <Select
                      defaultValue={
                        order.assignedTo?.id ? order.assignedTo.id : 'none'
                      }
                      onValueChange={(value) =>
                        handleTechChange(order.id, value)
                      }
                      onOpenChange={(isOpen) => {
                        if (!isOpen) {
                          setEditingTechId(null)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nieprzypisany</SelectItem>
                        {technicians?.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : order.assignedTo ? (
                    <Badge className="bg-secondary hover:bg-secondary/80 text-center">
                      {order.assignedTo.name}
                    </Badge>
                  ) : (
                    'Nieprzypisany'
                  )}
                </TableCell>

                <TableCell className="flex gap-2">
                  {/* View details */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setSelectedOrderId(order.id)
                      setIsPanelOpen(true)
                    }}
                  >
                    <MdVisibility className="w-5 h-5 text-warning" />
                  </Button>
                  {/* Edit modal */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEditOrder(order)}
                  >
                    <MdEdit className="w-5 h-5 text-success" />
                  </Button>
                  {/* Delete */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteOrder(order)}
                  >
                    <MdDelete className="w-5 h-5 text-danger" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                Brak danych do wyświetlenia.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {data && (
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Order details side panel */}
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

      {/* DELETE ALERT DIALOG */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Czy na pewno chcesz usunąć to zlecenie?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-danger text-base">
                Usunięcie tego zlecenia jest nieodwracalne.
              </span>
              <br />
              <br />
              <strong>Nr zlecenia:</strong> {orderToDelete?.orderNumber} <br />
              <strong>Adres:</strong> {orderToDelete?.city},{' '}
              {orderToDelete?.street}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteOrder}
              className="bg-danger text-white hover:bg-danger/80"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OrdersTable
