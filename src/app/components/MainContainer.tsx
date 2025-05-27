'use client'

import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

const MainContainer = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => {
  return (
    <main
      className={cn(
        'flex flex-col flex-1 w-full min-h-screen md:h-full md:overflow-y-auto overflow-x-hidden bg-background text-foreground px-2 md:px-6 pt-4',
        className
      )}
    >
      {children}
    </main>
  )
}

export default MainContainer
