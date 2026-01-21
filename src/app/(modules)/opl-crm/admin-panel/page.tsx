//src/app/(modules)/opl-crm/admin-panel/page.tsx
'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { useRole } from '@/utils/hooks/useRole'
import { redirect } from 'next/navigation'

/**
 * /admin-panel
 * Redirects to the correct tab based on user role
 */
const AdminPanelRootPage = () => {
  const { isWarehouseman, isLoading } = useRole()

  if (isLoading)
    return (
      <div className="w-full h-screen">
        <LoaderSpinner />
      </div>
    )

  if (isWarehouseman) return redirect('/admin-panel?tab=warehouse')

  return redirect('/admin-panel?tab=dashboard')
}

export default AdminPanelRootPage
