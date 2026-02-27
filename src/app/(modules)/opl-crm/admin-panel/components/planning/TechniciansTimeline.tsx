'use client'

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
import { cn } from '@/lib/utils'
import { OplTechnicianAssignment } from '@/types/opl-crm'
import { matchSearch } from '@/utils/searchUtils'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Highlight from 'react-highlight-words'
import { MdClose } from 'react-icons/md'
import { MoreHorizontal } from 'lucide-react'
import { oplTimeSlotMap } from '../../../lib/constants'
import { PLANNER_ORDER_STATUS_COLORS } from './constants'

type Props = {
  assignments: OplTechnicianAssignment[]
  onUnassign: (orderId: string) => void
  searchTerm?: string
  onOrderClick?: (orderId: string) => void
}

/** Timeline configuration constants */
const HOUR_START = 8
const HOUR_END = 20
const HOURS = Array.from(
  { length: HOUR_END - HOUR_START + 1 },
  (_, i) => HOUR_START + i
)

/**
 * Utility: parses slot enum to numeric start/end hours.
 */
function parseSlot(slot: string) {
  const label = oplTimeSlotMap[slot as keyof typeof oplTimeSlotMap]
  if (label) {
    const match = label.match(/(\d{2}):\d{2}\s*-\s*(\d{2}):\d{2}/)
    if (match) {
      return {
        start: Number(match[1]),
        end: Number(match[2]),
      }
    }
  }
  return { start: 8, end: 9 }
}

/**
 * Prepares technician orders into positioned "lanes" for timeline layout.
 */
