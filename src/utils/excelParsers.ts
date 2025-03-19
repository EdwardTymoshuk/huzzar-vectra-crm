// utils/excelParsers.ts

import { OrderFormData } from '@/app/admin-panel/components/orders/OrderFormFields'
import { Operator, TimeSlot } from '@prisma/client'
import * as XLSX from 'xlsx'

/**
 * We define a type for each row's cells as an array of acceptable values.
 * For example, each cell can be string, number, Date, null, or undefined.
 */
type ExcelRow = (string | number | Date | null | undefined)[]

/**
 * Parser for the new 8-column format:
 *  Columns (in row 0, the header row):
 *   0: "Grafik"
 *   1: "Nr zlecenia"
 *   2: "Nr klienta"
 *   3: "Adres"
 *   4: "Data instalacji"
 *   5: "Godzina instalacji"
 *   6: "Technik"
 *   7: "Uwagi"
 */
export async function parseUnifiedOrdersFromExcel(
  file: File
): Promise<OrderFormData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const data = event.target?.result
      if (!data) {
        return reject(new Error('Plik jest pusty lub nieczytelny.'))
      }

      // Read the workbook as binary
      const workbook = XLSX.read(data, {
        type: 'binary',
        cellDates: true,
        dateNF: 'yyyy-mm-dd HH:mm:ss',
      })

      // Grab the first sheet
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      /**
       * Convert sheet to a 2D array of rows:
       * each row is an array of string | number | Date | null | undefined
       *
       * We avoid using `any` by specifying the type assertion as ExcelRow[].
       */
      const rawData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
        header: 1, // Return arrays, not objects
      }) as ExcelRow[]

      if (!rawData.length) {
        return reject(
          new Error('Błędny format: plik nie zawiera wierszy (jest pusty).')
        )
      }

      // Check the header (row 0)
      const headerRow = rawData[0]
      if (!headerRow || headerRow.length < 8) {
        return reject(
          new Error(
            'Błędny format: plik nie zawiera co najmniej 8 kolumn w nagłówku.'
          )
        )
      }

      // We define an array of required column names (in Polish).
      const requiredHeaders = [
        'Grafik',
        'Nr zlecenia',
        'Nr klienta',
        'Adres',
        'Data instalacji',
        'Godzina instalacji',
        'Technik',
        'Uwagi',
      ] as const

      // Compare each column name in a simple manner
      for (let i = 0; i < requiredHeaders.length; i++) {
        const expected = requiredHeaders[i].toLowerCase()
        const actual = String(headerRow[i] || '')
          .toLowerCase()
          .trim()

        if (!actual.includes(expected)) {
          return reject(
            new Error(
              'Błędny format: plik nie zawiera wymaganych kolumn, sprawdź poprawność pliku.'
            )
          )
        }
      }

      // The actual data rows come after the header
      const rows = rawData.slice(1)
      if (!rows.length) {
        return reject(
          new Error(
            'Błędny format: plik Excel zawiera sam nagłówek, a brak jest danych.'
          )
        )
      }

      // Map each row to our OrderFormData
      const parsed: OrderFormData[] = rows.map((row) => {
        // 0: "Grafik" (MMP/V)
        const operatorStr = String(row[0] ?? '')
          .trim()
          .toUpperCase()
        const operator: Operator = operatorStr === 'MMP' ? 'MMP' : 'V'

        // 1: "Nr zlecenia"
        const orderNumber = String(row[1] ?? '').trim() || 'BRAK_NUMERU'

        // 2: "Nr klienta" (e.g. phone)
        const clientNumber = String(row[2] ?? '').trim()

        // 3: "Adres"
        const address = String(row[3] ?? '').trim() || 'Brak lokalizacji'
        const [city, postalCode, street] = parseAddress(address)

        // 4: "Data instalacji"
        const isoDate = parseExcelDateOrString(row[4])

        // 5: "Godzina instalacji" (timeRange)
        const timeRange = String(row[5] ?? '').trim()
        let startTime = '08:00'
        let endTime = '10:00'
        if (timeRange.includes('-')) {
          const [start, end] = timeRange.split('-')
          startTime = (start ?? '').trim() || '00:00'
          endTime = (end ?? '').trim() || '00:00'
        }
        const timeSlot: TimeSlot = determineTimeSlot(
          operator,
          startTime,
          endTime
        )
        const timeSlotFormatted = `${startTime}-${endTime}`
        // 6: "Technik"
        const assignedTech = String(row[6] ?? '').trim()
        const assignedToId = parseTechnician(assignedTech)

        // 7: "Uwagi" - optionally store in notes
        const notes = String(row[7] ?? '').trim() || ''

        return {
          operator,
          orderNumber,
          type: 'INSTALATION',
          city,
          street,
          postalCode,
          date: isoDate,
          timeSlot,
          contractRequired: false,
          assignedToId,
          clientPhoneNumber: clientNumber,
          status: 'PENDING',
          equipmentNeeded: '',
          notes: notes,
        }
      })

      // All rows parsed OK => resolve
      resolve(parsed)
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsBinaryString(file)
  })
}

