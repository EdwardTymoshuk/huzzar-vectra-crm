//src/app/page.tsx

'use client'

import LoaderSpinner from '@/app/components/LoaderSpinner'
import { useSession } from 'next-auth/react'
import ModulesGrid from './components/root/ModulesGrid'
import PlatformLayout from './components/root/PlatformLayout'

/**
 * HomePage
 * --------------------------------------------------------------
 * Platform entry page:
 * - Not logged in → login
 * - Logged in → module selection
 */
export default function HomePage() {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoaderSpinner />
      </div>
    )
  }

  if (status !== 'authenticated') {
    return null
  }

  return (
    <PlatformLayout>
      <ModulesGrid />
    </PlatformLayout>
  )
}
