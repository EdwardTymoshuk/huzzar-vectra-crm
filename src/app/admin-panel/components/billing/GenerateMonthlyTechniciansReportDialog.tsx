'use client'

import MonthPicker from '@/app/components/shared/MonthPicker'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { base64ToBlob } from '@/utils/reports/base64ToBlob'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { MdDownload } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * GenerateTechniciansSummaryDialog
 * -------------------------------------------
 * Dialog that allows downloading a monthly billing summary
 * for all technicians. This is a general report that groups
 * data per technician: assigned jobs, completions, codes used, earnings.
 */
const GenerateTechniciansSummaryDialog = ({ open, onClose }: Props) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Report mutation
  const generalSummaryMutation =
    trpc.settlement.generateTechniciansMonthlySummary.useMutation()

  /**
   * Handles downloading the Excel report (base64 to Blob)
   */
  const handleDownload = async () => {
    if (!selectedDate) {
      toast.warning('Wybierz miesiąc.')
      return
    }

    const month = selectedDate.getMonth() + 1
    const year = selectedDate.getFullYear()

    try {
      const base64 = await generalSummaryMutation.mutateAsync({
        month,
        year,
      })

      if (!base64 || base64.length < 100) {
        toast.info('Brak danych do rozliczenia.')
        return
      }

      // Convert and trigger download
      const blob = base64ToBlob(
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rozliczenie-technicy-${year}-${String(month).padStart(
        2,
        '0'
      )}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Raport został wygenerowany.')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Wystąpił błąd podczas generowania raportu.')
    }
  }

  /**
   * Converts base64 to Blob for download
   */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raport miesięczny (wszyscy technicy)</DialogTitle>
          <DialogDescription>
            Wybierz miesiąc, aby wygenerować raport rozliczenia techników.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <MonthPicker selected={selectedDate} onChange={setSelectedDate} />
          <Button
            onClick={handleDownload}
            disabled={generalSummaryMutation.isLoading}
            className="w-full"
          >
            <MdDownload className="mr-2" />
            {generalSummaryMutation.isLoading
              ? 'Generowanie...'
              : 'Generuj i pobierz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateTechniciansSummaryDialog
