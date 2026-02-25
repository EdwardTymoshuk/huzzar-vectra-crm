// src/app/layout.tsx
import Providers from '@/app/components/Providers'
import '@/app/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HUZZAR CRM PLATFORM',
  description: 'System zarządzania firmy HUZZAR',
}

/**
 * Root layout:
 * - Server Component on purpose.
 * - Contains only global HTML shell and Providers.
 * - No role-based logic here to avoid race conditions and hydration issues.
 */
const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="pl">
      <head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=overlays-content"
        />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="any" />
      </head>
      <body
        className="antialiased bg-background text-foreground"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

export default RootLayout
