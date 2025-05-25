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
import { trpc } from '@/utils/trpc'
import { format, startOfMonth } from 'date-fns'
import { useEffect, useState } from 'react'
import { MdDownload } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
}

type ReportRange = 'day' | 'month'

/**
 * ReportDialog
 * -----------------------------------
 * Allows the user to generate a daily or monthly Excel report from the Orders module.
 * - The user selects the type: "day" or "month"
 * - Based on the type, either a day picker or a month picker is shown
 * - The appropriate tRPC mutation is triggered
 * - The generated base64 is downloaded as an Excel file
 */
const ReportDialog = ({ open, onClose }: Props) => {
  const [range, setRange] = useState<ReportRange>('day')
  const [day, setDay] = useState<string>('') // format: yyyy-MM-dd
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()))

  // tRPC mutations
  const dailyReportMutation = trpc.order.generateDailyReport.useMutation()
  const monthlyReportMutation =
    trpc.settlement.generateMonthlyReport.useMutation()

  /**
   * Sets the default selected day on initial open
   */
  useEffect(() => {
    if (!day) {
      const today = format(new Date(), 'yyyy-MM-dd')
      setDay(today)
    }
  }, [day])

  /**
   * Handles generating and downloading the report based on the selected range
   */
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

      // Convert base64 string to Blob and download
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

  /**
   * Converts a base64-encoded string to a Blob for file download
   */
  const base64ToBlob = (base64: string, mime: string): Blob => {
    const byteCharacters = atob(base64)
    const byteArrays = []
    for (let i = 0; i < byteCharacters.length; i += 512) {
      const slice = byteCharacters.slice(i, i + 512)
      const byteNumbers = new Array(slice.length)
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j)
      }
      byteArrays.push(new Uint8Array(byteNumbers))
    }
    return new Blob(byteArrays, { type: mime })
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

        <div className="flex flex-col space-y-4 mt-2 w-full">
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

          {/* Dynamic date/month picker */}
          {range === 'day' ? (
            <DatePicker
              selected={day ? new Date(day) : undefined}
              onChange={(d) => {
                if (d) setDay(format(d, 'yyyy-MM-dd'))
              }}
              range="day"
              fullWidth
            />
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
