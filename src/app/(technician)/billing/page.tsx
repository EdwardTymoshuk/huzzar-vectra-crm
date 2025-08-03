'use client'

import SheetOrderDetails from '@/app/admin-panel/components/billing/SheetOrderDetails'
import EarningsDailyBadgeWithBar from '@/app/components/shared/EarningsDailyBadgeWithBar'
import EfficiencyBadgeWithBar from '@/app/components/shared/EfficiencyBadgeWithBar'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import MaxWidthWrapper from '@/app/components/shared/MaxWidthWrapper'
import MonthPicker from '@/app/components/shared/MonthPicker'
import PageHeader from '@/app/components/shared/PageHeader'
import TechnicianSummaryHeader from '@/app/components/shared/TechnicianSummaryHeader'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/app/components/ui/accordion'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { statusMap } from '@/lib/constants'
import { sortCodes } from '@/utils/sortCodes'
import { trpc } from '@/utils/trpc'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MdKeyboardArrowRight } from 'react-icons/md'

/**
 * BillingPage – technician billing summary and daily breakdown
 * Shows month summary, codes stats and daily orders as an accordion.
 */
const BillingPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  // Track selected month for summary view
  const initialMonth = fromParam
    ? new Date(fromParam)
    : startOfMonth(new Date())
  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Range for selected month
  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  // User session, get technician id
  const { data: technician } = useSession()
  const technicianId = technician?.user.id || ''

  // Sync month picker with URL params
  useEffect(() => {
    router.replace(`/?tab=billing&from=${from}&to=${to}`, { scroll: false })
  }, [from, to, router, selectedMonth, technicianId])

  // Fetch all details for given month
  const { data, isLoading } =
    trpc.settlement.getTechnicianMonthlyDetails.useQuery({
      technicianId,
      from,
      to,
    })

  // Sort work codes for summary
  const allCodes = sortCodes(Object.keys(data?.summary ?? {}))

  // Calculate totals for the whole month
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
      <PageHeader title="Moje rozliczenia" />

      {/* Month selection */}
      <div className="ml-auto flex items-center gap-2">
        <MonthPicker selected={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Loading / no data states */}
      {isLoading ? (
        <LoaderSpinner />
      ) : !data ? (
        <div className="text-center text-muted-foreground py-8">
          Brak danych za wybrany miesiąc.
        </div>
      ) : (
        <>
          {/* Header with technician stats and summary bars */}
          <TechnicianSummaryHeader
            technicianName={data?.technicianName ?? ''}
            selectedMonth={selectedMonth}
            totalAssigned={totalAssigned}
            totalCompleted={totalCompleted}
            totalNotCompleted={totalNotCompleted}
            totalAmount={data?.totalAmount ?? 0}
            totalRatio={totalRatio}
          />

          {/* Work code summary cards */}
          <div
            className="
              grid gap-2 mb-2
              grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]
            "
          >
            {allCodes.map((code) => (
              <div
                key={code}
                className="bg-muted border rounded-xl flex flex-col items-center justify-between px-3 py-2 shadow-sm w-full"
              >
                <span className="text-xs text-muted-foreground">{code}</span>
                <span className="font-bold text-lg">
                  {data.summary[code] ?? 0}
                </span>
              </div>
            ))}
          </div>

          {/* Accordion with daily breakdown */}
          <Accordion type="multiple">
            {data.days.map((day) => {
              const completed = day.orders.filter(
                (o) => o.status === 'COMPLETED'
              ).length
              const notCompleted = day.orders.filter(
                (o) => o.status === 'NOT_COMPLETED'
              ).length
              const total = completed + notCompleted
              const ratio = total > 0 ? (completed / total) * 100 : 0
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
                <AccordionItem
                  key={day.date}
                  value={day.date}
                  className="!border-none"
                >
                  {/* Daily summary card */}
                  <AccordionTrigger className="bg-transparent hover:bg-transparent gap-2 flex-col">
                    <div className="w-full">
                      <div className="bg-card border rounded-xl p-4 shadow-md flex flex-col gap-2">
                        {/* Date on top left, badges under, stats bars on right */}
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 w-full">
                          <div className="flex flex-col gap-2 w-full md:max-w-lg">
                            <div className="text-base font-bold mb-1 text-start">
                              {format(new Date(day.date), 'dd.MM.yyyy', {
                                locale: pl,
                              })}
                            </div>
                            <div
                              className="
                                flex flex-col gap-2 flex-wrap
                                lg:grid lg:grid-cols-3 lg:gap-2
                              "
                            >
                              <Badge
                                className="md:col-span-1"
                                variant="outline"
                              >
                                Otrzymane: {total}
                              </Badge>
                              <Badge
                                className="md:col-span-1"
                                variant="success"
                              >
                                Wykonane: {completed}
                              </Badge>
                              <Badge className="md:col-span-1" variant="danger">
                                Niewykonane: {notCompleted}
                              </Badge>
                            </div>
                          </div>
                          {/* Right side: stats bars (daily) */}
                          <div className="flex flex-col gap-2 w-full md:max-w-xs">
                            <EfficiencyBadgeWithBar
                              ratio={ratio}
                              completed={completed}
                              assigned={total}
                            />
                            {/* TODO: Here you can use EarningsDailyBadgeWithBar when ready */}
                            <EarningsDailyBadgeWithBar amount={dayAmount} />
                          </div>
                        </div>
                        {/* Accordion icon & info */}
                        <div className="flex justify-center items-center mt-2">
                          <span className="text-xs text-muted-foreground text-center">
                            Kliknij, by rozwinąć
                          </span>
                          {/* The accordion arrow icon is handled automatically by AccordionTrigger */}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  {/* Orders for given day */}
                  <AccordionContent className="bg-muted/50 rounded-xl p-4 mb-2">
                    {day.orders.length === 0 ? (
                      <span className="text-sm text-muted-foreground">
                        Brak zleceń tego dnia.
                      </span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {day.orders.map((order) => {
                          const amount = order.settlementEntries.reduce(
                            (sum, e) =>
                              sum + (e.rate?.amount ?? 0) * e.quantity,
                            0
                          )
                          return (
                            <div
                              key={order.id}
                              className="border rounded-lg bg-background p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-sm"
                            >
                              <div className="space-y-2 w-full">
                                <div className="text-xs font-semibold">
                                  {order.orderNumber}
                                </div>
                                <div className="text-xs font-semibold">
                                  {order.city}, {order.street}
                                </div>
                                <Badge
                                  variant={
                                    order.status === 'COMPLETED'
                                      ? 'success'
                                      : order.status === 'NOT_COMPLETED'
                                      ? 'danger'
                                      : order.status === 'ASSIGNED'
                                      ? 'secondary'
                                      : 'outline'
                                  }
                                >
                                  {statusMap[order.status]}
                                </Badge>
                                <div className="flex items-center justify-between w-full p-0">
                                  <div className="text-xs">
                                    <b>Kwota:</b> {amount.toFixed(2)} zł
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedOrderId(order.id)}
                                  >
                                    Szczegóły <MdKeyboardArrowRight />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>

          {/* Slideout sheet with order details */}
          <SheetOrderDetails
            orderId={selectedOrderId}
            onClose={() => setSelectedOrderId(null)}
          />
        </>
      )}
    </MaxWidthWrapper>
  )
}

export default BillingPage
