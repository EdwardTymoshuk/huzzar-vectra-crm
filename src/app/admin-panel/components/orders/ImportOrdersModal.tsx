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
  parseOrdersFromExcel,
  type ParsedOrderFromExcel,
} from '@/utils/excelParsers/excelParsers'
import { normalizeName } from '@/utils/normalizeName'
import { trpc } from '@/utils/trpc'
import { DragEvent, useState } from 'react'
import { MdFileUpload } from 'react-icons/md'
import { toast } from 'sonner'

const ALLOWED_EXTENSIONS = ['xls', 'xlsx']

interface ImportOrdersModalProps {
  open: boolean
  onClose: () => void
}

/**
 * ImportOrdersModal
 * --------------------------------------------------------------
 * Allows administrators/coordinators to upload installation orders
 * from Excel (.xls/.xlsx). Performs:
 * - local parsing,
 * - technician name → ID resolution,
 * - bulk create via TRPC (createOrder),
 * - detailed summary report (added / skipped / duplicates / errors).
 */
const ImportOrdersModal: React.FC<ImportOrdersModalProps> = ({
  open,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [orders, setOrders] = useState<ParsedOrderFromExcel[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const utils = trpc.useUtils()
  const createOrderMutation = trpc.order.createOrder.useMutation()

  /** Ensures correct file type */
  const isExcelFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return !!ext && ALLOWED_EXTENSIONS.includes(ext)
  }

  /** File picker handler */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isExcelFile(file)) {
      toast.error(
        'Nieobsługiwany format pliku. Akceptowane są tylko .xls/.xlsx.'
      )
      return
    }
    setSelectedFile(file)
    parseExcelFile(file)
  }

  /** Drag & drop handler */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!isExcelFile(file)) {
      toast.error(
        'Nieobsługiwany format pliku. Akceptowane są tylko .xls/.xlsx.'
      )
      return
    }

    setSelectedFile(file)
    parseExcelFile(file)
  }

  /** Parses Excel file into normalized rows */
  const parseExcelFile = async (file: File) => {
    try {
      const result = await parseOrdersFromExcel(file)
      setOrders(result)
      toast.success(`Wczytano ${result.length} rekordów z pliku.`)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Błąd podczas parsowania pliku.'
      toast.error(msg)
    }
  }

  /**
   * Resolves technician names to user IDs using normalization.
   * This avoids mismatches due to diacritics or inconsistent formats.
   */
  const resolveTechniciansByName = async (
    names: string[]
  ): Promise<Map<string, string | undefined>> => {
    const uniqueNormalized = Array.from(
      new Set(
        names
          .map((n) => n?.trim())
          .filter((n): n is string => !!n)
          .map((n) => normalizeName(n))
      )
    )

    const result = new Map<string, string | undefined>()
    if (uniqueNormalized.length === 0) return result

    const allTechs = await utils.user.getTechnicians.fetch({ status: 'ACTIVE' })

    const index = new Map<string, string>()
    for (const t of allTechs) {
      index.set(normalizeName(t.name), t.id)
    }

    for (const n of uniqueNormalized) {
      result.set(n, index.get(n))
    }

    return result
  }

  /**
   * Performs bulk import using createOrder mutation.
   * Categorizes results into:
   * - added
   * - skipped (completed already)
   * - duplicates
   * - other errors
   * Shows detailed summary toast.
   */
  const uploadOrders = async () => {
    if (!orders.length) {
      toast.error('Brak danych do dodania.')
      return
    }

    try {
      const namesToResolve = orders
        .map((o) => o.assignedToName)
        .filter((v): v is string => !!v)

      const nameToIdMap = await resolveTechniciansByName(namesToResolve)

      let unresolvedTechCount = 0

      const results = await Promise.allSettled(
        orders.map((o) => {
          const assignedToId = o.assignedToName
            ? nameToIdMap.get(normalizeName(o.assignedToName))
            : undefined

          if (!assignedToId && o.assignedToName) {
            unresolvedTechCount++
          }

          return createOrderMutation.mutateAsync({
            operator: o.operator,
            type: o.type,
            clientId: o.clientId,
            orderNumber: o.orderNumber,
            date: o.date,
            timeSlot: o.timeSlot,
            clientPhoneNumber: undefined,
            notes: o.notes,
            county: undefined,
            municipality: undefined,
            city: o.city,
            street: o.street,
            postalCode: o.postalCode,
            assignedToId,
          })
        })
      )

      // --------------------------------------------------------
      // Categorization
      // --------------------------------------------------------
      let addedCount = 0
      let duplicateCount = 0
      let skippedCompletedCount = 0
      let otherErrors = 0

      for (const r of results) {
        if (r.status === 'fulfilled') {
          addedCount++
          continue
        }

        const msg: string = r.reason?.message ?? ''

        if (msg.includes('już wykonane')) skippedCompletedCount++
        else if (msg.includes('już istnieje')) duplicateCount++
        else otherErrors++
      }

      // --------------------------------------------------------
      // Final summary
      // --------------------------------------------------------
      toast.success(
        `📌 Podsumowanie importu:
Dodane: ${addedCount}
Pominięte (wykonane): ${skippedCompletedCount}
Duplikaty aktywnych: ${duplicateCount}
Inne błędy: ${otherErrors}`
      )

      if (unresolvedTechCount > 0) {
        toast.warning(
          `Nie przypisano ${unresolvedTechCount} zleceń — technik nie został odnaleziony.`
        )
      }

      utils.order.getOrders.invalidate()
      onClose()
    } catch {
      toast.error('Wystąpił błąd podczas dodawania zleceń.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import zleceń z Excela</DialogTitle>
          <DialogDescription>
            Przeciągnij plik Excel lub kliknij, aby wybrać.
          </DialogDescription>
        </DialogHeader>

        {/* File drop area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer"
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <MdFileUpload className="text-5xl mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">
            {isDragOver
              ? 'Upuść plik tutaj'
              : selectedFile
              ? selectedFile.name
              : 'Przeciągnij plik lub kliknij tutaj'}
          </p>

          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Import button */}
        <Button
          className="w-full mt-4"
          disabled={!orders.length}
          onClick={uploadOrders}
        >
          Wczytaj do systemu
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default ImportOrdersModal
