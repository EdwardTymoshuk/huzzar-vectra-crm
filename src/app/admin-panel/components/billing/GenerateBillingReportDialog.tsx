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

type ReportType = 'GENERAL' | 'TECHNICIAN'

const GenerateBillingReportDialog = ({ open, onClose }: Props) => {
  const [reportType, setReportType] = useState<ReportType>('GENERAL')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTechnician, setSelectedTechnician] = useState<
    string | undefined
  >(undefined)

  // Pobierz listę techników do wyboru (możesz zamienić endpoint jeśli inny)
  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery()

  // Mutacje
  const reportMutation = trpc.settlement.generateMonthlyReport.useMutation()
  const technicianReportMutation =
    trpc.settlement.generateTechnicianMonthlyReport.useMutation()

  const handleDownload = async () => {
    if (!selectedDate) {
      toast.warning('Wybierz miesiąc.')
      return
    }
    const month = selectedDate.getMonth() + 1
    const year = selectedDate.getFullYear()

    try {
      let base64: string | undefined
      if (reportType === 'GENERAL') {
        base64 = await reportMutation.mutateAsync({ month, year })
      } else if (reportType === 'TECHNICIAN' && selectedTechnician) {
        base64 = await technicianReportMutation.mutateAsync({
          month,
          year,
          technicianId: selectedTechnician,
        })
      } else {
        toast.warning('Wybierz technika.')
        return
      }

      if (!base64 || base64.length < 100) {
        toast.info('Brak danych rozliczeń dla wybranego miesiąca.')
        return
      }
      // Blob download
      const blob = base64ToBlob(
        base64,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        reportType === 'GENERAL'
          ? `Raport-rozliczen-${year}-${String(month).padStart(2, '0')}.xlsx`
          : `Raport-rozliczen-${year}-${String(month).padStart(2, '0')}-${
              technicians.find((t) => t.id === selectedTechnician)?.name ||
              'technik'
            }.xlsx`

      a.click()
      URL.revokeObjectURL(url)
      toast.success('Raport został wygenerowany.')
      onClose()
    } catch (error) {
      console.error(error)
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

  // Po zamknięciu dialogu resetuj wybór technika
  useEffect(() => {
    if (!open) setSelectedTechnician(undefined)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raport miesięczny</DialogTitle>
          <DialogDescription>
            Wybierz typ raportu i miesiąc. Dla raportu technika wybierz także
            technika.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Select
            value={reportType}
            onValueChange={(val) => setReportType(val as ReportType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Typ raportu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GENERAL">Raport ogólny</SelectItem>
              <SelectItem value="TECHNICIAN">Raport technika</SelectItem>
            </SelectContent>
          </Select>
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
          <MonthPicker onChange={setSelectedDate} selected={selectedDate} />
          <Button
            onClick={handleDownload}
            disabled={
              (reportType === 'TECHNICIAN' && !selectedTechnician) ||
              reportMutation.isLoading ||
              technicianReportMutation.isLoading
            }
            className="w-full"
          >
            <MdDownload className="mr-2" />
            {reportMutation.isLoading || technicianReportMutation.isLoading
              ? 'Generowanie...'
              : 'Generuj i pobierz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default GenerateBillingReportDialog
