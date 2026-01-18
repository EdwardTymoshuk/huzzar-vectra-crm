'use client'

import TechnicianMonthlyDetails from '@/app/(modules)/vectra-crm/components/billing/TechnicianMonthlyDetails'
import { VECTRA_PATH } from '@/lib/constants'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import TechnicianDetailsHeaderBar from './TechnicianDetailsHeaderBar'

type Props = { technicianId: string }

/**
 * TechnicianMonthlyDetailsPage (Admin)
 * --------------------------------------------------------
 * Displays technician's detailed monthly settlement summary.
 * Uses TechnicianDetailsHeaderBar for top controls.
 */
const TechnicianMonthlyDetailsPage = ({ technicianId }: Props) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')

  const initialMonth = fromParam
    ? new Date(fromParam)
    : startOfMonth(new Date())

  const [selectedMonth, setSelectedMonth] = useState<Date>(initialMonth)

  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  useEffect(() => {
    router.replace(
      `${VECTRA_PATH}/admin-panel/billing/technician/${technicianId}?from=${from}&to=${to}`,
      { scroll: false }
    )
  }, [from, to, router, selectedMonth, technicianId])

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-143px)] md:h-[calc(100dvh-80px)] overflow-hidden">
      <TechnicianDetailsHeaderBar
        title="Rozliczenie technika"
        selectedMonth={selectedMonth}
        onChangeMonth={setSelectedMonth}
      />
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <TechnicianMonthlyDetails
          technicianId={technicianId}
          selectedMonth={selectedMonth}
          mode="admin"
        />
      </div>
    </div>
  )
}

export default TechnicianMonthlyDetailsPage
