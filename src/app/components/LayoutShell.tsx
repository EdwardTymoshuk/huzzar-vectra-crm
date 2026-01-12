'use client'

import ResponsiveNavigation from './../(modules)/vectra-crm/components/navigation/ResponsiveNavigation'
import MainContainer from './MainContainer'
import MobileHeader from './MobileHeader'
import {
  GlobalRouteLoader,
  NavigationProgressProvider,
} from './navigation-progress'

interface LayoutShellProps {
  children: React.ReactNode
}

/**
 * LayoutShell
 *
 * Global shell wrapper for the application layout.
 * - Displays MobileHeader on mobile screens (<768px).
 * - Displays ResponsiveNavigation (bottom nav or top nav).
 * - Adds top padding on mobile to prevent content overlap.
 */
const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  return (
    <>
      <NavigationProgressProvider>
        <GlobalRouteLoader />

        {/* ✅ Mobile header appears only on small screens */}
        <MobileHeader />
        {/* ✅ ResponsiveNavigation (bottom on mobile, top on desktop) */}
        <ResponsiveNavigation />
        {/* ✅ Main content area with top padding for header space */}
        <div className="flex flex-col h-full md:pt-[57px] pb-[72px] md:pb-0">
          <MainContainer>{children}</MainContainer>
        </div>
      </NavigationProgressProvider>
    </>
  )
}

export default LayoutShell
