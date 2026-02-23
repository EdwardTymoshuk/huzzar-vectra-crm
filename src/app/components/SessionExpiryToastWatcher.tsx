'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

const WARNING_BEFORE_MS = 10 * 60 * 1000 // 10 min
const CHECK_INTERVAL_MS = 30 * 1000 // 30 sec

export default function SessionExpiryToastWatcher() {
  const { status, data: session } = useSession()

  const warnedForExpiryRef = useRef<string | null>(null)
  const wasAuthenticatedRef = useRef(false)
  const expiredToastShownRef = useRef(false)

  useEffect(() => {
    if (status === 'authenticated') {
      wasAuthenticatedRef.current = true
      expiredToastShownRef.current = false
    }

    if (status === 'unauthenticated' && wasAuthenticatedRef.current) {
      if (!expiredToastShownRef.current) {
        toast.warning('Sesja wygasła. Zaloguj się ponownie, aby kontynuować pracę.')
        expiredToastShownRef.current = true
      }
      return
    }

    if (status !== 'authenticated' || !session?.expires) return

    const expiresAt = new Date(session.expires).getTime()
    if (Number.isNaN(expiresAt)) return

    const check = () => {
      const now = Date.now()
      const leftMs = expiresAt - now

      if (leftMs <= WARNING_BEFORE_MS && leftMs > 0) {
        const expiryKey = session.expires
        if (warnedForExpiryRef.current !== expiryKey) {
          const minutesLeft = Math.max(1, Math.ceil(leftMs / 60000))
          toast.warning(`Sesja wygaśnie wkrótce (${minutesLeft} min). Zapisz zmiany.`)
          warnedForExpiryRef.current = expiryKey
        }
      }
    }

    check()
    const timer = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => {
      window.clearInterval(timer)
    }
  }, [status, session?.expires])

  return null
}

