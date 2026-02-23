'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ReactNode, useState } from 'react'

import { SearchProvider } from '../context/SearchContext'
import ClientToaster from './ClientToaster'
import Noop from './Noop'
import SessionExpiryToastWatcher from './SessionExpiryToastWatcher'
import { ThemeProvider } from './ThemeProvider'

const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SearchProvider>
          <Noop>
            <ThemeProvider>
              <SessionExpiryToastWatcher />
              {children}
            </ThemeProvider>
          </Noop>
        </SearchProvider>
      </SessionProvider>

      {/* Global client-only toaster */}
      <ClientToaster />
    </QueryClientProvider>
  )
}

export default Providers