/**
 * parseExcelDateOrString:
 * Converts "DD.MM.YYYY" to "YYYY-MM-DD".
 * If invalid or empty, returns "2000-01-01" as fallback.
 * If it's already a Date, we convert to ISO (YYYY-MM-DD).
 */
function parseExcelDateOrString(cellVal: unknown): string {
  // If the cellVal is a Date and is valid, convert it to YYYY-MM-DD
  if (cellVal instanceof Date && !isNaN(cellVal.getTime())) {
    return cellVal.toISOString().split('T')[0]
  }

  // Otherwise, treat it as a string (including numbers, null => '')
  const str = String(cellVal ?? '').trim()
  const iso = convertDateDotFormat(str)
  return iso || '2000-01-01'
}

function convertDateDotFormat(dateStr: string): string | null {
  // e.g. "15.03.2025" => ["15","03","2025"]
  const parts = dateStr.split('.')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return null
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/**
 * Splits an address into [city, postalCode, street].
 */
function parseAddress(location: string): [string, string, string] {
  // Podziel adres na dwie części – przed i po przecinku
  const parts = location.split(',', 2).map((s) => s.trim())
  if (parts.length < 2) {
    return [location, '', '']
  }

  // Pierwsza część: "Gdynia 81-185"
  const cityPart = parts[0]
  // Wzorzec: grupa z nazwą miasta (wszystko aż do ostatniej spacji) oraz grupa z kodem pocztowym
  const regex = /^(.*)\s+(\d{2}-\d{3})$/
  const match = cityPart.match(regex)
  let city = cityPart
  let postalCode = ''
  if (match) {
    city = match[1]
    postalCode = match[2]
  }
  // Druga część to reszta, czyli ulica z numerem
  const street = parts[1]

  return [city, postalCode, street]
}

/**
 * Infers an assignedTo ID if the string has (someId).
 */
function parseTechnician(techStr: string): string | undefined {
  if (!techStr) return undefined
  const match = techStr.match(/\(([^)]+)\)/)
  return match ? match[1] : undefined
}

/**
 * Determines a TimeSlot from a start-end time range, based on operator 'V' or 'MMP'.
 */
function determineTimeSlot(
  operator: Operator,
  start: string,
  end: string
): TimeSlot {
  const range = `${start}-${end}`

  if (operator === 'V') {
    if (range === '08:00-10:00') return 'EIGHT_TEN'
    if (range === '10:00-12:00') return 'TEN_TWELVE'
    if (range === '12:00-14:00') return 'TWELVE_FOURTEEN'
    if (range === '14:00-16:00') return 'FOURTEEN_SIXTEEN'
    if (range === '16:00-18:00') return 'SIXTEEN_EIGHTEEN'
    if (range === '18:00-20:00') return 'EIGHTEEN_TWENTY'
    return 'EIGHT_TEN'
  } else {
    if (range === '09:00-12:00') return 'NINE_TWELVE'
    if (range === '12:00-15:00') return 'TWELVE_FIFTEEN'
    if (range === '15:00-18:00') return 'FIFTEEN_EIGHTEEN'
    if (range === '18:00-21:00') return 'EIGHTEEN_TWENTYONE'
    return 'NINE_TWELVE'
  }
}
