import ClientRoutingHandler from '@/app/components/ClientRoutingHandler'
import Providers from '@/app/components/Providers'
import '@/app/globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Suspense } from 'react'
import LoaderLogo from '../components/shared/LoaderLogo'

// Fonts configuration
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'V-CRM HUZZAR',
  description: 'System zarządzania technikami i zleceniami V-CRM HUZZAR',
}

/**
 * Admin layout using global Providers and ClientRoutingHandler.
 * Sidebar and Header are dynamically rendered by ClientRoutingHandler.
 */
const AdminLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="pl">
      <head>
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=overlays-content"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <Suspense fallback={<LoaderLogo show={true} />}>
            <ClientRoutingHandler>{children}</ClientRoutingHandler>
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}

export default AdminLayout
