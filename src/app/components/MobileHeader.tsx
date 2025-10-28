'use client'

import Logo from '@/app/components/Logo'
import { cn } from '@/lib/utils'
import NotificationDropdown from './shared/NotificationDropdown'

/**
 * MobileHeader
 *
 * Top navigation bar for mobile screens.
 * - Fixed position with adaptive logo scaling.
 * - Replaces ThemeToggle with Notifications dropdown.
 */
const MobileHeader = () => {
  return (
    <header
      className={cn(
        'md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-secondary border-b border-border flex items-center justify-between px-3 sm:px-4'
      )}
    >
      {/* Left: Scalable logo */}
      <div className="flex items-center">
        <Logo className="w-28 sm:w-36 md:w-44 transition-all duration-200" />
      </div>

      {/* Right: Notifications */}
      <div className="flex items-center gap-2">
        <NotificationDropdown />
      </div>
    </header>
  )
}

export default MobileHeader
