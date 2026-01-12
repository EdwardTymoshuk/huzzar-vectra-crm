'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { MdAdd } from 'react-icons/md'

/** Type for each action button inside the floating menu. */
export interface FloatingAction {
  label: string
  icon: React.ReactNode
  colorClass?: string // Tailwind class, e.g. "bg-green-600 hover:bg-green-700"
  onClick: () => void
}

/**
 * FloatingActionMenu
 * --------------------------------------------------
 * Generic Gmail-style floating "+" menu.
 * - Supports multiple actions.
 * - Auto-closes on outside click.
 * - Allows custom main icon & tooltip.
 */
interface FloatingActionMenuProps {
  actions: FloatingAction[]
  position?: 'bottom-right' | 'bottom-left'
  disableOverlay?: boolean
  size?: number
  mainColorClass?: string
  /** Custom icon for main FAB (e.g. <MdDownload /> instead of +) */
  mainIcon?: React.ReactNode
  /** Optional tooltip for the main button */
  mainTooltip?: string
  /** If true → main button doesn’t rotate (useful for non-Add icons) */
  disableRotate?: boolean
}

const FloatingActionMenu = ({
  actions,
  position = 'bottom-right',
  disableOverlay = false,
  size = 56,
  mainColorClass = 'bg-primary hover:bg-primary/90 shadow-lg',
  mainIcon = <MdAdd className="text-3xl" />,
  mainTooltip,
  disableRotate = false,
}: FloatingActionMenuProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /** Close when clicking outside */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fabPosition =
    position === 'bottom-right'
      ? 'bottom-24 md:bottom-6 right-6'
      : 'bottom-6 left-6 flex-col items-start'

  return (
    <>
      {/* Overlay (darkens screen when open) */}
      <AnimatePresence>
        {open && !disableOverlay && (
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating button container */}
      <div
        ref={ref}
        className={cn(
          'fixed z-40 flex items-end gap-2',
          fabPosition.includes('right') ? 'flex-col items-end' : '',
          fabPosition
        )}
      >
        <AnimatePresence>
          {open &&
            actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          action.onClick()
                          setOpen(false)
                        }}
                        className={cn(
                          'flex items-center gap-2 text-white px-3 py-2 rounded-full shadow-lg text-sm transition',
                          action.colorClass ?? 'bg-primary hover:bg-primary/90'
                        )}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{action.label}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Main FAB button */}
        <TooltipProvider>
          <Tooltip>
            {mainTooltip && (
              <TooltipTrigger asChild>
                <div>
                  <motion.button
                    onClick={() => setOpen((v) => !v)}
                    className={cn(
                      'text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform',
                      mainColorClass
                    )}
                    style={{ width: size, height: size }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div
                      animate={{ rotate: !disableRotate && open ? 45 : 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {mainIcon}
                    </motion.div>
                  </motion.button>
                </div>
              </TooltipTrigger>
            )}
            {!mainTooltip && (
              <motion.button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  'text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform',
                  mainColorClass
                )}
                style={{ width: size, height: size }}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  animate={{ rotate: !disableRotate && open ? 45 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {mainIcon}
                </motion.div>
              </motion.button>
            )}
            {mainTooltip && (
              <TooltipContent side="left">{mainTooltip}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  )
}

export default FloatingActionMenu
