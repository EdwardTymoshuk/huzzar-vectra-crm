'use client'

import Header from '@/app/components/Header'
import MainContainer from '@/app/components/MainContainer'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const ClientRoutingHandler: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname()
  const isLoginPage = pathname?.startsWith('/login')

  return (
    <>
      {!isLoginPage && <Header />}
      {!isLoginPage && <Sidebar />}
      <MainContainer>{children}</MainContainer>
    </>
  )
}

export default ClientRoutingHandler
