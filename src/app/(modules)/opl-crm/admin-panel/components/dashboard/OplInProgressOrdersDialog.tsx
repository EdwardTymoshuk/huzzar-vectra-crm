'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { Button } from '@/app/components/ui/button'
import { trpc } from '@/utils/trpc'
import { OplOrderType } from '@prisma/client'
import { format } from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { MdChevronRight, MdClose } from 'react-icons/md'

type Props = {
  open: boolean
  onClose: () => void
  dateFrom?: Date
  dateTo?: Date
  orderType: OplOrderType
}

const OplInProgressOrdersDialog = ({
  open,
  onClose,
  dateFrom,
  dateTo,
  orderType,
}: Props) => {
  const [technicianFilterId, setTechnicianFilterId] = useState<string | null>(null)
  const [technicianFilterName, setTechnicianFilterName] = useState<string | null>(
    null
  )
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data, isLoading } = trpc.opl.order.getAllInProgress.useQuery(
    {
      dateFrom,
      dateTo,
      orderType,
    },
    {
      enabled: open,
    }
  )

  const filteredData = useMemo(() => {
    if (!technicianFilterId) return data ?? []
    return (data ?? []).filter((o) =>
      o.technicians?.some((t) => t.id === technicianFilterId)
    )
  }, [data, technicianFilterId])

  const openOrderDetails = (orderId: string) => {
    const query = searchParams.toString()
    const from = query ? `${pathname}?${query}` : pathname
    onClose()
    router.push(
      `/opl-crm/admin-panel/orders/${orderId}?from=${encodeURIComponent(from)}`
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Zlecenia w realizacji</DialogTitle>
        </DialogHeader>

        {technicianFilterId && technicianFilterName && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtrowanie:</span>
            <button
              type="button"
              onClick={() => {
                setTechnicianFilterId(null)
                setTechnicianFilterName(null)
              }}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              {technicianFilterName}
              <MdClose className="h-4 w-4" />
            </button>
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Data</TableHead>
                <TableHead className="text-center">Nr zlecenia</TableHead>
                <TableHead className="text-center">Adres</TableHead>
                <TableHead className="text-center">Technik</TableHead>
                <TableHead className="w-10 text-center" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Brak zleceń w realizacji.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((o) => (
                  <TableRow key={o.id} className="hover:bg-muted/50">
                    <TableCell className="text-center whitespace-nowrap">
                      {format(new Date(o.date), 'dd.MM.yyyy')}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell className="text-center">
                      {o.city}, {o.street}
                    </TableCell>
                    <TableCell className="text-center text-primary">
                      {o.technicians?.length ? (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {o.technicians.map((t, idx) => (
                            <button
                              key={t.id}
                              type="button"
                              className="hover:underline"
                              onClick={() => {
                                setTechnicianFilterId(t.id)
                                setTechnicianFilterName(t.name)
                              }}
                            >
                              {t.name}
                              {idx < o.technicians.length - 1 ? ' / ' : ''}
                            </button>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => openOrderDetails(o.id)}
                        aria-label="Pokaż szczegóły zlecenia"
                      >
                        <MdChevronRight className="h-5 w-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </DialogContent>

    </Dialog>
  )
}

export default OplInProgressOrdersDialog
