import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'

import { authOptions } from '@/lib/authOptions'
import LoginForm from '../components/LoginForm'

export default async function LoginPage() {
  console.log('ENV:', {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
  })
  const session = await getServerSession(authOptions)
  if (session) {
    redirect('/')
  }

  return <LoginForm />
}
