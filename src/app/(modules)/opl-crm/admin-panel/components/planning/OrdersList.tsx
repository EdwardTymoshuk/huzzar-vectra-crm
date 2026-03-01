'use client'

import ConfirmDeleteDialog from '@/app/components/ConfirmDeleteDialog'
import { Button } from '@/app/components/ui/button'
import { Skeleton } from '@/app/components/ui/skeleton'
import { Switch } from '@/app/components/ui/switch'
import {
  OplNetworkOeprator,
  OplOrderStatus,
  OplTimeSlot,
} from '@prisma/client'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { format } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import Highlight from 'react-highlight-words'
import { MdKeyboardArrowRight } from 'react-icons/md'
import { toast } from 'sonner'
import { trpc } from '@/utils/trpc'
import EditOplOrderModal from '../orders/EditOplOrderModal'
import { oplNetworkMap, oplTimeSlotMap } from '../../../lib/constants'
import { usePlanningContext } from './PlanningContext'

type UnassignedOrder = {
  id: string
  orderNumber: string
  city: string
  street: string
  date: Date
  operator: string
  network: OplNetworkOeprator
  status: OplOrderStatus
  timeSlot: OplTimeSlot
}

type Props = {
  orders: UnassignedOrder[]
  isLoading: boolean
  onOrderClick?: (orderId: string) => void
  showAllUnassigned: boolean
  onShowAllUnassignedChange: (value: boolean) => void
}

/**
 * OrdersList
 * --------------------------------------------------
 * Displays unassigned orders (drag-and-drop).
 * Each order row: Date | Slot | Operator | Address | Order number
 */
