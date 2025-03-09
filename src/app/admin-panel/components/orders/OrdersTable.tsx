'use client'

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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination'
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
import { useOrdersSearch } from '@/app/context/OrdersSearchContext'
import { getTimeSlotLabel, statusColorMap, statusMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { OrderStatus, Prisma } from '@prisma/client'
import { useMemo, useState } from 'react'
import {
  MdArrowDownward,
  MdArrowUpward,
  MdDelete,
  MdEdit,
  MdVisibility,
} from 'react-icons/md'
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

const OrdersTable = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [sortField, setSortField] = useState<'date' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null)
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithAssignedTo | null>(
    null
  )

  // For editing status inline:
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null)

  // For editing technician inline:
  const [editingTechId, setEditingTechId] = useState<string | null>(null)

  // Deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] =
    useState<OrderWithAssignedTo | null>(null)

  const { searchTerm } = useOrdersSearch()
  const trpcUtils = trpc.useUtils()

  // tRPC queries and mutations
  const { data, isLoading, isError } = trpc.order.getOrders.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    sortField,
    sortOrder,
    status: statusFilter || undefined,
    assignedToId: technicianFilter || undefined,
  })

  const updateStatusMutation = trpc.order.toggleOrderStatus.useMutation()
  const deleteOrderMutation = trpc.order.deleteOrder.useMutation()

  // Example: specialized mutation to assign a technician
  const assignTechMutation = trpc.order.assignTechnician?.useMutation()

  // If you don't have 'assignTechnician', you can do partial "editOrder" if it allows partial data.

  const orders = (data?.orders ?? []) as OrderWithAssignedTo[]
  const totalPages = Math.ceil((data?.totalOrders || 1) / itemsPerPage)

  // For listing all technicians. If you have a user.getAllUsers or similar:
  const { data: technicians } = trpc.user.getAllUsers?.useQuery() || {
    data: [],
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${order.city} ${order.street}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    )
  }, [orders, searchTerm])

  const handleSort = (field: 'date' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Opens the "Edit order" modal
  const handleEditOrder = (order: OrderWithAssignedTo) => {
    setEditingOrder({
      ...order,
      assignedTo: order.assignedTo || null,
    })
    setIsEditModalOpen(true)
  }

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

    await assignTechMutation.mutateAsync({
      id: orderId,
      assignedToId,
    })

    trpcUtils.order.getOrders.invalidate()
    setEditingTechId(null)
  }

  return (
    <div className="overflow-hidden">
      <div className="flex flex-row items-center w-full justify-between py-4">
        {/* Header with Filtering */}
        <OrdersFilterSort
          setStatusFilter={setStatusFilter}
          setTechnicianFilter={setTechnicianFilter}
        />

        {/* Number of items per page controls */}
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

      {/* Orders Table */}
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
                    <MdArrowUpward className="w-4 h-4 text-gray-500" />
                  ) : (
                    <MdArrowDownward className="w-4 h-4 text-gray-500" />
                  )
                ) : (
                  <MdArrowUpward className="w-4 h-4 text-gray-300" />
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
                    <MdArrowUpward className="w-4 h-4 text-gray-500" />
                  ) : (
                    <MdArrowDownward className="w-4 h-4 text-gray-500" />
                  )
                ) : (
                  <MdArrowUpward className="w-4 h-4 text-gray-300" />
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
                Ładowanie...
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
                <TableCell>{order.orderNumber}</TableCell>
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
                <TableCell>
                  {getTimeSlotLabel(order.operator, order.timeSlot)}
                </TableCell>
                <TableCell>
                  {order.city}, {order.street}
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
                    <Badge className="bg-secondary hover:bg-secondary/80">
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

      {/* Pagination */}
      {orders.length > 0 && (
        <Pagination className="p-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={currentPage > 1 ? '#' : undefined}
                onClick={() =>
                  currentPage > 1 && setCurrentPage((prev) => prev - 1)
                }
                className={
                  currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                }
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 py-1 border rounded">
                Page {currentPage} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={currentPage < totalPages ? '#' : undefined}
                onClick={() =>
                  currentPage < totalPages && setCurrentPage((prev) => prev + 1)
                }
                className={
                  currentPage === totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
              className="bg-red-600 text-white hover:bg-red-700"
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
