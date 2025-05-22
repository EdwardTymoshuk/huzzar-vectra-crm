'use client'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { trpc } from '@/utils/trpc'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { MdDownload } from 'react-icons/md'
import { toast } from 'sonner'
import DatePicker from '../../../components/shared/DatePicker'

type Props = {
  open: boolean
  onClose: () => void
}

const ReportDialog = ({ open, onClose }: Props) => {
  const [date, setDate] = useState('')
  const reportMutation = trpc.order.generateDailyReport.useMutation()

  useEffect(() => {
    if (!date) {
      const today = format(new Date(), 'yyyy-MM-dd')
      setDate(today)
    }
  }, [date])

  const handleDownload = async () => {
    if (!date) return toast.warning('Wybierz datę raportu.')

    try {
      const base64 = await reportMutation.mutateAsync({ date })

      // Plik pusty lub bardzo mały = brak danych
      if (!base64 || base64.length < 100) {
        toast.info(
          'Brak zleceń w wybranym dniu – raport nie został wygenerowany.'
        )
        return
      }

      const blob = base64ToBlob(
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Raport-${date}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Raport został wygenerowany.')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Nie udało się wygenerować raportu.')
    }
  }

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
          <DialogTitle>Generowanie raportu dziennego</DialogTitle>
          <DialogDescription>
            Wybierz dzień, z którego chcesz wygenerować zestawienie zleceń.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 mt-2 w-full">
          {/* Date input with max = today */}
          <div className="w-full text-center">
            <DatePicker
              selected={date ? new Date(date) : undefined}
              onChange={(d) => {
                if (d) setDate(format(d, 'yyyy-MM-dd'))
              }}
              range="day"
              fullWidth
            />
          </div>

          <Button
            onClick={handleDownload}
            disabled={reportMutation.isLoading}
            className="w-full"
          >
            <MdDownload className="mr-2" />
            {reportMutation.isLoading ? 'Generowanie...' : 'Generuj i pobierz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReportDialog
