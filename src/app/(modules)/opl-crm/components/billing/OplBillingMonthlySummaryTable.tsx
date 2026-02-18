'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { NavLink } from '@/app/components/navigation-progress'
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
import { OPL_PATH } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
import { MdKeyboardArrowRight } from 'react-icons/md'
import {
  formatBillingQuantity,
  getVisibleBillingCodes,
  getVisibleServiceBillingCodes,
} from '../../utils/order/sortBillingCodes'
import { toWorkCodeLabel } from '../../utils/order/workCodesPresentation'

type Props = {
  from: string
  to: string
  orderType: OplOrderType
}

const OplBillingMonthlySummaryTable = ({ from, to, orderType }: Props) => {
  const { data, isLoading } = trpc.opl.order.getBillingMonthlySummary.useQuery({
    from,
    to,
    orderType,
  })

  const availableCodes =
    orderType === OplOrderType.SERVICE
      ? getVisibleServiceBillingCodes(data?.availableCodes ?? [])
      : getVisibleBillingCodes(data?.availableCodes ?? [])

  if (isLoading)
    return (
      <div className="w-full flex justify-center">
        <LoaderSpinner />
      </div>
    )

  if (!data?.rows.length) {
    return (
      <p className="text-muted-foreground text-center">
        Brak podsumowania dla wybranego okresu.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lp</TableHead>
            <TableHead>Technik</TableHead>
            {availableCodes.map((code) => (
              <TableHead key={code}>{toWorkCodeLabel(code)}</TableHead>
            ))}
            <TableHead>Postęp</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.rows.map((row, index) => {
            const progress = Math.min((row.totalAmount / 6000) * 100, 100)
            const indicatorClassName =
              progress === 0
                ? 'bg-muted'
                : progress < 66.67
                ? 'bg-danger'
                : progress < 100
                ? 'bg-warning'
                : 'bg-success'

            const detailsHref = `${OPL_PATH}/admin-panel/billing/technician/${row.technicianId}?from=${from}&to=${to}`

            return (
              <TableRow key={row.technicianId} className="hover:bg-muted/40">
                <TableCell>{index + 1}</TableCell>
                <TableCell>{row.technicianName}</TableCell>
                {availableCodes.map((code) => (
                  <TableCell key={`${row.technicianId}-${code}`}>
                    {formatBillingQuantity(row.codes[code] ?? row.codes[code.toLowerCase()] ?? 0)}
                  </TableCell>
                ))}
                <TableCell className="w-[170px]">
                  <Progress
                    value={progress}
                    indicatorClassName={indicatorClassName}
                  />
                  <span className="text-xs text-muted-foreground">
                    {row.totalAmount.toFixed(2)} zł
                  </span>
                </TableCell>
                <TableCell>
                  <NavLink href={detailsHref} passHref prefetch>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Podsumowanie technika"
                    >
                      <MdKeyboardArrowRight className="mr-1" />
                    </Button>
                  </NavLink>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default OplBillingMonthlySummaryTable
