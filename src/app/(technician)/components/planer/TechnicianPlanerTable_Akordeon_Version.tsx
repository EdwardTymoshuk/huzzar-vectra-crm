// 'use client'

// import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
// import {
//   Accordion,
//   AccordionContent,
//   AccordionItem,
//   AccordionTrigger,
// } from '@/app/components/ui/accordion'
// import { orderTypeMap } from '@/lib/constants'
// import { getTimeSlotLabel } from '@/utils/getTimeSlotLabel'
// import { trpc } from '@/utils/trpc'
// import { Prisma, TimeSlot } from '@prisma/client'
// import { useEffect, useMemo, useState } from 'react'
// import Highlight from 'react-highlight-words'
// import { toast } from 'sonner'
// import TechnicianPlanerOrderDetails from './TechnicianPlanerOrderDetails'

// /**
//  * Shape of order returned by getTechnicianActiveOrders
//  */
// type OrderRow = Prisma.OrderGetPayload<{
//   select: {
//     id: true
//     orderNumber: true
//     type: true
//     city: true
//     street: true
//     date: true
//     timeSlot: true
//     status: true
//     operator: true
//   }
// }>

// interface Props {
//   /** Search phrase filtering order number and address */
//   searchTerm: string
//   /** ID of order to auto-expand (optional, e.g. deep link) */
//   autoOpenOrderId?: string
//   /** Callback fired after auto-open is handled */
//   onAutoOpenHandled?: () => void
//   /** Currently selected date for filtering */
//   selectedDate: Date
// }

// /**
//  * TechnicianPlanerTable
//  * Displays active (unrealized) technician orders for a selected day.
//  * - Mobile-first card layout with clean accordion blocks.
//  * - No table headers, each order is a standalone card.
//  * - Shows key info in trigger (order, address, slot, operator, status).
//  */
// const TechnicianPlanerTable = ({
//   searchTerm,
//   autoOpenOrderId,
//   onAutoOpenHandled,
//   selectedDate,
// }: Props) => {
//   const [openIds, setOpenIds] = useState<string[]>([])

//   // Format date for TRPC (yyyy-MM-dd)
//   const date = selectedDate.toLocaleDateString('en-CA')

//   // Fetch technician’s active orders for given day
//   const {
//     data: orders = [],
//     isLoading,
//     isError,
//   } = trpc.order.getTechnicianActiveOrders.useQuery({ date })

//   // Handle auto-open of order (after redirect or action)
//   useEffect(() => {
//     if (autoOpenOrderId && !openIds.includes(autoOpenOrderId)) {
//       setOpenIds((prev) => [...prev, autoOpenOrderId])
//       onAutoOpenHandled?.()
//     }
//   }, [autoOpenOrderId, openIds, onAutoOpenHandled])

//   // Client-side search filtering
//   const filtered = useMemo(() => {
//     const q = searchTerm.toLowerCase()
//     return orders.filter(
//       (o) =>
//         o.orderNumber.toLowerCase().includes(q) ||
//         `${o.city} ${o.street}`.toLowerCase().includes(q)
//     )
//   }, [orders, searchTerm])

//   const utils = trpc.useUtils()
//   const accept = trpc.order.confirmTransfer.useMutation({
//     onSuccess: () => {
//       utils.order.getTechnicianActiveOrders.invalidate()
//       toast.success('Zlecenie zostało przyjęte.')
//     },
//   })
//   const reject = trpc.order.rejectTransfer.useMutation({
//     onSuccess: () => {
//       utils.order.getTechnicianActiveOrders.invalidate()
//       toast.info('Zlecenie zostało odrzucone.')
//     },
//   })

//   // Loading / error / empty states
//   if (isLoading)
//     return (
//       <div className="w-full flex justify-center py-8">
//         <LoaderSpinner />
//       </div>
//     )

//   if (isError)
//     return (
//       <p className="w-full py-8 text-center text-destructive">
//         Błąd ładowania danych.
//       </p>
//     )

//   if (filtered.length === 0)
//     return (
//       <p className="py-10 text-center text-muted-foreground">
//         Brak aktywnych zleceń na ten dzień.
//       </p>
//     )

//   return (
//     <div className="w-full">
//       <Accordion
//         type="multiple"
//         value={openIds}
//         onValueChange={setOpenIds}
//         className="w-full space-y-2"
//       >
//         {filtered.map((o) => (
//           <AccordionItem key={o.id} value={o.id} className="!border-none">
//             {/* Accordion header — compact card with key info */}
//             <AccordionTrigger
//               className="
//                 bg-card border rounded-xl p-4 text-start shadow-sm
//                 hover:bg-muted/50 transition-all flex flex-col gap-2
//               "
//               onClick={() =>
//                 setOpenIds((prev) =>
//                   prev.includes(o.id)
//                     ? prev.filter((id) => id !== o.id)
//                     : [...prev, o.id]
//                 )
//               }
//             >
//               {/* Order basic info */}
//               <div className="flex flex-col gap-2 w-full">
//                 <div className="flex flex-col flex-wrap">
//                   {/* Order number */}
//                   <span className="font-semibold text-base">
//                     <Highlight
//                       searchWords={[searchTerm]}
//                       textToHighlight={o.orderNumber}
//                     />
//                   </span>

//                   {/* Address and date */}
//                   <span className="font-semibold text-base">
//                     <Highlight
//                       searchWords={[searchTerm]}
//                       textToHighlight={`${o.city}, ${o.street}`}
//                     />
//                   </span>
//                 </div>

//                 <div className="flex flex-wrap justify-between items-center text-xs text-muted-foreground">
//                   <span>{new Date(o.date).toLocaleDateString()}</span>
//                   <span>{orderTypeMap[o.type] ?? '—'}</span>
//                 </div>

//                 {/* Operator and type */}
//                 <div className="flex justify-between items-center text-xs text-muted-foreground">
//                   <span>{getTimeSlotLabel(o.timeSlot as TimeSlot)}</span>
//                   <span>{o.operator || '—'}</span>
//                 </div>
//                 {/* Accordion icon & info */}
//                 <div className="flex justify-center items-center mt-2">
//                   <span className="text-xs text-muted-foreground text-center">
//                     Kliknij, by rozwinąć
//                   </span>
//                   {/* The accordion arrow icon is handled automatically by AccordionTrigger */}
//                 </div>
//               </div>
//             </AccordionTrigger>

//             {/* Accordion details */}
//             <AccordionContent className="bg-muted/30 rounded-b-xl px-4 py-3">
//               <TechnicianPlanerOrderDetails
//                 orderId={o.id}
//                 autoOpen={false}
//                 onAutoOpenHandled={onAutoOpenHandled}
//                 orderStatus={o.status}
//                 disableTransfer
//                 incomingTransfer={false}
//                 onAccept={() => accept.mutate({ orderId: o.id })}
//                 onReject={() => reject.mutate({ orderId: o.id })}
//               />
//             </AccordionContent>
//           </AccordionItem>
//         ))}
//       </Accordion>
//     </div>
//   )
// }

// export default TechnicianPlanerTable
