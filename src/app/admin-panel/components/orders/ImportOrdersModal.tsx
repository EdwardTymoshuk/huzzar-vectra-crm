// src/app/admin-panel/components/ordes/ImportOrdersModal.tsx
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
} from '@/utils/excelParsers'
import { trpc } from '@/utils/trpc'
import { DragEvent, useState } from 'react'
import { MdFileUpload } from 'react-icons/md'
import { toast } from 'sonner'

const ALLOWED_EXTENSIONS = ['xls', 'xlsx']

interface ImportOrdersModalProps {
  open: boolean
  onClose: () => void
}

const ImportOrdersModal: React.FC<ImportOrdersModalProps> = ({
  open,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [orders, setOrders] = useState<ParsedOrderFromExcel[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const utils = trpc.useUtils()
  // ✅ Single backend call that: resolves technicians, creates orders, returns summary
  const importMutation = trpc.order.importParsedOrders.useMutation()

  /** Check file extension against accepted Excel formats. */
  const isExcelFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return !!ext && ALLOWED_EXTENSIONS.includes(ext)
  }

  /** Handle manual file selection. */
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

  /** Handle drag & drop area. */
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

  /** Parse Excel on client — returns normalized orders ready for BE import. */
  const parseExcelFile = async (file: File) => {
    try {
      const result = await parseOrdersFromExcel(file)
      setOrders(result)
      toast.success(`Wczytano ${result.length} rekordów z pliku.`)
    } catch (err) {
      console.error('Error parsing Excel file:', err)
      const msg =
        err instanceof Error ? err.message : 'Błąd podczas parsowania pliku.'
      toast.error(msg)
    }
  }

  /** Upload parsed orders — backend resolves technicians + creates orders. */
  const uploadOrders = async () => {
    if (!orders.length) {
      toast.error('Brak danych do dodania.')
      return
    }
    try {
      const res = await importMutation.mutateAsync({ orders })
      const { created, duplicates, unresolved } = res

      if (created > 0) {
        toast.success(`Dodano ${created}. Duplikaty: ${duplicates}.`)
      } else {
        toast.warning(`Brak nowych zleceń. Duplikaty: ${duplicates}.`)
      }

      if (unresolved.length) {
        // Log for debugging; optionally show in a dedicated UI
        console.warn('Unresolved technicians:', unresolved)
        toast.warning(
          `Nie przypisano ${unresolved.length} zleceń — brak dopasowania technika.`
        )
      }

      utils.order.getOrders.invalidate()
      onClose()
    } catch (error) {
      console.error('Error importing orders:', error)
      toast.error('Wystąpił błąd podczas importu.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wczytaj plik ze zleceniami</DialogTitle>
          <DialogDescription>
            Przeciągnij plik Excel lub kliknij, aby wybrać.
          </DialogDescription>
        </DialogHeader>

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

        <Button
          className="w-full"
          disabled={!orders.length || importMutation.isLoading}
          onClick={uploadOrders}
        >
          {importMutation.isLoading ? 'Importuję...' : 'Wczytaj do systemu'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default ImportOrdersModal
