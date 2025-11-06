'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'

/**
 * Simple vertical timeline.
 * Left = date, Center = dot + line, Right = content.
 */
export interface CleanTimelineItem {
  id: string | number
  date?: string
  title: string
  description?: string | React.ReactNode
  color?: 'success' | 'danger' | 'muted' | 'warning'
}

interface CleanTimelineProps {
  items: CleanTimelineItem[]
  className?: string
}

export function Timeline({ items, className }: CleanTimelineProps) {
  if (!items?.length) return null

  return (
    <div className={cn('flex flex-col relative', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        // Map logical color to Tailwind class
        const dotColor =
          item.color === 'success'
            ? 'bg-success'
            : item.color === 'danger'
            ? 'bg-destructive'
            : item.color === 'warning'
            ? 'bg-warning'
            : 'bg-muted-foreground'

        return (
          <div
            key={item.id}
            className="grid grid-cols-[90px_20px_1fr] relative"
          >
            {/* Left column – Date */}
            <div className="text-right pr-2 pt-[2px]">
              {item.date && (
                <time className="text-xs text-muted-foreground">
                  {item.date}
                </time>
              )}
            </div>

            {/* Middle column – Dot + Line */}
            <div className="flex flex-col items-center relative">
              {/* line (behind dot) */}
              {!isLast && (
                <div className="absolute top-3 bottom-0 my-1 w-px bg-muted-foreground" />
              )}
              {/* dot */}
              <div className={cn('h-3 w-3 rounded-full z-10', dotColor)} />
            </div>

            {/* Right column – Title & Description */}
            <div className="flex pl-2 flex-col gap-1 pb-4">
              <h4
                className={cn(
                  'text-sm font-medium',
                  item.color === 'success'
                    ? 'text-success'
                    : item.color === 'danger'
                    ? 'text-destructive'
                    : item.color === 'warning'
                    ? 'text-warning'
                    : 'text-foreground'
                )}
              >
                {item.title}
              </h4>
              {item.description && (
                <div className="text-sm text-muted-foreground leading-snug">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
