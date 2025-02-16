'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ReactNode, useState } from 'react'

import { Toaster } from 'sonner'
import Noop from './Noop'

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <Noop>{children}</Noop>
        <Toaster position="top-center" richColors />
      </SessionProvider>
    </QueryClientProvider>
  )
}
