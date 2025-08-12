import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

const MaxWidthWrapper = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-screen-2xl p-2 md:px-8 2xl:px-12 flex flex-col flex-1 ',
        className
      )}
    >
      {children}
    </div>
  )
}

export default MaxWidthWrapper
