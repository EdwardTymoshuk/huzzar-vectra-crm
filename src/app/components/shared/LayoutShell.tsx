'use client'

import Header from '../Header'
import MainContainer from '../MainContainer'
import Sidebar from '../Sidebar'
import RouteProgress from './RouteProgress'

interface LayoutShellProps {
  children: React.ReactNode
}

const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  return (
    <>
      <RouteProgress />
      <Header />
      <div className="flex md:h-screen md:overflow-hidden">
        <Sidebar />
        <MainContainer>{children}</MainContainer>
      </div>
    </>
  )
}

export default LayoutShell
