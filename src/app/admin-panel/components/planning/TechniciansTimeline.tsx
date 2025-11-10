'use client'

import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import { Button } from '@/app/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { operatorColorsMap } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { TechnicianAssignment } from '@/types'
import { matchSearch } from '@/utils/searchUtils'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Highlight from 'react-highlight-words'
import { MdClose } from 'react-icons/md'

type Props = {
  assignments: TechnicianAssignment[]
  onUnassign: (orderId: string) => void
  searchTerm?: string
}

const HOUR_START = 8
const HOUR_END = 21
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i
)

const TIME_SLOT_MAP: Record<string, [number, number]> = {
  EIGHT_TEN: [8, 10],
  TEN_TWELVE: [10, 12],
  TWELVE_FOURTEEN: [12, 14],
  FOURTEEN_SIXTEEN: [14, 16],
  SIXTEEN_EIGHTEEN: [16, 18],
  EIGHTEEN_TWENTY: [18, 20],
  EIGHTEEN_TWENTYONE: [18, 21],
  NINE_TWELVE: [9, 12],
  TWELVE_FIFTEEN: [12, 15],
  FIFTEEN_EIGHTEEN: [15, 18],
}

function parseSlot(slot: string) {
  if (TIME_SLOT_MAP[slot])
    return { start: TIME_SLOT_MAP[slot][0], end: TIME_SLOT_MAP[slot][1] }
  const m = slot.match(/\d+/g)
  if (m && m.length >= 2) return { start: parseInt(m[0]), end: parseInt(m[1]) }
  return { start: 8, end: 9 }
}

function layoutOrders(tech: TechnicianAssignment, searchTerm?: string) {
  const flat: {
    id: string
    label: string
    address: string
    operator: string
    start: number
    end: number
  }[] = []

  tech.slots.forEach((slot) => {
    const { start, end } = parseSlot(slot.timeSlot)
    slot.orders.forEach((o) =>
      flat.push({
        id: o.id,
        label: o.orderNumber,
        address: o.address,
        operator: o.operator,
        start,
        end,
      })
    )
  })

  // 🔍 optional search filtering inside timeline items
  const visible = searchTerm?.trim()
    ? flat.filter((o) => matchSearch(searchTerm, o.label, o.address))
    : flat

  visible.sort((a, b) => a.start - b.start)

  const lanes: number[] = []
  const placed = visible.map((order) => {
    let lane = 0
    for (; lane < lanes.length; lane++) {
      if (lanes[lane] <= order.start) break
    }
    if (lane === lanes.length) lanes.push(order.end)
    else lanes[lane] = order.end
    return { ...order, lane }
  })

  return { items: placed, laneCount: Math.max(1, lanes.length) }
}

/**
 * TechniciansTimeline
 * - each row is droppable zone
 * - fixed height (prevents "jumping")
 * - drag highlight + red delete icon
 */
