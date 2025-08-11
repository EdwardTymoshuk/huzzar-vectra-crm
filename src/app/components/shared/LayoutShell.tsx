'use client'

import Header from '../Header'
import MainContainer from '../MainContainer'
import Sidebar from '../Sidebar'
import {
  GlobalRouteLoader,
  NavigationProgressProvider,
} from './navigation-progress'

interface LayoutShellProps {
  children: React.ReactNode
}

const LayoutShell: React.FC<LayoutShellProps> = ({ children }) => {
  return (
    <>
      <NavigationProgressProvider>
        <GlobalRouteLoader />
        <Header />
        <div className="flex md:h-screen md:overflow-hidden">
          <Sidebar />
          <MainContainer>{children}</MainContainer>
        </div>
      </NavigationProgressProvider>
    </>
  )
}

export default LayoutShell
