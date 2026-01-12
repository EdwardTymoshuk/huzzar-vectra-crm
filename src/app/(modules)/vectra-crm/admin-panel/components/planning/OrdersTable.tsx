'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { useSearch } from '@/app/context/SearchContext'
import { trpc } from '@/utils/trpc'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { format } from 'date-fns'
import Highlight from 'react-highlight-words'
import { timeSlotMap } from '../../../lib/constants'

/**
 * OrderTable (left column list)
 * - Droppable target: "UNASSIGNED_ORDERS".
 * - Rows are draggable onto technicians.
 */
const OrderTable = () => {
  const { data: orders = [] } = trpc.vectra.order.getUnassignedOrders.useQuery()
  const { searchTerm } = useSearch()

  const filtered = orders.filter((o) => {
    const address = `${o.city} ${o.street}`.toLowerCase()
    const q = searchTerm.toLowerCase()
    return o.orderNumber.toLowerCase().includes(q) || address.includes(q)
  })

  return (
    <Droppable droppableId="UNASSIGNED_ORDERS" type="ORDER">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`min-h-52 p-2 border rounded-md transition ${
            snapshot.isDraggingOver
              ? 'border-secondary bg-muted'
              : 'border-border bg-card text-card-foreground'
          }`}
        >
          {filtered.length === 0 ? (
            <div className="flex w-full h-52 items-center justify-center">
              <p className="text-center text-muted-foreground">Brak zleceń</p>
            </div>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-2">Nr zlecenia</TableHead>
                  <TableHead className="py-2">Adres</TableHead>
                  <TableHead className="py-2">Slot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order, index) => (
                  <Draggable
                    key={order.id}
                    draggableId={order.id}
                    index={index}
                  >
                    {(providedRow) => (
                      <TableRow
                        ref={providedRow.innerRef}
                        {...providedRow.draggableProps}
                        {...providedRow.dragHandleProps}
                        className="cursor-grab hover:bg-muted/60 transition"
                      >
                        <TableCell className="py-2">
                          <Highlight
                            highlightClassName="bg-yellow-200"
                            searchWords={[searchTerm]}
                            autoEscape
                            textToHighlight={order.orderNumber}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <Highlight
                            highlightClassName="bg-yellow-200"
                            searchWords={[searchTerm]}
                            autoEscape
                            textToHighlight={`${order.city}, ${order.street}`}
                          />
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex flex-col items-center justify-center leading-tight">
                            <p>{format(order.date, 'dd.MM.yyyy')}</p>
                            {timeSlotMap[order.timeSlot] || order.timeSlot}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Draggable>
                ))}
              </TableBody>
            </Table>
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  )
}

export default OrderTable