const OrdersList = ({
  orders,
  isLoading,
  onOrderClick,
  showAllUnassigned,
  onShowAllUnassignedChange,
}: Props) => {
  const { searchTerm } = usePlanningContext()
  const utils = trpc.useUtils()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<UnassignedOrder | null>(
    null
  )

  const deleteOrder = trpc.opl.order.deleteOrder.useMutation()

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        const address = `${o.city} ${o.street}`.toLowerCase()
        const q = searchTerm.toLowerCase()
        return o.orderNumber.toLowerCase().includes(q) || address.includes(q)
      }),
    [orders, searchTerm]
  )

  const handleOpenDetails = (orderId: string) => {
    const query = searchParams.toString()
    const from = query ? `${pathname}?${query}` : pathname
    router.push(
      `/opl-crm/admin-panel/orders/${orderId}?from=${encodeURIComponent(from)}`
    )
  }

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    try {
      await deleteOrder.mutateAsync({ id: orderToDelete.id })
      toast.success('Zlecenie usunięte.')
      await Promise.all([
        utils.opl.order.getAssignedOrders.invalidate(),
        utils.opl.order.getUnassignedOrders.invalidate(),
        utils.opl.order.getOrders.invalidate(),
      ])
    } catch {
      toast.error('Nie udało się usunąć zlecenia.')
    } finally {
      setOrderToDelete(null)
    }
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-end">
        <div className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs">
          <span
            className={!showAllUnassigned ? 'font-semibold text-foreground' : 'text-muted-foreground'}
          >
            Dzisiaj
          </span>
          <Switch
            checked={showAllUnassigned}
            onCheckedChange={onShowAllUnassignedChange}
            aria-label="Przełącz listę nieprzypisanych: Dzisiaj/Wszystkie"
          />
          <span
            className={showAllUnassigned ? 'font-semibold text-foreground' : 'text-muted-foreground'}
          >
            Wszystkie
          </span>
        </div>
      </div>
      {/* Root container acts as a semantic "table" for assistive technologies */}
      <div
        role="table"
        aria-label="Lista nieprzypisanych zleceń do planowania"
        className="w-full h-full overflow-hidden rounded-lg border bg-card"
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
            <div className="h-full overflow-x-auto overflow-y-auto">
            {' '}
            {/* ✅ horizontal scroll wrapper */}
            <Droppable droppableId="UNASSIGNED_ORDERS" type="ORDER">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  role="rowgroup"
                  className={`min-h-52 transition-colors w-[900px] sm:w-full uppercase ${
                    // ✅ fixed min width to enable scroll
                    snapshot.isDraggingOver
                      ? 'bg-muted/60 border border-secondary rounded-lg'
                      : 'bg-card text-card-foreground'
                  }`}
                >
                  {/* Header row */}
                  <div
                    role="row"
                    className="grid grid-cols-[110px_120px_100px_1fr_220px_220px] px-3 py-2 border-b bg-muted text-xs font-semibold text-muted-foreground tracking-wide sticky top-0 z-10 gap-2"
                  >
                    <span role="columnheader">Data</span>
                    <span role="columnheader" className="text-center">
                      Slot
                    </span>
                    <span role="columnheader" className="text-center">
                      Sieć
                    </span>
                    <span role="columnheader" className="truncate text-center">
                      Adres
                    </span>
                    <span role="columnheader" className="text-right">
                      Nr zlecenia
                    </span>
                    <span role="columnheader" className="text-right">
                      Akcje
                    </span>
                  </div>

                  {/* Orders */}
                  {filtered.map((order, index) => (
                    <Draggable
                      key={order.id}
                      draggableId={order.id}
                      index={index}
                    >
                      {(drag) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          {...drag.dragHandleProps}
                          role="row"
                          tabIndex={0}
                          onClick={() => onOrderClick?.(order.id)}
                          className="grid grid-cols-[110px_120px_100px_1fr_220px_220px] items-center px-3 py-2 text-xs border-b cursor-grab active:cursor-grabbing hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary select-none transition gap-2"
                        >
                          <span role="cell" className="text-muted-foreground">
                            {format(order.date, 'dd.MM.yyyy')}
                          </span>
                          <span role="cell" className="text-center font-medium">
                            {oplTimeSlotMap[order.timeSlot] ?? order.timeSlot}
                          </span>
                          <span
                            role="cell"
                            className="text-center text-muted-foreground"
                          >
                            {oplNetworkMap[order.network] ?? order.network}
                          </span>
                          <span role="cell" className="truncate text-center">
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={`${order.city}, ${order.street}`}
                              autoEscape
                              highlightClassName="bg-yellow-200"
                            />
                          </span>
                          <span
                            role="cell"
                            className="text-right font-semibold text-foreground"
                          >
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={order.orderNumber}
                              autoEscape
                              highlightClassName="bg-yellow-200"
                            />
                          </span>
                          <span
                            role="cell"
                            className="flex items-center justify-end gap-1"
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingOrderId(order.id)
                              }}
                            >
                              Edytuj
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-7 px-2 text-[11px]"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOrderToDelete(order)
                              }}
                            >
                              Usuń
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenDetails(order.id)
                              }}
                              aria-label="Przejdź do zlecenia"
                              title="Przejdź do zlecenia"
                            >
                              <MdKeyboardArrowRight className="h-4 w-4" />
                            </Button>
                          </span>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {/* Empty state */}
                  {filtered.length === 0 && (
                    <div
                      role="row"
                      className="flex justify-center items-center h-24 text-muted-foreground text-xs"
                    >
                      <span role="cell">Brak nieprzypisanych zleceń.</span>
                    </div>
                  )}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </div>

      {editingOrderId && (
        <EditOplOrderModal
          open={Boolean(editingOrderId)}
          orderId={editingOrderId}
          onCloseAction={() => setEditingOrderId(null)}
        />
      )}

      <ConfirmDeleteDialog
        open={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        onConfirm={handleDeleteOrder}
        description={
          orderToDelete
            ? `Czy na pewno chcesz usunąć zlecenie "${orderToDelete.orderNumber}" z adresu "${orderToDelete.city}, ${orderToDelete.street}"?`
            : 'Czy na pewno chcesz usunąć to zlecenie?'
        }
      />
    </>
  )
}

export default OrdersList
