import { sortCodes } from '@/app/(modules)/vectra-crm/utils/sortCodes'
import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { NavLink } from '@/app/components/shared/navigation-progress'
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
import { trpc } from '@/utils/trpc'
import { MdKeyboardArrowRight } from 'react-icons/md'

type Props = {
  from: string
  to: string
}

/**
 * BillingMonthlySummaryTable
 * Shows one row per technician: name, work code totals, sum, progress, and details action.
 */
const BillingMonthlySummaryTable = ({ from, to }: Props) => {
  // Query for monthly summary per technician
  const { data, isLoading } = trpc.order.getBillingMonthlySummary.useQuery({
    from,
    to,
  })
  // Fetch all possible work codes for dynamic columns
  const { data: allRates = [] } = trpc.rateDefinition.getAllRates.useQuery()
  const allCodes = sortCodes(allRates.map((r) => r.code))

  const openTechnicianBilling = (id: string) => {
    window.location.href = `/admin-panel/billing/technician/${id}?from=${from}&to=${to}`
  }

  if (isLoading)
    return (
      <div className="w-full flex justify-center">
        <LoaderSpinner />
      </div>
    )
  if (!data?.length) {
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
            {allCodes.map((code) => (
              <TableHead key={code}>{code}</TableHead>
            ))}
            <TableHead>Postęp</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => {
            const progress = Math.min((row.totalAmount / 6000) * 100, 100)
            const indicatorClassName =
              progress === 0
                ? 'bg-muted'
                : progress < 66.67 // ~ <4000/6000
                ? 'bg-danger'
                : progress < 100
                ? 'bg-warning'
                : 'bg-success'
            return (
              <TableRow
                key={row.technicianId}
                className="cursor-pointer hover:bg-muted transition"
                onClick={() => openTechnicianBilling(row.technicianId)}
              >
                <TableCell>{i + 1}</TableCell>
                <TableCell>{row.technicianName}</TableCell>
                {allCodes.map((code) => (
                  <TableCell key={code}>{row.codes[code] ?? 0}</TableCell>
                ))}
                <TableCell className="w-[160px]">
                  <Progress
                    value={progress}
                    indicatorClassName={indicatorClassName}
                  />
                  <span className="text-xs text-muted-foreground">
                    {row.totalAmount.toFixed(2)} zł
                  </span>
                </TableCell>
                <TableCell>
                  <NavLink
                    href={`/admin-panel/billing/technician/${row.technicianId}?from=${from}&to=${to}`}
                    passHref
                    prefetch
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Podsumowanie technika"
                      onClick={(e) => {
                        e.stopPropagation()
                        openTechnicianBilling(row.technicianId)
                      }}
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

export default BillingMonthlySummaryTable
