'use client'

import { getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import LoginForm from '../components/LoginForm'
import LoaderSpinner from '../components/shared/LoaderSpinner'

export const dynamic = 'force-dynamic'

const LoginPage = () => {
  const router = useRouter()

  useEffect(() => {
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
