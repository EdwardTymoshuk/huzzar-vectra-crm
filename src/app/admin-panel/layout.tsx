import ClientRoutingHandler from '@/app/components/ClientRoutingHandler'
import Providers from '@/app/components/Providers'
import '@/app/globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

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
  title: 'Huzzar | Vectra CRM',
  description: 'System zarządzania dla Vectry Huzzar',
}

/**
 * Admin layout using global Providers and ClientRoutingHandler.
 * Sidebar and Header are dynamically rendered by ClientRoutingHandler.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <ClientRoutingHandler>{children}</ClientRoutingHandler>
        </Providers>
      </body>
    </html>
  )
}
