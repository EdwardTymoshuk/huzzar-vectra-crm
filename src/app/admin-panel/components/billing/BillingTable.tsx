import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
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
import { sortCodes } from '@/utils/sortCodes'
import { trpc } from '@/utils/trpc'
import Link from 'next/link'
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

  if (isLoading) return <LoaderSpinner />
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
            <TableHead>Akcje</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => {
            const progress = Math.min((row.totalAmount / 6000) * 100, 100)
            const progressColor =
              row.totalAmount === 0
                ? 'bg-muted'
                : row.totalAmount < 4000 && row.totalAmount !== 0
                ? 'bg-danger'
                : row.totalAmount < 6000
                ? 'bg-warning'
                : 'bg-success'
            return (
              <TableRow key={row.technicianId}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{row.technicianName}</TableCell>
                {allCodes.map((code) => (
                  <TableCell key={code}>{row.codes[code] ?? 0}</TableCell>
                ))}
                <TableCell className="w-[160px]">
                  <Progress value={progress} className={progressColor} />
                  <span className="text-xs text-muted-foreground">
                    {row.totalAmount.toFixed(2)} zł
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin-panel/billing/technician/${row.technicianId}?from=${from}&to=${to}`}
                    passHref
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Podsumowanie technika"
                    >
                      <MdKeyboardArrowRight className="mr-1" />
                    </Button>
                  </Link>
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
