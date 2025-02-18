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
        'flex h-screen w-full flex-row items-stretch bg-background text-foreground',
        className
      )}
    >
      {children}
    </main>
  )
}

export default MainContainer
