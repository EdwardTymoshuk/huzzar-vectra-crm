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

const ImportOrdersModal: React.FC<ImportOrdersModalProps> = ({
  open,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [orders, setOrders] = useState<ParsedOrderFromExcel[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const utils = trpc.useUtils()
  const createOrderMutation = trpc.order.createOrder.useMutation()

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

  /**
   * Resolve unique technician names to IDs via backend search endpoint.
   * Returns a map: normalizedName -> userId (or undefined when not found).
   */
  const resolveTechniciansByName = async (
    names: string[]
  ): Promise<Map<string, string | undefined>> => {
    const unique = Array.from(
      new Set(names.map((n) => normalizeName(n)).filter(Boolean))
    )
    const map = new Map<string, string | undefined>()

    // Short-circuit when nothing to resolve
    if (unique.length === 0) return map

    // Fetch per name (keeps code simple & reliable; endpoint is fast and capped by limit)
    await Promise.all(
      unique.map(async (n) => {
        try {
          const results = await utils.user.searchTechniciansByName.fetch({
            query: n,
            limit: 5,
          })
          if (!results || results.length === 0) {
            map.set(n, undefined)
            return
          }
          // Prefer exact case-insensitive match after normalization, else take the first result
          const exact = results.find((r) => normalizeName(r.name) === n)
          map.set(n, (exact ?? results[0]).id)
        } catch (e) {
          console.error('resolveTechniciansByName error for', n, e)
          map.set(n, undefined)
        }
      })
    )

    return map
  }

  const uploadOrders = async () => {
    if (!orders.length) {
      toast.error('Brak danych do dodania.')
      return
    }
    try {
      // Gather unique technician display names present in parsed rows
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

          // Log missing match (only once per row)
          if (!assignedToId && o.assignedToName) {
            console.warn(
              `Brak technika: "${o.assignedToName}" → ${normalizeName(
                o.assignedToName
              )} (brak dopasowania)`
            )
            unresolvedTechCount++
          }

          return createOrderMutation.mutateAsync({
            operator: o.operator,
            type: o.type,
            orderNumber: o.orderNumber,
            date: o.date,
            timeSlot: o.timeSlot,
            contractRequired: false,
            equipmentNeeded: [],
            clientPhoneNumber: undefined,
            notes: o.notes,
            status: o.status,
            county: undefined,
            municipality: undefined,
            city: o.city,
            street: o.street,
            postalCode: o.postalCode,
            assignedToId,
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

      if (addedCount > 0) {
        toast.success(
          `Dodano ${addedCount}. Pominięto duplikaty: ${duplicateCount}.`
        )
      } else {
        toast.warning(
          'Wszystkie zlecenia z pliku już istnieją lub wystąpiły błędy.'
        )
      }

      if (unresolvedTechCount > 0) {
        toast.warning(
          `Nie przypisano ${unresolvedTechCount} zleceń — nie znaleziono technika po nazwie.`
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
