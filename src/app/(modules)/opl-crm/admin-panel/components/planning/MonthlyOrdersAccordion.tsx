'use client'

import OplOrderDetailsSheet from '@/app/(modules)/opl-crm/components/order/OplOrderDetailsSheet'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Progress } from '@/app/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { OplOrderStatus, OplTimeSlot } from '@prisma/client'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { MdVisibility } from 'react-icons/md'
import { trpc } from '@/utils/trpc'
import { matchSearch } from '@/utils/searchUtils'
import { oplTimeSlotMap } from '../../../lib/constants'
import { usePlanningContext } from './PlanningContext'

type MonthlyOrder = {
  id: string
  orderNumber: string
  city: string
  street: string
  date: Date
  timeSlot: OplTimeSlot
  status: OplOrderStatus
  operator: string | null
  type: string
  technicians: string[]
}

const statusLabelMap: Record<OplOrderStatus, string> = {
  PENDING: 'Nieprzypisane',
  ASSIGNED: 'W realizacji',
  COMPLETED: 'Wykonane',
  NOT_COMPLETED: 'Niewykonane',
}

const statusBadgeVariant = (status: OplOrderStatus) => {
  if (status === 'COMPLETED') return 'success' as const
  if (status === 'NOT_COMPLETED') return 'destructive' as const
  if (status === 'ASSIGNED') return 'secondary' as const
  return 'outline' as const
}

