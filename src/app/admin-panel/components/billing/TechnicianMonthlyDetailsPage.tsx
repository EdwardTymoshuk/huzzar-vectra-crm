'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import MonthPicker from '@/app/components/shared/MonthPicker'
import PageHeader from '@/app/components/shared/PageHeader'
import OrderDetailsSheet from '@/app/components/shared/orders/OrderDetailsSheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { sortCodes } from '@/utils/sortCodes'
import { trpc } from '@/utils/trpc'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MdKeyboardArrowLeft, MdVisibility } from 'react-icons/md'
import TechnicianSummaryHeader from '../../../components/shared/TechnicianSummaryHeader'

type Props = { technicianId: string }

const TechnicianMonthlyDetailsPage = ({ technicianId }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const initialMonth = fromParam
    ? new Date(fromParam)
    : startOfMonth(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  useEffect(() => {
    router.replace(
      `/admin-panel/billing/technician/${technicianId}?from=${from}&to=${to}`,
      { scroll: false }
    )
  }, [from, to, router, selectedMonth, technicianId])

  const { data, isLoading } =
    trpc.settlement.getTechnicianMonthlyDetails.useQuery({
      technicianId,
      from,
      to,
    })

  const allCodes = sortCodes(Object.keys(data?.summary ?? {}))

  const totalCompleted =
    data?.days.reduce(
      (acc, d) => acc + d.orders.filter((o) => o.status === 'COMPLETED').length,
      0
    ) ?? 0
  const totalNotCompleted =
    data?.days.reduce(
      (acc, d) =>
        acc + d.orders.filter((o) => o.status === 'NOT_COMPLETED').length,
      0
    ) ?? 0
  const totalAssigned = totalCompleted + totalNotCompleted
  const totalRatio = totalAssigned ? (totalCompleted / totalAssigned) * 100 : 0

  return (
    <MaxWidthWrapper className="space-y-6">
      <PageHeader
        title={`Rozliczenie technika: ${data?.technicianName ?? ''}`}
      />

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="w-fit">
          <MdKeyboardArrowLeft className="mr-1" />
          Powrót
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Miesiąc:</span>
          <MonthPicker selected={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {isLoading ? (
        <div className="w-full flex justify-center">
          <LoaderSpinner />
        </div>
      ) : !data ? (
        <div className="text-center text-muted-foreground py-8">
          Brak danych za wybrany miesiąc.
        </div>
      ) : (
        <>
          {/* Summary cards per code */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-2">
            {allCodes.map((code) => (
              <div
                key={code}
                className="bg-muted border rounded-xl flex flex-col items-center px-3 py-2 shadow-sm justify-between text-center"
              >
                <span className="text-xs text-muted-foreground">{code}</span>
                <span className="font-bold text-lg">
                  {data.summary[code] ?? 0}
                </span>
              </div>
            ))}
          </div>

          <TechnicianSummaryHeader
            technicianName={data?.technicianName ?? ''}
            selectedMonth={selectedMonth}
            totalAssigned={totalAssigned}
            totalCompleted={totalCompleted}
            totalNotCompleted={totalNotCompleted}
            totalAmount={data?.totalAmount ?? 0}
            totalRatio={totalRatio}
          />

          {/* Header */}
          <div className="grid grid-cols-6 gap-2 px-4 py-2 text-sm border-b font-medium text-muted-foreground">
            <span>Data</span>
            <span className="text-center">Otrzymane</span>
            <span className="text-center">Wykonane</span>
            <span className="text-center">Niewykonane</span>
            <span className="text-center">Skuteczność</span>
            <span className="text-center">Kwota</span>
          </div>
          {!data.days.length && (
            <p className="text-center text-muted-foreground">
              Brak danych do wyświetlenia
            </p>
          )}

          <Accordion type="multiple" className="mb-4">
            {data.days.map((day) => {
              const completed = day.orders.filter(
                (o) => o.status === 'COMPLETED'
              ).length
              const notCompleted = day.orders.filter(
                (o) => o.status === 'NOT_COMPLETED'
              ).length
              const total = completed + notCompleted
              const ratio =
                total > 0
                  ? ((completed / total) * 100).toFixed(2) + '%'
                  : '0.00%'
              const dayAmount = day.orders.reduce(
                (sum, o) =>
                  sum +
                  o.settlementEntries.reduce(
                    (acc, e) => acc + (e.rate?.amount ?? 0) * e.quantity,
                    0
                  ),
                0
              )

              return (
                <AccordionItem key={day.date} value={day.date}>
                  <AccordionTrigger className="py-3 px-2 hover:bg-muted text-left">
                    <div className="grid grid-cols-6 items-center gap-2 w-full text-sm">
                      <span>
                        {format(new Date(day.date), 'dd.MM.yyyy', {
                          locale: pl,
                        })}
                      </span>
                      <span className="text-center">{total}</span>
                      <span className="text-center">{completed}</span>
                      <span className="text-center">{notCompleted}</span>
                      <span className="text-center">{ratio}</span>
                      <span className="text-center font-medium">
                        {dayAmount.toFixed(2)} zł
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-muted/50 px-4 py-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lp</TableHead>
                          <TableHead>Nr zlecenia</TableHead>
                          <TableHead>Adres</TableHead>
                          <TableHead>Status</TableHead>
                          {allCodes.map((code) => (
                            <TableHead key={code}>{code}</TableHead>
                          ))}
                          <TableHead>Kwota</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {day.orders.map((order, idx) => {
                          const amount = order.settlementEntries.reduce(
                            (sum, e) =>
                              sum + (e.rate?.amount ?? 0) * e.quantity,
                            0
                          )

                          return (
                            <TableRow key={order.id}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{order.orderNumber}</TableCell>
                              <TableCell className="text-xs">
                                {order.city}, {order.street}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    order.status === 'COMPLETED'
                                      ? 'success'
                                      : 'destructive'
                                  }
                                >
                                  {order.status === 'COMPLETED'
                                    ? 'Wykonane'
                                    : 'Niewykonane'}
                                </Badge>
                              </TableCell>
                              {allCodes.map((code) => {
                                const entry = order.settlementEntries.find(
                                  (e) => e.code === code
                                )
                                return (
                                  <TableCell key={code}>
                                    {entry?.quantity ?? 0}
                                  </TableCell>
                                )
                              })}
                              <TableCell>{amount.toFixed(2)} zł</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setSelectedOrderId(order.id)}
                                >
                                  <MdVisibility className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          {/* Sheet with order details */}
          <OrderDetailsSheet
            open={!!selectedOrderId}
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
          />
        </>
      )}
    </MaxWidthWrapper>
  )
}

export default TechnicianMonthlyDetailsPage
