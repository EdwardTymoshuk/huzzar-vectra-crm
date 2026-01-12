'use client'

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

type ReportType = 'TECHNICIAN_STOCK' | 'WAREHOUSE_STOCK'

const ReportsDialog = ({ open, onClose }: Props) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [technicianId, setTechnicianId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { data: technicians = [] } = trpc.vectra.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  const reportTech =
    trpc.vectra.warehouse.generateTechnicianStockReport.useMutation()
  const reportWarehouse =
    trpc.vectra.warehouse.generateWarehouseStockReport.useMutation()

  /**
   * handleGenerate
   * ------------------------------------------------------
   * Executes the selected report and downloads the Excel file.
   */
  const handleGenerate = async () => {
    try {
      setLoading(true)

      // --------------------------
      // TECHNICIAN STOCK REPORT
      // --------------------------
      if (selectedReport === 'TECHNICIAN_STOCK') {
        if (!technicianId) {
          toast.error('Wybierz technika')
          return
        }

        const base64 = await reportTech.mutateAsync({ technicianId })

        const binaryString = atob(base64)
        const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const techName =
          technicians.find((t) => t.id === technicianId)?.name || 'technician'

        const link = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = link
        a.download = `Stan-technika-${techName}.xlsx`
        a.click()
        URL.revokeObjectURL(link)

        toast.success('Raport został wygenerowany.')
        onClose()
      }

      // --------------------------
      // WAREHOUSE STOCK REPORT
      // --------------------------
      if (selectedReport === 'WAREHOUSE_STOCK') {
        const base64 = await reportWarehouse.mutateAsync()

        const binaryString = atob(base64)
        const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0))
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const link = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = link
        a.download = `Stan-magazynu.xlsx`
        a.click()
        URL.revokeObjectURL(link)

        toast.success('Raport magazynowy został wygenerowany.')
        onClose()
      }
    } catch (err) {
      console.error(err)
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

        {/* Select report */}
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
          </SelectContent>
        </Select>

        {/* Technician selector */}
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
