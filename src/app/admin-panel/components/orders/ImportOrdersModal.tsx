// src/app/.../ImportOrdersModal.tsx
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
import { DragEvent, useMemo, useState } from 'react'
import { MdFileUpload } from 'react-icons/md'
import { toast } from 'sonner'

const ALLOWED_EXTENSIONS = ['xls', 'xlsx']

interface ImportOrdersModalProps {
  open: boolean
  onClose: () => void
}

/**
 * ImportOrdersModal:
 * - Parses the new planner Excel format.
 * - Resolves technician by NAME to user ID (active users).
 * - Sends status, operator, timeSlot, and notes (with external client id).
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

  // Fetch active technicians to resolve names → IDs
  const { data: technicians = [] } = trpc.user.getTechnicians.useQuery({
    status: 'ACTIVE',
  })

  /** Build a name → id map (case-insensitive) */
  const techNameToId = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of technicians) {
      if (!t?.name || !t?.id) continue
      map.set(t.name.trim().toLowerCase(), t.id)
    }
    return map
  }, [technicians])

  const isExcelFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return !!ext && ALLOWED_EXTENSIONS.includes(ext)
  }

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

  const uploadOrders = async () => {
    if (!orders.length) {
      toast.error('Brak danych do dodania.')
      return
    }

    try {
      const results = await Promise.allSettled(
        orders.map((o) => {
          // Resolve assignedToId from name (if provided)
          const assignedToId = o.assignedToName
            ? techNameToId.get(o.assignedToName.trim().toLowerCase())
            : undefined

          // If technician name not found: keep unassigned, but append info to notes
          const notes =
            assignedToId || !o.assignedToName
              ? o.notes
              : `${
                  o.notes ? o.notes + ' | ' : ''
                }Technik (nieznaleziony po nazwie): ${o.assignedToName}`

          // Build payload for createOrder (server zod expects arrays for equipmentNeeded)
          return createOrderMutation.mutateAsync({
            operator: o.operator,
            type: o.type,
            orderNumber: o.orderNumber,
            date: o.date,
            timeSlot: o.timeSlot,
            contractRequired: false,
            equipmentNeeded: [],
            clientPhoneNumber: undefined, // not provided in new file; keep undefined
            notes,
            status: o.status,
            county: undefined,
            municipality: undefined,
            city: o.city,
            street: o.street,
            postalCode: o.postalCode,
            assignedToId: assignedToId, // may be undefined if not found
          })
        })
      )

      const addedCount = results.filter((r) => r.status === 'fulfilled').length
      const duplicateCount = results.filter(
        (r) =>
          r.status === 'rejected' &&
          (r as PromiseRejectedResult).reason?.message?.includes(
            'Unique constraint failed'
          )
      ).length

      if (addedCount === 0) {
        toast.warning(
          'Wszystkie zlecenia z pliku już istnieją lub wystąpiły błędy.'
        )
      } else {
        toast.success(
          `Dodano ${addedCount}. Pominięto duplikaty: ${duplicateCount}.`
        )
      }

      utils.order.getOrders.invalidate()
      onClose()
    } catch (error) {
      console.error('Error adding orders:', error)
      toast.error('Wystąpił błąd podczas dodawania zleceń.')
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

        {/* Drag & Drop */}
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