const MonthlyOrdersAccordion = () => {
  const { selectedDate, searchTerm } = usePlanningContext()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const monthKey = format(selectedDate, 'yyyy-MM-dd')
  const { data = [], isLoading, isError } =
    trpc.opl.order.getPlannerMonthlyOrders.useQuery({ month: monthKey })

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return data as MonthlyOrder[]
    return (data as MonthlyOrder[]).filter((o) =>
      matchSearch(
        searchTerm,
        o.orderNumber,
        `${o.city} ${o.street}`,
        o.operator ?? '',
        o.technicians.join(' ')
      )
    )
  }, [data, searchTerm])

  const groupedDays = useMemo(() => {
    const map = new Map<string, MonthlyOrder[]>()
    for (const order of filtered) {
      const key = format(new Date(order.date), 'yyyy-MM-dd')
      const bucket = map.get(key) ?? []
      bucket.push(order)
      map.set(key, bucket)
    }

    return Array.from(map.entries()).map(([date, orders]) => {
      const completed = orders.filter((o) => o.status === 'COMPLETED').length
      const notCompleted = orders.filter(
        (o) => o.status === 'NOT_COMPLETED'
      ).length
      const inProgress = orders.filter(
        (o) => o.status === 'ASSIGNED' || o.status === 'PENDING'
      ).length
      const received = orders.length
      const closed = completed + notCompleted
      const effectiveness = closed > 0 ? (completed / closed) * 100 : 0

      return {
        date,
        orders,
        stats: {
          received,
          completed,
          notCompleted,
          inProgress,
          effectiveness,
        },
      }
    })
  }, [filtered])

  const monthStats = useMemo(() => {
    const received = filtered.length
    const completed = filtered.filter((o) => o.status === 'COMPLETED').length
    const notCompleted = filtered.filter(
      (o) => o.status === 'NOT_COMPLETED'
    ).length
    const inProgress = filtered.filter(
      (o) => o.status === 'ASSIGNED' || o.status === 'PENDING'
    ).length
    const closed = completed + notCompleted
    const effectiveness = closed > 0 ? (completed / closed) * 100 : 0
    return { received, completed, notCompleted, inProgress, effectiveness }
  }, [filtered])

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <LoaderSpinner />
      </div>
    )
  }

  if (isError) {
    return <p className="text-center text-danger py-8">Błąd ładowania danych.</p>
  }

  return (
    <div className="space-y-5 p-2 md:p-3">
      <div className="rounded-xl border bg-background p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
          <div className="text-base font-semibold shrink-0 first-letter:uppercase">
            {format(selectedDate, 'LLLL yyyy', { locale: pl })}
          </div>

          <div className="flex flex-wrap xl:flex-nowrap items-center gap-1.5 text-[11px] xl:mx-auto">
            <Badge
              variant="outline"
              className="justify-center text-[10px] px-2 py-0"
            >
              Dni: {groupedDays.length}
            </Badge>
            <Badge
              variant="outline"
              className="justify-center text-[10px] px-2 py-0"
            >
              Otrzymane: {monthStats.received}
            </Badge>
            <Badge
              variant="success"
              className="justify-center text-[10px] px-2 py-0"
            >
              Wykonane: {monthStats.completed}
            </Badge>
            <Badge
              variant="destructive"
              className="justify-center text-[10px] px-2 py-0"
            >
              Niewykonane: {monthStats.notCompleted}
            </Badge>
            <Badge
              variant="secondary"
              className="justify-center text-[10px] px-2 py-0"
            >
              W realizacji: {monthStats.inProgress}
            </Badge>
          </div>

          <div className="flex items-center gap-2 min-w-0 xl:w-[300px] xl:ml-0">
            <span className="text-[11px] text-muted-foreground shrink-0">
              Skuteczność
            </span>
            <Progress
              value={monthStats.effectiveness}
              className="h-2 flex-1 min-w-[90px]"
            />
            <span className="text-[11px] font-semibold shrink-0">
              {monthStats.effectiveness.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {groupedDays.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
          Brak zleceń w wybranym miesiącu.
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {groupedDays.map((day) => (
            <AccordionItem
              key={day.date}
              value={day.date}
              className="rounded-xl border bg-background px-3 shadow-sm"
            >
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <div className="w-full text-left">
                  <div className="grid gap-2 xl:grid-cols-[110px_minmax(0,1fr)_300px] xl:items-center xl:gap-3">
                    <div className="text-sm font-semibold shrink-0">
                      {format(new Date(day.date), 'dd.MM.yyyy')}
                    </div>

                    <div className="flex flex-wrap xl:flex-nowrap items-center justify-start xl:justify-center gap-1.5 text-[11px]">
                      <Badge variant="outline" className="text-[10px] px-2 py-0">
                        Otrzymane: {day.stats.received}
                      </Badge>
                      <Badge variant="success" className="text-[10px] px-2 py-0">
                        Wykonane: {day.stats.completed}
                      </Badge>
                      <Badge variant="destructive" className="text-[10px] px-2 py-0">
                        Niewykonane: {day.stats.notCompleted}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0">
                        W realizacji: {day.stats.inProgress}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 min-w-0 xl:w-[300px] xl:justify-self-end">
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        Skuteczność
                      </span>
                      <Progress
                        value={day.stats.effectiveness}
                        className="h-1.5 flex-1 min-w-[80px]"
                      />
                      <span className="text-[11px] font-semibold shrink-0">
                        {day.stats.effectiveness.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-3">
                <div className="hidden xl:block rounded-lg border overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="h-9 text-xs">Slot</TableHead>
                        <TableHead className="h-9 text-xs">Nr zlecenia</TableHead>
                        <TableHead className="h-9 text-xs">Adres</TableHead>
                        <TableHead className="h-9 text-xs">Operator</TableHead>
                        <TableHead className="h-9 text-xs">Technik</TableHead>
                        <TableHead className="h-9 text-xs">Status</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {day.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="py-2 text-xs">
                            {oplTimeSlotMap[order.timeSlot] ?? order.timeSlot}
                          </TableCell>
                          <TableCell className="py-2 text-xs font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {order.city}, {order.street}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {order.operator || '-'}
                          </TableCell>
                          <TableCell className="py-2 text-xs">
                            {order.technicians.length
                              ? order.technicians.join(', ')
                              : '—'}
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge
                              variant={statusBadgeVariant(order.status)}
                              className="text-[10px] px-2 py-0"
                            >
                              {statusLabelMap[order.status] ?? order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              <MdVisibility className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 xl:hidden">
                  {day.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-lg border bg-muted/20 p-2.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-muted-foreground">
                            {oplTimeSlotMap[order.timeSlot] ?? order.timeSlot}
                          </div>
                          <div className="text-sm font-medium leading-tight">
                            {order.orderNumber}
                          </div>
                        </div>
                        <Badge
                          variant={statusBadgeVariant(order.status)}
                          className="text-[10px] px-2 py-0"
                        >
                          {statusLabelMap[order.status] ?? order.status}
                        </Badge>
                      </div>
                      <div className="text-xs leading-snug">
                        {order.city}, {order.street}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Operator: {order.operator || '-'}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Technik:{' '}
                        {order.technicians.length ? order.technicians.join(', ') : '—'}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <MdVisibility className="mr-1 h-4 w-4" />
                        Szczegóły
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <OplOrderDetailsSheet
        open={Boolean(selectedOrderId)}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}

export default MonthlyOrdersAccordion