function layoutOrders(tech: OplTechnicianAssignment, searchTerm?: string) {
  const flat: {
    id: string
    label: string
    address: string
    operator: string
    start: number
    end: number
    status: string
    completedByName?: string | null
    techniciansLabel?: string | null
  }[] = []

  tech.slots.forEach((slot) => {
    const { start, end } = parseSlot(slot.timeSlot)
    slot.orders.forEach((o) => {
      const isTeamRow = (tech.teamTechnicianIds?.length ?? 0) > 1
      const isTeamOrder = (o.assignedTechnicians?.length ?? 0) > 1
      if (!isTeamRow && isTeamOrder) {
        return
      }
      if (
        !isTeamRow &&
        o.primaryTechnicianId &&
        tech.technicianId &&
        o.primaryTechnicianId !== tech.technicianId
      ) {
        return
      }

      flat.push({
        id: o.id,
        label: o.orderNumber,
        address: o.address,
        operator: o.operator,
        start,
        end,
        status: o.status,
        completedByName: o.completedByName ?? null,
        techniciansLabel:
          o.assignedTechnicians && o.assignedTechnicians.length > 1
            ? o.assignedTechnicians.map((t) => t.name).join(' / ')
            : null,
      })
    })
  })

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
 * --------------------------------------------------------------
 * Timeline view for all technicians.
 * - Each row = one technician (droppable zone)
 * - Left column sticky (technician names)
 * - Top header sticky (hours)
 * - Orders draggable between technicians
 */
const TechniciansTimeline = ({
  assignments,
  onUnassign,
  searchTerm = '',
  onOrderClick,
}: Props) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isMobile, setIsMobile] = useState(false)

  const LANE_HEIGHT = 30
  const LANE_GAP = 6
  const HOUR_WIDTH = isMobile ? 52 : 75
  const TECH_COL_WIDTH = isMobile ? 124 : 200

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  /**
   * Utility: determines whether order should be locked from drag & unassign.
   */
  const isLockedStatus = (status: string): boolean => {
    return status === 'COMPLETED' || status === 'NOT_COMPLETED'
  }

  const handleGoToOrder = (orderId: string) => {
    const query = searchParams.toString()
    const from = query ? `${pathname}?${query}` : pathname
    router.push(
      `/opl-crm/admin-panel/orders/${orderId}?from=${encodeURIComponent(from)}`
    )
  }

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
      <div className="w-full min-w-0 h-full max-h-full relative flex">
        {/* ---------------------------------------------------
         * MAIN SCROLLABLE TIMELINE SECTION
         * --------------------------------------------------- */}
        <div
          className="overflow-x-auto overflow-y-auto border rounded-md bg-background shadow-inner flex-1"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          <div
            className="relative"
            style={{
              width: `${TECH_COL_WIDTH + HOURS.length * HOUR_WIDTH}px`,
            }}
          >
            {/* ---------------------------------------------------
             * Fixed Header (hours) + Fixed Left Column (Technicians)
             * --------------------------------------------------- */}
            <div className="flex border-b font-medium text-xs sticky top-0 z-30 bg-muted items-center ">
              <div
                className="flex-shrink-0 border-r py-2 my-auto text-center bg-muted sticky left-0 z-40"
                style={{ width: `${TECH_COL_WIDTH}px` }}
              >
                TECHNIK
              </div>
              <div
                className="flex overflow-x-hidden"
                style={{ width: `${HOURS.length * HOUR_WIDTH}px` }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-r text-center py-1 border-gray-300 bg-muted/80 backdrop-blur-sm"
                    style={{ width: `${HOUR_WIDTH}px` }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            </div>

            {/* ---------------------------------------------------
             * Timeline Rows
             * --------------------------------------------------- */}
            {filteredAssignments.map((tech, rowIdx) => {
              const { items, laneCount } = layoutOrders(tech, searchTerm)
              const rowHeight = laneCount * (LANE_HEIGHT + LANE_GAP)

              return (
                <Droppable
                  key={tech.rowId ?? tech.technicianId ?? tech.technicianName}
                  droppableId={
                    tech.dropTargetId ?? tech.technicianId ?? 'unassigned'
                  }
                  type="ORDER"
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'grid border-b py-0 text-xs relative transition-colors',
                        rowIdx % 2 === 0 ? 'bg-background' : 'bg-background/50',
                        snapshot.isDraggingOver &&
                          'bg-muted/70 ring-2 ring-secondary scale-y-105'
                      )}
                      style={{
                        gridTemplateColumns: `${TECH_COL_WIDTH}px repeat(${HOURS.length}, ${HOUR_WIDTH}px)`,
                        height: `${rowHeight}px`,
                        minHeight: `${rowHeight}px`,
                      }}
                    >
                      {/* Sticky technician name (left) */}
                      <div
                        className="border-r p-2 font-semibold flex text-xs items-start justify-start bg-muted sticky left-0 z-20 overflow-hidden"
                        title={tech.technicianName}
                        style={{ width: `${TECH_COL_WIDTH}px` }}
                      >
                        {matchSearch(searchTerm, tech.technicianName) ? (
                          <span className="block w-full truncate leading-tight">
                            <Highlight
                              searchWords={[searchTerm]}
                              textToHighlight={tech.technicianName}
                              autoEscape
                              highlightClassName="bg-yellow-200"
                            />
                          </span>
                        ) : (
                          <span className="block w-full truncate leading-tight">
                            {tech.technicianName}
                          </span>
                        )}
                      </div>

                      {/* Hour grid + draggable orders */}
                      <div
                        className="relative h-full"
                        style={{ gridColumn: `2 / span ${HOURS.length}` }}
                      >
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
                            PLANNER_ORDER_STATUS_COLORS[
                              order.status as keyof typeof PLANNER_ORDER_STATUS_COLORS
                            ] ?? PLANNER_ORDER_STATUS_COLORS.ASSIGNED

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
                              isDragDisabled={isLockedStatus(order.status)} // <-- BLOCK DRAG
                            >
                              {(drag, snapshot) => {
                                const locked = isLockedStatus(order.status)
                                const isCompleted = order.status === 'COMPLETED'
                                const isFailed =
                                  order.status === 'NOT_COMPLETED'

                                const content = (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        ref={drag.innerRef}
                                        {...drag.draggableProps}
                                        {...(!locked
                                          ? drag.dragHandleProps
                                          : {})}
                                        className={cn(
                                          'absolute truncate rounded-md shadow-sm my-[1px] px-1 py-0 text-xs text-white font-medium transition-all cursor-grab active:cursor-grabbing group overflow-hidden',
                                          snapshot.isDragging &&
                                            !locked &&
                                            'scale-105 shadow-lg z-50 ring-2 ring-secondary',
                                          locked && 'cursor-default'
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

                                          // Apply status-based background color
                                          backgroundColor: color,

                                          // No border for any status
                                          border: 'none',

                                          ...drag.draggableProps.style,
                                        }}
                                        onClick={() => {
                                          onOrderClick?.(order.id)
                                        }}
                                      >
                                        {/* Disabled overlay for locked orders (prevents interaction without affecting colors) */}
                                        {locked && (
                                          <div
                                            className="absolute inset-0 bg-black/20 pointer-events-none rounded-md"
                                            style={{ zIndex: 5 }}
                                          />
                                        )}

                                        {/* Status badge for completed/failed orders.
      Positioned cleanly near the top-right corner without borders. */}
                                        {locked && (
                                          <div
                                            className={cn(
                                              'absolute rounded-full flex items-center justify-center text-white shadow-md',
                                              'h-5 w-5',
                                              order.status === 'COMPLETED'
                                                ? 'bg-green-600'
                                                : 'bg-red-600'
                                            )}
                                            style={{
                                              top: '-10px', // subtle downward offset for aesthetic placement
                                              right: '-10px', // subtle inward offset for balanced appearance
                                            }}
                                          ></div>
                                        )}

                                        {/* Order label (order number) */}
                                        <div className="flex justify-between text-[0.65rem] items-start">
                                          <div className="truncate font-semibold pr-2">
                                            <Highlight
                                              highlightClassName="bg-yellow-200"
                                              searchWords={[searchTerm]}
                                              autoEscape
                                              textToHighlight={order.label}
                                            />
                                          </div>

                                          {/* Unassign button hidden for locked orders */}
                                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!locked && (
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  onUnassign(order.id)
                                                }}
                                                onPointerDown={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="p-0 h-4 w-4 min-w-0 text-danger hover:bg-danger/80"
                                              >
                                                <MdClose className="w-3.5 h-3.5" />
                                              </Button>
                                            )}

                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  onPointerDown={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  className="p-0 h-4 w-4 min-w-0 text-white/90 hover:bg-white/20"
                                                >
                                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent
                                                align="end"
                                                side="bottom"
                                                className="z-[70]"
                                              >
                                                <DropdownMenuItem
                                                  onSelect={(e) => {
                                                    e.preventDefault()
                                                    handleGoToOrder(order.id)
                                                  }}
                                                >
                                                  Przejdź do zlecenia
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>

                                        {/* Address line */}
                                        <div className="truncate text-[0.65rem]">
                                          {order.address}
                                        </div>
                                      </div>
                                    </TooltipTrigger>

                                    <TooltipContent
                                      side="top"
                                      className="max-w-sm text-[0.65rem]"
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

                                      {isCompleted && (
                                        <p className="text-xs font-semibold text-green-700 mt-1">
                                          ✔ Zlecenie wykonane
                                        </p>
                                      )}
                                      {order.completedByName &&
                                      (isCompleted || isFailed) ? (
                                        <p className="text-xs mt-1">
                                          Wykonał: {order.completedByName}
                                        </p>
                                      ) : null}
                                      {order.techniciansLabel ? (
                                        <p className="text-xs mt-1">
                                          Technik: {order.techniciansLabel}
                                        </p>
                                      ) : null}

                                      {isFailed && (
                                        <p className="text-xs font-semibold text-red-700 mt-1">
                                          ✖ Zlecenie niewykonane
                                        </p>
                                      )}
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
    </TooltipProvider>
  )
}

export default TechniciansTimeline
