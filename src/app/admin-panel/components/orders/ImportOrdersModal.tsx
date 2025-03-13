'use client'

import { OrderFormData } from '@/app/admin-panel/components/orders/OrderFormFields'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { parseUnifiedOrdersFromExcel } from '@/utils/excelParsers'
import { trpc } from '@/utils/trpc'
import { DragEvent, useState } from 'react'
import { MdFileUpload } from 'react-icons/md'
import { toast } from 'sonner'

// Allowed file extensions for Excel
const ALLOWED_EXTENSIONS = ['xls', 'xlsx']

interface ImportOrdersModalProps {
  open: boolean
  onClose: () => void
}

/**
 * ImportOrdersModal component:
 * - Allows user to select an Excel file (drag & drop or click).
 * - Parses the file and uploads the orders to the database.
 * - Checks file type and required columns before proceeding.
 */
const ImportOrdersModal: React.FC<ImportOrdersModalProps> = ({
  open,
  onClose,
}) => {
  // Stores the selected file from input or drag & drop
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Stores the parsed orders from the Excel file
  const [orders, setOrders] = useState<OrderFormData[]>([])
  // Manages the hover state when dragging over the drop zone
  const [isDragOver, setIsDragOver] = useState(false)

  const utils = trpc.useUtils()
  const createOrderMutation = trpc.order.createOrder.useMutation()

  /**
   * Checks if the file has an allowed extension (.xls or .xlsx).
   * Returns true if valid, false otherwise.
   */
  const isExcelFile = (file: File) => {
    const parts = file.name.split('.')
    const ext = parts[parts.length - 1].toLowerCase()
    return ALLOWED_EXTENSIONS.includes(ext)
  }

  /**
   * Called whenever the user selects a file via the <input type="file"/>.
   * We validate file type, then parse it if it's valid.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!isExcelFile(file)) {
        toast.error(
          'Nieobsługiwany format pliku. Akceptowane są tylko pliki Excel (.xls, .xlsx).'
        )
        return
      }
      setSelectedFile(file)
      parseExcelFile(file)
    }
  }

  /**
   * Called when a file is dropped into the drop zone.
   * We validate file type, then parse it if it's valid.
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (!isExcelFile(file)) {
        toast.error(
          'Nieobsługiwany format pliku. Akceptowane są tylko pliki Excel (.xls, .xlsx).'
        )
        return
      }
      setSelectedFile(file)
      parseExcelFile(file)
    }
  }

  /**
   * Uses our parser function to convert the Excel file into an array of orders.
   * If any required columns are missing, we throw an error with a relevant message.
   */
  const parseExcelFile = async (file: File) => {
    try {
      const result = await parseUnifiedOrdersFromExcel(file)
      setOrders(result)
    } catch (error: unknown) {
      // Then we narrow it down to 'Error' if possible.
      console.error('Error parsing Excel file:', error)

      if (error instanceof Error) {
        // If it's an Error object, we can safely access 'error.message'
        toast.error(error.message)
      } else {
        // Otherwise, we provide a fallback message
        toast.error(
          'Błąd podczas parsowania pliku Excel. Sprawdź poprawność formatu.'
        )
      }
    }
  }

  /**
   * Uploads parsed orders to the database.
   */
  const uploadOrders = async () => {
    if (!orders.length) {
      toast.error(
        'Brak danych do dodania. Upewnij się, że plik Excel jest prawidłowy.'
      )
      return
    }

    try {
      // We batch-create orders in parallel
      const results = await Promise.allSettled(
        orders.map((order) =>
          createOrderMutation.mutateAsync({
            ...order,
            // If equipmentNeeded is a string, split it; otherwise use array or default
            equipmentNeeded:
              typeof order.equipmentNeeded === 'string'
                ? order.equipmentNeeded.split(',').map((s) => s.trim())
                : order.equipmentNeeded || [],
          })
        )
      )

      const addedCount = results.filter((r) => r.status === 'fulfilled').length
      const duplicateCount = results.filter(
        (r) =>
          r.status === 'rejected' &&
          (r as PromiseRejectedResult).reason.message.includes(
            'Unique constraint failed'
          )
      ).length

      if (addedCount === 0) {
        toast.warning('Wszystkie zlecenia z pliku już są dodane.')
      } else {
        toast.success(
          `Dodano ${addedCount} zlecenie(a). Pominięto ${duplicateCount} duplikatów.`
        )
      }
      utils.order.getOrders.invalidate()
      onClose()
    } catch (error) {
      console.error('Error adding orders:', error)
      toast.error('Wystąpił błąd podczas dodawania zleceń do systemu.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wczytaj plik ze zleceniami</DialogTitle>
          <DialogDescription>
            Przeciągnij plik Excel lub kliknij, aby wybrać z komputera.
          </DialogDescription>
        </DialogHeader>

        {/* Drag & Drop area */}
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

          {/* Hidden file input for fallback click */}
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Button to upload parsed orders */}
        <Button
          className="w-full"
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
