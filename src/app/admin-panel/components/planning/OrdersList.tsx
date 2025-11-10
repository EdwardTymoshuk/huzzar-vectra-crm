'use client'

import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import { Skeleton } from '@/app/components/ui/skeleton'
import { timeSlotMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { format } from 'date-fns'
import { useState } from 'react'
import Highlight from 'react-highlight-words'
import { usePlanningContext } from './PlanningContext'

/**
 * OrdersList
 * --------------------------------------------------
 * Displays unassigned orders (drag-and-drop).
 * Each order row: Date | Slot | Operator | Address | Order number
 */
const OrdersList = () => {
  const { searchTerm } = usePlanningContext()
  const { data: orders = [], isLoading } =
    trpc.order.getUnassignedOrders.useQuery(undefined)

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const filtered = orders.filter((o) => {
    const address = `${o.city} ${o.street}`.toLowerCase()
    const q = searchTerm.toLowerCase()
    return o.orderNumber.toLowerCase().includes(q) || address.includes(q)
  })

  const handleOpenDetails = (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsSheetOpen(true)
  }

  return (
    <>
      {/* Root container acts as a semantic "table" for assistive technologies */}
      <div
        role="table"
        aria-label="Lista nieprzypisanych zleceń do planowania"
        className="w-full h-full overflow-y-auto rounded-lg border bg-card"
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {' '}
            {/* ✅ horizontal scroll wrapper */}
            <Droppable droppableId="UNASSIGNED_ORDERS" type="ORDER">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  role="rowgroup"
                  className={`min-h-52 transition-colors w-[900px] sm:w-full ${
                    // ✅ fixed min width to enable scroll
                    snapshot.isDraggingOver
                      ? 'bg-muted/60 border border-secondary rounded-lg'
                      : 'bg-card text-card-foreground'
                  }`}
                >
                  {/* Header row */}
                  <div
                    role="row"
                    className="grid grid-cols-5 px-3 py-2 border-b bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky top-0 z-10"
                  >
                    <span role="columnheader">Data</span>
                    <span role="columnheader" className="text-center">
                      Slot
                    </span>
                    <span role="columnheader" className="text-center">
                      Operator
                    </span>
                    <span role="columnheader" className="truncate text-center">
                      Adres
                    </span>
                    <span role="columnheader" className="text-right">
                      Nr zlecenia
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
                          onDoubleClick={() => handleOpenDetails(order.id)}
                          className="grid grid-cols-5 items-center px-3 py-2 text-sm border-b cursor-grab active:cursor-grabbing hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary select-none transition"
                        >
                          <span role="cell" className="text-muted-foreground">
                            {format(order.date, 'dd.MM.yyyy')}
                          </span>
                          <span role="cell" className="text-center font-medium">
                            {timeSlotMap[order.timeSlot] ?? order.timeSlot}
                          </span>
                          <span
                            role="cell"
                            className="text-center text-muted-foreground"
                          >
                            {order.operator ?? '—'}
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
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {/* Empty state */}
                  {filtered.length === 0 && (
                    <div
                      role="row"
                      className="flex justify-center items-center h-24 text-muted-foreground text-sm"
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

      {/* Order details sheet */}
      <OrderDetailsSheet
        orderId={selectedOrderId}
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </>
  )
}

export default OrdersList
