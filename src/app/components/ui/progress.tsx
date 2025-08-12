'use client'

import { cn } from '@/lib/utils'
import { Progress as ProgressPrimitive } from 'radix-ui'
import * as React from 'react'

type ProgressProps = React.ComponentPropsWithoutRef<
  typeof ProgressPrimitive.Root
> & {
  /** Applies classes to the moving bar (Indicator); lets us color the fill without touching the track */
  indicatorClassName?: string
}

/**
 * Progress
 * - The track (Root) always stays muted.
 * - The fill (Indicator) can be colored via `indicatorClassName`.
 * - We keep API additive/backward compatible (existing usages keep working).
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, indicatorClassName, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      'relative h-4 w-full overflow-hidden rounded-full bg-muted',
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        'h-full w-full flex-1 bg-primary transition-all',
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
