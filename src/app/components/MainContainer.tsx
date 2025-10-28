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
        'flex flex-col flex-1 min-h-full w-full h-full overflow-y-auto overflow-x-hidden bg-background text-foreground px-2 pt-14 md:pt-0 ',
        className
      )}
    >
      {children}
    </main>
  )
}

export default MainContainer
