'use client'

import DatePicker from '@/app/components/shared/DatePicker'
import MonthPicker from '@/app/components/shared/MonthPicker'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { base64ToBlob } from '@/utils/reports/base64ToBlob'
import { trpc } from '@/utils/trpc'
import { addDays, format, startOfMonth, subDays } from 'date-fns'
import { useEffect, useState } from 'react'
import { MdChevronLeft, MdChevronRight, MdDownload } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
}

type ReportRange = 'day' | 'month'

/**
 * ReportDialog:
 * - Allows generating daily or monthly Excel reports.
 * - Includes navigation arrows for day switching.
 * - Default day = yesterday.
 */
const ReportDialog = ({ open, onClose }: Props) => {
  const [range, setRange] = useState<ReportRange>('day')
  const [day, setDay] = useState<string>('') // yyyy-MM-dd
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))

  // tRPC mutations
  const dailyReportMutation = trpc.settlement.generateDailyReport.useMutation()
  const monthlyReportMutation =
    trpc.settlement.generateMonthlyReport.useMutation()

  /** Initialize default date as "yesterday" when dialog opens */
  useEffect(() => {
    if (!day) {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      setDay(yesterday)
    }
  }, [day])

  /** Handles report generation based on range */
  const handleDownload = async () => {
    try {
      let base64: string | undefined
      let filename = ''

      if (range === 'day') {
        if (!day) return toast.warning('Wybierz datę.')
        base64 = (await dailyReportMutation.mutateAsync({ date: day })) as
          | string
          | undefined
        filename = `Raport-zlecenia-${day}.xlsx`
      } else {
        const year = month.getFullYear()
        const monthNum = month.getMonth() + 1
        base64 = await monthlyReportMutation.mutateAsync({
          year,
          month: monthNum,
        })
        filename = `Raport-zlecenia-${year}-${String(monthNum).padStart(
          2,
          '0'
        )}.xlsx`
      }

      if (!base64 || base64.length < 100) {
        toast.info('Brak danych do raportu.')
        return
      }

      const blob = base64ToBlob(
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Raport został wygenerowany.')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Nie udało się wygenerować raportu.')
    }
  }

  /** Date navigation */
  const handlePrevDay = () => {
    const prev = subDays(new Date(day), 1)
    setDay(format(prev, 'yyyy-MM-dd'))
  }

  const handleNextDay = () => {
    const next = addDays(new Date(day), 1)
    setDay(format(next, 'yyyy-MM-dd'))
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Generowanie raportu</DialogTitle>
          <DialogDescription>
            Wybierz typ raportu (dzienny lub miesięczny) oraz datę.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-5 mt-2 w-full">
          {/* Report type selector */}
          <Select
            value={range}
            onValueChange={(val) => setRange(val as ReportRange)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Typ raportu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Dzienny</SelectItem>
              <SelectItem value="month">Miesięczny</SelectItem>
            </SelectContent>
          </Select>

          {/* Conditional picker */}
          {range === 'day' ? (
            <div className="w-full flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevDay}
                aria-label="Poprzedni dzień"
                className="px-6"
              >
                <MdChevronLeft className="w-5 h-5" />
              </Button>

              <DatePicker
                selected={day ? new Date(day) : undefined}
                onChange={(d) => {
                  if (d) setDay(format(d, 'yyyy-MM-dd'))
                }}
                range="day"
                fullWidth
              />

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextDay}
                aria-label="Następny dzień"
                className="px-6"
              >
                <MdChevronRight className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <MonthPicker
              selected={month}
              onChange={(date) => setMonth(startOfMonth(date))}
            />
          )}

          {/* Download button */}
          <Button
            onClick={handleDownload}
            disabled={
              dailyReportMutation.isLoading || monthlyReportMutation.isLoading
            }
            className="w-full"
          >
            <MdDownload className="mr-2" />
            {dailyReportMutation.isLoading || monthlyReportMutation.isLoading
              ? 'Generowanie...'
              : 'Generuj i pobierz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReportDialog
