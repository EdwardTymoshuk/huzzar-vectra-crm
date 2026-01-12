'use client'

import TechnicianMonthlyDetailsPage from '@/app/(modules)/vectra-crm/admin-panel/components/billing/TechnicianMonthlyDetailsPage'
import { use } from 'react'

const TechnitianBillingPage = ({
  params,
}: {
  params: Promise<{ technicianId: string }>
}) => {
  const { technicianId } = use(params)
  return <TechnicianMonthlyDetailsPage technicianId={technicianId} />
}

export default TechnitianBillingPage
