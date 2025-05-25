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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { UserWithBasic } from '@/types'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import { MdDownload } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
}

// Available report types
type ReportType = 'TECHNICIAN' | 'SUMMARY' | 'CODE_BREAKDOWN'

/**
 * GenerateBillingReportDialog
 * ------------------------------------------------
 * Dialog for generating Excel reports:
 * - TECHNICIAN: single technician
 * - SUMMARY: monthly summary for all technicians
 * - CODE_BREAKDOWN: daily breakdown of codes with bottom summary
 */
const GenerateBillingReportDialog = ({ open, onClose }: Props) => {
  const [reportType, setReportType] = useState<ReportType>('TECHNICIAN')
  const [selectedTechnician, setSelectedTechnician] = useState<string>()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery()

  // Mutations
  const technicianReportMutation =
    trpc.settlement.generateTechnicianMonthlyReport.useMutation()
  const monthlySummaryMutation =
    trpc.settlement.generateTechniciansMonthlySummary.useMutation()
  const codeBreakdownMutation =
    trpc.settlement.generateWorkCodeSummaryReport.useMutation()

  /**
   * Converts base64 string to downloadable Blob
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

  /**
   * Handle Excel download
   */
  const handleDownload = async () => {
    const month = selectedDate.getMonth() + 1
    const year = selectedDate.getFullYear()
    let base64: string | undefined

    try {
      if (reportType === 'TECHNICIAN') {
        if (!selectedTechnician) {
          toast.warning('Wybierz technika.')
          return
        }

        base64 = await technicianReportMutation.mutateAsync({
          technicianId: selectedTechnician,
          month,
          year,
        })
      } else if (reportType === 'SUMMARY') {
        base64 = await monthlySummaryMutation.mutateAsync({ month, year })
      } else if (reportType === 'CODE_BREAKDOWN') {
        base64 = await codeBreakdownMutation.mutateAsync({ month, year })
      }

      if (!base64 || base64.length < 100) {
        toast.info('Brak danych dla wybranego miesiąca.')
        return
      }

      const blob = base64ToBlob(
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // File name generation
      const baseName =
        reportType === 'TECHNICIAN'
          ? `Raport-rozliczen-${year}-${String(month).padStart(2, '0')}-${
              technicians.find((t) => t.id === selectedTechnician)?.name ||
              'technik'
            }`
          : reportType === 'SUMMARY'
          ? `Rozliczenie-${year}-${String(month).padStart(2, '0')}`
          : `Zestawienie_kodow_${year}_${String(month).padStart(2, '0')}`

      a.download = `${baseName}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Raport został wygenerowany.')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Nie udało się wygenerować raportu.')
    }
  }

  // Reset technician on close
  useEffect(() => {
    if (!open) setSelectedTechnician(undefined)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raport miesięczny</DialogTitle>
          <DialogDescription>
            Wybierz typ raportu, miesiąc oraz – jeśli dotyczy – technika.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Report type selection */}
          <Select
            value={reportType}
            onValueChange={(val) => setReportType(val as ReportType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Typ raportu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TECHNICIAN">Raport technika</SelectItem>
              <SelectItem value="SUMMARY">Rozliczenie zbiorcze</SelectItem>
              <SelectItem value="CODE_BREAKDOWN">
                Zestawienie wykonanych prac
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Technician selector only for technician report */}
          {reportType === 'TECHNICIAN' && (
            <Select
              value={selectedTechnician}
              onValueChange={setSelectedTechnician}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz technika" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t: UserWithBasic) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Month selection */}
          <MonthPicker selected={selectedDate} onChange={setSelectedDate} />

          {/* Download button */}
          <Button
            onClick={handleDownload}
            disabled={
              (reportType === 'TECHNICIAN' && !selectedTechnician) ||
              technicianReportMutation.isLoading ||
              monthlySummaryMutation.isLoading ||
              codeBreakdownMutation.isLoading
            }
            className="w-full"
          >
            <MdDownload className="mr-2" />
            {(technicianReportMutation.isLoading ||
              monthlySummaryMutation.isLoading ||
              codeBreakdownMutation.isLoading) &&
              'Generowanie...'}
            {!technicianReportMutation.isLoading &&
              !monthlySummaryMutation.isLoading &&
              !codeBreakdownMutation.isLoading &&
              'Generuj i pobierz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateBillingReportDialog
