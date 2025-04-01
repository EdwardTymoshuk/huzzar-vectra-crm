'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ReactNode, useState } from 'react'

import { Toaster } from 'sonner'
import { SearchProvider } from '../context/SearchContext'
import Noop from './Noop'
import { ThemeProvider } from './ThemeProvider'

const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SearchProvider>
          <Noop>
            <ThemeProvider>{children}</ThemeProvider>
          </Noop>
          <Toaster position="top-center" richColors />
        </SearchProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

export default Providers
