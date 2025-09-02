// src/app/layout.tsx
import Providers from '@/app/components/Providers'
import '@/app/globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'V-CRM HUZZAR',
  description: 'System zarządzania technikami i zleceniami V-CRM HUZZAR',
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

export default RootLayout
