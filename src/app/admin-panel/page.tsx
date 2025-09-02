//src/app/admin-panel/page.tsx
'use client'

import { useRole } from '@/utils/roleHelpers/useRole'
import { redirect } from 'next/navigation'
import LoaderSpinner from '../components/shared/LoaderSpinner'

/**
 * /admin-panel
 * Redirects to the correct tab based on user role
 */
const AdminPanelRootPage = () => {
  const { isWarehouseman, isLoading } = useRole()

  if (isLoading) return <LoaderSpinner />

  if (isWarehouseman) return redirect('/admin-panel?tab=warehouse')

  return redirect('/admin-panel?tab=dashboard')
}

export default AdminPanelRootPage
