'use client'

import { cn } from '@/lib/utils'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { Separator } from './ui/separator'

interface PageControlBarProps {
  title: string
  children?: ReactNode
  centerContent?: ReactNode
  className?: string
  leftStart?: ReactNode
  rightActions?: ReactNode
  enableHorizontalScroll?: boolean
}

/**
 * PageControlBar
 * ------------------------------------------------------------------
 * Shared top header:
 *  - Title + action buttons (left-aligned)
 *  - Controls (tabs, filters, search) on the right side
 *  - Mobile: stacked
 *  - md–lg: compact mode (icons only if needed)
 *  - lg+: full layout
 */
const PageControlBar = ({
  title,
  children,
  centerContent,
  className,
  leftStart,
  rightActions,
  enableHorizontalScroll = false,
}: PageControlBarProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false)

  const updateScrollState = useCallback(() => {
    if (!enableHorizontalScroll) return
    const el = scrollRef.current
    if (!el) return

    const maxScrollLeft = el.scrollWidth - el.clientWidth
    setHasHorizontalOverflow(maxScrollLeft > 4)
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(maxScrollLeft - el.scrollLeft > 4)
  }, [enableHorizontalScroll])

  useEffect(() => {
    if (!enableHorizontalScroll) return
    const el = scrollRef.current
    if (!el) return

    updateScrollState()

    const onScroll = () => updateScrollState()
    el.addEventListener('scroll', onScroll, { passive: true })

    const resizeObserver = new ResizeObserver(() => updateScrollState())
    resizeObserver.observe(el)
    if (el.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(el.firstElementChild)
    }

    window.addEventListener('resize', updateScrollState)

    return () => {
      el.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [enableHorizontalScroll, updateScrollState])

  const scrollByStep = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(240, Math.round(el.clientWidth * 0.45))
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    })
  }

  const content = (
    <div
      className={cn(
        centerContent
          ? 'grid grid-cols-[auto_1fr_auto] items-center'
          : 'flex flex-row items-center lg:items-center justify-between',
        enableHorizontalScroll ? 'min-w-max md:w-full md:min-w-max' : 'w-full',
        'gap-2 lg:gap-4',
        'px-1',
      )}
    >
      <div className="flex items-center gap-2 w-fit lg:w-auto shrink-0">
        {leftStart && <div className="flex items-center gap-2">{leftStart}</div>}
        <h1 className="text-lg font-semibold text-secondary dark:text-primary whitespace-nowrap">
          {title}
        </h1>

        {(leftStart || rightActions) && <Separator orientation="vertical" />}

        {rightActions && (
          <div className="hidden xl:flex items-center gap-2 ml-4">
            {rightActions}
          </div>
        )}
      </div>

      {centerContent && (
        <div className="flex items-center justify-center min-w-[220px] px-2">
          {centerContent}
        </div>
      )}

      {children && (
        <div
          className={cn(
            enableHorizontalScroll
              ? 'flex items-center gap-2 shrink-0 justify-self-end'
              : 'flex flex-col sm:flex-row w-auto gap-2 items-center justify-end',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )

  return (
    <header
      className={cn(
        'w-full border-b bg-background py-2 mb-3 z-20 relative',
        className,
      )}
    >
      {enableHorizontalScroll ? (
        <>
          <div
            ref={scrollRef}
            className={cn(
              'overflow-x-auto overflow-y-hidden no-scrollbar scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              hasHorizontalOverflow
                ? cn(
                    canScrollLeft ? 'pl-8' : 'pl-1',
                    canScrollRight ? 'pr-8' : 'pr-1',
                  )
                : 'px-1',
            )}
          >
            {content}
          </div>

          {canScrollLeft && (
            <>
              <div className="pointer-events-none absolute left-0 top-2 bottom-2 w-12 bg-gradient-to-r from-background via-background/90 to-transparent" />
              <div className="absolute left-1 top-2 bottom-2 flex items-center">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => scrollByStep('left')}
                  aria-label="Przewiń w lewo"
                >
                  <MdChevronLeft className="h-5 w-5" />
                </button>
              </div>
            </>
          )}

          {canScrollRight && (
            <>
              <div className="pointer-events-none absolute right-0 top-2 bottom-2 w-12 bg-gradient-to-l from-background via-background/90 to-transparent" />
              <div className="absolute right-1 top-2 bottom-2 flex items-center">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => scrollByStep('right')}
                  aria-label="Przewiń w prawo"
                >
                  <MdChevronRight className="h-5 w-5" />
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        content
      )}
    </header>
  )
}

export default PageControlBar
