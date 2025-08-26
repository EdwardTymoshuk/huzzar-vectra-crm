'use client'

import { getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import LoginForm from '../components/LoginForm'

const LoginPage = () => {
  const router = useRouter()

  useEffect(() => {
    getSession().then((session) => {
      if (session) router.replace('/')
    })
  }, [router])

  return <LoginForm />
}

export default LoginPage
