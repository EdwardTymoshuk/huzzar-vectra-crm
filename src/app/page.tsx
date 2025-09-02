// src/app/page.tsx
'use client'

import { useRole } from '@/utils/roleHelpers/useRole'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Home page:
 * - Client redirect based on resolved role.
 * - Complements server-side middleware so direct hits and client nav both work.
 */
export default function HomePage() {
  const { role, isLoading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!role) router.replace('/login')
    else if (role === 'TECHNICIAN') router.replace('/technician/dashboard')
    else router.replace('/admin-panel?tab=dashboard')
  }, [role, isLoading, router])

  return null
}