const TechniciansTimeline = ({
  assignments,
  onUnassign,
  searchTerm = '',
}: Props) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const LANE_HEIGHT = 48
  const LANE_GAP = 8
  const HOUR_WIDTH = 100

  const filteredAssignments = useMemo(() => {
    if (!searchTerm.trim()) return assignments

    return assignments
      .map((tech) => {
        const matchesTechnician = matchSearch(searchTerm, tech.technicianName)

        const filteredSlots = tech.slots
          .map((slot) => ({
            ...slot,
            orders: slot.orders.filter((o) =>
              matchSearch(searchTerm, o.orderNumber, o.address)
            ),
          }))
          .filter((slot) => slot.orders.length > 0)

        if (matchesTechnician || filteredSlots.length > 0) {
          return {
            ...tech,
            slots: filteredSlots.length > 0 ? filteredSlots : tech.slots,
          }
        }

        return null
      })
      .filter(Boolean) as typeof assignments
  }, [assignments, searchTerm])

  return (
    <TooltipProvider>
      <div className="w-full min-w-0 max-h-full">
        <div
          className="overflow-x-auto overflow-y-hidden border rounded-md bg-background shadow-inner inline-flex"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
        >
          <div
            className="relative"
            style={{
              width: `${200 + HOURS.length * HOUR_WIDTH}px`,
              minWidth: '100%',
            }}
          >
            {/* Header */}
            <div
              className="grid border-b bg-muted font-medium text-sm sticky top-0 z-10"
              style={{
                gridTemplateColumns: `200px repeat(${HOURS.length}, ${HOUR_WIDTH}px)`,
              }}
            >
              <div className="p-2 border-r text-center bg-muted">TECHNIK</div>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="border-r text-center py-1 border-gray-300 bg-muted/40"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {filteredAssignments.map((tech, rowIdx) => {
              const { items, laneCount } = layoutOrders(tech, searchTerm)
              const rowHeight = laneCount * (LANE_HEIGHT + LANE_GAP)

              return (
                <Droppable
                  key={tech.technicianId ?? tech.technicianName}
                  droppableId={tech.technicianId ?? 'unassigned'}
                  type="ORDER"
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'grid border-b py-[2px] text-sm relative transition-colors',
                        rowIdx % 2 === 0 ? 'bg-background' : 'bg-background/50',
                        snapshot.isDraggingOver &&
                          'bg-muted/70 ring-2 ring-secondary scale-y-105'
                      )}
                      style={{
                        gridTemplateColumns: `200px repeat(${HOURS.length}, ${HOUR_WIDTH}px)`,
                        height: `${rowHeight}px`,
                        minHeight: `${rowHeight}px`,
                      }}
                    >
                      {/* Technician name */}
                      <div className="border-r p-2 first: bg-muted font-semibold flex items-start justify-start whitespace-nowrap">
                        {matchSearch(searchTerm, tech.technicianName) ? (
                          <Highlight
                            searchWords={[searchTerm]}
                            textToHighlight={tech.technicianName}
                            autoEscape
                            highlightClassName="bg-yellow-200"
                          />
                        ) : (
                          tech.technicianName
                        )}
                      </div>

                      {/* Hour grid + orders */}
                      <div className="relative col-span-13 h-full">
                        {HOURS.map((_, i) => (
                          <div
                            key={i}
                            className="border-r border-gray-200 absolute top-0 bottom-0"
                            style={{
                              left: `${i * HOUR_WIDTH}px`,
                              width: `${HOUR_WIDTH}px`,
                            }}
                          />
                        ))}

                        {items.map((order, idx) => {
                          const color =
                            operatorColorsMap[
                              order.operator?.trim().toUpperCase()
                            ] ?? operatorColorsMap.DEFAULT
                          const startCol = Math.max(
                            1,
                            order.start - HOUR_START + 1
                          )
                          const endCol = Math.min(
                            HOURS.length + 1,
                            order.end - HOUR_START + 1
                          )

                          return (
                            <Draggable
                              key={order.id}
                              draggableId={order.id}
                              index={idx}
                            >
                              {(drag, snapshot) => {
                                const content = (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        ref={drag.innerRef}
                                        {...drag.draggableProps}
                                        {...drag.dragHandleProps}
                                        className={cn(
                                          'absolute truncate rounded-md shadow-sm border border-gray-300 overflow-hidden px-2 py-2 text-xs text-white font-medium transition-all cursor-grab active:cursor-grabbing group',
                                          snapshot.isDragging &&
                                            'scale-105 shadow-lg z-50 ring-2 ring-secondary'
                                        )}
                                        style={{
                                          left: `${
                                            (startCol - 1) * HOUR_WIDTH
                                          }px`,
                                          width: `${
                                            (endCol - startCol) * HOUR_WIDTH
                                          }px`,
                                          top: `${
                                            order.lane *
                                            (LANE_HEIGHT + LANE_GAP)
                                          }px`,
                                          backgroundColor: color,
                                          ...drag.draggableProps.style,
                                        }}
                                        onDoubleClick={() => {
                                          setSelectedOrderId(order.id)
                                          setIsSheetOpen(true)
                                        }}
                                      >
                                        {/* Header + delete */}
                                        <div className="flex justify-between items-start">
                                          <div className="truncate font-semibold pr-2">
                                            <Highlight
                                              highlightClassName="bg-yellow-200"
                                              searchWords={[searchTerm]}
                                              autoEscape
                                              textToHighlight={order.label}
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onUnassign(order.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0 h-4 w-4 min-w-0 text-danger hover:bg-danger/80"
                                          >
                                            <MdClose className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>

                                        {/* Address */}
                                        <div className="truncate text-[11px] opacity-80">
                                          {order.address}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-sm"
                                    >
                                      <p className="font-semibold">
                                        {order.label}
                                      </p>
                                      <p>{order.address}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {order.start}:00–{order.end}:00
                                      </p>
                                      <p className="text-xs mt-1">
                                        Operator: {order.operator}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                )

                                return snapshot.isDragging
                                  ? createPortal(content, document.body)
                                  : content
                              }}
                            </Draggable>
                          )
                        })}

                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </div>
      </div>

      {/* 🧾 Order Details Sheet */}
      <OrderDetailsSheet
        orderId={selectedOrderId}
        open={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false)
          setSelectedOrderId(null)
        }}
      />
    </TooltipProvider>
  )
}

export default TechniciansTimeline
