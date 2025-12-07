'use client'

import LoaderSpinner from '@/app/components/shared/LoaderSpinner'
import { Button } from '@/app/components/ui/button'
import { Checkbox } from '@/app/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { devicesStatusMap } from '@/lib/constants'
import {
  applyMatchingToRows,
  parseDevicesFromExcel,
  type ParsedDeviceRow,
} from '@/utils/excelParsers/parseDevicesFromExcel'
import { useActiveLocation } from '@/utils/hooks/useActiveLocation'
import { trpc } from '@/utils/trpc'
import { useEffect, useMemo, useState } from 'react'
import { MdFileUpload } from 'react-icons/md'
import { toast } from 'sonner'

const ALLOWED_EXTENSIONS: ReadonlyArray<string> = ['xls', 'xlsx'] as const

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * ImportDevicesModal
 * -----------------------------------------------------------------------------
 * Modal used for importing new devices via Excel file.
 *  - Parses Excel data into structured rows.
 *  - Matches models with DeviceDefinitions.
 *  - Checks duplicates in the warehouse and technician stock before showing preview.
 *  - Prevents saving duplicates or unmatched rows.
 *  - Supports selecting/deselecting all rows and adding optional notes.
 *  - Refreshes warehouse data after successful import.
 */
const ImportDevicesModal = ({ open, onClose }: Props) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ParsedDeviceRow[]>([])
  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>({})
  const [duplicateDetails, setDuplicateDetails] = useState<
    Record<string, { name: string; status: string; assignedTo?: string }>
  >({})
  const [isDragOver, setIsDragOver] = useState(false)
  const [notes, setNotes] = useState<string>('')
  const [isParsing, setIsParsing] = useState(false)
  const [fileName, setFileName] = useState<string>('')

  const locationId = useActiveLocation() || undefined
  const utils = trpc.useUtils()

  const defsQuery = trpc.deviceDefinition.getAllDefinitions.useQuery(
    undefined,
    {
      enabled: open,
    }
  )
  const importMutation = trpc.warehouse.importDevices.useMutation()

  const isRealXlsx = async (file: File): Promise<boolean> => {
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    // XLSX = ZIP → magic header: 50 4B 03 04
    return header[0] === 0x50 && header[1] === 0x4b
  }

  /** Validate if uploaded file is Excel format */
  const isExcelFile = (file: File): boolean => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    return (
      !!ext &&
      ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])
    )
  }

  /** Handle manual file selection */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 🔐 Limit rozmiaru
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Plik jest zbyt duży. Maksymalnie 2 MB.')
      return
    }

    if (!isExcelFile(file)) {
      toast.error('Nieobsługiwany format pliku. Tylko .xls/.xlsx.')
      return
    }

    // 🔐 ZIP magic header
    const real = await isRealXlsx(file)
    if (!real) {
      toast.error('Plik nie jest prawidłowym plikiem XLSX.')
      return
    }

    setSelectedFile(file)
    setFileName(file.name.toUpperCase())
  }

  /** Handle drag-and-drop input */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
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
    setFileName(file.name.toUpperCase())
  }

  /**
   * Parse Excel → Check duplicates → Set full UI state.
   * Ensures duplicates are available immediately without delayed updates.
   */
  useEffect(() => {
    const run = async () => {
      if (!selectedFile) {
        setRows([])
        setSelectedMap({})
        setDuplicateDetails({})
        return
      }

      setIsParsing(true)
      try {
        // Step 1 — Parse Excel
        const parsed = await parseDevicesFromExcel(selectedFile)
        if (!parsed.length) {
          toast.warning('Plik jest pusty lub nie zawiera poprawnych rekordów.')
          setIsParsing(false)
          return
        }

        // Step 2 — Check duplicates (warehouse + technicians)
        const identifiers = parsed.map((r) => r.identifier).filter(Boolean)
        let dupDetails: Record<
          string,
          { name: string; status: string; assignedTo?: string }
        > = {}
        let duplicateCount = 0

        if (identifiers.length > 0) {
          const result = await utils.warehouse.checkExistingIdentifiers.fetch({
            identifiers,
            locationId,
          })
          dupDetails = result?.details ?? {}
          duplicateCount = result?.existing?.length ?? 0
        }

        // Step 3 — Update local state after parsing + duplicate check
        const defaultSel: Record<number, boolean> = {}
        parsed.forEach((r) => (defaultSel[r.rowNo] = true))
        setRows(parsed)
        setSelectedMap(defaultSel)
        setDuplicateDetails(dupDetails)

        // ✅ Combined toast message
        if (duplicateCount > 0) {
          toast.success(
            `Wczytano ${parsed.length} rekordów z pliku (w tym ${duplicateCount} duplikatów w systemie).`
          )
        } else {
          toast.success(`Wczytano ${parsed.length} rekordów z pliku.`)
        }
      } catch (err) {
        console.error(err)
        toast.error('Błąd podczas parsowania pliku.')
      } finally {
        setIsParsing(false)
      }
    }

    void run()
  }, [selectedFile, utils, locationId])

  /** Compute client-side matches against definitions */
  const previewRows = useMemo(() => {
    if (!rows.length) return []
    const defs = defsQuery.data ?? []
    return applyMatchingToRows(rows, defs, fileName)
  }, [rows, defsQuery.data, fileName])

  const matched = previewRows.filter((r) => r.match?.status === 'MATCHED')
  const skipped = previewRows.filter((r) => r.match?.status === 'SKIPPED')
  const selectedCount = matched.filter((r) => selectedMap[r.rowNo]).length
  const allSelected =
    matched.length > 0 && matched.every((r) => selectedMap[r.rowNo])
  const noneSelected =
    matched.length > 0 && matched.every((r) => !selectedMap[r.rowNo])
  const duplicateCount = Object.keys(duplicateDetails).length

  /** Toggle all checkboxes at once */
  const handleToggleAll = (checked: boolean) => {
    const updated: Record<number, boolean> = { ...selectedMap }
    matched.forEach((r) => (updated[r.rowNo] = checked))
    setSelectedMap(updated)
  }

  /** Toggle single row checkbox */
  const handleToggleRow = (rowNo: number, checked: boolean) => {
    setSelectedMap((prev) => ({ ...prev, [rowNo]: checked }))
  }

  /** Reset modal state */
  const resetState = () => {
    setSelectedFile(null)
    setRows([])
    setSelectedMap({})
    setNotes('')
    setDuplicateDetails({})
    setIsParsing(false)
  }

  /**
   * Upload only valid, non-duplicate devices.
   * Automatically skips duplicates and refreshes warehouse.
   */
  const handleUpload = async () => {
    const duplicates = new Set(
      Object.keys(duplicateDetails).map((k) => k.toUpperCase())
    )

    const validRows = previewRows.filter(
      (r) =>
        r.match?.status === 'MATCHED' &&
        selectedMap[r.rowNo] &&
        !duplicates.has(r.identifier.toUpperCase())
    )

    const skippedDuplicates = previewRows.filter(
      (r) => selectedMap[r.rowNo] && duplicates.has(r.identifier.toUpperCase())
    )

    if (validRows.length === 0) {
      toast.warning(
        'Brak nowych urządzeń do dodania (duplikaty zostały odrzucone).'
      )
      return
    }

    try {
      const result = await importMutation.mutateAsync({
        items: validRows.map((r) => ({
          name: r.match?.deviceName ?? '',
          identifier: r.identifier,
        })),
        notes: notes || undefined,
        locationId,
      })

      toast.success(
        `Zakończono import: dodano ${result.addedCount}, pominięto ${
          (result.skippedCount || 0) + skippedDuplicates.length
        } urządzeń (duplikaty lub błędne wpisy).`
      )

      await utils.warehouse.getAll.refetch()
      resetState()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Błąd podczas zapisu do magazynu.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Import urządzeń z Excela</DialogTitle>
          <DialogDescription>
            Przeciągnij plik Excel lub kliknij, aby wybrać.
          </DialogDescription>
        </DialogHeader>

        {/* --- Dropzone --- */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
            isDragOver ? 'border-primary' : 'border-gray-300'
          }`}
          onClick={() =>
            document.getElementById('excelDevicesFileInput')?.click()
          }
        >
          <MdFileUpload className="mx-auto text-4xl opacity-70" />
          <p className="mt-2 text-sm text-muted-foreground">
            {isDragOver
              ? 'Upuść plik tutaj'
              : selectedFile
              ? selectedFile.name
              : 'Przeciągnij plik lub kliknij tutaj'}
          </p>
          <input
            id="excelDevicesFileInput"
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* --- Summary --- */}
        {previewRows.length > 0 && (
          <div className="w-full border rounded-md p-3 text-sm bg-muted/20">
            {/* Responsive layout: 2 columns on small, 5 columns on medium+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center sm:text-left">
              {/* Total imported */}
              <div className="flex items-center justify-between sm:justify-start sm:gap-1">
                <span className="text-muted-foreground">Wczytane:</span>
                <strong>{previewRows.length}</strong>
              </div>

              {/* Matched */}
              <div className="flex items-center justify-between sm:justify-start sm:gap-1 text-success">
                <span>Dopasowane:</span>
                <strong>{matched.length}</strong>
              </div>

              {/* Skipped */}
              <div className="flex items-center justify-between sm:justify-start sm:gap-1 text-warning">
                <span>Pominięte:</span>
                <strong>{skipped.length}</strong>
              </div>

              {/* Duplicates */}
              <div className="flex items-center justify-between sm:justify-start sm:gap-1 text-danger">
                <span>Duplikaty:</span>
                <strong>{duplicateCount}</strong>
              </div>

              {/* Selected */}
              <div className="flex items-center justify-between sm:justify-start sm:gap-1 text-secondary">
                <span>Zaznaczone:</span>
                <strong>
                  {selectedCount} / {matched.length}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* --- Table or Loader --- */}
        {isParsing ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <LoaderSpinner />
            Wczytywanie pliku i sprawdzanie duplikatów…
          </div>
        ) : (
          previewRows.length > 0 && (
            <div className="max-h-[50vh] overflow-auto border rounded-md">
              <Table className="w-full text-sm">
                <TableHeader className="sticky top-0 bg-background shadow-sm z-10">
                  <TableRow>
                    <TableHead className="w-10 text-center">
                      <Checkbox
                        checked={
                          allSelected
                            ? true
                            : noneSelected
                            ? false
                            : 'indeterminate'
                        }
                        onCheckedChange={(v) => handleToggleAll(Boolean(v))}
                        aria-label="Zaznacz wszystko"
                      />
                    </TableHead>
                    <TableHead>Model (z pliku)</TableHead>
                    <TableHead>SN / MAC</TableHead>
                    <TableHead>Nazwa w systemie</TableHead>
                    <TableHead>Uwagi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((r) => {
                    const isMatched = r.match?.status === 'MATCHED'
                    const duplicate =
                      duplicateDetails[r.identifier.toUpperCase()]
                    return (
                      <TableRow
                        key={`${r.rowNo}-${r.model}`}
                        className={!isMatched ? 'opacity-70' : ''}
                      >
                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!selectedMap[r.rowNo] && isMatched}
                            onCheckedChange={(v) =>
                              handleToggleRow(r.rowNo, Boolean(v))
                            }
                            disabled={!isMatched}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{r.model}</TableCell>
                        <TableCell>{r.identifier || '—'}</TableCell>
                        <TableCell
                          className={
                            isMatched ? 'text-success' : 'text-warning'
                          }
                        >
                          {isMatched
                            ? r.match?.deviceName
                            : `Pominięto: ${
                                r.match?.reason ?? 'Brak dopasowania'
                              }`}
                        </TableCell>
                        <TableCell>
                          {duplicate ? (
                            <div className="text-xs text-danger">
                              ⚠️ Zdublowane urządzenie, lokalziacja:
                              <br />
                              {duplicate.assignedTo ? (
                                <> stan technika {duplicate.assignedTo}</>
                              ) : duplicate.status === 'AVAILABLE' ? (
                                <> magazyn</>
                              ) : (
                                <>
                                  {devicesStatusMap[duplicate.status] ??
                                    duplicate.status}
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {/* --- Notes --- */}
        {!isParsing && previewRows.length > 0 && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Uwagi do przyjęcia</label>
            <textarea
              className="w-full min-h-[80px] rounded-md border bg-background p-2"
              placeholder="Opcjonalne uwagi, np. numer transportu…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}

        {/* --- Footer --- */}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              resetState()
              onClose()
            }}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              isParsing ||
              matched.filter((r) => selectedMap[r.rowNo]).length === 0 ||
              importMutation.isLoading
            }
          >
            {importMutation.isLoading ? 'Zapisywanie…' : 'Zapisz w magazynie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportDevicesModal
