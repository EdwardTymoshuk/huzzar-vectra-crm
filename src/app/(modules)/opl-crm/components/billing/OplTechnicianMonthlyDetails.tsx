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
import { Card } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { MdVisibility } from 'react-icons/md'
import {
  formatBillingQuantity,
  getVisibleBillingCodes,
  getVisibleServiceBillingCodes,
} from '../../utils/order/sortBillingCodes'
import { toWorkCodeLabel } from '../../utils/order/workCodesPresentation'

type Props = {
  technicianId: string
  selectedMonth: Date
  orderType: OplOrderType
}

const OplTechnicianMonthlyDetails = ({
  technicianId,
  selectedMonth,
  orderType,
}: Props) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const from = format(
    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1),
    'yyyy-MM-dd'
  )
  const to = format(
    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0),
    'yyyy-MM-dd'
  )

  const { data, isLoading } = trpc.opl.order.getTechnicianMonthlyDetails.useQuery(
    {
      technicianId,
      from,
      to,
      orderType,
    }
  )

  const allRateCodes = useMemo(
    () =>
      orderType === OplOrderType.SERVICE
        ? getVisibleServiceBillingCodes(data?.availableCodes ?? [])
        : getVisibleBillingCodes(data?.availableCodes ?? []),
    [data?.availableCodes, orderType]
  )

  if (isLoading)
    return (
      <div className="flex justify-center pt-8">
        <LoaderSpinner />
      </div>
    )

  if (!data)
    return (
      <div className="text-center text-muted-foreground py-8">
        Brak danych za wybrany miesiąc.
      </div>
    )

  const totalCompleted = data.days.reduce(
    (acc, day) => acc + day.orders.filter((order) => order.status === 'COMPLETED').length,
    0
  )
  const totalNotCompleted = data.days.reduce(
    (acc, day) =>
      acc + day.orders.filter((order) => order.status === 'NOT_COMPLETED').length,
    0
  )
  const totalAssigned = totalCompleted + totalNotCompleted
  const totalRatio = totalAssigned ? (totalCompleted / totalAssigned) * 100 : 0

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-muted flex flex-col md:flex-row justify-between gap-6 shadow-md">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{data.technicianName}</h2>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {format(selectedMonth, 'LLLL yyyy', { locale: pl })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Przypisane: {totalAssigned}</Badge>
            <Badge variant="success">Wykonane: {totalCompleted}</Badge>
            <Badge variant="destructive">Niewykonane: {totalNotCompleted}</Badge>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1 md:items-end">
          <p className="text-sm text-muted-foreground">Skuteczność</p>
          <p className="text-2xl font-bold">{totalRatio.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">Kwota: {data.totalAmount.toFixed(2)} zł</p>
        </div>
      </Card>

      <div
        className={`grid gap-3 my-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6 ${
          allRateCodes.length > 8 ? 'xl:grid-cols-8' : ''
        }`}
      >
        {allRateCodes.map((code) => (
          <div
            key={code}
            className="bg-muted border rounded-xl p-3 shadow-sm text-center"
            title={code}
          >
            <div className="text-xs text-muted-foreground truncate">
              {toWorkCodeLabel(code)}
            </div>
            <div className="text-lg font-bold">
              {formatBillingQuantity(data.summary[code] ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <Accordion type="multiple" className="mb-4">
        <div className="grid grid-cols-6 gap-2 px-2 py-2 text-xs text-muted-foreground font-medium border-b">
          <span>Data</span>
          <span className="text-center">Razem</span>
          <span className="text-center">Wykonane</span>
          <span className="text-center">Niewykonane</span>
          <span className="text-center">Skuteczność</span>
          <span className="text-center">Kwota</span>
        </div>

        {data.days.map((day) => {
          const completed = day.orders.filter((order) => order.status === 'COMPLETED').length
          const notCompleted = day.orders.filter(
            (order) => order.status === 'NOT_COMPLETED'
          ).length
          const total = completed + notCompleted
          const ratio =
            total > 0 ? `${((completed / total) * 100).toFixed(2)}%` : '0%'

          return (
            <AccordionItem key={day.date} value={day.date}>
              <AccordionTrigger className="py-3 px-2 hover:bg-muted text-left">
                <div className="grid grid-cols-6 items-center gap-2 w-full text-sm">
                  <span>
                    {format(new Date(day.date), 'dd.MM.yyyy', { locale: pl })}
                  </span>
                  <span className="text-center">{total}</span>
                  <span className="text-center">{completed}</span>
                  <span className="text-center">{notCompleted}</span>
                  <span className="text-center">{ratio}</span>
                  <span className="text-center font-medium">
                    {day.amount.toFixed(2)} zł
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
                      {allRateCodes.map((code) => (
                        <TableHead key={code}>{toWorkCodeLabel(code)}</TableHead>
                      ))}
                      <TableHead>Kwota</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {day.orders.map((order, index) => {
                      return (
                        <TableRow key={order.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{order.orderNumber}</TableCell>
                          <TableCell className="text-xs">
                            {order.city}, {order.street}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === 'COMPLETED' ? 'success' : 'destructive'
                              }
                            >
                              {order.status === 'COMPLETED' ? 'Wykonane' : 'Niewykonane'}
                            </Badge>
                          </TableCell>
                          {allRateCodes.map((code) => {
                            const entry = order.settlementEntries.find(
                              (item) => item.code?.trim().toUpperCase() === code
                            )
                            return (
                              <TableCell key={`${order.id}-${code}`}>
                                {formatBillingQuantity(entry?.quantity ?? 0)}
                              </TableCell>
                            )
                          })}
                          <TableCell>
                            {(order.technicianAmount ?? 0).toFixed(2)} zł
                          </TableCell>
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

      <OplOrderDetailsSheet
        open={Boolean(selectedOrderId)}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </div>
  )
}

export default OplTechnicianMonthlyDetails
