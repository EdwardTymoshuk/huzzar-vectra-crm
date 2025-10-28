'use client'

import { getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import LoginForm from '../components/LoginForm'
import LoaderSpinner from '../components/shared/LoaderSpinner'

export const dynamic = 'force-dynamic'

/**
 * LoginPage
 *
 * - Displays login form for unauthenticated users.
 * - Redirects to home if user is already logged in.
 * - Uses Suspense for lazy loading fallback.
 */
const LoginPage = () => {
  const router = useRouter()

  useEffect(() => {
    // Safe check to ensure window is available
    if (typeof window === 'undefined') return

    // Redirect if user already logged in
    getSession().then((session) => {
      if (session) router.replace('/')
    })
  }, [router])

  return (
    <Suspense fallback={<LoaderSpinner />}>
      <LoginForm />
    </Suspense>
  )
}

export default LoginPage
