// components/shared/RouteProgress.tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import { useEffect, useRef } from 'react'

const RouteProgress = () => {
  const pathname = usePathname()
  const search = useSearchParams()

  const queryString = search.toString()

  const firstLoad = useRef(true)

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false
      return
    }

    NProgress.start()

    const id = setTimeout(() => NProgress.done(), 200)
    return () => clearTimeout(id)
  }, [pathname, queryString])

  return null
}

export default RouteProgress
