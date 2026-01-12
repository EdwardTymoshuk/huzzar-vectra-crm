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
import { polishMonthsNominative } from '@/lib/constants'
import { trpc } from '@/utils/trpc'
import { useState } from 'react'
import { toast } from 'sonner'

/**
 * ReportsDialog
 * --------------------------------------------------------
 * Unified entry point for all warehouse report downloads.
 */
type Props = {
  open: boolean
  onClose: () => void
}

type ReportType =
  | 'TECHNICIAN_STOCK'
  | 'WAREHOUSE_STOCK'
  | 'USED_MATERIALS_INSTALLATIONS'

const ReportsDialog = ({ open, onClose }: Props) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [technicianId, setTechnicianId] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  const reportTech = trpc.warehouse.generateTechnicianStockReport.useMutation()
  const reportWarehouse =
    trpc.warehouse.generateWarehouseStockReport.useMutation()
  const reportUsedMaterials =
    trpc.warehouse.generateUsedMaterialsInstallationReport.useMutation()

  /**
   * handleGenerate
   * ------------------------------------------------------
   * Executes the selected report and downloads the Excel file.
   */
  const handleGenerate = async () => {
    try {
      setLoading(true)

      // --------------------------------------------------
      // TECHNICIAN STOCK REPORT
      // --------------------------------------------------
      if (selectedReport === 'TECHNICIAN_STOCK') {
        if (!technicianId) {
          toast.error('Wybierz technika')
          return
        }

        const base64 = await reportTech.mutateAsync({ technicianId })

        downloadExcel(
          base64,
          `Stan-technika-${
            technicians.find((t) => t.id === technicianId)?.name ?? 'technik'
          }.xlsx`
        )

        toast.success('Raport został wygenerowany.')
        onClose()
      }

      // --------------------------------------------------
      // WAREHOUSE STOCK REPORT
      // --------------------------------------------------
      if (selectedReport === 'WAREHOUSE_STOCK') {
        const base64 = await reportWarehouse.mutateAsync()

        downloadExcel(base64, 'Stan-magazynu.xlsx')

        toast.success('Raport magazynowy został wygenerowany.')
        onClose()
      }

      // --------------------------------------------------
      // USED MATERIALS – INSTALLATIONS (MONTHLY)
      // --------------------------------------------------
      if (selectedReport === 'USED_MATERIALS_INSTALLATIONS') {
        const year = selectedMonth.getFullYear()
        const month = selectedMonth.getMonth() // 0–11

        const base64 = await reportUsedMaterials.mutateAsync({
          year,
          month,
        })

        const monthName = polishMonthsNominative[month]

        downloadExcel(
          base64,
          `Zuzyte-materialy-instalacje-${monthName}-${year}.xlsx`
        )

        toast.success('Raport został wygenerowany.')
        onClose()
      }
    } catch (error) {
      console.error(error)
      toast.error('Błąd podczas generowania raportu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raporty magazynowe</DialogTitle>
          <DialogDescription>
            Wybierz raport do wygenerowania.
          </DialogDescription>
        </DialogHeader>

        {/* REPORT TYPE */}
        <Select onValueChange={(v: ReportType) => setSelectedReport(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz raport" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TECHNICIAN_STOCK">
              Stan technika (urządzenia + materiały)
            </SelectItem>

            <SelectItem value="WAREHOUSE_STOCK">
              Stan magazynu (urządzenia + materiały)
            </SelectItem>

            <SelectItem value="USED_MATERIALS_INSTALLATIONS">
              Zużyte materiały – instalacje (miesięczne)
            </SelectItem>
          </SelectContent>
        </Select>

        {/* TECHNICIAN SELECT */}
        {selectedReport === 'TECHNICIAN_STOCK' && (
          <div className="mt-4">
            <Select onValueChange={setTechnicianId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz technika" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* MONTH PICKER */}
        {selectedReport === 'USED_MATERIALS_INSTALLATIONS' && (
          <div className="mt-4">
            <MonthPicker selected={selectedMonth} onChange={setSelectedMonth} />
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button
            disabled={loading || !selectedReport}
            onClick={handleGenerate}
          >
            {loading ? 'Generuję…' : 'Pobierz raport'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReportsDialog

/**
 * downloadExcel
 * --------------------------------------------------------
 * Helper for downloading base64 encoded Excel files.
 */
function downloadExcel(base64: string, filename: string): void {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const link = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = link
  a.download = filename
  a.click()
  URL.revokeObjectURL(link)
}
