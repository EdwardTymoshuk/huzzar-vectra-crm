'use client'

import Header from '@/app/components/Header'
import MainContainer from '@/app/components/MainContainer'
import Sidebar from '@/app/components/Sidebar'
import { usePathname } from 'next/navigation'

/**
 * Handles routing-based rendering of sidebar and header.
 * Sidebar and content are aligned horizontally using flex layout.
 */
const ClientRoutingHandler: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname()
  const isLoginPage = pathname?.startsWith('/login')

  return (
    <>
      {!isLoginPage && <Header />}
      <div className="flex h-screen">
        {/* Sidebar aligned to the left */}
        {!isLoginPage && <Sidebar />}
        {/* Main content aligned to the right */}
        <MainContainer>{children}</MainContainer>
      </div>
    </>
  )
}

export default ClientRoutingHandler
