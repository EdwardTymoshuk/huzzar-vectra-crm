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
import { timeSlotMap } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { Draggable, Droppable } from '@hello-pangea/dnd'
import { format } from 'date-fns'
import Highlight from 'react-highlight-words'

const OrderTable = () => {
  const { data: orders = [] } = trpc.order.getUnassignedOrders.useQuery()
  const { searchTerm } = useSearch()

  const filteredOrders = orders.filter((order) => {
    const address = `${order.city} ${order.street}`.toLowerCase()
    return (
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      address.includes(searchTerm.toLowerCase())
    )
  })
  return (
    <Droppable droppableId="UNASSIGNED_ORDERS" type="ORDER">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`min-h-52 p-2 border rounded-md transition ${
            snapshot.isDraggingOver
              ? 'border-blue-500 bg-blue-100'
              : 'border-border bg-card text-card-foreground'
          }`}
        >
          {filteredOrders.length === 0 ? (
            <div className="flex w-full h-52 items-center justify-center">
              <p className="text-center text-muted-foreground">Brak zleceń</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nr zlecenia</TableHead>
                  <TableHead>Adres</TableHead>
                  <TableHead>Slot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order, index) => (
                  <Draggable
                    key={order.id}
                    draggableId={order.id}
                    index={index}
                  >
                    {(provided) => (
                      <TableRow
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="cursor-grab hover:bg-muted transition"
                      >
                        <TableCell>
                          {' '}
                          <Highlight
                            highlightClassName="bg-yellow-200"
                            searchWords={[searchTerm]}
                            autoEscape={true}
                            textToHighlight={order.orderNumber}
                          />
                        </TableCell>
                        <TableCell>
                          <Highlight
                            highlightClassName="bg-yellow-200"
                            searchWords={[searchTerm]}
                            autoEscape={true}
                            textToHighlight={`${order.city}, ${order.street}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center jsutify-center">
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
