'use client'

import {
  parseOplOrdersFromExcel,
  type ParsedOplOrderFromExcel,
} from '@/app/(modules)/opl-crm/utils/excelParsers/oplExcelParsers'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { normalizeName } from '@/utils/normalizeName'
import { trpc } from '@/utils/trpc'
import { OplDeviceCategory } from '@prisma/client'
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
  const [orders, setOrders] = useState<ParsedOplOrderFromExcel[]>([])
  const [isDragOver, setIsDragOver] = useState(false)

  const utils = trpc.useUtils()
  const bulkImportMutation = trpc.opl.order.bulkImport.useMutation()

  /** Ensures correct file type */
  const isExcelFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return !!ext && ALLOWED_EXTENSIONS.includes(ext)
  }

  /** File picker handler */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 🔐 1) Limit rozmiaru pliku
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Plik jest zbyt duży. Maksymalny rozmiar to 2 MB.')
      return
    }

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

    // 🔐 1) Limit rozmiaru pliku
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Plik jest zbyt duży. Maksymalny rozmiar to 2 MB.')
      return
    }

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
      const result = await parseOplOrdersFromExcel(file)
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

    const allTechs = await utils.opl.user.getTechnicians.fetch({
      status: 'ACTIVE',
    })

    const index = new Map<string, string>()
    for (const t of allTechs) {
      index.set(normalizeName(t.name), t.id)
    }

    for (const n of uniqueNormalized) {
      result.set(n, index.get(n))
    }

    return result
  }

  const resolveEquipmentRequirements = async (
    parsed: ParsedOplOrderFromExcel[]
  ): Promise<{
    requirementsByOrder: Map<
      string,
      Array<{ deviceDefinitionId: string; quantity: number }>
    >
    unresolvedByOrder: Map<string, string[]>
  }> => {
    const defs = await utils.opl.settings.getAllOplDeviceDefinitions.fetch()

    const normalizeToken = (value: string) =>
      value
        .toUpperCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim()

    const isCategoryHint = (value: string) =>
      value.includes('MODEM') ||
      value.includes('DEKODER') ||
      value.includes('ONT')

    const matchDefinition = (
      token: string
    ): { id: string; category: OplDeviceCategory; name: string } | null => {
      const normalized = normalizeToken(token)
      if (!normalized) return null

      const candidates = defs
        .map((d) => ({
          id: d.id,
          category: d.category,
          name: d.name,
          normalized: normalizeToken(d.name),
        }))
        .filter(
          (d) =>
            d.normalized.includes(normalized) || normalized.includes(d.normalized)
        )
        .sort((a, b) => b.normalized.length - a.normalized.length)

      if (candidates.length > 0) return candidates[0]

      if (normalized.includes('FUNBOX 3')) {
        return (
          defs
            .map((d) => ({
              id: d.id,
              category: d.category,
              name: d.name,
              normalized: normalizeToken(d.name),
            }))
            .find((d) => d.normalized.includes('FUNBOX 3')) ?? null
        )
      }

      return null
    }

    const requirementsByOrder = new Map<
      string,
      Array<{ deviceDefinitionId: string; quantity: number }>
    >()
    const unresolvedByOrder = new Map<string, string[]>()

    for (const order of parsed) {
      if (!order.equipmentToDeliver.length) continue

      const grouped = new Map<string, number>()
      for (const token of order.equipmentToDeliver) {
        if (isCategoryHint(token.toUpperCase())) continue
        const normalizedToken = normalizeToken(token)
        if (normalizedToken.includes('TERMINAL ONT')) {
          const ontV9 = defs
            .map((d) => ({
              id: d.id,
              category: d.category,
              name: d.name,
              normalized: normalizeToken(d.name),
            }))
            .find(
              (d) =>
                d.normalized.includes('ONT V9') ||
                (d.category === 'ONT' && d.normalized.includes('V9'))
            )
          if (ontV9) {
            grouped.set(ontV9.id, (grouped.get(ontV9.id) ?? 0) + 1)
            continue
          }
        }

        const matched = matchDefinition(token)
        if (!matched) {
          const list = unresolvedByOrder.get(order.orderNumber) ?? []
          list.push(token)
          unresolvedByOrder.set(order.orderNumber, list)
          continue
        }
        grouped.set(matched.id, (grouped.get(matched.id) ?? 0) + 1)
      }

      if (grouped.size > 0) {
        requirementsByOrder.set(
          order.orderNumber,
          Array.from(grouped.entries()).map(
            ([deviceDefinitionId, quantity]) => ({
              deviceDefinitionId,
              quantity,
            })
          )
        )
      }
    }

    return { requirementsByOrder, unresolvedByOrder }
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
      // 1) Resolve technicians
      const namesToResolve = orders
        .flatMap((o) => o.assignedToNames ?? [])
        .filter((v): v is string => !!v)

      const nameToIdMap = await resolveTechniciansByName(namesToResolve)
      const { requirementsByOrder, unresolvedByOrder } =
        await resolveEquipmentRequirements(orders)

      let unresolvedTechCount = 0

      // 2) Build final payload for bulk import
      const payload = orders.map((o) => {
        const assignedTechnicianIds = (o.assignedToNames ?? [])
          .map((name) => nameToIdMap.get(normalizeName(name)))
          .filter((id): id is string => Boolean(id))

        const unresolvedForOrder = (o.assignedToNames ?? []).filter(
          (name) => !nameToIdMap.get(normalizeName(name))
        ).length
        unresolvedTechCount += unresolvedForOrder

        return {
          operator: o.operator,
          type: o.type,
          serviceId: o.serviceId,
          network: o.network,
          standard: o.standard,
          orderNumber: o.orderNumber,
          date: o.date,
          timeSlot: o.timeSlot,
          city: o.city,
          street: o.street,
          postalCode: o.postalCode,
          assignedTechnicianIds:
            assignedTechnicianIds.length > 0
              ? Array.from(new Set(assignedTechnicianIds))
              : undefined,
          notes: [
            o.notes?.trim(),
            ...(unresolvedByOrder.get(o.orderNumber)?.length
              ? [
                  `Nierozpoznany sprzęt do wydania:\n${unresolvedByOrder
                    .get(o.orderNumber)!
                    .join(', ')}`,
                ]
              : []),
          ]
            .filter(Boolean)
            .join('\n\n'),
          equipmentRequirements: requirementsByOrder.get(o.orderNumber),
        }
      })

      // 3) One fast request to backend
      const summary = await bulkImportMutation.mutateAsync(payload)

      // 4) Summary toast from backend result
      toast.success(
        `Podsumowanie importu:
Dodane: ${summary?.added}
Pominięte (wykonane): ${summary?.skippedCompleted}
Pominięte (aktywne): ${summary?.skippedPendingOrAssigned}
Inne błędy: ${summary?.otherErrors}`
      )

      // 5) Warn if some technicians were not matched
      if (unresolvedTechCount > 0) {
        toast.warning(
          `Nie przypisano ${unresolvedTechCount} zleceń — technik nie został odnaleziony.`
        )
      }
      const unresolved = Array.from(unresolvedByOrder.values()).reduce(
        (sum, list) => sum + list.length,
        0
      )
      if (unresolved > 0) {
        toast.warning(
          `Nie udało się zmapować ${unresolved} pozycji urządzeń do dostarczenia.`
        )
      }

      await Promise.all([
        utils.opl.order.getOrders.invalidate(),
        utils.opl.order.getAssignedOrders.invalidate(),
        utils.opl.order.getUnassignedOrders.invalidate(),
      ])
      onClose()
    } catch (err) {
      console.error(err)
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
