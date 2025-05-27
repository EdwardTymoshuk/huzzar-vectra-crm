// components/shared/RouteProgress.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import { useEffect, useRef } from 'react'

const RouteProgress = () => {
  const pathname = usePathname()
  const search = useSearchParams()
  const firstLoad = useRef(true)

  useEffect(() => {
    if (firstLoad.current) {
      // skip mount
      firstLoad.current = false
      return
    }
    NProgress.start()

    const timer = setTimeout(() => NProgress.done(), 200) // safety-timeout
    return () => clearTimeout(timer)
  }, [pathname, search.toString()])

  return null
}

export default RouteProgress
