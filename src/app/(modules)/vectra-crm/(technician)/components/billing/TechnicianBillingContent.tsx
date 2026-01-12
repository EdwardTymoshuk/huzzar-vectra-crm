'use client'

import TechnicianMonthlyDetails from '@/app/(modules)/vectra-crm/components/billing/TechnicianMonthlyDetails'
import LoaderSpinner from '@/app/components/LoaderSpinner'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  /** Selected month from parent header bar */
  selectedMonth: Date
}

/**
 * TechnicianBillingContent (Technician)
 * -------------------------------------------------------------
 * Uses shared TechnicianMonthlyDetails component.
 * Handles routing and session-based technician ID.
 */
const TechnicianBillingContent = ({ selectedMonth }: Props) => {
  const router = useRouter()
  const { data: session, status } = useSession()

  const technicianId = session?.user.id ?? ''
  const from = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const to = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

  // Keep URL synced with date (optional)
  useEffect(() => {
    router.replace(`/?tab=billing&from=${from}&to=${to}`, { scroll: false })
  }, [from, to, router, selectedMonth])

  if (status === 'loading')
    return (
      <div className="flex justify-center pt-8">
        <LoaderSpinner />
      </div>
    )

  if (!technicianId)
    return (
      <div className="text-center text-muted-foreground py-8">
        Nie znaleziono danych technika.
      </div>
    )

  return (
    <TechnicianMonthlyDetails
      technicianId={technicianId}
      selectedMonth={selectedMonth}
      mode="technician"
    />
  )
}

export default TechnicianBillingContent
