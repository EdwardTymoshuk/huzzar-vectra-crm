'use client'

import Logo from '@/app/components/Logo'
import NotificationDropdown from '@/app/components/NotificationDropdown'
import UserDropdown from '@/app/components/UserDropdown'
import { ReactNode } from 'react'
import MainContainer from '../MainContainer'

/**
 * PlatformLayout
 * --------------------------------------------------------------
 * Lightweight layout for HUZZAR platform-level views.
 * Centers content vertically and horizontally below the header.
 */
const PlatformLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 h-14 border-b bg-secondary w-full">
        <div className="mx-auto flex h-full items-center justify-between px-4">
          <Logo className="w-32" />

          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* Content */}
      <MainContainer
        className="
          flex flex-1
          items-center
          justify-center
          max-w-7xl
          mx-auto px-8 sm:px-4
        "
      >
        {children}
      </MainContainer>
    </div>
  )
}

export default PlatformLayout
