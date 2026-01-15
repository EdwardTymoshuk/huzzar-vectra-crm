'use client'

import Logo from '@/app/components/Logo'
import NotificationDropdown from '@/app/components/NotificationDropdown'
import UserDropdown from '@/app/components/UserDropdown'
import { ReactNode } from 'react'

/**
 * PlatformLayout
 * --------------------------------------------------------------
 * Global application shell with sticky header.
 * Allows full-width layouts with side navigation.
 */
const PlatformLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 h-14 border-b bg-secondary w-full">
        <div className="flex h-full items-center justify-between px-4">
          <Logo className="w-32" />

          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* App content */}
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

export default PlatformLayout
