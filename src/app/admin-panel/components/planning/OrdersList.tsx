'use client'

import SearchInput from '@/app/components/shared/SearchInput'
import { Card } from '@/app/components/ui/card'
import { Skeleton } from '@/app/components/ui/skeleton'
import { useSearch } from '@/app/context/SearchContext'
import { timeSlotMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { format } from 'date-fns'
import Highlight from 'react-highlight-words'

type Props = {
  compact?: boolean
}

/**
 * OrdersList
 * Displays a searchable list of unassigned orders.
 * - Search input at the top (hidden during loading with skeleton placeholder)
 * - Each order rendered as draggable card (compact grid layout)
 */
const OrdersList = ({ compact = false }: Props) => {
  const { data: orders = [], isLoading } =
    trpc.order.getUnassignedOrders.useQuery(undefined, { staleTime: 60_000 })

  const { searchTerm, setSearchTerm } = useSearch()

  const filtered = orders.filter((o) => {
    const address = `${o.city} ${o.street}`.toLowerCase()
    const q = searchTerm.toLowerCase()
    return o.orderNumber.toLowerCase().includes(q) || address.includes(q)
  })

  // Base container padding (matches card grid)
  const containerPadding = compact ? 'p-3' : 'p-4'

  return (
    <div
      className={[
        'w-full rounded-lg border bg-card space-y-3',
        containerPadding,
      ].join(' ')}
    >
      {/* --- Header: Search input or skeleton placeholder --- */}
      {isLoading ? (
        <Skeleton className="h-9 w-full rounded-md" />
      ) : (
        <div className="w-full">
          <SearchInput
            placeholder="Szukaj zlecenia"
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      )}

      {/* --- Orders list --- */}
      {isLoading ? (
        <div className="space-y-2">
          {/* Skeleton grid mimic */}
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-md" />
          ))}
        </div>
      ) : (
        <Droppable droppableId="UNASSIGNED_ORDERS" type="ORDER">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                min-h-52 grid gap-3 transition
                ${
                  snapshot.isDraggingOver
                    ? 'bg-muted/60 border border-secondary rounded-lg'
                    : 'bg-card text-card-foreground'
                }
              `}
            >
              {filtered.map((order, index) => (
                <Draggable key={order.id} draggableId={order.id} index={index}>
                  {(drag) => (
                    <Card
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      {...drag.dragHandleProps}
                      className="p-2 cursor-grab active:cursor-grabbing border hover:bg-muted transition bg-background select-none"
                    >
                      {/* Top row: date / order number */}
                      <div className="grid grid-cols-2 text-xs font-medium text-muted-foreground">
                        <span>{format(order.date, 'dd.MM.yyyy')}</span>
                        <span className="text-right text-foreground">
                          <Highlight
                            searchWords={[searchTerm]}
                            textToHighlight={order.orderNumber}
                            autoEscape
                            highlightClassName="bg-yellow-200"
                          />
                        </span>
                      </div>

                      {/* Bottom row: slot / address */}
                      <div className="grid grid-cols-2 mt-1 text-xs">
                        <span className="font-semibold">
                          {timeSlotMap[order.timeSlot]}
                        </span>
                        <span className="text-right truncate">
                          <Highlight
                            searchWords={[searchTerm]}
                            textToHighlight={`${(order.city, order.street)}`}
                            autoEscape
                            highlightClassName="bg-yellow-200"
                          />
                        </span>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  )
}

export default OrdersList
