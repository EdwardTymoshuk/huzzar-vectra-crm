import * as XLSX from 'xlsx'

export type ParsedOplNpsRow = {
  orderNumber: string
  technicianName?: string
  zone?: string
  q6Score: number
}

type ExcelRow = Array<string | number | Date | null | undefined>

const normalize = (value: string) => value.toLowerCase().trim().replace(/\s+/g, ' ')

const findIndex = (header: ExcelRow, labels: string[]): number => {
  for (let i = 0; i < header.length; i++) {
    const key = normalize(String(header[i] ?? ''))
    if (!key) continue
    if (labels.some((label) => key.includes(normalize(label)))) return i
  }
  return -1
}

const isEmptyRow = (row: ExcelRow): boolean =>
  row.every((cell) => String(cell ?? '').trim().length === 0)

const parseQ6 = (value: unknown): number | null => {
  const raw = String(value ?? '').trim().replace(',', '.')
  if (!raw) return null
  const number = Number(raw)
  if (!Number.isFinite(number)) return null
  const rounded = Math.round(number)
  if (rounded < 1 || rounded > 5) return null
  return rounded
}

export async function parseOplNpsFromExcel(file: File): Promise<ParsedOplNpsRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const binary = event.target?.result
        if (!binary) {
          reject(new Error('Plik jest pusty lub nieczytelny.'))
          return
        }

        const workbook = XLSX.read(binary, { type: 'binary', cellDates: true })
        const targetSheetName =
          workbook.SheetNames.find((name) => normalize(name).includes('nps')) ??
          workbook.SheetNames[0]
        const sheet = workbook.Sheets[targetSheetName]

        if (!sheet) {
          reject(new Error('Brak arkusza do odczytu.'))
          return
        }

        const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
          header: 1,
          defval: '',
        })

        if (!rows.length) {
          resolve([])
          return
        }

        const headerRowIndex = rows.findIndex((row) => {
          const orderIdx = findIndex(row, ['numer zlecenia', 'nr zlecenia'])
          const q6Idx = findIndex(row, ['q6 nps', 'q6'])
          return orderIdx >= 0 && q6Idx >= 0
        })

        if (headerRowIndex < 0) {
          reject(new Error('Nie znaleziono nagłówków NPS (Numer zlecenia / Q6).'))
          return
        }

        const header = rows[headerRowIndex]
        const orderIdx = findIndex(header, ['numer zlecenia', 'nr zlecenia'])
        const technicianIdx = findIndex(header, ['technik'])
        const zoneIdx = findIndex(header, ['strefa'])
        const q6Idx = findIndex(header, ['q6 nps', 'q6'])

        const parsed: ParsedOplNpsRow[] = []

        for (const row of rows.slice(headerRowIndex + 1)) {
          if (isEmptyRow(row)) continue

          const orderNumber = String(row[orderIdx] ?? '').trim()
          const q6Score = parseQ6(row[q6Idx])

          if (!orderNumber || q6Score === null) continue

          parsed.push({
            orderNumber,
            technicianName:
              technicianIdx >= 0 ? String(row[technicianIdx] ?? '').trim() || undefined : undefined,
            zone: zoneIdx >= 0 ? String(row[zoneIdx] ?? '').trim() || undefined : undefined,
            q6Score,
          })
        }

        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsBinaryString(file)
  })
}
