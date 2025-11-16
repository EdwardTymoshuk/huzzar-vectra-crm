// app/(dashboard)/billings/components/billing/GenerateBillingReportDialog.tsx
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
import { UserWithBasic } from '@/types'
import { trpc } from '@/utils/trpc'
import { useEffect, useState } from 'react'
import { MdDownload } from 'react-icons/md'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onClose: () => void
  /** Notifies parent page that long-running work started/finished (to show a global loader) */
  onLoadingChange?: (loading: boolean) => void
}

type ReportType =
  | 'TECHNICIAN'
  | 'SUMMARY'
  | 'CODE_BREAKDOWN'
  | 'SETTLEMENT_REPORT'
  | 'INSTALLATION_MONTH'

const GenerateBillingReportDialog = ({
  open,
  onClose,
  onLoadingChange,
}: Props) => {
  const [reportType, setReportType] = useState<ReportType>('TECHNICIAN')
  const [selectedTechnician, setSelectedTechnician] = useState<string>()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Year selection for yearly report:
  // Keep both: a Date for DatePicker and a string year used in API/file names.
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  )
  const [yearDate, setYearDate] = useState<Date>(
    new Date(Number(new Date().getFullYear()), 0, 1)
  )

  // Technicians list
  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  // Mutations
  const technicianReportMutation =
    trpc.settlement.generateTechnicianMonthlyReport.useMutation()
  const monthlySummaryMutation =
    trpc.settlement.generateTechniciansMonthlySummary.useMutation()
  const codeBreakdownMutation =
    trpc.settlement.generateWorkCodeSummaryReport.useMutation()
  const yearlyTemplateMutation =
    trpc.settlement.generateYearlyInstallationReport.useMutation()
  const monthlyTemplateMutation =
    trpc.settlement.generateMonthlyInstallationReport.useMutation()

  // Helper: base64 -> Blob
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

  // Trigger report generation / download
  const handleDownload = async () => {
    const month = selectedDate.getMonth() + 1
    const yearFromDate = selectedDate.getFullYear()
    const yearNumber = Number(selectedYear)
    let base64: string | undefined

    onLoadingChange?.(true)
    try {
      if (reportType === 'TECHNICIAN') {
        if (!selectedTechnician) {
          toast.warning('Wybierz technika.')
          return
        }
        base64 = await technicianReportMutation.mutateAsync({
          technicianId: selectedTechnician,
          month,
          year: yearFromDate,
        })
      } else if (reportType === 'SUMMARY') {
        base64 = await monthlySummaryMutation.mutateAsync({
          month,
          year: yearFromDate,
        })
      } else if (reportType === 'CODE_BREAKDOWN') {
        base64 = await codeBreakdownMutation.mutateAsync({
          month,
          year: yearFromDate,
        })
      } else if (reportType === 'SETTLEMENT_REPORT') {
        // Yearly, pre-filled installation report
        base64 = await yearlyTemplateMutation.mutateAsync({ year: yearNumber })
        const blob = base64ToBlob(
          base64,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `RAP.-ROZ. ${yearNumber}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Raport roczny został wygenerowany.')
        onClose()
        return
      } else if (reportType === 'INSTALLATION_MONTH') {
        base64 = await monthlyTemplateMutation.mutateAsync({
          year: yearFromDate,
          month,
        })
        const blob = base64ToBlob(
          base64,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `RAP.-ROZ. ${month}, ${yearFromDate}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Raport miesięczny został wygenerowany.')
        onClose()
        return
      }

      if (!base64 || base64.length < 100) {
        toast.info('Brak danych dla wskazanego okresu.')
        return
      }

      // Download monthly files
      const blob = base64ToBlob(
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const baseName =
        reportType === 'TECHNICIAN'
          ? `Raport-rozliczen-${yearFromDate}-${String(month).padStart(
              2,
              '0'
            )}-${
              technicians.find((t) => t.id === selectedTechnician)?.name ||
              'technik'
            }`
          : reportType === 'SUMMARY'
          ? `Rozliczenie-${yearFromDate}-${String(month).padStart(2, '0')}`
          : `Zestawienie_kodow_${yearFromDate}_${String(month).padStart(
              2,
              '0'
            )}`

      a.download = `${baseName}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Raport został wygenerowany.')
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Nie udało się wygenerować raportu.')
    } finally {
      onLoadingChange?.(false)
    }
  }

  // Reset technician when dialog closes
  useEffect(() => {
    if (!open) setSelectedTechnician(undefined)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raporty</DialogTitle>
          <DialogDescription>
            Wybierz typ raportu. Dla raportów miesięcznych wskaż miesiąc, a dla
            rocznego wybierz rok.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Report type */}
          <Select
            value={reportType}
            onValueChange={(val) => setReportType(val as ReportType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Typ raportu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TECHNICIAN">
                Raport technika (miesięczny)
              </SelectItem>
              <SelectItem value="SUMMARY">
                Rozliczenie zbiorcze (miesięczne)
              </SelectItem>
              <SelectItem value="CODE_BREAKDOWN">
                Zestawienie prac (miesięczne)
              </SelectItem>
              <SelectItem value="INSTALLATION_MONTH">
                Raport rozliczeniowy (miesięczny)
              </SelectItem>
              <SelectItem value="SETTLEMENT_REPORT">
                Raport rozliczeniowy (roczny)
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Technician — only for technician report */}
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

          {/* Month — for monthly reports */}
          {[
            'TECHNICIAN',
            'SUMMARY',
            'CODE_BREAKDOWN',
            'INSTALLATION_MONTH',
          ].includes(reportType) && (
            <MonthPicker selected={selectedDate} onChange={setSelectedDate} />
          )}

          {/* Year — only for yearly report */}
          {reportType === 'SETTLEMENT_REPORT' && (
            <div className="w-full flex justify-center">
              <DatePicker
                selected={yearDate}
                onChange={(d) => {
                  if (!d) return
                  setYearDate(d)
                  setSelectedYear(String(d.getFullYear()))
                }}
                range="year"
                fullWidth
              />
            </div>
          )}

          <Button
            onClick={handleDownload}
            disabled={
              (reportType === 'TECHNICIAN' && !selectedTechnician) ||
              technicianReportMutation.isLoading ||
              monthlySummaryMutation.isLoading ||
              codeBreakdownMutation.isLoading ||
              yearlyTemplateMutation.isLoading
            }
            className="w-full"
          >
            <MdDownload className="mr-2" />
            {(technicianReportMutation.isLoading ||
              monthlySummaryMutation.isLoading ||
              codeBreakdownMutation.isLoading ||
              yearlyTemplateMutation.isLoading) &&
              'Generowanie...'}
            {!technicianReportMutation.isLoading &&
              !monthlySummaryMutation.isLoading &&
              !codeBreakdownMutation.isLoading &&
              !yearlyTemplateMutation.isLoading &&
              'Generuj i pobierz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateBillingReportDialog
