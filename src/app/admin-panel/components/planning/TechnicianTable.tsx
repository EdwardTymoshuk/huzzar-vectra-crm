// components/planning/TechnicianTable.tsx
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { timeSlotMap } from '@/lib/constants'
import { Draggable } from '@hello-pangea/dnd'
import { MdClose } from 'react-icons/md'

type Slot = {
  timeSlot: string
  orders: {
    id: string
    orderNumber: string
    address: string
  }[]
}

type Props = {
  technicianId: string
  slots: Slot[]
  onUnassign: (orderId: string) => void
}

/**
 * TechnicianTable displays assigned orders grouped by time slots for a technician.
 * Each order is draggable and has an "unassign" button.
 */
const TechnicianTable = ({ slots, onUnassign }: Props) => {
  return (
    <Table className="border rounded-lg w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="text-center w-1/3">Slot czasowy</TableHead>
          <TableHead className="text-center w-2/3">Zlecenia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {slots.length > 0 ? (
          slots.map((slot) => (
            <TableRow key={slot.timeSlot}>
              <TableCell className="text-center font-semibold w-1/3">
                {timeSlotMap[slot.timeSlot] || slot.timeSlot}
              </TableCell>
              <TableCell className="w-2/3">
                {slot.orders.length > 0 ? (
                  <div className="min-h-[50px]">
                    {slot.orders.map((order, index) => (
                      <Draggable
                        key={order.id}
                        draggableId={order.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="p-2 bg-gray-100 rounded-md text-sm my-1 flex justify-between items-center gap-2"
                          >
                            <div>
                              <strong>{order.orderNumber}</strong>
                              <br />
                              {order.address}
                            </div>
                            <button
                              onClick={() => onUnassign(order.id)}
                              className="text-gray-600 hover:text-red-600"
                            >
                              <MdClose />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500">Brak zleceń</p>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-gray-500">
              Brak zleceń
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

export default TechnicianTable
