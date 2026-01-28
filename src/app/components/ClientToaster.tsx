'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

/**
 * Client-only Toaster wrapper.
 * Prevents React 18 StrictMode render-time state updates.
 */
export default function ClientToaster() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <Toaster position="top-center" richColors />
}
