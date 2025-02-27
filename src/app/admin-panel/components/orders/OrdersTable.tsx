'use client'

import { Button } from '@/app/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import {
  MdArrowDownward,
  MdArrowUpward,
  MdDelete,
  MdEdit,
  MdVisibility,
} from 'react-icons/md'
import OrderDetailsPanel from './OrderDetailsPanel'
import OrdersFilterSort from './OrdersFilter'

/**
 * Mapping of status values to Polish equivalents.
 */
const statusMap: Record<string, string> = {
  PENDING: 'NIEPRZYPISANE',
  ASSIGNED: 'W TRAKCIE',
  COMPLETED: 'WYKONANE',
  NOT_COMPLETED: 'NIEWYKONANE',
  CANCELED: 'WYCOFANE',
}

/**
 * Mapping of time slots to formatted Polish equivalents.
 */
const timeSlotMap: Record<string, string> = {
  EIGHT_ELEVEN: '8-11',
  ELEVEN_FOURTEEN: '11-14',
  FOURTEEN_SEVENTEEN: '14-17',
  SEVENTEEN_TWENTY: '17-20',
}

const OrdersTable = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [sortField, setSortField] = useState<'date' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null)

  // Fetch orders from API using tRPC
  const { data, isLoading, isError } = trpc.order.getOrders.useQuery({
    page: currentPage,
    limit: itemsPerPage,
    sortField,
    sortOrder,
    status: statusFilter || undefined,
    technician: technicianFilter || undefined,
  })

  const orders = data?.orders || []
  const totalPages = Math.ceil((data?.totalOrders || 1) / itemsPerPage)

  const handleSort = (field: 'date' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Header with Sorting & Filtering */}
      <OrdersFilterSort
        setStatusFilter={setStatusFilter}
        setTechnicianFilter={setTechnicianFilter}
      />

      {/* Number of items per page controls */}
      <div className="flex justify-end gap-2 p-4">
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

      {/* Orders Table */}
      <Table className="border rounded-lg">
        <TableHeader>
          <TableRow>
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
              <TableCell colSpan={7} className="text-center">
                Ładowanie...
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-red-500">
                Błąd ładowania danych.
              </TableCell>
            </TableRow>
          ) : orders.length ? (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.orderNumber}</TableCell>
                <TableCell>
                  {new Date(order.date).toLocaleDateString()}
                </TableCell>
                <TableCell>{statusMap[order.status] || order.status}</TableCell>
                <TableCell>
                  {timeSlotMap[order.timeSlot] || order.timeSlot}
                </TableCell>
                <TableCell>
                  {order.city}, {order.street}
                </TableCell>
                <TableCell>
                  {order.assignedTo?.name || 'Nieprzypisany'}
                </TableCell>
                <TableCell className="flex gap-2">
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
                  <Button size="icon" variant="ghost">
                    <MdEdit className="w-5 h-5 text-success" />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <MdDelete className="w-5 h-5 text-danger" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
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

      <OrderDetailsPanel
        orderId={selectedOrderId}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

export default OrdersTable
