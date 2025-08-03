/* components/shared/LoadingOverlay.tsx */
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type LoadingOverlayProps = { show: boolean }

const LoadingOverlay = ({ show }: LoadingOverlayProps) => (
  <AnimatePresence>
    {show && (
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-muted"
      >
        {/* 👇 ikona spinnera – zero dodatkowych wrapperów */}
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </motion.div>
    )}
  </AnimatePresence>
)

export default LoadingOverlay
